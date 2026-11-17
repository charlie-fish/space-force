import {
  ART,
  CARD_MAP,
  DIRECTIONS,
  LAYOUTS,
  CARDS,
  IMPLEMENTED_TECHS,
  TECH_PRESETS,
  CHAIN_TECHS,
} from "./content.js";
import type {
  Action,
  AttackPayload,
  Command,
  Game,
  Planet,
  Player,
  Score,
  System,
  Explore,
  Continuation,
  SettlementResume,
  ActionChoices,
  GameConfig,
  Replacements,
  SettlementPlacement,
  MovePayload,
  ReserveEffect,
} from "./types.js";
import {
  findOpenSpace,
  blackHolePositions,
  warpPosition,
  WARP_WIDTH,
  WARP_HEIGHT,
} from "./geometry.js";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
function requireRule(test: unknown, message: string): asserts test {
  if (!test) throw new Error(message);
}
function integer(value: number, max = 1000) {
  requireRule(
    Number.isInteger(value) && value >= 0 && value <= max,
    "Choose a valid whole-number quantity.",
  );
  return value;
}
export const player = (g: Game, id = g.turn): Player => {
  const p = g.players[id];
  requireRule(p, "Unknown player.");
  return p;
};
export const system = (g: Game, id: string): System => {
  const s = g.systems.find((s) => s.id === id);
  requireRule(s, "Unknown system.");
  return s;
};
export const hasTech = (g: Game, id: number, tech: string) =>
  player(g, id).techs.includes(`tech.${tech}`);
const sum = (numbers: number[]) => numbers.reduce((a, b) => a + b, 0);
const log = (g: Game, text: string, id: number | null = g.turn) => {
  g.log.push({ revision: g.revision + 1, round: g.round, player: id, text });
};
export const nameOf = (s: System) =>
  s.revealed ? ART.systems[s.template].name : "Unexplored system";

