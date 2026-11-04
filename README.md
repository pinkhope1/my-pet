# MyPet 🐶

A cute glossy desktop dog that lives on top of your windows. Built with **Tauri 2**, **Vite** and **vanilla TypeScript** — the dog is pure SVG + CSS (no images, GIFs or Lottie), and idles at ~0% CPU.

[Русская версия](README.ru.md)

## Features

- **Glossy "3D emoji" look** — hand-written SVG with gradients; the fur colors are CSS variables (`--dog-primary`, `--dog-secondary`, …) and are saved between runs.
- **Emotions** (a small state machine, `src/DogStateMachine.ts`):
  - **Happy** — pet the dog (hold the left button and move the mouse smoothly): wagging tail, hearts.
  - **Angry** — click 5 times within 2 seconds: shaking, flattened ears, anger mark.
  - **Offended** — after being angry the dog runs to the screen edge and sulks; pet it smoothly for 3 seconds (or use "Call the dog" in the tray) to make up.
  - **Sleeping** — after 2 minutes of inactivity: closed eyes, floating "Zzz". All polling stops.
  - **Eating** — "Feed" drops a bone from the top; the dog catches and chews it. A counter of eaten bones is saved.
- **Click-through window** — transparent areas pass clicks to the desktop; only the dog itself catches the mouse.
- **Drag & drop** — hold the dog for ~350 ms and drag, or switch to `Shift` + drag in the settings. You can even grab an offended dog.
- **Resizing** — `Ctrl` + mouse wheel (100–600 px), the size slider in the right-click menu, or the tray menu.
- **Right-click menu** — size slider, Feed, Sleep, Quit.
- **System tray** — Show/Hide, Feed, Call the dog, Size, Quit.
- **Multi-monitor aware** — the dog hides at the real edge of your desktop, never on a neighbouring screen.
- **Settings persistence** — size, drag mode, colors and the bone counter are stored in JSON.

## Controls

| Action | Result |
| --- | --- |
| Smooth petting (LMB held + moving) | Happy |
| 5 fast clicks (< 2 s) | Angry → Offended |
| Hold ~350 ms, then drag (or `Shift` + drag) | Move the dog |
| `Ctrl` + wheel | Resize |
| Right click on the dog | Menu |
| `F12` | DevTools (development builds only) |

## Settings

Stored at `%APPDATA%\com.mypet.dog\settings.json` (Windows):

```json
{
  "size": 300,
  "dragMode": "hold",
  "dragHoldMs": 350,
  "colors": { "primary": "#f2b366", "secondary": "#d98a3d", "ear": "#c9772b" },
  "bonesEaten": 0
}
```

- `dragMode`: `"hold"` or `"shift"`.
- `colors`: any of `primary`, `secondary`, `ear`, `belly`, `nose`, `eye` as `#rgb` / `#rrggbb`. Remove a key to use the default.

## Development

Prerequisites:

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) (stable)
- Windows: [MSVC Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) ("Desktop development with C++") and WebView2 (preinstalled on Windows 11)
- Other platforms: see the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)

```bash
npm install
npm run tauri dev
```

The first run compiles the Rust dependencies and takes a few minutes. In development builds `F12` opens DevTools.

### Release build

```bash
npm run tauri build
```

Output:

- Installer: `src-tauri/target/release/bundle/nsis/MyPet_<version>_x64-setup.exe`
- Standalone executable: `src-tauri/target/release/mypet.exe`

### Project layout

```
src/                  Frontend (TypeScript + CSS, no frameworks)
  dog.svg.ts          The dog (SVG markup)
  style.css           Colors, animations per state, menu styles
  DogStateMachine.ts  Emotions and transitions
  input.ts            Mouse gestures: click, petting, drag
  windowControl.ts    Hit regions, resizing, dragging
  windowMotion.ts     Run-away / return animation across monitors
  contextMenu.ts      Right-click HTML menu
  settings.ts         settings.json load/save
src-tauri/            Rust backend: tray, click-through watcher, plugins
```

## How it works

CPU use is kept near zero: animations exist only while a state class (`state-happy`, `state-angry`, …) is on the dog, idle and sleeping states have no running animation, and a sleeping dog has no JS timers and its Rust cursor polling is paused. Click-through is done by a small Rust thread that compares the cursor position with the dog's hit boxes and toggles `set_ignore_cursor_events`.

## License

[MIT](LICENSE)
