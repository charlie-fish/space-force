import type {
  Command,
  Game,
  GameConfig,
  Planet,
  Player,
  System,
} from "../types.js";

export const PUBLIC_PRESETS = [
  "random",
  "family",
  "aggressive",
  "cunning",
  "economic",
  "peaceful",
] as const;
export type PublicPreset = (typeof PUBLIC_PRESETS)[number];
export type PlayFormat = "live" | "async";
export interface RoomSettings {
  capacity: number;
  visibility: "public" | "private";
  format: PlayFormat;
  techPreset: PublicPreset;
  events: "full" | "simpler";
  responseHours: number;
  graceHours: number;
}
export interface PublicMember {
  id: string;
  name: string;
  style: number;
  ready: boolean;
  playerId: number | null;
  forfeited: boolean;
  connected: boolean;
}
export interface RoomSummary {
  id: string;
  host: string;
  status: "waiting" | "playing" | "finished";
  settings: RoomSettings;
  members: PublicMember[];
  createdAt: number;
  updatedAt: number;
  version: number;
}
export type VisiblePlanet = Omit<Planet, "explore"> & {
  explore: Planet["explore"] | "hidden";
};
export type VisibleSystem = Omit<System, "template" | "planets"> & {
  template: string | null;
  planets: VisiblePlanet[];
};
export type VisibleGame = Omit<
  Game,
  "seed" | "rng" | "events" | "exploreBag" | "commands" | "systems" | "auction"
> & {
  systems: VisibleSystem[];
  eventsRemaining: number;
  exploreRemaining: number;
  auction: Game["auction"];
};
export interface TurnClock {
  memberId: string;
  playerId: number;
  decisionId: string;
  dueAt: number;
  eligibleAt: number;
  warning: boolean;
}
export interface RemovalState {
  memberId: string;
  eligible: boolean;
  yes: string[];
  voters: string[];
  needed: number;
}
export interface OnlineSnapshot {
  room: RoomSummary;
  serverTime: number;
  you: string;
  playerId: number | null;
  canAct: boolean;
  actingFor: number | null;
  decisionId: string | null;
  historyFrom: number;
  clocks: TurnClock[];
  removals: RemovalState[];
  paused: boolean;
  pauseVotes: string[];
  game: VisibleGame | null;
  peek: string[];
}
export interface CommandRequest {
  id: string;
  revision: number;
  decisionId: string;
  command: Command;
  confirmIntent?: boolean;
  confirmReserve?: boolean;
}
export interface ConfirmationReply {
  confirmation: { title: string; messages: string[]; reserve: boolean };
  snapshot: OnlineSnapshot;
}
export type CommandReply =
  { snapshot: OnlineSnapshot; accepted: string } | ConfirmationReply;
export const normalConfig = (settings: RoomSettings): GameConfig => ({
  techPreset: settings.techPreset,
  scenario: "standard",
  events: settings.events,
  eventBatch: "standard",
});
export const viewPlayer = (p: Player): Player => ({
  id: p.id,
  name: p.name,
  style: p.style,
  reserve: p.reserve,
  credits: p.credits,
  invested: p.invested,
  techs: p.techs.slice(),
  used: p.used.slice(),
  investedActions: p.investedActions.slice(),
  home: p.home,
  unplaced: p.unplaced,
  stalledRound: p.stalledRound,
  freeInvestments: p.freeInvestments.slice(),
  ...(p.blockedAction ? { blockedAction: p.blockedAction } : {}),
  ...(p.slotOwners ? { slotOwners: { ...p.slotOwners } } : {}),
  ...(p.forfeited ? { forfeited: true } : {}),
});
