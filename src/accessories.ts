import { glasses } from "./glasses.svg";
import { hatCrown } from "./hat_crown.svg";
import { hatParty } from "./hat_party.svg";
import type { AccessoryId } from "./settings";

/**
 * Где у конкретного питомца голова: аксессуары рисуются по этим точкам, поэтому один и тот же
 * колпак/очки/корона садятся на собаку, бегемота и панду. Группа `#accessories` лежит ВНУТРИ `#head`
 * (поверх его содержимого, под слоем #fx), так что аксессуар двигается вместе с головой во всех
 * анимациях, а `#head.getBoundingClientRect()` включает торчащую шляпу — клики по шляпе тоже
 * попадают в хитбокс (его пересчитывает PetHost.setAccessory).
 */
export interface Anchors {
  /** X центра макушки и Y точки, куда садится основание шляпы. */
  hatX: number;
  hatY: number;
  /** Наклон шляпы, градусы. */
  hatTilt: number;
  /** Уровень глаз, половина расстояния между ними и масштаб линз. */
  eyeY: number;
  eyeDx: number;
  glassScale: number;
}

export const ACCESSORIES: { id: AccessoryId; label: string }[] = [
  { id: "none", label: "Нет" },
  { id: "party", label: "Колпак" },
  { id: "glasses", label: "Очки" },
  { id: "crown", label: "Корона" },
];

/** SVG-разметка аксессуара для вставки в `#accessories`. */
export function accessoryMarkup(id: AccessoryId, a: Anchors): string {
  switch (id) {
    case "party":
      return hatParty(a);
    case "glasses":
      return glasses(a);
    case "crown":
      return hatCrown(a);
    default:
      return "";
  }
}
