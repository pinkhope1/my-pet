/** Состояния-трюки: общие для всех питомцев, но у каждого питомца свои кнопки и своя картинка (CSS). */
export type TrickState =
  | "PLAYING" | "DIGGING" | "DANCING" | "SPINNING" | "SPLASHING"
  | "ROLLING" | "NINJA";

export type PetState =
  | "IDLE" | "HAPPY" | "ANGRY" | "OFFENDED" | "SLEEPING" | "EATING" | "CATCHING"
  | TrickState;

const ALL_STATES: PetState[] = [
  "IDLE", "HAPPY", "ANGRY", "OFFENDED", "SLEEPING", "EATING",
  "CATCHING", "PLAYING", "DIGGING", "DANCING", "SPINNING", "SPLASHING", "ROLLING", "NINJA",
];

/** Длительность трюков, мс (совпадает с длительностью CSS-анимаций в style.css). */
const TRICK_MS: Record<TrickState, number> = {
  PLAYING: 3600,   // мячик / пузыри → затем HAPPY
  DIGGING: 2000,   // копает → IDLE
  DANCING: 3000,   // танцует → IDLE
  SPINNING: 1500,  // крутится и садится → IDLE
  SPLASHING: 1500, // «бомбочка» → IDLE
  ROLLING: 1800,   // кувырок (сальто) и встаёт → IDLE
  NINJA: 1500,     // пируэт и боевая стойка → IDLE
};

// Тайминги (мс)
const CLICK_BURST_COUNT = 5;       // сколько кликов
const CLICK_BURST_WINDOW = 2000;   // за какое время → злость
const HAPPY_HOLD = 1500;           // сколько HAPPY держится после последнего поглаживания
const ANGRY_DURATION = 3000;       // злится 3 с, затем убегает (OFFENDED)
const SLEEP_AFTER = 2 * 60 * 1000; // бездействие до сна
const FORGIVE_NEEDED = 3000;       // сколько нужно нежно гладить обиженного питомца
const FORGIVE_MAX_GAP = 600;       // пауза в поглаживании дольше этого сбрасывает отсчёт
const EAT_LAND_MS = 900;           // еда падает 0,9 с и «съедается» (совпадает с CSS food-fall)
const EAT_DURATION = 2400;         // падение + жевание, затем HAPPY
const REACT_MS = 1000;             // реакция на одиночный клик: подпрыгивание + символ
const CATCH_HOLD = 1000;           // CATCHING длится ~1 с после последнего быстрого движения мыши

/** Символы над головой при одиночном клике: [символ, цвет]. */
const REACT_SYMBOLS: [string, string][] = [
  ["!", "#ff5a5f"],
  ["?", "#4f8cff"],
  ["❤️", "#ff5d8a"],
  ["♪", "#a06bff"],
  ["✨", "#ffb400"],
  ["⭐", "#ffb400"],
];

/**
 * Кольцевой буфер фиксированной длины (аналог deque(maxlen=N)):
 * память выделяется один раз, старые значения вытесняются новыми.
 */
export class BoundedDeque {
  private buf: number[];
  private head = 0; // индекс самого старого элемента
  private size = 0;

  constructor(readonly maxlen: number) {
    this.buf = new Array<number>(maxlen).fill(0);
  }

  push(v: number): void {
    const tail = (this.head + this.size) % this.maxlen;
    this.buf[tail] = v;
    if (this.size < this.maxlen) this.size++;
    else this.head = (this.head + 1) % this.maxlen;
  }

  get length(): number {
    return this.size;
  }
  get full(): boolean {
    return this.size === this.maxlen;
  }
  get oldest(): number {
    return this.buf[this.head];
  }
  get newest(): number {
    return this.buf[(this.head + this.size - 1) % this.maxlen];
  }
  clear(): void {
    this.head = 0;
    this.size = 0;
  }
}

export interface PetHooks {
  /** Вызывается при каждой смене состояния (после смены CSS-класса). */
  onChange?: (next: PetState, prev: PetState) => void;
  /** Еда долетела до рта и съедена (здесь увеличиваем счётчик). */
  onEat?: () => void;
}

/** Данные о курсоре от Rust-потока (скорость посчитана там) + положение относительно питомца. */
export interface CursorInfo {
  /** Мышь движется быстро (порог задан в Rust, поток опроса курсора). */
  fast: boolean;
  /** Курсор над головой питомца или рядом с ней. */
  near: boolean;
  /** Куда смотреть: -1…1 по осям относительно центра головы. */
  lookX: number;
  lookY: number;
}

