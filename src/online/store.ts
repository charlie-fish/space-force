import type { Game } from "../types.js";
import { restoreGame } from "../persistence.js";
import { RELEASE_VERSION } from "../version.js";
import type { RoomSettings } from "./protocol.js";

export interface Member {
  id: string;
  name: string;
  style: number;
  ready: boolean;
  playerId: number | null;
  historyFrom?: number;
}
export interface RoomRecord {
  id: string;
  host: string;
  status: "waiting" | "playing" | "finished";
  settings: RoomSettings;
  members: Member[];
  game: Game | null;
  version: number;
  createdAt: number;
  updatedAt: number;
  clocks: Record<string, { key: string; since: number; pauseBaseline: number }>;
  votes: Record<string, string[]>;
  pause: { since: number | null; total: number; votes: string[] };
  audit: {
    at: number;
    member: string | null;
    action: string;
    details?: Record<string, unknown>;
  }[];
}
export interface SqlQuery {
  sql: string;
  params: unknown[];
}
export interface SqlResult {
  results: Record<string, unknown>[];
  changes: number;
}
export interface SqlDriver {
  query(sql: string, params?: unknown[]): Promise<SqlResult>;
  batch(queries: SqlQuery[]): Promise<SqlResult[]>;
}
export interface Presence {
  seenAt: number;
  respondedAt: number;
  pauseBaseline: number;
  responsePauseBaseline: number;
}
export class RoomStore {
  constructor(readonly db: SqlDriver) {}
  async get(id: string): Promise<RoomRecord | null> {
    const row = (
      await this.db.query("SELECT data FROM sf_rooms WHERE id=?", [id])
    ).results[0];
    if (!row) return null;
    const room = JSON.parse(String(row.data)) as RoomRecord;
    if (room.game && room.game.engine !== RELEASE_VERSION)
      room.game = restoreGame(room.game);
    return room;
  }
  async authenticate(
    hash: string,
    roomId?: string,
  ): Promise<{ roomId: string; memberId: string } | null> {
    const row = (
      await this.db.query(
        "SELECT room_id,member_id FROM sf_credentials WHERE token_hash=?",
        [hash],
      )
    ).results[0];
    return row && (!roomId || row.room_id === roomId)
      ? { roomId: String(row.room_id), memberId: String(row.member_id) }
      : null;
  }
  async insert(room: RoomRecord, hash: string, memberId: string) {
    await this.db.batch([
      {
        sql: "INSERT INTO sf_rooms(id,visibility,status,revision,updated_at,mutation_id,data) VALUES(?,?,?,?,?,?,?)",
        params: [
          room.id,
          room.settings.visibility,
          room.status,
          room.version,
          room.updatedAt,
          "created",
          JSON.stringify(room),
        ],
      },
      {
        sql: "INSERT INTO sf_credentials(token_hash,room_id,member_id) VALUES(?,?,?)",
        params: [hash, room.id, memberId],
      },
    ]);
  }
  async save(
    room: RoomRecord,
    previous: number,
    mutation: string,
    receipt?: { member: string; id: string; digest: string },
    credential?: { hash: string; member: string },
    presence?: { member: string; value: Presence },
  ): Promise<boolean> {
    const next = previous + 1;
    room.version = next;
    const queries: SqlQuery[] = [
      {
        sql: "UPDATE sf_rooms SET visibility=?,status=?,revision=?,updated_at=?,mutation_id=?,data=? WHERE id=? AND revision=?",
        params: [
          room.settings.visibility,
          room.status,
          next,
          room.updatedAt,
          mutation,
          JSON.stringify(room),
          room.id,
          previous,
        ],
      },
    ];
    if (receipt)
      queries.push({
        sql: "INSERT INTO sf_receipts(room_id,member_id,command_id,digest,game_revision) SELECT id,?,?,?,? FROM sf_rooms WHERE id=? AND revision=? AND mutation_id=?",
        params: [
          receipt.member,
          receipt.id,
          receipt.digest,
          room.game?.revision ?? 0,
          room.id,
          next,
          mutation,
        ],
      });
    if (credential)
      queries.push({
        sql: "INSERT INTO sf_credentials(token_hash,room_id,member_id) SELECT ?,id,? FROM sf_rooms WHERE id=? AND revision=? AND mutation_id=?",
        params: [credential.hash, credential.member, room.id, next, mutation],
      });
    if (presence)
      queries.push({
        sql: "INSERT INTO sf_presence(room_id,member_id,seen_at,responded_at,pause_baseline,response_pause) SELECT id,?,?,?,?,? FROM sf_rooms WHERE id=? AND revision=? AND mutation_id=? ON CONFLICT(room_id,member_id) DO UPDATE SET seen_at=excluded.seen_at,responded_at=excluded.responded_at,pause_baseline=excluded.pause_baseline,response_pause=excluded.response_pause",
        params: [
          presence.member,
          presence.value.seenAt,
          presence.value.respondedAt,
          presence.value.pauseBaseline,
          presence.value.responsePauseBaseline,
          room.id,
          next,
          mutation,
        ],
      });
    const result = await this.db.batch(queries);
    return result[0].changes === 1;
  }
  async receipt(
    room: string,
    member: string,
    id: string,
  ): Promise<{ digest: string; revision: number } | null> {
    const row = (
      await this.db.query(
        "SELECT digest,game_revision FROM sf_receipts WHERE room_id=? AND member_id=? AND command_id=?",
        [room, member, id],
      )
    ).results[0];
    return row
      ? { digest: String(row.digest), revision: Number(row.game_revision) }
      : null;
  }
  async publicRooms(): Promise<RoomRecord[]> {
    return (
      await this.db.query(
        "SELECT data FROM sf_rooms WHERE visibility='public' AND status='waiting' ORDER BY updated_at DESC LIMIT 50",
      )
    ).results.map((row) => JSON.parse(String(row.data)) as RoomRecord);
  }
  async presences(room: string): Promise<Record<string, Presence>> {
    return Object.fromEntries(
      (
        await this.db.query(
          "SELECT member_id,seen_at,responded_at,pause_baseline,response_pause FROM sf_presence WHERE room_id=?",
          [room],
        )
      ).results.map((row) => [
        String(row.member_id),
        {
          seenAt: Number(row.seen_at),
          respondedAt: Number(row.responded_at),
          pauseBaseline: Number(row.pause_baseline),
          responsePauseBaseline: Number(row.response_pause),
        },
      ]),
    );
  }
  async presence(room: string, member: string, p: Presence) {
    await this.db.query(
      "INSERT INTO sf_presence(room_id,member_id,seen_at,responded_at,pause_baseline,response_pause) VALUES(?,?,?,?,?,?) ON CONFLICT(room_id,member_id) DO UPDATE SET seen_at=excluded.seen_at,responded_at=MAX(sf_presence.responded_at,excluded.responded_at),pause_baseline=excluded.pause_baseline,response_pause=excluded.response_pause",
      [
        room,
        member,
        p.seenAt,
        p.respondedAt,
        p.pauseBaseline,
        p.responsePauseBaseline,
      ],
    );
  }
  async limit(
    bucket: string,
    now: number,
    max: number,
    window: number,
  ): Promise<boolean> {
    const result = await this.db.query(
      "INSERT INTO sf_limits(bucket,reset_at,count) VALUES(?,?,1) ON CONFLICT(bucket) DO UPDATE SET count=CASE WHEN sf_limits.reset_at<=? THEN 1 ELSE sf_limits.count+1 END,reset_at=CASE WHEN sf_limits.reset_at<=? THEN excluded.reset_at ELSE sf_limits.reset_at END RETURNING count",
      [bucket, now + window, now, now],
    );
    return Number(result.results[0]?.count) <= max;
  }
}
