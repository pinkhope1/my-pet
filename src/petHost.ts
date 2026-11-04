import { PetStateMachine, type PetHooks } from "./PetStateMachine";
import { PETS, type PetDef } from "./pets";
import { setCurrentPet, type PetId } from "./settings";
import { invoke } from "@tauri-apps/api/core";
import { IS_TAURI, refreshHitRegions, setPollInterval } from "./windowControl";
import { returnHome } from "./windowMotion";

/**
 * Держит «текущего питомца»: его SVG в DOM и его PetStateMachine.
 * Ввод, меню и трей обращаются к `host.fsm` / `host.el` в момент события,
 * поэтому при смене питомца ничего больше пересоздавать не нужно.
 */
export class PetHost {
  def!: PetDef;
  el!: SVGElement;
  fsm!: PetStateMachine;

  constructor(
    private app: HTMLElement,
    private hooks: PetHooks,
  ) {}

  /** Подменить SVG, пересоздать машину состояний под нового питомца, пересчитать хитбоксы. */
  mount(id: PetId): void {
    const def = PETS[id];

    // Старую машину гасим (таймеры). Если собака была в обиде у края экрана — возвращаем её на место.
    if (this.fsm) {
      const was = this.fsm.state;
      this.fsm.dispose();
      if (was === "OFFENDED") void returnHome();
    }

    this.app.innerHTML = def.svg;
    const el = this.app.querySelector<SVGElement>("#pet");
    if (!el) throw new Error(`SVG питомца "${id}" без корня #pet`);

    this.def = def;
    this.el = el;
    this.fsm = new PetStateMachine(el, this.hooks);

    setPollInterval(50); // новый питомец всегда бодрствует
    // Пункты трея («Покормить» и два трюка) называются по питомцу: 🦴/🍉, Играть/Копать, Пузыри/Танцевать.
    if (IS_TAURI) {
      void invoke("set_tray_labels", { feed: def.feedLabel, tricks: def.tricks.map((t) => t.label) });
    }
    // У бегемота пропорции шире, чем у собаки — хитбоксы нужно пересчитать (сразу и после раскладки).
    refreshHitRegions();
    requestAnimationFrame(() => requestAnimationFrame(refreshHitRegions));
  }

  /** Переключение из меню: показать нового питомца и запомнить выбор в settings.json. */
  switchTo(id: PetId): void {
    if (this.def?.id === id) return;
    this.mount(id);
    setCurrentPet(id);
  }
}
