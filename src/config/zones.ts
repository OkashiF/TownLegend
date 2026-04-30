// ─── 区域配置 ───────────────────────────────────────────────────────
//
// 所有世界坐标常数的唯一来源。
//
// 墙内的布局：
//   墙左 → [边距] → 店铺 → [seg0] → 工艺 → [seg1] → 城镇 → [seg2] → 兵营 → [边距] → 墙右
//
// 初始段间隙 = INITIAL_SEG_GAP (320px)。
// 每个段可以独立扩展；每次扩展增加 SEG_STEP (140px)。
// 每段独立容量 = INITIAL_SEG_SLOTS + 扩展次数[i]。
//
// 在等级 1，seg=[0,0,0] 时：
//   世界宽度 2400 → 墙左 600，墙右 1800
//   店铺 780 (+边距=180)，工艺 1000，城镇 1320，兵营 1640
//   (内宽度 1200，已使用：180+320+320+320+180=1320 ✓)

export const SEG_STEP         = 140;  // 每次扩展增加的像素
export const INITIAL_SEG_GAP  = 320;  // 锚点之间的初始距离
export const WALL_MARGIN      = 180;   // 从墙左到店铺的距离
// 扩展前，每个段的初始建筑网格槽位数
export const INITIAL_SEG_SLOTS = 2;

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
  /**
   * 每段建筑槽位容量（每段独立）。
   * segCapacity[i] = INITIAL_SEG_SLOTS + 段落扩展[i]
   */
  segCapacity: number[];
  /** 怪物墙外生成的 X 坐标。
   *  left[0..2]  – 左侧（最靠近墙的优先）
   *  right[0..2] – 右侧（最靠近墙的优先）
   */
  monsterSpawn: { left: number[]; right: number[] };
}

/**
 * 根据城镇等级和每段扩展次数计算区域配置。
 *
 * @param townLevel         当前城镇等级 (1–6)。
 * @param segmentExpansions 每段的扩展次数（长度 ≥ 3）。
 *                          每增加 1 次会增加该段间隙 SEG_STEP 像素，
 *                          并增加一个建筑槽位。
 *
 * 布局：
 *   店铺     = 墙左 + 边距
 *   工艺    = 店铺 + 初始段间隙 + seg[0] * SEG_STEP
 *   城镇     = 工艺 + 初始段间隙 + seg[1] * SEG_STEP
 *   兵营 = 城镇 + 初始段间隙 + seg[2] * SEG_STEP
 *
 * 世界宽度 = max(等级基础, 动态最小值)
 *   等级基础：      2400 + (城镇等级 - 1) * 300
 *   动态最小值: 足以容纳兵营 + 边距在世界宽度的 75% 内
 * Layout:
 *   shop     = wallLeft + WALL_MARGIN
 *   craft    = shop + INITIAL_SEG_GAP + seg[0] * SEG_STEP
 *   town     = craft + INITIAL_SEG_GAP + seg[1] * SEG_STEP
 *   barracks = town  + INITIAL_SEG_GAP + seg[2] * SEG_STEP
 *
 * worldWidth = max(level-base, dynamic-minimum)
 *   level-base:      2400 + (townLevel - 1) * 300
 *   dynamic-minimum: enough to fit barracks + WALL_MARGIN inside 75% of worldWidth
 */
export function computeZoneConfig(
  townLevel: number,
  segmentExpansions: number[] = [0, 0, 0],
): ZoneConfig {
  // 确保至少有 3 个条目
  const seg = [
    segmentExpansions[0] ?? 0,
    segmentExpansions[1] ?? 0,
    segmentExpansions[2] ?? 0,
  ];

  const gap0 = INITIAL_SEG_GAP + seg[0] * SEG_STEP;
  const gap1 = INITIAL_SEG_GAP + seg[1] * SEG_STEP;
  const gap2 = INITIAL_SEG_GAP + seg[2] * SEG_STEP;

  // 所需内宽度：边距 + gap0 + gap1 + gap2 + 边距
  const innerNeeded = WALL_MARGIN + gap0 + gap1 + gap2 + WALL_MARGIN;

  // 世界宽度必须满足：墙左 = 世界宽度 * 0.25，
  // 墙右 = 世界宽度 * 0.75，内宽度 = 世界宽度 * 0.5 ≥ 所需内宽度
  const levelBase      = 2400 + (townLevel - 1) * 300;
  const dynamicMinimum = innerNeeded / 0.5;          // 内宽度 = 世界宽度的 50%
  const worldWidth     = Math.max(levelBase, dynamicMinimum);

  const wallLeft  = worldWidth * 0.25;
  const wallRight = worldWidth * 0.75;

  const shop     = wallLeft + WALL_MARGIN;
  const craft    = shop     + gap0;
  const town     = craft    + gap1;
  const barracks = town     + gap2;

  // 每段独立容量
  const segCapacity = seg.map(e => INITIAL_SEG_SLOTS + e);

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
    segCapacity,
    monsterSpawn: {
      left:  [
        wallLeft - 150,
        wallLeft - 300,
        wallLeft - 450,
      ],
      right: [
        wallRight + 200,
        wallRight + 400,
        wallRight + 700,
      ],
    },
  };
}