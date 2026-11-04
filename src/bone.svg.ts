/** Еда собаки: косточка. Рисуется вокруг (0,0), падает сверху в рот (CSS #food, см. style.css). */
export const BONE = {
  /** Градиент и форма — кладутся в <defs> SVG собаки. */
  defs: /* html */ `
    <radialGradient id="g-bone" cx="35%" cy="30%" r="85%">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.5" stop-color="#fff3dc"/>
      <stop offset="1" stop-color="#f1d9ae"/>
    </radialGradient>
    <g id="bone-shapes">
      <rect x="-26" y="-6.5" width="52" height="13" rx="6.5"/>
      <circle cx="-29" cy="-7.5" r="8.5"/><circle cx="-29" cy="7.5" r="8.5"/>
      <circle cx="29" cy="-7.5" r="8.5"/><circle cx="29" cy="7.5" r="8.5"/>
    </g>`,
  /** Содержимое группы #food. */
  markup: /* html */ `
        <use href="#bone-shapes" fill="#d4b98c" stroke="#d4b98c" stroke-width="3.5" stroke-linejoin="round"/>
        <use href="#bone-shapes" fill="url(#g-bone)"/>
        <ellipse cx="-4" cy="-3.2" rx="20" ry="2.2" fill="#fff" opacity="0.75"/>`,
};
