import { setup, botCommand, step } from "./helpers.mjs";
import {
  boardConnected,
  legalOrientations,
  featureOptions,
} from "../work/compiled/engine.js";
import {
  fleetPositions,
  blackHolePositions,
  warpPosition,
  findOpenSpace,
} from "../work/compiled/geometry.js";

export function queryPosition(count) {
  const g = setup(count, 41, {
    techPreset: "family",
    scenario: "standard",
    events: "full",
    eventBatch: "batch-2",
  });
  g.features.asteroid = false;
  g.systems.forEach((s, i) => {
    s.revealed = s.role !== "hidden" || i % 2 === 0;
    s.rotation = i % 6;
    s.extraWarp = i % 3 === 0;
    s.extraHoles = i % 3;
    for (const p of s.planets) p.blocked = !p.home && i % 4 === 0;
    g.players.forEach((p) => {
      const n = (i + p.id) % 3 === 0 ? 1 : 0;
      p.reserve += s.ships[p.id] - n;
      s.ships[p.id] = n;
    });
  });
  return g;
}

export function querySnapshot(g) {
  return {
    connected: boardConnected(g),
    orientations: g.systems.map((s) => ({
      system: s.id,
      empty: legalOrientations(g, s.id, {}),
      entering: legalOrientations(g, s.id, { [g.players[0].home]: 1 }),
    })),
    targets: Object.fromEntries(
      [
        "kessler-syndrome",
        "genesis",
        "planet-killer",
        "artificial-warp",
        "planet-nine",
        "disruptor",
      ].map((id) => [id, featureOptions(g, `tech.${id}`)]),
    ),
    layout: g.systems.map((s) => ({
      system: s.id,
      fleets: fleetPositions(s),
      holes: blackHolePositions(s),
      warp: warpPosition(s),
      openSpace: findOpenSpace(s, 0.19, 0.1),
    })),
  };
}

export function completePosition(count, batch) {
  let g = setup(count, 41, {
    techPreset: "remaining",
    scenario: "standard",
    events: "full",
    eventBatch: batch,
  });
  for (let n = 0; n < 1800 && g.phase !== "finished"; n++)
    g = step(g, botCommand(g));
  if (g.phase !== "finished")
    throw Error(`Game did not complete: ${count}/${batch}`);
  return g;
}

export function unchangedState(g) {
  const { engine, ...state } = g;
  return state;
}
