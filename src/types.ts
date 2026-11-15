export type Action = "move" | "settle" | "produce" | "attack";
export type Phase =
  | "homes"
  | "plan"
  | "actions"
  | "investments"
  | "tech"
  | "reinforce"
  | "finished";
export type Explore =
  | "credit1"
  | "credit2"
  | "credit3"
  | "otherShips"
  | "otherSettlement"
  | "blackHole";
export interface Planet {
  id: string;
  capacity: number;
  home: boolean;
  owners: number[];
  x: number;
  y: number;
  explore: Explore | null;
  blocked: boolean;
}
export interface System {
  id: string;
  template: string;
  q: number;
  r: number;
  role: string;
  revealed: boolean;
  rotation: number;
  planets: Planet[];
  ships: number[];
  tokens: number[];
  extraHoles: number;
  extraWarp: boolean;
  extraEdges: number[];
}
export interface Player {
  id: number;
  name: string;
  style: number;
  reserve: number;
  credits: number;
  invested: number;
  techs: string[];
  used: Action[];
  home: string | null;
  unplaced: number;
}
export interface MovePayload {
  sources: Record<string, number>;
}
export interface AttackPayload {
  sacrifice: number;
  ships: Record<string, number>;
  settlements: Record<string, Record<string, number>>;
}
export interface ActionContext {
  actor: number;
  system: string;
  kind: Action;
  bank: boolean;
}
export type Pending =
  | {
      kind: "orient";
      system: string;
      sources: Record<string, number>;
      rotations: number[];
    }
  | {
      kind: "move";
      system: string;
      sources: Record<string, number>;
      entrySources: string[];
    }
  | { kind: "settle"; system: string }
  | {
      kind: "explore";
      system: string;
      planet: string;
      effect: "otherShips" | "otherSettlement";
      resume: "settle" | "genesis";
      count: number;
      from: "ships" | "reserve";
    }
  | { kind: "feature"; tech: string; optional: boolean }
  | { kind: "genesis" };
export interface Score {
  player: number;
  planets: number;
  systems: number;
  techs: number;
  credits: number;
  total: number;
}
export interface Game {
  schema: 1;
  engine: "0.8.0";
  content: "family-simple-events-1";
  seed: number;
  rng: number;
  revision: number;
  round: number;
  phase: Phase;
  turn: number;
  first: number;
  players: Player[];
  systems: System[];
  exploreBag: Explore[];
  events: string[];
  revealedEvents: string[];
  eventHistory: string[][];
  market: string[];
  finalEconomy: boolean;
  pending: Pending | null;
  context: ActionContext | null;
  features: {
    blackHole: boolean;
    warp: boolean;
    asteroid: boolean;
    planet: boolean;
  };
  disruptions: { owner: number; system: string; round: number }[];
  log: {
    revision: number;
    round: number;
    player: number | null;
    text: string;
  }[];
  commands: { actor: number; command: Command }[];
  scores: Score[];
  winners: number[];
}
export type Command =
  | { type: "home"; system: string }
  | { type: "plan"; system: string }
  | {
      type: "resolve";
      system: string;
      action: Action;
      invest?: boolean;
      bank?: boolean;
      sources?: Record<string, number>;
      credits?: number;
      attack?: AttackPayload;
    }
  | { type: "orient"; rotation: number }
  | { type: "move"; sources: Record<string, number> }
  | { type: "settle"; planet: string; count: number }
  | { type: "finishSettle" }
  | { type: "explore"; recipient: number }
  | { type: "allocate"; credits: number; ships: Record<string, number> }
  | { type: "buy"; tech: string | null }
  | {
      type: "feature";
      system?: string;
      planet?: string;
      edge?: number;
      skip?: boolean;
    };
