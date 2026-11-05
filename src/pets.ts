import type { Anchors } from "./accessories";
import { DOG_SVG } from "./dog.svg";
import { HIPPO_SVG } from "./hippo.svg";
import { PANDA_SVG } from "./panda.svg";
import type { TrickState } from "./PetStateMachine";
import type { FoodCounter, PetId } from "./settings";

export interface Trick {
  state: TrickState;
  label: string;
}

/** Описание питомца. Новый питомец = новый SVG по контракту из petParts.ts + запись здесь. */
export interface PetDef {
  id: PetId;
  /** Название в меню «Сменить питомца» и в заголовке меню. */
  title: string;
  /** Эмодзи и короткое имя для кнопки смены питомца. */
  emoji: string;
  name: string;
  /** Где у питомца голова — по этим точкам садятся аксессуары. */
  anchors: Anchors;
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
    emoji: "🐶",
    name: "Собачка",
    anchors: { hatX: 150, hatY: 66, hatTilt: 8, eyeY: 121, eyeDx: 32, glassScale: 1 },
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
    emoji: "🦛",
    name: "Бегемотик",
    anchors: { hatX: 150, hatY: 70, hatTilt: 8, eyeY: 106, eyeDx: 38, glassScale: 1.05 },
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
  panda: {
    id: "panda",
    title: "🐼 Панда",
    emoji: "🐼",
    name: "Панда",
    anchors: { hatX: 150, hatY: 66, hatTilt: 8, eyeY: 119, eyeDx: 37, glassScale: 1.1 },
    svg: PANDA_SVG,
    tricks: [
      { state: "ROLLING", label: "🤸 Кувырок" },
      { state: "NINJA", label: "🥋 Ниндзя" },
    ],
    doubleClick: "NINJA",
    feedLabel: "🎋 Покормить",
    foodCounter: "bamboosEaten",
    foodCountLabel: "Съедено бамбука",
  },
};

export const PET_IDS = Object.keys(PETS) as PetId[];