/** Результат физического клика (см. PetStateMachine.click). */
export type ClickResult = "ok" | "burst" | "ignored";

/**
 * Машина состояний питомца. Состояние отражается CSS-классом `state-<name>`
 * на корневом элементе, а все анимации привязаны только к этим классам:
 * в IDLE, OFFENDED и SLEEPING бесконечных анимаций нет, а в SLEEPING и
 * OFFENDED нет и ни одного JS-таймера (выход — только по событию мыши/трея).
 *
 *   IDLE ──поглаживание──▶ HAPPY ──1.5 с──▶ IDLE
 *   IDLE ──5 кликов/2 с──▶ ANGRY ──3 с──▶ OFFENDED ──гладить 3 с──▶ HAPPY
 *   IDLE ──2 мин──▶ SLEEPING ──наведение──▶ HAPPY      OFFENDED ──«позвать»──▶ IDLE
 *   любое (кроме ANGRY) ──«покормить»──▶ EATING ──2,4 с──▶ HAPPY ──1,5 с──▶ IDLE
 *   IDLE/HAPPY/SLEEPING ──трюк из меню / двойной клик──▶ PLAYING | DIGGING | DANCING | SPINNING | SPLASHING
 *       (PLAYING → HAPPY, остальные → IDLE)
 *   IDLE/HAPPY ──быстро провели мышью у головы──▶ CATCHING ──1 с после остановки мыши──▶ IDLE
 *   любое ──схватили и тащат──▶ IDLE (анимации прерываются)
 *
 * Одиночный клик не меняет состояние: на IDLE/HAPPY он лишь добавляет класс `reacting`
 * (подпрыгивание + символ над головой на 1 с). Все физические клики при этом считаются
 * в deque — 5 быстрых кликов злят питомца независимо от того, что в это время делает он.
 *
 * Класс не знает, какой это питомец: он только ставит `state-*` на корневой <svg>.
 * Внешний вид задают общие id частей (#head, #eyes, …) и CSS.
 */
export class PetStateMachine {
  private _state: PetState = "IDLE";
  private clicks = new BoundedDeque(CLICK_BURST_COUNT);
  private stateTimer: number | undefined; // HAPPY→IDLE, ANGRY→OFFENDED, трюк→IDLE/HAPPY
  private idleTimer: number | undefined;  // IDLE→SLEEPING
  private eatTimer: number | undefined;   // момент, когда еда съедена
  private reactTimer: number | undefined; // конец реакции на клик
  private disposed = false;
  private lastActivity = performance.now();
  // Отсчёт «прощения» в OFFENDED (вычисляется по событиям, без таймеров)
  private forgiveStart = 0;
  private forgiveLast = 0;

  constructor(
    private root: HTMLElement | SVGElement,
    private hooks: PetHooks = {},
  ) {
    this.applyClass();
    this.scheduleIdleCheck(SLEEP_AFTER);
  }

  get state(): PetState {
    return this._state;
  }

  // ---------- События от мыши ----------

  /** Любое действие пользователя: откладывает сон. Очень дешёвый вызов. */
  activity(): void {
    this.lastActivity = performance.now();
  }

  /**
   * Физический клик (вызывается сразу при каждом клике, до разбора «одиночный/двойной»).
   * 5 кликов быстрее 2 секунд → ANGRY ("burst"). Клики считаются в любом состоянии,
   * кроме ANGRY/OFFENDED (там питомцу не до кликов), даже во время трюков.
   * "ignored" — реагировать на клик (одиночный/двойной) не нужно.
   */
  click(): ClickResult {
    this.activity();
    if (this._state === "ANGRY" || this._state === "OFFENDED") return "ignored";

    const now = performance.now();
    this.clicks.push(now);
    if (this.clicks.full && now - this.clicks.oldest < CLICK_BURST_WINDOW) {
      this.clicks.clear();
      this.transition("ANGRY", ANGRY_DURATION, "OFFENDED");
      return "burst";
    }
    if (this._state === "SLEEPING") {
      this.transition("HAPPY", HAPPY_HOLD);
      return "ignored";
    }
    return "ok";
  }

