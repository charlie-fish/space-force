import {
  EVENT_BATCHES,
  ONE_OFF_EVENTS,
  earthFirstOverridesDisruptor,
} from "./events.js";
import {
  ACTION_LABELS,
  ART,
  CARD_MAP,
  STYLES,
  TECH_PRESETS,
} from "./content.js";
import {
  applyCommand,
  assertInvariants,
  availableSystems,
  blackHoles,
  canMove,
  canPlan,
  eligibleTokens,
  planReason,
  eventIs,
  forcedInvestment,
  investmentAmount,
  shipDamage,
  attackTargetAllowed,
  eventTechOptions,
  prophecyOptions,
  createGame,
  edges,
  featureOptions as computeFeatureOptions,
  hasTech,
  nameOf,
  player,
  production,
  beforeActionHooks,
  afterActionHooks,
  attackCost,
  canSoylent,
  movementLosses,
  sabotageTargets,
  peekEvents,
  settlementSpace,
  purchaseCost,
  patrolBlocks,
  purchaseReason,
  reinforceCount,
  reinforceAllowance,
  isFinalRound,
  sinceLastDecision,
  scoreGame,
  seedFrom,
  system,
  warp,
} from "./engine.js";
import {
  HEX_WIDTH,
  fleetPositions,
  rotatePoint,
  blackHolePositions,
  warpPosition,
  WARP_WIDTH,
  WARP_HEIGHT,
} from "./geometry.js";
import { restoreGame } from "./persistence.js";
import {
  intentWarnings,
  reserveNotice,
  revealsHiddenInformation,
} from "./intent.js";
import type {
  Action,
  Explore,
  Command,
  Game,
  System,
  GameConfig,
  ReserveRecovery,
  Replacements,
  MovePayload,
} from "./types.js";

interface BoardTarget {
  system: string;
  planet?: string;
  edge?: number;
  tokenIndex?: number;
}
interface BoardGesture {
  source: "mouse" | "touch";
  x: number;
  y: number;
  track?: boolean;
  confirm?: boolean;
}

type View = "board" | "techs" | "event" | "actions" | "player_aid";
interface Draft {
  action: Action | null;
  slot?: Action;
  eventAmount?: number;
  eventTech?: string;
  autoStealth?: boolean;
  eventPlanets?: string[];
  eventSettlements?: Record<string, number[]>;
  invest: boolean;
  bank: boolean;
  sources: Record<string, number>;
  credits?: number;
  sacrifice: number;
  keptShips?: number;
  targets: Record<string, number>;
  colonies: Record<string, Record<string, number>>;
  allocation: Record<string, number>;
  settlements: Record<string, number>;
  replacements: Replacements;
  carried: NonNullable<MovePayload["carried"]>;
  passengerLosses?: Record<string, number>;
  techCount: number;
  tokenIndex?: number;
  sabotageValue?: number;
  sabotageTarget?: { player: number; tech: string };
  recoveryCredits?: number;
  recoveryShips?: Record<string, number>;
}
const freshDraft = (): Draft => ({
  action: null,
  invest: false,
  bank: false,
  sources: {},
  sacrifice: 0,
  targets: {},
  colonies: {},
  allocation: {},
  settlements: {},
  replacements: {},
  carried: {},
  techCount: 0,
});
const escape = (value: unknown): string =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const attrs = (value: unknown) => escape(value);
const exploreLabel = (effect: Explore) =>
  ({
    credit1: "+1 Credit",
    credit2: "+2 Credits",
    credit3: "+3 Credits",
    otherShips: "Choose a rival: +2 Ships",
    otherSettlement: "Choose a rival: +1 Settlement",
    blackHole: "Black hole",
  })[effect];
const exploreSymbol = (effect: Explore) =>
  ({
    credit1: "+1",
    credit2: "+2",
    credit3: "+3",
    otherShips: "2S",
    otherSettlement: "1P",
    blackHole: "●",
  })[effect];
const STORAGE_KEY = "space-force.local-family.v1";
const VIEW_LABELS: Record<View, string> = {
  board: "Board",
  techs: "Techs",
  event: "Event",
  actions: "Actions and Supply",
  player_aid: "Player aid",
};
const SHAPES = [
  "M0 -18 L10 -4 L10 12 L12 18 L5 18 L4 14 L-4 14 L-5 18 L-12 18 L-10 12 L-10 -4 Z",
  "M0 -19 L4 -12 L3 -10 L7 -10 L7 -5 L11 -5 L11 0 L8 0 L8 10 L11 10 L11 17 L4 17 L3 12 L-3 12 L-4 17 L-11 17 L-11 10 L-8 10 L-8 0 L-11 0 L-11 -5 L-7 -5 L-7 -10 L-3 -10 L-4 -12 Z",
  "M0 -19 L3 -13 L3 -10 L8 -8 L10 -1 L5 4 L10 8 L10 17 L4 17 L2 12 L-2 12 L-4 17 L-10 17 L-10 8 L-5 4 L-10 -1 L-8 -8 L-3 -10 L-3 -13 Z",
  "M0 -18 C3 -17 3 -8 9 -6 C12 -4 6 1 7 8 L10 17 L3 17 L2 13 L-2 13 L-3 17 L-10 17 L-7 8 C-6 1 -12 -4 -9 -6 C-3 -8 -3 -17 0 -18 Z",
  "M1 -19 L10 -8 L6 -8 L6 -2 L10 -2 L10 5 L5 5 L5 10 L9 10 L9 17 L3 17 L1 12 L-2 12 L-4 17 L-9 17 L-9 10 L-6 10 L-6 5 L-10 5 L-10 -2 L-6 -2 L-6 -10 L-2 -10 Z",
  "M0 -18 L11 -5 L10 12 L12 18 L5 18 L4 14 L-4 14 L-5 18 L-12 18 L-10 12 L-11 -5 Z M-2 -4 L-2 4 L2 4 L2 -4 Z",
  "M-8 -18 L-2 -8 L-2 1 L2 1 L2 -8 L8 -18 L14 -8 L14 14 L10 18 L5 18 L3 12 L-3 12 L-5 18 L-10 18 L-14 14 L-14 -8 Z",
];
export function rocket(style: number, size = 22, horizontal = false): string {
  const color = STYLES[style].color;
  return `<svg aria-hidden="true" class="rocket" width="${size}" height="${size}" viewBox="-22 -22 44 44"><path d="${SHAPES[style]}" fill="${color}" fill-rule="evenodd" stroke="${style === 5 ? "#352d42" : "#f4ebd3"}" stroke-width="1.5" ${horizontal ? 'transform="rotate(90)"' : ""}/></svg>`;
}
const CHIP_MOTIFS = [
  '<circle r="1.5" fill="currentColor"/>',
  '<path d="M-3 0H3" stroke="currentColor" stroke-width="2"/>',
  '<path d="M-2-2V2M2-2V2" stroke="currentColor" stroke-width="1.5"/>',
  '<path d="M-2-2L0 1L2-2" fill="none" stroke="currentColor" stroke-width="1.5"/>',
  '<path d="M-2-2H0V0H-2ZM0 0H2V2H0Z" fill="currentColor"/>',
  '<path d="M-3 1Q-1-3 1 0T4-1" fill="none" stroke="currentColor" stroke-width="1.5"/>',
  '<path d="M0-2L2 2H-2Z" fill="currentColor"/>',
];

const CHIP_RIMS = STYLES.map((style, index) => {
  const rim = Array.from(
    { length: 12 },
    (_, i) =>
      `<g transform="rotate(${i * 30}) translate(0 -22)">${CHIP_MOTIFS[index]}</g>`,
  ).join("");
  return `<circle cy="2" r="26" fill="${style.color}"/><circle r="26" fill="${style.color}"/><g style="color:#f5e9cc">${rim}</g><circle r="18.5" fill="none" stroke="#352d4266"/><path class="chip-side-outline" d="M25.114 8.729A26 26 0 0 1 13 24.517M-13 24.517A26 26 0 0 1-25.114 8.729" fill="none" stroke="#000" stroke-width=".5" vector-effect="non-scaling-stroke"/>`;
});
function chipFace(
  style: number,
  x: number,
  y: number,
  radius: number,
  face = true,
  reusable = false,
): string {
  return `<g transform="translate(${x} ${y}) scale(${radius / 26})">${reusable ? `<use href="#chip-rim-${style}"/>` : CHIP_RIMS[style]}${face ? `<path d="${SHAPES[style]}" transform="scale(.72)" fill="#352d42" fill-rule="evenodd" stroke="#f5e9cc" stroke-width=".8"/>` : ""}</g>`;
}

