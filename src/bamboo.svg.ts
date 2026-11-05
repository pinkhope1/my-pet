/** Еда панды: бамбуковая палочка с листьями. Рисуется вокруг (0,0), падает сверху в рот (CSS #food). */
export const BAMBOO = {
  /** Градиенты — кладутся в <defs> SVG панды. */
  defs: /* html */ `
    <linearGradient id="g-bamboo" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#c9f08a"/>
      <stop offset="0.45" stop-color="#7fcf4a"/>
      <stop offset="1" stop-color="#3d8f2c"/>
    </linearGradient>
    <linearGradient id="g-leaf" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#a6e66b"/>
      <stop offset="1" stop-color="#2f9a3c"/>
    </linearGradient>`,
  /** Содержимое группы #food: стебель с узлами и два листика. */
  markup: /* html */ `
        <rect x="-30" y="-7" width="60" height="14" rx="7" fill="url(#g-bamboo)" stroke="#2f7a28" stroke-width="1.4"/>
        <g fill="#3d8f2c" opacity="0.85">
          <rect x="-14" y="-7.5" width="4.5" height="15" rx="2"/>
          <rect x="9" y="-7.5" width="4.5" height="15" rx="2"/>
        </g>
        <rect x="-26" y="-4.5" width="52" height="3" rx="1.5" fill="#fff" opacity="0.4"/>
        <path d="M24 -4 C 34 -22, 52 -24, 58 -18 C 50 -8, 36 -2, 24 -4 Z" fill="url(#g-leaf)" stroke="#2a7a33" stroke-width="1.2" stroke-linejoin="round"/>
        <path d="M26 -3 C 38 -12, 48 -17, 56 -18" fill="none" stroke="#fff" stroke-opacity="0.5" stroke-width="1.4" stroke-linecap="round"/>
        <path d="M22 2 C 36 12, 50 12, 56 20 C 42 24, 28 14, 22 2 Z" fill="url(#g-leaf)" stroke="#2a7a33" stroke-width="1.2" stroke-linejoin="round"/>`,
};