  /**
   * Одиночный клик (подтверждён таймаутом 250 мс без второго): подпрыгивание
   * и случайный символ над головой на 1 с. Только в IDLE/HAPPY, состояние не меняется.
   */
  singleClick(): void {
    if (this.disposed) return;
    if (this._state !== "IDLE" && this._state !== "HAPPY") return;
    this.activity();

    const sym = this.root.querySelector<SVGTextElement>(".react-sym");
    if (sym) {
      const [text, color] = REACT_SYMBOLS[Math.floor(Math.random() * REACT_SYMBOLS.length)];
      sym.textContent = text;
      sym.style.fill = color;
    }
    // Повторный клик во время реакции перезапускает анимацию.
    this.root.classList.remove("reacting");
    void this.root.getBoundingClientRect();
    this.root.classList.add("reacting");
    window.clearTimeout(this.reactTimer);
    this.reactTimer = window.setTimeout(() => this.endReaction(), REACT_MS);
  }

  /** Плавное поглаживание (вызывается на каждом подходящем движении мыши). */
  pet(): void {
    this.activity();
    if (this._state === "ANGRY" || this.isBusy()) return;
    if (this._state === "OFFENDED") return this.petOffended();
    if (this._state === "HAPPY") {
      this.armStateTimer(HAPPY_HOLD, "IDLE"); // продлеваем радость
      return;
    }
    this.transition("HAPPY", HAPPY_HOLD);
  }

  /** Наведение на питомца: будит его. */
  wake(): void {
    this.activity();
    if (this._state === "SLEEPING") this.transition("HAPPY", HAPPY_HOLD);
  }

  /**
   * «Покормить»: сверху падает еда питомца, он ловит и жуёт (EATING), затем HAPPY.
   * Кормление будит спящего и мирит с обиженным; на злого (ANGRY) не действует.
   */
  feed(): void {
    this.activity();
    if (this._state === "ANGRY" || this.isBusy()) return;
    this.transition("EATING", EAT_DURATION, "HAPPY");
  }

  /**
   * Трюк питомца (кнопка из меню/трея или двойной клик): PLAYING / DIGGING / DANCING /
   * SPINNING / SPLASHING. Работает из IDLE, HAPPY и SLEEPING (будит); злого, обиженного
   * и занятого другим трюком или едой не трогает. PLAYING заканчивается HAPPY, остальные — IDLE.
   */
  trick(state: TrickState): void {
    this.activity();
    const s = this._state;
    if (s !== "IDLE" && s !== "HAPPY" && s !== "SLEEPING" && s !== "CATCHING") return;
    this.transition(state, TRICK_MS[state], state === "PLAYING" ? "HAPPY" : "IDLE");
  }

  /**
   * Курсор от Rust-потока опроса (раз в ~50 мс, пока мышь движется быстро или идёт CATCHING).
   * Быстрый проход у головы → CATCHING: питомец поднимает лапу, глаза следят за курсором;
   * состояние держится ~1 с после последнего быстрого движения.
   */
  cursorMove(m: CursorInfo): void {
    if (this.disposed) return;
    const s = this._state;
    if (s === "CATCHING") {
      this.look(m);
      if (m.fast && m.near) this.armStateTimer(CATCH_HOLD, "IDLE"); // мышь ещё носится — продлеваем
      return;
    }
    if (!m.fast || !m.near || (s !== "IDLE" && s !== "HAPPY")) return;
    this.transition("CATCHING", CATCH_HOLD, "IDLE");
    this.look(m);
  }

  /** Остановить все таймеры (при смене питомца старая машина больше не нужна). */
  dispose(): void {
    this.disposed = true;
    window.clearTimeout(this.stateTimer);
    window.clearTimeout(this.idleTimer);
    window.clearTimeout(this.eatTimer);
    window.clearTimeout(this.reactTimer);
    this.stateTimer = this.idleTimer = this.eatTimer = this.reactTimer = undefined;
  }

  /**
   * Питомца схватили и тащат: любая анимация (трюк, еда, злость, обида, реакция на клик)
   * прерывается, дальше он просто IDLE на новом месте.
   */
  grab(): void {
    this.activity();
    this.endReaction();
    if (this._state !== "IDLE") this.transition("IDLE");
  }

  /** «Позвать питомца» (меню трея): из OFFENDED сразу в IDLE. */
  callBack(): void {
    this.activity();
    if (this._state === "OFFENDED") this.transition("IDLE");
  }

