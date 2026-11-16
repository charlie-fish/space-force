import {
  ART,
  CARD_MAP,
  DIRECTIONS,
  FAMILY,
  LAYOUTS,
  CARDS,
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
): Game {
  requireRule(
    Number.isInteger(count) && count >= 2 && count <= 7,
    "Space Force supports two to seven players.",
  );
  const g: Game = {
    schema: 4,
    engine: "0.11.0",
    content: "family-simple-events-1",
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
    market: FAMILY.slice(),
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
  }));
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
  log(
    g,
    "Local Family game created. Simpler Events count rounds; their effects and auction are disabled.",
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
): string | null {
  const p = player(g, id);
  const card = CARD_MAP[tech];
  if (!g.market.includes(tech) || typeof card?.cost !== "number")
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
  if (p.credits < card.cost) return `You need ${card.cost} Credits.`;
  if (p.reserve + card.cost < 1)
    return "A Reserve rocket is needed to mark ownership.";
  return null;
}

function startActions(g: Game) {
  g.phase = "actions";
  advanceActions(g, (g.first + g.players.length - 1) % g.players.length);
}
function advanceActions(g: Game, after: number) {
  g.pending = null;
  g.context = null;
  if (g.systems.every((s) => s.tokens.length === 0)) {
    g.phase = "investments";
    g.turn = g.first;
    skipEmptyAllocation(g);
    return;
  }
  for (let step = 1; step <= g.players.length; step++) {
    const id = (after + step) % g.players.length;
    if (eligibleTokens(g, id).length) {
      g.turn = id;
      return;
    }
  }
  throw Error("A token stack has no valid owner.");
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
function finishAction(g: Game, messages: string[] = []) {
  const c = g.context;
  requireRule(c, "No action is being resolved.");
  if (c.bank && hasTech(g, c.actor, "banking")) {
    if (player(g).reserve > 0) {
      player(g).reserve--;
      player(g).invested++;
      player(g).investedActions.push(c.kind);
      log(g, "Banking: invested one Reserve rocket.");
    } else messages.push(reserveWarning("Banking", 1, 0));
  }
  if (messages.length) {
    notice(g, "Reserve limit", messages, {
      kind: "actionDone",
      actor: c.actor,
    });
    return;
  }
  advanceActions(g, c.actor);
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
    finishGame(g);
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
    p.unplaced = 4;
  }
  g.disruptions = g.disruptions.filter((d) => d.round >= g.round);
  log(g, `Round ${g.round}: plan four action tokens each.`, null);
}
function resumeContinuation(g: Game, after: Continuation) {
  if (after.kind === "actionDone") advanceActions(g, after.actor);
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

function moveShips(
  g: Game,
  target: System,
  sources: Record<string, number>,
  requireEntry?: string[],
) {
  let incoming = 0;
  for (const [id, raw] of Object.entries(sources)) {
    const n = integer(raw, 40);
    const from = system(g, id);
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
  for (const [id, n] of Object.entries(sources))
    system(g, id).ships[g.turn] -= n;
  const losses = Math.min(incoming, blackHoles(target));
  target.ships[g.turn] += incoming - losses;
  player(g).credits += losses;
  log(
    g,
    `Moved ${incoming} Ship${incoming === 1 ? "" : "s"} into ${nameOf(target)}${losses ? `; ${losses} lost to black holes and returned as Credits` : ""}.`,
  );
  finishAction(g);
}
function beginMove(
  g: Game,
  target: System,
  sources: Record<string, number>,
  reveal = false,
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
  if (target.revealed || (!incoming && !reveal)) {
    moveShips(g, target, sources);
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
  if (resume === "genesis") {
    finishTechTurn(g);
    return;
  }
  if (g.context?.settlementQueue) {
    resolveSettlementQueue(g, s);
    return;
  }
  if (s.ships[g.turn] > 0 && s.planets.some((p) => freeSpace(p) > 0))
    g.pending = { kind: "settle", system: s.id };
  else finishAction(g);
}
function resolveSettlementQueue(g: Game, s: System) {
  const next = g.context?.settlementQueue?.shift();
  if (!next) {
    finishAction(g);
    return;
  }
  const planet = s.planets.find((p) => p.id === next.planet)!;
  if (next.count > freeSpace(planet))
    place(g, s, planet, next.count, "ships", "settle");
  else settlePlanet(g, s, planet, next.count, "ships", "settle");
}
function beginSettlementBatch(
  g: Game,
  s: System,
  placements: Record<string, number>,
) {
  let total = 0;
  const queue = Object.entries(placements)
    .map(([id, raw]) => {
      const count = integer(raw, 40),
        planet = s.planets.find((p) => p.id === id);
      requireRule(
        planet && count <= freeSpace(planet),
        "Choose Settlements that fit a planet in this system.",
      );
      total += count;
      return { planet: id, count };
    })
    .filter((p) => p.count > 0);
  requireRule(
    total <= s.ships[g.turn],
    "Not enough Ships for these Settlements.",
  );
  requireRule(g.context?.kind === "settle", "No SETTLE is active.");
  g.context.settlementQueue = queue;
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
  const available = from === "ships" ? s.ships[g.turn] : player(g).reserve,
    room = freeSpace(planet),
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
    count > 0 && count <= freeSpace(planet),
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
      settlements += amount;
    }
  }
  requireRule(
    settlements + Math.ceil(ships / 2) <= n,
    "Each sacrificed Ship destroys two Ships OR one Settlement.",
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

export function featureOptions(
  g: Game,
  tech: string,
): { system: string; planet?: string; edge?: number }[] {
  const options: { system: string; planet?: string; edge?: number }[] = [];
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
function buy(g: Game, tech: string | null) {
  if (!tech) {
    log(g, "Passed the Tech purchase.");
    finishTechTurn(g);
    return;
  }
  requireRule(
    !purchaseReason(g, tech),
    purchaseReason(g, tech) ?? "Cannot buy Tech.",
  );
  const p = player(g);
  const cost = CARD_MAP[tech].cost as number;
  p.credits -= cost;
  p.reserve += cost - 1;
  p.techs.push(tech);
  log(g, `Bought ${CARD_MAP[tech].title} for ${cost} Credits.`);
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
    actor === state.turn && state.phase !== "finished",
    "It is not this player’s turn.",
  );
  command = clone(command);
  const g = clone(state);
  const p = player(g);
  if (command.type === "home") {
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
    if (g.players.every((p) => p.unplaced === 0)) startActions(g);
    else {
      do {
        g.turn = (g.turn + 1) % g.players.length;
      } while (player(g).unplaced === 0);
    }
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
      if (available === 0)
        notice(g, "Reserve empty", [reserveWarning("Investment", 1, 0)], {
          kind: "actionDone",
          actor,
        });
      else advanceActions(g, actor);
    } else if (command.action === "move")
      beginMove(g, s, command.sources ?? {}, Boolean(command.reveal));
    else if (command.action === "produce") {
      const available = p.reserve,
        wanted = production(g, s);
      const total = Math.min(available, wanted);
      const credits = integer(command.credits ?? total, 40);
      requireRule(credits <= total, "Production allocation exceeds output.");
      p.reserve -= total;
      p.credits += credits;
      s.ships[p.id] += total - credits;
      log(
        g,
        `Produced ${credits} Credits and ${total - credits} Ships in ${nameOf(s)}.`,
      );
      finishAction(
        g,
        total < wanted ? [reserveWarning("Production", wanted, available)] : [],
      );
    } else if (command.action === "attack")
      attack(
        g,
        s,
        command.attack ?? { sacrifice: 0, ships: {}, settlements: {} },
      );
    else if (command.settlements)
      beginSettlementBatch(g, s, command.settlements);
    else if (s.ships[actor] > 0 && s.planets.some((p) => freeSpace(p) > 0))
      g.pending = { kind: "settle", system: s.id };
    else {
      log(g, "Completed an empty SETTLE action.");
      finishAction(g);
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
    beginSettlementBatch(g, system(g, g.pending.system), command.settlements);
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
            queue.filter((p) => p.planet === id).map((p) => p.count),
          );
        requireRule(
          p && count <= Math.max(0, freeSpace(p) - reserved),
          "Other committed Settlements must remain allocated.",
        );
        allocated += count;
        return { planet: id, count };
      })
      .filter((p) => p.count > 0);
    requireRule(
      kept + allocated === pending.amount,
      "Allocate every displaced rocket as a Settlement or keep it as a Ship.",
    );
    requireRule(
      allocated + sum(queue.map((p) => p.count)) <= s.ships[g.turn],
      "Other committed Settlements must remain allocated.",
    );
    requireRule(g.context, "No settlement action is active.");
    g.context.settlementQueue = [...queue, ...extra];
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
    > & { count: number; from: "ships" | "reserve" };
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
      if (amount < 2) {
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
      const amount = Math.min(1, other.reserve, freeSpace(planet));
      other.reserve -= amount;
      planet.owners[other.id] += amount;
      log(
        g,
        `Explore result: ${other.name} received ${amount} Settlement${amount === 1 ? "" : "s"} on this planet.`,
      );
      if (amount < 1 && other.reserve === 0) {
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
    if (g.phase === "reinforce" && available < reinforceAllowance(g))
      notice(
        g,
        "Reserve limit",
        [reserveWarning("Reinforcements", reinforceAllowance(g), available)],
        { kind: "allocationDone" },
      );
    else advanceAllocation(g);
  } else if (command.type === "buy") {
    requireRule(g.phase === "tech" && !g.pending, "Buy during the Tech step.");
    buy(g, command.tech);
  } else if (command.type === "feature") chooseFeature(g, command);
  else throw new Error("Unknown game command.");
  g.commands.push({ actor, command: clone(command) });
  g.revision++;
  if (g.phase !== "finished")
    g.decisions.push({ player: g.turn, revision: g.revision });
  assertInvariants(g);
  return g;
}

export function sinceLastDecision(g: Game) {
  const visits = g.decisions.filter((d) => d.player === g.turn);
  const start = visits.length > 1 ? visits[visits.length - 2].revision : 0;
  return g.log.filter((l) => l.revision > start && l.revision <= g.revision);
}

export function assertInvariants(g: Game) {
  requireRule(
    g.schema === 4 &&
      g.engine === "0.11.0" &&
      g.content === "family-simple-events-1",
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
    ].includes(g.phase),
    "Invalid game phase.",
  );
  integer(g.revision, Number.MAX_SAFE_INTEGER);
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
        p.techs.every((t) => FAMILY.includes(t)),
      "Invalid prototype Tech ownership.",
    );
    integer(p.unplaced, 4);
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
          sum(p.owners) <= p.capacity &&
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
