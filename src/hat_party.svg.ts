import type { Anchors } from "./accessories";

/** Новогодний колпак: красный конус с загнутым кончиком, меховая кайма и помпон. Основание — в (hatX, hatY). */
export function hatParty(a: Anchors): string {
  return /* html */ `
    <defs>
      <linearGradient id="g-party" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#ff7a7d"/>
        <stop offset="0.55" stop-color="#e8283f"/>
        <stop offset="1" stop-color="#a50f26"/>
      </linearGradient>
      <radialGradient id="g-fur-trim" cx="40%" cy="30%" r="80%">
        <stop offset="0" stop-color="#ffffff"/>
        <stop offset="1" stop-color="#dfe3f5"/>
      </radialGradient>
    </defs>
    <g transform="translate(${a.hatX} ${a.hatY}) rotate(${a.hatTilt}) scale(0.82)">
      <path d="M-30 0 C -25 -26 -8 -45 24 -52 C 30 -38 31 -18 30 0 Z"
            fill="url(#g-party)" stroke="#8d0c20" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M-22 -8 C -17 -26 -6 -38 12 -45" fill="none" stroke="#fff" stroke-opacity="0.55"
            stroke-width="5" stroke-linecap="round"/>
      <g fill="#ffd84d">
        <circle cx="-6" cy="-20" r="2.6"/><circle cx="10" cy="-28" r="2.2"/>
        <circle cx="14" cy="-10" r="2.4"/><circle cx="-16" cy="-8" r="2"/>
      </g>
      <rect x="-35" y="-9" width="70" height="17" rx="8.5" fill="url(#g-fur-trim)" stroke="#c9cfe8" stroke-width="1"/>
      <circle cx="25" cy="-54" r="8.5" fill="url(#g-fur-trim)" stroke="#c9cfe8" stroke-width="1"/>
    </g>`;
}
