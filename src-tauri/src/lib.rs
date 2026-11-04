use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::Duration;

use serde::Deserialize;
use tauri::menu::{Menu, MenuItem, Submenu};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Emitter, Manager, State};

/// Прямоугольник «твёрдой» области собаки в логических пикселях окна.
#[derive(Deserialize, Clone, Copy, Debug)]
struct Rect {
    x: f64,
    y: f64,
    w: f64,
    h: f64,
}

impl Rect {
    fn contains(&self, px: f64, py: f64) -> bool {
        px >= self.x && px <= self.x + self.w && py >= self.y && py <= self.y + self.h
    }
}

#[derive(Default)]
struct HitState {
    regions: Mutex<Vec<Rect>>,
    dragging: AtomicBool,
    /// Период опроса курсора, мс. 0 = опрос приостановлен (поток спит и ждёт).
    interval_ms: AtomicU64,
    /// Сбросить кэш «окно сейчас игнорирует курсор» (после паузы/возобновления).
    resync: AtomicBool,
}

/// Фронтенд присылает актуальные хитбоксы (голова, тело, лапы, хвост).
#[tauri::command]
fn set_hit_regions(state: State<'_, HitState>, regions: Vec<Rect>) {
    *state.regions.lock().unwrap() = regions;
}

/// Во время перетаскивания окна click-through не трогаем.
#[tauri::command]
fn set_dragging(state: State<'_, HitState>, dragging: bool) {
    state.dragging.store(dragging, Ordering::Relaxed);
}

/// Частота опроса: 0 — пауза (SLEEPING), иначе период в мс.
/// При паузе окно перестаёт игнорировать мышь, чтобы собака могла проснуться
/// по наведению (опрос в этот момент не работает).
#[tauri::command]
fn set_poll_interval(window: tauri::WebviewWindow, state: State<'_, HitState>, ms: u64) {
    state.interval_ms.store(ms, Ordering::Relaxed);
    if ms == 0 {
        let _ = window.set_ignore_cursor_events(false);
    }
    state.resync.store(true, Ordering::Relaxed);
}

/// F12: открыть/закрыть DevTools. Только в debug-сборке (`tauri dev`);
/// в релизе команда ничего не делает (feature "devtools" отключён).
#[tauri::command]
fn toggle_devtools(window: tauri::WebviewWindow) {
    #[cfg(debug_assertions)]
    {
        if window.is_devtools_open() {
            window.close_devtools();
        } else {
            window.open_devtools();
        }
    }
    #[cfg(not(debug_assertions))]
    let _ = window;
}

/// Выход из приложения (меню по ПКМ).
#[tauri::command]
fn quit_app(app: AppHandle) {
    app.exit(0);
}

/// Поток-«сторож»: раз в ~50 мс сверяет позицию курсора с хитбоксами и
/// переключает `set_ignore_cursor_events`. Когда окно игнорирует курсор,
/// WebView не получает mousemove, поэтому проверять нужно со стороны ОС.
fn spawn_cursor_watcher(app: AppHandle) {
    std::thread::spawn(move || {
        let mut ignoring: Option<bool> = None;
        loop {
            let state = app.state::<HitState>();
            if state.resync.swap(false, Ordering::Relaxed) {
                ignoring = None;
            }
            let ms = state.interval_ms.load(Ordering::Relaxed);
            if ms == 0 {
                std::thread::sleep(Duration::from_millis(250));
                continue;
            }
            std::thread::sleep(Duration::from_millis(ms));

            // Пауза могла начаться, пока поток спал.
            if state.interval_ms.load(Ordering::Relaxed) == 0
                || state.dragging.load(Ordering::Relaxed)
            {
                continue;
            }
            let Some(win) = app.get_webview_window("main") else { continue };
            if !win.is_visible().unwrap_or(true) {
                continue;
            }
            let regions = state.regions.lock().unwrap().clone();
            if regions.is_empty() {
                continue;
            }
            let (Ok(cursor), Ok(origin), Ok(scale)) =
                (win.cursor_position(), win.inner_position(), win.scale_factor())
            else {
                continue;
            };
            let lx = (cursor.x - origin.x as f64) / scale;
            let ly = (cursor.y - origin.y as f64) / scale;
            let want_ignore = !regions.iter().any(|r| r.contains(lx, ly));
            if ignoring != Some(want_ignore)
                && win.set_ignore_cursor_events(want_ignore).is_ok()
            {
                ignoring = Some(want_ignore);
            }
        }
    });
}

/// Иконка в трее: Показать/Скрыть, Размер ▸ (3 пункта), Выход.
/// Смена размера уходит во фронтенд событием `set-size`: там вызывается
/// `window.setSize()` и сразу пересчитываются хитбоксы.
fn build_tray(app: &tauri::App) -> tauri::Result<()> {
    let toggle = MenuItem::with_id(app, "toggle", "Показать/Скрыть", true, None::<&str>)?;
    let feed = MenuItem::with_id(app, "feed", "Покормить", true, None::<&str>)?;
    let call_dog = MenuItem::with_id(app, "call_dog", "Позвать собаку", true, None::<&str>)?;
    let small = MenuItem::with_id(app, "size_150", "Маленький (150×150)", true, None::<&str>)?;
    let medium = MenuItem::with_id(app, "size_300", "Средний (300×300)", true, None::<&str>)?;
    let large = MenuItem::with_id(app, "size_450", "Большой (450×450)", true, None::<&str>)?;
    let size_menu = Submenu::with_items(app, "Размер", true, &[&small, &medium, &large])?;
    let quit = MenuItem::with_id(app, "quit", "Выход", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&toggle, &feed, &call_dog, &size_menu, &quit])?;

    let mut builder = TrayIconBuilder::with_id("main")
        .tooltip("MyPet")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| {
            let id = event.id().as_ref();
            match id {
                "toggle" => {
                    if let Some(w) = app.get_webview_window("main") {
                        if w.is_visible().unwrap_or(true) {
                            let _ = w.hide();
                        } else {
                            let _ = w.show();
                        }
                    }
                }
                "feed" => {
                    let _ = app.emit("feed-dog", ());
                }
                "call_dog" => {
                    let _ = app.emit("call-dog", ());
                }
                "quit" => {
                    // Даём фронтенду дописать настройки; если он не ответит — выходим сами.
                    let _ = app.emit("request-quit", ());
                    let handle = app.clone();
                    std::thread::spawn(move || {
                        std::thread::sleep(Duration::from_millis(1500));
                        handle.exit(0);
                    });
                }
                _ => {
                    if let Some(n) = id.strip_prefix("size_").and_then(|s| s.parse::<u32>().ok()) {
                        let _ = app.emit("set-size", n);
                    }
                }
            }
        });
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }
    builder.build(app)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(HitState {
            interval_ms: AtomicU64::new(50),
            ..Default::default()
        })
        .invoke_handler(tauri::generate_handler![
            set_hit_regions,
            set_dragging,
            set_poll_interval,
            toggle_devtools,
            quit_app
        ])
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // Папка настроек: %APPDATA%\com.mypet.dog (fs-плагин сам родителей не создаёт).
            if let Ok(dir) = app.path().app_data_dir() {
                let _ = std::fs::create_dir_all(dir);
            }
            build_tray(app)?;
            spawn_cursor_watcher(app.handle().clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running MyPet");
}
