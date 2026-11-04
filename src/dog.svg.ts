import { BONE } from "./bone.svg";
import { COMMON_DEFS, fxLayer } from "./petParts";

/** Мячик для «🎾 Играть» (собака гоняется за ним и приносит). */
const BALL = /* html */ `
    <g transform="translate(150 262)">
      <g id="ball">
        <circle r="13" fill="url(#g-ball)" stroke="#8aa616" stroke-width="1"/>
        <path d="M-12.4 -3.5 Q0 -10 12.4 -3.5 M-12.4 3.5 Q0 10 12.4 3.5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.85"/>
        <ellipse cx="-4.5" cy="-6" rx="4.5" ry="2.6" fill="#fff" opacity="0.8" transform="rotate(-30 -4.5 -6)"/>
      </g>
    </g>`;

/** Частицы земли для «🐾 Копать»: летят из-под передних лап (CSS .dirt, см. style.css). */
const DIRT = (() => {
  // x — откуда (относительно центра, у лап), r — радиус, dx/dy — куда летит, d — задержка (с)
  const defs = [
    { x: -44, r: 5, dx: -62, dy: -78, d: 0 },
    { x: -34, r: 4, dx: -38, dy: -96, d: 0.12 },
    { x: -26, r: 6, dx: -20, dy: -70, d: 0.26 },
    { x: -38, r: 3.5, dx: -80, dy: -52, d: 0.38 },
    { x: -30, r: 4.5, dx: -50, dy: -84, d: 0.5 },
    { x: 26, r: 6, dx: 20, dy: -72, d: 0.06 },
    { x: 34, r: 4, dx: 40, dy: -98, d: 0.18 },
    { x: 44, r: 5, dx: 64, dy: -76, d: 0.32 },
    { x: 38, r: 3.5, dx: 82, dy: -50, d: 0.44 },
    { x: 30, r: 4.5, dx: 52, dy: -86, d: 0.56 },
  ];
  const items = defs
    .map(
      (p) => `
      <g transform="translate(${150 + p.x} 270)">
        <g class="dirt" style="--dx:${p.dx}px;--dy:${p.dy}px;--d:${p.d}s">
          <circle r="${p.r}" fill="#8a5a31"/>
          <circle cx="${-p.r * 0.3}" cy="${-p.r * 0.3}" r="${p.r * 0.38}" fill="#c08a55" opacity="0.75"/>
        </g>
      </g>`,
    )
    .join("");
  return `<g id="dirt">${items}</g>`;
})();