function random(g: Game) {
  g.rng = (g.rng + 0x6d2b79f5) >>> 0;
  let t = g.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function shuffle<T>(g: Game, values: T[]): T[] {
  const result = values.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random(g) * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function seedFrom(value: string): number {
  let n = 2166136261;
  for (const c of value) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return n >>> 0;
}

export function createGame(
  count: number,
  seed = 12345,
  names: string[] = [],
  config: GameConfig = { techPreset: "family", scenario: "standard" },
): Game {
  requireRule(
    Number.isInteger(count) && count >= 2 && count <= 7,
    "Space Force supports two to seven players.",
  );
  requireRule(
    Object.prototype.hasOwnProperty.call(TECH_PRESETS, config.techPreset) &&
      ["standard", "five-tech-chain"].includes(config.scenario) &&
      (config.events === undefined ||
        ["simpler", "foresight-test"].includes(config.events)),
    "Choose a supported test setup.",
  );
  const g: Game = {
    schema: 7,
    engine: "0.16.0",
    content: "confirmed-techs-reserve-recovery-4",
    config: { ...clone(config), events: config.events ?? "simpler" },
    seed: seed >>> 0,
    rng: seed >>> 0,
    revision: 0,
    round: 1,
    phase: "homes",
    turn: 0,
    first: 0,
    players: [],
    systems: [],
    exploreBag: [],
    events: [],
    revealedEvents: [],
    eventHistory: [],
    market: TECH_PRESETS[config.techPreset].techs.slice(),
    finalEconomy: false,
    pending: null,
    context: null,
    features: { blackHole: false, warp: false, asteroid: false, planet: false },
    disruptions: [],
    log: [],
    commands: [],
    decisions: [{ player: 0, revision: 0 }],
    scores: [],
    winners: [],
    endgameQueue: [],
    legacyRulesUntil: 0,
    reserveRecoveryFrom: 0,
  };
  g.players = Array.from({ length: count }, (_, id) => ({
    id,
    name:
      names[id]
        ?.trim()
        .replace(/[\u0000-\u001f]/g, "")
        .slice(0, 24) || `Player ${id + 1}`,
    style: id,
    reserve: 40,
    credits: 0,
    invested: 0,
    techs: [],
    used: [],
    investedActions: [],
    home: null,
    unplaced: 4,
    stalledRound: 0,
    freeInvestments: [],
  }));
  if (config.scenario === "five-tech-chain")
    for (const p of g.players) {
      p.techs = CHAIN_TECHS.slice();
      p.reserve -= CHAIN_TECHS.length;
    }
  const homes = shuffle(
    g,
    Object.values(ART.systems)
      .filter((t) => t.homePlanetIndex !== null && t.id !== "system.adams")
      .map((t) => t.id),
  );
  const hidden = shuffle(
    g,
    Object.values(ART.systems)
      .filter((t) => t.homePlanetIndex === null && t.id !== "system.asimov")
      .map((t) => t.id),
  );
  const layout = LAYOUTS.find((l) => l.players === count)!;
  let h = 0,
    u = 0;
  for (const cell of layout.cells) {
    const template =
      cell.role === "centre"
        ? count === 6
          ? "system.asimov"
          : "system.adams"
        : cell.role === "home"
          ? homes[h++]
          : hidden[u++];
    const art = ART.systems[template];
    const id = `s${cell.q}_${cell.r}`;
    g.systems.push({
      id,
      template,
      q: cell.q,
      r: cell.r,
      role: cell.role,
      revealed: cell.role !== "hidden",
      rotation: 0,
      planets: art.planets.map((p, i) => ({
        id: `${id}.p${i}`,
        capacity: p.capacity,
        home: p.home,
        x: p.x,
        y: p.y,
        owners: Array(count).fill(0),
        explore: null,
        blocked: false,
      })),
      ships: Array(count).fill(0),
      tokens: [],
      extraHoles: 0,
      extraWarp: false,
      extraEdges: [],
    });
  }
  if (layout.setupAsteroid) {
    const edge = layout.setupAsteroid;
    g.systems
      .find((s) => s.q === edge.q && s.r === edge.r)!
      .extraEdges.push(edge.edge);
    g.features.asteroid = true;
  }
  g.exploreBag = shuffle(g, [
    "credit1",
    "credit1",
    "credit2",
    "credit2",
    "credit2",
    "credit2",
    "credit3",
    "otherShips",
    "otherShips",
    "otherShips",
    "otherSettlement",
    "otherSettlement",
    "otherSettlement",
    "otherSettlement",
    "blackHole",
    "blackHole",
  ] as Explore[]);
  g.events = shuffle(
    g,
    CARDS.filter((c) => c.type === "event").map((c) => c.id),
  ).slice(0, count <= 3 ? 10 : 8);
  if (config.techPreset === "random")
    g.market = shuffle(
      g,
      IMPLEMENTED_TECHS.filter(
        (id) => id !== "tech.foresight" || g.config.events === "foresight-test",
      ),
    ).slice(0, 10);
  if (
    g.config.events !== "foresight-test" &&
    g.market.includes("tech.foresight")
  ) {
    const legal = IMPLEMENTED_TECHS.filter(
      (id) =>
        !g.market.includes(id) &&
        id !== "tech.foresight" &&
        [2, 3].includes(Number(CARD_MAP[id].cost)),
    );
    const replacement = shuffle(g, legal)[0];
    g.market[g.market.indexOf("tech.foresight")] = replacement;
    log(
      g,
      `Simpler Events excludes Foresight; replaced it with ${CARD_MAP[replacement].title} under R08.`,
      null,
    );
  }
  log(
    g,
    `Local ${TECH_PRESETS[config.techPreset].label} game created. ${g.config.events === "foresight-test" ? "Nonstandard Foresight Tech test: Events count rounds and permit owner peeks; effects and auctions are disabled." : "Simpler Events count rounds; their effects and auction are disabled."}${config.scenario === "five-tech-chain" ? " Designer test scenario: each player starts with the five R01 Techs; their ownership markers come from Reserve." : ""}`,
    null,
  );
  assertInvariants(g);
  return g;
}

export function edges(s: System): number[] {
  return s.revealed
    ? [
        ...ART.systems[s.template].blockedEdges.map(
          (e) => (e + s.rotation) % 6,
        ),
        ...s.extraEdges,
      ]
    : s.extraEdges.slice();
}
export const warp = (s: System) =>
  s.revealed && (ART.systems[s.template].fixedWarps.length > 0 || s.extraWarp);
export const blackHoles = (s: System) =>
  s.revealed
    ? ART.systems[s.template].fixedBlackHoles.length + s.extraHoles
    : 0;
export function edgeBetween(a: System, b: System): number {
  return DIRECTIONS.findIndex(([q, r]) => a.q + q === b.q && a.r + r === b.r);
}
export function canMove(
  g: Game,
  id: number,
  from: System,
  to: System,
): boolean {
  if (from.id === to.id || !from.revealed) return false;
  if (warp(from) && warp(to)) return true;
  const e = edgeBetween(from, to);
  if (e < 0) return false;
  return (
    hasTech(g, id, "agility") ||
    (!edges(from).includes(e) && !edges(to).includes((e + 3) % 6))
  );
}
export function boardConnected(g: Game): boolean {
  const seen = new Set([g.systems[0].id]);
  const todo = [g.systems[0]];
  while (todo.length) {
    const a = todo.pop()!;
    for (const b of g.systems) {
      if (seen.has(b.id)) continue;
      const e = edgeBetween(a, b);
      if (
        (warp(a) && warp(b)) ||
        (e >= 0 && !edges(a).includes(e) && !edges(b).includes((e + 3) % 6))
      ) {
        seen.add(b.id);
        todo.push(b);
      }
    }
  }
  return seen.size === g.systems.length;
}
export function legalOrientations(
  g: Game,
  targetId: string,
  sources: Record<string, number>,
): number[] {
  const result: number[] = [];
  for (let r = 0; r < 6; r++) {
    const copy = clone(g);
    const target = system(copy, targetId);
    target.revealed = true;
    target.rotation = r;
    if (
      boardConnected(copy) &&
      Object.entries(sources).every(
        ([id, n]) =>
          n === 0 || canMove(copy, copy.turn, system(copy, id), target),
      )
    )
      result.push(r);
  }
  return result;
}
export function availableSystems(g: Game, id = g.turn): System[] {
  const p = player(g, id);
  return g.systems.filter(
    (s) => s.id === p.home || s.planets.some((planet) => planet.owners[id] > 0),
  );
}
export function freeSpace(p: Planet): number {
  return p.blocked ? 0 : Math.max(0, p.capacity - sum(p.owners));
}
export function production(g: Game, s: System, id = g.turn): number {
  return sum(
    s.planets.map((p) =>
      !p.blocked && p.owners[id] > 0
        ? sum(p.owners) >= p.capacity
          ? 2
          : 1
        : 0,
    ),
  );
}
export function eligibleTokens(g: Game, id = g.turn): System[] {
  return g.systems.filter((s) => s.tokens[s.tokens.length - 1] === id);
}
export function canPlan(g: Game, s: System, id = g.turn): boolean {
  return !g.disruptions.some(
    (d) => d.round === g.round && d.system === s.id && d.owner !== id,
  );
}
export function purchaseReason(
  g: Game,
  tech: string,
  id = g.turn,
  fullPrice = false,
  value?: number,
  target?: { player: number; tech: string },
): string | null {
  const p = player(g, id);
  const card = CARD_MAP[tech];
  if (!g.market.includes(tech) || !IMPLEMENTED_TECHS.includes(tech))
    return "This Tech is outside the prototype preset.";
  if (p.techs.includes(tech)) return "You already own this Tech.";
  if (
    g.players.some(
      (other) =>
        other.id !== id &&
        hasTech(g, other.id, "patents") &&
        other.techs.includes(tech),
    )
  )
    return "Another player’s Patents prevents this purchase.";
  if (tech === "tech.foresight" && g.config.events !== "foresight-test")
    return "Foresight is excluded with simpler Events.";
  if (tech === "tech.sabotage") {
    if (isFinalRound(g)) return "Sabotage cannot be bought in the last round.";
    if (!Number.isInteger(value) || value! < 0 || value! > 81)
      return "Choose Sabotage's undiscounted value.";
    if (
      !sabotageTargets(g, id).some(
        (t) => Number(CARD_MAP[t.tech].cost) <= value!,
      )
    )
      return "No opponent Tech can be removed at this value.";
  }
  const minimum =
    tech === "tech.sabotage"
      ? target
        ? Number(CARD_MAP[target.tech]?.cost)
        : Math.min(
            ...sabotageTargets(g, id)
              .filter((t) => Number(CARD_MAP[t.tech].cost) <= value!)
              .map((t) => Number(CARD_MAP[t.tech].cost)),
          )
      : 0;
  const cost = purchaseCost(g, tech, id, fullPrice, value, minimum);
  if (p.credits < cost) return `You need ${cost} Credits.`;
  if (p.reserve + cost < 1)
    return "A Reserve rocket is needed to mark ownership.";
  return null;
}
export function purchaseCost(
  g: Game,
  tech: string,
  id = g.turn,
  fullPrice = false,
  sabotageValue = 0,
  minimum?: number,
) {
  const value =
    tech === "tech.sabotage"
      ? integer(sabotageValue, 81)
      : CARD_MAP[tech]?.cost;
  requireRule(typeof value === "number", "Unknown Tech value.");
  const cost =
    hasTech(g, id, "research-lab") && !fullPrice
      ? Math.floor(value / 2)
      : value;
  const floor =
    minimum ??
    (tech === "tech.sabotage"
      ? Math.min(
          value,
          ...sabotageTargets(g, id)
            .map((t) => Number(CARD_MAP[t.tech].cost))
            .filter((n) => n <= value),
        )
      : 0);
  return tech === "tech.sabotage" && !legacyRules(g)
    ? Math.max(cost, floor)
    : cost;
}
export function sabotageTargets(g: Game, id = g.turn) {
  return g.players.flatMap((p) =>
    p.id === id
      ? []
      : p.techs
          .filter((t) => t !== "tech.sabotage")
          .map((tech) => ({ player: p.id, tech })),
  );
}
export function peekEvents(g: Game, id: number): string[] {
  requireRule(
    hasTech(g, id, "foresight") && g.config.events === "foresight-test",
    "Only a Foresight owner may inspect the upcoming Events.",
  );
  return g.events.slice(0, 2);
}
export function canSoylent(
  g: Game,
  s: System,
  id = g.turn,
  additions: Record<string, number> = {},
) {
  const planets = s.planets.filter((p) => !p.blocked);
  return (
    s.revealed &&
    hasTech(g, id, "soylent-green") &&
    planets.length > 0 &&
    planets.every((p) => sum(p.owners) + (additions[p.id] ?? 0) >= p.capacity)
  );
}
export function attackCost(
  g: Game,
  ships: number,
  settlements: number,
  id = g.turn,
) {
  return hasTech(g, id, "death-sun")
    ? legacyRules(g)
      ? Math.max(
          Math.ceil((ships + settlements) / 3),
          Math.ceil((ships + 2 * settlements) / 4),
        )
      : Math.ceil(ships / 3) + Math.ceil(settlements / 2)
    : Math.ceil(ships / 2) + settlements;
}
export function afterActionHooks(
  g: Game,
  action: Action,
  source?: string,
): string[] {
  return (
    action === "produce"
      ? ["population-explosion", ...(source === "tech.spice" ? [] : ["spice"])]
      : action === "move"
        ? ["rapid-advance", "mercenaries"]
        : []
  ).filter((id) => hasTech(g, g.turn, id));
}
export function settlementSpace(g: Game, p: Planet, id = g.turn): number {
  return p.blocked
    ? 0
    : Math.max(
        0,
        p.capacity + (hasTech(g, id, "arcologies") ? 1 : 0) - sum(p.owners),
      );
}

function finishPlanning(g: Game) {
  const owners = Array.from(
    { length: g.players.length },
    (_, i) => (g.first + i) % g.players.length,
  ).filter((id) => hasTech(g, id, "filibuster"));
  if (owners.length) {
    g.turn = owners[0];
    g.pending = { kind: "filibuster", remaining: owners.slice(1) };
  } else startActions(g);
}
function startActions(g: Game) {
  g.phase = "actions";
  advanceActions(g, (g.first + g.players.length - 1) % g.players.length);
}
function advanceActions(g: Game, after: number, remaining = g.players.length) {
  g.pending = null;
  g.context = null;
  if (g.systems.every((s) => s.tokens.length === 0)) {
    g.phase = "investments";
    g.turn = g.first;
    skipEmptyAllocation(g);
    return;
  }
  for (let step = 1; step <= remaining; step++) {
    const id = (after + step) % g.players.length;
    if (eligibleTokens(g, id).length) {
      g.turn = id;
      return;
    }
    if (hasTech(g, id, "insurance")) {
      g.turn = id;
      g.pending = { kind: "insurance", after: id, remaining: remaining - step };
      log(
        g,
        "Insurance: your ACTIONS turn was skipped because none of your tokens was on top. Choose a Credit or a Ship.",
      );
      return;
    }
  }
  throw Error("A token stack has no valid owner.");
}
const legacyRules = (g: Game) => g.revision < g.legacyRulesUntil;
function pauseReserve(
  g: Game,
  owner: number,
  label: string,
  total: number,
  remaining: number,
  effect: ReserveEffect,
  after: Continuation,
  messages: string[] = [],
): boolean {
  if (
    !remaining ||
    g.revision < g.reserveRecoveryFrom ||
    !hasTech(g, owner, "flexible-economy")
  )
    return false;
  const warning = reserveWarning(label, total, total - remaining);
  log(g, `Reserve limit: ${warning}`, owner);
  g.pending = {
    kind: "reserve",
    owner,
    label,
    total,
    remaining,
    effect,
    after,
    messages: [...messages, warning],
  };
  return true;
}
function useRecoveredReserve(
  g: Game,
  command: Extract<Command, { type: "useReserve" }>,
) {
  requireRule(g.pending?.kind === "reserve", "No Reserve recovery is pending.");
  const pending = g.pending,
    p = player(g, pending.owner),
    effect = pending.effect;
  let amount = Math.min(pending.remaining, p.reserve);
  let placements: Record<string, number> = {};
  if (effect.kind === "reinforce") {
    placements = command.ships ?? { [p.home!]: amount };
    const legal = new Set(availableSystems(g, p.id).map((s) => s.id));
    let selected = 0;
    for (const [id, n] of Object.entries(placements)) {
      integer(n, 40);
      requireRule(
        !n || legal.has(id),
        "Place Ships at home or where you have a Settlement.",
      );
      selected += n;
    }
    requireRule(
      selected <= amount,
      "Reinforcements cannot exceed the unfinished allowance or available Reserve.",
    );
    amount = selected;
  }
  if (effect.kind === "settlement") {
    const target = system(g, effect.system).planets.find(
      (planet) => planet.id === effect.planet,
    );
    requireRule(target, "The target planet no longer exists.");
    amount = Math.min(amount, settlementSpace(g, target, p.id));
  }
  requireRule(
    amount > 0,
    "Return a Credit to Reserve, or continue with the current result.",
  );
  if (effect.kind === "production") {
    const credits = integer(command.credits ?? effect.credits, 40);
    requireRule(
      credits <= pending.remaining,
      "Allocate only the unfinished production.",
    );
    const earned = Math.min(amount, credits);
    effect.credits = credits - earned;
    p.credits += earned;
    system(g, effect.system).ships[p.id] += amount - earned;
  } else if (effect.kind === "credits") p.credits += amount;
  else if (effect.kind === "ships")
    system(g, effect.system).ships[p.id] += amount;
  else if (effect.kind === "settlement")
    system(g, effect.system).planets.find(
      (planet) => planet.id === effect.planet,
    )!.owners[p.id] += amount;
  else if (effect.kind === "investment") {
    p.invested += amount;
    if (effect.banking) {
      if (effect.free) p.freeInvestments.push(effect.action);
      else p.investedActions.push(effect.action);
    }
  } else
    for (const [id, n] of Object.entries(placements))
      system(g, id).ships[p.id] += n;
  p.reserve -= amount;
  pending.remaining -= amount;
  log(
    g,
    `${pending.label}: completed ${amount} more with returned Reserve (${pending.total - pending.remaining}/${pending.total} total).`,
    p.id,
  );
  if (!pending.remaining) {
    g.pending = null;
    resumeContinuation(g, pending.after);
  }
}

function reserveWarning(label: string, wanted: number, available: number) {
  return `${label} needed ${wanted} rocket${wanted === 1 ? "" : "s"}, but only ${available} ${available === 1 ? "was" : "were"} available in Reserve. The effect could not be completed in full.`;
}
function notice(
  g: Game,
  title: string,
  messages: string[],
  after: Continuation,
) {
  for (const message of messages)
    if (
      !g.log.some(
        (l) => l.revision === g.revision + 1 && l.text.includes(message),
      )
    )
      log(g, `${title}: ${message}`);
  g.pending = { kind: "ack", title, messages, after };
}
export function beforeActionHooks(g: Game, action: Action): string[] {
  return (
    action === "settle"
      ? ["frontier-pioneer", "government-incentives"]
      : action === "attack"
        ? ["cloaking"]
        : []
  ).filter((id) => hasTech(g, g.turn, id));
}
function actionBody(g: Game) {
  const c = g.context!;
  c.stage = "body";
  g.pending = {
    kind: "action",
    system: c.system,
    action: c.kind,
    source: c.source
      ? CARD_MAP[c.source].title
      : `Your ${c.kind.toUpperCase()} action`,
    free: Boolean(c.source),
  };
}
function startAction(
  g: Game,
  kind: Action,
  active: string,
  source?: string,
  choices?: ActionChoices,
) {
  // Keep interrupted actions as plain data so nested choices survive autosave.
  const parent = source ? (g.context ?? undefined) : undefined;
  g.context = {
    actor: g.turn,
    system: active,
    kind,
    bank: Boolean(choices?.bank),
    ...(source ? { source } : {}),
    ...(parent ? { parent } : {}),
    stage: "before",
    beforeHooks: beforeActionHooks(g, kind),
    afterHooks: [],
  };
  if (source)
    log(
      g,
      `${CARD_MAP[source].title}: begin a free ${kind.toUpperCase()} action in ${nameOf(system(g, active))}.`,
    );
  if (g.context.beforeHooks!.length) runBeforeHooks(g);
  else if (choices) resolveActionBody(g, choices);
  else actionBody(g);
}
function runBeforeHooks(g: Game) {
  const c = g.context!;
  g.pending = null;
  const hook = c.beforeHooks?.shift();
  if (!hook) {
    actionBody(g);
    return;
  }
  if (hook === "government-incentives") {
    startAction(g, "move", c.system, "tech.government-incentives");
    return;
  }
  const p = player(g),
    s = system(g, c.system),
    amount = Math.min(1, p.reserve);
  p.reserve -= amount;
  s.ships[p.id] += amount;
  log(
    g,
    `${CARD_MAP[`tech.${hook}`].title}: added ${amount} Ship from Reserve in ${nameOf(s)}.`,
  );
  if (
    !amount &&
    pauseReserve(
      g,
      p.id,
      CARD_MAP[`tech.${hook}`].title,
      1,
      1,
      { kind: "ships", system: s.id },
      { kind: "beforeHooks" },
    )
  )
    return;
  if (!amount)
    notice(
      g,
      "Reserve empty",
      [reserveWarning(CARD_MAP[`tech.${hook}`].title, 1, 0)],
      { kind: "beforeHooks" },
    );
  else runBeforeHooks(g);
}
function runAfterHooks(g: Game) {
  g.pending = null;
  const c = g.context!;
  if (
    c.kind === "move" &&
    (c.afterHooks?.length ?? 0) > 1 &&
    !c.afterOrderChosen
  ) {
    g.pending = { kind: "afterOrder", system: c.system };
    return;
  }
  const hook = c.afterHooks?.shift();
  if (hook === "population-explosion") {
    startAction(g, "settle", c.system, "tech.population-explosion");
    return;
  }
  if (hook === "spice") {
    startAction(g, "produce", c.system, "tech.spice");
    return;
  }
  if (hook === "mercenaries") {
    g.pending = { kind: "mercenaries", system: c.system };
    return;
  }
  if (hook === "rapid-advance") {
    const s = system(g, c.system);
    if (
      s.revealed &&
      s.ships[g.turn] > 0 &&
      s.planets.some((p) => settlementSpace(g, p) > 0)
    )
      g.pending = { kind: "rapid", system: s.id };
    else {
      log(g, "Rapid Advance: no legal Ship conversion is available.");
      runAfterHooks(g);
    }
    return;
  }
  if (c.parent) {
    g.context = c.parent;
    if (g.context.stage === "before") runBeforeHooks(g);
    else runAfterHooks(g);
  } else if (g.phase === "endgame") nextEndgame(g);
  else advanceActions(g, c.actor);
}
function finishAction(g: Game, messages: string[] = []) {
  const c = g.context;
  requireRule(c, "No action is being resolved.");
  c.stage = "after";
  // Finish Population Explosion's entire chain before starting Spice's bonus.
  c.afterHooks = afterActionHooks(g, c.kind, c.source);
  if (
    g.phase === "actions" &&
    c.bank &&
    !c.bankDone &&
    hasTech(g, c.actor, "banking")
  ) {
    c.bankDone = true;
    if (player(g).reserve > 0) {
      player(g).reserve--;
      player(g).invested++;
      if (c.parent) player(g).freeInvestments.push(c.kind);
      else player(g).investedActions.push(c.kind);
      log(g, "Banking: invested one Reserve rocket.");
    } else {
      if (
        pauseReserve(
          g,
          c.actor,
          "Banking",
          1,
          1,
          {
            kind: "investment",
            action: c.kind,
            banking: true,
            free: Boolean(c.parent),
          },
          { kind: "afterHooks" },
          messages,
        )
      )
        return;
      messages.push(reserveWarning("Banking", 1, 0));
    }
  }
  if (messages.length)
    notice(g, "Reserve limit", messages, { kind: "afterHooks" });
  else runAfterHooks(g);
}
function resolveActionBody(g: Game, choices: ActionChoices) {
  const c = g.context!;
  c.stage = "body";
  g.pending = null;
  const p = player(g),
    s = system(g, c.system);
  if (c.kind === "move")
    beginMove(
      g,
      s,
      choices.sources ?? {},
      Boolean(choices.reveal),
      choices.carried,
      choices.passengerLosses,
    );
  else if (c.kind === "produce") {
    const available = p.reserve,
      wanted = production(g, s),
      total = Math.min(available, wanted),
      credits = integer(choices.credits ?? 0, 40);
    requireRule(credits <= total, "Production allocation exceeds output.");
    p.reserve -= total;
    p.credits += credits;
    s.ships[p.id] += total - credits;
    log(
      g,
      `Produced ${credits} Credits and ${total - credits} Ships in ${nameOf(s)}.`,
    );
    if (
      total < wanted &&
      pauseReserve(
        g,
        p.id,
        "Production",
        wanted,
        wanted - total,
        { kind: "production", system: s.id, credits: 0 },
        { kind: "productionDone" },
      )
    )
      return;
    finishAction(
      g,
      total < wanted ? [reserveWarning("Production", wanted, available)] : [],
    );
  } else if (c.kind === "attack")
    attack(
      g,
      s,
      choices.attack ?? { sacrifice: 0, ships: {}, settlements: {} },
    );
  else if (choices.settlements || choices.replacements)
    beginSettlementBatch(g, s, choices.settlements ?? {}, choices.replacements);
  else if (
    s.revealed &&
    s.ships[g.turn] > 0 &&
    (s.planets.some((p) => settlementSpace(g, p) > 0) || canSoylent(g, s))
  )
    g.pending = { kind: "settle", system: s.id };
  else {
    log(g, "Completed an empty SETTLE action.");
    finishAction(g);
  }
}
function revealEvents(g: Game) {
  g.finalEconomy = g.events.length === 0;
  g.revealedEvents = g.finalEconomy ? [] : g.events.splice(0, 2);
  if (g.revealedEvents.length) {
    g.eventHistory.push(g.revealedEvents.slice());
    log(
      g,
      `Round tracker: ${g.events.length} Event cards remain. Effects and bids are disabled.`,
    );
  } else
    log(
      g,
      "The Event deck cannot draw another pair. Finish Tech purchases, then score.",
    );
  g.phase = "event";
  g.turn = g.first;
}
function passFirst(g: Game) {
  const next = (g.first + 1) % g.players.length;
  log(g, `Passed first player to ${player(g, next).name}.`, null);
  nextRound(g);
}
export function reinforceAllowance(g: Game, id = g.turn) {
  return hasTech(g, id, "assembly-line") ? 4 : 3;
}
export function isFinalRound(g: Game) {
  return g.finalEconomy || g.round >= (g.players.length <= 3 ? 6 : 5);
}
export function reinforceCount(g: Game, id = g.turn) {
  return Math.min(player(g, id).reserve, reinforceAllowance(g, id));
}
function advanceAllocation(g: Game) {
  const next = (g.turn + 1) % g.players.length;
  if (next === g.first) {
    if (g.phase === "investments") revealEvents(g);
    else passFirst(g);
  } else {
    g.turn = next;
    skipEmptyAllocation(g);
  }
}
function skipEmptyAllocation(g: Game) {
  if (g.phase === "reinforce") {
    if (
      reinforceCount(g) === 0 &&
      pauseReserve(
        g,
        g.turn,
        "Reinforcements",
        reinforceAllowance(g),
        reinforceAllowance(g),
        { kind: "reinforce" },
        { kind: "allocationDone" },
      )
    )
      return;
    if (reinforceCount(g) === 0)
      notice(
        g,
        "Reserve empty",
        [reserveWarning("Reinforcements", reinforceAllowance(g), 0)],
        { kind: "allocationDone" },
      );
    return;
  }
  for (let i = 0; i < g.players.length; i++) {
    if (player(g).invested > 0) return;
    const next = (g.turn + 1) % g.players.length;
    if (next === g.first) {
      revealEvents(g);
      return;
    }
    g.turn = next;
  }
}
function finishTechTurn(g: Game) {
  g.pending = null;
  const next = (g.turn + 1) % g.players.length;
  if (next !== g.first) {
    g.turn = next;
    return;
  }
  if (g.finalEconomy) {
    startEndgame(g);
    return;
  }
  g.phase = "reinforce";
  g.turn = g.first;
  skipEmptyAllocation(g);
}
function nextRound(g: Game) {
  g.round++;
  g.first = (g.first + 1) % g.players.length;
  g.turn = g.first;
  g.phase = "plan";
  for (const p of g.players) {
    p.used = [];
    p.investedActions = [];
    p.freeInvestments = [];
    p.unplaced = 4;
  }
  g.disruptions = g.disruptions.filter((d) => d.round >= g.round);
  log(g, `Round ${g.round}: plan four action tokens each.`, null);
}
function resumeContinuation(g: Game, after: Continuation) {
  if (after.kind === "productionDone") finishAction(g);
  else if (after.kind === "insuranceNext")
    advanceActions(g, after.after, after.remaining);
  else if (after.kind === "beforeHooks") runBeforeHooks(g);
  else if (after.kind === "afterHooks") runAfterHooks(g);
  else if (after.kind === "actionDone") advanceActions(g, after.actor);
  else if (after.kind === "techDone") finishTechTurn(g);
  else if (after.kind === "allocationDone") advanceAllocation(g);
  else if (after.kind === "settlementNext")
    continueSettlement(g, system(g, after.system), after.resume);
  else {
    const s = system(g, after.system);
    place(
      g,
      s,
      s.planets.find((p) => p.id === after.planet)!,
      after.count,
      after.from,
      after.resume,
    );
  }
}

export function scoreGame(g: Game): Score[] {
  return g.players.map((p) => {
    const planets = sum(
      g.systems.map(
        (s) => s.planets.filter((planet) => planet.owners[p.id] > 0).length,
      ),
    );
    const systems = g.systems.filter((s) => s.ships[p.id] > 0).length;
    return {
      player: p.id,
      planets,
      systems,
      techs: p.techs.length,
      credits: p.credits,
      total: planets + systems + p.techs.length,
    };
  });
}
function startEndgame(g: Game) {
  g.endgameQueue = Array.from(
    { length: g.players.length },
    (_, i) => (g.first + i) % g.players.length,
  ).filter((id) => hasTech(g, id, "eminent-domain"));
  nextEndgame(g);
}
function nextEndgame(g: Game) {
  g.pending = null;
  g.context = null;
  const id = g.endgameQueue.shift();
  if (id === undefined) {
    finishGame(g);
    return;
  }
  g.phase = "endgame";
  g.turn = id;
  g.pending = { kind: "eminent" };
  log(
    g,
    "Eminent Domain: choose whether to perform a free SETTLE at home before scoring.",
  );
}
function finishGame(g: Game) {
  g.phase = "finished";
  g.pending = null;
  g.context = null;
  g.scores = scoreGame(g);
  const top = Math.max(...g.scores.map((s) => s.total));
  const tied = g.scores.filter((s) => s.total === top);
  const credits = Math.max(...tied.map((s) => s.credits));
  g.winners = tied.filter((s) => s.credits === credits).map((s) => s.player);
  log(
    g,
    `${g.winners.map((id) => player(g, id).name).join(" and ")} ${g.winners.length > 1 ? "share the victory" : "wins"}!`,
    null,
  );
}

function checkCarried(
  g: Game,
  sources: Record<string, number>,
  carried: MovePayload["carried"] = {},
) {
  for (const [origin, owners] of Object.entries(carried)) {
    const from = system(g, origin);
    let passengers = 0;
    for (const [raw, amount] of Object.entries(owners)) {
      const id = integer(Number(raw), g.players.length - 1);
      integer(amount, 40);
      requireRule(
        !amount || id !== g.turn,
        "Gravity Drive carries opponents, not your own Ships.",
      );
      requireRule(
        amount <= from.ships[id],
        "Not enough passenger Ships at their origin.",
      );
      passengers += amount;
    }
    requireRule(
      passengers <= (sources[origin] ?? 0),
      "Each incoming carrier can carry only one opponent Ship from the same origin.",
    );
    requireRule(
      !passengers || hasTech(g, g.turn, "gravity-drive"),
      "Gravity Drive is required to carry opponent Ships.",
    );
  }
}
export function movementLosses(
  g: Game,
  target: System,
  sources: Record<string, number>,
  carried: MovePayload["carried"] = {},
  requested?: MovePayload["passengerLosses"],
) {
  const incoming = sum(Object.values(sources)),
    passengers = Array(g.players.length).fill(0) as number[];
  for (const owners of Object.values(carried))
    for (const [raw, amount] of Object.entries(owners)) {
      const id = integer(Number(raw), g.players.length - 1);
      passengers[id] += integer(amount, 40);
    }
  const total = Math.min(incoming + sum(passengers), blackHoles(target));
  const lost = Array(g.players.length).fill(0) as number[];
  if (requested) {
    for (const [raw, amount] of Object.entries(requested)) {
      const id = integer(Number(raw), g.players.length - 1);
      lost[id] = integer(amount, 40);
      requireRule(
        lost[id] <= passengers[id],
        "You cannot lose more passenger Ships than are being carried.",
      );
    }
  } else {
    let left = total;
    for (let id = 0; id < passengers.length; id++) {
      lost[id] = Math.min(left, passengers[id]);
      left -= lost[id];
    }
  }
  const own = total - sum(lost);
  requireRule(
    own >= 0 && own <= incoming,
    "Choose black-hole casualties from the incoming carrier and passenger Ships.",
  );
  return { total, own, passengers: lost, carried: passengers, incoming };
}
function moveShips(
  g: Game,
  target: System,
  sources: Record<string, number>,
  requireEntry?: string[],
  carried: MovePayload["carried"] = {},
  passengerLosses?: MovePayload["passengerLosses"],
) {
  let incoming = 0;
  for (const [id, raw] of Object.entries(sources)) {
    const n = integer(raw, 40),
      from = system(g, id);
    requireRule(
      n <= from.ships[g.turn],
      "Not enough Ships in an origin system.",
    );
    if (n)
      requireRule(
        canMove(g, g.turn, from, target),
        "An origin is not connected by a legal movement route.",
      );
    incoming += n;
  }
  if (requireEntry)
    requireRule(
      requireEntry.some((id) => (sources[id] ?? 0) > 0),
      "At least one Ship must finish entering through the exploration route.",
    );
  checkCarried(g, sources, carried);
  const losses = movementLosses(g, target, sources, carried, passengerLosses);
  for (const [id, n] of Object.entries(sources))
    system(g, id).ships[g.turn] -= n;
  for (const [id, owners] of Object.entries(carried))
    for (const [owner, n] of Object.entries(owners))
      system(g, id).ships[Number(owner)] -= n;
  target.ships[g.turn] += incoming - losses.own;
  player(g).credits += losses.own;
  for (let id = 0; id < g.players.length; id++) {
    target.ships[id] += losses.carried[id] - losses.passengers[id];
    player(g, id).credits += losses.passengers[id];
  }
  log(
    g,
    `Moved ${incoming} Ship${incoming === 1 ? "" : "s"} into ${nameOf(target)}${losses.total ? `; ${losses.total} lost to black holes and returned as Credits` : ""}.`,
  );
  if (sum(losses.carried))
    log(
      g,
      `Gravity Drive: carried ${sum(losses.carried)} opponent Ships; ${losses.own} own and ${sum(losses.passengers)} passenger Ships lost on entry.`,
    );
  finishAction(g);
}
function beginMove(
  g: Game,
  target: System,
  sources: Record<string, number>,
  reveal = false,
  carried: MovePayload["carried"] = {},
  passengerLosses?: MovePayload["passengerLosses"],
) {
  let incoming = 0;
  for (const [id, raw] of Object.entries(sources)) {
    const n = integer(raw, 40);
    const from = system(g, id);
    requireRule(
      n <= from.ships[g.turn] && (!n || canMove(g, g.turn, from, target)),
      "Select Ships with a legal entry route.",
    );
    incoming += n;
  }
  checkCarried(g, sources, carried);
  if (target.revealed || (!incoming && !reveal)) {
    moveShips(g, target, sources, undefined, carried, passengerLosses);
    return;
  }
  const candidates = g.systems.filter(
    (s) => s.ships[g.turn] > 0 && canMove(g, g.turn, s, target),
  );
  const rotations = reveal
    ? [
        ...new Set(
          candidates.flatMap((s) =>
            legalOrientations(g, target.id, { [s.id]: 1 }),
          ),
        ),
      ].sort((a, b) => a - b)
    : legalOrientations(g, target.id, sources);
  requireRule(
    rotations.length,
    "No legal orientation preserves the entry route and board connectivity.",
  );
  target.revealed = true;
  for (const p of target.planets)
    if (p.capacity === 2) p.explore = g.exploreBag.pop() ?? null;
  g.pending = {
    kind: "orient",
    system: target.id,
    sources,
    rotations,
    ...(Object.keys(carried).length ? { carried } : {}),
    entrySources: reveal
      ? candidates.map((s) => s.id)
      : Object.keys(sources).filter((id) => sources[id] > 0),
  };
  log(
    g,
    `Explored ${nameOf(target)}. Choose its orientation; this reveal cannot be undone.`,
  );
}

function continueSettlement(g: Game, s: System, resume: SettlementResume) {
  if (resume === "rapid") {
    runAfterHooks(g);
    return;
  }
  if (resume === "genesis") {
    finishTechTurn(g);
    return;
  }
  if (g.context?.settlementQueue) {
    resolveSettlementQueue(g, s);
    return;
  }
  if (
    s.revealed &&
    s.ships[g.turn] > 0 &&
    (s.planets.some((p) => settlementSpace(g, p) > 0) || canSoylent(g, s))
  )
    g.pending = { kind: "settle", system: s.id };
  else finishAction(g);
}
function replacementPlacements(
  g: Game,
  s: System,
  replacements: Replacements = {},
  reserved: SettlementPlacement[] = [],
  additions: Record<string, number> = {},
): SettlementPlacement[] {
  return Object.entries(replacements)
    .map(([id, targets]) => {
      const planet = s.planets.find((p) => p.id === id);
      requireRule(planet, "Choose a planet in the active system.");
      let count = 0;
      for (const [raw, amount] of Object.entries(targets)) {
        const owner = integer(Number(raw), g.players.length - 1);
        integer(amount, 40);
        const fixed = sum(
          reserved
            .filter((p) => p.planet === id)
            .map((p) => p.replace?.[raw] ?? 0),
        );
        requireRule(
          !amount || owner !== g.turn,
          "Soylent Green replaces opponents' Settlements, not yours.",
        );
        requireRule(
          amount <= planet.owners[owner] - fixed,
          "Other committed replacements must remain allocated.",
        );
        count += amount;
      }
      requireRule(
        !count || canSoylent(g, s, g.turn, additions),
        "Soylent Green requires every unblocked planet in this system to be full.",
      );
      return { planet: id, count, replace: targets };
    })
    .filter((p) => p.count > 0);
}
function replaceSettlements(
  g: Game,
  s: System,
  planet: Planet,
  targets: Record<string, number>,
) {
  const count = sum(Object.values(targets));
  replacementPlacements(g, s, { [planet.id]: targets });
  requireRule(
    count <= s.ships[g.turn],
    "Not enough Ships for these replacements.",
  );
  for (const [raw, n] of Object.entries(targets)) {
    const owner = Number(raw);
    planet.owners[owner] -= n;
    player(g, owner).credits += n;
  }
  s.ships[g.turn] -= count;
  planet.owners[g.turn] += count;
  log(
    g,
    `Soylent Green: replaced ${count} opposing Settlements in ${nameOf(s)}; removed rockets returned as their owners' Credits.`,
  );
}
function resolveSettlementQueue(g: Game, s: System) {
  const next = g.context?.settlementQueue?.shift();
  if (!next) {
    finishAction(g);
    return;
  }
  const planet = s.planets.find((p) => p.id === next.planet)!;
  if (next.replace) {
    g.context!.replacement = next.replace;
    settlePlanet(g, s, planet, next.count, "ships", "settle");
  } else if (next.count > settlementSpace(g, planet))
    place(g, s, planet, next.count, "ships", "settle");
  else settlePlanet(g, s, planet, next.count, "ships", "settle");
}
function beginSettlementBatch(
  g: Game,
  s: System,
  placements: Record<string, number>,
  replacements: Replacements = {},
) {
  let total = 0;
  const queue = Object.entries(placements)
    .map(([id, raw]) => {
      const count = integer(raw, 40),
        planet = s.planets.find((p) => p.id === id);
      requireRule(
        planet && count <= settlementSpace(g, planet),
        "Choose Settlements that fit a planet in this system.",
      );
      total += count;
      return { planet: id, count };
    })
    .filter((p) => p.count > 0);
  const replace = replacementPlacements(
    g,
    s,
    replacements,
    [],
    Object.fromEntries(queue.map((p) => [p.planet, p.count])),
  );
  total += sum(replace.map((p) => p.count));
  requireRule(
    total <= s.ships[g.turn],
    "Not enough Ships for these Settlements.",
  );
  requireRule(
    s.revealed || total === 0,
    "Explore this system before settling hidden planets.",
  );
  requireRule(g.context?.kind === "settle", "No SETTLE is active.");
  g.context.settlementQueue = [...queue, ...replace];
  resolveSettlementQueue(g, s);
}
function place(
  g: Game,
  s: System,
  planet: Planet,
  count: number,
  from: "ships" | "reserve",
  resume: SettlementResume,
) {
  if (from === "ships" && resume === "settle" && g.context?.replacement) {
    replaceSettlements(g, s, planet, g.context.replacement);
    delete g.context.replacement;
    continueSettlement(g, s, resume);
    return;
  }
  const available = from === "ships" ? s.ships[g.turn] : player(g).reserve,
    room = settlementSpace(g, planet),
    actual = Math.min(count, room, available);
  if (from === "ships") s.ships[g.turn] -= actual;
  else player(g).reserve -= actual;
  planet.owners[g.turn] += actual;
  log(
    g,
    `Placed ${actual} Settlement${actual === 1 ? "" : "s"} on a planet in ${nameOf(s)}.`,
  );
  if (from === "ships" && resume === "settle" && actual < count) {
    g.pending = {
      kind: "redistribute",
      system: s.id,
      amount: count - actual,
      resume,
    };
    log(
      g,
      `${count - actual} committed Settlement${count - actual === 1 ? "" : "s"} no longer fit. Choose another planet or keep those rockets as Ships; other committed placements stay fixed.`,
    );
    return;
  }
  if (from === "reserve" && actual < Math.min(count, room)) {
    if (
      pauseReserve(
        g,
        g.turn,
        "Genesis Settlement",
        Math.min(count, room),
        Math.min(count, room) - actual,
        { kind: "settlement", system: s.id, planet: planet.id },
        { kind: "settlementNext", system: s.id, resume },
      )
    )
      return;
    notice(
      g,
      "Reserve limit",
      [reserveWarning("Genesis Settlement", Math.min(count, room), available)],
      { kind: "settlementNext", system: s.id, resume },
    );
    return;
  }
  continueSettlement(g, s, resume);
}
function settlePlanet(
  g: Game,
  s: System,
  planet: Planet,
  count: number,
  from: "ships" | "reserve",
  resume: SettlementResume,
) {
  integer(count, 40);
  requireRule(
    count > 0 &&
      (count <= settlementSpace(g, planet) ||
        (resume === "settle" && Boolean(g.context?.replacement))),
    "Choose a number that fits this planet.",
  );
  requireRule(
    count <= (from === "ships" ? s.ships[g.turn] : player(g).reserve),
    "Not enough rockets to settle.",
  );
  const effect = planet.explore;
  planet.explore = null;
  if (effect) {
    if (effect === "otherShips" || effect === "otherSettlement") {
      log(
        g,
        `Explore token revealed: choose another player to receive ${effect === "otherShips" ? "up to 2 Ships here" : "1 Settlement on this planet"}.`,
      );
      g.pending = {
        kind: "explore",
        system: s.id,
        planet: planet.id,
        effect,
        resume,
        count,
        from,
      };
      return;
    }
    const messages: string[] = [];
    if (effect === "blackHole") {
      s.extraHoles++;
      messages.push(
        "A black hole remains in this system. Existing Ships are unharmed.",
      );
    } else {
      const wanted = Number(effect.slice(-1)),
        available = player(g).reserve,
        amount = Math.min(available, wanted);
      player(g).reserve -= amount;
      player(g).credits += amount;
      messages.push(
        `+${wanted} Credits: gained ${amount} Credit${amount === 1 ? "" : "s"} from Reserve.`,
      );
      if (
        amount < wanted &&
        pauseReserve(
          g,
          g.turn,
          "Explore Credits",
          wanted,
          wanted - amount,
          { kind: "credits" },
          {
            kind: "place",
            system: s.id,
            planet: planet.id,
            count,
            from,
            resume,
          },
          messages,
        )
      ) {
        messages.forEach((message) =>
          log(g, `Explore token revealed: ${message}`),
        );
        return;
      }
      if (amount < wanted)
        messages.push(reserveWarning("Explore Credits", wanted, available));
    }
    messages.forEach((m) => log(g, `Explore token revealed: ${m}`));
    notice(g, "Explore result", messages, {
      kind: "place",
      system: s.id,
      planet: planet.id,
      count,
      from,
      resume,
    });
    return;
  }
  place(g, s, planet, count, from, resume);
}

function attack(g: Game, s: System, payload: AttackPayload) {
  const n = integer(payload.sacrifice, 40);
  requireRule(n <= s.ships[g.turn], "Not enough Ships to sacrifice.");
  let ships = 0,
    settlements = 0;
  for (const [id, raw] of Object.entries(payload.ships)) {
    const target = integer(Number(id), g.players.length - 1);
    const amount = integer(raw, 40);
    requireRule(
      target !== g.turn || amount === 0,
      "You cannot attack your own Ships.",
    );
    requireRule(amount <= s.ships[target], "Too many target Ships.");
    ships += amount;
  }
  for (const [pid, targets] of Object.entries(payload.settlements)) {
    const planet = s.planets.find((p) => p.id === pid);
    requireRule(planet, "Unknown target planet.");
    for (const [id, raw] of Object.entries(targets)) {
      const target = integer(Number(id), g.players.length - 1);
      const amount = integer(raw, 40);
      requireRule(
        !amount || (target !== g.turn && planet.owners[g.turn] === 0),
        "You cannot attack Settlements on a planet you share.",
      );
      requireRule(
        amount <= planet.owners[target],
        "Too many target Settlements.",
      );
      requireRule(
        !amount ||
          !patrolBlocks(g, s, target, payload.ships[String(target)] ?? 0),
        "Patrol protects these Settlements until all that player's Ships are eliminated, including Ships targeted in this attack.",
      );
      settlements += amount;
    }
  }
  requireRule(
    attackCost(g, ships, settlements) <= n,
    hasTech(g, g.turn, "death-sun")
      ? "These targets exceed the destruction allowed by Death Sun and the sacrificed Ships."
      : "Each sacrificed Ship destroys two Ships OR one Settlement.",
  );
  s.ships[g.turn] -= n;
  player(g).credits += n;
  for (const [id, amount] of Object.entries(payload.ships)) {
    s.ships[Number(id)] -= amount;
    player(g, Number(id)).credits += amount;
  }
  for (const [pid, targets] of Object.entries(payload.settlements)) {
    const planet = s.planets.find((p) => p.id === pid)!;
    for (const [id, amount] of Object.entries(targets)) {
      planet.owners[Number(id)] -= amount;
      player(g, Number(id)).credits += amount;
    }
  }
  log(
    g,
    `Sacrificed ${n} Ships; destroyed ${ships} opposing Ships and ${settlements} Settlements. All casualties become Credits.`,
  );
  finishAction(g);
}
export function patrolBlocks(
  g: Game,
  s: System,
  target: number,
  shipsTargeted = 0,
) {
  return hasTech(g, target, "patrol") && s.ships[target] > shipsTargeted;
}

export function featureOptions(
  g: Game,
  tech: string,
): { system: string; planet?: string; edge?: number }[] {
  const options: { system: string; planet?: string; edge?: number }[] = [];
  if (tech === "tech.rapid-advance") {
    if (g.pending?.kind === "rapid") {
      const s = system(g, g.pending.system);
      if (s.revealed && s.ships[g.turn] > 0)
        for (const p of s.planets)
          if (settlementSpace(g, p) > 0)
            options.push({ system: s.id, planet: p.id });
    }
    return options;
  }
  if (tech === "tech.disruptor" && isFinalRound(g)) return options;
  for (const s of g.systems) {
    if (tech === "tech.disruptor") {
      if (
        !g.disruptions.some((d) => d.round === g.round + 1 && d.system === s.id)
      )
        options.push({ system: s.id });
      continue;
    }
    if (!s.revealed) continue;
    if (tech === "tech.genesis" && player(g).reserve > 0)
      for (const p of s.planets) {
        if (!p.blocked && sum(p.owners) === 0)
          options.push({ system: s.id, planet: p.id });
      }
    if (tech === "tech.planet-killer" && !g.features.blackHole)
      for (const p of s.planets) {
        if (!p.home && !p.blocked) options.push({ system: s.id, planet: p.id });
      }
    if (tech === "tech.artificial-warp" && !g.features.warp)
      options.push({ system: s.id });
    if (tech === "tech.planet-nine" && !g.features.planet)
      options.push({ system: s.id });
    if (tech === "tech.kessler-syndrome" && !g.features.asteroid)
      for (let edge = 0; edge < 6; edge++) {
        if (edges(s).includes(edge)) continue;
        const copy = clone(g);
        system(copy, s.id).extraEdges.push(edge);
        if (boardConnected(copy)) options.push({ system: s.id, edge });
      }
  }
  return options;
}
function buy(
  g: Game,
  tech: string | null,
  fullPrice = false,
  value?: number,
  sabotageTarget?: { player: number; tech: string },
) {
  if (!tech) {
    log(g, "Passed the Tech purchase.");
    finishTechTurn(g);
    return;
  }
  requireRule(
    !purchaseReason(g, tech, g.turn, fullPrice, value, sabotageTarget),
    purchaseReason(g, tech, g.turn, fullPrice, value, sabotageTarget) ??
      "Cannot buy Tech.",
  );
  const p = player(g);
  if (tech === "tech.sabotage")
    requireRule(
      sabotageTarget &&
        sabotageTargets(g).some(
          (t) =>
            t.player === sabotageTarget.player &&
            t.tech === sabotageTarget.tech &&
            Number(CARD_MAP[t.tech].cost) <= value!,
        ),
      "Choose a legal opposing Tech within the undiscounted Sabotage value.",
    );
  const cost = purchaseCost(
    g,
    tech,
    g.turn,
    fullPrice,
    value,
    tech === "tech.sabotage" ? Number(CARD_MAP[sabotageTarget!.tech].cost) : 0,
  );
  p.credits -= cost;
  p.reserve += cost - 1;
  p.techs.push(tech);
  log(g, `Bought ${CARD_MAP[tech].title} for ${cost} Credits.`);
  if (tech === "tech.sabotage") {
    const target = player(g, sabotageTarget!.player);
    target.techs.splice(target.techs.indexOf(sabotageTarget!.tech), 1);
    target.reserve++;
    log(
      g,
      `Sabotage: undiscounted value ${value}; removed ${CARD_MAP[sabotageTarget!.tech].title} from ${target.name}. Its ownership rocket returned to their Reserve.`,
    );
  }
  if (tech === "tech.disruptor" && isFinalRound(g))
    log(
      g,
      "Disruptor has no effect in the last round; its ownership still scores 1 point.",
    );
  const options = featureOptions(g, tech);
  if (tech === "tech.genesis" && options.length)
    g.pending = { kind: "genesis" };
  else if (
    [
      "tech.artificial-warp",
      "tech.kessler-syndrome",
      "tech.planet-killer",
      "tech.planet-nine",
      "tech.disruptor",
    ].includes(tech) &&
    options.length
  )
    g.pending = { kind: "feature", tech, optional: tech !== "tech.disruptor" };
  else finishTechTurn(g);
}
function chooseFeature(
  g: Game,
  command: Extract<Command, { type: "feature" }>,
) {
  const pending = g.pending;
  requireRule(
    pending?.kind === "feature" || pending?.kind === "genesis",
    "There is no feature to place.",
  );
  if (command.skip) {
    requireRule(
      pending.kind === "feature" && pending.optional,
      "This choice is required.",
    );
    finishTechTurn(g);
    return;
  }
  const tech = pending.kind === "genesis" ? "tech.genesis" : pending.tech;
  const valid = featureOptions(g, tech).some(
    (o) =>
      o.system === command.system &&
      o.planet === command.planet &&
      o.edge === command.edge,
  );
  requireRule(
    valid && command.system,
    "Choose one of the legal feature locations.",
  );
  const s = system(g, command.system);
  if (tech === "tech.genesis") {
    settlePlanet(
      g,
      s,
      s.planets.find((p) => p.id === command.planet)!,
      1,
      "reserve",
      "genesis",
    );
    return;
  }
  if (tech === "tech.disruptor")
    g.disruptions.push({ owner: g.turn, system: s.id, round: g.round + 1 });
  if (tech === "tech.artificial-warp") {
    s.extraWarp = true;
    g.features.warp = true;
  }
  if (tech === "tech.kessler-syndrome") {
    s.extraEdges.push(command.edge!);
    g.features.asteroid = true;
  }
  if (tech === "tech.planet-killer") {
    const planet = s.planets.find((p) => p.id === command.planet)!;
    for (const p of g.players) {
      p.credits += planet.owners[p.id];
      planet.owners[p.id] = 0;
    }
    planet.blocked = true;
    s.extraHoles++;
    g.features.blackHole = true;
  }
  if (tech === "tech.planet-nine") {
    const warp = warpPosition(s);
    const { x, y } = findOpenSpace(s, 0.18, 0.156, [
      ...blackHolePositions(s).map((p) => ({
        ...p,
        radiusX: p.radius / Math.sqrt(3) / 100,
        radiusY: p.radius / 200,
      })),
      ...(warp
        ? [
            {
              ...warp,
              radiusX: WARP_WIDTH / 2 / Math.sqrt(3) / 100,
              radiusY: WARP_HEIGHT / 400,
            },
          ]
        : []),
    ]);
    s.planets.push({
      id: `${s.id}.extra`,
      capacity: 1,
      home: false,
      owners: Array(g.players.length).fill(0),
      x,
      y,
      blocked: false,
      explore: null,
    });
    g.features.planet = true;
  }
  log(g, `${CARD_MAP[tech].title}: placed its effect in ${nameOf(s)}.`);
  finishTechTurn(g);
}

export function applyCommand(
  state: Game,
  actor: number,
  command: Command,
  expectedRevision = state.revision,
): Game {
  requireRule(
    expectedRevision === state.revision,
    "The game changed. Refresh your choices.",
  );
  requireRule(
    (actor === state.turn || command.type === "returnCredits") &&
      state.phase !== "finished",
    "It is not this player’s turn.",
  );
  command = clone(command);
  const g = clone(state);
  const p = player(g, actor);
  if (command.type === "useReserve") useRecoveredReserve(g, command);
  else if (command.type === "finishReserve") {
    requireRule(
      g.pending?.kind === "reserve",
      "No Reserve recovery is pending.",
    );
    const pending = g.pending;
    g.pending = null;
    log(
      g,
      `${pending.label}: continued with ${pending.total - pending.remaining}/${pending.total}; ${pending.remaining} left uncompleted.`,
      pending.owner,
    );
    resumeContinuation(g, pending.after);
  } else if (command.type === "returnCredits") {
    requireRule(
      hasTech(g, actor, "flexible-economy"),
      "Flexible Economy is required to return Credits.",
    );
    const n = integer(command.count, 40);
    requireRule(
      n > 0 && n <= p.credits,
      "Choose available Credits to return to Reserve.",
    );
    p.credits -= n;
    p.reserve += n;
    log(g, `Flexible Economy: returned ${n} Credits to Reserve.`, actor);
  } else if (command.type === "home") {
    requireRule(
      g.phase === "homes" && !g.pending,
      "Choose homes during setup.",
    );
    const s = system(g, command.system);
    const home = s.planets.find((p) => p.home);
    requireRule(
      s.revealed && home && !g.players.some((p) => p.home === s.id),
      "Choose an unclaimed home system.",
    );
    p.home = s.id;
    home.owners[p.id] = 3;
    s.ships[p.id] = 3;
    p.reserve -= 6;
    log(g, `Chose ${nameOf(s)} as home.`);
    if (g.players.every((p) => p.home)) {
      g.phase = "plan";
      g.turn = g.first;
    } else g.turn++;
  } else if (command.type === "plan") {
    requireRule(
      g.phase === "plan" && !g.pending && p.unplaced > 0,
      "Place one token during PLAN.",
    );
    const s = system(g, command.system);
    requireRule(
      canPlan(g, s),
      "Disruptor prevents your token placement here this round.",
    );
    s.tokens.push(p.id);
    p.unplaced--;
    log(g, `Placed an action chip in ${nameOf(s)}.`);
    if (g.players.every((p) => p.unplaced === 0)) finishPlanning(g);
    else {
      do {
        g.turn = (g.turn + 1) % g.players.length;
      } while (player(g).unplaced === 0);
    }
  } else if (command.type === "planPass") {
    requireRule(
      g.phase === "plan" &&
        !g.pending &&
        p.unplaced > 0 &&
        hasTech(g, actor, "strategic-stall") &&
        p.stalledRound !== g.round,
      "Strategic Stall permits one PLAN pass per round.",
    );
    p.stalledRound = g.round;
    log(g, "Strategic Stall: passed without placing an action token.");
    do {
      g.turn = (g.turn + 1) % g.players.length;
    } while (player(g).unplaced === 0);
  } else if (command.type === "filibuster") {
    requireRule(
      g.pending?.kind === "filibuster",
      "No Filibuster decision is pending.",
    );
    const remaining = g.pending.remaining;
    if (!command.skip) {
      const s = system(g, command.system!);
      const index = integer(command.index ?? -1, s.tokens.length - 1);
      requireRule(
        s.tokens[index] === actor,
        "Choose one of your own action tokens.",
      );
      s.tokens.splice(index, 1);
      s.tokens.push(actor);
      log(g, `Filibuster: moved your token to the top of ${nameOf(s)}.`);
    } else log(g, "Filibuster: declined to move a token.");
    if (remaining.length) {
      g.turn = remaining[0];
      g.pending = { kind: "filibuster", remaining: remaining.slice(1) };
    } else startActions(g);
  } else if (command.type === "insurance") {
    requireRule(
      g.pending?.kind === "insurance",
      "No Insurance reward is pending.",
    );
    const after = g.pending.after,
      remaining = g.pending.remaining;
    if (command.system)
      requireRule(
        system(g, command.system).planets.some((p) => p.owners[actor] > 0),
        "Insurance Ships need a system with one of your Settlements.",
      );
    if (p.reserve > 0) {
      p.reserve--;
      if (command.system) system(g, command.system).ships[actor]++;
      else p.credits++;
      log(
        g,
        `Insurance: gained 1 ${command.system ? `Ship in ${nameOf(system(g, command.system))}` : "Credit"} from Reserve.`,
      );
      advanceActions(g, after, remaining);
    } else if (
      pauseReserve(
        g,
        actor,
        "Insurance",
        1,
        1,
        command.system
          ? { kind: "ships", system: command.system }
          : { kind: "credits" },
        { kind: "insuranceNext", after, remaining },
      )
    ) {
      // The skipped-turn reward resumes only after recovery is completed or declined.
    } else
      notice(g, "Reserve empty", [reserveWarning("Insurance", 1, 0)], {
        kind: "insuranceNext",
        after,
        remaining,
      });
  } else if (command.type === "eminent") {
    requireRule(
      g.phase === "endgame" && g.pending?.kind === "eminent",
      "No Eminent Domain decision is pending.",
    );
    g.pending = null;
    if (command.use) startAction(g, "settle", p.home!, "tech.eminent-domain");
    else {
      log(g, "Eminent Domain: declined the free home SETTLE.");
      nextEndgame(g);
    }
  } else if (command.type === "orderAfter") {
    requireRule(
      g.pending?.kind === "afterOrder" && g.context?.kind === "move",
      "No after-MOVE ordering choice is pending.",
    );
    const index = g.context.afterHooks!.indexOf(command.tech);
    requireRule(index >= 0, "Choose a pending after-MOVE effect.");
    g.context.afterHooks!.splice(index, 1);
    g.context.afterHooks!.unshift(command.tech);
    g.context.afterOrderChosen = true;
    runAfterHooks(g);
  } else if (command.type === "mercenaries") {
    requireRule(
      g.pending?.kind === "mercenaries",
      "No Mercenaries effect is pending.",
    );
    const n = integer(command.count, 3),
      s = system(g, g.pending.system);
    requireRule(n <= p.credits, "Mercenaries converts existing Credits only.");
    p.credits -= n;
    s.ships[actor] += n;
    log(g, `Mercenaries: converted ${n} Credits into Ships in ${nameOf(s)}.`);
    runAfterHooks(g);
  } else if (command.type === "resolve") {
    requireRule(
      g.phase === "actions" && !g.pending,
      "Resolve an available action token.",
    );
    const s = system(g, command.system);
    requireRule(
      s.tokens[s.tokens.length - 1] === actor,
      "Only a stack with your chip on top can be resolved.",
    );
    requireRule(
      ["move", "settle", "produce", "attack"].includes(command.action) &&
        !p.used.includes(command.action),
      "Choose an unused action slot.",
    );
    s.tokens.pop();
    p.used.push(command.action);
    g.context = {
      actor,
      system: s.id,
      kind: command.action,
      bank: Boolean(command.bank),
    };
    if (command.invest) {
      const available = p.reserve;
      p.investedActions.push(command.action);
      if (p.reserve > 0) {
        p.reserve--;
        p.invested++;
      }
      log(g, `Invested the ${command.action} slot.`);
      if (
        available === 0 &&
        pauseReserve(
          g,
          actor,
          "Investment",
          1,
          1,
          {
            kind: "investment",
            action: command.action,
            banking: false,
            free: false,
          },
          { kind: "actionDone", actor },
        )
      ) {
        // The used slot stays committed while its missing rocket is recovered.
      } else if (available === 0)
        notice(g, "Reserve empty", [reserveWarning("Investment", 1, 0)], {
          kind: "actionDone",
          actor,
        });
      else advanceActions(g, actor);
    } else startAction(g, command.action, s.id, undefined, command);
  } else if (command.type === "act") {
    requireRule(
      g.pending?.kind === "action" && g.context,
      "No action effect is waiting for choices.",
    );
    g.context.bank = Boolean(command.bank);
    resolveActionBody(g, command);
  } else if (command.type === "rapid") {
    requireRule(
      g.pending?.kind === "rapid" && g.context,
      "No Rapid Advance choice is pending.",
    );
    const active = system(g, g.pending.system);
    g.pending = null;
    if (command.skip) {
      log(g, "Rapid Advance: declined the direct conversion.");
      runAfterHooks(g);
    } else {
      const planet = active.planets.find((p) => p.id === command.planet);
      requireRule(
        planet && active.ships[g.turn] > 0 && settlementSpace(g, planet) > 0,
        "Choose a legal planet for the direct conversion.",
      );
      log(
        g,
        "Rapid Advance: convert one Ship directly; this is not a SETTLE action.",
      );
      settlePlanet(g, active, planet, 1, "ships", "rapid");
    }
  } else if (command.type === "orient") {
    requireRule(
      g.pending?.kind === "orient" &&
        g.pending.rotations.includes(command.rotation),
      "Choose a legal orientation.",
    );
    const pending = g.pending;
    const s = system(g, pending.system);
    s.rotation = command.rotation;
    g.pending = {
      kind: "move",
      system: s.id,
      sources: pending.sources,
      ...(pending.carried ? { carried: pending.carried } : {}),
      entrySources: (
        pending.entrySources ??
        Object.keys(pending.sources).filter((id) => pending.sources[id] > 0)
      ).filter((id) => canMove(g, g.turn, system(g, id), s)),
    };
    log(g, `Oriented ${nameOf(s)} to ${command.rotation * 60} degrees.`);
  } else if (command.type === "move") {
    requireRule(g.pending?.kind === "move", "No explored movement is pending.");
    moveShips(
      g,
      system(g, g.pending.system),
      command.sources,
      g.pending.entrySources,
      command.carried,
      command.passengerLosses,
    );
  } else if (command.type === "settle") {
    requireRule(g.pending?.kind === "settle", "No SETTLE is pending.");
    const s = system(g, g.pending.system);
    const planet = s.planets.find((p) => p.id === command.planet);
    requireRule(planet, "Choose a planet in the active system.");
    settlePlanet(g, s, planet, command.count, "ships", "settle");
  } else if (command.type === "finishSettle") {
    requireRule(g.pending?.kind === "settle", "No SETTLE is pending.");
    finishAction(g);
  } else if (command.type === "settleBatch") {
    requireRule(g.pending?.kind === "settle", "No SETTLE is pending.");
    beginSettlementBatch(
      g,
      system(g, g.pending.system),
      command.settlements,
      command.replacements,
    );
  } else if (command.type === "continueEvent") {
    requireRule(
      g.phase === "event" && !g.pending,
      "No Event step is awaiting acknowledgement.",
    );
    g.phase = "tech";
    g.turn = g.first;
  } else if (command.type === "acknowledge") {
    requireRule(
      g.pending?.kind === "ack",
      "There is no outcome awaiting acknowledgement.",
    );
    const after = g.pending.after;
    g.pending = null;
    resumeContinuation(g, after);
  } else if (command.type === "redistribute") {
    requireRule(
      g.pending?.kind === "redistribute",
      "No displaced Settlements need allocation.",
    );
    const pending = g.pending,
      s = system(g, pending.system),
      queue = g.context?.settlementQueue ?? [];
    const kept = integer(command.ships, 40);
    let allocated = 0;
    const extra = Object.entries(command.settlements)
      .map(([id, raw]) => {
        const count = integer(raw, 40),
          p = s.planets.find((p) => p.id === id),
          reserved = sum(
            queue
              .filter((p) => p.planet === id && !p.replace)
              .map((p) => p.count),
          );
        requireRule(
          p && count <= Math.max(0, settlementSpace(g, p) - reserved),
          "Other committed Settlements must remain allocated.",
        );
        allocated += count;
        return { planet: id, count };
      })
      .filter((p) => p.count > 0);
    const additions: Record<string, number> = {};
    for (const p of [...queue, ...extra].filter((p) => !("replace" in p)))
      additions[p.planet] = (additions[p.planet] ?? 0) + p.count;
    const replacements = replacementPlacements(
      g,
      s,
      command.replacements,
      queue,
      additions,
    );
    allocated += sum(replacements.map((p) => p.count));
    requireRule(
      kept + allocated === pending.amount,
      "Allocate every displaced rocket as a Settlement or keep it as a Ship.",
    );
    requireRule(
      allocated + sum(queue.map((p) => p.count)) <= s.ships[g.turn],
      "Other committed Settlements must remain allocated.",
    );
    requireRule(g.context, "No settlement action is active.");
    g.context.settlementQueue = [
      ...queue.filter((p) => !p.replace),
      ...extra,
      ...queue.filter((p) => p.replace),
      ...replacements,
    ];
    log(
      g,
      `Reallocated ${allocated} displaced Settlement${allocated === 1 ? "" : "s"}; kept ${kept} as Ships. Other committed placements remain fixed.`,
    );
    continueSettlement(g, s, pending.resume);
  } else if (command.type === "nextRound") {
    requireRule(
      g.phase === "pass" && !g.pending,
      "Finish Economy before passing first player.",
    );
    nextRound(g);
  } else if (command.type === "explore") {
    requireRule(g.pending?.kind === "explore", "No Explore choice is pending.");
    const pending = g.pending as Extract<
      NonNullable<Game["pending"]>,
      { kind: "explore" }
    >;
    integer(command.recipient, g.players.length - 1);
    requireRule(command.recipient !== actor, "Choose another player.");
    const other = player(g, command.recipient);
    const s = system(g, pending.system);
    const planet = s.planets.find((p) => p.id === pending.planet)!;
    if (pending.effect === "otherShips") {
      const amount = Math.min(2, other.reserve);
      other.reserve -= amount;
      s.ships[other.id] += amount;
      log(
        g,
        `Explore result: ${other.name} received ${amount} Ship${amount === 1 ? "" : "s"} in ${nameOf(s)}.`,
      );
      if (
        amount < 2 &&
        pauseReserve(
          g,
          other.id,
          `${other.name}'s Explore Ships`,
          2,
          2 - amount,
          { kind: "ships", system: s.id },
          {
            kind: "place",
            system: s.id,
            planet: planet.id,
            count: pending.count,
            from: pending.from,
            resume: pending.resume,
          },
        )
      ) {
        // Keep the active player's committed Settlement waiting for the recipient's reward.
      } else if (amount < 2) {
        notice(
          g,
          "Reserve limit",
          [reserveWarning(`${other.name}'s Explore Ships`, 2, amount)],
          {
            kind: "place",
            system: s.id,
            planet: planet.id,
            count: pending.count,
            from: pending.from,
            resume: pending.resume,
          },
        );
      } else place(g, s, planet, pending.count, pending.from, pending.resume);
    } else {
      const amount = Math.min(
        1,
        other.reserve,
        settlementSpace(g, planet, other.id),
      );
      other.reserve -= amount;
      planet.owners[other.id] += amount;
      log(
        g,
        `Explore result: ${other.name} received ${amount} Settlement${amount === 1 ? "" : "s"} on this planet.`,
      );
      if (
        amount < 1 &&
        other.reserve === 0 &&
        settlementSpace(g, planet, other.id) > 0 &&
        pauseReserve(
          g,
          other.id,
          `${other.name}'s Explore Settlement`,
          1,
          1,
          { kind: "settlement", system: s.id, planet: planet.id },
          {
            kind: "place",
            system: s.id,
            planet: planet.id,
            count: pending.count,
            from: pending.from,
            resume: pending.resume,
          },
        )
      ) {
        // The reward still occupies its space before the original Settlement resumes.
      } else if (
        amount < 1 &&
        other.reserve === 0 &&
        (legacyRules(g) || settlementSpace(g, planet, other.id) > 0)
      ) {
        notice(
          g,
          "Reserve empty",
          [reserveWarning(`${other.name}'s Explore Settlement`, 1, 0)],
          {
            kind: "place",
            system: s.id,
            planet: planet.id,
            count: pending.count,
            from: pending.from,
            resume: pending.resume,
          },
        );
      } else place(g, s, planet, pending.count, pending.from, pending.resume);
    }
  } else if (command.type === "allocate") {
    requireRule(
      !g.pending && (g.phase === "investments" || g.phase === "reinforce"),
      "No supply allocation is pending.",
    );
    const available = p.reserve;
    const amount = g.phase === "investments" ? p.invested : reinforceCount(g);
    const credits = integer(command.credits, 40);
    requireRule(
      g.phase === "investments" || credits === 0,
      "Reinforcements must be Ships.",
    );
    const legal = new Set(availableSystems(g).map((s) => s.id));
    let shipTotal = 0;
    for (const [id, raw] of Object.entries(command.ships)) {
      const n = integer(raw, 40);
      requireRule(
        !n || legal.has(id),
        "Place Ships at home or where you have a Settlement.",
      );
      shipTotal += n;
    }
    requireRule(
      g.phase === "investments"
        ? credits + shipTotal === amount
        : shipTotal <= amount,
      "Allocate the invested rockets, or up to the reinforcement allowance.",
    );
    if (g.phase === "investments") p.invested = 0;
    else p.reserve -= shipTotal;
    p.credits += credits;
    for (const [id, n] of Object.entries(command.ships))
      if (n) system(g, id).ships[p.id] += n;
    log(g, `Allocated ${credits} Credits and ${shipTotal} Ships.`);
    if (
      g.phase === "reinforce" &&
      available < reinforceAllowance(g) &&
      pauseReserve(
        g,
        p.id,
        "Reinforcements",
        reinforceAllowance(g),
        reinforceAllowance(g) - shipTotal,
        { kind: "reinforce" },
        { kind: "allocationDone" },
      )
    ) {
      // Already allocated Ships remain fixed; top-ups use only the remaining allowance.
    } else if (g.phase === "reinforce" && available < reinforceAllowance(g))
      notice(
        g,
        "Reserve limit",
        [reserveWarning("Reinforcements", reinforceAllowance(g), available)],
        { kind: "allocationDone" },
      );
    else advanceAllocation(g);
  } else if (command.type === "buy") {
    requireRule(g.phase === "tech" && !g.pending, "Buy during the Tech step.");
    buy(
      g,
      command.tech,
      Boolean(command.fullPrice),
      command.value,
      command.target,
    );
  } else if (command.type === "feature") chooseFeature(g, command);
  else throw new Error("Unknown game command.");
  g.commands.push({ actor, command: clone(command) });
  g.revision++;
  if (g.phase !== "finished")
    g.decisions.push({
      player: command.type === "returnCredits" ? actor : g.turn,
      revision: g.revision,
    });
  assertInvariants(g);
  return g;
}

export function sinceLastDecision(g: Game) {
  const visits = g.decisions.filter((d) => d.player === g.turn);
  const start = visits.length > 1 ? visits[visits.length - 2].revision : 0;
  return g.log.filter((l) => l.revision > start && l.revision <= g.revision);
}

/** Replay saved commands with the recorded historical-rule boundary. */
export function replayGame(
  record: Pick<
    Game,
    | "players"
    | "seed"
    | "config"
    | "commands"
    | "legacyRulesUntil"
    | "reserveRecoveryFrom"
  >,
): Game {
  let game = createGame(
    record.players.length,
    record.seed,
    record.players.map((p) => p.name),
    record.config,
  );
  game.legacyRulesUntil = integer(
    record.legacyRulesUntil,
    record.commands.length,
  );
  game.reserveRecoveryFrom = integer(
    record.reserveRecoveryFrom,
    record.commands.length,
  );
  for (const { actor, command } of record.commands)
    game = applyCommand(game, actor, command);
  return game;
}

export function assertInvariants(g: Game) {
  requireRule(
    g.schema === 7 &&
      g.engine === "0.16.0" &&
      g.content === "confirmed-techs-reserve-recovery-4",
    "Unsupported saved-game version.",
  );
  requireRule(
    g.players.length >= 2 &&
      g.players.length <= 7 &&
      Number.isInteger(g.turn) &&
      g.turn >= 0 &&
      g.turn < g.players.length,
    "Invalid player count or turn.",
  );
  requireRule(
    [
      "homes",
      "plan",
      "actions",
      "investments",
      "event",
      "tech",
      "reinforce",
      "pass",
      "finished",
      "endgame",
    ].includes(g.phase),
    "Invalid game phase.",
  );
  requireRule(
    g.config &&
      Object.prototype.hasOwnProperty.call(TECH_PRESETS, g.config.techPreset) &&
      ["standard", "five-tech-chain"].includes(g.config.scenario) &&
      ["simpler", "foresight-test"].includes(g.config.events ?? ""),
    "Invalid game setup variables.",
  );
  requireRule(
    g.market.length === 10 &&
      new Set(g.market).size === 10 &&
      g.market.every((id) => IMPLEMENTED_TECHS.includes(id)),
    "Invalid Tech display.",
  );
  requireRule(
    g.config.events === "foresight-test" ||
      !g.market.includes("tech.foresight"),
    "Foresight is excluded with simpler Events.",
  );
  requireRule(
    Array.isArray(g.endgameQueue) &&
      new Set(g.endgameQueue).size === g.endgameQueue.length &&
      g.endgameQueue.every(
        (id) => Number.isInteger(id) && id >= 0 && id < g.players.length,
      ),
    "Invalid endgame queue.",
  );
  if (g.pending?.kind === "filibuster")
    requireRule(
      g.phase === "plan" &&
        g.pending.remaining.every(
          (id) => Number.isInteger(id) && id >= 0 && id < g.players.length,
        ),
      "Invalid Filibuster checkpoint.",
    );
  if (g.pending?.kind === "insurance")
    requireRule(
      g.phase === "actions" &&
        !g.context &&
        g.pending.after === g.turn &&
        Number.isInteger(g.pending.remaining) &&
        g.pending.remaining >= 0 &&
        g.pending.remaining < g.players.length,
      "Invalid Insurance checkpoint.",
    );
  if (g.pending?.kind === "eminent")
    requireRule(
      g.phase === "endgame" && !g.context,
      "Invalid Eminent Domain checkpoint.",
    );
  if (g.pending?.kind === "mercenaries" || g.pending?.kind === "afterOrder")
    requireRule(
      g.context?.kind === "move" && g.context.system === g.pending.system,
      "Invalid after-MOVE checkpoint.",
    );
  if (g.pending?.kind === "action")
    requireRule(
      g.context?.kind === g.pending.action &&
        g.context.system === g.pending.system,
      "Invalid action checkpoint.",
    );
  let context = g.context,
    depth = 0;
  while (context) {
    requireRule(
      ++depth <= 8 &&
        context.actor === g.turn &&
        ["move", "settle", "produce", "attack"].includes(context.kind) &&
        (context.source === undefined ||
          IMPLEMENTED_TECHS.includes(context.source)) &&
        g.systems.some((s) => s.id === context!.system),
      "Invalid action chain.",
    );
    context = context.parent ?? null;
  }
  integer(g.revision, Number.MAX_SAFE_INTEGER);
  integer(g.legacyRulesUntil, Number.MAX_SAFE_INTEGER);
  integer(g.reserveRecoveryFrom, Number.MAX_SAFE_INTEGER);
  if (g.pending?.kind === "reserve") {
    const recovery = g.pending;
    requireRule(
      Number.isInteger(recovery.owner) &&
        recovery.owner >= 0 &&
        recovery.owner < g.players.length &&
        hasTech(g, recovery.owner, "flexible-economy") &&
        Number.isInteger(recovery.total) &&
        recovery.total > 0 &&
        recovery.total <= 40 &&
        Number.isInteger(recovery.remaining) &&
        recovery.remaining > 0 &&
        recovery.remaining <= recovery.total,
      "Invalid Reserve recovery checkpoint.",
    );
    if (recovery.effect.kind === "production")
      integer(recovery.effect.credits, recovery.remaining);
  }
  integer(g.round, 6);
  integer(g.first, g.players.length - 1);
  requireRule(
    Array.isArray(g.decisions) &&
      g.decisions.every(
        (d, i) =>
          Number.isInteger(d.player) &&
          d.player >= 0 &&
          d.player < g.players.length &&
          Number.isInteger(d.revision) &&
          d.revision >= 0 &&
          d.revision <= g.revision &&
          (!i || d.revision >= g.decisions[i - 1].revision),
      ),
    "Invalid decision history.",
  );
  requireRule(
    Array.isArray(g.commands) && g.commands.length === g.revision,
    "Invalid saved command history.",
  );
  requireRule(
    g.systems.length === (g.players.length >= 6 ? 13 : g.players.length * 2),
    "Invalid board size.",
  );
  for (const [index, p] of g.players.entries()) {
    requireRule(
      p.id === index && p.style === index && typeof p.name === "string",
      "Invalid player identity.",
    );
    const quantities = [
      p.reserve,
      p.credits,
      p.invested,
      ...g.systems.map((s) => s.ships[p.id]),
      ...g.systems.flatMap((s) =>
        s.planets.map((planet) => planet.owners[p.id]),
      ),
    ];
    requireRule(
      quantities.every((n) => Number.isInteger(n) && n >= 0),
      "A rocket quantity is invalid.",
    );
    requireRule(
      sum(quantities) + p.techs.length === 40,
      `Rocket supply does not total forty for ${p.name}.`,
    );
    requireRule(
      new Set(p.used).size === p.used.length && p.used.length <= 4,
      "An action slot was used twice.",
    );
    requireRule(
      new Set(p.techs).size === p.techs.length &&
        p.techs.every((t) => IMPLEMENTED_TECHS.includes(t)),
      "Invalid prototype Tech ownership.",
    );
    requireRule(
      g.config.events === "foresight-test" ||
        !p.techs.includes("tech.foresight"),
      "Foresight ownership is excluded with simpler Events.",
    );
    integer(p.unplaced, 4);
    integer(p.stalledRound, 6);
    requireRule(
      Array.isArray(p.freeInvestments) &&
        p.freeInvestments.every((a) =>
          ["move", "settle", "produce", "attack"].includes(a),
        ),
      "Invalid bonus investments.",
    );
    requireRule(
      Array.isArray(p.investedActions) &&
        p.investedActions.every((a) => p.used.includes(a)),
      "Invalid invested action markers.",
    );
  }
  for (const s of g.systems) {
    requireRule(Boolean(ART.systems[s.template]), "Unknown system template.");
    requireRule(s.ships.length === g.players.length, "Invalid Ship inventory.");
    integer(s.rotation, 5);
    for (const p of s.planets)
      requireRule(
        p.owners.length === g.players.length &&
          Number.isInteger(p.capacity) &&
          p.capacity > 0 &&
          sum(p.owners) <= p.capacity + 1 &&
          (!p.blocked || sum(p.owners) === 0),
        "Invalid planet inventory or capacity.",
      );
    requireRule(
      s.tokens.every(
        (id) => Number.isInteger(id) && id >= 0 && id < g.players.length,
      ),
      "Invalid action chip owner.",
    );
  }
}
