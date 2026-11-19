// REWRITE — solvability solver
// Breadth-first search over walkable tiles. Deliberately boring: the point is that
// every mutation must pass through this gate before it can reach the player.

import { type Pos, type Room, canEnter, key } from "./room.js";

export type Solution = Pos[];

const DIRS: Pos[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

/** Returns the shortest path from spawn to goal, or null if the room is unsolvable. */
export function solve(room: Room): Solution | null {
  const start = key(room.spawn);
  const goal = key(room.goal);
  if (start === goal) return [room.spawn];

  const prev = new Map<string, string>();
  const seen = new Set<string>([start]);
  const queue: Pos[] = [room.spawn];

  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const d of DIRS) {
      const next = { x: cur.x + d.x, y: cur.y + d.y };
      const k = key(next);
      if (seen.has(k)) continue;
      if (!canEnter(room, next)) continue;

      seen.add(k);
      prev.set(k, key(cur));

      if (k === goal) return rebuild(prev, room.spawn, room.goal);
      queue.push(next);
    }
  }

  return null;
}

function rebuild(prev: Map<string, string>, start: Pos, end: Pos): Solution {
  const path: Pos[] = [];
  const coords = (k: string): Pos => {
    const [x, y] = k.split(",").map(Number);
    return { x, y };
  };

  let cur: string | undefined = key(end);
  while (cur) {
    path.push(coords(cur));
    if (cur === key(start)) break;
    cur = prev.get(cur);
  }
  return path.reverse();
}

/** Path length is our crude difficulty proxy: shorter path = tighter, harder room. */
export function pathLength(solution: Solution | null): number {
  return solution ? solution.length : Infinity;
}
