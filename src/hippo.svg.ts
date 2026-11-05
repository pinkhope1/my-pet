import { COMMON_DEFS, fxLayer } from "./petParts";
import { WATERMELON } from "./watermelon.svg";

/** Мыльные пузыри «🫧 Пузыри»: вылетают из носа вверх (CSS .bubble, см. style.css). */
const BUBBLES = (() => {
  // x — смещение у носа, r — радиус, dx — боковой снос при подъёме, d — задержка старта
  const defs = [
    { x: -10, r: 11, dx: -34, d: 0.35 },
    { x: 8, r: 15, dx: 28, d: 0.65 },
    { x: -2, r: 9, dx: -12, d: 0.95 },
    { x: 12, r: 12, dx: 42, d: 1.2 },
    { x: -14, r: 16, dx: -46, d: 1.5 },
    { x: 4, r: 10, dx: 14, d: 1.8 },
    { x: -6, r: 13, dx: -26, d: 2.1 },
  ];
  const items = defs
    .map(
      (b) => /* html */ `
      <g transform="translate(${150 + b.x} 150)">
        <g class="bubble" style="--dx:${b.dx}px;--d:${b.d}s">
          <circle r="${b.r}" fill="url(#g-bubble)" stroke="#9fb0ff" stroke-opacity="0.9" stroke-width="1.6"/>
          <path d="M${-b.r * 0.55} ${-b.r * 0.2} Q${-b.r * 0.4} ${-b.r * 0.62} ${b.r * 0.05} ${-b.r * 0.68}"
                fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity="0.9"/>
          <circle cx="${b.r * 0.45}" cy="${b.r * 0.4}" r="${Math.max(1.5, b.r * 0.12)}" fill="#fff" opacity="0.7"/>
        </g>
      </g>`,
    )
    .join("");
  return `<g id="bubbles">${items}</g>`;
})();

/** Музыкальные нотки для «💃 Танцевать»: взлетают вокруг бегемота (CSS .note, см. style.css). */
const NOTES = (() => {
  // x, y — где рождается; dx — боковой снос; d — задержка (с); g — какая нотка; c — цвет
  const defs = [
    { x: 40, y: 150, dx: -22, d: 0, g: "♪", c: "#ffbf3d" },
    { x: 262, y: 140, dx: 24, d: 0.3, g: "♫", c: "#ff6fb5" },
    { x: 62, y: 96, dx: -30, d: 0.6, g: "♬", c: "#52c7ff" },
    { x: 240, y: 90, dx: 28, d: 0.9, g: "♪", c: "#8e7bff" },
    { x: 150, y: 44, dx: -10, d: 1.2, g: "♫", c: "#ff7a59" },
    { x: 28, y: 214, dx: -18, d: 1.5, g: "♬", c: "#4ddb8c" },
    { x: 274, y: 210, dx: 20, d: 1.8, g: "♪", c: "#ffbf3d" },
  ];
  const items = defs
    .map(
      (n) => `
      <g transform="translate(${n.x} ${n.y})">
        <text class="note" style="--dx:${n.dx}px;--d:${n.d}s" font-family="Segoe UI Symbol, Arial, sans-serif"
              font-size="30" font-weight="700" fill="${n.c}" stroke="#fff" stroke-width="2.2" paint-order="stroke"
              text-anchor="middle">${n.g}</text>
      </g>`,
    )
    .join("");
  return `<g id="notes">${items}</g>`;
})();

/** Капли воды для «прыжка-бомбочки» (двойной клик): разлетаются от места приземления (CSS .drop). */
const DROPS = (() => {
  // x — где (у лап), r — радиус, dx/dy — куда летит
  const defs = [
    { x: -70, r: 6, dx: -78, dy: -70 }, { x: -52, r: 4.5, dx: -52, dy: -104 },
    { x: -34, r: 5.5, dx: -30, dy: -120 }, { x: -14, r: 4, dx: -12, dy: -134 },
    { x: 8, r: 6, dx: 10, dy: -128 }, { x: 28, r: 4.5, dx: 30, dy: -118 },
    { x: 48, r: 5.5, dx: 54, dy: -106 }, { x: 68, r: 6, dx: 80, dy: -72 },
    { x: -60, r: 3.5, dx: -96, dy: -40 }, { x: 60, r: 3.5, dx: 98, dy: -42 },
    { x: -22, r: 3.5, dx: -44, dy: -90 }, { x: 38, r: 3.5, dx: 62, dy: -92 },
  ];
  const items = defs
    .map(
      (p) => `
      <g transform="translate(${150 + p.x} 272)">
        <g class="drop" style="--dx:${p.dx}px;--dy:${p.dy}px">
          <circle r="${p.r}" fill="#66c2ff" stroke="#fff" stroke-width="1.4" stroke-opacity="0.9"/>
          <circle cx="${-p.r * 0.3}" cy="${-p.r * 0.35}" r="${p.r * 0.32}" fill="#fff" opacity="0.85"/>
        </g>
      </g>`,
    )
    .join("");
  return `<g id="drops">${items}</g>`;
})();

