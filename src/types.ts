export type Action = "move" | "settle" | "produce" | "attack";
export type Phase =
  | "homes"
  | "plan"
  | "actions"
  | "investments"
  | "event"
  | "tech"
  | "reinforce"
  | "pass"
  | "endgame"
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
  exploreFaceUp?: boolean;
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
  investedActions: Action[];
  home: string | null;
  unplaced: number;
  stalledRound: number;
  freeInvestments: Action[];
  blockedAction?: Action;
  slotOwners?: Partial<Record<Action, number>>;
}
export interface MovePayload {
  sources: Record<string, number>;
  carried?: Record<string, Record<string, number>>;
  passengerLosses?: Record<string, number>;
}
export type Replacements = Record<string, Record<string, number>>;
export interface SettlementPlacement {
  planet: string;
  count: number;
  replace?: Record<string, number>;
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
  slot?: Action;
  bank: boolean;
  settlementQueue?: SettlementPlacement[];
  replacement?: Record<string, number>;
  parent?: ActionContext;
  source?: string;
  stage?: "before" | "body" | "after";
  beforeHooks?: string[];
  afterHooks?: string[];
  bankDone?: boolean;
  afterOrderChosen?: boolean;
}
export type SettlementResume = "settle" | "genesis" | "rapid" | "event";
export type ReserveEffect =
  | { kind: "ships"; system: string }
  | { kind: "credits" }
  | { kind: "production"; system: string; credits: number }
  | { kind: "settlement"; system: string; planet: string }
  | { kind: "investment"; action: Action; banking: boolean; free: boolean }
  | { kind: "reinforce" };
export interface ReserveRecovery {
  kind: "reserve";
  owner: number;
  label: string;
  total: number;
  remaining: number;
  effect: ReserveEffect;
  after: Continuation;
  messages: string[];
}
export type Continuation =
  | { kind: "eventRewards" }
  | { kind: "productionDone" }
  | { kind: "actionDone"; actor: number }
  | { kind: "techDone" }
  | { kind: "allocationDone" }
  | { kind: "beforeHooks" }
  | { kind: "afterHooks" }
  | { kind: "insuranceNext"; after: number; remaining: number }
  | {
      kind: "place";
      system: string;
      planet: string;
      count: number;
      from: "ships" | "reserve";
      resume: SettlementResume;
    }
  | { kind: "settlementNext"; system: string; resume: SettlementResume };
export type Pending =
  | ReserveRecovery
  | { kind: "bid" }
  | { kind: "eventSelect" }
  | { kind: "eventChoice"; event: string }
  | { kind: "scrambler" }
  | { kind: "filibuster"; remaining: number[] }
  | { kind: "insurance"; after: number; remaining: number }
  | { kind: "eminent" }
  | { kind: "mercenaries"; system: string }
  | { kind: "afterOrder"; system: string }
  | {
      kind: "action";
      system: string;
      action: Action;
      source: string;
      free: boolean;
    }
  | { kind: "rapid"; system: string }
  | { kind: "ack"; title: string; messages: string[]; after: Continuation }
  | {
      kind: "redistribute";
      system: string;
      amount: number;
      resume: SettlementResume;
    }
  | {
      kind: "orient";
      system: string;
      sources: Record<string, number>;
      rotations: number[];
      entrySources?: string[];
      carried?: MovePayload["carried"];
    }
  | {
      kind: "move";
      system: string;
      sources: Record<string, number>;
      entrySources: string[];
      carried?: MovePayload["carried"];
    }
  | { kind: "settle"; system: string }
  | {
      kind: "explore";
      system: string;
      planet: string;
      effect: "otherShips" | "otherSettlement";
      resume: SettlementResume;
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
  schema: 10;
  engine: "0.20.0";
  content: "full-events-bidding-7";
  config: GameConfig;
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
  roundLimit: number;
  activeEvent: {
    id: string;
    owner: number;
    round: number;
    ally?: number;
  } | null;
  auction: {
    bids: (number | null)[];
    winner: number | null;
    paid: number;
  } | null;
  eventSelections: {
    round: number;
    candidates: string[];
    selected: string;
    owner: number;
    bids: number[];
  }[];
  eventFlow: { event: string; queue: number[]; rewards: EventReward[] } | null;
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
  decisions: { player: number; revision: number }[];
  scores: Score[];
  winners: number[];
  endgameQueue: number[];
  legacyRulesUntil: number;
  reserveRecoveryFrom: number;
  confirmedTechRulesFrom: number;
  activeReserveChecksFrom: number;
}
export interface GameConfig {
  techPreset:
    | "family"
    | "chains"
    | "mixed"
    | "remaining"
    | "aggressive"
    | "cunning"
    | "economic"
    | "peaceful"
    | "random";
  scenario: "standard" | "five-tech-chain";
  events?: "simpler" | "foresight-test" | "full";
  eventBatch?: "standard" | "batch-1" | "batch-2" | "batch-3";
}
export interface EventReward {
  owner: number;
  kind: "ships" | "credits";
  amount: number;
  system?: string;
}
export interface EventChoices {
  system?: string;
  planet?: string;
  action?: Action;
  player?: number;
  amount?: number;
  ships?: Record<string, number>;
  settlements?: Record<string, number[]>;
  planets?: string[];
  tech?: string;
  skip?: boolean;
}
export interface ActionChoices {
  invest?: boolean;
  bank?: boolean;
  sources?: Record<string, number>;
  credits?: number;
  attack?: AttackPayload;
  settlements?: Record<string, number>;
  reveal?: boolean;
  carried?: MovePayload["carried"];
  passengerLosses?: MovePayload["passengerLosses"];
  replacements?: Replacements;
}
export type Command =
  | { type: "bid"; amount: number }
  | { type: "selectEvent"; event: string }
  | ({ type: "eventChoice" } & EventChoices)
  | { type: "scramble"; system?: string; skip?: boolean }
  | {
      type: "completeReserve";
      credits?: number;
      ships?: Record<string, number>;
    }
  | { type: "useReserve"; credits?: number; ships?: Record<string, number> }
  | { type: "finishReserve" }
  | { type: "home"; system: string }
  | { type: "plan"; system: string }
  | { type: "planPass" }
  | { type: "filibuster"; system?: string; index?: number; skip?: boolean }
  | { type: "insurance"; system?: string }
  | { type: "eminent"; use: boolean }
  | { type: "mercenaries"; count: number }
  | { type: "orderAfter"; tech: string }
  | { type: "returnCredits"; count: number }
  | ({ type: "act" } & ActionChoices)
  | { type: "rapid"; planet?: string; skip?: boolean }
  | ({
      type: "resolve";
      system: string;
      action: Action;
      slot?: Action;
      invest?: boolean;
    } & ActionChoices)
  | { type: "orient"; rotation: number }
  | ({ type: "move" } & MovePayload)
  | { type: "settle"; planet: string; count: number }
  | { type: "finishSettle" }
  | {
      type: "settleBatch";
      settlements: Record<string, number>;
      replacements?: Replacements;
    }
  | { type: "continueEvent" }
  | { type: "acknowledge" }
  | {
      type: "redistribute";
      ships: number;
      settlements: Record<string, number>;
      replacements?: Replacements;
    }
  | { type: "nextRound" }
  | { type: "explore"; recipient: number }
  | { type: "allocate"; credits: number; ships: Record<string, number> }
  | {
      type: "buy";
      tech: string | null;
      fullPrice?: boolean;
      value?: number;
      target?: { player: number; tech: string };
    }
  | {
      type: "feature";
      system?: string;
      planet?: string;
      edge?: number;
      skip?: boolean;
    };
