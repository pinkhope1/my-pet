/** Еда бегемота: арбузная долька. Рисуется вокруг (0,0), падает сверху в рот (CSS #food, см. style.css). */
export const WATERMELON = {
  /** Градиенты — кладутся в <defs> SVG бегемота. */
  defs: /* html */ `
    <radialGradient id="g-melon-flesh" cx="40%" cy="25%" r="90%">
      <stop offset="0" stop-color="#ff8a93"/>
      <stop offset="0.55" stop-color="#ff4f63"/>
      <stop offset="1" stop-color="#e02a47"/>
    </radialGradient>
    <linearGradient id="g-melon-rind" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5fd66b"/>
      <stop offset="1" stop-color="#1f8f3e"/>
    </linearGradient>`,
  /** Содержимое группы #food: зелёная корка, светлая прослойка, красная мякоть, чёрные косточки, блик. */
  markup: /* html */ `
        <path d="M-26 -9 A26 26 0 0 0 26 -9 Z" fill="url(#g-melon-rind)" stroke="#1a7a35" stroke-width="1.2" stroke-linejoin="round"/>
        <path d="M-22.5 -9 A22.5 22.5 0 0 0 22.5 -9 Z" fill="#d8f5b8"/>
        <path d="M-20.5 -9 A20.5 20.5 0 0 0 20.5 -9 Z" fill="url(#g-melon-flesh)"/>
        <g fill="#2a1a22">
          <ellipse cx="-10" cy="1" rx="2" ry="3.4" transform="rotate(-20 -10 1)"/>
          <ellipse cx="0" cy="6" rx="2" ry="3.4"/>
          <ellipse cx="10" cy="1" rx="2" ry="3.4" transform="rotate(20 10 1)"/>
          <ellipse cx="-5" cy="-3.5" rx="1.7" ry="3" transform="rotate(-15 -5 -3.5)"/>
          <ellipse cx="5" cy="-3.5" rx="1.7" ry="3" transform="rotate(15 5 -3.5)"/>
        </g>
        <ellipse cx="-9" cy="-5.2" rx="9" ry="2.2" fill="#fff" opacity="0.45" transform="rotate(-8 -9 -5.2)"/>`,
};
