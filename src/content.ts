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
