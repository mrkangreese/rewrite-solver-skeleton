// REWRITE — room model
// A room is a grid of tiles. Mutations may only rewrite tiles that are declared
// mutable; the spawn and goal tiles are immutable by construction.

export type Pos = { x: number; y: number };

export type Tile = "floor" | "wall" | "hazard" | "goal";

export type Room = {
  width: number;
  height: number;
  tiles: Tile[][]; // tiles[y][x]
  spawn: Pos;
  goal: Pos;
  /** positions that a mutation is allowed to rewrite */
  mutable: Set<string>;
};

export const key = (p: Pos): string => `${p.x},${p.y}`;

export function tileAt(room: Room, p: Pos): Tile {
  return room.tiles[p.y][p.x];
}

export function setTile(room: Room, p: Pos, tile: Tile): void {
  room.tiles[p.y][p.x] = tile;
}

export function inBounds(room: Room, p: Pos): boolean {
  return p.x >= 0 && p.y >= 0 && p.x < room.width && p.y < room.height;
}

export function canEnter(room: Room, p: Pos): boolean {
  if (!inBounds(room, p)) return false;
  const t = tileAt(room, p);
  return t !== "wall" && t !== "hazard";
}

/** Build a room from an ASCII map. '#'=wall, '~'=hazard, 'G'=goal, 'S'=spawn, '.'=floor */
export function parseRoom(map: string[]): Room {
  const height = map.length;
  const width = map[0].length;
  const tiles: Tile[][] = [];
  const mutable = new Set<string>();
  let spawn: Pos = { x: 0, y: 0 };
  let goal: Pos = { x: 0, y: 0 };

  for (let y = 0; y < height; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < width; x++) {
      const ch = map[y][x];
      if (ch === "#") row.push("wall");
      else if (ch === "~") row.push("hazard");
      else if (ch === "G") {
        row.push("goal");
        goal = { x, y };
      } else if (ch === "S") {
        row.push("floor");
        spawn = { x, y };
      } else row.push("floor");

      // spawn and goal are never mutable; interior tiles are
      const interior = x > 0 && y > 0 && x < width - 1 && y < height - 1;
      const isSpawnOrGoal = (x === spawn.x && y === spawn.y) || (x === goal.x && y === goal.y);
      if (interior && !isSpawnOrGoal) mutable.add(`${x},${y}`);
    }
    tiles.push(row);
  }

  return { width, height, tiles, spawn, goal, mutable };
}

export function cloneRoom(room: Room): Room {
  return {
    ...room,
    tiles: room.tiles.map((row) => [...row]),
    mutable: new Set(room.mutable),
  };
}

export function toAscii(room: Room): string {
  const lines: string[] = [];
  for (let y = 0; y < room.height; y++) {
    let line = "";
    for (let x = 0; x < room.width; x++) {
      if (x === room.spawn.x && y === room.spawn.y) line += "S";
      else if (x === room.goal.x && y === room.goal.y) line += "G";
      else {
        const t = room.tiles[y][x];
        line += t === "wall" ? "#" : t === "hazard" ? "~" : ".";
      }
    }
    lines.push(line);
  }
  return lines.join("\n");
}
