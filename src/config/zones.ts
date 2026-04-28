// ─── Zone configuration ───────────────────────────────────────────────────────
//
// Single source of truth for all world-coordinate constants.
// Replaces the three previously independent hard-coded definitions:
//   TownScene.ts  – ZONE constant
//   store.ts      – MONSTER_SPAWN_POSITIONS
//   main.ts       – WORLD_WIDTH
//
// computeZoneConfig(1) values:
//   wallLeft 900, wallRight 2700, shop 1380, craft 1660, town 1940, barracks 2220
//   patrolLeft 950, patrolRight 2650, worldWidth 3600
//   monsterSpawn.left [700,450,200], monsterSpawn.right [2900,3100,3400]

export interface ZoneConfig {
  worldWidth:  number;
  wallLeft:    number;
  wallRight:   number;
  shop:        number;
  craft:       number;
  town:        number;
  barracks:    number;
  patrolLeft:  number;
  patrolRight: number;
  /** Monster out-of-wall spawn X positions.
   *  left[0..2]  – left side (closest to wall first)
   *  right[0..2] – right side (closest to wall first)
   */
  monsterSpawn: { left: number[]; right: number[] };
}

/**
 * Compute zone configuration for a given town level.
 * Higher levels scale the world proportionally (+400 px per level).
 *
 * Zone buildings are clustered around the world centre with a fixed 280 px gap
 * (≈ 2 building-card grid slots) between each adjacent pair, so the town feels
 * compact at early levels and the outer areas are reserved for expansion.
 *
 * Level 1 positions (worldWidth 3600):
 *   wallLeft 900, wallRight 2700
 *   shop 1380, craft 1660, town 1940, barracks 2220
 *   patrolLeft 950, patrolRight 2650
 *   monsterSpawn.left [700,450,200], monsterSpawn.right [2900,3100,3400]
 */
export function computeZoneConfig(townLevel: number): ZoneConfig {
  const worldWidth = 3600 + (townLevel - 1) * 400;
  const wallLeft   = worldWidth * 0.25;   // level 1 → 900
  const wallRight  = worldWidth * 0.75;   // level 1 → 2700
  const center     = worldWidth / 2;      // level 1 → 1800

  // 4 zone buildings evenly spaced at 280 px apart, centred on the world.
  // 280 ≈ 2 × building-card grid gap (140 px), leaving 2 card slots between
  // each pair of zone buildings at all town levels.
  const BLDG_GAP = 280;

  return {
    worldWidth,
    wallLeft,
    wallRight,
    shop:        center - 1.5 * BLDG_GAP,   // level 1 → 1380
    craft:       center - 0.5 * BLDG_GAP,   // level 1 → 1660
    town:        center + 0.5 * BLDG_GAP,   // level 1 → 1940
    barracks:    center + 1.5 * BLDG_GAP,   // level 1 → 2220
    patrolLeft:  wallLeft  + 50,             // level 1 → 950
    patrolRight: wallRight - 50,             // level 1 → 2650
    monsterSpawn: {
      left:  [
        wallLeft  - 200,  // Left0  level 1 → 700
        wallLeft  - 450,  // Left1  level 1 → 450
        wallLeft  - 700,  // Left2  level 1 → 200
      ],
      right: [
        wallRight + 200,  // Right0 level 1 → 2900
        wallRight + 400,  // Right1 level 1 → 3100
        wallRight + 700,  // Right2 level 1 → 3400
      ],
    },
  };
}
