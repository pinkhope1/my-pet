# MyPet 🐶

Cute glossy desktop pets — a **dog**, a **hippo** and a **panda** — that live on top of your windows. Built with **Tauri 2**, **Vite** and **vanilla TypeScript** — the dog is pure SVG + CSS (no images, GIFs or Lottie), and idles at ~0% CPU.

[Русская версия](README.ru.md)

## Features

- **Three pets, switchable at runtime** — 🐶 Dog, 🦛 Hippo (blue-violet) and 🐼 Panda. Pick one in the right-click menu ("Switch pet") or the tray ("Pet"); the choice is remembered. Each pet has its own tricks, shown in the menu and the tray only while that pet is active:
  - 🐶 **Play** — a tennis ball is thrown, the dog jumps after it and brings it back.
  - 🐾 **Dig** — the dog leans forward, paws scrabble, dirt flies (2 s).
  - 🦛 **Bubbles** — the hippo puffs its cheeks and blows soap bubbles from its nose.
  - 💃 **Dance** — the hippo sways side to side while music notes float around (3 s).
  - 🤸 **Roll** — the panda crouches, jumps and does a backflip, then lands on its feet (1.8 s).
  - 🥋 **Ninja** — the panda spins fast, ties on a red headband and strikes a fighting stance (1.5 s; also its double-click move).
- **Reacts to your cursor** — sweep the mouse quickly past a pet's head and it raises a paw to catch the cursor while its eyes follow it (`CATCHING`, about 1 s after the mouse stops). The mouse speed is measured in the same Rust thread that powers click-through, so it works even over transparent areas around the pet.
- **Wardrobe** — right-click → "🎩 Accessories": 🎉 Party hat, 😎 Sunglasses or 👑 Crown (or none). It follows the head in every animation, is remembered in `settings.json`, and a tall hat doesn't break clicking (hit boxes are recomputed when you change it).
- **Eats your clipboard** 📋 — when new text is copied, the pet opens its mouth, little characters (A, B, 1, @…) fly into it, it chews for 1.5 s and licks its lips (`EATING_TEXT`). It's just an animation: the clipboard text is only compared by a hash to notice a change — it is never saved, logged, sent or shown (the flying characters are random). Polling is once a second and always on — **a sleeping pet wakes up to eat the text**, then goes back to idle (and may fall asleep again). It can be switched off with the 📋 button in the right-click menu (`eatClipboard`).
- **Trash pet** 🗑️ — drag a file from Explorer onto the pet: it opens its mouth, a document icon flies from your cursor into it, the pet chews (`EATING_FILE`) and the file goes to the **Windows Recycle Bin** (restorable). Files dropped beside the pet (on the transparent part of the window) are ignored. Safety: only regular files are accepted (no folders or links), at most 20 per drop, never the app's own exe/settings, and nothing happens if the pet is busy, angry or asleep. Switch it off with the 🗑️ button in the menu (`eatFiles`).
- **Click reactions** — a single click makes the pet hop and shows a random symbol (! ? ❤️ ♪ ✨ ⭐) above its head for 1 s. A **double click** performs the pet's signature move: the dog spins 360° and sits down 🌀; the hippo does a cannonball jump and splashes water 💦; the panda becomes a ninja 🥋 (1.5 s each). Slow clicks cheer the pet up; 5 fast clicks in 2 s still make it angry.
- **Glossy "3D emoji" look** — hand-written SVG with gradients; the fur colors are CSS variables (`--dog-primary`, `--dog-secondary`, …) and are saved between runs.
- **Emotions** (a small state machine, `src/DogStateMachine.ts`):
  - **Happy** — pet the dog (hold the left button and move the mouse smoothly): wagging tail, hearts.
  - **Angry** — click 5 times within 2 seconds: shaking, flattened ears, anger mark.
  - **Offended** — after being angry the dog runs to the screen edge and sulks; pet it smoothly for 3 seconds (or use "Call the dog" in the tray) to make up.
  - **Sleeping** — after 2 minutes of inactivity: closed eyes, floating "Zzz". All polling stops.
  - **Eating** — "Feed" drops the pet's own food from the top and the pet catches and chews it: a 🦴 bone for the dog, a 🍉 watermelon slice for the hippo, a 🎋 bamboo shoot for the panda. Each pet has its own saved counter.
- **Click-through window** — transparent areas pass clicks to the desktop; only the dog itself catches the mouse.
- **Drag & drop** — hold the dog for ~350 ms and drag, or switch to `Shift` + drag in the settings. You can even grab an offended dog.
- **Resizing** — `Ctrl` + mouse wheel (100–600 px), the size slider in the right-click menu, or the tray menu.
- **Right-click menu** — size slider, Feed, Sleep, Quit.
- **System tray** — Show/Hide, Feed, the active pet's two tricks, Call the pet, Pet (switch), Size, Quit.
- **Multi-monitor aware** — the dog hides at the real edge of your desktop, never on a neighbouring screen.
- **Settings persistence** — size, drag mode, colors, the current pet and the food counters are stored in JSON.

## Controls

