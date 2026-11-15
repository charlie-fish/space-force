import { ACTION_LABELS, ART, CARD_MAP, STYLES } from "./content.js";
import {
  applyCommand,
  assertInvariants,
  availableSystems,
  blackHoles,
  canMove,
  canPlan,
  createGame,
  edges,
  featureOptions,
  freeSpace,
  hasTech,
  nameOf,
  player,
  production,
  purchaseReason,
  reinforceCount,
  scoreGame,
  seedFrom,
  system,
  warp,
} from "./engine.js";
import type { Action, AttackPayload, Command, Game, System } from "./types.js";

type View = "board" | "techs" | "event" | "actions" | "player_aid";
interface Draft {
  action: Action | null;
  invest: boolean;
  bank: boolean;
  sources: Record<string, number>;
  credits?: number;
  sacrifice: number;
  targets: Record<string, number>;
  colonies: Record<string, Record<string, number>>;
  allocation: Record<string, number>;
}
const freshDraft = (): Draft => ({
  action: null,
  invest: false,
  bank: false,
  sources: {},
  sacrifice: 0,
  targets: {},
  colonies: {},
  allocation: {},
});
const escape = (value: unknown): string =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const attrs = (value: unknown) => escape(value);
const STORAGE_KEY = "space-force.local-family.v1";
const VIEW_LABELS: Record<View, string> = {
  board: "Board",
  techs: "Techs",
  event: "Event",
  actions: "Actions",
  player_aid: "Player Aid",
};
const SHAPES = [
  "M0 -18 L10 -4 L10 12 L12 18 L5 18 L4 14 L-4 14 L-5 18 L-12 18 L-10 12 L-10 -4 Z",
  "M0 -19 L4 -12 L3 -10 L7 -10 L7 -5 L11 -5 L11 0 L8 0 L8 10 L11 10 L11 17 L4 17 L3 12 L-3 12 L-4 17 L-11 17 L-11 10 L-8 10 L-8 0 L-11 0 L-11 -5 L-7 -5 L-7 -10 L-3 -10 L-4 -12 Z",
  "M0 -19 L3 -13 L3 -10 L8 -8 L10 -1 L5 4 L10 8 L10 17 L4 17 L2 12 L-2 12 L-4 17 L-10 17 L-10 8 L-5 4 L-10 -1 L-8 -8 L-3 -10 L-3 -13 Z",
  "M0 -18 C3 -17 3 -8 9 -6 C12 -4 6 1 7 8 L10 17 L3 17 L2 13 L-2 13 L-3 17 L-10 17 L-7 8 C-6 1 -12 -4 -9 -6 C-3 -8 -3 -17 0 -18 Z",
  "M1 -19 L10 -8 L6 -8 L6 -2 L10 -2 L10 5 L5 5 L5 10 L9 10 L9 17 L3 17 L1 12 L-2 12 L-4 17 L-9 17 L-9 10 L-6 10 L-6 5 L-10 5 L-10 -2 L-6 -2 L-6 -10 L-2 -10 Z",
  "M0 -18 L11 -5 L10 12 L12 18 L5 18 L4 14 L-4 14 L-5 18 L-12 18 L-10 12 L-11 -5 Z M-2 -4 L-2 4 L2 4 L2 -4 Z",
  "M-8 -18 L-2 -8 L-2 1 L2 1 L2 -8 L8 -18 L14 -8 L14 14 L10 18 L5 18 L3 12 L-3 12 L-5 18 L-10 18 L-14 14 L-14 -8 Z",
];
export function rocket(style: number, size = 22, horizontal = false): string {
  const color = STYLES[style].color;
  return `<svg aria-hidden="true" class="rocket" width="${size}" height="${size}" viewBox="-22 -22 44 44"><path d="${SHAPES[style]}" fill="${color}" fill-rule="evenodd" stroke="#f4ebd3" stroke-width="1.5" ${horizontal ? 'transform="rotate(90)"' : ""}/></svg>`;
}
function chipFace(
  style: number,
  x: number,
  y: number,
  radius: number,
  face = true,
): string {
  const motifs = [
    '<circle r="1.5" fill="currentColor"/>',
    '<path d="M-3 0H3" stroke="currentColor" stroke-width="2"/>',
    '<path d="M-2-2V2M2-2V2" stroke="currentColor" stroke-width="1.5"/>',
    '<path d="M-2-2L0 1L2-2" fill="none" stroke="currentColor" stroke-width="1.5"/>',
    '<path d="M-2-2H0V0H-2ZM0 0H2V2H0Z" fill="currentColor"/>',
    '<path d="M-3 1Q-1-3 1 0T4-1" fill="none" stroke="currentColor" stroke-width="1.5"/>',
    '<path d="M0-2L2 2H-2Z" fill="currentColor"/>',
  ];
  const rim = Array.from(
    { length: 12 },
    (_, i) =>
      `<g transform="rotate(${i * 30}) translate(0 -22)">${motifs[style]}</g>`,
  ).join("");
  return `<g transform="translate(${x} ${y}) scale(${radius / 26})"><circle cy="2" r="26" fill="#171420" stroke="#f3ead3"/><circle r="26" fill="${STYLES[style].color}" stroke="#352d42" stroke-width="1.2"/><g style="color:#f5e9cc">${rim}</g><circle r="18.5" fill="none" stroke="#352d4266"/>${face ? `<path d="${SHAPES[style]}" transform="scale(.72)" fill="#352d42" fill-rule="evenodd" stroke="#f5e9cc" stroke-width=".8"/>` : ""}</g>`;
}

