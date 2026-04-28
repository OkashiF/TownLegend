// ─── Zone configuration ───────────────────────────────────────────────────────
//
// Single source of truth for all world-coordinate constants.
// Replaces the three previously independent hard-coded definitions:
//   TownScene.ts  – ZONE constant
//   store.ts      – MONSTER_SPAWN_POSITIONS
//   main.ts       – WORLD_WIDTH
//
// At level 1 with seg=[0,0,0]:
//   worldWidth 2400, wallLeft 600, wallRight 1800
//   shop 680, craft 960, town 1240, barracks 1520
//   patrolLeft 650, patrolRight 1750

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
 * Compute zone configuration for a given town level and optional segment expansions.
 *
 * @param townLevel  Current town level (1–6).
 * @param seg        Per-segment expansion counts [seg0, seg1, seg2], defaults to [0,0,0].
 *                   Each +1 adds one extra 140 px building slot to that segment and shifts
 *                   the downstream anchor points right by 140 px.
 *
 * Layout (from wallLeft, with 80 px margins at each end):
 *   shop     = wallLeft + 80
 *   craft    = shop + gap0         gap0 = (2 + seg[0]) * 140
 *   town     = craft + gap1        gap1 = (2 + seg[1]) * 140
 *   barracks = town  + gap2        gap2 = (2 + seg[2]) * 140
 *
 * worldWidth = max(level-base, segment-dynamic)
 *   level-base:     2400 + (townLevel - 1) * 300
 *   segment-dynamic: ((160 + gap0 + gap1 + gap2) / 0.5)
 *
 * Left monster spawn offsets are reduced to -150/-300/-450 so they never go below x=0
 * even when worldWidth (and wallLeft) is small.
 */
export function computeZoneConfig(
  townLevel: number,
  seg: [number, number, number] = [0, 0, 0],
): ZoneConfig {
  const gap0 = (2 + seg[0]) * 140;
  const gap1 = (2 + seg[1]) * 140;
  const gap2 = (2 + seg[2]) * 140;

  const levelBase     = 2400 + (townLevel - 1) * 300;
  const segmentNeeded = (160 + gap0 + gap1 + gap2) / 0.5;
  const worldWidth    = Math.max(levelBase, segmentNeeded);

  const wallLeft  = worldWidth * 0.25;
  const wallRight = worldWidth * 0.75;

  const shop     = wallLeft + 80;
  const craft    = shop     + gap0;
  const town     = craft    + gap1;
  const barracks = town     + gap2;

  return {
    worldWidth,
    wallLeft,
    wallRight,
    shop,
    craft,
    town,
    barracks,
    patrolLeft:  wallLeft  + 50,
    patrolRight: wallRight - 50,
    monsterSpawn: {
      left:  [
        wallLeft - 150,   // Left0  (closest)
        wallLeft - 300,   // Left1
        wallLeft - 450,   // Left2  (farthest – always > 0 since wallLeft ≥ 600)
      ],
      right: [
        wallRight + 200,  // Right0
        wallRight + 400,  // Right1
        wallRight + 700,  // Right2
      ],
    },
  };
}
