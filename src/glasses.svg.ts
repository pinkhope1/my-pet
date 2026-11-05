import type { Anchors } from "./accessories";

/** Крутые тёмные очки поверх глаз. Центр линз — на уровне глаз питомца (eyeY, ±eyeDx). */
export function glasses(a: Anchors): string {
  const { eyeY, eyeDx, glassScale: s } = a;
  const cx = 150;
  const lens = (x: number) => /* html */ `
      <g transform="translate(${x} ${eyeY}) scale(${s})">
        <path d="M-20 -13 Q-20 -16 -16 -16 H16 Q20 -16 20 -12 V4 Q20 16 6 16 H-6 Q-20 16 -20 4 Z"
              fill="url(#g-lens)" stroke="#0d0d12" stroke-width="3" stroke-linejoin="round" fill-opacity="0.93"/>
        <path d="M-14 -12 L-3 -12 L-12 11 L-17 11 Z" fill="#fff" opacity="0.3"/>
        <path d="M2 -12 L6 -12 L-2 6 L-5 6 Z" fill="#fff" opacity="0.18"/>
      </g>`;
  return /* html */ `
    <defs>
      <linearGradient id="g-lens" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#3a4a78"/>
        <stop offset="0.5" stop-color="#14192e"/>
        <stop offset="1" stop-color="#05060d"/>
      </linearGradient>
    </defs>
    <g id="glasses">
      <path d="M${cx - eyeDx + 19 * s} ${eyeY - 6 * s} Q${cx} ${eyeY - 14 * s} ${cx + eyeDx - 19 * s} ${eyeY - 6 * s}"
            fill="none" stroke="#0d0d12" stroke-width="3.6" stroke-linecap="round"/>
      <path d="M${cx - eyeDx - 20 * s} ${eyeY - 6 * s} L${cx - eyeDx - 32 * s} ${eyeY - 9 * s}
               M${cx + eyeDx + 20 * s} ${eyeY - 6 * s} L${cx + eyeDx + 32 * s} ${eyeY - 9 * s}"
            fill="none" stroke="#0d0d12" stroke-width="3.4" stroke-linecap="round"/>
      ${lens(cx - eyeDx)}
      ${lens(cx + eyeDx)}
    </g>`;
}
