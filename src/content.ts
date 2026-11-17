import cardData from "./cards-data.json" with { type: "json" };
import artData from "./art-data.json" with { type: "json" };
import layoutData from "./layouts-data.json" with { type: "json" };

export interface Card {
  id: string;
  title: string;
  type: string;
  cost: number | string | null;
  text: string;
  timing: string;
}
export interface ArtPlanet {
  capacity: number;
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  home: boolean;
  settlementSlots: { x: number; y: number }[];
}
export interface TileArt {
  id: string;
  name: string;
  image: string;
  width: number;
  height: number;
  sun: { x: number; y: number; radiusX: number; radiusY: number };
  planets: ArtPlanet[];
  homePlanetIndex: number | null;
  blockedEdges: number[];
  fixedBlackHoles: { x: number; y: number; radiusX: number; radiusY: number }[];
  fixedWarps: { x: number; y: number; radiusX: number; radiusY: number }[];
}
// Relative URLs let the same build run at a domain root or a repository subpath.
for (const section of [
  artData.systems,
  artData.cards,
  artData.aids,
  artData.backs,
  artData.features,
]) {
  for (const item of Object.values(section)) item.image = `.${item.image}`;
}
artData.cover.image = `.${artData.cover.image}`;
artData.firstPlayer.image = `.${artData.firstPlayer.image}`;
export const ART = artData as unknown as {
  systems: Record<string, TileArt>;
  cards: Record<string, { image: string }>;
  cover: { image: string };
  aids: Record<string, { image: string }>;
  backs: Record<string, { image: string }>;
  firstPlayer: {
    image: string;
    width: number;
    height: number;
    stages: {
      id: string;
      label: string;
      region: { x: number; y: number; width: number; height: number };
    }[];
  };
  features: {
    planet: { image: string; settlementSlots: { x: number; y: number }[] };
    blackHole: { image: string; width: number; height: number };
    asteroidBelt: { image: string; width: number; height: number };
    warp: { image: string; width: number; height: number };
  };
};
export const CARDS = [...cardData.techs, ...cardData.events] as Card[];
export const CARD_MAP = Object.fromEntries(CARDS.map((c) => [c.id, c]));
export const LAYOUTS = layoutData.layouts;
export const DIRECTIONS = [
  [1, 0],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [0, -1],
  [1, -1],
];
export const FAMILY = [
  "agility",
  "artificial-warp",
  "assembly-line",
  "banking",
  "disruptor",
  "genesis",
  "kessler-syndrome",
  "patents",
  "planet-killer",
  "planet-nine",
].map((id) => `tech.${id}`);
export const NEW_TECHS = [
  "population-explosion",
  "government-incentives",
  "frontier-pioneer",
  "rapid-advance",
  "spice",
  "arcologies",
  "cloaking",
  "patrol",
  "research-lab",
  "strategic-stall",
].map((id) => `tech.${id}`);
export const REMAINING_TECHS = [
  "soylent-green",
  "mercenaries",
  "gravity-drive",
  "foresight",
  "death-sun",
  "filibuster",
  "insurance",
  "eminent-domain",
  "sabotage",
  "flexible-economy",
].map((id) => `tech.${id}`);
export const IMPLEMENTED_TECHS = [...FAMILY, ...NEW_TECHS, ...REMAINING_TECHS];
export const CHAIN_TECHS = NEW_TECHS.slice(0, 5);
export const TECH_PRESETS = {
  family: { label: "Family", techs: FAMILY },
  chains: { label: "New Techs", techs: NEW_TECHS },
  remaining: { label: "Last ten Techs", techs: REMAINING_TECHS },
  aggressive: {
    label: "Aggressive",
    techs: cardData.presets["preset.aggressive"].techIds,
  },
  cunning: {
    label: "Cunning",
    techs: cardData.presets["preset.cunning"].techIds,
  },
  economic: {
    label: "Economic",
    techs: cardData.presets["preset.economic"].techIds,
  },
  peaceful: {
    label: "Peaceful",
    techs: cardData.presets["preset.peaceful"].techIds,
  },
  random: { label: "Random", techs: IMPLEMENTED_TECHS },
  mixed: {
    label: "Tech chain mix",
    techs: [
      ...CHAIN_TECHS,
      "tech.banking",
      "tech.agility",
      "tech.genesis",
      "tech.arcologies",
      "tech.research-lab",
    ],
  },
};
export const STYLES = [
  { name: "Moss", color: "#8eae5c", rim: "dots" },
  { name: "Ink", color: "#303746", rim: "stripes" },
  { name: "Gold", color: "#e5bc43", rim: "bars" },
  { name: "Violet", color: "#a17cc9", rim: "chevrons" },
  { name: "Red", color: "#df6253", rim: "checks" },
  { name: "Ivory", color: "#f1ead5", rim: "waves" },
  { name: "Orange", color: "#e58a43", rim: "triangles" },
];
export const ACTION_LABELS = {
  move: "Move into",
  settle: "Settle",
  produce: "Produce",
  attack: "Attack",
};
