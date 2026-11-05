import { BAMBOO } from "./bamboo.svg";
import { COMMON_DEFS, fxLayer } from "./petParts";

// Панда в стиле «глянцевый 3D-эмодзи»: белая, с чёрными ушками, лапами и пятнами вокруг глаз.
// Те же id частей, что у остальных питомцев (контракт в petParts.ts) — все CSS-анимации работают
// без дублирования. Палитра белых частей задаётся в style.css (.pet-panda), чёрные части — градиентом ниже.
export const PANDA_SVG = /* html */ `
<svg id="pet" class="pet-panda" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Панда">
  <defs>
    ${COMMON_DEFS}
    ${BAMBOO.defs}
    <radialGradient id="g-black" cx="38%" cy="28%" r="85%">
      <stop offset="0" stop-color="#5b5b6c"/>
      <stop offset="0.45" stop-color="#2b2b36"/>
      <stop offset="1" stop-color="#101016"/>
    </radialGradient>
    <radialGradient id="g-patch" cx="40%" cy="30%" r="80%">
      <stop offset="0" stop-color="#4a4a5a"/>
      <stop offset="0.5" stop-color="#23232d"/>
      <stop offset="1" stop-color="#0e0e14"/>
    </radialGradient>
  </defs>

  <!-- Тень на земле -->
  <ellipse id="shadow" cx="150" cy="284" rx="96" ry="11" fill="url(#g-shadow)"/>

  <g id="rig">
  <!-- Хвостик-комочек -->
  <g id="tail">
    <ellipse cx="226" cy="246" rx="17" ry="15" fill="url(#g-fur)" stroke="#cdd0e0" stroke-width="1.4"/>
    <ellipse cx="221" cy="240" rx="7" ry="4" fill="#fff" opacity="0.6"/>
  </g>

  <!-- Тело: белое, чёрные «руки» по бокам -->
  <g id="body">
    <ellipse cx="150" cy="226" rx="76" ry="62" fill="url(#g-body)" stroke="#cdd0e0" stroke-width="1.6"/>
    <ellipse cx="150" cy="242" rx="46" ry="40" fill="url(#g-muzzle)"/>
    <ellipse cx="86" cy="222" rx="21" ry="40" fill="url(#g-black)" transform="rotate(18 86 222)"/>
    <ellipse cx="214" cy="222" rx="21" ry="40" fill="url(#g-black)" transform="rotate(-18 214 222)"/>
    <ellipse cx="80" cy="204" rx="6" ry="14" fill="#fff" opacity="0.22" transform="rotate(18 80 204)"/>
    <ellipse cx="220" cy="204" rx="6" ry="14" fill="#fff" opacity="0.22" transform="rotate(-18 220 204)"/>
    <ellipse cx="124" cy="190" rx="26" ry="11" fill="url(#g-gloss)" transform="rotate(-18 124 190)" opacity="0.6"/>
  </g>

  <!-- Лапки (чёрные) с розовыми подушечками -->
  <g id="paws">
    <g id="paw-left">
      <ellipse cx="112" cy="277" rx="29" ry="15" fill="url(#g-black)"/>
      <ellipse cx="102" cy="270" rx="9" ry="3.6" fill="#fff" opacity="0.3"/>
      <ellipse cx="112" cy="281" rx="9" ry="5" fill="#ff9db5" opacity="0.9"/>
    </g>
    <g id="paw-right">
      <ellipse cx="188" cy="277" rx="29" ry="15" fill="url(#g-black)"/>
      <ellipse cx="178" cy="270" rx="9" ry="3.6" fill="#fff" opacity="0.3"/>
      <ellipse cx="188" cy="281" rx="9" ry="5" fill="#ff9db5" opacity="0.9"/>
    </g>
  </g>

  <!-- Голова -->
  <g id="head">
    <!-- Круглые чёрные ушки -->
    <g id="ears">
      <g id="ear-left">
        <circle cx="76" cy="64" r="27" fill="url(#g-black)"/>
        <ellipse cx="68" cy="55" rx="10" ry="6" fill="#fff" opacity="0.25" transform="rotate(-30 68 55)"/>
      </g>
      <g id="ear-right">
        <circle cx="224" cy="64" r="27" fill="url(#g-black)"/>
        <ellipse cx="216" cy="55" rx="10" ry="6" fill="#fff" opacity="0.25" transform="rotate(-30 216 55)"/>
      </g>
    </g>

    <!-- Лицо -->
    <ellipse id="face" cx="150" cy="128" rx="100" ry="78" fill="url(#g-fur)" stroke="#cdd0e0" stroke-width="1.6"/>
    <ellipse cx="112" cy="74" rx="48" ry="16" fill="url(#g-gloss)" transform="rotate(-14 112 74)"/>

    <!-- Чёрные пятна вокруг глаз (характерные, «опущенные» наружу) -->
    <ellipse cx="110" cy="122" rx="22" ry="29" fill="url(#g-patch)" transform="rotate(24 110 122)"/>
    <ellipse cx="190" cy="122" rx="22" ry="29" fill="url(#g-patch)" transform="rotate(-24 190 122)"/>

    <!-- Морда -->
    <ellipse id="muzzle" cx="150" cy="160" rx="40" ry="30" fill="url(#g-muzzle)"/>
    <!-- Румянец -->
    <ellipse cx="82" cy="154" rx="17" ry="11" fill="url(#g-cheek)"/>
    <ellipse cx="218" cy="154" rx="17" ry="11" fill="url(#g-cheek)"/>

    <!-- Брови (над чёрными пятнами, на белом) -->
    <g id="brows">
      <path id="brow-left"  d="M98 84 Q112 76 128 82" fill="none" stroke="#3b3b4a" stroke-width="5" stroke-linecap="round"/>
      <path id="brow-right" d="M172 82 Q188 76 202 84" fill="none" stroke="#3b3b4a" stroke-width="5" stroke-linecap="round"/>
    </g>

    <!-- Глаза на чёрных пятнах: светлые блики, у «закрытых» и «радостных» глаз линии белые -->
    <g id="eyes">
      <g id="eyes-open">
        <g id="eye-left">
          <ellipse cx="113" cy="119" rx="11.5" ry="13.5" fill="url(#g-eye)"/>
          <ellipse cx="117" cy="113" rx="5" ry="6" fill="#fff" opacity="0.97"/>
          <circle cx="108" cy="125" r="2.6" fill="#fff" opacity="0.65"/>
        </g>
        <g id="eye-right">
          <ellipse cx="187" cy="119" rx="11.5" ry="13.5" fill="url(#g-eye)"/>
          <ellipse cx="191" cy="113" rx="5" ry="6" fill="#fff" opacity="0.97"/>
          <circle cx="182" cy="125" r="2.6" fill="#fff" opacity="0.65"/>
        </g>
      </g>
      <g id="eyes-happy" class="hidden" fill="none" stroke="#fff" stroke-width="5.5" stroke-linecap="round">
        <path d="M100 124 Q113 104 126 124"/>
        <path d="M174 124 Q187 104 200 124"/>
      </g>
      <g id="eyes-closed" class="hidden" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round">
        <path d="M100 120 Q113 131 126 120"/>
        <path d="M174 120 Q187 131 200 120"/>
      </g>
    </g>

    <!-- Слеза (OFFENDED) -->
    <path id="tear" d="M96 144 C 88 156, 88 165, 96 167 C 104 165, 104 156, 96 144 Z"
          fill="#8fd0ff" stroke="#fff" stroke-width="1.5" stroke-opacity="0.95"/>

    <!-- Нос -->
    <g id="nose">
      <ellipse cx="150" cy="146" rx="14" ry="10" fill="url(#g-nose)"/>
      <ellipse cx="145" cy="142" rx="5.2" ry="2.8" fill="#fff" opacity="0.75"/>
    </g>

    <!-- Рот -->
    <g id="mouth">
      <path id="mouth-smile" d="M150 156 L150 162 M150 162 Q138 174 126 164 M150 162 Q162 174 174 164"
            fill="none" stroke="var(--dog-nose)" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
      <g id="mouth-open">
        <path d="M132 160 Q150 202 168 160 Q150 152 132 160 Z" fill="#5a1d2b" stroke="var(--dog-nose)" stroke-width="3" stroke-linejoin="round"/>
        <ellipse cx="150" cy="186" rx="12" ry="7" fill="url(#g-tongue)"/>
      </g>
      <path id="tongue" class="hidden" d="M142 170 Q150 192 158 170 Z" fill="url(#g-tongue)"/>
    </g>

    <!-- Красная повязка ниндзя (видна только в NINJA) -->
    <g id="ninja-band">
      <path d="M52 92 Q150 66 248 92 L246 106 Q150 80 54 106 Z" fill="#e8283f" stroke="#a50f26" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M70 90 Q150 72 230 90" fill="none" stroke="#fff" stroke-opacity="0.45" stroke-width="3" stroke-linecap="round"/>
      <path d="M246 98 Q268 90 280 104 Q266 100 252 106 Z M246 100 Q270 108 284 124 Q266 112 250 108 Z" fill="#c4162a"/>
    </g>

    <!-- Аксессуары (колпак, очки, корона): сюда вставляет PetHost.setAccessory -->
    <g id="accessories"></g>
  </g>
  </g>

  ${fxLayer({
    hearts: [[242, 58], [58, 60], [150, 28]],
    plus: [190, 72],
    anger: [244, 46],
    react: [150, 34],
    zzz: [[236, 80, 30], [254, 54, 22], [268, 34, 16]],
    food: BAMBOO.markup,
  })}
</svg>
`;
