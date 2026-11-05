import type { Anchors } from "./accessories";

/** Золотая корона с самоцветами. Основание — в (hatX, hatY). */
export function hatCrown(a: Anchors): string {
  return /* html */ `
    <defs>
      <linearGradient id="g-gold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fff3a8"/>
        <stop offset="0.45" stop-color="#ffc83a"/>
        <stop offset="1" stop-color="#c98a0a"/>
      </linearGradient>
    </defs>
    <g transform="translate(${a.hatX} ${a.hatY + 2}) rotate(${a.hatTilt * 0.5})">
      <path d="M-32 0 L-35 -32 L-17 -15 L0 -41 L17 -15 L35 -32 L32 0 Z"
            fill="url(#g-gold)" stroke="#a87208" stroke-width="1.6" stroke-linejoin="round"/>
      <rect x="-32" y="-9" width="64" height="11" rx="3.5" fill="url(#g-gold)" stroke="#a87208" stroke-width="1.4"/>
      <g fill="url(#g-gold)" stroke="#a87208" stroke-width="1.2">
        <circle cx="-35" cy="-34" r="4.4"/><circle cx="0" cy="-43" r="4.8"/><circle cx="35" cy="-34" r="4.4"/>
      </g>
      <circle cx="-17" cy="-3.5" r="3.3" fill="#ff4d6d" stroke="#fff" stroke-opacity="0.7" stroke-width="0.8"/>
      <circle cx="0" cy="-3.5" r="3.8" fill="#4fa8ff" stroke="#fff" stroke-opacity="0.7" stroke-width="0.8"/>
      <circle cx="17" cy="-3.5" r="3.3" fill="#ff4d6d" stroke="#fff" stroke-opacity="0.7" stroke-width="0.8"/>
      <path d="M-26 -12 L-24 -24" stroke="#fff" stroke-opacity="0.65" stroke-width="3" stroke-linecap="round" fill="none"/>
    </g>`;
}