export function mountApp(
  root: HTMLElement,
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem">,
) {
  let previewCache = new WeakMap<System, string>();
  let featureCache = new WeakMap<
    Game,
    Map<string, ReturnType<typeof computeFeatureOptions>>
  >();
  function featureOptions(
    g: Game,
    tech: string,
  ): ReturnType<typeof computeFeatureOptions> {
    let choices = featureCache.get(g);
    if (!choices) {
      choices = new Map();
      featureCache.set(g, choices);
    }
    let options = choices.get(tech);
    if (!options) {
      options = computeFeatureOptions(g, tech);
      choices.set(tech, options);
    }
    return options;
  }
  let game: Game | null = null;
  let selected: string | null = null;
  let selectedPlanet: string | null = null;
  let selectedEdge: number | null = null;
  let orientation = 0;
  let confirmation: {
    messages: string[];
    title: string;
    command: Command;
    revision: number;
    base: Game;
    reserveAccepted: boolean;
    preview?: Game;
  } | null = null;
  let rosterOpen = false;
  let resetRoster = true;
  let reserveWarningOpen = true;
  let placementTap: {
    system: string;
    phase: "homes" | "plan";
    actor: number;
    revision: number;
    time: number;
    x: number;
    y: number;
    source: string;
  } | null = null;
  let choiceTap: {
    key: string;
    actor: number;
    revision: number;
    time: number;
    x: number;
    y: number;
    source: string;
  } | null = null;
  let snapSystem: string | null = null;
  let boardTap: {
    kind: "home" | "orient" | "choice";
    target?: BoardTarget;
    id: number;
    system: string;
    x: number;
    y: number;
    actor: number;
    revision: number;
  } | null = null;
  let placementDrag: {
    id: number;
    x: number;
    y: number;
    moved: boolean;
    actor: number;
    revision: number;
  } | null = null;
  let view: View = "board";
  let draft = freshDraft();
  let error = "";
  let count = 2;
  let techPreset: GameConfig["techPreset"] = "remaining";
  let eventMode: NonNullable<GameConfig["events"]> = "full";
  let eventBatch: NonNullable<GameConfig["eventBatch"]> = "batch-1";
  let privateBidder: number | null = null;
  let bidAmount = 0;
  let privatePeek = false;
  let techTap: {
    tech: string;
    actor: number;
    revision: number;
    time: number;
    x: number;
    y: number;
  } | null = null;
  let displayedFinishedGame: Game | null = null;
  let scenario: GameConfig["scenario"] = "standard";
  let names = Array.from({ length: 7 }, (_, i) => `Player ${i + 1}`);
  let mapCode = "SPACE FORCE";
  let zoom = 1,
    panX = 0,
    panY = 0,
    showHelp = false,
    activeCard: string | null = null,
    shortcuts = true;
  let guide = true,
    savedAvailable = false,
    autosave = Boolean(storage);
  let pointerPositions = new Map<number, { x: number; y: number }>();
  let lastDrag: { x: number; y: number } | null = null;
  let dragged = false;
  let swipe: { id: number; x: number; y: number } | null = null;
  let suppressClickUntil = 0;
  let overlayReturn: { action?: string; card?: string; tech?: string } | null =
    null;
  let scrollView: View | null = null;
  let previousScroll = 0;
  const read = (key: string) => {
    try {
      return storage?.getItem(key) ?? null;
    } catch {
      autosave = false;
      return null;
    }
  };
  const write = (key: string, value: string) => {
    try {
      storage?.setItem(key, value);
    } catch {
      autosave = false;
    }
  };
  savedAvailable = Boolean(read(STORAGE_KEY));
  guide = read("space-force.guide") !== "off";

  function save() {
    if (game) {
      write(STORAGE_KEY, JSON.stringify(game));
      savedAvailable = true;
    }
  }
  function setView(next: View) {
    techTap = null;
    cancelPlacement();
    placementTap = null;
    scrollView = view;
    previousScroll = root.querySelector(".main-panel")?.scrollTop ?? 0;
    view = next;
    render();
    root
      .querySelector<HTMLElement>(`#tab-${view}`)
      ?.focus({ preventScroll: true });
    const panel = root.querySelector<HTMLElement>("#game-panel");
    if (panel) {
      panel.style.scrollMarginTop = `calc(${(root.querySelector(".game-header")?.getBoundingClientRect().height ?? 80) + 8}px + 2cm)`;
      panel.scrollIntoView?.({ block: "start", behavior: "auto" });
    }
  }
  function closeOverlay() {
    showHelp = false;
    privatePeek = false;
    activeCard = null;
    confirmation = null;
    render();
    const control = [
      ...root.querySelectorAll<HTMLElement>("[data-action]"),
    ].find(
      (el) =>
        el.dataset.action === overlayReturn?.action &&
        (!overlayReturn?.card || el.dataset.card === overlayReturn.card) &&
        (!overlayReturn?.tech || el.dataset.tech === overlayReturn.tech),
    );
    (control ?? root.querySelector<HTMLElement>(`#tab-${view}`))?.focus({
      preventScroll: true,
    });
  }
  function perform(
    command: Command,
    revision = game?.revision,
    accepted?: { intent: boolean; reserve: boolean; preview?: Game },
    actor = game?.turn,
  ) {
    if (!game) return;
    const old = game;
    confirmation = null;
    try {
      if (
        command.type === "completeReserve" &&
        old.pending?.kind === "reserve" &&
        !accepted?.reserve
      ) {
        const pending = old.pending,
          available = Math.min(
            player(old, pending.owner).reserve,
            pending.remaining,
          );
        const applied =
          pending.effect.kind === "reinforce"
            ? sumOwners(
                Object.values(
                  command.ships ?? recoveryAllocations(old, pending),
                ),
              )
            : available;
        if (applied < pending.remaining) {
          requestConfirmation(
            [
              `${pending.label} needs ${pending.remaining} more rockets; only ${applied} will be applied.`,
              flexibleReminder(old, pending.owner),
            ],
            command,
            "Reserve shortfall",
            true,
          );
          return;
        }
      }
      let next =
        accepted?.preview ?? applyCommand(game, actor!, command, revision);
      if (command.type === "returnCredits") {
        game = next;
        error = "";
        if (game.pending?.kind === "mercenaries")
          draft.techCount = Math.min(draft.techCount, player(game).credits);
        if (game.pending?.kind === "bid")
          bidAmount = Math.min(bidAmount, player(game).credits);
        save();
        render();
        return;
      }
      const recovery = next.pending?.kind === "reserve" ? next.pending : null;
      const reserve =
        reserveNotice(next) ??
        (recovery
          ? {
              title: "Reserve shortfall",
              messages: [
                ...recovery.messages,
                flexibleReminder(next, recovery.owner),
              ],
            }
          : null);
      const predictable =
        reserve &&
        command.type !== "completeReserve" &&
        (!recovery || recovery.owner === old.turn) &&
        next.turn === old.turn &&
        !revealsHiddenInformation(old, next);
      const warnings = accepted?.intent ? [] : intentWarnings(old, command);
      if (predictable && !accepted?.reserve) warnings.push(...reserve.messages);
      if (warnings.length) {
        requestConfirmation(
          warnings,
          command,
          predictable ? reserve.title : "Check this decision",
          Boolean(predictable),
          next,
        );
        return;
      }
      if (predictable && accepted?.reserve)
        next = applyCommand(next, next.turn, {
          type:
            next.pending?.kind === "reserve" ? "finishReserve" : "acknowledge",
        });
      game = next;
      choiceTap = null;
      techTap = null;
      privateBidder = null;
      bidAmount = 0;
      resetRoster = true;
      reserveWarningOpen = true;
      privatePeek = false;
      placementTap = null;
      snapSystem = command.type === "plan" ? command.system : null;
      if (game.phase === "plan") selected = null;
      error = "";
      draft = freshDraft();
      selectedPlanet = null;
      selectedEdge = null;
      if (game.pending?.kind === "orient")
        orientation = game.pending.rotations[0];
      if (
        game.pending &&
        [
          "orient",
          "move",
          "settle",
          "explore",
          "feature",
          "genesis",
          "ack",
          "redistribute",
          "action",
          "rapid",
          "mercenaries",
          "filibuster",
          "insurance",
          "eminent",
          "reserve",
        ].includes(game.pending.kind)
      ) {
        view = "board";
        if ("system" in game.pending) selected = game.pending.system;
      } else if (game.phase === "tech") view = "techs";
      else if (game.phase === "event") view = "event";
      else if (game.phase === "reinforce" || game.phase === "pass")
        view = "board";
      else if (game.phase === "investments") view = "board";
      else if (game.phase !== old.phase || game.turn !== old.turn)
        view = "board";
      if (game.pending?.kind === "move") {
        draft.sources = { ...game.pending.sources };
        draft.carried = { ...game.pending.carried };
      }
      if (game.pending?.kind === "action") {
        draft.action = game.pending.action;
        draft.invest = forcedInvestment(game, game.pending.action);
        draft.bank = game.context?.bank ?? false;
      }
      save();
      render();
      (
        root.querySelector<HTMLElement>(".modal button:not(:disabled)") ??
        (game.phase === "finished"
          ? root.querySelector<HTMLElement>("#expedition-results")
          : root.querySelector<HTMLElement>(".turn-bar"))
      )?.focus({ preventScroll: true });
    } catch (e) {
      error =
        e instanceof Error ? e.message : "This choice could not be applied.";
      render();
    }
  }
  function start() {
    privatePeek = false;
    privateBidder = null;
    bidAmount = 0;
    resetRoster = true;
    reserveWarningOpen = true;
    game = createGame(count, seedFrom(mapCode || String(Date.now())), names, {
      techPreset,
      scenario,
      events: eventMode,
      ...(eventMode === "full" ? { eventBatch } : {}),
    });
    selected = null;
    draft = freshDraft();
    view = "board";
    zoom = 1;
    panX = panY = 0;
    error = "";
    save();
    render();
  }
  function resume() {
    try {
      const raw = read(STORAGE_KEY);
      if (!raw) throw Error("No saved game is available.");
      const loaded = restoreGame(JSON.parse(raw));
      game = loaded;
      privateBidder = null;
      bidAmount = 0;
      resetRoster = true;
      reserveWarningOpen = true;
      view = loaded.pending
        ? "board"
        : loaded.phase === "tech"
          ? "techs"
          : loaded.phase === "investments"
            ? "board"
            : "board";
      draft = freshDraft();
      if (loaded.pending?.kind === "move") {
        draft.sources = { ...loaded.pending.sources };
        draft.carried = { ...loaded.pending.carried };
      }
      if (loaded.pending?.kind === "orient")
        orientation = loaded.pending.rotations[0];
      if (loaded.pending && "system" in loaded.pending)
        selected = loaded.pending.system;
      if (loaded.pending?.kind === "action") {
        draft.action = loaded.pending.action;
        draft.invest = forcedInvestment(loaded, loaded.pending.action);
        draft.bank = loaded.context?.bank ?? false;
      }
      error = "";
      render();
    } catch {
      game = null;
      error =
        "The saved game could not be restored. Its version may differ from this prototype. You can start a new game.";
      render();
    }
  }
  function badge(style: number, name: string) {
    return `<span class="player-badge" style="--player:${STYLES[style].color}">${rocket(style, 25)}<span>${escape(name)}</span></span>`;
  }
  function button(
    label: string,
    action: string,
    extra = "",
    disabled = false,
    cls = "",
  ) {
    return `<button type="button" class="${cls}" data-action="${action}" ${extra} ${disabled ? "disabled" : ""}>${label}</button>`;
  }
  function numberControl(
    label: string,
    field: string,
    value: number,
    max: number,
    extra = "",
  ) {
    const text = attrs(label.replace(/<[^>]*>/g, ""));
    return `<label class="quantity-row"><span>${label}</span><span class="quantity-stepper">${button("−", "step-number", `data-delta="-1" aria-label="Decrease ${text}"`, value <= 0)}<input inputmode="numeric" type="number" min="0" max="${Math.max(0, max)}" value="${Math.max(0, value)}" data-number="${field}" ${extra} aria-label="${text}"/>${button("+", "step-number", `data-delta="1" aria-label="Increase ${text}"`, value >= max)}</span></label>`;
  }
  function phaseLabel(g: Game) {
    return {
      homes: "Choose homes",
      plan: "Plan",
      actions: "Actions",
      investments: "Investments",
      event: "Event",
      pass: "Pass first player",
      tech: "Buy Tech",
      reinforce: "Reinforce",
      finished: "Final scores",
      endgame: "Before final scoring",
    }[g.phase];
  }
  function instruction(g: Game) {
    const pending = g.pending;
    if (pending?.kind === "bid")
      return "Pass the device to the named player, then enter a private sealed bid. The winner will pay their bid and select the Event.";
    if (pending?.kind === "eventSelect")
      return "Choose one of the two Events. The other card will be discarded.";
    if (pending?.kind === "eventChoice")
      return `${CARD_MAP[pending.event].title}: resolve this Event effect.`;
    if (pending?.kind === "scrambler")
      return "Scrambler: select a stack to flip, or skip.";
    if (pending?.kind === "reserve")
      return "Use Flexible Economy to replenish Reserve, or continue with the current result.";
    if (pending?.kind === "filibuster")
      return "Filibuster: lift one of your tokens to the top of its stack, or pass.";
    if (pending?.kind === "insurance")
      return "Insurance: choose a Credit or a Ship for this skipped turn.";
    if (pending?.kind === "eminent")
      return "Eminent Domain: choose whether to SETTLE at home before scoring.";
    if (pending?.kind === "mercenaries")
      return "Mercenaries: convert up to three Credits into Ships.";

    if (pending?.kind === "action" && forcedInvestment(g, pending.action))
      return `${pending.source}: the active Event requires this action to be Invested.`;
    if (pending?.kind === "action")
      return `${pending.source}: choose the ${ACTION_LABELS[pending.action]} effect in ${nameOf(system(g, pending.system))}, then commit.`;
    if (pending?.kind === "rapid")
      return "Rapid Advance: convert one Ship directly into a Settlement, or skip. This is not a SETTLE action.";
    if (pending?.kind === "ack")
      return reserveNotice(g)
        ? "Review the Reserve warning in the pop-up, then confirm the outcome."
        : "Review the outcome, then press Ok to continue.";
    if (pending?.kind === "redistribute")
      return "Reallocate the displaced Settlements or keep them as Ships. Other commitments stay fixed.";
    if (pending?.kind === "orient")
      return "Exploration committed. Choose a legal orientation.";
    if (pending?.kind === "move")
      return "Finish your committed movement into the revealed system.";
    if (pending?.kind === "settle")
      return "Adjust your Settlement preview, then commit the placements.";
    if (pending?.kind === "explore")
      return "Choose another player for the revealed Explore benefit.";
    if (pending?.kind === "genesis")
      return "Genesis: choose an empty, face-up planet.";
    if (pending?.kind === "feature")
      return `${CARD_MAP[pending.tech].title}: place the effect in a legal location.`;
    return {
      homes: "Select an unclaimed home system on the map.",
      plan: `Place one of your ${player(g).unplaced} remaining chips on a system.`,
      actions: eventIs(g, "cyber-attack")
        ? "Cyber Attack: select any stack, then an unused action slot."
        : "Select a stack with your chip on top, then an unused action.",
      investments: `Allocate your ${player(g).invested} invested rockets.`,
      event: "Review the round-tracker Event pair, then continue to Tech.",
      pass: "Pass the first-player token, then begin the next PLAN phase.",
      tech: "Buy one shared Tech or pass. Cards stay in the market.",
      reinforce: `Place ${reinforceCount(g)} Ships at home or where you have a Settlement.`,
      finished:
        "One point per settled planet, patrolled system, and owned Tech.",
      endgame: "Resolve Eminent Domain before scoring.",
    }[g.phase];
  }
  function tutorial(g: Game) {
    if (!guide) return "";
    const tips: Record<string, string> = {
      homes:
        "Your starting home gets 3 Settlements and 3 Ships. Rockets elsewhere remain in Reserve. Choose freely in player order.",
      plan: "Decide which systems you want to take actions in. Action tokens form stacks. You will be able to take each action once per round, so plan ahead where you want to take those actions. Later, the stacks will be resolved from top to bottom.",
      actions:
        "Use each action slot once per round, or Invest it. Change your selection freely before Commit. Committed actions and information reveals cannot be undone.",
      investments:
        "An invested rocket becomes a Credit or a Ship. These rockets are already outside Reserve. Ships can go home or wherever you have a Settlement.",
      event:
        g.config.events === "full"
          ? "Bid secretly for the right to choose one of the two Events. Only the winner pays. Event effects last until the next Event step."
          : "Review the round-tracker pair, then continue to Tech.",
      pass: "Pass the first-player token and start the next round of planning.",
      tech: "Techs are shared: several players can buy the same card. Ownership uses one Reserve rocket and scores one point. Patents can restrict later purchases.",
      reinforce:
        "Reinforcements come from Reserve. You may distribute them between your home and systems containing your Settlements.",
      finished:
        "Settlements score per planet, Ships score per system, and each owned Tech scores one. Credits break ties; tied players can share victory.",
    };
    return `<aside class="guide" aria-label="Learn as you play"><div><span class="eyebrow">Learn as you play</span><p>${escape(g.pending ? instruction(g) : tips[g.phase])}</p></div>${button("Hide guide", "guide-off", "", false, "quiet")}</aside>`;
  }
  function landing() {
    return `<main class="landing"><div class="landing-art"><img src="${ART.cover.image}" width="562" height="768" alt="Space Force cover: rocket fleets above a ringed planet"/><span class="cover-credit">A game by Charlie Fish</span></div><section class="landing-copy"><div class="eyebrow">Local pass-and-play · Prototype 0.22</div><h1>Claim your<br/><span>corner of space.</span></h1><p class="lead">Plan your moves. Explore new systems. Settle the galaxy.</p><div class="scope-note"><strong>This build: ${TECH_PRESETS[techPreset].label} · ${eventMode === "full" ? "full Events & bidding" : eventMode === "foresight-test" ? "Tech playtest Events" : "simpler Events"}.</strong><span>A complete local game for 2–7 players on one device, with all 30 Techs, all 30 Events and sealed bidding. Choose an Event test batch below. Remote rooms follow later.</span></div><form id="setup-form"><fieldset><legend>How many players?</legend><div class="player-counts">${Array.from({ length: 6 }, (_, i) => button(String(i + 2), "count", `data-count="${i + 2}" aria-pressed="${count === i + 2}"`, false, count === i + 2 ? "selected" : "")).join("")}</div></fieldset><fieldset class="setup-options"><legend>Tech display</legend><label>Preset <select data-setting="tech-preset">${Object.entries(
      TECH_PRESETS,
    )
      .map(
        ([id, preset]) =>
          `<option value="${id}" ${id === techPreset ? "selected" : ""}>${preset.label} (10 Techs)</option>`,
      )
      .join(
        "",
      )}</select></label><label class="check-row"><input type="checkbox" data-check="chain-scenario" ${scenario === "five-tech-chain" ? "checked" : ""}/>R01 chain test: each player starts with the five chain Techs (five Reserve markers). This is a designer scenario.</label><label>Events <select data-setting="event-mode"><option value="full" ${eventMode === "full" ? "selected" : ""}>Full Events & sealed bidding</option><option value="simpler" ${eventMode === "simpler" ? "selected" : ""}>Simpler Events (round tracker)</option><option value="foresight-test" ${eventMode === "foresight-test" ? "selected" : ""}>Legacy Foresight test (no effects/bids)</option></select></label>${
      eventMode === "full"
        ? `<label>Event scenario <select data-setting="event-batch"><option value="standard" ${eventBatch === "standard" ? "selected" : ""}>Standard random deck (10 cards for 2–3 players; 8 for 4–7)</option>${Object.entries(
            EVENT_BATCHES,
          )
            .map(
              ([id, batch]) =>
                `<option value="${id}" ${eventBatch === id ? "selected" : ""}>${batch.label} (${count <= 3 ? 10 : 8} drawn from 10)</option>`,
            )
            .join(
              "",
            )}</select></label>${eventBatch !== "standard" ? `<details class="batch-pool"><summary>Cards in this test batch</summary><p>${EVENT_BATCHES[eventBatch].cards.map((id) => escape(CARD_MAP[`event.${id}`].title)).join(" · ")}</p><p>Ten-card test pool: draw ${count <= 3 ? 10 : 8} Events for ${count} players. Replay the same settings and choose the other cards from each pair. For 4–7 players, change the map code too to test cards omitted from a particular eight-card deck.</p></details>` : ""}`
        : ""
    }</fieldset><div class="name-grid">${names
      .slice(0, count)
      .map(
        (name, i) =>
          `<label>${rocket(i, 23)}<span class="sr-only">Player ${i + 1} name</span><input maxlength="24" name="name-${i}" data-name="${i}" value="${attrs(name)}" aria-label="Player ${i + 1} name"/></label>`,
      )
      .join(
        "",
      )}</div><details class="map-code"><summary>Map code & replay</summary><label>Map code <input name="map-code" id="map-code" maxlength="80" value="${attrs(mapCode)}"/></label><p>Use the same code and player count to reproduce setup.</p></details><button type="submit" class="primary big">Start a new expedition <span aria-hidden="true">↗</span></button></form>${savedAvailable ? button("Continue saved game", "resume", "", false, "secondary big") : ""}${error ? `<p role="alert" class="error">${escape(error)}</p>` : ""}<p class="landing-foot">No account or download. Your game stays on this device. ${button("Rules & prototype scope", "help", "", false, "text-link")}</p></section></main>`;
  }

  function glyph(
    id: number,
    x: number,
    y: number,
    size: number,
    angle = 0,
    ghost = false,
  ) {
    return `<g class="${ghost ? "settlement-draft" : "settlement-piece"}" transform="translate(${x} ${y}) rotate(${angle}) scale(${size / 40})" ${ghost ? 'opacity=".48"' : ""}><path d="${SHAPES[id]}" fill="${STYLES[id].color}" fill-rule="evenodd" stroke="${id === 5 ? "#352d42" : "#f4ebd3"}" stroke-width="2"/></g>`;
  }
  function slotsFor(s: System, index: number, count: number) {
    const p = s.planets[index],
      art = ART.systems[s.template].planets[index];
    const base =
      art?.settlementSlots ??
      ART.features.planet.settlementSlots.map((slot) => ({
        x: p.x + (slot.x - 0.5) * 0.18,
        y: p.y + (slot.y - 0.5) * 0.156,
      }));
    if (count <= base.length) return base;
    const rx = art?.radiusX ?? 0.09,
      ry = art?.radiusY ?? 0.078;
    const candidates = [
      { x: p.x, y: p.y },
      ...Array.from({ length: 12 }, (_, i) => ({
        x: p.x + rx * 0.8 * Math.cos((i * Math.PI) / 6),
        y: p.y + ry * 0.8 * Math.sin((i * Math.PI) / 6),
      })),
    ];
    const clearance = (point: { x: number; y: number }) =>
      Math.min(
        ...base.map((b) =>
          Math.hypot((point.x - b.x) / rx, (point.y - b.y) / ry),
        ),
      );
    const extra = candidates.reduce((best, p) =>
      clearance(p) > clearance(best) ? p : best,
    );
    return [...base, extra];
  }
  function planetIllustration(s: System, index: number) {
    const p = s.planets[index],
      art = ART.systems[s.template],
      original = art.planets[index];
    const rx = original?.radiusX ?? 0.09,
      ry = original?.radiusY ?? 0.078;
    const owners = p.owners.flatMap((n, id) => Array(n).fill(id) as number[]);
    const slots = slotsFor(s, index, owners.length);
    const image = original
      ? `<image href="${art.image}" width="400" height="462"/>`
      : `<image href="${ART.features.planet.image}" x="${(p.x - rx) * 400}" y="${(p.y - ry) * 462}" width="${rx * 800}" height="${ry * 924}"/>`;
    return `<svg class="planet-preview" role="img" aria-label="${attrs(
      `${p.home ? "Home planet" : "Planet"}: ${sumOwners(p.owners)} of ${p.capacity} spaces occupied. ${p.owners
        .map((n, id) => (n ? `${player(game!, id).name}: ${n}` : ""))
        .filter(Boolean)
        .join(", ")}`,
    )}" viewBox="${(p.x - rx) * 400} ${(p.y - ry) * 462} ${rx * 800} ${ry * 924}">${image}${owners.map((id, j) => glyph(id, slots[j].x * 400, slots[j].y * 462, 27)).join("")}</svg>`;
  }
  function systemLayers(
    g: Game,
    s: System,
    miniature = false,
    feature: ReturnType<typeof featureOptions> = [],
  ) {
    const W = HEX_WIDTH,
      x = miniature ? 0 : W * (s.q + s.r / 2),
      y = miniature ? 0 : 150 * s.r;
    const art = ART.systems[s.template];
    const rotation =
      !miniature && g.pending?.kind === "orient" && g.pending.system === s.id
        ? orientation
        : s.rotation;
    const sun = s.revealed
      ? rotatePoint(art.sun.x, art.sun.y, rotation)
      : { x: 0, y: 0 };
    const top = s.tokens[s.tokens.length - 1],
      eligible =
        !miniature &&
        g.phase === "actions" &&
        !g.pending &&
        eligibleTokens(g).some((o) => o.id === s.id);
    const legal =
      !miniature && g.phase === "plan" && !g.pending && canPlan(g, s);
    const planets = !s.revealed
      ? ""
      : s.planets
          .map((p, i) => {
            const center = rotatePoint(p.x, p.y, rotation),
              size = art.planets[i] ? art.planets[i].radiusX * W : 16;
            const occupied = p.owners.flatMap(
              (n, id) => Array(n).fill(id) as number[],
            );
            const planned =
              !miniature &&
              selected === s.id &&
              !draft.invest &&
              (draft.action === "settle" ||
                g.pending?.kind === "settle" ||
                g.pending?.kind === "redistribute")
                ? (draft.settlements[p.id] ?? 0)
                : 0;
            const slots = slotsFor(s, i, occupied.length + planned);
            const colonies = [...occupied, ...Array(planned).fill(g.turn)]
              .map((id, j) => {
                const slot = slots[j] ?? { x: p.x, y: p.y },
                  point = rotatePoint(slot.x, slot.y, rotation);
                return glyph(id, point.x, point.y, 24, 0, j >= occupied.length);
              })
              .join("");
            return `<g ${miniature ? `data-preview-planet="${p.id}"` : `data-system="${s.id}" data-planet="${p.id}"`}><title>${p.home ? "Home planet" : `Planet ${i + 1}`}: ${occupied.length}/${p.capacity} Settlements${p.explore ? (p.exploreFaceUp ? `, Explore token: ${exploreLabel(p.explore)}` : ", hidden Explore token") : ""}</title>${i >= art.planets.length ? `<image href="${ART.features.planet.image}" x="${center.x - 16}" y="${center.y - 16}" width="32" height="32" transform="rotate(${rotation * 60} ${center.x} ${center.y})"/>` : ""}<circle cx="${center.x}" cy="${center.y}" r="${size + 2}" fill="transparent" stroke="${!miniature && selectedPlanet === p.id ? "#fff2c2" : "transparent"}" stroke-width="2"/>${colonies}${p.explore ? `<g class="explore-token"><circle cx="${center.x - size * 0.72}" cy="${center.y - size * 0.72}" r="7" fill="#d7bf78" stroke="#332a35"/>${p.exploreFaceUp && p.explore === "blackHole" ? `<image class="revealed-explore-hole" href="${ART.features.blackHole.image}" x="${center.x - size * 0.72 - 7}" y="${center.y - size * 0.72 - 7}" width="14" height="14"/>` : `<text x="${center.x - size * 0.72}" y="${center.y - size * 0.72 + 3}" class="explore-label">${p.exploreFaceUp ? exploreSymbol(p.explore!) : "?"}</text>`}</g>` : ""}</g>`;
          })
          .join("");
    const positions = fleetPositions(s);
    const fleets = s.ships
      .map((n, id) => {
        if (!n) return "";
        const pos = positions[id],
          point = rotatePoint(pos.x, pos.y, rotation);
        return `<g class="fleet-badge" data-fleet-player="${id}" data-center-x="${point.x}" data-center-y="${point.y}" data-x="${pos.x}" data-y="${pos.y}" aria-label="${attrs(player(g, id).name)}: ${n} Ships"><rect x="${point.x - 16}" y="${point.y - 10}" width="33" height="20" rx="6" fill="#211d32" fill-opacity=".92"/>${glyph(id, point.x - 5, point.y, 16, 90)}<text x="${point.x + 9}" y="${point.y + 4}" class="fleet-label">${n}</text></g>`;
      })
      .join("");
    const radius = s.revealed ? Math.min(28, art.sun.radiusX * W) : 25;
    const step = Math.min(3, 32 / Math.max(1, s.tokens.length - 1));
    const topY = sun.y - step * (s.tokens.length - 1);
    // Draw the opaque selection ring behind every chip, preserving all rims beneath.
    const ring = eligible
      ? `<circle class="selection-ring" cx="${sun.x}" cy="${topY}" r="${radius + 1.6}" fill="none"/>`
      : "";
    const chips =
      ring +
      s.tokens
        .map(
          (owner, i) =>
            `<g class="${miniature ? "preview-chip" : "stack-chip"} ${eligible && i === s.tokens.length - 1 ? "selectable-chip" : ""} ${!miniature && snapSystem === s.id && i === s.tokens.length - 1 ? "new-chip" : ""}" data-owner="${owner}" data-stack-position="${i}" data-chip-rise="${step * i}">${chipFace(owner, sun.x, sun.y - step * i, radius, i === s.tokens.length - 1, true)}</g>`,
        )
        .join("");
    const holes = !s.revealed
      ? ""
      : blackHolePositions(s)
          .map((h) => {
            const p = rotatePoint(h.x, h.y, rotation);
            return `<g class="black-hole-token"><title>Black hole: destroys one incoming Ship, returned as a Credit</title><circle cx="${p.x}" cy="${p.y}" r="${h.radius}" fill="#10121a"/><image href="${ART.features.blackHole.image}" x="${p.x - h.radius}" y="${p.y - h.radius}" width="${h.radius * 2}" height="${h.radius * 2}"/></g>`;
          })
          .join("");
    const ghost =
      legal && selected === s.id
        ? `<g class="plan-preview" pointer-events="none">${chipFace(g.turn, sun.x, sun.y - step * s.tokens.length, s.revealed ? Math.min(28, art.sun.radiusX * W) : 25, true, true)}</g>`
        : "";
    const extraEdges = s.extraEdges
      .map(
        (e) =>
          `<g class="asteroid-belt-token" data-edge="${e}" transform="rotate(${e * 60})"><image href="${ART.features.asteroidBelt.image}" x="${W / 2 - (50 * ART.features.asteroidBelt.width) / ART.features.asteroidBelt.height}" y="-50" width="${(100 * ART.features.asteroidBelt.width) / ART.features.asteroidBelt.height}" height="100"/></g>`,
      )
      .join("");
    const warpAnchor = s.revealed ? warpPosition(s) : null;
    const warpToken = warpAnchor
      ? (() => {
          const point = rotatePoint(warpAnchor.x, warpAnchor.y, rotation);
          return `<g class="warp-token" data-x="${warpAnchor.x}" data-y="${warpAnchor.y}"><title>Artificial Warp</title><image href="${ART.features.warp.image}" x="${point.x - WARP_WIDTH / 2}" y="${point.y - WARP_HEIGHT / 2}" width="${WARP_WIDTH}" height="${WARP_HEIGHT}" transform="rotate(${rotation * 60} ${point.x} ${point.y})"/></g>`;
        })()
      : "";
    const edgeTargets = feature
      .filter((o) => o.system === s.id)
      .map(
        (o) =>
          `<line data-system="${s.id}" data-edge="${o.edge}" role="button" tabindex="0" aria-label="Edge ${o.edge! + 1} of ${attrs(nameOf(s))}" class="edge-target ${!miniature && selected === s.id && selectedEdge === o.edge ? "selected-edge" : ""}" x1="${W / 2}" y1="-50" x2="${W / 2}" y2="50" transform="rotate(${o.edge! * 60})"/>`,
      )
      .join("");
    const background = `<g class="system-background" data-background-system="${s.id}" transform="translate(${x} ${y})"><g transform="rotate(${s.revealed ? rotation * 60 : 0})"><image href="${s.revealed ? art.image : ART.backs.system.image}" x="${-W / 2}" y="-100" width="${W}" height="200" clip-path="url(#hex-clip)"/></g>${!s.revealed ? '<circle class="blank-sun" cx="0" cy="0" r="25"/>' : ""}</g>`;
    const pieces = `<g transform="translate(${x} ${y})" class="${miniature ? "system-snapshot" : "system"} ${!miniature && selected === s.id ? "chosen" : ""} ${eligible ? "eligible" : ""} ${legal ? "legal-placement" : ""}" ${miniature ? `data-snapshot-system="${s.id}"` : `data-system="${s.id}" role="button" tabindex="0"`} aria-label="${attrs(nameOf(s))}${
      s.tokens.length
        ? `, stack top to bottom: ${s.tokens
            .slice()
            .reverse()
            .map((id) => attrs(player(g, id).name))
            .join(", ")}`
        : ""
    }"><polygon points="0,-100 ${W / 2},-50 ${W / 2},50 0,100 ${-W / 2},50 ${-W / 2},-50" class="hex-outline"/>${extraEdges}${planets}${holes}${fleets}${chips}${ghost}${warpToken}${edgeTargets}</g>`;
    return { background, pieces };
  }
  function sharedArt(g: Game) {
    return `<svg class="shared-art-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs><clipPath id="hex-clip"><polygon points="0,-100 ${HEX_WIDTH / 2},-50 ${HEX_WIDTH / 2},50 0,100 ${-HEX_WIDTH / 2},50 ${-HEX_WIDTH / 2},-50"/></clipPath>${g.players.map((p) => `<g id="chip-rim-${p.style}">${CHIP_RIMS[p.style]}</g>`).join("")}</defs></svg>`;
  }
  function systemIllustration(g: Game, s: System) {
    const cached = previewCache.get(s);
    if (cached) return cached;
    const details = [
      nameOf(s),
      s.revealed ? `${s.planets.length} planets` : "contents hidden",
      ...s.ships.flatMap((n, id) =>
        n ? [`${player(g, id).name}: ${n} Ships`] : [],
      ),
      `${s.tokens.length} action chips`,
    ].join(", ");
    const layers = systemLayers(g, s, true);
    const markup = `<svg class="system-preview" data-preview-system="${s.id}" width="96" height="110" viewBox="${-HEX_WIDTH / 2 - 12} -112 ${HEX_WIDTH + 24} 224" role="img" aria-label="${attrs(details)}" focusable="false">${layers.background}${layers.pieces}</svg>`;
    previewCache.set(s, markup);
    return markup;
  }
  function systemMap(g: Game) {
    const W = HEX_WIDTH;
    const centers = g.systems.map((s) => ({
      s,
      x: W * (s.q + s.r / 2),
      y: 150 * s.r,
    }));
    const [vx, vy, vw, vh] = cameraBox();
    const feature =
      g.pending?.kind === "feature" &&
      g.pending.tech === "tech.kessler-syndrome"
        ? featureOptions(g, g.pending.tech)
        : [];
    const layers = centers.map(({ s }) => systemLayers(g, s, false, feature));
    const backgrounds = layers.map((layer) => layer.background).join("");
    const pieces = layers.map((layer) => layer.pieces).join("");
    const labels = centers
      .map(
        ({ s, x, y }) =>
          `<g class="system-label" data-label-system="${s.id}" transform="translate(${x} ${y})"><rect class="system-name-bar" x="-8" y="-95" width="16" height="19" rx="3" fill="#211d32" fill-opacity=".88"/><text x="0" y="-82" class="system-name">${escape(s.revealed ? nameOf(s) : "?")}</text></g>`,
      )
      .join("");
    snapSystem = null;
    const cursorSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="-29 -29 58 60"><g opacity=".65">${chipFace(g.turn, 0, 0, 24)}</g></svg>`;
    return `<section class="map-wrap ${g.phase === "plan" ? "plan-mode" : ""}" aria-label="Galaxy board"><div class="map-toolbar"><span>${g.pending?.kind === "orient" ? "Click or tap the revealed system to rotate clockwise" : g.phase === "plan" && !g.pending ? "Select a system, then confirm; double-click or double-tap to place" : "Select a system to inspect"}</span><div class="camera-controls">${button("←", "pan-left", 'aria-label="Pan left"')}${button("↑", "pan-up", 'aria-label="Pan up"')}${button("↓", "pan-down", 'aria-label="Pan down"')}${button("→", "pan-right", 'aria-label="Pan right"')}${button("−", "zoom-out", 'aria-label="Zoom out"')}${button("+", "zoom-in", 'aria-label="Zoom in"')}${button("Reset View", "fit", 'aria-label="Reset View"')}</div></div><div class="map-viewport" tabindex="0" aria-label="Galaxy map; arrow keys pan, plus and minus zoom" ${g.phase === "plan" && !g.pending && selected && canPlan(g, system(g, selected)) ? `style="cursor:url(&quot;data:image/svg+xml,${encodeURIComponent(cursorSvg)}&quot;) 24 24,pointer"` : ""}><svg id="galaxy" role="group" aria-label="Space Force galaxy" viewBox="${vx} ${vy} ${vw} ${vh}"><g class="system-backgrounds" aria-hidden="true" pointer-events="none">${backgrounds}</g><g class="system-pieces">${pieces}</g><g class="system-labels" aria-hidden="true" pointer-events="none">${labels}</g></svg></div></section>`;
  }

  function cameraBox() {
    if (!game) return [0, 0, 1, 1];
    const xs = game.systems.map((s) => Math.sqrt(3) * 100 * (s.q + s.r / 2));
    const ys = game.systems.map((s) => 150 * s.r);
    const minX = Math.min(...xs) - 130,
      maxX = Math.max(...xs) + 130;
    const minY = Math.min(...ys) - 135,
      maxY = Math.max(...ys) + 135;
    const width = (maxX - minX) / zoom,
      height = (maxY - minY) / zoom;
    return [
      (minX + maxX) / 2 + panX - width / 2,
      (minY + maxY) / 2 + panY - height / 2,
      width,
      height,
    ];
  }
  function updateCamera() {
    root
      .querySelector("#galaxy")
      ?.setAttribute("viewBox", cameraBox().join(" "));
    updateBoardTypography();
  }
  function updateTypography() {
    updateBoardTypography();
    root.querySelectorAll<SVGSVGElement>(".system-preview").forEach((svg) => {
      updateSvgTypography(svg, HEX_WIDTH + 24, 224, 96 / (HEX_WIDTH + 24));
    });
  }
  function updateBoardTypography() {
    const svg = root.querySelector<SVGSVGElement>("#galaxy");
    if (!svg) return;
    const box = cameraBox();
    updateSvgTypography(svg, box[2], box[3]);
  }
  function updateSvgTypography(
    svg: SVGSVGElement,
    width: number,
    height: number,
    fallbackScale = 1,
  ) {
    const rect = svg.getBoundingClientRect();
    const scale =
      rect.width > 0 && rect.height > 0
        ? Math.min(rect.width / width, rect.height / height)
        : fallbackScale;
    const font = Math.max(40 / 3, 40 / 3 / scale);
    svg.style.setProperty("--board-text-size", `${font}px`);
    const labels = [...svg.querySelectorAll<SVGGElement>(".system-label")].map(
      (label) => {
        const text = label.querySelector<SVGTextElement>("text")!;
        const bounds = text.getBBox?.();
        return {
          rect: label.querySelector("rect")!,
          x: bounds?.x ?? -(text.textContent?.length ?? 1) * font * 0.3,
          y: bounds?.y ?? -82 - font * 0.8,
          width: bounds?.width ?? (text.textContent?.length ?? 1) * font * 0.6,
          height: bounds?.height ?? font,
          pad: 3 / scale,
        };
      },
    );
    for (const label of labels) {
      label.rect.setAttribute("x", String(label.x - label.pad));
      label.rect.setAttribute("y", String(label.y - label.pad));
      label.rect.setAttribute("width", String(label.width + label.pad * 2));
      label.rect.setAttribute("height", String(label.height + label.pad * 2));
    }
    svg.querySelectorAll<SVGGElement>(".explore-token").forEach((g) => {
      const c = g.querySelector("circle");
      if (c) {
        const x = Number(c.getAttribute("cx")),
          y = Number(c.getAttribute("cy"));
        g.setAttribute(
          "transform",
          `translate(${x} ${y}) scale(${Math.max(1, 1 / scale)}) translate(${-x} ${-y})`,
        );
      }
    });
    svg.querySelectorAll<SVGGElement>(".fleet-badge").forEach((g) => {
      const x = Number(g.dataset.centerX),
        y = Number(g.dataset.centerY),
        r = g.querySelector("rect"),
        text = g.querySelector("text");
      if (!r || !text) return;
      const height = Math.max(20, font * 1.35),
        width = Math.max(33, font * (text.textContent?.length ?? 1) * 0.7 + 25);
      r.setAttribute("x", String(x - 16));
      r.setAttribute("y", String(y - height / 2));
      r.setAttribute("width", String(width));
      r.setAttribute("height", String(height));
      text.setAttribute("y", String(y + font * 0.35));
    });
  }
  function mapPoint(x: number, y: number) {
    const svg = root.querySelector<SVGSVGElement>("#galaxy");
    if (svg?.createSVGPoint && svg.getScreenCTM()) {
      const point = svg.createSVGPoint();
      point.x = x;
      point.y = y;
      const mapped = point.matrixTransform(svg.getScreenCTM()!.inverse());
      return { x: mapped.x, y: mapped.y };
    }
    const [vx, vy, vw, vh] = cameraBox();
    const rect = svg?.getBoundingClientRect();
    return {
      x: vx + ((x - (rect?.left ?? 0)) * vw) / (rect?.width || vw),
      y: vy + ((y - (rect?.top ?? 0)) * vh) / (rect?.height || vh),
    };
  }

  function moveTarget() {
    if (!game) return null;
    const id =
      game.pending &&
      "system" in game.pending &&
      ["action", "move"].includes(game.pending.kind)
        ? game.pending.system
        : selected;
    return id ? system(game, id) : null;
  }
  function currentPassengerLosses() {
    const target = moveTarget();
    if (!game || !target) return {};
    const losses = movementLosses(
      game,
      target,
      draft.sources,
      draft.carried,
      draft.passengerLosses,
    );
    return Object.fromEntries(
      losses.passengers.map((n, id) => [String(id), n]),
    );
  }
  function normalizePassengerLosses() {
    const target = moveTarget();
    if (!game || !target || !draft.passengerLosses) return;
    const base = movementLosses(game, target, draft.sources, draft.carried);
    let total = 0;
    for (let id = 0; id < game.players.length; id++) {
      const n = Math.min(base.carried[id], draft.passengerLosses[id] ?? 0);
      draft.passengerLosses[id] = n;
      total += n;
    }
    let excess = Math.max(0, total - base.total);
    for (let id = game.players.length - 1; id >= 0; id--) {
      const n = Math.min(excess, draft.passengerLosses[id]);
      draft.passengerLosses[id] -= n;
      excess -= n;
    }
    total = sumOwners(Object.values(draft.passengerLosses));
    let needed = Math.max(0, base.total - base.incoming - total);
    for (let id = 0; id < game.players.length; id++) {
      const n = Math.min(needed, base.carried[id] - draft.passengerLosses[id]);
      draft.passengerLosses[id] += n;
      needed -= n;
    }
  }
  function gravityControls(
    g: Game,
    target: System,
    values: Record<string, number>,
  ) {
    if (!hasTech(g, g.turn, "gravity-drive")) return "";
    const origins = g.systems.filter(
      (s) => (values[s.id] ?? 0) > 0 && canMove(g, g.turn, s, target),
    );
    const carry = origins
      .map((s) => {
        const total = sumOwners(Object.values(draft.carried[s.id] ?? {}));
        const owners = g.players.filter(
          (p) => p.id !== g.turn && s.ships[p.id] > 0,
        );
        if (!owners.length) return "";
        return `<div class="passenger-origin"><h4>${escape(nameOf(s))} · ${values[s.id]} carriers</h4>${owners
          .map((p) => {
            const n = draft.carried[s.id]?.[p.id] ?? 0;
            return numberControl(
              `Carry ${escape(p.name)} Ships`,
              "carried",
              n,
              Math.min(s.ships[p.id], values[s.id] - total + n),
              `data-origin="${s.id}" data-id="${p.id}"`,
            );
          })
          .join("")}</div>`;
      })
      .join("");
    const losses = movementLosses(
        g,
        target,
        values,
        draft.carried,
        draft.passengerLosses,
      ),
      count = sumOwners(losses.carried),
      lost = sumOwners(losses.passengers);
    return `<div class="gravity-controls"><h3>Gravity Drive · carried Ships</h3><p>Each incoming Ship can carry one opponent Ship from its own origin. Transported Ships follow the carrier's legal route.</p>${carry || "<p>No opponent passengers are available for the selected incoming Ships.</p>"}${
      count && losses.total
        ? `<h4>Choose black-hole casualties</h4><p>${losses.total} incoming Ships will be destroyed: ${losses.own} yours and ${lost} passengers. All losses become their owners' Credits.</p>${g.players
            .filter((p) => losses.carried[p.id] > 0)
            .map((p) =>
              numberControl(
                `Lose ${escape(p.name)} passenger Ships`,
                "passenger-loss",
                losses.passengers[p.id],
                Math.min(
                  losses.carried[p.id],
                  losses.total - lost + losses.passengers[p.id],
                ),
                `data-id="${p.id}"`,
              ),
            )
            .join("")}`
        : ""
    }</div>`;
  }
  function movementControls(
    g: Game,
    target: System,
    values: Record<string, number>,
  ) {
    const origins = g.systems.filter(
      (s) => s.ships[g.turn] > 0 && canMove(g, g.turn, s, target),
    );
    const html = origins.length
      ? origins
          .map((s) =>
            numberControl(
              `${escape(nameOf(s))} <small>${s.ships[g.turn]} available</small>`,
              "source",
              values[s.id] ?? 0,
              s.ships[g.turn],
              `data-id="${s.id}"`,
            ),
          )
          .join("")
      : '<p class="muted">No Ships have a legal route here. An empty MOVE INTO is allowed.</p>';
    return html + gravityControls(g, target, values);
  }
  function settlementControls(g: Game, s: System) {
    if (!s.revealed)
      return "<p>This system is unexplored. No planets can be settled until a MOVE INTO reveals it.</p>";
    const total = settlementDraftTotal(),
      remaining = Math.max(0, s.ships[g.turn] - total);
    return `<div class="settlement-controls"><p>Preview Settlements with + and −. <strong>${total}</strong> selected; <strong>${remaining}</strong> Ships will remain. Commit reveals any Explore tokens before placing your Settlements.</p><div class="planet-options">${s.planets
      .map((p, i) => {
        const value = draft.settlements[p.id] ?? 0;
        return `<div class="planet-choice ${selectedPlanet === p.id ? "highlight" : ""}">${planetIllustration(s, i)}<div>${numberControl(`Settlements · ${sumOwners(p.owners)}/${p.capacity} printed capacity${hasTech(g, g.turn, "arcologies") ? " · +1 shared Arcologies space" : ""}${p.explore ? " · Explore token" : ""}`, "settlement", value, Math.min(settlementSpace(g, p), remaining + value), `data-planet="${p.id}"`)}${p.blocked ? "<small>Blocked by a black hole</small>" : ""}</div></div>`;
      })
      .join("")}</div>${replacementControls(g, s, remaining)}</div>`;
  }
  function attackTotals() {
    return {
      ships: sumOwners(Object.values(draft.targets)),
      settlements: sumOwners(
        Object.values(draft.colonies).flatMap((p) => Object.values(p)),
      ),
    };
  }
  function attackLimit(
    g: Game,
    s: System,
    kind: "ships" | "settlements",
    available: number,
    value: number,
  ) {
    const totals = attackTotals();
    let n = available;
    while (
      n > 0 &&
      attackCost(
        g,
        totals.ships + (kind === "ships" ? n - value : 0),
        totals.settlements + (kind === "settlements" ? n - value : 0),
      ) > s.ships[g.turn]
    )
      n--;
    return n;
  }
  function trimAttack() {
    if (!game) return;
    let ships = 0,
      settlements = 0;
    for (const targets of Object.values(draft.colonies))
      for (const id of Object.keys(targets)) {
        let n = targets[id];
        while (
          n > 0 &&
          attackCost(game, ships, settlements + n) > draft.sacrifice
        )
          n--;
        targets[id] = n;
        settlements += n;
      }
    for (const id of Object.keys(draft.targets)) {
      let n = draft.targets[id];
      while (
        n > 0 &&
        attackCost(game, ships + n, settlements) > draft.sacrifice
      )
        n--;
      draft.targets[id] = n;
      ships += n;
    }
    trimPatrolTargets();
  }
  function trimPatrolTargets() {
    if (!game || !selected) return;
    const s = system(
      game,
      game.pending?.kind === "action" ? game.pending.system : selected,
    );
    for (const targets of Object.values(draft.colonies))
      for (const id of Object.keys(targets))
        if (patrolBlocks(game, s, Number(id), draft.targets[id] ?? 0))
          targets[id] = 0;
  }
  function defaultInvest(g: Game, s: System, action: Action) {
    if (forcedInvestment(g, action)) return true;
    if (action === "move")
      return !g.systems.some(
        (from) => from.ships[g.turn] > 0 && canMove(g, g.turn, from, s),
      );
    if (action === "produce")
      return !s.planets.some((p) => p.owners[g.turn] > 0);
    if (action === "attack")
      return (
        (s.ships[g.turn] === 0 && !hasTech(g, g.turn, "cloaking")) ||
        !(
          s.ships.some(
            (n, id) => attackTargetAllowed(g, g.turn, id, "ships") && n > 0,
          ) ||
          s.planets.some(
            (p) =>
              p.owners[g.turn] === 0 &&
              p.owners.some(
                (n, id) =>
                  attackTargetAllowed(g, g.turn, id, "settlements") && n > 0,
              ),
          )
        )
      );
    return s.ships[g.turn] === 0 && !beforeActionHooks(g, action).length;
  }
  function settlementDraftTotal() {
    return (
      sumOwners(Object.values(draft.settlements)) +
      sumOwners(
        Object.values(draft.replacements).flatMap((targets) =>
          Object.values(targets),
        ),
      )
    );
  }
  function trimReplacementDraft() {
    if (!game || !Object.keys(draft.replacements).length) return;
    const id =
      game.pending && "system" in game.pending ? game.pending.system : selected;
    if (!id) return;
    const additions = { ...draft.settlements };
    if (game.pending?.kind === "redistribute")
      for (const p of (game.context?.settlementQueue ?? []).filter(
        (p) => !p.replace,
      ))
        additions[p.planet] = (additions[p.planet] ?? 0) + p.count;
    if (!canSoylent(game, system(game, id), game.turn, additions)) {
      draft.replacements = {};
      if (game.pending?.kind === "redistribute")
        draft.keptShips = game.pending.amount - settlementDraftTotal();
    }
  }
  function replacementControls(
    g: Game,
    s: System,
    remaining: number,
    redistribution = false,
  ) {
    if (!hasTech(g, g.turn, "soylent-green")) return "";
    const additions = { ...draft.settlements };
    const queue = g.context?.settlementQueue ?? [];
    if (redistribution)
      for (const entry of queue.filter((p) => !p.replace))
        additions[entry.planet] = (additions[entry.planet] ?? 0) + entry.count;
    if (!canSoylent(g, s, g.turn, additions))
      return '<p class="muted">Soylent Green: replacements become available when every unblocked planet in this system is full.</p>';
    return `<div class="soylent-controls"><h3>Soylent Green · replace Settlements</h3><p>Each replacement uses one of your Ships. Opponent rockets are returned as Credits; this is SETTLE, so shared planets and Patrol do not prevent it.</p><div class="planet-options">${s.planets
      .map((p, i) => {
        const opponents = g.players.filter(
          (owner) => owner.id !== g.turn && p.owners[owner.id] > 0,
        );
        if (p.blocked || !opponents.length) return "";
        return `<div class="planet-choice">${planetIllustration(s, i)}<div>${opponents
          .map((owner) => {
            const n = draft.replacements[p.id]?.[owner.id] ?? 0;
            const fixed = redistribution
              ? sumOwners(
                  queue
                    .filter((q) => q.planet === p.id)
                    .map((q) => q.replace?.[owner.id] ?? 0),
                )
              : 0;
            return numberControl(
              `${escape(owner.name)} Settlements`,
              "replacement",
              n,
              Math.min(p.owners[owner.id] - fixed, remaining + n),
              `data-planet="${p.id}" data-id="${owner.id}"`,
            );
          })
          .join("")}</div></div>`;
      })
      .join("")}</div></div>`;
  }
  function techEffectPreview(g: Game) {
    if (!draft.action || draft.invest) return "";
    const source = g.pending?.kind === "action" ? g.context?.source : undefined;
    const before =
      g.pending?.kind === "action" ? [] : beforeActionHooks(g, draft.action);
    const after = afterActionHooks(g, draft.action, source);
    const nested = new Set<string>(),
      seen = new Set<string>();
    function visit(kind: Action, from?: string) {
      const key = `${kind}:${from}`;
      if (seen.has(key)) return;
      seen.add(key);
      for (const id of [
        ...beforeActionHooks(g, kind),
        ...afterActionHooks(g, kind, from),
      ]) {
        nested.add(id);
        if (id === "government-incentives") visit("move", `tech.${id}`);
        if (id === "population-explosion") visit("settle", `tech.${id}`);
        if (id === "spice") visit("produce", "tech.spice");
      }
    }
    if (g.pending?.kind === "action")
      for (const id of after) {
        if (id === "population-explosion") visit("settle", `tech.${id}`);
        if (id === "spice") visit("produce", "tech.spice");
      }
    else visit(draft.action, source);
    for (const id of [...before, ...after]) nested.delete(id);
    const names = (ids: Iterable<string>) =>
      [...ids].map((id) => escape(CARD_MAP[`tech.${id}`].title)).join(", ");
    if (!before.length && !after.length && !nested.size) return "";
    return `<aside class="tech-effect-preview" aria-label="Tech effects for this action"><strong>Tech effects</strong>${before.length ? `<p><strong>Before this action:</strong> ${names(before)}.</p>` : ""}${after.length ? `<p><strong>After this action:</strong> ${names(after)}.</p>` : ""}${nested.size ? `<p><strong>Through free actions:</strong> ${names(nested)}.</p>` : ""}<p>These effects still trigger if the main action is empty. Free actions use no additional token or action slot.</p></aside>`;
  }
  function foresightControl(g: Game) {
    if (g.phase === "finished" || !hasTech(g, g.turn, "foresight")) return "";
    return `<div class="foresight-inline" aria-label="Foresight"><strong>Foresight</strong>${button(privatePeek ? "Hide private peek" : "Peek at next two Events", privatePeek ? "hide-peek" : "show-peek", "", false, "secondary")}${
      privatePeek
        ? `<div class="foresight-cards">${
            peekEvents(g, g.turn)
              .map(
                (id, i) =>
                  `<figure><img src="${ART.cards[id].image}" width="180" height="291" alt="${attrs(CARD_MAP[id].title)}"/><figcaption>${i + 1}. ${escape(CARD_MAP[id].title)}</figcaption></figure>`,
              )
              .join("") || "<p>No face-down Events remain.</p>"
          }</div><p class="muted">Private peek for ${escape(player(g).name)}. Hide it before passing the device.</p>`
        : ""
    }</div>`;
  }
  function flexibleControl(g: Game, owner = g.turn) {
    if (g.phase === "finished" || !hasTech(g, owner, "flexible-economy"))
      return "";
    return `<div class="flexible-inline" aria-label="Flexible economy"><strong>Flexible economy</strong>${button("Return 1 Credit to Reserve", "return-credit", `data-owner="${owner}"`, player(g, owner).credits === 0, "secondary")}</div>`;
  }
  function recoveryAllocations(g: Game, pending: ReserveRecovery) {
    const owner = player(g, pending.owner),
      n = Math.min(owner.reserve, pending.remaining);
    return draft.recoveryShips ?? { [owner.home!]: n };
  }
  function reserveEffectPanel(g: Game, pending: ReserveRecovery) {
    const owner = player(g, pending.owner),
      available = Math.min(owner.reserve, pending.remaining),
      effect = pending.effect;
    let quantity = available,
      controls = "";
    if (effect.kind === "production") {
      const credits = draft.recoveryCredits ?? effect.credits;
      controls = `<p>Allocate the ${pending.remaining} unfinished production. Only available Reserve is applied; accepting a shortfall leaves the rest uncompleted.</p>${numberControl("Remaining Ships", "recovery-ships", pending.remaining - credits, pending.remaining)}${numberControl("Remaining Credits", "recovery-credits", credits, pending.remaining)}`;
    } else if (effect.kind === "reinforce") {
      const allocations = recoveryAllocations(g, pending);
      quantity = sumOwners(Object.values(allocations));
      controls = availableSystems(g, pending.owner)
        .map((s) =>
          numberControl(
            `Additional Ships in ${escape(nameOf(s))}`,
            "recovery-source",
            allocations[s.id] ?? 0,
            Math.max(0, available - quantity + (allocations[s.id] ?? 0)),
            `data-id="${s.id}"`,
          ),
        )
        .join("");
    }
    return `<section class="console reserve-effect"><div class="eyebrow">Effect waiting</div><h2>${escape(pending.label)}</h2>${owner.id !== g.turn ? `${badge(owner.style, owner.name)}<div class="resource-pills"><span><small>Reserve</small><strong>${owner.reserve}</strong></span><span><small>Credits</small><strong>${owner.credits}</strong></span></div>${flexibleControl(g, owner.id)}` : ""}<p>${pending.remaining} rocket${pending.remaining === 1 ? "" : "s"} remain to complete this effect. Earlier gains and commitments stay in place.</p>${controls}${button("Apply effect", "complete-reserve", "", false, "primary")}</section>`;
  }
  function reserveEffectCommand(): Command {
    return {
      type: "completeReserve",
      credits: draft.recoveryCredits,
      ships:
        game?.pending?.kind === "reserve" &&
        game.pending.effect.kind === "reinforce"
          ? recoveryAllocations(game, game.pending)
          : undefined,
    };
  }
  function flexibleReminder(g: Game, owner: number) {
    return `${player(g, owner).name} could use Flexible economy in the Status Box to increase their Reserve before applying this effect.`;
  }
  function backToReserve() {
    reserveWarningOpen = false;
    render();
    scrollToStatus();
    (
      root.querySelector<HTMLElement>(
        '.reserve-effect [data-action="return-credit"]:not(:disabled)',
      ) ??
      root.querySelector<HTMLElement>(
        '#status-box [data-action="return-credit"]:not(:disabled)',
      ) ??
      root.querySelector<HTMLElement>("#status-box")
    )?.focus({ preventScroll: true });
  }
  function reserveRecoveryModal(g: Game, pending: ReserveRecovery) {
    return `<div class="modal-scrim"><section class="modal reserve-recovery" role="dialog" aria-modal="true" aria-label="Reserve shortfall"><h2>Reserve shortfall</h2>${pending.messages.map((message) => `<p>${escape(message)}</p>`).join("")}<p>${escape(flexibleReminder(g, pending.owner))}</p><div class="commit-row">${button("Go back", "back-to-reserve", "", false, "secondary")}${button("Confirm outcome", "confirm-reserve", "", false, "primary")}</div></section></div>`;
  }
  function choosingVorsprung(g: Game) {
    return (
      g.pending?.kind === "eventChoice" && g.pending.event === "event.vorsprung"
    );
  }
  function selectedSabotageTarget(g: Game, targets = sabotageTargets(g)) {
    const explicit = targets.find(
      (t) =>
        t.player === draft.sabotageTarget?.player &&
        t.tech === draft.sabotageTarget.tech,
    );
    if (explicit) return explicit;
    const best = targets
      .filter((t) => Number(CARD_MAP[t.tech].cost) <= player(g).credits)
      .reduce<(typeof targets)[number] | undefined>(
        (best, t) =>
          !best ||
          Number(CARD_MAP[t.tech].cost) > Number(CARD_MAP[best.tech].cost)
            ? t
            : best,
        undefined,
      );
    return best &&
      !purchaseReason(
        g,
        "tech.sabotage",
        g.turn,
        false,
        Number(CARD_MAP[best.tech].cost),
        best,
      )
      ? best
      : undefined;
  }

  function eventAllocations(g: Game) {
    return g.pending?.kind === "eventChoice" &&
      g.pending.event === "event.turtling" &&
      !Object.keys(draft.allocation).length
      ? { [player(g).home!]: Math.min(3, player(g).reserve) }
      : draft.allocation;
  }
  function vorsprungCommitControls(g: Game) {
    const valid =
      draft.eventTech !== undefined &&
      eventTechOptions(g).includes(draft.eventTech);
    return `<div class="vorsprung-selection"><p>${valid ? `Selected: <strong>${escape(CARD_MAP[draft.eventTech!].title)}</strong> · value ${CARD_MAP[draft.eventTech!].cost}. Change your choice freely before committing.` : "Select an eligible Tech, then commit your claim."}</p>${button("Commit Tech claim", "commit-vorsprung", "", !valid, "primary")}</div>`;
  }
  function commitVorsprung() {
    if (
      !game ||
      !choosingVorsprung(game) ||
      !draft.eventTech ||
      !eventTechOptions(game).includes(draft.eventTech)
    )
      return;
    perform({ type: "eventChoice", tech: draft.eventTech });
  }
  function selectVorsprungTech(
    id: string,
    pointer?: MouseEvent,
    fromCard = false,
  ) {
    if (
      !game ||
      !choosingVorsprung(game) ||
      !eventTechOptions(game).includes(id)
    )
      return;
    const previous = techTap,
      time = Date.now();
    draft.eventTech = id;
    if (fromCard && pointer && pointer.detail > 0) {
      if (
        previous &&
        previous.tech === id &&
        previous.actor === game.turn &&
        previous.revision === game.revision &&
        time >= previous.time &&
        time - previous.time <= 450 &&
        Math.hypot(
          pointer.clientX - previous.x,
          pointer.clientY - previous.y,
        ) <= 24
      ) {
        techTap = null;
        commitVorsprung();
        return;
      }
      techTap = {
        tech: id,
        actor: game.turn,
        revision: game.revision,
        time,
        x: pointer.clientX,
        y: pointer.clientY,
      };
    } else techTap = null;
    render();
    root
      .querySelector<HTMLElement>(
        fromCard
          ? `#game-panel .tech-card[data-tech-id="${id}"] .card-art-button`
          : `#status-box button[data-action="select-event-tech"][data-tech="${id}"]`,
      )
      ?.focus({ preventScroll: true });
  }
  function activeEventSummary(g: Game) {
    if (!g.activeEvent) return "";
    const event = g.activeEvent,
      oneOff = ONE_OFF_EVENTS.includes(event.id),
      complete = oneOff && !g.eventFlow;
    return `<aside class="active-event-summary"><strong>Active Event: ${escape(CARD_MAP[event.id].title)}</strong>${complete ? "<p>Effect complete</p>" : `<p>${escape(CARD_MAP[event.id].text)}</p>${oneOff ? "" : `<p class="event-selector">Selected by ${escape(player(g, event.owner).name)}.</p>`}`}</aside>`;
  }
  function actionEventReminders(g: Game, s: System) {
    if (draft.action === "produce" && eventIs(g, "el-mayarah", g.turn)) {
      const shared = s.planets.filter(
        (p) =>
          !p.blocked &&
          p.owners[g.turn] > 0 &&
          p.owners.some((n, id) => id !== g.turn && n > 0),
      );
      const bonus = sumOwners(
        shared.map((p) => (sumOwners(p.owners) >= p.capacity ? 2 : 1)),
      );
      return `<p class="action-event-reminder">${shared.length ? `El Mayarah: your ${shared.length} shared planet${shared.length === 1 ? "" : "s"} produce${shared.length === 1 ? "s" : ""} double (2 rockets per planet, or 4 when full), adding ${bonus} production here. Output remains limited by Reserve.` : "El Mayarah: you have no shared planets in this system, so it adds no production here."}</p>`;
    }
    if (draft.action !== "attack") return "";
    let text = eventIs(g, "black-cloud")
      ? "Black Cloud: Ships cannot be targeted. Only opposing Settlements may be attacked."
      : "";
    if (eventIs(g, "alliance")) {
      const event = g.activeEvent!;
      text =
        event.ally === undefined
          ? "Alliance: no opponent was chosen, so it restricts no targets."
          : event.ally === g.turn
            ? `Alliance: you cannot target ${player(g, event.owner).name}'s Ships or Settlements.`
            : `Alliance: ${player(g, event.ally).name} cannot attack ${player(g, event.owner).name}. Your targets are unaffected.`;
    }
    return text ? `<p class="action-event-reminder">${escape(text)}</p>` : "";
  }
  function attackEmptyState(g: Game, kind: "ships" | "settlements") {
    if (kind === "ships" && eventIs(g, "black-cloud"))
      return "Black Cloud prevents targeting Ships.";
    if (eventIs(g, "alliance") && g.activeEvent!.ally === g.turn)
      return `Alliance protects ${escape(player(g, g.activeEvent!.owner).name)}'s ${kind === "ships" ? "Ships" : "Settlements"}. No other eligible targets are available.`;
    return kind === "ships"
      ? "None in this system."
      : "No opposing Settlements.";
  }
  function investmentChoice(g: Game) {
    return `<label class="check-row invest-choice"><input type="checkbox" data-check="invest" ${draft.invest ? "checked" : ""} ${draft.action && forcedInvestment(g, draft.action) ? "disabled" : ""}/><strong>Invest instead of acting</strong>${draft.invest && eventIs(g, "economic-boom") ? '<span class="investment-event-reminder">Economic Boom: Invest two rockets instead of one (subject to Reserve).</span>' : ""}</label>`;
  }

  function actionForm(g: Game, s: System) {
    const p = player(g);
    if (draft.invest)
      return `<p>${draft.action && forcedInvestment(g, draft.action) ? "The active Event requires this Investment. " : ""}Invest ${p.reserve ? `${Math.min(p.reserve, investmentAmount(g))} Reserve rocket${Math.min(p.reserve, investmentAmount(g)) === 1 ? "" : "s"}` : "without a rocket because Reserve is empty"} in this ${draft.action} slot. Cash it during Economy.</p>`;
    if (
      draft.action &&
      g.pending?.kind !== "action" &&
      beforeActionHooks(g, draft.action).length
    )
      return `<p>Commit the action choice first; choose quantities after its before-effects finish.</p>`;
    if (draft.action === "move" && !s.revealed && defaultInvest(g, s, "move"))
      return "<p>No Ships can legally enter. An empty MOVE INTO can activate applicable Techs without revealing this system.</p>";
    if (draft.action === "move" && !s.revealed)
      return `<p>Reveal this system and choose its orientation first. Then choose the incoming Ships. At least one Ship must enter after a reveal.</p>`;
    if (draft.action === "move")
      return `<p>Choose incoming Ships.${!s.revealed ? " Moving here reveals the system; orientation follows after commitment." : ""}</p>${movementControls(g, s, draft.sources)}${blackHoles(s) ? `<small>Destination: up to ${blackHoles(s)} incoming Ships will be lost to black holes and returned as Credits.</small>` : ""}`;
    if (draft.action === "settle") return settlementControls(g, s);
    if (draft.action === "produce") {
      const total = Math.min(p.reserve, production(g, s)),
        credits = draft.credits ?? 0;
      return `<div class="production-controls"><p><strong>${total}</strong> rockets available from ${production(g, s)} production.</p>${total < production(g, s) ? `<p class="reserve-shortfall">Production is limited by Reserve: ${total} of ${production(g, s)} rockets are available.</p>` : ""}${numberControl("Ships produced", "produce-ships", total - credits, total)}${numberControl("Credits produced", "produce-credits", credits, total)}<p class="allocation-total valid">Producing ${total - credits} Ships and ${credits} Credits.</p></div>`;
    }
    if (draft.action === "attack") {
      const totals = attackTotals(),
        used = attackCost(g, totals.ships, totals.settlements);
      return `<div class="attack-controls"><p>${hasTech(g, g.turn, "death-sun") ? `Each sacrificed Ship removes up to ${shipDamage(g, true)} opposing Ships <strong>or</strong> 2 opposing Settlements. A sacrifice cannot mix the two target types.` : `Each sacrificed Ship removes up to ${shipDamage(g)} opposing Ships <strong>or</strong> one Settlement.`} All casualties become Credits.</p>${numberControl(`Your Ships to sacrifice (out of ${s.ships[g.turn]})`, "sacrifice", draft.sacrifice, s.ships[g.turn])}<p class="attack-budget">${draft.sacrifice} / ${used} sacrifices needed by these targets.</p><div class="attack-columns"><div><h4>Opposing Ships</h4>${
        g.players
          .filter(
            (other) =>
              attackTargetAllowed(g, p.id, other.id, "ships") &&
              s.ships[other.id] > 0,
          )
          .map((other) => {
            const value = draft.targets[String(other.id)] ?? 0;
            return numberControl(
              `${rocket(other.style)} ${escape(other.name)}`,
              "target-ships",
              value,
              attackLimit(g, s, "ships", s.ships[other.id], value),
              `data-id="${other.id}"`,
            );
          })
          .join("") || `<p class="muted">${attackEmptyState(g, "ships")}</p>`
      }</div><div><h4>Opposing Settlements</h4><div class="attack-planets" data-preserve-scroll="attack-planets">${
        s.planets
          .map((planet, i) => {
            const opponents = g.players.filter(
              (other) =>
                attackTargetAllowed(g, p.id, other.id, "settlements") &&
                planet.owners[other.id] > 0,
            );
            if (!opponents.length) return "";
            return `<div class="attack-planet ${selectedPlanet === planet.id ? "highlight" : ""}">${planetIllustration(s, i)}<div>${
              planet.owners[p.id] > 0
                ? '<p class="muted">Protected because you share it.</p>'
                : opponents
                    .map((other) => {
                      const value =
                        draft.colonies[planet.id]?.[String(other.id)] ?? 0;
                      return numberControl(
                        `${rocket(other.style)} ${escape(other.name)}${patrolBlocks(g, s, other.id, draft.targets[String(other.id)] ?? 0) ? " · Patrol: target all their Ships first" : ""}`,
                        "target-colony",
                        value,
                        patrolBlocks(
                          g,
                          s,
                          other.id,
                          draft.targets[String(other.id)] ?? 0,
                        )
                          ? 0
                          : attackLimit(
                              g,
                              s,
                              "settlements",
                              planet.owners[other.id],
                              value,
                            ),
                        `data-id="${other.id}" data-planet="${planet.id}"`,
                      );
                    })
                    .join("")
            }</div></div>`;
          })
          .join("") ||
        `<p class="muted">${attackEmptyState(g, "settlements")}</p>`
      }</div></div></div></div>`;
    }
    return "";
  }
  function revealedExploreReminder(s: System) {
    if (!s.revealed) return "";
    const tokens = s.planets.filter((p) => p.explore && p.exploreFaceUp);
    const effects = {
      credit1: "The settling player gains 1 Credit from Reserve.",
      credit2: "The settling player gains 2 Credits from Reserve.",
      credit3: "The settling player gains 3 Credits from Reserve.",
      otherShips:
        "Choose another player: they receive up to 2 Ships from their Reserve in this system.",
      otherSettlement:
        "Choose another player: they receive 1 Settlement from their Reserve on this planet before your Settlements are placed.",
      blackHole:
        "Add a black hole to this system when the planet is settled. Existing Ships are unharmed.",
    };
    return tokens.length
      ? `<div class="revealed-explore-reminder"><strong>Face-up Explore effects</strong><ul>${tokens.map((p) => `<li>${planetIllustration(s, s.planets.indexOf(p))}<span>${escape(effects[p.explore!])}</span></li>`).join("")}</ul></div>`
      : "";
  }
  function inspector(g: Game) {
    const eventControls = eventDecision(g);
    if (eventControls !== null) return eventControls;
    if (g.pending?.kind === "reserve") return reserveEffectPanel(g, g.pending);
    if (reserveNotice(g)) return "";
    if (g.pending?.kind === "filibuster") {
      const choices = g.systems.flatMap((s) =>
        s.tokens.flatMap((owner, index) =>
          owner === g.turn ? [{ s, index }] : [],
        ),
      );
      return `<section class="console"><div class="eyebrow">After PLAN · Filibuster</div><h2>Move one of your tokens to the top</h2><p>Select the exact token to lift, or pass. Token numbers count from the top of each stack.</p><div class="feature-options">${choices.map(({ s, index }) => button(`${systemIllustration(g, s)}<span>${escape(nameOf(s))} · token #${s.tokens.length - index}${index === s.tokens.length - 1 ? " (top)" : ""}${index === 0 ? " (bottom)" : ""}</span>`, "filibuster-option", `data-system-id="${s.id}" data-index="${index}" aria-pressed="${selected === s.id && draft.tokenIndex === index}"`, false, `secondary system-target ${selected === s.id && draft.tokenIndex === index ? "selected" : ""}`)).join("")}</div>${button("Pass", "skip-filibuster", "", false, "quiet")}${button("Lift token to top", "commit-filibuster", "", !choices.some((o) => o.s.id === selected && o.index === draft.tokenIndex), "primary")}</section>`;
    }
    if (g.pending?.kind === "insurance") {
      const p = player(g),
        places = availableSystems(g);
      return `<section class="console"><div class="eyebrow">Insurance · skipped turn</div><h2>Gain one Credit or Ship</h2><p>No action token of yours was on top. Choose one reward from Reserve. ${p.reserve === 0 ? "Reserve is empty; Flexible Economy can return Credits before choosing, if you own it." : `${p.reserve} Reserve available.`}</p>${button("Take 1 Credit", "insurance-credit", "", false, "primary")}<div class="feature-options">${places.map((s) => button(`Take 1 Ship in ${escape(nameOf(s))}`, "insurance-ship", `data-system-id="${s.id}" aria-pressed="${selected === s.id}"`, false, selected === s.id ? "selected" : "secondary")).join("")}</div></section>`;
    }
    if (g.pending?.kind === "eminent")
      return `<section class="console"><div class="eyebrow">Eminent Domain · before scoring</div><h2>One last SETTLE at home?</h2><p>Resolve a free SETTLE in ${escape(nameOf(system(g, player(g).home!)))} with its applicable Tech effects. No action token or unused slot is required.</p>${button("Use free SETTLE", "use-eminent", "", false, "primary")}${button("Skip and continue", "skip-eminent", "", false, "quiet")}</section>`;
    if (g.pending?.kind === "mercenaries")
      return `<section class="console"><div class="eyebrow">After MOVE INTO · Mercenaries</div><h2>Hire Ships in ${escape(nameOf(system(g, g.pending.system)))}</h2><p>Convert up to three existing Credits into Ships. These Ships are added directly and do not suffer black-hole entry losses.</p>${numberControl("Credits to convert", "mercenaries", draft.techCount, Math.min(3, player(g).credits))}${button("Confirm conversion", "commit-mercenaries", "", false, "primary")}</section>`;

    if (g.pending?.kind === "action") {
      const pending = g.pending,
        s = system(g, pending.system);
      return `<section class="console"><div class="eyebrow">${escape(pending.source)}</div><h2>${pending.free ? "Free " : "Complete "}${ACTION_LABELS[pending.action]} · ${escape(nameOf(s))}</h2><p>${pending.free ? "No additional action token or slot is consumed. Perform this action, even if its main effect is empty." : "The action token is committed. Before-effects are complete; now choose its main effect."}</p>${actionEventReminders(g, s)}${techEffectPreview(g)}${actionForm(g, s)}${hasTech(g, g.turn, "banking") && g.phase === "actions" ? `<label class="check-row"><input type="checkbox" data-check="bank" ${draft.bank ? "checked" : ""}/>Banking: also Invest if Reserve allows</label>` : ""}${button("Commit effect", "commit-effect", "", false, "primary")}</section>`;
    }
    if (g.pending?.kind === "ack")
      return `<section class="console outcome-notice"><h2>${escape(g.pending.title)}</h2>${g.pending.messages.map((m) => `<p>${escape(m)}</p>`).join("")}<p>Review this outcome, then continue.</p>${button("Ok", "acknowledge", "", false, "primary")}</section>`;
    if (g.pending?.kind === "redistribute")
      return redistributionControls(g, g.pending);
    const s = selected ? g.systems.find((s) => s.id === selected) : null,
      pending = g.pending;
    if (pending?.kind === "orient")
      return `<section class="console"><div class="eyebrow">Exploration revealed · orientation preview</div><h2>Orient ${escape(nameOf(system(g, pending.system)))}</h2><p>Click or tap this system to rotate clockwise, or use the buttons. Rotate freely, then commit a legal orientation.</p><div class="rotation-options">${button("↶ Anti-clockwise", "rotate-preview", 'data-delta="-1"', false, "secondary")}<strong>${orientation * 60}°</strong>${button("↷ Clockwise", "rotate-preview", 'data-delta="1"', false, "secondary")}</div>${!pending.rotations.includes(orientation) ? '<p class="error">This orientation blocks the entry route or disconnects the board. Keep rotating.</p>' : ""}${button("Commit orientation", "commit-orientation", "", !pending.rotations.includes(orientation), "primary")}</section>`;
    if (pending?.kind === "move") {
      const target = system(g, pending.system);
      return `<section class="console"><div class="eyebrow">Committed movement</div><h2>Enter ${escape(nameOf(target))}</h2>${movementControls(g, target, draft.sources)}<p>At least one Ship must enter from ${pending.entrySources.map((id) => escape(nameOf(system(g, id)))).join(" or ")}.</p>${blackHoles(target) ? `<p>Up to ${blackHoles(target)} incoming Ships will be lost to destination black holes.</p>` : ""}${button("Finish movement", "finish-move", "", !pending.entrySources.some((id) => (draft.sources[id] ?? 0) > 0), "primary")}</section>`;
    }
    if (pending?.kind === "explore")
      return `<section class="console"><div class="eyebrow">Explore token revealed</div><h2>A gift for a rival</h2><p>${pending.effect === "otherShips" ? "Choose another player to receive up to 2 Ships in this system." : "Choose another player to receive 1 Settlement on this planet before your Settlements are placed."}</p><div class="recipient-options">${g.players
        .filter((p) => p.id !== g.turn)
        .map((p) =>
          button(
            `${rocket(p.style)} ${escape(p.name)} <small>${p.reserve} Reserve</small>`,
            "recipient",
            `data-recipient="${p.id}"`,
            false,
            "secondary",
          ),
        )
        .join("")}</div></section>`;
    if (pending?.kind === "settle")
      return `<section class="console"><div class="eyebrow">Settlement preview</div><h2>${escape(nameOf(system(g, pending.system)))}</h2>${settlementControls(g, system(g, pending.system))}${button("Commit Settlements", "commit-settlements", "", false, "primary")}</section>`;
    if (
      pending?.kind === "feature" ||
      pending?.kind === "genesis" ||
      pending?.kind === "rapid"
    ) {
      const tech =
          pending.kind === "rapid"
            ? "tech.rapid-advance"
            : pending.kind === "genesis"
              ? "tech.genesis"
              : pending.tech,
        options = featureOptions(g, tech);
      const match = (o: (typeof options)[number]) =>
        o.system === selected &&
        (!o.planet || o.planet === selectedPlanet) &&
        (o.edge === undefined || o.edge === selectedEdge);
      return `<section class="console"><div class="eyebrow">${escape(CARD_MAP[tech].title)}</div><h2>Choose ${tech === "tech.kessler-syndrome" ? "a system edge" : options.some((o) => o.planet) ? "a planet" : "a system"}</h2><p>Click or tap a board target to select it here, then commit. Double-click or double-tap the target to confirm.</p>${tech === "tech.disruptor" && eventIs(g, "earth-first") ? `<p class="earth-first-warning">Earth First overrides Disruptor in an opponent home system.${selected && earthFirstOverridesDisruptor(g, g.turn, selected) ? " This selected system will not be blocked." : ""}</p>` : ""}<div class="feature-options">${options
        .slice()
        .sort((a, b) => Number(match(b)) - Number(match(a)))
        .map((o) => {
          const target = system(g, o.system),
            index = target.planets.findIndex((p) => p.id === o.planet);
          return button(
            `${o.planet ? planetIllustration(target, index) : o.edge === undefined ? systemIllustration(g, target) : ""}<span>${escape(nameOf(target))}${o.edge !== undefined ? ` · edge ${o.edge + 1}` : ""}</span>`,
            "feature-option",
            `data-system-id="${o.system}" ${o.planet ? `data-planet="${o.planet}"` : ""} ${o.edge !== undefined ? `data-edge="${o.edge}"` : ""} aria-pressed="${match(o)}"`,
            false,
            `secondary feature-choice ${o.planet ? "planet-target" : o.edge === undefined ? "system-target" : "edge-choice"} ${match(o) ? "selected" : ""}`,
          );
        })
        .join(
          "",
        )}</div><div class="commit-row">${pending.kind === "rapid" ? button("Skip conversion", "skip-rapid", "", false, "quiet") : pending.kind === "feature" && pending.optional ? button("Skip optional placement", "skip-feature", "", false, "quiet") : ""}${button(pending.kind === "rapid" ? "Convert Ship" : "Commit placement", pending.kind === "rapid" ? "commit-rapid" : "commit-feature", "", !options.some(match), "primary")}</div></section>`;
    }
    if (g.phase === "investments" || g.phase === "reinforce")
      return supplyAllocation(g);
    if (g.phase === "event")
      return `<section class="console"><div class="eyebrow">Economy · Event</div><h2>${g.finalEconomy ? "Final Economy" : "Event cards drawn"}</h2><p>${g.finalEconomy ? "The Event deck is empty. Complete Tech purchases, then score; there are no reinforcements." : "This Event pair counts rounds. Effects and bidding are disabled in this build."}</p>${button("Continue to Tech", "continue-event", "", false, "primary")}${view !== "event" ? button("View Event pair", "to-event", "", false, "secondary") : ""}</section>`;
    if (g.phase === "tech")
      return `<section class="console"><div class="eyebrow">Economy · Buy Tech</div><h2>${player(g).credits} Credits available</h2><p>Buy one Tech or pass. The purchase cost returns to Reserve, and one rocket marks ownership.</p>${view !== "techs" ? button("View Techs", "to-techs", "", false, "primary") : ""}${button("Pass this purchase", "pass-tech", "", false, "secondary")}</section>`;
    if (!s && g.phase === "finished") return "";
    if (!s)
      return `<section class="console empty-console"><span class="eyebrow">${phaseLabel(g)}</span><h2>${g.phase === "plan" ? "Place your next action token" : "Select a system."}</h2><p>${escape(instruction(g))}</p></section>`;
    const explore = s.revealed ? s.planets.filter((p) => p.explore).length : 0;
    const info = `<div class="system-summary"><span>${
      s.revealed
        ? `${s.planets.length} planets${blackHoles(s) ? ` · ${blackHoles(s)} black hole${blackHoles(s) === 1 ? "" : "s"}` : ""}${warp(s) ? " · Warp" : ""}${
            edges(s).length
              ? ` · ${new Set(edges(s)).size} asteroid edge${new Set(edges(s)).size === 1 ? "" : "s"}`
              : ""
          }`
        : "Contents hidden until entry"
    }</span>${explore ? `<strong class="explore-summary">${explore} Explore token${explore === 1 ? "" : "s"} in this system</strong>${revealedExploreReminder(s)}` : ""}<span>${
      s.ships
        .map((n, id) => (n ? `${escape(player(g, id).name)}: ${n} Ships` : ""))
        .filter(Boolean)
        .join(" · ") || "No Ships"
    }</span></div>`;
    let controls = "";
    if (g.phase === "homes")
      controls = button(
        "Choose this home",
        "choose-home",
        "",
        !s.revealed ||
          !s.planets.some((p) => p.home) ||
          g.players.some((p) => p.home === s.id),
        "primary",
      );
    else if (g.phase === "plan")
      controls = `<p>${canPlan(g, s) ? "Select any system to change your mind, then confirm with Place chip here." : escape(planReason(g, s))}</p>${button("Place chip here", "place-chip", "", !canPlan(g, s), "primary")}`;
    else if (
      g.phase === "actions" &&
      eligibleTokens(g).some((o) => o.id === s.id)
    )
      controls = `<div class="action-grid">${(Object.keys(ACTION_LABELS) as Action[]).map((action) => button(ACTION_LABELS[action], "select-action", `data-kind="${action}" aria-pressed="${draft.action === action}"`, !eventIs(g, "flexibility", g.turn) && player(g).used.includes(action), draft.action === action ? "selected" : "")).join("")}</div>${
        eventIs(g, "flexibility", g.turn) && draft.action
          ? `<label>Flexibility · receiving action slot <select data-setting="action-slot">${(
              Object.keys(ACTION_LABELS) as Action[]
            )
              .filter((a) => !player(g).used.includes(a))
              .map(
                (a) =>
                  `<option value="${a}" ${a === draft.slot ? "selected" : ""}>${ACTION_LABELS[a]}</option>`,
              )
              .join("")}</select></label>`
          : ""
      }${draft.action ? `${actionEventReminders(g, s)}${techEffectPreview(g)}${actionForm(g, s)}${!draft.invest && hasTech(g, g.turn, "banking") && g.phase === "actions" ? `<label class="check-row"><input type="checkbox" data-check="bank" ${draft.bank ? "checked" : ""}/>Banking: also Invest if Reserve allows</label>` : ""}${investmentChoice(g)}<div class="commit-row">${button("Commit action", "commit-action", "", false, "primary")}</div><small>Change your selection freely before Commit. Hidden reveals and committed moves stay locked.</small>` : "<p>Select an unused action slot.</p>"}`;
    else if (g.phase === "actions")
      controls = eventIs(g, "cyber-attack")
        ? "<p>Cyber Attack: Select a stack with any player's colour on top</p>"
        : "<p>Select a stack with your colour on top.</p>";
    return `<section id="system-status" class="console"><span class="eyebrow">System status</span><h2>${escape(nameOf(s))}</h2>${info}${stackOrder(g, s)}${controls}</section>`;
  }

  function scrollToStatus() {
    root
      .querySelector<HTMLElement>("#status-box")
      ?.focus({ preventScroll: true });
    root.ownerDocument.defaultView?.scrollTo({ top: 0, behavior: "auto" });
  }
  function stackOrder(g: Game, s: System) {
    return !s.tokens.length
      ? ""
      : `<div class="system-stack-order"><strong>Stack order · top to bottom</strong><ol>${s.tokens
          .slice()
          .reverse()
          .map(
            (id, i) =>
              `<li data-stack-index="${i}" data-owner="${id}"><span>${i + 1}.</span>${badge(id, player(g, id).name)}${i === 0 ? "<strong>Top</strong>" : ""}</li>`,
          )
          .join("")}</ol></div>`;
  }
  function adjustAllocation(g: Game, id: string | "credits", value: number) {
    const invest = g.phase === "investments",
      amount = invest ? player(g).invested : reinforceCount(g);
    if (invest) draft.credits ??= amount;
    else draft.credits = 0;
    const n = Math.max(0, Math.min(amount, Math.floor(value))),
      before =
        (draft.credits ?? 0) + sumOwners(Object.values(draft.allocation));
    const previous =
      id === "credits" ? (draft.credits ?? 0) : (draft.allocation[id] ?? 0);
    if (id === "credits") draft.credits = n;
    else
      draft.allocation[id] = invest
        ? n
        : Math.min(
            n,
            Math.max(
              0,
              amount -
                sumOwners(
                  Object.entries(draft.allocation)
                    .filter(([key]) => key !== id)
                    .map(([, n]) => n),
                ),
            ),
          );
    let excess = Math.max(
      0,
      (draft.credits ?? 0) +
        sumOwners(Object.values(draft.allocation)) -
        amount,
    );
    if (invest && id !== "credits") {
      const reduction = Math.min(draft.credits ?? 0, excess);
      draft.credits = (draft.credits ?? 0) - reduction;
      excess -= reduction;
    }
    if (invest)
      for (const s of availableSystems(g)) {
        if (s.id === id) continue;
        const reduction = Math.min(draft.allocation[s.id] ?? 0, excess);
        draft.allocation[s.id] = (draft.allocation[s.id] ?? 0) - reduction;
        excess -= reduction;
      }
    if (invest && id !== "credits" && n < previous && before === amount)
      draft.credits = (draft.credits ?? 0) + previous - n;
  }
  function supplyAllocation(g: Game) {
    const p = player(g),
      investments = g.phase === "investments",
      amount = investments ? p.invested : reinforceCount(g),
      allocatedShips = sumOwners(Object.values(draft.allocation));
    const credits = investments ? (draft.credits ?? amount) : 0;
    return `<section class="console"><div class="eyebrow">${investments ? "Investments" : "Reinforcements"}</div><h2>Allocate ${investments ? amount : `up to ${amount}`} rockets</h2><p>${investments ? "Choose Credits or Ships (anywhere you have a Settlement). Clicking a legal system on the board adds one Ship there." : "Place Ships at home or in a system where you have a Settlement. Click the board or use the quantities below."}</p>${!investments && amount < reinforceAllowance(g) ? `<p class="reserve-shortfall">Reserve limits your reinforcements: ${amount} available out of ${reinforceAllowance(g)}.</p>` : ""}${investments ? numberControl("Take as Credits", "allocate-credits", credits, amount) : ""}${availableSystems(
      g,
    )
      .map((s) => {
        const n = draft.allocation[s.id] ?? 0,
          max = investments ? amount : Math.max(0, amount - allocatedShips + n);
        return numberControl(
          `Ships in ${escape(nameOf(s))}`,
          "allocate-system",
          n,
          max,
          `data-id="${s.id}"`,
        );
      })
      .join(
        "",
      )}<p class="allocation-total ${(investments ? credits + allocatedShips === amount : allocatedShips <= amount) ? "valid" : ""}">${credits + allocatedShips} / ${amount} allocated</p>${investments ? button("All as Credits", "all-credits", "", false, "secondary") : button("Put all at home", "all-home", "", false, "secondary")}${button("Confirm allocation", "allocate", "", investments ? credits + allocatedShips !== amount : allocatedShips > amount, "primary")}</section>`;
  }
  function redistributionControls(
    g: Game,
    pending: Extract<NonNullable<Game["pending"]>, { kind: "redistribute" }>,
  ) {
    const s = system(g, pending.system),
      queue = g.context?.settlementQueue ?? [],
      allocated = settlementDraftTotal(),
      kept = draft.keptShips ?? pending.amount - allocated;
    return `<section class="console"><div class="eyebrow">Committed Settlements · displaced allocation</div><h2>Choose what to do with ${pending.amount} displaced rocket${pending.amount === 1 ? "" : "s"}</h2><p>Your opponent's Settlement took a space. Already placed Settlements and all other committed placements stay fixed. Allocate only the displaced rockets below, or keep them as Ships.</p>${numberControl("Keep as Ships", "redistribute-ships", kept, pending.amount)}<div class="planet-options">${s.planets
      .map((p, i) => {
        const reserved = sumOwners(
            queue
              .filter((q) => q.planet === p.id && !q.replace)
              .map((q) => q.count),
          ),
          n = draft.settlements[p.id] ?? 0,
          max = Math.min(
            Math.max(0, settlementSpace(g, p) - reserved),
            pending.amount - allocated + n,
          );
        if (!max && !n) return "";
        return `<div class="planet-choice ${selectedPlanet === p.id ? "highlight" : ""}">${planetIllustration(s, i)}${numberControl("Additional Settlements", "redistribute-settlement", n, max, `data-planet="${p.id}"`)}</div>`;
      })
      .join(
        "",
      )}</div>${replacementControls(g, s, Math.max(0, pending.amount - allocated), true)}<p>${kept + allocated} / ${pending.amount} displaced rockets assigned.</p>${button("Confirm displaced allocation", "commit-redistribute", "", kept + allocated !== pending.amount, "primary")}</section>`;
  }

  function actionsView(g: Game) {
    const p = player(g);
    const live = scoreGame(g).find((s) => s.player === p.id)!;
    return `<section class="actions-view"><div class="section-heading"><span class="eyebrow">Your action board</span><h2>${escape(p.name)}’s Actions</h2><p>Four action slots. You can do each action once per round.</p></div><div class="personal-board"><div class="supply reserve"><h3>Reserve</h3>${rocket(p.style, 68)}<strong>${p.reserve}</strong><span>Uncommitted rockets</span></div><div class="action-board">${(Object.keys(ACTION_LABELS) as Action[]).map((action) => `<div class="action-slot ${p.used.includes(action) ? "used" : ""}"><div class="receiving-slot">${p.used.includes(action) ? `<svg class="poker-chip" aria-hidden="true" viewBox="-29 -29 58 60">${chipFace(p.slotOwners?.[action] ?? p.style, 0, 0, 26)}</svg>` : '<span class="empty-chip"></span>'}</div><strong>${ACTION_LABELS[action]}</strong><small>${p.investedActions.includes(action) ? `${rocket(p.style, 18).repeat(investmentAmount(g))} Invested this round` : p.blockedAction === action ? "Blocked by Politics" : p.used.includes(action) ? "Used this round" : "Available"}</small></div>`).join("")}</div><div class="supply credits"><h3>Credits</h3>${rocket(p.style, 68)}<strong>${p.credits}</strong><span>Spend on Tech</span></div></div><div class="resource-breakdown"><span><strong>${p.invested}</strong> Invested${p.freeInvestments.length ? ` (${p.freeInvestments.length} from free actions)` : ""}</span><span><strong>${g.systems.reduce((n, s) => n + s.ships[p.id], 0)}</strong> Ships</span><span><strong>${g.systems.reduce((n, s) => n + s.planets.reduce((a, planet) => a + planet.owners[p.id], 0), 0)}</strong> Settlements</span><span><strong>${p.techs.length}</strong> Tech markers</span><span><strong>40</strong> Rockets total</span></div><p class="score-preview">Current position: ${live.planets} settled planets + ${live.systems} patrolled systems + ${live.techs} Techs = <strong>${live.total} points</strong></p><p class="muted">Resolve chips on the Board. Select a stack, assign an unused slot, then act or Invest.</p>${button("Return to Board", "to-board", "", false, "secondary")}</section>`;
  }
  function purchaseButtons(g: Game, id: string) {
    if (g.phase !== "tech" || g.pending) return "";
    if (id === "tech.sabotage") {
      const targets = sabotageTargets(g),
        selectedTarget = selectedSabotageTarget(g, targets);
      const value =
        draft.sabotageValue ??
        (selectedTarget ? Number(CARD_MAP[selectedTarget.tech].cost) : 0);
      const targetReason = !selectedTarget
        ? "Choose an opponent Tech"
        : Number(CARD_MAP[selectedTarget.tech].cost) > value
          ? "Increase the Credit value"
          : null;
      const reason =
        targetReason ??
        purchaseReason(g, id, g.turn, false, value, selectedTarget);
      const cost = purchaseCost(
        g,
        id,
        g.turn,
        false,
        value,
        selectedTarget ? Number(CARD_MAP[selectedTarget.tech].cost) : 0,
      );
      return `<div class="sabotage-controls"><h4>Choose the Tech to remove</h4><div class="sabotage-targets">${targets.map((t) => button(`${escape(player(g, t.player).name)} · ${escape(CARD_MAP[t.tech].title)} (${CARD_MAP[t.tech].cost})`, "sabotage-target", `data-owner="${t.player}" data-tech="${t.tech}" aria-pressed="${t === selectedTarget}"`, false, t === selectedTarget ? "selected" : "secondary")).join("") || "<p>No legal opponent Tech is available.</p>"}</div>${selectedTarget ? `<p class="sabotage-selection">Selected: <strong>${escape(player(g, selectedTarget.player).name)} · ${escape(CARD_MAP[selectedTarget.tech].title)}</strong> (${CARD_MAP[selectedTarget.tech].cost} Credits).</p>` : ""}${numberControl("Credit value (X)", "sabotage-value", value, 40)}${button(reason ?? `Buy Sabotage for ${cost} Credits`, "buy", `data-tech="${id}"`, Boolean(reason), "primary")}</div>`;
    }
    const card = CARD_MAP[id],
      reason = purchaseReason(g, id),
      cost = purchaseCost(g, id),
      fullReason = purchaseReason(g, id, g.turn, true);
    return `${button(reason ?? `Buy for ${cost} Credits${cost !== card.cost ? " · Research Lab" : ""}`, "buy", `data-tech="${id}"`, Boolean(reason), "primary")}${cost !== card.cost ? button(fullReason ?? `Pay full price · ${card.cost} Credits`, "buy", `data-tech="${id}" data-full-price="true"`, Boolean(fullReason), "secondary") : ""}`;
  }
  function techView(g: Game) {
    const claiming = choosingVorsprung(g),
      claimOptions = claiming ? eventTechOptions(g) : [];
    return `<section><div class="section-heading"><span class="eyebrow">${escape(TECH_PRESETS[g.config.techPreset].label)} · shared Tech display</span><h2>Technology for a growing empire.</h2><p>${g.market.length} shared Techs. Multiple players can own a card; each purchase uses one Reserve rocket as its marker.</p>${claiming ? `<p>Vorsprung: select an eligible card, then commit. Double-click a card to select and commit.</p>${vorsprungCommitControls(g)}` : ""}${g.phase === "tech" && !g.pending ? button("Pass this purchase", "pass-tech", "", false, "secondary") : '<span class="small-tag">Purchases happen during Economy</span>'}</div><div class="tech-grid">${g.market
      .slice()
      .sort(
        (a, b) =>
          techValue(a) - techValue(b) ||
          CARD_MAP[a].title.localeCompare(CARD_MAP[b].title),
      )
      .map((id) => {
        const card = CARD_MAP[id],
          owners = g.players.filter((p) => p.techs.includes(id)),
          claimable = claimOptions.includes(id),
          chosen = claiming && draft.eventTech === id;
        return `<article class="tech-card ${claimable ? "vorsprung-choice" : ""} ${chosen ? "event-tech-selected" : ""}" data-tech-id="${id}" data-tech-value="${techValue(id)}" ${claimable ? `data-action="select-event-tech" data-tech="${id}"` : ""}><button class="card-art-button" data-action="${claimable ? "select-event-tech" : "card"}" data-tech="${id}" data-card="${id}" ${claimable ? `aria-pressed="${chosen}"` : ""} aria-label="${claimable ? "Select" : "Read"} ${attrs(card.title)}"><img src="${ART.cards[id].image}" width="240" height="388" loading="lazy" alt="${attrs(card.title)} original card artwork"/></button><div class="tech-body"><div class="tech-title"><h3>${escape(card.title)}</h3><span class="cost">${card.cost} <small>Credits</small></span></div><p>${escape(card.text)}</p>${id === "tech.disruptor" && g.phase === "tech" && eventIs(g, "earth-first") ? '<p class="token-used earth-first-warning">Earth First overrides Disruptor: selecting an opponent home system will have no effect.</p>' : ""}${id === "tech.disruptor" && isFinalRound(g) ? '<p class="token-used">Disruptor has no effect in the last round. It still scores 1 point.</p>' : ""}${id === "tech.sabotage" && isFinalRound(g) ? '<p class="token-used">Sabotage cannot be bought in the last round.</p>' : ""}${id === "tech.foresight" ? `<p class="token-used">Use the Status Box for the owner’s private peek.${g.config.events === "foresight-test" ? " Legacy test mode: Event effects and auctions are disabled." : ""}</p>` : ""}${featureUsed(g, id) ? `<p class="token-used">${featureUsed(g, id)} token already on the board. Buying this Tech has no token effect.</p>` : ""}<div class="ownership">${owners.length ? owners.map((p) => badge(p.style, p.name)).join("") : '<span class="muted">No owners yet</span>'}</div>${purchaseButtons(g, id)}</div></article>`;
      })
      .join("")}</div></section>`;
  }
  function eventPair(g: Game, choose = false) {
    return `<div class="event-pair">${g.revealedEvents.map((id) => `<article class="event-card"><button data-action="card" data-card="${id}" aria-label="View ${attrs(CARD_MAP[id].title)}"><img src="${ART.cards[id].image}" width="240" height="388" loading="lazy" alt="${attrs(CARD_MAP[id].title)}"/></button><h3>${escape(CARD_MAP[id].title)}</h3><p>${escape(CARD_MAP[id].text)}</p>${choose ? button(`Select ${escape(CARD_MAP[id].title)}`, "select-event", `data-event="${id}"`, false, "primary") : ""}</article>`).join("")}</div>`;
  }
  function eventSystemChoices(g: Game, systems: System[]) {
    return `<div class="feature-options">${systems
      .slice()
      .sort((a, b) => Number(b.id === selected) - Number(a.id === selected))
      .map((s) =>
        button(
          `${systemIllustration(g, s)}<span>${escape(nameOf(s))}</span>`,
          "event-system",
          `data-system-id="${s.id}" aria-pressed="${selected === s.id}"`,
          false,
          `secondary system-target ${selected === s.id ? "selected" : ""}`,
        ),
      )
      .join("")}</div>`;
  }
  function eventDecision(g: Game): string | null {
    const pending = g.pending,
      p = player(g);
    if (pending?.kind === "bid") {
      const order = g.players.map((_, i) => (g.first + i) % g.players.length);
      return `<section class="console auction-console"><div class="eyebrow">Economy · sealed auction</div><h2>${escape(p.name)}’s private bid</h2><p>Everyone bids secretly. Zero is allowed. Only the highest bidder pays; ties go to the earliest player in current player order. Winner selects the Event.</p><ul class="bid-status">${order.map((id) => `<li>${escape(player(g, id).name)}: ${g.auction!.bids[id] === null ? "waiting" : "sealed"} · ${player(g, id).credits} Credits</li>`).join("")}</ul>${privateBidder === p.id ? `${numberControl("Your bid (Credits)", "event-bid", bidAmount, p.credits)}${button("Seal bid & pass device", "seal-bid", "", false, "primary")}<p>Keep the screen private. The next player receives a covered handoff screen.</p>` : `<p>Pass the device to <strong>${escape(p.name)}</strong>. Earlier bid amounts stay hidden until everyone has submitted.</p>${button(`I am ${escape(p.name)} · enter bid`, "open-bid", "", false, "primary")}`}${eventPair(g)}</section>`;
    }
    if (pending?.kind === "eventSelect") {
      return `<section class="console"><div class="eyebrow">Economy · auction winner</div><h2>${escape(p.name)} chooses the Event</h2><p>Winning bid: ${g.auction!.paid} Credits, returned to Reserve. All bids: ${g.players.map((other) => `${escape(other.name)} ${g.auction!.bids[other.id]}`).join(" · ")}.</p>${eventPair(g, true)}</section>`;
    }
    if (pending?.kind === "scrambler") {
      return `<section class="console"><div class="eyebrow">After PLAN · Scrambler</div><h2>Flip one stack upside-down?</h2><p>Filibuster choices are complete. Select a nonempty stack or skip.</p>${eventSystemChoices(
        g,
        g.systems.filter((s) => s.tokens.length > 0),
      )}${selected ? stackOrder(g, system(g, selected)) : ""}${button("Flip selected stack", "scramble", "", !selected || !system(g, selected).tokens.length, "primary")}${button("Skip", "skip-scramble", "", false, "quiet")}</section>`;
    }
    if (pending?.kind !== "eventChoice") return null;
    const id = pending.event,
      key = id.slice(6),
      title = CARD_MAP[id].title;
    let controls = "",
      ready = true,
      skip = !["politics", "famine", "prophecy"].includes(key);
    if (key === "politics") {
      controls = `<div class="action-grid">${(Object.keys(ACTION_LABELS) as Action[]).map((a) => button(`Block ${ACTION_LABELS[a]}`, "politics", `data-kind="${a}"`, false, "secondary")).join("")}</div><p>This token stays in the blocked slot next round. You will place three tokens during PLAN.</p>`;
      ready = false;
    } else if (key === "stealth-invasion" || key === "turtling") {
      const allocations = eventAllocations(g),
        total = sumOwners(Object.values(allocations));
      controls = `<p>${total} / 3 Ships selected · ${p.reserve} Reserve available.</p><p>Select a legal system on the board to highlight it here. Double-click or double-tap confirms the current allocation.</p>${g.systems
        .filter((s) => s.revealed && (key !== "turtling" || s.id === p.home))
        .sort((a, b) => Number(b.id === selected) - Number(a.id === selected))
        .map(
          (s) =>
            `<div class="board-system-choice ${selected === s.id ? "selected" : ""}" data-choice-system="${s.id}">${numberControl(
              `Ships in ${escape(nameOf(s))}`,
              "event-ships",
              allocations[s.id] ?? 0,
              3 - total + (allocations[s.id] ?? 0),
              `data-id="${s.id}"`,
            )}</div>`,
        )
        .join("")}`;
    } else if (key === "capital-injection") {
      controls = numberControl(
        "Credits to gain",
        "event-amount",
        draft.eventAmount ?? Math.min(10, p.reserve),
        10,
      );
    } else if (key === "hive-mind") {
      controls = `<ul>${
        g.systems
          .filter((s) => s.revealed)
          .map((s) => ({
            s,
            n: s.planets.filter(
              (planet) =>
                planet.owners[p.id] > 0 &&
                planet.owners.some((n, id) => id !== p.id && n > 0),
            ).length,
          }))
          .filter(({ n }) => n > 0)
          .map(({ s, n }) => `<li>${escape(nameOf(s))}: ${n} Ships</li>`)
          .join("") || "<li>No shared planets; no Ships will be gained.</li>"
      }</ul><p>These are direct Ship rewards. PRODUCE Techs do not trigger.</p>`;
    } else if (key === "vorsprung") {
      const options = eventTechOptions(g).sort(
        (a, b) =>
          Number(CARD_MAP[b].cost) - Number(CARD_MAP[a].cost) ||
          CARD_MAP[a].title.localeCompare(CARD_MAP[b].title),
      );
      controls = `<div class="feature-options">${options.map((tech) => button(`<span>${escape(CARD_MAP[tech].title)} · value ${CARD_MAP[tech].cost}</span>`, "select-event-tech", `data-tech="${tech}" aria-pressed="${draft.eventTech === tech}"`, false, draft.eventTech === tech ? "selected" : "secondary")).join("") || "<p>No eligible Tech is available. You need a Reserve rocket for its ownership marker.</p>"}</div>${vorsprungCommitControls(g)}<p>This free claim does not use your ordinary Tech purchase. You can also select a card in the Techs view; double-click a card there to select and commit.</p>${button("View Techs", "to-techs", "", false, "secondary")}`;
      ready = false;
    } else if (key === "multicultural-tension") {
      const home = system(g, player(g, (p.id + 1) % g.players.length).home!),
        planet = home.planets.find((p) => p.home)!;
      controls = `<p>${escape(nameOf(home))} · ${escape(player(g, (p.id + 1) % g.players.length).name)}’s home planet</p>${planetIllustration(home, home.planets.indexOf(planet))}<p>${settlementSpace(g, planet)} spaces available for your Settlement.</p>`;
    } else if (key === "famine") {
      const home = system(g, p.home!),
        needed = Math.ceil(
          sumOwners(home.planets.map((planet) => planet.owners[p.id])) / 2,
        ),
        total = sumOwners(Object.values(draft.allocation));
      controls = `<p>Return exactly ${needed} of your home-system Settlements to Reserve (${total} selected).</p><div class="planet-options">${home.planets
        .filter((planet) => planet.owners[p.id] > 0)
        .map(
          (planet) =>
            `<div class="planet-choice ${selectedPlanet === planet.id ? "highlight" : ""}">${planetIllustration(home, home.planets.indexOf(planet))}${numberControl("Settlements to return", "event-famine", draft.allocation[planet.id] ?? 0, Math.min(planet.owners[p.id], needed - total + (draft.allocation[planet.id] ?? 0)), `data-id="${planet.id}"`)}</div>`,
        )
        .join("")}</div>`;
      ready = total === needed;
    } else if (key === "alliance") {
      controls = `<div class="recipient-options">${g.players
        .filter((other) => other.id !== p.id)
        .map((other) =>
          button(
            `${rocket(other.style)} ${escape(other.name)}`,
            "event-ally",
            `data-recipient="${other.id}"`,
            false,
            "secondary",
          ),
        )
        .join("")}</div>`;
      ready = false;
    } else if (key === "prophecy") {
      const chosen = draft.eventPlanets ?? [],
        options = prophecyOptions(g),
        systems = chosen.map(
          (id) => options.find((o) => o.planet === id)?.system,
        );
      controls = `<p>${chosen.length} / ${Math.min(3, g.exploreBag.length)} new tokens selected. Existing board tokens will also turn face-up.</p><div class="feature-options">${options
        .map((o) => {
          const target = system(g, o.system);
          return button(
            `${planetIllustration(
              target,
              target.planets.findIndex((p) => p.id === o.planet),
            )}<span>${escape(nameOf(target))}</span>`,
            "prophecy-planet",
            `data-planet="${o.planet}" aria-pressed="${chosen.includes(o.planet)}"`,
            !chosen.includes(o.planet) &&
              (chosen.length >= Math.min(3, g.exploreBag.length) ||
                systems.includes(o.system)),
            `secondary planet-target ${chosen.includes(o.planet) ? "selected" : ""}`,
          );
        })
        .join("")}</div>`;
    } else {
      const choices = g.systems.filter((s) =>
        key === "galactic-summit"
          ? !s.planets.some((p) => p.home)
          : key === "migration"
            ? s.revealed
            : true,
      );
      controls = eventSystemChoices(g, choices);
      ready = choices.some((s) => s.id === selected);
      if (key === "migration" && ready) {
        const target = system(g, selected!),
          values =
            draft.eventSettlements ??
            Object.fromEntries(
              target.planets.map((p) => [p.id, p.owners.slice()]),
            );
        const originalTotals = g.players.map((owner) =>
          sumOwners(target.planets.map((planet) => planet.owners[owner.id])),
        );
        controls += `<div class="migration-totals"><h3>Settlements before Migration</h3><ul>${g.players.map((owner) => `<li data-owner="${owner.id}">${badge(owner.style, owner.name)}<span>${originalTotals[owner.id]} originally · ${sumOwners(Object.values(values).map((owners) => owners[owner.id]))} currently assigned</span></li>`).join("")}</ul></div><p>Preserve each player's total Settlements in this system. Reduce one planet before adding elsewhere. Relocation does not trigger SETTLE Techs or Explore tokens.</p><div class="migration-grid">${target.planets
          .filter((p) => !p.blocked)
          .map(
            (planet) =>
              `<div class="planet-choice ${selectedPlanet === planet.id ? "highlight" : ""}">${planetIllustration(target, target.planets.indexOf(planet))}<div>${g.players
                .filter((other) =>
                  target.planets.some((p) => p.owners[other.id] > 0),
                )
                .map((other) =>
                  numberControl(
                    `${rocket(other.style)} ${escape(other.name)}`,
                    "event-migration",
                    values[planet.id][other.id],
                    target.planets.reduce((n, p) => n + p.owners[other.id], 0),
                    `data-id="${other.id}" data-planet="${planet.id}"`,
                  ),
                )
                .join("")}</div></div>`,
          )
          .join("")}</div>`;
      }
    }
    return `<section class="console event-choice"><div class="eyebrow">Event effect · ${escape(p.name)}</div><h2>${escape(title)}</h2><p>${escape(CARD_MAP[id].text)}</p>${controls}<div class="commit-row">${!["politics", "vorsprung", "alliance"].includes(key) ? button(key === "prophecy" ? "Place tokens & reveal all" : "Apply Event effect", "commit-event-effect", "", !ready, "primary") : ""}${skip ? button("Skip optional effect", "skip-event-effect", "", false, "quiet") : ""}</div></section>`;
  }
  function commitEventEffect() {
    if (!game || game.pending?.kind !== "eventChoice") return;
    perform({
      type: "eventChoice",
      system: selected ?? undefined,
      ships: eventAllocations(game),
      amount: draft.eventAmount ?? Math.min(10, player(game).reserve),
      planets: draft.eventPlanets ?? [],
      settlements: draft.eventSettlements,
    });
  }

  function eventView(g: Game) {
    const full = g.config.events === "full";
    const batch =
      g.config.eventBatch && g.config.eventBatch !== "standard"
        ? EVENT_BATCHES[g.config.eventBatch]
        : null;
    return `<section class="event-view"><div class="section-heading"><span class="eyebrow">${full ? "Events & sealed bidding" : "Simpler Events · round tracker"}${batch ? ` · ${batch.label}` : ""}</span><h2>${g.activeEvent ? escape(CARD_MAP[g.activeEvent.id].title) : "The galaxy keeps time."}</h2><p>${g.activeEvent ? `${escape(CARD_MAP[g.activeEvent.id].text)} Selected by ${escape(player(g, g.activeEvent.owner).name)}. Discard at the next Economy's Event step, after Investments.` : full ? "Draw two Events during Economy. Everyone bids secretly; only the winner pays and chooses the active Event. Ties follow player order, starting with first player." : "Event text and bidding are disabled in this variant."}</p></div>${g.activeEvent ? `<button class="active-event-art" data-action="card" data-card="${g.activeEvent.id}"><img src="${ART.cards[g.activeEvent.id].image}" width="240" height="388" loading="lazy" alt="${attrs(CARD_MAP[g.activeEvent.id].title)}"/></button>` : ""}<div class="event-status"><strong>${g.events.length}</strong><span>cards remain in the draw pile (${g.initialEventCards} initially)</span><strong>${g.roundLimit}</strong><span>rounds in this game</span></div>${g.revealedEvents.length ? `<h3>Latest pair</h3>${eventPair(g)}` : "<p>No pair has been drawn yet, or final Tech purchases are in progress.</p>"}${
      g.eventSelections.length
        ? `<h3>Selected & discarded Events</h3><ol class="event-selection-history">${g.eventSelections
            .map(
              (entry) =>
                `<li>Round ${entry.round} · ${escape(player(g, entry.owner).name)} selected <strong>${escape(CARD_MAP[entry.selected].title)}</strong>; discarded ${entry.candidates
                  .filter((id) => id !== entry.selected)
                  .map((id) => escape(CARD_MAP[id].title))
                  .join(
                    ", ",
                  )}. Bids: ${entry.bids.map((bid, id) => `${escape(player(g, id).name)} ${bid}`).join(" · ")}.</li>`,
            )
            .join("")}</ol>`
        : ""
    }${batch ? `<details><summary>Test batch · all ten cards</summary><ul>${batch.cards.map((id) => `<li>${escape(CARD_MAP[`event.${id}`].title)}${g.eventSelections.some((e) => e.selected === `event.${id}`) ? " · selected this game" : ""}</li>`).join("")}</ul><p>Replay the same map code and batch to choose discarded alternatives. With 4–7 players, eight of the ten pool cards are drawn: change the map code to test omitted cards as well. Ragnarök may shorten the game.</p></details>` : ""}<p class="muted">Drawing the last pair does not immediately end the game. A later Economy with no pair ends after Tech purchases, without Reinforcements.</p></section>`;
  }
  function aidView() {
    return `<section class="aid-view"><div class="section-heading"><h2>Player aid</h2></div><div class="aid-faces"><article><h3>Actions</h3><img src="${ART.aids.actions.image}" width="530" height="810" loading="lazy" alt="Player aid Actions face"/><dl><dt>Move into</dt><dd>Bring Ships from adjacent systems. Warps connect; asteroid belts block unless you have Agility. Each destination black hole destroys one incoming Ship, returned as a Credit.</dd><dt>Settle</dt><dd>Convert Ships into Settlements within capacity; resolve Explore tokens first.</dd><dt>Produce</dt><dd>One Ship or Credit per planet you settle, plus one for each such planet that is full.</dd><dt>Attack</dt><dd>Each sacrificed Ship destroys up to two opposing Ships or one Settlement. All casualties become Credits. You cannot attack Settlements on a planet you share.</dd></dl></article><article><h3>Play sequence & scoring</h3><img src="${ART.aids.sequence.image}" width="530" height="810" loading="lazy" alt="Player aid play sequence and scoring face"/><dl><dt>Plan</dt><dd>Place all four chips in player order.</dd><dt>Actions</dt><dd>Resolve top chips into unused slots, acting or Investing. Turns without an eligible top chip are skipped.</dd><dt>Economy</dt><dd>Cash Investments, draw Events and bid to select one, buy one Tech, reinforce, and pass first player. Simpler Events skip bidding and card effects.</dd><dt>Score</dt><dd>One point per settled planet, system with your Ships, and owned Tech. Credits break ties; remaining ties share victory.</dd></dl></article></div></section>`;
  }
  function finalScores(g: Game) {
    return `<section id="expedition-results" class="final-scores" tabindex="-1" aria-label="Expedition results"><div class="eyebrow">Expedition complete</div><h1>${g.winners.map((id) => escape(player(g, id).name)).join(" & ")}<br/><span>${g.winners.length > 1 ? "share the galaxy." : "rules the galaxy."}</span></h1><p>Credits break points ties. A remaining tie is a shared victory.</p><div class="score-table-wrap"><table><thead><tr><th>Players</th><th>Planets Settled</th><th>Systems Patrolled</th><th>Techs Owned</th><th>Total Score</th><th>Credits</th></tr></thead><tbody>${g.scores
      .slice()
      .sort((a, b) => b.total - a.total || b.credits - a.credits)
      .map(
        (s) =>
          `<tr class="${g.winners.includes(s.player) ? "winner" : ""}"><th>${badge(s.player, player(g, s.player).name)}</th><td>${s.planets}</td><td>${s.systems}</td><td>${s.techs}</td><td><strong>${s.total}</strong></td><td>${s.credits}</td></tr>`,
      )
      .join(
        "",
      )}</tbody></table></div><div class="commit-row">${button("Export game record", "export", "", false, "secondary")}${button("New expedition", "new-game", "", false, "primary")}</div></section>`;
  }
  function overlay() {
    if (confirmation)
      return `<div class="modal-scrim"><section class="modal" role="dialog" aria-modal="true" aria-label="${confirmation.reserveAccepted ? escape(confirmation.title) : "Confirm decision"}"><h2>${escape(confirmation.title)}</h2>${confirmation.reserveAccepted ? "<p>This is the expected outcome if you commit:</p>" : ""}${confirmation.messages.map((m) => `<p>${escape(m)}</p>`).join("")}<p>Is this what you intended?</p><div class="commit-row">${button("Go back", "cancel-confirmation", "", false, "secondary")}${button("Confirm and commit", "confirm-command", "", false, "primary")}</div></section></div>`;
    if (game?.pending?.kind === "reserve" && reserveWarningOpen)
      return reserveRecoveryModal(game, game.pending);
    const reserve = game ? reserveNotice(game) : null;
    if (reserve)
      return `<div class="modal-scrim"><section class="modal reserve-notice" role="dialog" aria-modal="true" aria-label="${escape(reserve.title)}"><h2>${escape(reserve.title)}</h2>${reserve.messages.map((m) => `<p>${escape(m)}</p>`).join("")}<p>Confirm this committed outcome to continue. Committed moves and hidden reveals cannot be undone.</p>${button("Confirm outcome", "acknowledge", "", false, "primary")}</section></div>`;

    if (activeCard) {
      const card = CARD_MAP[activeCard];
      return `<div class="modal-scrim"><section class="modal card-modal" role="dialog" aria-modal="true" aria-label="${attrs(card.title)}">${button("Close ×", "close-overlay", "", false, "quiet close")}<img src="${ART.cards[activeCard].image}" width="240" height="388" alt="${attrs(card.title)}"/><div><span class="eyebrow">${card.type === "tech" ? `${card.cost} Credits` : "Event reference"}</span><h2>${escape(card.title)}</h2><p>${escape(card.text)}</p>${activeCard === "tech.disruptor" && game && isFinalRound(game) ? '<p class="token-used">Disruptor has no effect in the last round. It still scores 1 point.</p>' : ""}${card.type === "event" && game?.config.events !== "full" ? '<p class="scope-note">Event effects are disabled in this variant.</p>' : ""}</div></section></div>`;
    }
    if (!showHelp) return "";
    return `<div class="modal-scrim"><section class="modal" role="dialog" aria-modal="true" aria-label="Rules and prototype scope">${button("Close ×", "close-overlay", "", false, "quiet close")}<span class="eyebrow">Space Force · Charlie Fish</span><h2>One galaxy. Plenty of possibilities.</h2><p>This is a local pass-and-play prototype for two to seven people sharing one device. It implements normal turns, all thirty Techs, and all thirty Events with sealed bidding. Choose a standard random Event deck or one of three ten-card test batches. Simpler Events remain available. Choose a printed preset, either new-Tech display, a mix or Random at setup. The labelled Foresight test keeps that card for private-peek testing while Event effects/auctions remain disabled; normal simpler Events exclude it. Full Events include Foresight normally. The optional R01 scenario starts each player with the five chain Techs and their five Reserve markers. There are no remote rooms, simultaneous turns, newsletter forms, or private admin service in this build.</p><p>Use Board, Techs, Event, Actions and Supply, and Player Aid. The aid shows both faces together. Select chips in PLAN; later resolve top chips into each of four action slots, or Invest. Complete Economy between rounds.</p><h3>Undo and secrets</h3><p>Reset drafts before Commit. A committed move or hidden reveal cannot be undone. This trusted-device prototype stores the full game locally; authoritative remote privacy will be added with the server.</p><h3>Keyboard</h3><p>S Status Box (scroll to top) · B Board · T Techs · E Event · A Actions and Supply · P Player aid. View shortcuts scroll to the chosen view. With the map focused: R resets the view, +/− zoom, arrows pan. Escape closes details; ? opens Help. Shortcuts ignore editable fields and browser modifiers.</p><label class="check-row"><input type="checkbox" data-check="shortcuts" ${shortcuts ? "checked" : ""}/>Enable character shortcuts while the game has focus</label><div class="commit-row">${button(guide ? "Restart contextual guide" : "Show contextual guide", "guide-on", "", false, "secondary")}${game ? button("Export local game", "export", "", false, "quiet") : ""}</div><p class="muted">Public/private rooms, simultaneous mode, server-owned idle votes, and private administration remain later milestones. The designer has approved the current rocket art; it remains replaceable.</p></section></div>`;
  }
  function economyTracker(g: Game) {
    if (
      !["investments", "event", "tech", "reinforce", "pass"].includes(g.phase)
    )
      return "";
    const token = ART.firstPlayer,
      active = token.stages.find((s) => s.id === g.phase)!;
    return `<div class="economy-tracker"><span class="eyebrow">Economy · first player: ${escape(player(g, g.first).name)}</span><svg class="first-player-token" role="img" aria-label="First-player token: ${attrs(active.label)}" viewBox="0 0 ${token.width} ${token.height}"><image href="${token.image}" width="${token.width}" height="${token.height}"/><rect class="economy-highlight" x="${active.region.x * token.width}" y="${active.region.y * token.height}" width="${active.region.width * token.width}" height="${active.region.height * token.height}" rx="12"/></svg><ol class="economy-stages">${token.stages.map((stage, i) => `<li class="${stage.id === g.phase ? "active" : ""}" ${stage.id === g.phase ? 'aria-current="step"' : ""}>${i + 1}. ${escape(stage.label)}</li>`).join("")}</ol></div>`;
  }
  function statusBox(g: Game) {
    const p = player(g),
      scores = scoreGame(g),
      history = sinceLastDecision(g),
      orderedPlayers = [
        ...g.players.slice(g.first),
        ...g.players.slice(0, g.first),
      ];
    return `<section id="status-box" class="status-box" tabindex="-1" aria-label="Status Box"><div class="status-overview"><h2 class="status-title"><button data-action="to-status">Status Box<span class="shortcut-hint"> (S)</span></button></h2><div class="eyebrow status-phase">${phaseLabel(g)}</div><div class="turn-bar" tabindex="-1" aria-live="polite">${badge(p.style, p.name)}<span class="turn-instruction">${escape(instruction(g))}</span></div>${foresightControl(g)}<div class="status-supply resource-pills"><span><small>Reserve</small><strong>${p.reserve}</strong></span><span><small>Credits</small><strong>${p.credits}</strong></span></div>${flexibleControl(g)}<details class="player-roster" ${rosterOpen ? "open" : ""}><summary>Players & supply</summary><ul>${orderedPlayers.map((other) => `<li data-player="${other.id}">${badge(other.style, other.name)}<span>${other.reserve} Reserve</span><span>${other.credits} Credits</span><span>${other.techs.length} Techs</span><strong>${scores.find((s) => s.player === other.id)!.total} points${g.phase === "finished" ? "" : " currently"}</strong><span>${other.used.length}/4 slots used · ${other.investedActions.length} Invested${other.freeInvestments.length ? ` (+${other.freeInvestments.length} from free actions)` : ""}</span></li>`).join("")}</ul></details>${activeEventSummary(g)}${g.players.length >= 4 && g.initialEventCards === 10 ? '<p class="legacy-event-setup">Saved ten-card test game: its original deck and six-round schedule are preserved. Start a new game for the eight-card setup.</p>' : ""}${economyTracker(g)}</div><div class="status-decision">${error ? `<div class="error" role="alert">${escape(error)}</div>` : ""}<details class="since-last-turn"><summary>Since your last turn</summary>${history.length ? `<ol>${history.map((l) => `<li data-log-revision="${l.revision}"><span>Round ${l.round}</span> ${l.player === null ? "" : `<strong>${escape(player(g, l.player).name)}:</strong> `}${escape(l.text)}</li>`).join("")}</ol>` : "<p>No actions have happened since your previous decision.</p>"}</details>${inspector(g)}${g.phase === "plan" && hasTech(g, g.turn, "strategic-stall") ? `<div class="stall-choice">${button("Pass once · Strategic Stall", "plan-pass", "", player(g).stalledRound === g.round, "secondary")}</div>` : ""}</div></section>`;
  }

  function render() {
    const focused = root.ownerDocument.activeElement as HTMLElement | null;
    const focusKey = focused?.getAttribute("data-number"),
      focusId = focused?.getAttribute("data-id"),
      focusData = focused?.dataset;
    const scrolls = [
      ...root.querySelectorAll<HTMLElement>("[data-preserve-scroll]"),
    ].map((el) => ({
      key: el.dataset.preserveScroll!,
      top: el.scrollTop,
      left: el.scrollLeft,
    }));
    const roster = root.querySelector<HTMLDetailsElement>(".player-roster");
    if (resetRoster) {
      rosterOpen = false;
      resetRoster = false;
    } else if (roster) rosterOpen = roster.open;
    if (!game) root.innerHTML = landing() + overlay();
    else {
      const g = game,
        p = player(g);
      const panel =
        view === "board"
          ? `<div class="board-layout">${systemMap(g)}</div>`
          : view === "techs"
            ? techView(g)
            : view === "event"
              ? eventView(g)
              : view === "actions"
                ? actionsView(g)
                : aidView();
      const shortcuts: Record<View, string> = {
        board: "B",
        techs: "T",
        event: "E",
        actions: "A",
        player_aid: "P",
      };
      root.innerHTML = `<div class="game-shell">${sharedArt(g)}<header class="game-header"><button class="wordmark" data-action="help" aria-label="Space Force help"><span>SPACE</span><span>FORCE</span></button><div class="round-status"><span class="eyebrow">Local ${TECH_PRESETS[g.config.techPreset].label} game · ${g.config.events === "full" ? "full Events & bidding" : g.config.events === "foresight-test" ? "Tech playtest Events" : "simpler Events"}${g.config.scenario === "five-tech-chain" ? " · R01 scenario" : ""}</span><strong>Round ${g.round} / ${g.roundLimit}</strong><span>${phaseLabel(g)}</span></div><div class="header-player">${badge(p.style, p.name)}<div class="resource-pills"><span><small>Reserve</small><strong>${p.reserve}</strong></span><span><small>Credits</small><strong>${p.credits}</strong></span></div></div><div class="header-tools">${button("?", "help", 'aria-label="Open Help"')}${button("New", "new-game", "", false, "quiet")}</div></header>${statusBox(g)}${g.phase === "finished" ? finalScores(g) : tutorial(g)}<nav class="view-tabs" aria-label="Game views" role="tablist">${(Object.keys(VIEW_LABELS) as View[]).map((v) => `<button id="tab-${v}" role="tab" aria-selected="${view === v}" aria-controls="game-panel" data-view="${v}" class="${view === v ? "active" : ""}"><span aria-hidden="true">${{ board: "⬡", techs: "✧", event: "◷", actions: "↗", player_aid: "▤" }[v]}</span>${VIEW_LABELS[v]}<span class="shortcut-hint"> (${shortcuts[v]})</span></button>`).join("")}</nav><main id="game-panel" class="main-panel" role="tabpanel" aria-labelledby="tab-${view}" tabindex="-1">${panel}</main><footer class="game-footer"><span>${autosave ? "Autosaved on this device" : "Session only · local storage unavailable"}</span><span>Normal turns · ${g.players.length} players · revision ${g.revision}</span>${button("Game record ↓", "export", "", false, "text-link")}<details class="history"><summary>Recent game history</summary><ol>${g.log
        .slice(-30)
        .reverse()
        .map(
          (entry) =>
            `<li><span>R${entry.round}</span> ${entry.player === null ? "" : `<strong>${escape(player(g, entry.player).name)}</strong> `}${escape(entry.text)}</li>`,
        )
        .join("")}</ol></details></footer></div>${overlay()}`;
    }
    if (focusKey)
      [...root.querySelectorAll<HTMLInputElement>("[data-number]")]
        .find(
          (el) =>
            el.dataset.number === focusKey &&
            (el.dataset.id ?? null) === focusId &&
            el.dataset.planet === focused?.dataset.planet &&
            el.dataset.origin === focused?.dataset.origin,
        )
        ?.focus({ preventScroll: true });
    else if (focusData?.check)
      [...root.querySelectorAll<HTMLInputElement>("[data-check]")]
        .find((el) => el.dataset.check === focusData.check)
        ?.focus({ preventScroll: true });
    else if (focusData?.action)
      [...root.querySelectorAll<HTMLElement>("[data-action]")]
        .find((el) =>
          [
            "action",
            "kind",
            "card",
            "tech",
            "planet",
            "recipient",
            "edge",
            "delta",
          ].every((key) => el.dataset[key] === focusData[key]),
        )
        ?.focus({ preventScroll: true });
    else if (focusData?.system)
      [...root.querySelectorAll<SVGElement>('[data-system][role="button"]')]
        .find(
          (el) =>
            el.dataset.system === focusData.system &&
            el.dataset.edge === focusData.edge,
        )
        ?.focus?.({ preventScroll: true });
    if (scrollView === view) {
      const el = root.querySelector(".main-panel");
      if (el) el.scrollTop = previousScroll;
    }
    scrollView = null;
    for (const saved of scrolls) {
      const el = [
        ...root.querySelectorAll<HTMLElement>("[data-preserve-scroll]"),
      ].find((el) => el.dataset.preserveScroll === saved.key);
      if (el) {
        el.scrollTop = saved.top;
        el.scrollLeft = saved.left;
      }
    }
    const options = root.querySelector<HTMLElement>(".feature-options");
    if (options) options.scrollLeft = 0;
    updateTypography();
    if (game?.phase === "finished" && displayedFinishedGame !== game) {
      displayedFinishedGame = game;
      const results = root.querySelector<HTMLElement>("#expedition-results");
      if (results) {
        results.style.scrollMarginTop = `${(root.querySelector(".game-header")?.getBoundingClientRect().height ?? 80) + 8}px`;
        results.scrollIntoView?.({ block: "start", behavior: "auto" });
        results.focus({ preventScroll: true });
      }
    } else if (game?.phase !== "finished") displayedFinishedGame = null;
    const modal = root.querySelector<HTMLElement>(".modal");
    if (modal && !modal.contains(root.ownerDocument.activeElement))
      modal
        .querySelector<HTMLElement>("button:not(:disabled)")
        ?.focus({ preventScroll: true });
  }

  function exportGame() {
    if (!game) return;
    if (game.pending?.kind === "bid") {
      error =
        "Game export is available after all sealed bids have been revealed.";
      render();
      return;
    }
    const blob = new Blob(
      [
        JSON.stringify(
          {
            application: "Space Force local prototype 0.22.0",
            exportedAt: new Date().toISOString(),
            game,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = root.ownerDocument.createElement("a");
    a.href = url;
    a.download = `space-force-${game.seed}-r${game.round}.json`;
    root.ownerDocument.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function zoomBy(amount: number) {
    zoom = Math.max(0.6, Math.min(4, zoom * amount));
    updateCamera();
  }
  function techValue(id: string) {
    const cost = CARD_MAP[id]?.cost;
    return typeof cost === "number" ? cost : Number.MAX_SAFE_INTEGER;
  }
  function featureUsed(g: Game, id: string) {
    const mapping: Record<string, [keyof Game["features"], string]> = {
      "tech.artificial-warp": ["warp", "Warp"],
      "tech.planet-nine": ["planet", "Planet Nine"],
      "tech.kessler-syndrome": ["asteroid", "Asteroid belt"],
      "tech.planet-killer": ["blackHole", "Black hole"],
    };
    const item = mapping[id];
    return item && g.features[item[0]] ? item[1] : null;
  }
  function decisionView() {
    if (!game) return;
    setView(
      game.pending
        ? "board"
        : game.phase === "tech"
          ? "techs"
          : game.phase === "investments"
            ? "board"
            : "board",
    );
  }
  function rotateOrientation(delta: number) {
    if (game?.pending?.kind !== "orient") return;
    orientation = (orientation + delta + 6) % 6;
    selected = game.pending.system;
    selectedPlanet = null;
    selectedEdge = null;
    error = "";
    render();
  }
  function readBoardTarget(target: Element): BoardTarget | null {
    const tile = target.closest<SVGElement>("[data-system]");
    if (!tile) return null;
    const edge = target.closest<SVGElement>("[data-edge]")?.dataset.edge;
    const token = target.closest<SVGElement>("[data-stack-position]")?.dataset
      .stackPosition;
    return {
      system: tile.dataset.system!,
      planet: target.closest<SVGElement>("[data-planet]")?.dataset.planet,
      ...(edge === undefined ? {} : { edge: Number(edge) }),
      ...(token === undefined ? {} : { tokenIndex: Number(token) }),
    };
  }
  function boardConfirmation(
    g: Game,
    target: BoardTarget,
  ): { action: string; key: string; system?: string } | null {
    const pending = g.pending,
      s = system(g, target.system);
    const choice = (
      action: string,
      key = target.system,
      systemId?: string,
    ) => ({
      action,
      key: `${g.phase}:${pending?.kind ?? ""}:${pending?.kind === "eventChoice" ? pending.event : ""}:${key}`,
      system: systemId,
    });
    if (!pending && g.phase === "homes")
      return s.revealed &&
        s.planets.some((p) => p.home) &&
        !g.players.some((p) => p.home === s.id)
        ? choice("choose-home")
        : null;
    if (!pending && g.phase === "plan")
      return canPlan(g, s) ? choice("place-chip") : null;
    if (
      pending?.kind === "feature" ||
      pending?.kind === "genesis" ||
      pending?.kind === "rapid"
    ) {
      const tech =
        pending.kind === "genesis"
          ? "tech.genesis"
          : pending.kind === "rapid"
            ? "tech.rapid-advance"
            : pending.tech;
      const option = featureOptions(g, tech).find(
        (o) =>
          o.system === s.id &&
          (!o.planet || o.planet === target.planet) &&
          (o.edge === undefined || o.edge === target.edge),
      );
      return option
        ? choice(
            pending.kind === "rapid" ? "commit-rapid" : "commit-feature",
            `${s.id}:${option.planet ?? ""}:${option.edge ?? ""}`,
          )
        : null;
    }
    if (pending?.kind === "eventChoice") {
      const event = pending.event;
      if (event === "event.prophecy") {
        const options = prophecyOptions(g),
          chosen = draft.eventPlanets ?? [];
        const option = options.find(
          (o) => o.system === s.id && o.planet === target.planet,
        );
        const legal =
          option &&
          (chosen.includes(option.planet) ||
            (chosen.length < Math.min(3, g.exploreBag.length) &&
              !chosen.some(
                (id) => options.find((o) => o.planet === id)?.system === s.id,
              )));
        return legal ? choice("commit-event-effect", target.planet!) : null;
      }
      if (event === "event.stealth-invasion")
        return s.revealed ? choice("commit-event-effect") : null;
      if (event === "event.turtling")
        return s.id === player(g).home ? choice("commit-event-effect") : null;
      if (event === "event.famine")
        return s.id === player(g).home &&
          s.planets.some((p) => p.id === target.planet && p.owners[g.turn] > 0)
          ? choice("commit-event-effect", target.planet!)
          : null;
      if (["event.all-your-base", "event.consolidation"].includes(event))
        return choice("commit-event-effect");
      if (event === "event.migration")
        return s.revealed ? choice("commit-event-effect") : null;
      if (event === "event.galactic-summit")
        return !s.planets.some((p) => p.home)
          ? choice("commit-event-effect")
          : null;
    }
    if (pending?.kind === "scrambler")
      return s.tokens.length ? choice("scramble") : null;
    if (pending?.kind === "filibuster")
      return s.tokens.includes(g.turn)
        ? choice("commit-filibuster", `${s.id}:${draft.tokenIndex ?? ""}`)
        : null;
    if (pending?.kind === "insurance")
      return availableSystems(g).some((s) => s.id === target.system)
        ? choice("insurance-ship", s.id, s.id)
        : null;
    if (pending?.kind === "reserve" && pending.effect.kind === "reinforce")
      return availableSystems(g, pending.owner).some(
        (s) => s.id === target.system,
      )
        ? choice("complete-reserve")
        : null;
    if (!pending && ["investments", "reinforce"].includes(g.phase))
      return availableSystems(g).some((s) => s.id === target.system)
        ? choice("allocate")
        : null;
    if (pending?.kind === "action" && pending.system === s.id)
      return choice("commit-effect", `${s.id}:${target.planet ?? ""}`);
    if (
      pending?.kind === "settle" &&
      pending.system === s.id &&
      target.planet &&
      !s.planets.find((p) => p.id === target.planet)?.blocked
    )
      return choice("commit-settlements", target.planet);
    if (
      pending?.kind === "redistribute" &&
      pending.system === s.id &&
      target.planet &&
      !s.planets.find((p) => p.id === target.planet)?.blocked
    )
      return choice("commit-redistribute", target.planet);
    if (pending?.kind === "move" && pending.system === s.id)
      return choice("finish-move");
    if (
      !pending &&
      g.phase === "actions" &&
      draft.action &&
      s.id === selected &&
      eligibleTokens(g).some((o) => o.id === s.id)
    )
      return choice(
        "commit-action",
        `${s.id}:${draft.action}:${target.planet ?? ""}`,
      );
    return null;
  }
  function selectBoardLocation(hit: BoardTarget, gesture?: BoardGesture) {
    if (!game) return;
    placementTap = null;
    const previousSystem = selected;
    if (game.pending?.kind === "orient" && game.pending.system === hit.system) {
      rotateOrientation(1);
      return;
    }
    if (
      previousSystem !== hit.system &&
      !game.pending &&
      game.phase === "actions"
    )
      draft = freshDraft();
    if (game.pending?.kind === "eventChoice" && previousSystem !== hit.system)
      draft.eventSettlements = undefined;
    if (game.pending?.kind === "filibuster") {
      const tokens = system(game, hit.system).tokens;
      draft.tokenIndex =
        hit.tokenIndex !== undefined && tokens[hit.tokenIndex] === game.turn
          ? hit.tokenIndex
          : previousSystem === hit.system &&
              draft.tokenIndex !== undefined &&
              tokens[draft.tokenIndex] === game.turn
            ? draft.tokenIndex
            : tokens.lastIndexOf(game.turn) >= 0
              ? tokens.lastIndexOf(game.turn)
              : undefined;
    }
    selected = hit.system;
    selectedPlanet = hit.planet ?? null;
    selectedEdge = hit.edge ?? null;
    error = "";
    const confirmation = boardConfirmation(game, hit),
      previous = choiceTap,
      time = Date.now();
    const sameTap = Boolean(
      confirmation &&
      gesture &&
      previous &&
      previous.key === confirmation.key &&
      previous.actor === game.turn &&
      previous.revision === game.revision &&
      previous.source === gesture.source &&
      time >= previous.time &&
      time - previous.time <= 450 &&
      Math.hypot(gesture.x - previous.x, gesture.y - previous.y) <= 24,
    );
    const confirm = Boolean(gesture?.confirm || (gesture?.track && sameTap));
    if (confirmation && game.pending?.kind === "eventChoice") {
      if (
        game.pending.event === "event.prophecy" &&
        hit.planet &&
        !(draft.eventPlanets ?? []).includes(hit.planet)
      )
        draft.eventPlanets = [...(draft.eventPlanets ?? []), hit.planet];
      if (
        game.pending.event === "event.stealth-invasion" &&
        (!Object.keys(draft.allocation).length || draft.autoStealth)
      ) {
        draft.allocation = { [hit.system]: Math.min(3, player(game).reserve) };
        draft.autoStealth = true;
      }
    }
    if (
      confirmation &&
      !game.pending &&
      ["investments", "reinforce"].includes(game.phase) &&
      !confirm
    )
      adjustAllocation(
        game,
        hit.system,
        (draft.allocation[hit.system] ?? 0) + 1,
      );
    if (
      confirmation &&
      game.pending?.kind === "reserve" &&
      game.pending.effect.kind === "reinforce" &&
      !draft.recoveryShips
    )
      draft.recoveryShips = {
        [hit.system]: Math.min(
          player(game, game.pending.owner).reserve,
          game.pending.remaining,
        ),
      };
    choiceTap =
      confirmation && gesture?.track && !confirm
        ? {
            key: confirmation.key,
            actor: game.turn,
            revision: game.revision,
            source: gesture.source,
            time,
            x: gesture.x,
            y: gesture.y,
          }
        : null;
    render();
    if (confirm && confirmation) {
      const controls = [
        ...root.querySelectorAll<HTMLButtonElement>(
          `#status-box button[data-action="${confirmation.action}"]`,
        ),
      ];
      const control = controls.find(
        (el) =>
          !el.disabled &&
          (!confirmation.system || el.dataset.systemId === confirmation.system),
      );
      if (control) {
        choiceTap = null;
        suppressClickUntil = time + 350;
        control.click();
      }
    }
  }
  function selectLocation(target: Element, gesture?: BoardGesture) {
    const hit = readBoardTarget(target);
    if (hit) selectBoardLocation(hit, gesture);
  }

  function selectPlacementSystem(
    id: string,
    source: string,
    x: number,
    y: number,
  ) {
    if (!game || !["homes", "plan"].includes(game.phase) || game.pending) {
      placementTap = null;
      return;
    }
    const candidate = system(game, id);
    const legal =
      game.phase === "homes"
        ? candidate.revealed &&
          candidate.planets.some((p) => p.home) &&
          !game.players.some((p) => p.home === id)
        : canPlan(game, candidate);
    if (!legal) {
      placementTap = null;
      selected = id;
      selectedPlanet = null;
      selectedEdge = null;
      error = "";
      render();
      return;
    }
    const time = Date.now(),
      previous = placementTap;
    if (
      previous &&
      previous.system === id &&
      previous.phase === game.phase &&
      previous.actor === game.turn &&
      previous.revision === game.revision &&
      previous.source === source &&
      time >= previous.time &&
      time - previous.time <= 450 &&
      Math.hypot(x - previous.x, y - previous.y) <= 24
    ) {
      perform({ type: game.phase === "homes" ? "home" : "plan", system: id });
      suppressClickUntil = time + 350;
      return;
    }
    placementTap = {
      system: id,
      phase: game.phase as "homes" | "plan",
      actor: game.turn,
      revision: game.revision,
      time,
      source,
      x,
      y,
    };
    selected = id;
    selectedPlanet = null;
    selectedEdge = null;
    error = "";
    render();
  }
  function scrollToSystemStatus() {
    const section = root.querySelector<HTMLElement>("#system-status");
    if (!section) return;
    section.style.scrollMarginTop = `${(root.querySelector(".game-header")?.getBoundingClientRect().height ?? 80) + 8}px`;
    section.scrollIntoView?.({ block: "start", behavior: "auto" });
  }
  function requestConfirmation(
    message: string | string[],
    command: Command,
    title = "Check this decision",
    reserveAccepted = false,
    preview?: Game,
  ) {
    if (!game) return;
    overlayReturn = {
      action:
        command.type === "buy"
          ? "buy"
          : command.type === "move"
            ? "finish-move"
            : command.type === "allocate"
              ? "allocate"
              : command.type === "explore"
                ? "recipient"
                : "commit-action",
      tech: command.type === "buy" ? (command.tech ?? undefined) : undefined,
    };
    confirmation = {
      messages: Array.isArray(message) ? message : [message],
      title,
      command: JSON.parse(JSON.stringify(command)),
      revision: game.revision,
      base: game,
      reserveAccepted,
      preview,
    };
    render();
    root.querySelector<HTMLElement>(".modal button:not(:disabled)")?.focus();
  }
  function commitDraft() {
    if (!game || !selected || !draft.action) return;
    const active =
      game.pending?.kind === "action" ? game.pending.system : selected;
    const command: Command = {
      type: "resolve",
      system: active,
      action: draft.action,
      ...(draft.slot ? { slot: draft.slot } : {}),
      invest: draft.invest,
      bank: draft.bank,
      sources: draft.sources,
      credits: draft.credits,
      settlements: draft.action === "settle" ? draft.settlements : undefined,
      replacements: draft.action === "settle" ? draft.replacements : undefined,
      carried: draft.carried,
      passengerLosses: draft.passengerLosses,
      reveal:
        draft.action === "move" &&
        !system(game, active).revealed &&
        !defaultInvest(game, system(game, active), "move"),
      attack: {
        sacrifice: draft.sacrifice,
        ships: draft.targets,
        settlements: draft.colonies,
      },
    };
    if (game.pending?.kind === "action") {
      const {
        system: ignoredSystem,
        action: ignoredAction,
        type: ignoredType,
        ...choices
      } = command;
      perform({ type: "act", ...choices });
    } else perform(command);
  }
  const click = (event: Event) => {
    const target = event.target as Element;
    if (!target?.closest) return;
    const modal = root.querySelector(".modal");
    if (modal && !modal.contains(target)) return;
    if (Date.now() < suppressClickUntil && !target.closest("[data-action]"))
      return;
    const tab = target.closest<HTMLElement>("[data-view]");
    if (tab) {
      setView(tab.dataset.view as View);
      return;
    }
    const control = target.closest<HTMLElement>("[data-action]");
    if (!control && !dragged) {
      const tile = target.closest<SVGElement>("#galaxy [data-system]");
      if (
        tile &&
        game &&
        ["homes", "plan"].includes(game.phase) &&
        !game.pending
      ) {
        const pointer = event as MouseEvent;
        selectPlacementSystem(
          tile.dataset.system!,
          "mouse",
          pointer.clientX,
          pointer.clientY,
        );
      } else if (target.closest("[data-system]")) {
        const pointer = event as MouseEvent;
        selectLocation(target, {
          source: "mouse",
          x: pointer.clientX,
          y: pointer.clientY,
          track: pointer.detail > 0,
        });
      }
      return;
    }
    if (!control || (control as HTMLButtonElement).disabled) return;
    placementTap = null;
    const data = control.dataset,
      action = data.action;
    if (action !== "select-event-tech") techTap = null;
    choiceTap = null;
    if (action === "count") {
      count = Number(data.count);
      render();
    } else if (action === "resume") resume();
    else if (action === "help") {
      overlayReturn = { action: "help" };
      showHelp = true;
      render();
      root.querySelector<HTMLElement>(".modal button:not(:disabled)")?.focus();
    } else if (action === "close-overlay" || action === "cancel-confirmation")
      closeOverlay();
    else if (action === "confirm-command" && confirmation) {
      const confirmed = confirmation;
      confirmation = null;
      if (game !== confirmed.base) {
        error = "The game changed. Review the current decision.";
        render();
        return;
      }
      perform(confirmed.command, confirmed.revision, {
        intent: true,
        reserve: confirmed.reserveAccepted,
        preview: confirmed.preview,
      });
    } else if (action === "guide-off") {
      guide = false;
      write("space-force.guide", "off");
      render();
    } else if (action === "guide-on") {
      guide = true;
      showHelp = false;
      write("space-force.guide", "on");
      render();
    } else if (action === "new-game") {
      if (
        !game ||
        root.ownerDocument.defaultView?.confirm(
          "Start a new expedition? The current local autosave will be replaced when you start.",
        )
      ) {
        game = null;
        showHelp = false;
        activeCard = null;
        confirmation = null;
        render();
      }
    } else if (action === "export") exportGame();
    else if (action === "show-peek") {
      privatePeek = true;
      render();
    } else if (action === "hide-peek") {
      privatePeek = false;
      render();
    } else if (action === "return-credit" && game)
      perform(
        { type: "returnCredits", count: 1 },
        game.revision,
        undefined,
        Number(data.owner),
      );
    else if (action === "back-to-reserve") backToReserve();
    else if (action === "complete-reserve") perform(reserveEffectCommand());
    else if (action === "confirm-reserve")
      perform(reserveEffectCommand(), game?.revision, {
        intent: true,
        reserve: true,
      });
    else if (action === "to-status") scrollToStatus();
    else if (action === "zoom-in") zoomBy(1.25);
    else if (action === "zoom-out") zoomBy(0.8);
    else if (action === "fit") {
      zoom = 1;
      panX = panY = 0;
      updateCamera();
    } else if (action?.startsWith("pan-")) {
      if (action === "pan-left") panX -= 70 / zoom;
      if (action === "pan-right") panX += 70 / zoom;
      if (action === "pan-up") panY -= 70 / zoom;
      if (action === "pan-down") panY += 70 / zoom;
      updateCamera();
    } else if (action === "decision") decisionView();
    else if (action === "to-board") setView("board");
    else if (action === "to-techs") setView("techs");
    else if (action === "to-event") setView("event");
    else if (action === "card") {
      overlayReturn = { action, card: data.card };
      activeCard = data.card!;
      render();
      root.querySelector<HTMLElement>(".modal button:not(:disabled)")?.focus();
    } else if (action === "step-number") {
      const el = control
        .closest(".quantity-row")
        ?.querySelector<HTMLInputElement>("input");
      if (el) {
        el.value = String(Number(el.value) + Number(data.delta));
        input({ target: el } as unknown as Event);
      }
    } else if (game) {
      if (action === "open-bid") {
        privateBidder = game.turn;
        bidAmount = 0;
        render();
        root
          .querySelector<HTMLInputElement>('[data-number="event-bid"]')
          ?.focus();
      } else if (action === "seal-bid")
        perform({ type: "bid", amount: bidAmount });
      else if (action === "select-event")
        perform({ type: "selectEvent", event: data.event! });
      else if (action === "event-system") {
        if (selected !== data.systemId) draft.eventSettlements = undefined;
        selected = data.systemId!;
        render();
      } else if (action === "commit-event-effect") commitEventEffect();
      else if (action === "skip-event-effect")
        perform({ type: "eventChoice", skip: true });
      else if (action === "politics")
        perform({ type: "eventChoice", action: data.kind as Action });
      else if (action === "event-ally")
        perform({ type: "eventChoice", player: Number(data.recipient) });
      else if (action === "select-event-tech")
        selectVorsprungTech(
          data.tech!,
          event as MouseEvent,
          Boolean(control.closest(".tech-card")),
        );
      else if (action === "commit-vorsprung") commitVorsprung();
      else if (action === "prophecy-planet") {
        const values = draft.eventPlanets ?? [];
        draft.eventPlanets = values.includes(data.planet!)
          ? values.filter((id) => id !== data.planet)
          : [...values, data.planet!];
        render();
      } else if (action === "scramble")
        perform({ type: "scramble", system: selected ?? undefined });
      else if (action === "skip-scramble")
        perform({ type: "scramble", skip: true });
      else if (action === "choose-home" && selected)
        perform({ type: "home", system: selected });
      else if (action === "place-chip" && selected)
        perform({ type: "plan", system: selected });
      else if (action === "select-action" && selected) {
        draft = freshDraft();
        draft.action = data.kind as Action;
        draft.slot = !player(game).used.includes(draft.action)
          ? draft.action
          : (Object.keys(ACTION_LABELS) as Action[]).find(
              (a) => !player(game!).used.includes(a),
            );
        draft.invest = defaultInvest(
          game,
          system(game, selected),
          draft.action,
        );
        render();
      } else if (action === "commit-action" || action === "commit-effect")
        commitDraft();
      else if (action === "filibuster-option") {
        selected = data.systemId!;
        draft.tokenIndex = Number(data.index);
        render();
      } else if (action === "skip-filibuster")
        perform({ type: "filibuster", skip: true });
      else if (action === "commit-filibuster")
        perform({
          type: "filibuster",
          system: selected!,
          index: draft.tokenIndex,
        });
      else if (action === "insurance-credit") perform({ type: "insurance" });
      else if (action === "insurance-ship")
        perform({ type: "insurance", system: data.systemId });
      else if (action === "use-eminent" || action === "skip-eminent")
        perform({ type: "eminent", use: action === "use-eminent" });
      else if (action === "commit-mercenaries")
        perform({ type: "mercenaries", count: draft.techCount });
      else if (action === "plan-pass") perform({ type: "planPass" });
      else if (action === "skip-rapid") perform({ type: "rapid", skip: true });
      else if (action === "commit-rapid" && selectedPlanet)
        perform({ type: "rapid", planet: selectedPlanet });
      else if (action === "acknowledge") perform({ type: "acknowledge" });
      else if (
        action === "commit-redistribute" &&
        game.pending?.kind === "redistribute"
      )
        perform({
          type: "redistribute",
          ships:
            draft.keptShips ?? game.pending.amount - settlementDraftTotal(),
          settlements: draft.settlements,
          replacements: draft.replacements,
        });
      else if (action === "rotate-preview")
        rotateOrientation(Number(data.delta));
      else if (action === "commit-orientation")
        perform({ type: "orient", rotation: orientation });
      else if (action === "finish-move")
        perform({
          type: "move",
          sources: draft.sources,
          carried: draft.carried,
          passengerLosses: draft.passengerLosses,
        });
      else if (action === "commit-settlements")
        perform({
          type: "settleBatch",
          settlements: draft.settlements,
          replacements: draft.replacements,
        });
      else if (action === "recipient")
        perform({ type: "explore", recipient: Number(data.recipient) });
      else if (action === "continue-event") perform({ type: "continueEvent" });
      else if (action === "sabotage-target") {
        draft.sabotageTarget = { player: Number(data.owner), tech: data.tech! };
        draft.sabotageValue = Number(CARD_MAP[data.tech!].cost);
        render();
      } else if (action === "buy") {
        const target =
          data.tech === "tech.sabotage"
            ? selectedSabotageTarget(game)
            : undefined;
        const command: Command = {
          type: "buy",
          tech: data.tech!,
          fullPrice: data.fullPrice === "true",
          ...(data.tech === "tech.sabotage"
            ? {
                value:
                  draft.sabotageValue ??
                  Number(CARD_MAP[target?.tech ?? ""]?.cost ?? 0),
                target,
              }
            : {}),
        };
        const empty = game.systems.some(
          (s) =>
            s.revealed &&
            s.planets.some((p) => !p.blocked && sumOwners(p.owners) === 0),
        );
        if (
          eventIs(game, "luddite-decree") &&
          [
            "tech.genesis",
            "tech.disruptor",
            "tech.artificial-warp",
            "tech.kessler-syndrome",
            "tech.planet-killer",
            "tech.planet-nine",
          ].includes(data.tech!)
        )
          requestConfirmation(
            "Luddite Decree prevents this Tech's acquisition effect. You can still buy it for its Tech point, but its acquisition effect will not be applied later. Buy it anyway?",
            command,
          );
        else if (data.tech === "tech.genesis" && !empty)
          requestConfirmation(
            "There are no empty, valid planets for Genesis. You can still buy it for its Tech point, but it will add no Settlement. Buy it anyway?",
            command,
          );
        else if (featureUsed(game, data.tech!))
          requestConfirmation(
            `${featureUsed(game, data.tech!)} token is already on the board. This purchase will have no token effect. You can still buy it for its Tech point.`,
            command,
          );
        else perform(command);
      } else if (action === "pass-tech") perform({ type: "buy", tech: null });
      else if (action === "feature-option") {
        selected = data.systemId!;
        selectedPlanet = data.planet ?? null;
        selectedEdge = data.edge === undefined ? null : Number(data.edge);
        render();
      } else if (
        action === "commit-feature" &&
        (game.pending?.kind === "feature" || game.pending?.kind === "genesis")
      ) {
        const tech =
          game.pending.kind === "genesis" ? "tech.genesis" : game.pending.tech;
        const option = featureOptions(game, tech).find(
          (o) =>
            o.system === selected &&
            (!o.planet || o.planet === selectedPlanet) &&
            (o.edge === undefined || o.edge === selectedEdge),
        );
        if (option) perform({ type: "feature", ...option });
      } else if (action === "skip-feature")
        perform({ type: "feature", skip: true });
      else if (action === "all-home") {
        draft.allocation = { [player(game).home!]: reinforceCount(game) };
        draft.credits = 0;
        render();
      } else if (action === "all-credits") {
        draft.credits = player(game).invested;
        draft.allocation = {};
        render();
      } else if (action === "allocate") {
        const command: Command = {
          type: "allocate",
          credits:
            game.phase === "investments"
              ? (draft.credits ?? player(game).invested)
              : 0,
          ships: draft.allocation,
        };
        perform(command);
      }
    }
  };
  const input = (event: Event) => {
    choiceTap = null;
    const el = event.target as HTMLInputElement;
    const modal = root.querySelector(".modal");
    if (modal && !modal.contains(el)) return;
    if (el.dataset.name !== undefined) {
      names[Number(el.dataset.name)] = el.value;
      return;
    }
    if (el.id === "map-code") {
      mapCode = el.value;
      return;
    }
    if (el.dataset.setting === "event-mode") {
      eventMode = el.value as NonNullable<GameConfig["events"]>;
      render();
      return;
    }
    if (el.dataset.setting === "event-batch") {
      eventBatch = el.value as NonNullable<GameConfig["eventBatch"]>;
      render();
      return;
    }
    if (el.dataset.setting === "action-slot") {
      draft.slot = el.value as Action;
      render();
      return;
    }
    if (el.dataset.setting === "tech-preset") {
      techPreset = el.value as GameConfig["techPreset"];

      if (techPreset === "family") scenario = "standard";
      render();
      return;
    }
    if (el.dataset.check === "foresight-test") {
      eventMode = el.checked ? "foresight-test" : "simpler";
      render();
      return;
    }
    if (el.dataset.check === "chain-scenario") {
      scenario = el.checked ? "five-tech-chain" : "standard";
      if (el.checked && techPreset === "family") techPreset = "chains";
      render();
      return;
    }
    if (el.dataset.check) {
      if (el.dataset.check === "shortcuts") shortcuts = el.checked;
      else if (el.dataset.check === "invest") draft.invest = el.checked;
      else if (el.dataset.check === "bank") draft.bank = el.checked;
      render();
      if (el.dataset.check === "invest") scrollToSystemStatus();
      return;
    }
    if (!el.dataset.number || !game) return;
    const before = JSON.stringify(draft);
    if (el.dataset.number === "event-bid") {
      bidAmount = Math.max(
        0,
        Math.min(player(game).credits, Math.floor(Number(el.value) || 0)),
      );
      render();
      return;
    }
    const raw = Number(el.value);
    if (!Number.isFinite(raw)) return;
    const n = Math.max(0, Math.min(Number(el.max), Math.floor(raw))),
      id = el.dataset.id!;
    if (el.dataset.number === "event-ships") draft.autoStealth = false;
    if (
      el.dataset.number === "event-ships" ||
      el.dataset.number === "event-famine"
    )
      draft.allocation[id] = n;
    if (el.dataset.number === "event-amount") draft.eventAmount = n;
    if (el.dataset.number === "event-migration" && selected) {
      draft.eventSettlements ??= Object.fromEntries(
        system(game, selected).planets.map((p) => [p.id, p.owners.slice()]),
      );
      draft.eventSettlements[el.dataset.planet!][Number(id)] = n;
    }
    if (el.dataset.number === "source") {
      draft.sources[id] = n;
      let room = n;
      for (const owner of Object.keys(draft.carried[id] ?? {})) {
        const value = Math.min(draft.carried[id][owner], room);
        draft.carried[id][owner] = value;
        room -= value;
      }
      draft.passengerLosses = undefined;
    }
    if (el.dataset.number === "carried") {
      draft.carried[el.dataset.origin!] ??= {};
      draft.carried[el.dataset.origin!][id] = n;
      draft.passengerLosses = undefined;
    }
    if (el.dataset.number === "passenger-loss") {
      if (!draft.passengerLosses)
        draft.passengerLosses = currentPassengerLosses();
      draft.passengerLosses[id] = n;
      normalizePassengerLosses();
    }
    if (el.dataset.number === "mercenaries") draft.techCount = n;
    if (el.dataset.number === "recovery-credits") draft.recoveryCredits = n;
    if (
      el.dataset.number === "recovery-ships" &&
      game.pending?.kind === "reserve"
    )
      draft.recoveryCredits = game.pending.remaining - n;
    if (
      el.dataset.number === "recovery-source" &&
      game.pending?.kind === "reserve"
    )
      draft.recoveryShips = {
        ...recoveryAllocations(game, game.pending),
        [id]: n,
      };
    if (el.dataset.number === "sabotage-value") draft.sabotageValue = n;
    if (el.dataset.number === "replacement") {
      draft.replacements[el.dataset.planet!] ??= {};
      draft.replacements[el.dataset.planet!][id] = n;
      if (game.pending?.kind === "redistribute")
        draft.keptShips = game.pending.amount - settlementDraftTotal();
    }
    if (el.dataset.number === "settlement")
      draft.settlements[el.dataset.planet!] = n;
    if (el.dataset.number === "produce-credits") draft.credits = n;
    if (el.dataset.number === "produce-ships" && selected)
      draft.credits =
        Math.min(
          player(game).reserve,
          production(
            game,
            system(
              game,
              game.pending?.kind === "action" ? game.pending.system : selected,
            ),
          ),
        ) - n;
    if (el.dataset.number === "sacrifice") {
      draft.sacrifice = n;
      trimAttack();
    }
    if (el.dataset.number === "target-ships") {
      draft.targets[id] = n;
      trimPatrolTargets();
    }
    if (el.dataset.number === "target-colony") {
      draft.colonies[el.dataset.planet!] ??= {};
      draft.colonies[el.dataset.planet!][id] = n;
    }
    if (el.dataset.number === "allocate-system") adjustAllocation(game, id, n);
    if (el.dataset.number === "allocate-credits")
      adjustAllocation(game, "credits", n);
    if (
      el.dataset.number === "target-ships" ||
      el.dataset.number === "target-colony"
    ) {
      const targets = attackTotals();
      draft.sacrifice = Math.max(
        draft.sacrifice,
        attackCost(game, targets.ships, targets.settlements),
      );
    }
    if (
      el.dataset.number === "redistribute-settlement" &&
      game.pending?.kind === "redistribute"
    ) {
      draft.settlements[el.dataset.planet!] = n;
      draft.keptShips = game.pending.amount - settlementDraftTotal();
    }
    if (
      el.dataset.number === "redistribute-ships" &&
      game.pending?.kind === "redistribute"
    ) {
      draft.keptShips = n;
      let excess = Math.max(
        0,
        n + settlementDraftTotal() - game.pending.amount,
      );
      for (const p of system(game, game.pending.system).planets) {
        const d = Math.min(draft.settlements[p.id] ?? 0, excess);
        draft.settlements[p.id] = (draft.settlements[p.id] ?? 0) - d;
        excess -= d;
      }
      for (const targets of Object.values(draft.replacements))
        for (const id of Object.keys(targets)) {
          const d = Math.min(targets[id], excess);
          targets[id] -= d;
          excess -= d;
        }
    }
    if (
      ["settlement", "redistribute-settlement", "redistribute-ships"].includes(
        el.dataset.number,
      )
    )
      trimReplacementDraft();
    if (
      JSON.stringify(draft) !== before ||
      ["sabotage-value"].includes(el.dataset.number)
    )
      render();
    else el.value = String(n);
  };

  const doubleClick = (event: MouseEvent) => {
    const target = event.target as Element;
    if (
      !game ||
      root.querySelector(".modal") ||
      Date.now() < suppressClickUntil
    )
      return;
    if (choosingVorsprung(game)) {
      const card = target.closest<HTMLElement>(".tech-card.vorsprung-choice");
      if (!card || !eventTechOptions(game).includes(card.dataset.techId!))
        return;
      event.preventDefault();
      draft.eventTech = card.dataset.techId;
      techTap = null;
      commitVorsprung();
    } else if (
      target.closest("#galaxy [data-system]") &&
      game.pending?.kind !== "orient"
    ) {
      event.preventDefault();
      selectLocation(target, {
        source: "mouse",
        x: event.clientX,
        y: event.clientY,
        confirm: true,
      });
    }
  };
  const submit = (event: Event) => {
    if ((event.target as HTMLElement).id === "setup-form") {
      event.preventDefault();
      start();
    }
  };
  const key = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement;
    if (
      !root.contains(target) &&
      target !== root.ownerDocument.body &&
      target !== root.ownerDocument.documentElement
    )
      return;
    const modal = root.querySelector(".modal");
    if (event.key === "Escape" && modal) {
      event.preventDefault();
      if (showHelp || activeCard || confirmation) closeOverlay();
      else if (game?.pending?.kind === "reserve") backToReserve();
      return;
    }
    if (event.key === "Tab" && modal) {
      const items = [
        ...root.querySelectorAll<HTMLElement>(
          ".modal button:not(:disabled), .modal input, .modal a[href]",
        ),
      ];
      const index = items.indexOf(
        root.ownerDocument.activeElement as HTMLElement,
      );
      if (event.shiftKey && index <= 0) {
        event.preventDefault();
        items[items.length - 1]?.focus();
      } else if (!event.shiftKey && (index < 0 || index === items.length - 1)) {
        event.preventDefault();
        items[0]?.focus();
      }
      return;
    }
    if (
      target.closest('input,textarea,select,[contenteditable="true"]') ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    )
      return;
    if (modal) return;
    if (
      target.closest('[role="tab"]') &&
      ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
    ) {
      event.preventDefault();
      const views = Object.keys(VIEW_LABELS) as View[];
      const index =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? views.length - 1
            : (views.indexOf(view) +
                views.length +
                (event.key === "ArrowRight" ? 1 : -1)) %
              views.length;
      setView(views[index]);
      return;
    }
    if (
      target.closest("[data-system]") &&
      (event.key === "Enter" || event.key === " ")
    ) {
      event.preventDefault();
      selectLocation(target);
      return;
    }
    if (!shortcuts || !game || showHelp || activeCard || confirmation) return;
    const shortcut: Record<string, View> = {
      b: "board",
      t: "techs",
      e: "event",
      a: "actions",
      p: "player_aid",
    };
    if (event.key.toLowerCase() === "s") {
      event.preventDefault();
      scrollToStatus();
      return;
    }
    if (shortcut[event.key.toLowerCase()]) {
      event.preventDefault();
      setView(shortcut[event.key.toLowerCase()]);
    } else if (event.key === "?") {
      overlayReturn = null;
      showHelp = true;
      render();
      root.querySelector<HTMLElement>(".modal button:not(:disabled)")?.focus();
    } else if (target.closest(".map-viewport")) {
      choiceTap = null;
      placementTap = null;
      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        zoom = 1;
        panX = panY = 0;
        updateCamera();
      } else if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        zoomBy(1.25);
      } else if (event.key === "-") {
        event.preventDefault();
        zoomBy(0.8);
      } else if (event.key.startsWith("Arrow")) {
        event.preventDefault();
        if (event.key === "ArrowLeft") panX -= 50 / zoom;
        if (event.key === "ArrowRight") panX += 50 / zoom;
        if (event.key === "ArrowUp") panY -= 50 / zoom;
        if (event.key === "ArrowDown") panY += 50 / zoom;
        updateCamera();
      }
    }
  };
  function cancelPlacement() {
    choiceTap = null;
    boardTap = null;
    placementDrag = null;
    root.querySelector("#placement-chip")?.remove();
    root
      .querySelectorAll(".drop-target")
      .forEach((el) => el.classList.remove("drop-target"));
  }
  function placementTarget(x: number, y: number): string | null {
    const hit = root.ownerDocument
      .elementFromPoint?.(x, y)
      ?.closest<SVGElement>("[data-system]");
    return hit && root.contains(hit) ? (hit.dataset.system ?? null) : null;
  }
  const down = (event: PointerEvent) => {
    const target = event.target as Element;
    const modal = root.querySelector(".modal");
    if (modal && !modal.contains(target)) return;
    if (boardTap && boardTap.id !== event.pointerId) {
      boardTap = null;
      choiceTap = null;
      placementTap = null;
    }
    if (target.closest(".view-tabs") && event.pointerType === "touch") {
      swipe = { id: event.pointerId, x: event.clientX, y: event.clientY };
      return;
    }
    if (placementDrag && placementDrag.id !== event.pointerId) {
      placementTap = null;
      pointerPositions.set(placementDrag.id, {
        x: placementDrag.x,
        y: placementDrag.y,
      });
      cancelPlacement();
      suppressClickUntil = Date.now() + 350;
    }
    const tile = target.closest<SVGElement>("[data-system]");
    if (
      game &&
      event.pointerType === "touch" &&
      tile &&
      pointerPositions.size === 0 &&
      (game.phase === "homes" ||
        (game.pending?.kind === "orient" &&
          game.pending.system === tile.dataset.system) ||
        (!(game.phase === "plan" && !game.pending) &&
          readBoardTarget(target) &&
          boardConfirmation(game, readBoardTarget(target)!)))
    )
      boardTap = {
        kind:
          game.phase === "homes"
            ? "home"
            : game.pending?.kind === "orient"
              ? "orient"
              : "choice",
        target: readBoardTarget(target) ?? undefined,
        id: event.pointerId,
        system: tile.dataset.system!,
        x: event.clientX,
        y: event.clientY,
        actor: game.turn,
        revision: game.revision,
      };
    if (
      game?.phase === "plan" &&
      !game.pending &&
      event.pointerType === "touch" &&
      tile &&
      pointerPositions.size === 0 &&
      canPlan(game, system(game, tile.dataset.system!))
    ) {
      placementDrag = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        moved: false,
        actor: game.turn,
        revision: game.revision,
      };
      return;
    }
    if (
      !target.closest(".map-viewport") ||
      (target.closest("[data-system]") && event.pointerType !== "touch")
    )
      return;
    pointerPositions.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    dragged = false;
    lastDrag = { x: event.clientX, y: event.clientY };
  };
  const move = (event: PointerEvent) => {
    if (placementDrag?.id === event.pointerId && game) {
      if (
        Math.hypot(
          event.clientX - placementDrag.x,
          event.clientY - placementDrag.y,
        ) > 7
      )
        placementDrag.moved = true;
      if (placementDrag.moved) {
        event.preventDefault();
        root.setPointerCapture?.(event.pointerId);
        let ghost = root.querySelector<HTMLElement>("#placement-chip");
        if (!ghost) {
          ghost = root.ownerDocument.createElement("div");
          ghost.id = "placement-chip";
          ghost.setAttribute("aria-hidden", "true");
          ghost.innerHTML = `<svg width="56" height="56" viewBox="-29 -29 58 60">${chipFace(game.turn, 0, 0, 26)}</svg>`;
          root.append(ghost);
        }
        ghost.style.left = `${event.clientX}px`;
        ghost.style.top = `${event.clientY}px`;
        const id = placementTarget(event.clientX, event.clientY);
        root
          .querySelectorAll<SVGElement>(".system")
          .forEach((el) =>
            el.classList.toggle(
              "drop-target",
              el.dataset.system === id &&
                canPlan(game!, system(game!, el.dataset.system!)),
            ),
          );
      }
      return;
    }
    if (!pointerPositions.has(event.pointerId) || !lastDrag) return;
    if (
      boardTap?.id === event.pointerId &&
      pointerPositions.size === 1 &&
      Math.hypot(event.clientX - boardTap.x, event.clientY - boardTap.y) <= 7
    )
      return;
    const previous = [...pointerPositions.values()];
    const prev = pointerPositions.get(event.pointerId)!;
    pointerPositions.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    if (
      Math.abs(event.clientX - lastDrag.x) +
        Math.abs(event.clientY - lastDrag.y) >
      7
    )
      dragged = true;
    const values = [...pointerPositions.values()];
    if (values.length === 2) {
      const oldDistance = Math.hypot(
        previous[0].x - previous[1].x,
        previous[0].y - previous[1].y,
      );
      const distance = Math.hypot(
        values[0].x - values[1].x,
        values[0].y - values[1].y,
      );
      const before = mapPoint(
        (previous[0].x + previous[1].x) / 2,
        (previous[0].y + previous[1].y) / 2,
      );
      if (oldDistance > 0)
        zoom = Math.max(0.6, Math.min(4, (zoom * distance) / oldDistance));
      updateCamera();
      const after = mapPoint(
        (values[0].x + values[1].x) / 2,
        (values[0].y + values[1].y) / 2,
      );
      panX += before.x - after.x;
      panY += before.y - after.y;
      dragged = true;
    } else if (dragged) {
      const before = mapPoint(prev.x, prev.y),
        after = mapPoint(event.clientX, event.clientY);
      panX += before.x - after.x;
      panY += before.y - after.y;
    }
    if (dragged) {
      choiceTap = null;
      placementTap = null;
      event.preventDefault();
      root.setPointerCapture?.(event.pointerId);
      suppressClickUntil = Date.now() + 350;
      updateCamera();
    }
  };
  const up = (event: PointerEvent) => {
    if (event.type === "pointercancel") {
      placementTap = null;
      choiceTap = null;
    }
    if (boardTap?.id === event.pointerId) {
      const tapped = boardTap;
      boardTap = null;
      if (
        event.type !== "pointercancel" &&
        !dragged &&
        pointerPositions.size === 1 &&
        Math.hypot(event.clientX - tapped.x, event.clientY - tapped.y) <= 7 &&
        game &&
        game.turn === tapped.actor &&
        game.revision === tapped.revision
      ) {
        if (tapped.kind === "home" && game.phase === "homes")
          selectPlacementSystem(
            tapped.system,
            "touch",
            event.clientX,
            event.clientY,
          );
        else if (tapped.kind === "choice" && tapped.target)
          selectBoardLocation(tapped.target, {
            source: "touch",
            x: event.clientX,
            y: event.clientY,
            track: true,
          });
        else if (
          tapped.kind === "orient" &&
          game.pending?.kind === "orient" &&
          game.pending.system === tapped.system
        )
          rotateOrientation(1);
        suppressClickUntil = Date.now() + 350;
      }
    }
    if (placementDrag?.id === event.pointerId) {
      const placement = placementDrag,
        id = placementTarget(event.clientX, event.clientY);
      cancelPlacement();
      if (root.hasPointerCapture?.(event.pointerId))
        root.releasePointerCapture(event.pointerId);
      if (placement.moved) {
        placementTap = null;
        suppressClickUntil = Date.now() + 350;
        if (
          event.type !== "pointercancel" &&
          game &&
          game.turn === placement.actor &&
          game.revision === placement.revision &&
          id &&
          canPlan(game, system(game, id))
        ) {
          selected = id;
          render();
        }
      } else if (
        event.type !== "pointercancel" &&
        game &&
        game.turn === placement.actor &&
        game.revision === placement.revision &&
        id
      ) {
        selectPlacementSystem(id, "touch", event.clientX, event.clientY);
        suppressClickUntil = Date.now() + 350;
      }
      return;
    }
    if (swipe?.id === event.pointerId) {
      const dx = event.clientX - swipe.x,
        dy = event.clientY - swipe.y;
      if (
        event.type !== "pointercancel" &&
        Math.abs(dx) > 50 &&
        Math.abs(dx) > Math.abs(dy) * 1.3
      ) {
        const views = Object.keys(VIEW_LABELS) as View[];
        const index = views.indexOf(view);
        suppressClickUntil = Date.now() + 350;
        setView(
          views[
            Math.max(0, Math.min(views.length - 1, index + (dx < 0 ? 1 : -1)))
          ],
        );
      }
      swipe = null;
    }
    pointerPositions.delete(event.pointerId);
    if (root.hasPointerCapture?.(event.pointerId))
      root.releasePointerCapture(event.pointerId);
    if (!pointerPositions.size) {
      lastDrag = null;
      if (dragged) suppressClickUntil = Date.now() + 350;
      dragged = false;
    } else {
      const remaining = [...pointerPositions.values()][0];
      lastDrag = { ...remaining };
    }
  };
  const liveInput = (event: Event) => {
    const t = event.target as HTMLInputElement;
    if (t.dataset.name !== undefined || t.id === "map-code" || t.dataset.number)
      input(event);
  };
  root.ownerDocument.defaultView?.addEventListener("resize", updateTypography);
  root.addEventListener("click", click);
  root.addEventListener("dblclick", doubleClick);
  root.addEventListener("change", input);
  root.addEventListener("input", liveInput);
  root.addEventListener("submit", submit);
  root.ownerDocument.addEventListener("keydown", key);
  root.addEventListener("pointerdown", down);
  root.addEventListener("pointermove", move);
  root.addEventListener("pointerup", up);
  root.addEventListener("pointercancel", up);
  render();
  return {
    getGame: () => game,
    getView: () => view,
    setGame: (value: Game) => {
      assertInvariants(value);
      previewCache = new WeakMap();
      featureCache = new WeakMap();
      game = value;
      choiceTap = null;
      techTap = null;
      resetRoster = true;
      reserveWarningOpen = true;
      privatePeek = false;
      privateBidder = null;
      bidAmount = 0;
      placementTap = null;
      draft = freshDraft();
      selected =
        value.pending && "system" in value.pending
          ? value.pending.system
          : null;
      if (value.pending?.kind === "orient")
        orientation = value.pending.rotations[0];
      if (value.pending?.kind === "move") {
        draft.sources = { ...value.pending.sources };
        draft.carried = { ...value.pending.carried };
      }
      if (value.pending?.kind === "action") {
        draft.action = value.pending.action;
        draft.invest = forcedInvestment(value, value.pending.action);
        draft.bank = value.context?.bank ?? false;
      }
      render();
    },
    destroy: () => {
      cancelPlacement();
      root.ownerDocument.defaultView?.removeEventListener(
        "resize",
        updateTypography,
      );
      root.replaceChildren();
      root.removeEventListener("click", click);
      root.removeEventListener("dblclick", doubleClick);
      root.removeEventListener("change", input);
      root.removeEventListener("input", liveInput);
      root.removeEventListener("submit", submit);
      root.ownerDocument.removeEventListener("keydown", key);
      root.removeEventListener("pointerdown", down);
      root.removeEventListener("pointermove", move);
      root.removeEventListener("pointerup", up);
      root.removeEventListener("pointercancel", up);
    },
  };
}
function sumOwners(values: number[]) {
  return values.reduce((a, b) => a + b, 0);
}