// Собачка в стиле «глянцевый 3D-эмодзи». Чистый SVG, цвета — через CSS-переменные (style.css).
// Структура и id частей — по контракту из petParts.ts (общие анимации для всех питомцев).
export const DOG_SVG = /* html */ `
<svg id="pet" class="pet-dog" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Собачка">
  <defs>${COMMON_DEFS}${BONE.defs}</defs>

  <!-- Тень на земле -->
  <ellipse id="shadow" cx="150" cy="284" rx="88" ry="11" fill="url(#g-shadow)"/>

  <g id="rig">
  <!-- Хвост -->
  <g id="tail">
    <path d="M205 250 C 245 250, 268 222, 258 190 C 254 178, 240 178, 240 190 C 244 212, 232 228, 205 232 Z"
          fill="url(#g-fur)"/>
    <path d="M250 186 C 254 196, 252 204, 248 210" fill="none" stroke="#fff" stroke-opacity="0.55"
          stroke-width="5" stroke-linecap="round"/>
  </g>

  <!-- Тело -->
  <g id="body">
    <ellipse cx="150" cy="222" rx="72" ry="62" fill="url(#g-body)"/>
    <ellipse cx="150" cy="238" rx="42" ry="42" fill="url(#g-muzzle)"/>
    <ellipse cx="128" cy="190" rx="26" ry="12" fill="url(#g-gloss)" transform="rotate(-18 128 190)" opacity="0.7"/>
  </g>

  <!-- Лапки -->
  <g id="paws">
    <g id="paw-left">
      <ellipse cx="116" cy="276" rx="24" ry="15" fill="url(#g-body)"/>
      <ellipse cx="108" cy="270" rx="9" ry="4" fill="#fff" opacity="0.5"/>
      <path d="M110 281 v-6 M118 282 v-7 M126 281 v-6" stroke="var(--dog-secondary)" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
    </g>
    <g id="paw-right">
      <ellipse cx="184" cy="276" rx="24" ry="15" fill="url(#g-body)"/>
      <ellipse cx="176" cy="270" rx="9" ry="4" fill="#fff" opacity="0.5"/>
      <path d="M174 281 v-6 M182 282 v-7 M190 281 v-6" stroke="var(--dog-secondary)" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
    </g>
  </g>

  <!-- Голова -->
  <g id="head">
    <!-- Уши (висячие) -->
    <g id="ears">
      <g id="ear-left">
        <path d="M82 78 C 40 70, 22 120, 38 162 C 48 186, 76 176, 84 148 C 92 122, 96 96, 82 78 Z" fill="url(#g-ear)"/>
        <path d="M46 106 C 44 126, 48 144, 56 156" fill="none" stroke="#fff" stroke-opacity="0.35" stroke-width="6" stroke-linecap="round"/>
      </g>
      <g id="ear-right">
        <path d="M218 78 C 260 70, 278 120, 262 162 C 252 186, 224 176, 216 148 C 208 122, 204 96, 218 78 Z" fill="url(#g-ear)"/>
        <path d="M254 106 C 256 126, 252 144, 244 156" fill="none" stroke="#fff" stroke-opacity="0.35" stroke-width="6" stroke-linecap="round"/>
      </g>
    </g>

    <!-- Лицо -->
    <ellipse id="face" cx="150" cy="130" rx="92" ry="80" fill="url(#g-fur)"/>
    <!-- Глянцевый блик на лбу -->
    <ellipse cx="116" cy="74" rx="46" ry="17" fill="url(#g-gloss)" transform="rotate(-16 116 74)"/>
    <!-- Морда -->
    <ellipse id="muzzle" cx="150" cy="160" rx="46" ry="35" fill="url(#g-muzzle)"/>
    <!-- Румянец -->
    <ellipse cx="94" cy="150" rx="20" ry="13" fill="url(#g-cheek)"/>
    <ellipse cx="206" cy="150" rx="20" ry="13" fill="url(#g-cheek)"/>

    <!-- Брови -->
    <g id="brows">
      <path id="brow-left"  d="M102 96 Q118 88 134 95" fill="none" stroke="var(--dog-secondary)" stroke-width="5" stroke-linecap="round"/>
      <path id="brow-right" d="M166 95 Q182 88 198 96" fill="none" stroke="var(--dog-secondary)" stroke-width="5" stroke-linecap="round"/>
    </g>

    <!-- Глаза -->
    <g id="eyes">
      <g id="eyes-open">
        <g id="eye-left">
          <ellipse cx="118" cy="121" rx="15" ry="17" fill="url(#g-eye)"/>
          <ellipse cx="123" cy="114" rx="5.5" ry="6.5" fill="#fff" opacity="0.95"/>
          <circle cx="112" cy="128" r="3" fill="#fff" opacity="0.6"/>
        </g>
        <g id="eye-right">
          <ellipse cx="182" cy="121" rx="15" ry="17" fill="url(#g-eye)"/>
          <ellipse cx="187" cy="114" rx="5.5" ry="6.5" fill="#fff" opacity="0.95"/>
          <circle cx="176" cy="128" r="3" fill="#fff" opacity="0.6"/>
        </g>
      </g>
      <!-- Альтернативы для FSM (меняем видимость классом .hidden) -->
      <g id="eyes-happy" class="hidden" fill="none" stroke="var(--dog-eye)" stroke-width="6" stroke-linecap="round">
        <path d="M103 126 Q118 104 133 126"/>
        <path d="M167 126 Q182 104 197 126"/>
      </g>
      <g id="eyes-closed" class="hidden" fill="none" stroke="var(--dog-eye)" stroke-width="5.5" stroke-linecap="round">
        <path d="M103 122 Q118 134 133 122"/>
        <path d="M167 122 Q182 134 197 122"/>
      </g>
    </g>

    <!-- Слеза (OFFENDED) -->
    <path id="tear" d="M101 142 C 93 154, 93 163, 101 165 C 109 163, 109 154, 101 142 Z"
          fill="#8fd0ff" stroke="#fff" stroke-width="1.5" stroke-opacity="0.9"/>

    <!-- Нос -->
    <g id="nose">
      <ellipse cx="150" cy="143" rx="16" ry="11.5" fill="url(#g-nose)"/>
      <ellipse cx="144" cy="138.5" rx="6" ry="3.2" fill="#fff" opacity="0.8"/>
    </g>

    <!-- Рот -->
    <g id="mouth">
      <path id="mouth-smile" d="M150 154 L150 162 M150 162 Q137 177 124 165 M150 162 Q163 177 176 165"
            fill="none" stroke="var(--dog-nose)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
      <g id="mouth-open">
        <path d="M130 158 Q150 202 170 158 Q150 150 130 158 Z" fill="#5a1d2b" stroke="var(--dog-nose)" stroke-width="3" stroke-linejoin="round"/>
        <ellipse cx="150" cy="185" rx="12" ry="7" fill="url(#g-tongue)"/>
      </g>
      <path id="tongue" class="hidden" d="M142 170 Q150 192 158 170 Z" fill="url(#g-tongue)"/>
    </g>
  </g>
  </g>

  ${fxLayer({
    hearts: [[226, 62], [70, 56], [150, 30]],
    plus: [184, 78],
    react: [150, 36],
    anger: [232, 52],
    zzz: [[214, 84, 30], [236, 58, 22], [252, 38, 16]],
    food: BONE.markup,
    extra: BALL + DIRT,
  })}
</svg>
`;