| Action | Result |
| --- | --- |
| Smooth petting (LMB held + moving) | Happy |
| Single click (no second click within 250 ms) | Hop + random symbol above the head |
| Double click | Dog: spin 360° and sit · Hippo: cannonball splash · Panda: ninja pose |
| Sweep the mouse quickly near the head | The pet raises a paw and tries to catch the cursor |
| Copy new text | The pet eats it (animation only, nothing is saved) |
| Drop a file on the pet | The pet eats it → the file goes to the Recycle Bin |
| 5 fast clicks (< 2 s) | Angry → Offended |
| Hold ~350 ms, then drag (or `Shift` + drag) | Move the dog |
| `Ctrl` + wheel | Resize |
| Right click on the pet | Menu (size, Feed, two tricks — Play/Dig, Bubbles/Dance or Roll/Ninja —, Sleep, Accessories, Switch pet, Quit) |
| Start dragging (hold, or `Shift`) | Interrupts any running animation |
| `F12` | DevTools (development builds only) |

## Settings

Stored at `%APPDATA%\com.mypet.dog\settings.json` (Windows):

```json
{
  "size": 300,
  "dragMode": "hold",
  "dragHoldMs": 350,
  "colors": { "primary": "#f2b366", "secondary": "#d98a3d", "ear": "#c9772b" },
  "bonesEaten": 0,
  "melonsEaten": 0,
  "bamboosEaten": 0,
  "currentPet": "dog",
  "accessory": "none",
  "eatClipboard": true,
  "eatFiles": true
}
```

- `currentPet`: `"dog"`, `"hippo"` or `"panda"`.
- `accessory`: `"none"`, `"party"`, `"glasses"` or `"crown"`.
- `eatClipboard` / `eatFiles`: switch the clipboard-eating and trash features on or off (also in the right-click menu: 📋 and 🗑️).
- `bonesEaten` (dog), `melonsEaten` (hippo) and `bamboosEaten` (panda): food counters, shown at the bottom of the right-click menu.
- `dragMode`: `"hold"` or `"shift"`.
- `colors`: any of `primary`, `secondary`, `ear`, `belly`, `nose`, `eye` as `#rgb` / `#rrggbb`. Remove a key to use the default. Colors apply to the dog; the hippo has its own palette in `style.css`.

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

### Fixes in 0.4.1

- **Right-click menu near a screen edge** — the menu temporarily enlarges the window (≤ 380 px). If the pet is at the right or bottom edge, the window is shifted into the monitor's work area (the pet stays visually in place, the menu opens to the left / upwards), and moved back when the menu closes.
- **Pet lost "always on top"** — when another (heavy / topmost) app such as a browser came up, the pet could end up behind it until clicked. On Windows the window is now re-raised with `SetWindowPos(HWND_TOPMOST, SWP_NOACTIVATE)` every 1.5 s (without stealing focus) and immediately when it loses focus.
- **Clipboard eating while asleep** — clipboard polling no longer pauses when the pet sleeps; copied text wakes it up.
- **Offended pet hiding** — the run-away now works on the pet's size (not the window's), picks the outer edge of the *current* monitor (never the side that touches another monitor), always leaves at least 40 % of the pet visible and keeps it vertically inside the monitor.

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
  hippo.svg.ts        The hippo (SVG markup)
  bone.svg.ts         The dog's food (bone)
  watermelon.svg.ts   The hippo's food (watermelon slice)
  panda.svg.ts        The panda (SVG markup)
  bamboo.svg.ts       The panda's food (bamboo)
  clipboard.ts        Clipboard watcher (hash only, no text is stored)
  fileDrop.ts         Drag & drop of files onto the pet → Recycle Bin
  accessories.ts      Accessory registry + per-pet anchors (hat_party / glasses / hat_crown .svg.ts)
  petParts.ts         Shared SVG defs / effects layer + the pet SVG contract
  pets.ts             Pet registry (title, SVG, trick button, duration)
  petHost.ts          Mounts the current pet and swaps SVG + state machine on switch
  style.css           Colors, per-state animations (shared by all pets), menu styles
  PetStateMachine.ts  Emotions and transitions (pet-agnostic)
  input.ts            Mouse gestures: click, petting, drag
  windowControl.ts    Hit regions, resizing, dragging
  windowMotion.ts     Run-away / return animation across monitors
  contextMenu.ts      Right-click HTML menu
  settings.ts         settings.json load/save
src-tauri/            Rust backend: tray, click-through watcher, plugins
```

### Adding a new pet

All pets share one state machine and one set of CSS animations, so a new pet is just an SVG that follows the contract documented in `src/petParts.ts` (root `<svg id="pet" class="pet-<name>">` with the same part ids: `#head`, `#body`, `#eyes`, `#brows`, `#mouth`, `#tail`, `#paws`, …). Give it its own food, head anchors for accessories (`anchors`) (see `bone.svg.ts` / `watermelon.svg.ts`), add it to `PETS` in `src/pets.ts`, extend `PetId` in `src/settings.ts`, and put its palette/special effects in `style.css`.

## How it works

CPU use is kept near zero: animations exist only while a state class (`state-happy`, `state-angry`, …) is on the dog, idle and sleeping states have no running animation, and a sleeping dog has no JS timers and its Rust cursor polling is paused. Click-through is done by a small Rust thread that compares the cursor position with the dog's hit boxes and toggles `set_ignore_cursor_events`.

## License

[MIT](LICENSE)
