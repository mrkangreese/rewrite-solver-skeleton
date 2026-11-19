# REWRITE — solver skeleton

Prototype of the constraint layer behind **REWRITE**, a single-player puzzle game where
the room rewrites itself every time you die.

The design bet: a mutation is never a free-form scramble. It is a rewrite drawn from a
template, applied only to declared-mutable tiles, then validated by a solver before it can
ever reach the player. If the solver cannot find a route to the goal, the mutation is
rejected and re-rolled.

## Why this repository exists

This is the smallest honest slice of the game: the part that decides whether the core idea
is buildable at all. Everything downstream — level content, UI, save system, audio — depends
on this gate holding.

## Architecture

```
src/room.ts     grid room model; mutable-tile contract; ASCII map parser
src/solver.ts   BFS solvability check, returns shortest path or null
src/mutate.ts   mutation templates + solver-validation gate + CI batch sweep
src/index.ts    demo: a room dies five times and stays solvable every time
```

## Mutation templates

| Template | Intent |
| --- | --- |
| `falsify-corridor` | seals a point on the route the player just used, countering wall-hugging |
| `add-hazard` | drops a hazard on the final approach, punishing pure speed |
| `open-shortcut` | opens a wall to invalidate the memorised optimal path |
| `carve-fallback` | last resort: opens a guaranteed channel so a room never ships dead |

## Two gates every mutation must pass

1. **Solvable** — the BFS solver finds a path from spawn to goal.
2. **Changed** — the new solution differs from the previous one, so the rewrite is
   meaningful rather than cosmetic.

## Run it

```bash
npm install
npm run demo        # five deaths, five rewrites, all validated
npm run typecheck
```

## Status

Pre-production. This is the skeleton a Devin Bot takes over: expanding the template library,
running brute-force validation across mutation permutations in CI, and wiring the room
system into the rendering layer.
