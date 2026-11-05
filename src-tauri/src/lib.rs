use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};
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

/// Пункты трея, чьи подписи зависят от питомца: «Покормить» (🦴 / 🍉) и два трюка.
struct TrayState {
    feed: tauri::menu::MenuItem<tauri::Wry>,
    tricks: [tauri::menu::MenuItem<tauri::Wry>; 2],
}

/// Скорость мыши (логические px/мс), выше которой проход считается «быстрым».
const FAST_CURSOR_PX_PER_MS: f64 = 1.1;
/// Курсор считается «рядом с окном» в пределах этого запаса вокруг него (логические px).
const CURSOR_MARGIN: f64 = 60.0;

/// Событие `cursor-move` для фронтенда: положение курсора относительно окна и скорость.
#[derive(Serialize, Clone)]
struct CursorMove {
    x: f64,
    y: f64,
    speed: f64,
    fast: bool,
}

#[derive(Default)]
struct HitState {
    /// Питомец в CATCHING: присылаем положение курсора каждый тик, чтобы глаза следили за ним.
    tracking: AtomicBool,
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

/// CATCHING включает/выключает слежение за курсором (события `cursor-move` каждый тик).
#[tauri::command]
fn set_tracking(state: State<'_, HitState>, on: bool) {
    state.tracking.store(on, Ordering::Relaxed);
}

/// Фронтенд сообщает подписи пунктов трея для активного питомца.
#[tauri::command]
fn set_tray_labels(state: State<'_, TrayState>, feed: String, tricks: Vec<String>) {
    let _ = state.feed.set_text(feed);
    for (item, label) in state.tricks.iter().zip(tricks) {
        let _ = item.set_text(label);
    }
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

/// Отправить файл в системную Корзину (его «съел» питомец при перетаскивании файла на него).
///
/// Это единственное место, где приложение что-то удаляет, поэтому проверки строгие:
///  - только абсолютный путь к обычному существующему файлу (не папка, не ссылка);
///  - никогда сам exe приложения и его папка настроек;
///  - файл уходит именно в Корзину (восстановить можно), а не удаляется насовсем.
#[tauri::command]
async fn move_to_trash(app: AppHandle, path: String) -> Result<(), String> {
    let p = std::path::PathBuf::from(&path);
    if !p.is_absolute() {
        return Err("нужен абсолютный путь".into());
    }
    let meta = std::fs::symlink_metadata(&p).map_err(|e| format!("файл недоступен: {e}"))?;
    if !meta.is_file() {
        return Err("в Корзину отправляются только обычные файлы".into());
    }
    let canon = std::fs::canonicalize(&p).map_err(|e| e.to_string())?;
    if let Ok(exe) = std::env::current_exe().and_then(std::fs::canonicalize) {
        if canon == exe {
            return Err("это сама программа".into());
        }
    }
    if let Ok(dir) = app.path().app_data_dir() {
        if let Ok(dir) = std::fs::canonicalize(dir) {
            if canon.starts_with(&dir) {
                return Err("это файл настроек программы".into());
            }
        }
    }
    // Корзина — системный вызов, который может подвиснуть: не блокируем основной поток.
    tauri::async_runtime::spawn_blocking(move || trash::delete(&p).map_err(|e| e.to_string()))
        .await
        .map_err(|e| e.to_string())?
}

/// Выход из приложения (меню по ПКМ).
#[tauri::command]
fn quit_app(app: AppHandle) {
    app.exit(0);
}

/// Поднять окно в самый верх группы «поверх всех окон», не отбирая фокус.
///
/// Флаг always_on_top у окна один раз выставляется при создании, но другие программы (браузер, игры,
/// тяжёлые приложения, тоже «topmost») могут оказаться выше нашего окна. Повторный вызов
/// `set_always_on_top(true)` ничего не даёт, если флаг уже стоит, поэтому на Windows вызываем
/// `SetWindowPos(HWND_TOPMOST, … SWP_NOACTIVATE)` напрямую: это переставляет окно на вершину z-порядка.
#[cfg(windows)]
fn bump_topmost(win: &tauri::WebviewWindow) {
    use std::ffi::c_void;

    #[link(name = "user32")]
    extern "system" {
        fn SetWindowPos(
            hwnd: *mut c_void,
            insert_after: *mut c_void,
            x: i32,
            y: i32,
            cx: i32,
            cy: i32,
            flags: u32,
        ) -> i32;
    }
    const HWND_TOPMOST: isize = -1;
    const SWP_NOSIZE: u32 = 0x0001;
    const SWP_NOMOVE: u32 = 0x0002;
    const SWP_NOACTIVATE: u32 = 0x0010;
    const SWP_NOOWNERZORDER: u32 = 0x0200;

    if let Ok(hwnd) = win.hwnd() {
        // SAFETY: hwnd — живой дескриптор нашего окна; флаги не двигают, не меняют размер и не активируют окно.
        unsafe {
            SetWindowPos(
                hwnd.0 as *mut c_void,
                HWND_TOPMOST as *mut c_void,
                0,
                0,
                0,
                0,
                SWP_NOSIZE | SWP_NOMOVE | SWP_NOACTIVATE | SWP_NOOWNERZORDER,
            );
        }
    }
}

#[cfg(not(windows))]
fn bump_topmost(win: &tauri::WebviewWindow) {
    let _ = win.set_always_on_top(true);
}

/// Раз в 1,5 с «пинаем» окно наверх, пока оно видимо (дёшево: один системный вызов).
fn spawn_topmost_keeper(app: AppHandle) {
    std::thread::spawn(move || loop {
        std::thread::sleep(Duration::from_millis(1500));
        if let Some(win) = app.get_webview_window("main") {
            if win.is_visible().unwrap_or(false) {
                bump_topmost(&win);
            }
        }
    });
}

/// Поток-«сторож»: раз в ~50 мс сверяет позицию курсора с хитбоксами и
/// переключает `set_ignore_cursor_events`. Когда окно игнорирует курсор,
/// WebView не получает mousemove, поэтому проверять нужно со стороны ОС.
fn spawn_cursor_watcher(app: AppHandle) {
    std::thread::spawn(move || {
        let mut ignoring: Option<bool> = None;
        // Предыдущее положение курсора и момент замера — для скорости мыши (delta / время).
        let mut prev: Option<(f64, f64, Instant)> = None;
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

            // Скорость мыши по данным этого же потока: расстояние между тиками / прошедшее время.
            // Если тики шли с паузой (сон, перетаскивание), старый замер не годится — speed = 0.
            let now = Instant::now();
            let speed = match prev {
                Some((px, py, t)) => {
                    let dt = now.duration_since(t).as_secs_f64() * 1000.0;
                    if dt > 0.0 && dt < 250.0 {
                        ((lx - px).powi(2) + (ly - py).powi(2)).sqrt() / dt
                    } else {
                        0.0
                    }
                }
                None => 0.0,
            };
            prev = Some((lx, ly, now));

            // Быстрый проход рядом с окном (или идёт CATCHING) — сообщаем фронтенду. Он сам решит,
            // рядом ли голова, и пошлёт питомца ловить курсор. Событие идёт и тогда, когда курсор над
            // прозрачной областью (окно его игнорирует) — именно поэтому считаем в Rust.
            let fast = speed >= FAST_CURSOR_PX_PER_MS;
            if fast || state.tracking.load(Ordering::Relaxed) {
                if let Ok(size) = win.inner_size() {
                    let (w, h) = (size.width as f64 / scale, size.height as f64 / scale);
                    if lx >= -CURSOR_MARGIN
                        && lx <= w + CURSOR_MARGIN
                        && ly >= -CURSOR_MARGIN
                        && ly <= h + CURSOR_MARGIN
                    {
                        let _ = app.emit("cursor-move", CursorMove { x: lx, y: ly, speed, fast });
                    }
                }
            }
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
    let trick0 = MenuItem::with_id(app, "trick_0", "Трюк 1", true, None::<&str>)?;
    let trick1 = MenuItem::with_id(app, "trick_1", "Трюк 2", true, None::<&str>)?;
    let call_dog = MenuItem::with_id(app, "call_dog", "Позвать собаку", true, None::<&str>)?;
    let small = MenuItem::with_id(app, "size_150", "Маленький (150×150)", true, None::<&str>)?;
    let medium = MenuItem::with_id(app, "size_300", "Средний (300×300)", true, None::<&str>)?;
    let large = MenuItem::with_id(app, "size_450", "Большой (450×450)", true, None::<&str>)?;
    let size_menu = Submenu::with_items(app, "Размер", true, &[&small, &medium, &large])?;
    let pet_dog = MenuItem::with_id(app, "pet_dog", "🐶 Собачка", true, None::<&str>)?;
    let pet_hippo = MenuItem::with_id(app, "pet_hippo", "🦛 Бегемотик", true, None::<&str>)?;
    let pet_panda = MenuItem::with_id(app, "pet_panda", "🐼 Панда", true, None::<&str>)?;
    let pet_menu = Submenu::with_items(app, "Питомец", true, &[&pet_dog, &pet_hippo, &pet_panda])?;
    let quit = MenuItem::with_id(app, "quit", "Выход", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&toggle, &feed, &trick0, &trick1, &call_dog, &pet_menu, &size_menu, &quit])?;
    app.manage(TrayState {
        feed: feed.clone(),
        tricks: [trick0.clone(), trick1.clone()],
    });

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
                "trick_0" | "trick_1" => {
                    // Индекс трюка уходит во фронтенд: он знает, какой питомец активен.
                    let idx: u32 = if id == "trick_0" { 0 } else { 1 };
                    let _ = app.emit("do-trick", idx);
                }
                "pet_dog" | "pet_hippo" | "pet_panda" => {
                    // Смена питомца: фронтенд подменит SVG и запомнит выбор в settings.json.
                    let _ = app.emit("set-pet", &id["pet_".len()..]);
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
            set_tray_labels,
            set_tracking,
            move_to_trash,
            toggle_devtools,
            quit_app
        ])
        // Окно потеряло фокус (кликнули в браузер) — сразу возвращаем наверх, не ждём очередного «пинка».
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Focused(false) = event {
                if let Some(win) = window.app_handle().get_webview_window("main") {
                    bump_topmost(&win);
                }
            }
        })
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            // Папка настроек: %APPDATA%\com.mypet.dog (fs-плагин сам родителей не создаёт).
            if let Ok(dir) = app.path().app_data_dir() {
                let _ = std::fs::create_dir_all(dir);
            }
            build_tray(app)?;
            spawn_cursor_watcher(app.handle().clone());
            spawn_topmost_keeper(app.handle().clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running MyPet");
}