  /** Принудительная смена состояния (для отладки из консоли). */
  force(state: PetState): void {
    this.activity();
    if (state === "HAPPY") this.transition(state, HAPPY_HOLD);
    else if (state === "ANGRY") this.transition(state, ANGRY_DURATION, "OFFENDED");
    else this.transition(state);
  }

  // ---------- Внутренняя кухня ----------

  /** Занят едой или трюком: поглаживания, кормление и новые трюки игнорируются. */
  private isBusy(): boolean {
    const s = this._state;
    return s === "EATING" || s in TRICK_MS;
  }

  /** Глаза следят за курсором, лапа поднимается со стороны курсора (CSS: --look-x/y, .catch-left/right). */
  private look(m: CursorInfo): void {
    this.root.style.setProperty("--look-x", m.lookX.toFixed(2));
    this.root.style.setProperty("--look-y", m.lookY.toFixed(2));
    const left = m.lookX < 0;
    this.root.classList.toggle("catch-left", left);
    this.root.classList.toggle("catch-right", !left);
  }

  private endReaction(): void {
    window.clearTimeout(this.reactTimer);
    this.reactTimer = undefined;
    this.root.classList.remove("reacting");
  }

  /** Нужно 3 секунды непрерывного нежного поглаживания (паузы > 600 мс обнуляют). */
  private petOffended(): void {
    const now = performance.now();
    if (this.forgiveStart === 0 || now - this.forgiveLast > FORGIVE_MAX_GAP) {
      this.forgiveStart = now;
    }
    this.forgiveLast = now;
    const progress = Math.min(1, (now - this.forgiveStart) / FORGIVE_NEEDED);
    this.root.style.setProperty("--forgive", progress.toFixed(2)); // слёзы тают
    if (progress >= 1) this.transition("HAPPY", HAPPY_HOLD);
  }

  private transition(next: PetState, holdMs?: number, after: PetState = "IDLE"): void {
    if (this.disposed) return;
    const prev = this._state;
    window.clearTimeout(this.stateTimer);
    this.stateTimer = undefined;
    window.clearTimeout(this.idleTimer);
    this.idleTimer = undefined;
    window.clearTimeout(this.eatTimer);
    this.eatTimer = undefined;
    this.endReaction(); // реакция на клик не переживает смену состояния
    if (prev === "CATCHING") {
      this.root.classList.remove("catch-left", "catch-right");
      this.root.style.removeProperty("--look-x");
      this.root.style.removeProperty("--look-y");
    }

    this._state = next;
    this.forgiveStart = 0;
    this.root.style.removeProperty("--forgive");
    this.applyClass();

    if (next === "EATING") {
      this.eatTimer = window.setTimeout(() => {
        this.eatTimer = undefined;
        this.hooks.onEat?.();
      }, EAT_LAND_MS);
    }

    if (next === "SLEEPING" || next === "OFFENDED") {
      // Ни одного таймера: выйти можно только событием мыши / из трея.
    } else if (holdMs !== undefined) {
      this.armStateTimer(holdMs, after);
      this.lastActivity = performance.now();
    } else if (next === "IDLE") {
      this.scheduleIdleCheck(SLEEP_AFTER);
    }
    if (prev !== next) this.hooks.onChange?.(next, prev);
  }

  private armStateTimer(ms: number, after: PetState): void {
    window.clearTimeout(this.stateTimer);
    this.stateTimer = window.setTimeout(() => {
      this.stateTimer = undefined;
      this.transition(after, after === "HAPPY" ? HAPPY_HOLD : undefined);
    }, ms);
  }

  /** Один длинный таймер вместо сброса на каждое движение мыши. */
  private scheduleIdleCheck(ms: number): void {
    window.clearTimeout(this.idleTimer);
    this.idleTimer = window.setTimeout(() => {
      this.idleTimer = undefined;
      if (this._state !== "IDLE") return;
      const idleFor = performance.now() - this.lastActivity;
      if (idleFor >= SLEEP_AFTER) this.transition("SLEEPING");
      else this.scheduleIdleCheck(SLEEP_AFTER - idleFor);
    }, ms);
  }

  private applyClass(): void {
    for (const s of ALL_STATES) this.root.classList.remove(`state-${s.toLowerCase()}`);
    this.root.classList.add(`state-${this._state.toLowerCase()}`);
  }
}
