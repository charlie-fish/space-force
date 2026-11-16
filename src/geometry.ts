import { ART } from "./content.js";
import type { System } from "./types.js";

export interface Point {
  x: number;
  y: number;
}
export interface Space extends Point {
  radiusX: number;
  radiusY: number;
}
export const HEX_WIDTH = Math.sqrt(3) * 100;
export function rotatePoint(x: number, y: number, rotation: number): Point {
  const angle = (rotation * Math.PI) / 3,
    px = (x - 0.5) * HEX_WIDTH,
    py = (y - 0.5) * 200;
  return {
    x: px * Math.cos(angle) - py * Math.sin(angle),
    y: px * Math.sin(angle) + py * Math.cos(angle),
  };
}
export function obstacles(s: System): Space[] {
  const art = ART.systems[s.template];
  return [
    ...s.planets.map((p, i) => ({
      x: p.x,
      y: p.y,
      radiusX: art.planets[i]?.radiusX ?? 0.09,
      radiusY: art.planets[i]?.radiusY ?? 0.078,
    })),
    { ...art.sun },
    ...art.fixedBlackHoles.map((p) => ({
      ...p,
      radiusX: 13 / HEX_WIDTH,
      radiusY: 13 / 200,
    })),
    ...(art.fixedWarps as Space[]),
    { x: 0.5, y: 0.085, radiusX: 0.4, radiusY: 0.04 },
    ...(s.extraWarp
      ? [{ x: 0.24, y: 0.21, radiusX: 0.15, radiusY: 0.04 }]
      : []),
  ];
}
export function findOpenSpace(
  s: System,
  width: number,
  height: number,
  occupied: Space[] = [],
): Point {
  const blocks = [...obstacles(s), ...occupied];
  let best = { x: 0.5, y: 0.8 },
    bestScore = -Infinity;
  for (let y = 0.14; y <= 0.88; y += 0.035)
    for (let x = 0.1; x <= 0.9; x += 0.035) {
      const inside = [x - width / 2, x + width / 2].every((px) =>
        [y - height / 2, y + height / 2].every((py) => {
          const inset = py < 0.25 ? 0.5 - 2 * py : py > 0.75 ? 2 * py - 1.5 : 0;
          return px > inset + 0.025 && px < 1 - inset - 0.025;
        }),
      );
      if (!inside) continue;
      const clearance = Math.min(
        ...blocks.map((p) =>
          Math.hypot(
            (x - p.x) / (p.radiusX + width / 2),
            (y - p.y) / (p.radiusY + height / 2),
          ),
        ),
      );
      const score = clearance - Math.abs(y - 0.66) * 0.025;
      if (score > bestScore) {
        best = { x, y };
        bestScore = score;
      }
    }
  return best;
}
export function fleetPositions(s: System): Point[] {
  const occupied: Space[] = blackHolePositions(s).map((p) => ({
    ...p,
    radiusX: p.radius / HEX_WIDTH,
    radiusY: p.radius / 200,
  }));
  return s.ships.map((n) => {
    if (!n) return { x: 0, y: 0 };
    const p = findOpenSpace(s, 0.19, 0.1, occupied);
    occupied.push({ ...p, radiusX: 0.105, radiusY: 0.06 });
    return p;
  });
}

export function blackHolePositions(s: System): (Point & { radius: number })[] {
  const art = ART.systems[s.template];
  const fixed = art.fixedBlackHoles.map((p) => ({
    x: p.x,
    y: p.y,
    radius: 13,
  }));
  const blocked = s.planets
    .filter((p) => p.blocked)
    .map((p) => {
      const index = s.planets.indexOf(p);
      return {
        x: p.x,
        y: p.y,
        radius: (art.planets[index]?.radiusX ?? 0.09) * HEX_WIDTH,
      };
    });
  const placed = [...fixed, ...blocked];
  for (let i = 0; i < Math.max(0, (s.extraHoles ?? 0) - blocked.length); i++) {
    const p = findOpenSpace(
      s,
      0.16,
      0.14,
      placed.map((p) => ({
        ...p,
        radiusX: p.radius / HEX_WIDTH,
        radiusY: p.radius / 200,
      })),
    );
    placed.push({ ...p, radius: 13 });
  }
  return placed;
}
