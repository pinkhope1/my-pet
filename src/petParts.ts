/**
 * Общие куски SVG для всех питомцев.
 *
 * Контракт питомца (чтобы работали ВСЕ CSS-анимации из style.css без дублирования):
 *   корень <svg id="pet" class="pet-<имя>">, внутри:
 *   #shadow, #rig > ( #tail, #body, #paws > (#paw-left, #paw-right),
 *                     #head > ( #ears > (#ear-left, #ear-right), #face, #muzzle,
 *                               #brows > (#brow-left, #brow-right),
 *                               #eyes > (#eyes-open, #eyes-happy, #eyes-closed), #tear,
 *                               #nose, #mouth > (#mouth-smile, #mouth-open, #tongue),
 *                               #accessories  — пустая группа ПОВЕРХ головы (последний ребёнок #head), под #fx:
 *                               сюда PetHost.setAccessory кладёт колпак/очки/корону по точкам PetDef.anchors ) ),
 *   #fx (сердечки .heart, #food, .plus1, .react-sym, #anger, #zzz .z, + свои эффекты трюков)
 * Цвета берутся из CSS-переменных --dog-primary, --dog-secondary, … (см. style.css).
 */

/** Градиенты и формы, одинаковые у всех питомцев (у еды — свои, в bone.svg.ts / watermelon.svg.ts). */
export const COMMON_DEFS = /* html */ `
    <radialGradient id="g-fur" cx="38%" cy="28%" r="80%">
      <stop offset="0" class="s-primary-hi"/>
      <stop offset="0.45" class="s-primary"/>
      <stop offset="1" class="s-secondary"/>
    </radialGradient>
    <radialGradient id="g-body" cx="40%" cy="25%" r="85%">
      <stop offset="0" class="s-primary-hi"/>
      <stop offset="0.5" class="s-primary"/>
      <stop offset="1" class="s-secondary"/>
    </radialGradient>
    <radialGradient id="g-ear" cx="35%" cy="25%" r="90%">
      <stop offset="0" class="s-ear-hi"/>
      <stop offset="0.5" class="s-ear"/>
      <stop offset="1" class="s-secondary"/>
    </radialGradient>
    <radialGradient id="g-muzzle" cx="42%" cy="30%" r="80%">
      <stop offset="0" class="s-belly-hi"/>
      <stop offset="0.6" class="s-belly"/>
      <stop offset="1" class="s-belly-lo"/>
    </radialGradient>
    <radialGradient id="g-nose" cx="35%" cy="28%" r="75%">
      <stop offset="0" class="s-nose-hi"/>
      <stop offset="0.45" class="s-nose"/>
      <stop offset="1" class="s-nose"/>
    </radialGradient>
    <radialGradient id="g-eye" cx="40%" cy="35%" r="75%">
      <stop offset="0" class="s-eye-hi"/>
      <stop offset="0.6" class="s-eye"/>
      <stop offset="1" class="s-eye"/>
    </radialGradient>
    <radialGradient id="g-cheek" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#ff7a8a" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#ff7a8a" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="g-shadow" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#000" stop-opacity="0.28"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="g-gloss" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="0.85"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="g-tongue" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ff8fa3"/>
      <stop offset="1" stop-color="#e5576f"/>
    </linearGradient>
    <radialGradient id="g-ball" cx="35%" cy="30%" r="80%">
      <stop offset="0" stop-color="#f4ff8a"/>
      <stop offset="0.55" stop-color="#cfee3a"/>
      <stop offset="1" stop-color="#97b81c"/>
    </radialGradient>
    <radialGradient id="g-bubble" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.04"/>
      <stop offset="0.7" stop-color="#bfe6ff" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#e6c9ff" stop-opacity="0.55"/>
    </radialGradient>
`;

type Pt = [number, number];

export interface FxOptions {
  /** Три сердечка (HAPPY/EATING). */
  hearts: [Pt, Pt, Pt];
  /** Где всплывает «+1». */
  plus: Pt;
  /** Где появляется случайный символ при одиночном клике (над головой). */
  react: Pt;
  /** Знак злости. */
  anger: Pt;
  /** Три буквы Zzz: x, y, размер шрифта. */
  zzz: [[number, number, number], [number, number, number], [number, number, number]];
  /** Содержимое #food: еда питомца (bone.svg.ts / watermelon.svg.ts); её <defs> питомец кладёт в свой <defs>. */
  food: string;
  /** Эффекты, специфичные для питомца (мячик, пузыри). */
  extra?: string;
}

/** Слой эффектов с общими для всех питомцев элементами. */
export function fxLayer(o: FxOptions): string {
  const [h1, h2, h3] = o.hearts;
  const [z1, z2, z3] = o.zzz;
  return /* html */ `
  <g id="fx">
    <!-- Сердечки (HAPPY / EATING) -->
    <g transform="translate(${h1[0]} ${h1[1]})"><path class="heart h1" d="M0 -5 C -9 -17 -24 -3 0 14 C 24 -3 9 -17 0 -5 Z"/></g>
    <g transform="translate(${h2[0]} ${h2[1]})"><path class="heart h2" d="M0 -4 C -7 -14 -19 -2 0 11 C 19 -2 7 -14 0 -4 Z"/></g>
    <g transform="translate(${h3[0]} ${h3[1]})"><path class="heart h3" d="M0 -4 C -6 -12 -16 -2 0 9 C 16 -2 6 -12 0 -4 Z"/></g>

    <!-- Еда питомца (EATING): падает сверху в рот -->
    <g transform="translate(150 0)">
      <g id="food">${o.food}
      </g>
    </g>

    <!-- «+1» после съеденной косточки -->
    <g transform="translate(${o.plus[0]} ${o.plus[1]})">
      <text class="plus1" font-family="Segoe UI, Arial, sans-serif" font-weight="800" font-size="30"
            fill="#ff5d8a" stroke="#fff" stroke-width="3" paint-order="stroke" text-anchor="middle">+1</text>
    </g>

    <!-- Символ над головой при одиночном клике: ! ? ❤️ … (текст и цвет подставляет PetStateMachine) -->
    <g transform="translate(${o.react[0]} ${o.react[1]})">
      <text class="react-sym" font-family="Segoe UI, Segoe UI Emoji, Arial, sans-serif" font-weight="800" font-size="40"
            fill="#ff5d8a" stroke="#fff" stroke-width="3.5" paint-order="stroke" text-anchor="middle">!</text>
    </g>

    <!-- Знак злости (ANGRY) -->
    <g transform="translate(${o.anger[0]} ${o.anger[1]})">
      <g id="anger">
        <path d="M-14 -14 L-5 -5 M14 -14 L5 -5 M-14 14 L-5 5 M14 14 L5 5" />
      </g>
    </g>

    <!-- Zzz (SLEEPING) -->
    <g id="zzz" font-family="Georgia, serif" font-weight="bold" fill="#6b8cff" stroke="#fff" stroke-width="1.5" paint-order="stroke">
      <text class="z z1" x="${z1[0]}" y="${z1[1]}" font-size="${z1[2]}">Z</text>
      <text class="z z2" x="${z2[0]}" y="${z2[1]}" font-size="${z2[2]}">z</text>
      <text class="z z3" x="${z3[0]}" y="${z3[1]}" font-size="${z3[2]}">z</text>
    </g>
    ${o.extra ?? ""}
  </g>`;
}
