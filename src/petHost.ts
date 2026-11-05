import { invoke } from "@tauri-apps/api/core";
import { accessoryMarkup } from "./accessories";
import { PetStateMachine, type PetHooks } from "./PetStateMachine";
import { PETS, type PetDef } from "./pets";
import { setAccessoryId, setCurrentPet, settings, type AccessoryId, type PetId } from "./settings";
import { IS_TAURI, refreshHitRegions, setPollInterval } from "./windowControl";
import { returnHome } from "./windowMotion";

/** Пересчитать хитбоксы сразу и после раскладки (две отрисовки кадра). */
function refreshHitRegionsSoon(): void {
  refreshHitRegions();
  requestAnimationFrame(() => requestAnimationFrame(refreshHitRegions));
}

/**
 * Держит «текущего питомца»: его SVG в DOM, его PetStateMachine и надетый аксессуар.
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
    /** Вызывается после каждой подстановки питомца (например, возобновить опрос буфера обмена). */
    private onMount?: () => void,
  ) {}

  /** Подменить SVG, пересоздать машину состояний под нового питомца, надеть аксессуар, пересчитать хитбоксы. */
  mount(id: PetId): void {
    const def = PETS[id];

    // Старую машину гасим (таймеры). Если питомец был в обиде у края экрана — возвращаем его на место.
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
    this.applyAccessory(settings.accessory);

    setPollInterval(50); // новый питомец всегда бодрствует
    if (IS_TAURI) {
      // Старая машина могла быть в CATCHING — слежение за курсором в Rust больше не нужно.
      void invoke("set_tracking", { on: false });
      // Пункты трея («Покормить» и два трюка) называются по питомцу.
      void invoke("set_tray_labels", { feed: def.feedLabel, tricks: def.tricks.map((t) => t.label) });
    }
    // У питомцев разные пропорции (у бегемота голова шире) — хитбоксы нужно пересчитать.
    refreshHitRegionsSoon();
    this.onMount?.();
  }

  /** Переключение из меню/трея: показать нового питомца и запомнить выбор в settings.json. */
  switchTo(id: PetId): void {
    if (this.def?.id === id) return;
    this.mount(id);
    setCurrentPet(id);
  }

  /**
   * Надеть аксессуар (колпак / очки / корону) или снять («none»). Рисуется по точкам питомца
   * (def.anchors) в `#accessories`; выбор сохраняется. Шляпа торчит над головой, поэтому после смены
   * хитбоксы пересчитываются — рамка `#head` включает аксессуар, и клики по шляпе попадают в питомца.
   */
  setAccessory(id: AccessoryId): void {
    this.applyAccessory(id);
    setAccessoryId(id);
    refreshHitRegionsSoon();
  }

  private applyAccessory(id: AccessoryId): void {
    const layer = this.el.querySelector("#accessories");
    if (layer) layer.innerHTML = accessoryMarkup(id, this.def.anchors);
  }
}