// Бегемотик в стиле «глянцевый 3D-эмодзи», сине-фиолетовая палитра (задаётся в style.css, .pet-hippo).
// Те же id частей, что у собаки (контракт в petParts.ts) — все CSS-анимации состояний работают без дублирования.
export const HIPPO_SVG = /* html */ `
<svg id="pet" class="pet-hippo" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Бегемотик">
  <defs>${COMMON_DEFS}${WATERMELON.defs}</defs>

  <!-- Тень на земле -->
  <ellipse id="shadow" cx="150" cy="284" rx="100" ry="11" fill="url(#g-shadow)"/>

  <g id="rig">
  <!-- Хвостик-бугорок -->
  <g id="tail">
    <path d="M214 252 C 242 252, 256 234, 248 220 C 243 211, 230 215, 232 227 C 233 237, 225 241, 212 239 Z"
          fill="url(#g-fur)"/>
    <path d="M243 219 C 247 226, 246 232, 242 236" fill="none" stroke="#fff" stroke-opacity="0.5"
          stroke-width="4.5" stroke-linecap="round"/>
  </g>

  <!-- Тело -->
  <g id="body">
    <ellipse cx="150" cy="226" rx="84" ry="62" fill="url(#g-body)"/>
    <ellipse cx="150" cy="243" rx="50" ry="42" fill="url(#g-muzzle)"/>
    <ellipse cx="120" cy="190" rx="28" ry="12" fill="url(#g-gloss)" transform="rotate(-18 120 190)" opacity="0.7"/>
  </g>

  <!-- Лапки -->
  <g id="paws">
    <g id="paw-left">
      <ellipse cx="108" cy="277" rx="29" ry="15" fill="url(#g-body)"/>
      <ellipse cx="98" cy="270" rx="10" ry="4" fill="#fff" opacity="0.45"/>
      <ellipse cx="94" cy="282" rx="5" ry="3.6" fill="#f2eeff" opacity="0.9"/>
      <ellipse cx="108" cy="284" rx="5" ry="3.6" fill="#f2eeff" opacity="0.9"/>
      <ellipse cx="122" cy="282" rx="5" ry="3.6" fill="#f2eeff" opacity="0.9"/>
    </g>
    <g id="paw-right">
      <ellipse cx="192" cy="277" rx="29" ry="15" fill="url(#g-body)"/>
      <ellipse cx="182" cy="270" rx="10" ry="4" fill="#fff" opacity="0.45"/>
      <ellipse cx="178" cy="282" rx="5" ry="3.6" fill="#f2eeff" opacity="0.9"/>
      <ellipse cx="192" cy="284" rx="5" ry="3.6" fill="#f2eeff" opacity="0.9"/>
      <ellipse cx="206" cy="282" rx="5" ry="3.6" fill="#f2eeff" opacity="0.9"/>
    </g>
  </g>

  <!-- Голова (шире, чем у собаки) -->
  <g id="head">
    <!-- Маленькие круглые ушки сверху -->
    <g id="ears">
      <g id="ear-left">
        <ellipse cx="84" cy="64" rx="23" ry="25" fill="url(#g-ear)"/>
        <ellipse cx="84" cy="68" rx="12" ry="13.5" fill="#ffb7dc" opacity="0.85"/>
      </g>
      <g id="ear-right">
        <ellipse cx="216" cy="64" rx="23" ry="25" fill="url(#g-ear)"/>
        <ellipse cx="216" cy="68" rx="12" ry="13.5" fill="#ffb7dc" opacity="0.85"/>
      </g>
    </g>

    <!-- Лицо -->
    <ellipse id="face" cx="150" cy="128" rx="106" ry="76" fill="url(#g-fur)"/>
    <ellipse cx="108" cy="76" rx="52" ry="16" fill="url(#g-gloss)" transform="rotate(-14 108 76)"/>

    <!-- Большая морда -->
    <ellipse id="muzzle" cx="150" cy="170" rx="80" ry="50" fill="url(#g-muzzle)"/>

    <!-- Щёчки (надуваются в «Пузырях») -->
    <g id="cheeks">
      <ellipse cx="76" cy="152" rx="23" ry="16" fill="url(#g-cheek)"/>
      <ellipse cx="224" cy="152" rx="23" ry="16" fill="url(#g-cheek)"/>
    </g>

    <!-- Брови -->
    <g id="brows">
      <path id="brow-left"  d="M94 84 Q112 74 130 82" fill="none" stroke="var(--dog-secondary)" stroke-width="5" stroke-linecap="round"/>
      <path id="brow-right" d="M170 82 Q188 74 206 84" fill="none" stroke="var(--dog-secondary)" stroke-width="5" stroke-linecap="round"/>
    </g>

    <!-- Глаза -->
    <g id="eyes">
      <g id="eyes-open">
        <g id="eye-left">
          <ellipse cx="112" cy="106" rx="14" ry="16" fill="url(#g-eye)"/>
          <ellipse cx="117" cy="99" rx="5.2" ry="6.2" fill="#fff" opacity="0.95"/>
          <circle cx="106" cy="113" r="2.8" fill="#fff" opacity="0.6"/>
        </g>
        <g id="eye-right">
          <ellipse cx="188" cy="106" rx="14" ry="16" fill="url(#g-eye)"/>
          <ellipse cx="193" cy="99" rx="5.2" ry="6.2" fill="#fff" opacity="0.95"/>
          <circle cx="182" cy="113" r="2.8" fill="#fff" opacity="0.6"/>
        </g>
      </g>
      <g id="eyes-happy" class="hidden" fill="none" stroke="var(--dog-eye)" stroke-width="6" stroke-linecap="round">
        <path d="M98 111 Q112 91 126 111"/>
        <path d="M174 111 Q188 91 202 111"/>
      </g>
      <g id="eyes-closed" class="hidden" fill="none" stroke="var(--dog-eye)" stroke-width="5.5" stroke-linecap="round">
        <path d="M98 106 Q112 118 126 106"/>
        <path d="M174 106 Q188 118 202 106"/>
      </g>
    </g>

    <!-- Слеза (OFFENDED) -->
    <path id="tear" d="M98 124 C 90 136, 90 145, 98 147 C 106 145, 106 136, 98 124 Z"
          fill="#8fd0ff" stroke="#fff" stroke-width="1.5" stroke-opacity="0.9"/>

    <!-- Нос: широкие ноздри -->
    <g id="nose">
      <ellipse cx="127" cy="158" rx="11" ry="8" fill="url(#g-nose)"/>
      <ellipse cx="173" cy="158" rx="11" ry="8" fill="url(#g-nose)"/>
      <ellipse cx="123" cy="155" rx="4" ry="2.4" fill="#fff" opacity="0.75"/>
      <ellipse cx="169" cy="155" rx="4" ry="2.4" fill="#fff" opacity="0.75"/>
    </g>

    <!-- Рот -->
    <g id="mouth">
      <path id="mouth-smile" d="M112 182 Q150 210 188 182"
            fill="none" stroke="var(--dog-nose)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
      <g id="mouth-open">
        <path d="M116 184 Q150 238 184 184 Q150 172 116 184 Z" fill="#5a1d2b" stroke="var(--dog-nose)" stroke-width="3" stroke-linejoin="round"/>
        <rect x="135" y="183" width="13" height="11" rx="2.5" fill="#fff"/>
        <rect x="152" y="183" width="13" height="11" rx="2.5" fill="#fff"/>
        <ellipse cx="150" cy="215" rx="17" ry="8.5" fill="url(#g-tongue)"/>
      </g>
      <path id="tongue" class="hidden" d="M138 193 Q150 218 162 193 Z" fill="url(#g-tongue)"/>
    </g>

    <!-- Аксессуары (колпак, очки, корона): сюда вставляет PetHost.setAccessory -->
    <g id="accessories"></g>
  </g>
  </g>

  ${fxLayer({
    hearts: [[240, 52], [60, 56], [150, 30]],
    plus: [190, 70],
    react: [150, 38],
    anger: [244, 44],
    zzz: [[236, 74, 30], [254, 48, 22], [268, 28, 16]],
    food: WATERMELON.markup,
    extra: BUBBLES + NOTES + DROPS,
  })}
</svg>
`;
