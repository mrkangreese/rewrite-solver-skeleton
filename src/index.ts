// REWRITE — demo: a room dies, gets rewritten, and must stay solvable.
import { parseRoom, toAscii } from "./room.js";
import { solve } from "./solver.js";
import { mutate, validateBatch } from "./mutate.js";

const MAP = [
  "#########",
  "#S..#...#",
  "#.#.#.#.#",
  "#.#...#.#",
  "#.#####.#",
  "#.....#G#",
  "#########",
];

let room = parseRoom(MAP);
let solution = solve(room);

console.log("=== initial room ===");
console.log(toAscii(room));
console.log("solvable:", Boolean(solution), "| path length:", solution?.length);

for (let death = 1; death <= 5; death++) {
  if (!solution) break;
  const result = mutate(room, solution);
  if (!result) {
    console.log(`\nmutation ${death}: FAILED to keep room solvable — level design bug`);
    break;
  }

  room = result.room;
  solution = result.solution;

  console.log(`\n=== death ${death} -> ${result.template} (attempts: ${result.attempts}) ===`);
  console.log(toAscii(room));
  console.log("still solvable:", Boolean(solution), "| path length:", solution?.length);
}

console.log("\n=== batch validation ===");
console.log(validateBatch([parseRoom(MAP)], 50));
