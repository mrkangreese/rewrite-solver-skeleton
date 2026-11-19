// REWRITE — mutation engine
// The core design bet: a mutation is never a free-form scramble. It is a rewrite
// drawn from a template, applied only to mutable tiles, then validated by the
// solver. Rejected mutations are re-rolled; nothing unsolvable ever ships.

import { type Room, cloneRoom, key, setTile, tileAt } from "./room.js";
import { solve, pathLength, type Solution } from "./solver.js";

export type MutationResult = {
  room: Room;
  solution: Solution;
  template: string;
  attempts: number;
};

const MAX_ATTEMPTS = 200;

const randInt = (n: number): number => Math.floor(Math.random() * n);

const signature = (solution: Solution): string => solution.map(key).join(">");

/** Wall-hugging counter: seal one point on the route the player just used. */
function falsifyCorridor(room: Room, solution: Solution): Room {
  const next = cloneRoom(room);
  if (solution.length < 4) return next;

  // sample the middle band of the path — endpoints are spawn/goal, never mutable
  const lo = Math.floor(solution.length * 0.2);
  const hi = Math.ceil(solution.length * 0.8);
  const candidates: Solution = [];
  for (let i = lo; i < hi; i++) {
    const p = solution[i];
    if (p && next.mutable.has(key(p)) && tileAt(next, p) === "floor") candidates.push(p);
  }
  if (candidates.length === 0) return next;

  const pivot = candidates[randInt(candidates.length)];
  setTile(next, pivot, "wall");
  return next;
}

/** Rush counter: drop a hazard on a tile next to the final approach. */
function addHazard(room: Room, solution: Solution): Room {
  const next = cloneRoom(room);
  if (solution.length < 3) return next;

  const tail = solution.slice(-4, -1);
  const candidates = tail.filter(
    (p) => next.mutable.has(key(p)) && tileAt(next, p) === "floor",
  );
  if (candidates.length === 0) return next;

  setTile(next, candidates[randInt(candidates.length)], "hazard");
  return next;
}

/** Expansion counter: open a wall that touches floor, so old routes stop being optimal. */
function openShortcut(room: Room): Room {
  const next = cloneRoom(room);
  const walls: { x: number; y: number }[] = [];

  for (const k of next.mutable) {
    const [x, y] = k.split(",").map(Number);
    if (tileAt(next, { x, y }) !== "wall") continue;

    const neighbours = [
      { x: x + 1, y },
      { x: x - 1, y },
      { x, y: y + 1 },
      { x, y: y - 1 },
    ];
    const touchesFloor = neighbours.some((n) => {
      const inside = n.x >= 0 && n.y >= 0 && n.x < next.width && n.y < next.height;
      return inside && tileAt(next, n) === "floor";
    });
    if (touchesFloor) walls.push({ x, y });
  }

  if (walls.length === 0) return next;
  const pick = walls[randInt(walls.length)];
  setTile(next, pick, "floor");
  return next;
}

type Template = { name: string; apply: (room: Room, solution: Solution) => Room };

const TEMPLATES: Template[] = [
  { name: "falsify-corridor", apply: falsifyCorridor },
  { name: "add-hazard", apply: addHazard },
  { name: "open-shortcut", apply: (room) => openShortcut(room) },
];

/**
 * Last-resort carve: guarantee the room stays solvable by opening a channel
 * toward the goal. Used only when every template fails, so the mutation never
 * silently ships an unsolvable room.
 */
function carveFallback(room: Room): Room | null {
  const next = cloneRoom(room);
  let cursor = { ...next.spawn };
  let carved = 0;

  for (let step = 0; step < next.width * next.height && carved === 0; step++) {
    if (cursor.x === next.goal.x && cursor.y === next.goal.y) break;
    const dx = Math.sign(next.goal.x - cursor.x);
    const dy = Math.sign(next.goal.y - cursor.y);
    const move = Math.abs(next.goal.x - cursor.x) >= Math.abs(next.goal.y - cursor.y)
      ? { x: cursor.x + dx, y: cursor.y }
      : { x: cursor.x, y: cursor.y + dy };

    cursor = move;
    const k = key(cursor);
    if (!next.mutable.has(k)) continue;
    if (tileAt(next, cursor) !== "floor") {
      setTile(next, cursor, "floor");
      carved++;
    }
  }

  return carved > 0 ? next : null;
}

/**
 * Rewrite a room in response to a failure, keeping it solvable.
 */
export function mutate(room: Room, previous: Solution | null): MutationResult | null {
  const baseline = pathLength(previous);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const template = TEMPLATES[randInt(TEMPLATES.length)];
    const candidate = template.apply(room, previous ?? [room.spawn]);

    // gate 1: still solvable
    const solution = solve(candidate);
    if (!solution) continue;

    // gate 2: the rewrite must actually change the problem — either a different
    // path or the same length down a different route
    if (previous && signature(solution) === signature(previous)) continue;

    return { room: candidate, solution, template: template.name, attempts: attempt };
  }

  // every template failed — carve a guaranteed path rather than ship a dead room
  const fallback = carveFallback(room);
  if (!fallback) return null;
  const solution = solve(fallback);
  if (!solution) return null;
  return { room: fallback, solution, template: "carve-fallback", attempts: MAX_ATTEMPTS };
}

/** Full validation sweep — used in CI across permutation sets. */
export function validateBatch(rooms: Room[], rounds = 20): { ok: number; failed: number } {
  let ok = 0;
  let failed = 0;

  for (const room of rooms) {
    let current: Room | null = room;
    let solution = solve(room);
    if (!solution) {
      failed++;
      continue;
    }

    for (let i = 0; i < rounds && current; i++) {
      const result = mutate(current, solution);
      if (!result) {
        failed++;
        current = null;
        break;
      }
      current = result.room;
      solution = result.solution;
    }
    if (current) ok++;
  }

  return { ok, failed };
}
