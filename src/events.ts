import type { Action, Game, System } from "./types.js";

// Fixed, disjoint pools. Deck order still uses the game's seeded shuffle.
export const EVENT_BATCHES = {
  "batch-1": {
    label: "Batch 1 · Economy & rules",
    cards: [
      "communist-decree",
      "economic-boom",
      "luddite-decree",
      "vorsprung",
      "turtling",
      "recession",
      "capital-injection",
      "technological-singularity",
      "el-mayarah",
      "earth-first",
    ],
  },
  "batch-2": {
    label: "Batch 2 · Actions & conflict",
    cards: [
      "cyber-attack",
      "ceasefire",
      "ammo-shortage",
      "black-cloud",
      "alliance",
      "flexibility",
      "all-your-base",
      "consolidation",
      "spacetime-rip",
      "hive-mind",
    ],
  },
  "batch-3": {
    label: "Batch 3 · Board & planning",
    cards: [
      "ragnarok",
      "stealth-invasion",
      "scrambler",
      "multicultural-tension",
      "politics",
      "gravitational-lensing",
      "migration",
      "famine",
      "galactic-summit",
      "prophecy",
    ],
  },
} as const;

export const eventIs = (g: Game, event: string, owner?: number): boolean =>
  g.config.events === "full" &&
  g.activeEvent?.id === `event.${event}` &&
  (owner === undefined || g.activeEvent.owner === owner);

export function forcedInvestment(g: Game, action: Action) {
  return (
    (action === "attack" && eventIs(g, "ceasefire")) ||
    (action === "produce" && eventIs(g, "recession"))
  );
}
export const investmentAmount = (g: Game) =>
  eventIs(g, "economic-boom") ? 2 : 1;
export const shipDamage = (g: Game, deathSun = false) =>
  (eventIs(g, "ammo-shortage") ? 1 : 2) + (deathSun ? 1 : 0);
export function attackTargetAllowed(
  g: Game,
  attacker: number,
  target: number,
  kind: "ships" | "settlements",
) {
  return (
    attacker !== target &&
    !(kind === "ships" && eventIs(g, "black-cloud")) &&
    !(
      eventIs(g, "alliance") &&
      g.activeEvent!.ally === attacker &&
      g.activeEvent!.owner === target
    )
  );
}
export function planReason(g: Game, s: System, id = g.turn): string | null {
  if (
    eventIs(g, "earth-first") &&
    !g.systems.some((s) => s.tokens.includes(id))
  ) {
    // Provisional conflict rule: the compulsory first home token takes precedence.
    if (s.id !== g.players[id].home)
      return "Earth First: your first action token this PLAN phase must go in your home system.";
    return null;
  }
  if (
    !eventIs(g, "luddite-decree") &&
    g.disruptions.some(
      (d) => d.round === g.round && d.system === s.id && d.owner !== id,
    )
  )
    return "Disruptor blocks your placement here this round.";
  return null;
}