export function mountApp(
  root: HTMLElement,
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem">,
) {
  let game: Game | null = null;
  let selected: string | null = null;
  let selectedPlanet: string | null = null;
  let view: View = "board";
  let draft = freshDraft();
  let error = "";
  let count = 2;
  let names = Array.from({ length: 7 }, (_, i) => `Player ${i + 1}`);
  let mapCode = "SPACE FORCE";
  let zoom = 1,
    panX = 0,
    panY = 0,
    showHelp = false,
    activeCard: string | null = null,
    shortcuts = true;
  let guide = true,
    savedAvailable = false,
    autosave = Boolean(storage);
  let pointerPositions = new Map<number, { x: number; y: number }>();
  let lastDrag: { x: number; y: number } | null = null;
  let dragged = false;
  let swipe: { id: number; x: number; y: number } | null = null;
  let suppressClickUntil = 0;
  let overlayReturn: { action?: string; card?: string } | null = null;
  let scrollView: View | null = null;
  let previousScroll = 0;
  const read = (key: string) => {
    try {
      return storage?.getItem(key) ?? null;
    } catch {
      autosave = false;
      return null;
    }
  };
  const write = (key: string, value: string) => {
    try {
      storage?.setItem(key, value);
    } catch {
      autosave = false;
    }
  };
  savedAvailable = Boolean(read(STORAGE_KEY));
  guide = read("space-force.guide") !== "off";

  function save() {
    if (game) {
      write(STORAGE_KEY, JSON.stringify(game));
      savedAvailable = true;
    }
  }
  function setView(next: View) {
    scrollView = view;
    previousScroll = root.querySelector(".main-panel")?.scrollTop ?? 0;
    view = next;
    render();
    root
      .querySelector<HTMLElement>(`#tab-${view}`)
      ?.focus({ preventScroll: true });
  }
  function closeOverlay() {
    showHelp = false;
    activeCard = null;
    render();
    const control = [
      ...root.querySelectorAll<HTMLElement>("[data-action]"),
    ].find(
      (el) =>
        el.dataset.action === overlayReturn?.action &&
        (!overlayReturn?.card || el.dataset.card === overlayReturn.card),
    );
    (control ?? root.querySelector<HTMLElement>(`#tab-${view}`))?.focus({
      preventScroll: true,
    });
  }
  function perform(command: Command) {
    if (!game) return;
    const old = game;
    try {
      game = applyCommand(game, game.turn, command, game.revision);
      error = "";
      draft = freshDraft();
      selectedPlanet = null;
      if (
        game.pending &&
        ["orient", "move", "settle", "explore", "feature", "genesis"].includes(
          game.pending.kind,
        )
      ) {
        view = "board";
        if ("system" in game.pending) selected = game.pending.system;
      } else if (game.phase === "tech") view = "techs";
      else if (game.phase === "investments" || game.phase === "reinforce")
        view = "actions";
      else if (game.phase !== old.phase || game.turn !== old.turn)
        view = "board";
      if (game.pending?.kind === "move")
        draft.sources = { ...game.pending.sources };
      save();
      render();
      root
        .querySelector<HTMLElement>(".turn-bar")
        ?.focus({ preventScroll: true });
    } catch (e) {
      error =
        e instanceof Error ? e.message : "This choice could not be applied.";
      render();
    }
  }
  function start() {
    game = createGame(count, seedFrom(mapCode || String(Date.now())), names);
    selected = null;
    draft = freshDraft();
    view = "board";
    zoom = 1;
    panX = panY = 0;
    error = "";
    save();
    render();
  }
  function resume() {
    try {
      const raw = read(STORAGE_KEY);
      if (!raw) throw Error("No saved game is available.");
      const loaded = JSON.parse(raw) as Game;
      assertInvariants(loaded);
      game = loaded;
      view = loaded.pending
        ? "board"
        : loaded.phase === "tech"
          ? "techs"
          : ["reinforce", "investments"].includes(loaded.phase)
            ? "actions"
            : "board";
      draft = freshDraft();
      if (loaded.pending?.kind === "move")
        draft.sources = { ...loaded.pending.sources };
      error = "";
      render();
    } catch {
      game = null;
      error =
        "The saved game could not be restored. Its version may differ from this prototype. You can start a new game.";
      render();
    }
  }
  function badge(style: number, name: string) {
    return `<span class="player-badge" style="--player:${STYLES[style].color}">${rocket(style, 25)}<span>${escape(name)}</span></span>`;
  }
  function button(
    label: string,
    action: string,
    extra = "",
    disabled = false,
    cls = "",
  ) {
    return `<button type="button" class="${cls}" data-action="${action}" ${extra} ${disabled ? "disabled" : ""}>${label}</button>`;
  }
  function numberControl(
    label: string,
    field: string,
    value: number,
    max: number,
    extra = "",
  ) {
    return `<label class="quantity-row"><span>${label}</span><input inputmode="numeric" type="number" min="0" max="${Math.max(0, max)}" value="${Math.max(0, value)}" data-number="${field}" ${extra} aria-label="${attrs(label.replace(/<[^>]*>/g, ""))}"/></label>`;
  }
  function phaseLabel(g: Game) {
    return {
      homes: "Choose homes",
      plan: "Plan",
      actions: "Actions",
      investments: "Investments",
      tech: "Buy Tech",
      reinforce: "Reinforce",
      finished: "Final scores",
    }[g.phase];
  }
  function instruction(g: Game) {
    const pending = g.pending;
    if (pending?.kind === "orient")
      return "Exploration committed. Choose a legal orientation.";
    if (pending?.kind === "move")
      return "Finish your committed movement into the revealed system.";
    if (pending?.kind === "settle")
      return "Place Settlements, then finish this committed action.";
    if (pending?.kind === "explore")
      return "Choose another player for the revealed Explore benefit.";
    if (pending?.kind === "genesis")
      return "Genesis: choose an empty, face-up planet.";
    if (pending?.kind === "feature")
      return `${CARD_MAP[pending.tech].title}: place the effect in a legal location.`;
    return {
      homes: "Select an unclaimed home system on the map.",
      plan: `Place one of your ${player(g).unplaced} remaining chips on a system.`,
      actions: "Select a stack with your chip on top, then an unused action.",
      investments: `Allocate your ${player(g).invested} invested rockets.`,
      tech: "Buy one shared Tech or pass. Cards stay in the market.",
      reinforce: `Place ${reinforceCount(g)} Ships at home or where you have a Settlement.`,
      finished: "One point per settled planet, ship system, and owned Tech.",
    }[g.phase];
  }
  function tutorial(g: Game) {
    if (!guide) return "";
    const tips: Record<string, string> = {
      homes:
        "Your starting home gets 3 Settlements and 3 Ships. Rockets elsewhere remain in Reserve. Choose freely in player order.",
      plan: "Chips form stacks. Later, only the top chip can be resolved. The destination of a chip determines where its action happens; choose its action later.",
      actions:
        "Use each action slot once per round, or Invest it. Draft choices can be reset before Commit. Committed actions and information reveals cannot be undone.",
      investments:
        "An invested rocket becomes a Credit or a Ship. These rockets are already outside Reserve. Ships can go home or wherever you have a Settlement.",
      tech: "Techs are shared: several players can buy the same card. Ownership uses one Reserve rocket and scores one point. Patents can restrict later purchases.",
      reinforce:
        "Reinforcements come from Reserve. You may distribute them between your home and systems containing your Settlements.",
      finished:
        "Settlements score per planet, Ships score per system, and each owned Tech scores one. Credits break ties; tied players can share victory.",
    };
    return `<aside class="guide" aria-label="Learn as you play"><div><span class="eyebrow">Learn as you play</span><p>${escape(g.pending ? instruction(g) : tips[g.phase])}</p></div>${button("Hide guide", "guide-off", "", false, "quiet")}</aside>`;
  }
  function landing() {
    return `<main class="landing"><div class="landing-art"><img src="${ART.cover.image}" width="562" height="768" alt="Space Force cover: rocket fleets above a ringed planet"/><span class="cover-credit">A game by Charlie Fish</span></div><section class="landing-copy"><div class="eyebrow">Local pass-and-play · Prototype 0.8</div><h1>Claim your<br/><span>corner of space.</span></h1><p class="lead">Plan your moves. Explore new systems. Settle the galaxy.</p><div class="scope-note"><strong>This build: Family Techs + simpler Events.</strong><span>A complete local game for 2–7 players on one device. Event cards count rounds; their effects and auctions are disabled. Remote rooms and the wider card set follow later.</span></div><form id="setup-form"><fieldset><legend>How many players?</legend><div class="player-counts">${Array.from({ length: 6 }, (_, i) => button(String(i + 2), "count", `data-count="${i + 2}" aria-pressed="${count === i + 2}"`, false, count === i + 2 ? "selected" : "")).join("")}</div></fieldset><div class="name-grid">${names
      .slice(0, count)
      .map(
        (name, i) =>
          `<label>${rocket(i, 23)}<span class="sr-only">Player ${i + 1} name</span><input maxlength="24" name="name-${i}" data-name="${i}" value="${attrs(name)}" aria-label="Player ${i + 1} name"/></label>`,
      )
      .join(
        "",
      )}</div><details class="map-code"><summary>Map code & replay</summary><label>Map code <input name="map-code" id="map-code" maxlength="80" value="${attrs(mapCode)}"/></label><p>Use the same code and player count to reproduce setup.</p></details><button type="submit" class="primary big">Start a new expedition <span aria-hidden="true">↗</span></button></form>${savedAvailable ? button("Continue saved game", "resume", "", false, "secondary big") : ""}${error ? `<p role="alert" class="error">${escape(error)}</p>` : ""}<p class="landing-foot">No account or download. Your game stays on this device. ${button("Rules & prototype scope", "help", "", false, "text-link")}</p></section></main>`;
  }

  function systemMap(g: Game) {
    const W = Math.sqrt(3) * 100;
    const centers = g.systems.map((s) => ({
      s,
      x: W * (s.q + s.r / 2),
      y: 150 * s.r,
    }));
    const minX = Math.min(...centers.map((c) => c.x)) - 130,
      maxX = Math.max(...centers.map((c) => c.x)) + 130;
    const minY = Math.min(...centers.map((c) => c.y)) - 135,
      maxY = Math.max(...centers.map((c) => c.y)) + 135;
    const cx = (minX + maxX) / 2 + panX,
      cy = (minY + maxY) / 2 + panY;
    const width = (maxX - minX) / zoom,
      height = (maxY - minY) / zoom;
    const point = (x: number, y: number, rotation: number) => {
      const a = (rotation * Math.PI) / 3;
      const px = (x - 0.5) * W,
        py = (y - 0.5) * 200;
      return [
        px * Math.cos(a) - py * Math.sin(a),
        px * Math.sin(a) + py * Math.cos(a),
      ];
    };
    const glyph = (id: number, x: number, y: number, size: number, angle = 0) =>
      `<g transform="translate(${x} ${y}) rotate(${angle}) scale(${size / 40})"><path d="${SHAPES[id]}" fill="${STYLES[id].color}" fill-rule="evenodd" stroke="#f4ebd3" stroke-width="2"/></g>`;
    const tiles = centers
      .map(({ s, x, y }) => {
        const art = ART.systems[s.template];
        const [sunX, sunY] = s.revealed
          ? point(art.sun.x, art.sun.y, s.rotation)
          : [0, 0];
        const top = s.tokens[s.tokens.length - 1];
        const eligible = g.phase === "actions" && top === g.turn;
        const planets = !s.revealed
          ? ""
          : s.planets
              .map((p, i) => {
                const [px, py] = point(p.x, p.y, s.rotation);
                const size = art.planets[i]
                  ? Math.min(28, art.planets[i].radiusX * W)
                  : 17;
                const occupied = p.owners.flatMap(
                  (n, id) => Array(n).fill(id) as number[],
                );
                const colonies = occupied
                  .map((id, j) => {
                    const angle =
                      (j * Math.PI * 2) / Math.max(p.capacity, 1) - Math.PI / 2;
                    return glyph(
                      id,
                      px + (p.capacity > 1 ? Math.cos(angle) * size * 0.53 : 0),
                      py + (p.capacity > 1 ? Math.sin(angle) * size * 0.53 : 0),
                      p.capacity > 3 ? 16 : 18,
                    );
                  })
                  .join("");
                return `<g data-system="${s.id}" data-planet="${p.id}"><title>Planet ${i + 1}: ${occupied.length}/${p.capacity} Settlements${p.home ? ", home planet" : ""}${p.explore ? ", hidden Explore token" : ""}${p.blocked ? ", blocked" : ""}</title>${i >= art.planets.length ? `<circle cx="${px}" cy="${py}" r="${size}" fill="#b79b60" stroke="#f5e5b2"/>` : ""}<circle cx="${px}" cy="${py}" r="${size + 3}" fill="transparent" stroke="${selectedPlanet === p.id ? "#fff2c2" : "transparent"}" stroke-width="2"/>${colonies}${p.explore ? `<g><circle cx="${px - size * 0.7}" cy="${py - size * 0.7}" r="8" fill="#d7bf78" stroke="#332a35"/><text x="${px - size * 0.7}" y="${py - size * 0.7 + 3}" class="explore-label">?</text></g>` : ""}${p.blocked ? `<circle cx="${px}" cy="${py}" r="${size}" fill="#13111c" stroke="#db9257"/><text x="${px}" y="${py + 5}" class="blocked-label">×</text>` : ""}</g>`;
              })
              .join("");
        const fleets = s.ships
          .map((n, id) => ({ n, id }))
          .filter((f) => f.n > 0)
          .map((f, i, list) => {
            const columns = Math.min(list.length, 4);
            const fx = ((i % 4) - (columns - 1) / 2) * 33,
              fy = 68 + Math.floor(i / 4) * 20;
            return `<g><rect x="${fx - 16}" y="${fy - 10}" width="33" height="21" rx="6" fill="#211d32" fill-opacity=".94"/>${glyph(f.id, fx - 5, fy, 17, 90)}<text x="${fx + 9}" y="${fy + 4}" class="fleet-label">${f.n}</text></g>`;
          })
          .join("");
        const chips = s.tokens
          .map((owner, i) =>
            chipFace(
              owner,
              sunX,
              sunY - i * 3.5,
              s.revealed ? Math.min(28, art.sun.radiusX * W) : 25,
              i === s.tokens.length - 1,
            ),
          )
          .join("");
        const extraEdges = s.extraEdges
          .map(
            (e) =>
              `<line x1="${W / 2}" y1="-50" x2="${W / 2}" y2="50" transform="rotate(${e * 60})" stroke="#e4bd7b" stroke-width="8" stroke-dasharray="5 4"/>`,
          )
          .join("");
        return `<g transform="translate(${x} ${y})" class="system ${selected === s.id ? "chosen" : ""} ${eligible ? "eligible" : ""}" data-system="${s.id}" role="button" tabindex="0" aria-label="${attrs(nameOf(s))}${s.tokens.length ? `, ${s.tokens.length} chips, ${attrs(player(g, top).name)} on top` : ""}"><title>${attrs(nameOf(s))}</title><g transform="rotate(${s.revealed ? s.rotation * 60 : 0})"><image href="${s.revealed ? art.image : ART.backs.system.image}" x="${-W / 2}" y="-100" width="${W}" height="200" clip-path="url(#hex-clip)"/></g><polygon points="0,-100 ${W / 2},-50 ${W / 2},50 0,100 ${-W / 2},50 ${-W / 2},-50" class="hex-outline"/>${extraEdges}${planets}${fleets}${chips}<rect x="-67" y="-95" width="134" height="19" rx="5" fill="#211d32" fill-opacity=".88"/><text x="0" y="-82" class="system-name">${escape(nameOf(s))}</text>${s.extraWarp ? `<text x="-64" y="-58" class="feature-label">↔ Warp</text>` : ""}${s.extraHoles ? `<text x="-64" y="-43" class="feature-label">◉ +${s.extraHoles}</text>` : ""}${s.tokens.length ? `<text x="${sunX}" y="${sunY + 43}" class="stack-count">${s.tokens.length} chip${s.tokens.length === 1 ? "" : "s"}</text>` : ""}</g>`;
      })
      .join("");
    return `<section class="map-wrap" aria-label="Galaxy board"><div class="map-toolbar"><span>Tap a system to inspect</span><div>${button("−", "zoom-out", 'aria-label="Zoom out"')}${button("Fit", "fit", 'aria-label="Fit whole board"')}${button("+", "zoom-in", 'aria-label="Zoom in"')}</div></div><div class="map-viewport" tabindex="0" aria-label="Galaxy map; arrow keys pan, plus and minus zoom"><svg id="galaxy" role="img" aria-label="Space Force galaxy" viewBox="${cx - width / 2} ${cy - height / 2} ${width} ${height}"><defs><clipPath id="hex-clip"><polygon points="0,-100 ${W / 2},-50 ${W / 2},50 0,100 ${-W / 2},50 ${-W / 2},-50"/></clipPath></defs>${tiles}</svg></div><div class="map-pan" aria-label="Pan board">${button("←", "pan-left", 'aria-label="Pan left"')}${button("↑", "pan-up", 'aria-label="Pan up"')}${button("↓", "pan-down", 'aria-label="Pan down"')}${button("→", "pan-right", 'aria-label="Pan right"')}<span>Pinch to zoom · drag background to pan</span></div></section>`;
  }

  function cameraBox() {
    if (!game) return [0, 0, 1, 1];
    const xs = game.systems.map((s) => Math.sqrt(3) * 100 * (s.q + s.r / 2));
    const ys = game.systems.map((s) => 150 * s.r);
    const minX = Math.min(...xs) - 130,
      maxX = Math.max(...xs) + 130;
    const minY = Math.min(...ys) - 135,
      maxY = Math.max(...ys) + 135;
    const width = (maxX - minX) / zoom,
      height = (maxY - minY) / zoom;
    return [
      (minX + maxX) / 2 + panX - width / 2,
      (minY + maxY) / 2 + panY - height / 2,
      width,
      height,
    ];
  }
  function updateCamera() {
    root
      .querySelector("#galaxy")
      ?.setAttribute("viewBox", cameraBox().join(" "));
  }
  function mapPoint(x: number, y: number) {
    const svg = root.querySelector<SVGSVGElement>("#galaxy");
    if (svg?.createSVGPoint && svg.getScreenCTM()) {
      const point = svg.createSVGPoint();
      point.x = x;
      point.y = y;
      const mapped = point.matrixTransform(svg.getScreenCTM()!.inverse());
      return { x: mapped.x, y: mapped.y };
    }
    const [vx, vy, vw, vh] = cameraBox();
    const rect = svg?.getBoundingClientRect();
    return {
      x: vx + ((x - (rect?.left ?? 0)) * vw) / (rect?.width || vw),
      y: vy + ((y - (rect?.top ?? 0)) * vh) / (rect?.height || vh),
    };
  }

  function movementControls(
    g: Game,
    target: System,
    values: Record<string, number>,
  ) {
    const origins = g.systems.filter(
      (s) => s.ships[g.turn] > 0 && canMove(g, g.turn, s, target),
    );
    return origins.length
      ? origins
          .map((s) =>
            numberControl(
              `${escape(nameOf(s))} <small>${s.ships[g.turn]} available</small>`,
              "source",
              values[s.id] ?? 0,
              s.ships[g.turn],
              `data-id="${s.id}"`,
            ),
          )
          .join("")
      : '<p class="muted">No Ships have a legal route here. An empty MOVE INTO is allowed.</p>';
  }
  function actionForm(g: Game, s: System) {
    const p = player(g);
    if (draft.invest)
      return `<p>Use your ${draft.action} slot to Invest ${p.reserve ? "one Reserve rocket" : "without a rocket (Reserve is empty)"}. Cash it during Economy.</p>`;
    if (draft.action === "move")
      return `<p>Choose incoming Ships. ${!s.revealed ? "A positive movement reveals this system and locks Undo; orientation follows." : `${blackHoles(s)} black hole(s) here.`}</p>${movementControls(g, s, draft.sources)}`;
    if (draft.action === "settle")
      return "<p>Commit the SETTLE slot, then choose planets one at a time. Hidden Explore tokens resolve before your Settlement. You can finish without placing more.</p>";
    if (draft.action === "produce") {
      const total = Math.min(p.reserve, production(g, s));
      return `<p><strong>${total} rockets</strong> available from ${production(g, s)} production. Each full planet gives a bonus.</p>${numberControl("Take as Credits", "produce-credits", draft.credits ?? total, total)}<p>The remaining rockets become Ships in this system.</p>`;
    }
    if (draft.action === "attack") {
      return `<p>Each sacrificed Ship removes up to two opposing Ships <strong>or</strong> one Settlement. All casualties return as Credits.</p>${numberControl("Your Ships to sacrifice", "sacrifice", draft.sacrifice, s.ships[g.turn])}<h4>Opposing Ships</h4>${
        g.players
          .filter((other) => other.id !== p.id && s.ships[other.id] > 0)
          .map((other) =>
            numberControl(
              escape(other.name),
              "target-ships",
              draft.targets[String(other.id)] ?? 0,
              s.ships[other.id],
              `data-id="${other.id}"`,
            ),
          )
          .join("") || '<p class="muted">None in this system.</p>'
      }<h4>Opposing Settlements</h4>${s.planets
        .map((planet, index) =>
          planet.owners[p.id] > 0
            ? `<p class="muted">Planet ${index + 1}: protected because you share it.</p>`
            : g.players
                .filter(
                  (other) => other.id !== p.id && planet.owners[other.id] > 0,
                )
                .map((other) =>
                  numberControl(
                    `${escape(other.name)} · planet ${index + 1}`,
                    "target-colony",
                    draft.colonies[planet.id]?.[String(other.id)] ?? 0,
                    planet.owners[other.id],
                    `data-id="${other.id}" data-planet="${planet.id}"`,
                  ),
                )
                .join(""),
        )
        .join("")}`;
    }
    return "";
  }
  function inspector(g: Game) {
    const s = selected ? g.systems.find((s) => s.id === selected) : null;
    const pending = g.pending;
    if (pending?.kind === "orient")
      return `<section class="console"><div class="eyebrow">Reveal committed · Undo locked</div><h2>Orient ${escape(nameOf(system(g, pending.system)))}</h2><p>Choose a rotation that preserves the entry route and the board's edge/warp connectivity.</p><div class="rotation-options">${pending.rotations.map((r) => button(`${r * 60}°`, "orient", `data-rotation="${r}"`, false, "secondary")).join("")}</div></section>`;
    if (pending?.kind === "move") {
      const target = system(g, pending.system);
      return `<section class="console"><div class="eyebrow">Committed move</div><h2>Enter ${escape(nameOf(target))}</h2>${movementControls(g, target, draft.sources)}<p>${blackHoles(target)} black hole(s) destroy incoming Ships, returned as Credits.</p>${button("Finish movement", "finish-move", "", false, "primary")}</section>`;
    }
    if (pending?.kind === "explore")
      return `<section class="console"><div class="eyebrow">Explore token revealed · Undo locked</div><h2>A gift for a rival</h2><p>Choose another player to receive ${pending.effect === "otherShips" ? "up to 2 Ships in this system" : "1 Settlement on this planet"} from their Reserve.</p><div class="recipient-options">${g.players
        .filter((p) => p.id !== g.turn)
        .map((p) =>
          button(
            `${rocket(p.style)} ${escape(p.name)} <small>${p.reserve} Reserve</small>`,
            "recipient",
            `data-recipient="${p.id}"`,
            false,
            "secondary",
          ),
        )
        .join("")}</div></section>`;
    if (pending?.kind === "settle") {
      const target = system(g, pending.system);
      return `<section class="console"><div class="eyebrow">Committed SETTLE</div><h2>${escape(nameOf(target))}</h2><p>${target.ships[g.turn]} Ships remain. Select a planet below or tap it on the map.</p>${target.planets.map((planet, index) => `<div class="planet-choice ${selectedPlanet === planet.id ? "highlight" : ""}"><div><strong>Planet ${index + 1}${planet.home ? " · home" : ""}</strong><small>${sumOwners(planet.owners)}/${planet.capacity} settled ${planet.explore ? "· hidden Explore token" : ""}</small></div>${button("Settle 1", "settle-one", `data-planet="${planet.id}"`, freeSpace(planet) === 0 || target.ships[g.turn] === 0, "secondary")}</div>`).join("")}${button("Finish settling", "finish-settle", "", false, "primary")}</section>`;
    }
    if (pending?.kind === "feature" || pending?.kind === "genesis") {
      const tech = pending.kind === "genesis" ? "tech.genesis" : pending.tech;
      const options = featureOptions(g, tech);
      return `<section class="console"><div class="eyebrow">${escape(CARD_MAP[tech].title)}</div><h2>Place the effect</h2><p>${escape(CARD_MAP[tech].text)}</p><div class="feature-options">${options
        .map((o) => {
          const target = system(g, o.system);
          const index = target.planets.findIndex((p) => p.id === o.planet);
          return button(
            `${escape(nameOf(target))}${o.planet ? ` · planet ${index + 1}` : ""}${o.edge !== undefined ? ` · edge ${o.edge + 1}` : ""}`,
            "feature",
            `data-system-id="${o.system}" ${o.planet ? `data-planet="${o.planet}"` : ""} ${o.edge !== undefined ? `data-edge="${o.edge}"` : ""}`,
            false,
            "secondary",
          );
        })
        .join(
          "",
        )}</div>${pending.kind === "feature" && pending.optional ? button("Skip optional placement", "skip-feature", "", false, "quiet") : ""}</section>`;
    }
    if (!s)
      return `<section class="console empty-console"><span class="eyebrow">${phaseLabel(g)}</span><h2>Find your next move.</h2><p>${escape(instruction(g))}</p><p class="muted">Select a system to see planets, fleets, and the chip stack.</p></section>`;
    const info = `<div class="system-summary"><span>${
      s.revealed
        ? `${s.planets.length} planets · ${blackHoles(s)} black holes${warp(s) ? " · Warp" : ""}${
            edges(s).length
              ? ` · asteroid edges ${edges(s)
                  .map((e) => e + 1)
                  .join(", ")}`
              : ""
          }`
        : "Contents are hidden until entry"
    }</span><span>${
      s.ships
        .map((n, id) => (n ? `${escape(player(g, id).name)}: ${n} Ships` : ""))
        .filter(Boolean)
        .join(" · ") || "No Ships"
    }</span></div>`;
    let controls = "";
    if (g.phase === "homes")
      controls = button(
        "Choose this home",
        "choose-home",
        "",
        !s.revealed ||
          !s.planets.some((p) => p.home) ||
          g.players.some((p) => p.home === s.id),
        "primary",
      );
    else if (g.phase === "plan")
      controls = `${!canPlan(g, s) ? '<p class="error">Disruptor blocks you here this round.</p>' : ""}${button(`Place chip · ${player(g).unplaced} remaining`, "place-chip", "", !canPlan(g, s), "primary")}`;
    else if (
      g.phase === "actions" &&
      s.tokens[s.tokens.length - 1] === g.turn
    ) {
      controls = `<div class="action-grid">${(Object.keys(ACTION_LABELS) as Action[]).map((action) => button(ACTION_LABELS[action], "select-action", `data-kind="${action}" aria-pressed="${draft.action === action}"`, player(g).used.includes(action), draft.action === action ? "selected" : "")).join("")}</div>${draft.action ? `<label class="check-row"><input type="checkbox" data-check="invest" ${draft.invest ? "checked" : ""}/>Invest instead of acting</label>${actionForm(g, s)}${!draft.invest && hasTech(g, g.turn, "banking") ? `<label class="check-row"><input type="checkbox" data-check="bank" ${draft.bank ? "checked" : ""}/>Banking: also Invest, if Reserve allows</label>` : ""}<div class="commit-row">${button("Undo draft", "undo-draft", "", false, "quiet")}${button("Commit action", "commit-action", "", false, "primary")}</div><small class="muted">No Undo after commitment or a hidden reveal.</small>` : "<p>Choose an unused action slot above.</p>"}`;
    } else if (g.phase === "actions")
      controls =
        '<p class="muted">Select a stack with your chip on top. Other systems remain inspectable.</p>';
    return `<section class="console"><span class="eyebrow">Selected system</span><h2>${escape(nameOf(s))}</h2>${info}${
      s.tokens.length
        ? `<div class="stack-list"><h4>Chip stack · top first</h4>${s.tokens
            .slice()
            .reverse()
            .map(
              (id, i) =>
                `<span class="stack-player">${rocket(id, 22)}${escape(player(g, id).name)}${i === 0 ? " <strong>top</strong>" : ""}</span>`,
            )
            .join("")}</div>`
        : ""
    }${controls}</section>`;
  }

  function supplyAllocation(g: Game) {
    const p = player(g);
    const investments = g.phase === "investments";
    const amount = investments ? p.invested : reinforceCount(g);
    const allocatedShips = Object.values(draft.allocation).reduce(
      (a, b) => a + b,
      0,
    );
    const credits = investments ? (draft.credits ?? amount) : 0;
    return `<section class="console"><div class="eyebrow">${investments ? "Investments" : "Reinforcements"}</div><h2>Allocate ${investments ? amount : `up to ${amount}`} rockets</h2><p>${investments ? "Convert invested rockets into Credits or Ships." : `Add ${amount} Ships from Reserve${hasTech(g, g.turn, "assembly-line") ? " with Assembly Line" : ""}.`}</p>${investments ? numberControl("Take as Credits", "allocate-credits", credits, amount) : ""}${availableSystems(
      g,
    )
      .map((s) =>
        numberControl(
          `Ships in ${escape(nameOf(s))}`,
          "allocate-system",
          draft.allocation[s.id] ?? 0,
          amount,
          `data-id="${s.id}"`,
        ),
      )
      .join(
        "",
      )}<p class="allocation-total ${(investments ? credits + allocatedShips === amount : allocatedShips <= amount) ? "valid" : ""}">${credits + allocatedShips} / ${amount} allocated</p>${!investments ? button("Put all at home", "all-home", "", false, "secondary") : button("All as Credits", "all-credits", "", false, "secondary")}${button("Confirm allocation", "allocate", "", investments ? credits + allocatedShips !== amount : allocatedShips > amount, "primary")}</section>`;
  }
  function actionsView(g: Game) {
    const p = player(g);
    const live = scoreGame(g).find((s) => s.player === p.id)!;
    return `<section class="actions-view"><div class="section-heading"><span class="eyebrow">Your action board</span><h2>${escape(p.name)}’s Actions</h2><p>Four slots, once each round. The chips and receiving cutouts share the same diameter.</p></div><div class="personal-board"><div class="supply reserve"><h3>Reserve</h3>${rocket(p.style, 68)}<strong>${p.reserve}</strong><span>Uncommitted rockets</span></div><div class="action-board">${(Object.keys(ACTION_LABELS) as Action[]).map((action) => `<div class="action-slot ${p.used.includes(action) ? "used" : ""}"><div class="receiving-slot">${p.used.includes(action) ? `<svg class="poker-chip" aria-hidden="true" viewBox="-29 -29 58 60">${chipFace(p.style, 0, 0, 26)}</svg>` : '<span class="empty-chip"></span>'}</div><strong>${ACTION_LABELS[action]}</strong><small>${p.used.includes(action) ? "Used this round" : "Available"}</small></div>`).join("")}</div><div class="supply credits"><h3>Credits</h3>${rocket(p.style, 68)}<strong>${p.credits}</strong><span>Spend on Tech</span></div></div><div class="resource-breakdown"><span><strong>${p.invested}</strong> Invested</span><span><strong>${g.systems.reduce((n, s) => n + s.ships[p.id], 0)}</strong> Ships</span><span><strong>${g.systems.reduce((n, s) => n + s.planets.reduce((a, planet) => a + planet.owners[p.id], 0), 0)}</strong> Settlements</span><span><strong>${p.techs.length}</strong> Tech markers</span><span><strong>40</strong> Rockets total</span></div><p class="score-preview">Current position: ${live.planets} settled planets + ${live.systems} ship systems + ${live.techs} Techs = <strong>${live.total} points</strong></p>${g.phase === "investments" || g.phase === "reinforce" ? supplyAllocation(g) : `<p class="muted">Resolve chips on the Board. Select a stack, assign an unused slot, then act or Invest.</p>${button("Return to Board", "to-board", "", false, "secondary")}`}</section>`;
  }
  function techView(g: Game) {
    return `<section><div class="section-heading"><span class="eyebrow">Official Family preset</span><h2>Technology for a growing empire.</h2><p>Ten shared Techs. Multiple players can own a card; each purchase uses one Reserve rocket as its marker.</p>${g.phase === "tech" && !g.pending ? button("Pass this purchase", "pass-tech", "", false, "secondary") : '<span class="small-tag">Purchases happen during Economy</span>'}</div><div class="tech-grid">${g.market
      .map((id) => {
        const card = CARD_MAP[id];
        const reason = purchaseReason(g, id);
        const owners = g.players.filter((p) => p.techs.includes(id));
        return `<article class="tech-card"><button class="card-art-button" data-action="card" data-card="${id}" aria-label="Read ${attrs(card.title)}"><img src="${ART.cards[id].image}" width="240" height="388" loading="lazy" alt="${attrs(card.title)} original card artwork"/></button><div class="tech-body"><div class="tech-title"><h3>${escape(card.title)}</h3><span class="cost">${card.cost} <small>Credits</small></span></div><p>${escape(card.text)}</p><div class="ownership">${owners.length ? owners.map((p) => badge(p.style, p.name)).join("") : '<span class="muted">No owners yet</span>'}</div>${g.phase === "tech" && !g.pending ? `${button(reason ?? `Buy for ${card.cost} Credits`, "buy", `data-tech="${id}"`, Boolean(reason), "primary")}` : ""}</div></article>`;
      })
      .join("")}</div></section>`;
  }
  function eventView(g: Game) {
    return `<section class="event-view"><div class="section-heading"><span class="eyebrow">Rulebook’s simpler Events variant</span><h2>The galaxy keeps time.</h2><p>Event cards count rounds in this build. Their text has no effect and the sealed auction is skipped. This variant excludes Foresight; the Family preset does not contain it.</p></div><div class="event-status"><strong>${g.events.length}</strong><span>cards remain in the draw pile</span><strong>${g.players.length <= 3 ? 6 : 5}</strong><span>rounds in this game</span></div>${g.revealedEvents.length ? `<h3>Latest round-tracker pair</h3><div class="event-pair">${g.revealedEvents.map((id) => `<button class="event-card" data-action="card" data-card="${id}"><img src="${ART.cards[id].image}" width="240" height="388" loading="lazy" alt="${attrs(CARD_MAP[id].title)}"/><span>${escape(CARD_MAP[id].title)}</span><small>Effect disabled in this variant</small></button>`).join("")}</div>` : '<div class="empty-state">No Event pair has been drawn yet, or the final Tech step is in progress.</div>'}<p class="muted">Drawing the last pair does not immediately end the game. Play continues until a later Economy cannot draw another pair; then complete Tech purchases and score.</p></section>`;
  }
  function aidView() {
    return `<section class="aid-view"><div class="section-heading"><span class="eyebrow">One shared player aid · both faces</span><h2>Keep the essentials in view.</h2><p>Both faces are below: side by side on wide screens and stacked on phones. This prototype uses normal turns, the Family preset, and simpler Events.</p></div><div class="aid-faces"><article><h3>Actions</h3><img src="${ART.aids.actions.image}" width="530" height="810" loading="lazy" alt="Player aid Actions face"/><dl><dt>Move into</dt><dd>Bring Ships from adjacent systems. Warps connect; asteroid belts block unless you have Agility. Each destination black hole destroys one incoming Ship, insured as a Credit.</dd><dt>Settle</dt><dd>Convert Ships into Settlements within capacity; resolve Explore tokens first.</dd><dt>Produce</dt><dd>One Ship or Credit per planet you settle, plus one for each such planet that is full.</dd><dt>Attack</dt><dd>Each sacrificed Ship destroys up to two opposing Ships or one Settlement. All casualties become Credits. You cannot attack Settlements on a planet you share.</dd></dl></article><article><h3>Play sequence & scoring</h3><img src="${ART.aids.sequence.image}" width="530" height="810" loading="lazy" alt="Player aid play sequence and scoring face"/><dl><dt>Plan</dt><dd>Place all four chips in player order.</dd><dt>Actions</dt><dd>Resolve top chips into unused slots, acting or Investing. Turns without an eligible top chip are skipped.</dd><dt>Economy</dt><dd>Cash Investments, draw Events, buy one Tech, reinforce, and pass first player. This build uses Events only as a round tracker.</dd><dt>Score</dt><dd>One point per settled planet, system with your Ships, and owned Tech. Credits break ties; remaining ties share victory.</dd><dt>Undo</dt><dd>Draft only, before commitment and before any hidden-information reveal.</dd></dl></article></div></section>`;
  }
  function finalScores(g: Game) {
    return `<section class="final-scores"><div class="eyebrow">Expedition complete</div><h1>${g.winners.map((id) => escape(player(g, id).name)).join(" & ")}<br/><span>${g.winners.length > 1 ? "share the galaxy." : "claims the galaxy."}</span></h1><p>Credits break points ties. A remaining tie is a shared victory.</p><div class="score-table-wrap"><table><thead><tr><th>Player</th><th>Planets</th><th>Systems</th><th>Techs</th><th>Total</th><th>Credits</th></tr></thead><tbody>${g.scores
      .slice()
      .sort((a, b) => b.total - a.total || b.credits - a.credits)
      .map(
        (s) =>
          `<tr class="${g.winners.includes(s.player) ? "winner" : ""}"><th>${badge(s.player, player(g, s.player).name)}</th><td>${s.planets}</td><td>${s.systems}</td><td>${s.techs}</td><td><strong>${s.total}</strong></td><td>${s.credits}</td></tr>`,
      )
      .join(
        "",
      )}</tbody></table></div><div class="commit-row">${button("Export game record", "export", "", false, "secondary")}${button("New expedition", "new-game", "", false, "primary")}</div></section>`;
  }
  function overlay() {
    if (activeCard) {
      const card = CARD_MAP[activeCard];
      return `<div class="modal-scrim"><section class="modal card-modal" role="dialog" aria-modal="true" aria-label="${attrs(card.title)}">${button("Close ×", "close-overlay", "", false, "quiet close")}<img src="${ART.cards[activeCard].image}" width="240" height="388" alt="${attrs(card.title)}"/><div><span class="eyebrow">${card.type === "tech" ? `${card.cost} Credits` : "Event reference"}</span><h2>${escape(card.title)}</h2><p>${escape(card.text)}</p>${card.type === "event" ? '<p class="scope-note">Effects are disabled in the simpler Events prototype.</p>' : ""}</div></section></div>`;
    }
    if (!showHelp) return "";
    return `<div class="modal-scrim"><section class="modal" role="dialog" aria-modal="true" aria-label="Rules and prototype scope">${button("Close ×", "close-overlay", "", false, "quiet close")}<span class="eyebrow">Space Force · Charlie Fish</span><h2>One galaxy. Plenty of possibilities.</h2><p>This is a local pass-and-play prototype for two to seven people sharing one device. It implements normal turns, the official ten-Tech Family preset, and the rulebook's simpler Events variant. There are no remote rooms, full Event effects/auctions, simultaneous turns, newsletter forms, or private admin service in this build.</p><p>Use Board, Techs, Event, Actions, and Player Aid. The aid shows both faces together. Select chips in PLAN; later resolve top chips into each of four action slots, or Invest. Complete Economy between rounds.</p><h3>Undo and secrets</h3><p>Reset drafts before Commit. A committed move or hidden reveal cannot be undone. This trusted-device prototype stores the full game locally; authoritative remote privacy will be added with the server.</p><h3>Keyboard</h3><p>B Board · T Techs · E Event · A Actions · P Player Aid. With the map focused: R fits, +/− zoom, arrows pan. Escape closes details; ? opens Help. Shortcuts ignore editable fields and browser modifiers.</p><label class="check-row"><input type="checkbox" data-check="shortcuts" ${shortcuts ? "checked" : ""}/>Enable character shortcuts while the game has focus</label><div class="commit-row">${button(guide ? "Restart contextual guide" : "Show contextual guide", "guide-on", "", false, "secondary")}${game ? button("Export local game", "export", "", false, "quiet") : ""}</div><p class="muted">Public/private rooms, the wider card set, simultaneous mode, server-owned idle votes, and private administration remain later milestones. Rocket art is provisional and replaceable.</p></section></div>`;
  }
  function render() {
    const focused = root.ownerDocument.activeElement as HTMLElement | null;
    const focusKey = focused?.getAttribute("data-number");
    const focusId = focused?.getAttribute("data-id");
    const focusData = focused?.dataset;
    if (!game) root.innerHTML = landing() + overlay();
    else {
      const g = game,
        p = player(g);
      const panel =
        g.phase === "finished"
          ? finalScores(g)
          : view === "board"
            ? `<div class="board-layout">${systemMap(g)}${inspector(g)}</div>`
            : view === "techs"
              ? techView(g)
              : view === "event"
                ? eventView(g)
                : view === "actions"
                  ? actionsView(g)
                  : aidView();
      root.innerHTML = `<div class="game-shell"><header class="game-header"><button class="wordmark" data-action="help" aria-label="Space Force help"><span>SPACE</span><span>FORCE</span></button><div class="round-status"><span class="eyebrow">Local Family game · simpler Events</span><strong>Round ${g.round} / ${g.players.length <= 3 ? 6 : 5}</strong><span>${phaseLabel(g)}</span></div><div class="header-player">${badge(p.style, p.name)}<div class="resource-pills"><span><small>Reserve</small><strong>${p.reserve}</strong></span><span><small>Credits</small><strong>${p.credits}</strong></span></div></div><div class="header-tools">${button("?", "help", 'aria-label="Open Help"')}${button("New", "new-game", "", false, "quiet")}</div></header><div class="turn-bar" tabindex="-1" aria-live="polite"><span class="turn-dot" style="background:${STYLES[p.style].color}"></span><strong>${g.phase === "finished" ? "Game complete" : `${escape(p.name)}’s turn`}</strong><span>${escape(instruction(g))}</span>${g.phase !== "finished" ? button("View decision", "decision", "", false, "text-link") : ""}</div><details class="player-roster"><summary>Players & supply</summary><ul>${g.players.map((other) => `<li>${badge(other.style, other.name)}<span>${other.reserve} Reserve</span><span>${other.credits} Credits</span><span>${other.techs.length} Techs</span><span>${other.used.length}/4 slots used</span></li>`).join("")}</ul></details>${tutorial(g)}<nav class="view-tabs" aria-label="Game views" role="tablist">${(Object.keys(VIEW_LABELS) as View[]).map((v) => `<button id="tab-${v}" role="tab" aria-selected="${view === v}" aria-controls="game-panel" data-view="${v}" class="${view === v ? "active" : ""}"><span aria-hidden="true">${{ board: "⬡", techs: "✧", event: "◷", actions: "↗", player_aid: "▤" }[v]}</span>${VIEW_LABELS[v]}</button>`).join("")}</nav><main id="game-panel" class="main-panel" role="tabpanel" aria-labelledby="tab-${view}" tabindex="-1">${error ? `<div class="error" role="alert">${escape(error)}</div>` : ""}${panel}</main><footer class="game-footer"><span>${autosave ? "Autosaved on this device" : "Session only · local storage unavailable"}</span><span>Normal turns · ${g.players.length} players · revision ${g.revision}</span>${button("Game record ↓", "export", "", false, "text-link")}<details class="history"><summary>Recent game history</summary><ol>${g.log
        .slice(-30)
        .reverse()
        .map(
          (entry) =>
            `<li><span>R${entry.round}</span> ${entry.player === null ? "" : `<strong>${escape(player(g, entry.player).name)}</strong> `}${escape(entry.text)}</li>`,
        )
        .join("")}</ol></details></footer></div>${overlay()}`;
    }
    if (focusKey)
      [...root.querySelectorAll<HTMLInputElement>("[data-number]")]
        .find(
          (el) =>
            el.dataset.number === focusKey &&
            (el.dataset.id ?? null) === focusId &&
            el.dataset.planet === focused?.dataset.planet,
        )
        ?.focus({ preventScroll: true });
    else if (focusData?.check)
      [...root.querySelectorAll<HTMLInputElement>("[data-check]")]
        .find((el) => el.dataset.check === focusData.check)
        ?.focus({ preventScroll: true });
    else if (focusData?.action)
      [...root.querySelectorAll<HTMLElement>("[data-action]")]
        .find((el) =>
          ["action", "kind", "card", "tech", "planet", "recipient"].every(
            (key) => el.dataset[key] === focusData[key],
          ),
        )
        ?.focus({ preventScroll: true });
    else if (focusData?.system)
      [...root.querySelectorAll<SVGElement>('[data-system][role="button"]')]
        .find((el) => el.dataset.system === focusData.system)
        ?.focus({ preventScroll: true });
    if (scrollView === view) {
      const el = root.querySelector(".main-panel");
      if (el) el.scrollTop = previousScroll;
    }
    scrollView = null;
  }

  function exportGame() {
    if (!game) return;
    const blob = new Blob(
      [
        JSON.stringify(
          {
            application: "Space Force local prototype 0.8.0",
            exportedAt: new Date().toISOString(),
            game,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = root.ownerDocument.createElement("a");
    a.href = url;
    a.download = `space-force-${game.seed}-r${game.round}.json`;
    root.ownerDocument.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function zoomBy(amount: number) {
    zoom = Math.max(0.6, Math.min(4, zoom * amount));
    updateCamera();
  }
  function decisionView() {
    if (!game) return;
    setView(
      game.pending
        ? "board"
        : game.phase === "tech"
          ? "techs"
          : ["investments", "reinforce"].includes(game.phase)
            ? "actions"
            : "board",
    );
  }
  const click = (event: Event) => {
    const target = event.target as Element;
    if (!target?.closest || Date.now() < suppressClickUntil) return;
    const tab = target.closest<HTMLElement>("[data-view]");
    if (tab) {
      setView(tab.dataset.view as View);
      return;
    }
    const control = target.closest<HTMLElement>("[data-action]");
    if (!control && !dragged) {
      const tile = target.closest<SVGElement>("[data-system]");
      if (tile && game) {
        selected = tile.dataset.system!;
        selectedPlanet =
          target.closest<SVGElement>("[data-planet]")?.dataset.planet ?? null;
        draft = freshDraft();
        error = "";
        render();
      }
      return;
    }
    if (!control || (control as HTMLButtonElement).disabled) return;
    const data = control.dataset;
    const action = data.action;
    if (action === "count") {
      count = Number(data.count);
      render();
    } else if (action === "resume") resume();
    else if (action === "help") {
      overlayReturn = { action: "help" };
      showHelp = true;
      render();
      root.querySelector<HTMLElement>(".modal button")?.focus();
    } else if (action === "close-overlay") closeOverlay();
    else if (action === "guide-off") {
      guide = false;
      write("space-force.guide", "off");
      render();
    } else if (action === "guide-on") {
      guide = true;
      showHelp = false;
      write("space-force.guide", "on");
      render();
    } else if (action === "new-game") {
      if (
        !game ||
        root.ownerDocument.defaultView?.confirm(
          "Start a new expedition? The current local autosave will be replaced when you start.",
        )
      ) {
        game = null;
        showHelp = false;
        activeCard = null;
        render();
      }
    } else if (action === "export") exportGame();
    else if (action === "zoom-in") zoomBy(1.25);
    else if (action === "zoom-out") zoomBy(0.8);
    else if (action === "fit") {
      zoom = 1;
      panX = panY = 0;
      updateCamera();
    } else if (action?.startsWith("pan-")) {
      if (action === "pan-left") panX -= 70 / zoom;
      if (action === "pan-right") panX += 70 / zoom;
      if (action === "pan-up") panY -= 70 / zoom;
      if (action === "pan-down") panY += 70 / zoom;
      updateCamera();
    } else if (action === "decision") decisionView();
    else if (action === "to-board") setView("board");
    else if (action === "card") {
      overlayReturn = { action, card: data.card };
      activeCard = data.card!;
      render();
      root.querySelector<HTMLElement>(".modal button")?.focus();
    } else if (game) {
      if (action === "choose-home" && selected)
        perform({ type: "home", system: selected });
      else if (action === "place-chip" && selected)
        perform({ type: "plan", system: selected });
      else if (action === "select-action") {
        draft = freshDraft();
        draft.action = data.kind as Action;
        render();
      } else if (action === "undo-draft") {
        draft = freshDraft();
        error = "";
        render();
      } else if (action === "commit-action" && selected && draft.action)
        perform({
          type: "resolve",
          system: selected,
          action: draft.action,
          invest: draft.invest,
          bank: draft.bank,
          sources: draft.sources,
          credits: draft.credits,
          attack: {
            sacrifice: draft.sacrifice,
            ships: draft.targets,
            settlements: draft.colonies,
          },
        });
      else if (action === "orient")
        perform({ type: "orient", rotation: Number(data.rotation) });
      else if (action === "finish-move")
        perform({ type: "move", sources: draft.sources });
      else if (action === "settle-one")
        perform({ type: "settle", planet: data.planet!, count: 1 });
      else if (action === "finish-settle") perform({ type: "finishSettle" });
      else if (action === "recipient")
        perform({ type: "explore", recipient: Number(data.recipient) });
      else if (action === "buy") perform({ type: "buy", tech: data.tech! });
      else if (action === "pass-tech") perform({ type: "buy", tech: null });
      else if (action === "feature")
        perform({
          type: "feature",
          system: data.systemId,
          planet: data.planet,
          edge: data.edge !== undefined ? Number(data.edge) : undefined,
        });
      else if (action === "skip-feature")
        perform({ type: "feature", skip: true });
      else if (action === "all-home") {
        draft.allocation = { [player(game).home!]: reinforceCount(game) };
        draft.credits = 0;
        render();
      } else if (action === "all-credits") {
        draft.credits = player(game).invested;
        draft.allocation = {};
        render();
      } else if (action === "allocate")
        perform({
          type: "allocate",
          credits:
            game.phase === "investments"
              ? (draft.credits ?? player(game).invested)
              : 0,
          ships: draft.allocation,
        });
    }
  };
  const input = (event: Event) => {
    const el = event.target as HTMLInputElement;
    if (el.dataset.name !== undefined) {
      names[Number(el.dataset.name)] = el.value;
      return;
    }
    if (el.id === "map-code") {
      mapCode = el.value;
      return;
    }
    if (el.dataset.check) {
      if (el.dataset.check === "shortcuts") shortcuts = el.checked;
      else if (el.dataset.check === "invest") draft.invest = el.checked;
      else if (el.dataset.check === "bank") draft.bank = el.checked;
      render();
      return;
    }
    if (!el.dataset.number) return;
    const n = Number(el.value);
    if (!Number.isInteger(n) || n < 0 || n > 40) return;
    const id = el.dataset.id!;
    if (el.dataset.number === "source") draft.sources[id] = n;
    if (
      el.dataset.number === "produce-credits" ||
      el.dataset.number === "allocate-credits"
    )
      draft.credits = n;
    if (el.dataset.number === "sacrifice") draft.sacrifice = n;
    if (el.dataset.number === "target-ships") draft.targets[id] = n;
    if (el.dataset.number === "target-colony") {
      draft.colonies[el.dataset.planet!] ??= {};
      draft.colonies[el.dataset.planet!][id] = n;
    }
    if (el.dataset.number === "allocate-system") {
      draft.allocation[id] = n;
      if (game?.phase === "investments")
        draft.credits = Math.max(
          0,
          player(game).invested -
            Object.values(draft.allocation).reduce((a, b) => a + b, 0),
        );
    }
    render();
  };
  const submit = (event: Event) => {
    if ((event.target as HTMLElement).id === "setup-form") {
      event.preventDefault();
      start();
    }
  };
  const key = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement;
    if (event.key === "Escape" && (showHelp || activeCard)) {
      event.preventDefault();
      closeOverlay();
      return;
    }
    if (event.key === "Tab" && (showHelp || activeCard)) {
      const items = [
        ...root.querySelectorAll<HTMLElement>(
          ".modal button:not(:disabled), .modal input, .modal a[href]",
        ),
      ];
      const index = items.indexOf(
        root.ownerDocument.activeElement as HTMLElement,
      );
      if (event.shiftKey && index <= 0) {
        event.preventDefault();
        items[items.length - 1]?.focus();
      } else if (!event.shiftKey && (index < 0 || index === items.length - 1)) {
        event.preventDefault();
        items[0]?.focus();
      }
      return;
    }
    if (
      target.closest('input,textarea,select,[contenteditable="true"]') ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    )
      return;
    if (
      target.closest('[role="tab"]') &&
      ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
    ) {
      event.preventDefault();
      const views = Object.keys(VIEW_LABELS) as View[];
      const index =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? views.length - 1
            : (views.indexOf(view) +
                views.length +
                (event.key === "ArrowRight" ? 1 : -1)) %
              views.length;
      setView(views[index]);
      return;
    }
    if (
      target.closest("[data-system]") &&
      (event.key === "Enter" || event.key === " ")
    ) {
      event.preventDefault();
      selected = target.closest<SVGElement>("[data-system]")!.dataset.system!;
      draft = freshDraft();
      render();
      return;
    }
    if (!shortcuts || !game || showHelp || activeCard) return;
    const shortcut: Record<string, View> = {
      b: "board",
      t: "techs",
      e: "event",
      a: "actions",
      p: "player_aid",
    };
    if (shortcut[event.key.toLowerCase()]) {
      event.preventDefault();
      setView(shortcut[event.key.toLowerCase()]);
    } else if (event.key === "?") {
      overlayReturn = null;
      showHelp = true;
      render();
      root.querySelector<HTMLElement>(".modal button")?.focus();
    } else if (target.closest(".map-viewport")) {
      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        zoom = 1;
        panX = panY = 0;
        updateCamera();
      } else if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        zoomBy(1.25);
      } else if (event.key === "-") {
        event.preventDefault();
        zoomBy(0.8);
      } else if (event.key.startsWith("Arrow")) {
        event.preventDefault();
        if (event.key === "ArrowLeft") panX -= 50 / zoom;
        if (event.key === "ArrowRight") panX += 50 / zoom;
        if (event.key === "ArrowUp") panY -= 50 / zoom;
        if (event.key === "ArrowDown") panY += 50 / zoom;
        updateCamera();
      }
    }
  };
  const down = (event: PointerEvent) => {
    const target = event.target as Element;
    if (target.closest(".view-tabs") && event.pointerType === "touch") {
      swipe = { id: event.pointerId, x: event.clientX, y: event.clientY };
      return;
    }
    if (
      !target.closest(".map-viewport") ||
      (target.closest("[data-system]") && event.pointerType !== "touch")
    )
      return;
    pointerPositions.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    dragged = false;
    lastDrag = { x: event.clientX, y: event.clientY };
  };
  const move = (event: PointerEvent) => {
    if (!pointerPositions.has(event.pointerId) || !lastDrag) return;
    const previous = [...pointerPositions.values()];
    const prev = pointerPositions.get(event.pointerId)!;
    pointerPositions.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    if (
      Math.abs(event.clientX - lastDrag.x) +
        Math.abs(event.clientY - lastDrag.y) >
      7
    )
      dragged = true;
    const values = [...pointerPositions.values()];
    if (values.length === 2) {
      const oldDistance = Math.hypot(
        previous[0].x - previous[1].x,
        previous[0].y - previous[1].y,
      );
      const distance = Math.hypot(
        values[0].x - values[1].x,
        values[0].y - values[1].y,
      );
      const before = mapPoint(
        (previous[0].x + previous[1].x) / 2,
        (previous[0].y + previous[1].y) / 2,
      );
      if (oldDistance > 0)
        zoom = Math.max(0.6, Math.min(4, (zoom * distance) / oldDistance));
      updateCamera();
      const after = mapPoint(
        (values[0].x + values[1].x) / 2,
        (values[0].y + values[1].y) / 2,
      );
      panX += before.x - after.x;
      panY += before.y - after.y;
      dragged = true;
    } else if (dragged) {
      const before = mapPoint(prev.x, prev.y),
        after = mapPoint(event.clientX, event.clientY);
      panX += before.x - after.x;
      panY += before.y - after.y;
    }
    if (dragged) {
      event.preventDefault();
      root.setPointerCapture?.(event.pointerId);
      suppressClickUntil = Date.now() + 350;
      updateCamera();
    }
  };
  const up = (event: PointerEvent) => {
    if (swipe?.id === event.pointerId) {
      const dx = event.clientX - swipe.x,
        dy = event.clientY - swipe.y;
      if (
        event.type !== "pointercancel" &&
        Math.abs(dx) > 50 &&
        Math.abs(dx) > Math.abs(dy) * 1.3
      ) {
        const views = Object.keys(VIEW_LABELS) as View[];
        const index = views.indexOf(view);
        suppressClickUntil = Date.now() + 350;
        setView(
          views[
            Math.max(0, Math.min(views.length - 1, index + (dx < 0 ? 1 : -1)))
          ],
        );
      }
      swipe = null;
    }
    pointerPositions.delete(event.pointerId);
    if (root.hasPointerCapture?.(event.pointerId))
      root.releasePointerCapture(event.pointerId);
    if (!pointerPositions.size) {
      lastDrag = null;
      if (dragged) suppressClickUntil = Date.now() + 350;
      dragged = false;
    } else {
      const remaining = [...pointerPositions.values()][0];
      lastDrag = { ...remaining };
    }
  };
  const liveInput = (event: Event) => {
    const t = event.target as HTMLInputElement;
    if (t.dataset.name !== undefined || t.id === "map-code") input(event);
  };
  root.addEventListener("click", click);
  root.addEventListener("change", input);
  root.addEventListener("input", liveInput);
  root.addEventListener("submit", submit);
  root.addEventListener("keydown", key);
  root.addEventListener("pointerdown", down);
  root.addEventListener("pointermove", move);
  root.addEventListener("pointerup", up);
  root.addEventListener("pointercancel", up);
  render();
  return {
    getGame: () => game,
    getView: () => view,
    setGame: (value: Game) => {
      assertInvariants(value);
      game = value;
      render();
    },
    destroy: () => {
      root.replaceChildren();
      root.removeEventListener("click", click);
      root.removeEventListener("change", input);
      root.removeEventListener("input", liveInput);
      root.removeEventListener("submit", submit);
      root.removeEventListener("keydown", key);
      root.removeEventListener("pointerdown", down);
      root.removeEventListener("pointermove", move);
      root.removeEventListener("pointerup", up);
      root.removeEventListener("pointercancel", up);
    },
  };
}
function sumOwners(values: number[]) {
  return values.reduce((a, b) => a + b, 0);
}
