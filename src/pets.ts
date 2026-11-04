import { DOG_SVG } from "./dog.svg";
import { HIPPO_SVG } from "./hippo.svg";
import type { TrickState } from "./PetStateMachine";
import type { FoodCounter, PetId } from "./settings";

export interface Trick {
  state: TrickState;
  label: string;
}

/** Описание питомца. Новый питомец = новый SVG по контракту из petParts.ts + запись здесь. */
export interface PetDef {
  id: PetId;
  /** Название в меню «Сменить питомца». */
  title: string;
  svg: string;
  /** Две уникальные кнопки трюков (меню по ПКМ и трей); показываются только при этом питомце. */
  tricks: [Trick, Trick];
  /** Трюк по двойному клику. */
  doubleClick: TrickState;
  /** Подпись кнопки «Покормить» (меню и трей) — по еде питомца. */
  feedLabel: string;
  /** Какой счётчик в settings.json растёт при кормлении. */
  foodCounter: FoodCounter;
  /** Подпись счётчика в меню: «Съедено костей» → «Съедено костей: 5». */
  foodCountLabel: string;
}

export const PETS: Record<PetId, PetDef> = {
  dog: {
    id: "dog",
    title: "🐶 Собачка",
    svg: DOG_SVG,
    tricks: [
      { state: "PLAYING", label: "🎾 Играть" },
      { state: "DIGGING", label: "🐾 Копать" },
    ],
    doubleClick: "SPINNING",
    feedLabel: "🦴 Покормить",
    foodCounter: "bonesEaten",
    foodCountLabel: "Съедено костей",
  },
  hippo: {
    id: "hippo",
    title: "🦛 Бегемотик",
    svg: HIPPO_SVG,
    tricks: [
      { state: "PLAYING", label: "🫧 Пузыри" },
      { state: "DANCING", label: "💃 Танцевать" },
    ],
    doubleClick: "SPLASHING",
    feedLabel: "🍉 Покормить",
    foodCounter: "melonsEaten",
    foodCountLabel: "Съедено арбузов",
  },
};

export const PET_IDS = Object.keys(PETS) as PetId[];
