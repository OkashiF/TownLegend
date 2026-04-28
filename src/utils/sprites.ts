import Phaser from 'phaser';
import {
  DrawFn, CardSpriteEntry, JOB_COLORS,
  drawShopWorker, drawCraftWorker, drawCombatWorker, drawIdleWorker,
  CARD_SPRITE_REGISTRY as HUMAN_SPRITE_REGISTRY,
} from './cardSprites';
import { MONSTER_SPRITE_REGISTRY } from './monsterSprites';

export type { DrawFn, CardSpriteEntry };
export { JOB_COLORS };

// ── px helper ─────────────────────────────────────────────────────────────────
function px(g: Phaser.GameObjects.Graphics, c: number,
            x: number, y: number, w = 1, h = 1, s = 1) {
  g.fillStyle(c, 1);
  g.fillRect(x * s, y * s, w * s, h * s);
}

// ── Buildings ─────────────────────────────────────────────────────────────────
// 建筑纹理尺寸按等级，单位 px（s=3，逻辑宽 = 像素宽 ÷ 3）
// setOrigin(0.5,1) 使纹理底部贴地
export function bldgTexSize(level: number): [number, number] {
  const W = [48,  60,  84,  108, 132, 156];
  const H = [51,  57,  63,   69,  78,  87];
  const i = Math.max(0, Math.min(5, level - 1));
  return [W[i], H[i]];
}

export const drawBuilding: DrawFn = (g, x, y, s) => {
  const bldg = 0x8a7060, bldgD = 0x6a5040, roof = 0x8a3030, win = 0xd0c090;
  px(g, bldg,    x+1,  y+5,  10, 12, s);  // walls
  px(g, bldgD,   x+1,  y+15, 10, 2,  s);  // base stone
  px(g, roof,    x,    y+2,  12, 4,  s);   // roof
  px(g, roof,    x+1,  y+1,  10, 1,  s);
  px(g, roof,    x+2,  y+0,   8, 1,  s);
  px(g, 0x5a3010,x+5,  y+10,  3, 7,  s);  // door
  px(g, 0x8a5020,x+5,  y+11,  1, 1,  s);  // knob
  px(g, win,     x+2,  y+6,   2, 3,  s);  // windows
  px(g, win,     x+8,  y+6,   2, 3,  s);
  px(g, bldgD,   x+3,  y+6,   1, 3,  s);
  px(g, bldgD,   x+9,  y+6,   1, 3,  s);
};

export function drawShopBuilding(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number, townLevel: number = 1): void {
  if (townLevel >= 6) {
    // Lv6: 传奇魔法交易所 (156×87, mo=20, r=29)
    const mo = 20, r = 29, dT = 22;
    // ── Main building (cols mo..mo+11) ──
    px(g, 0x504878, x+mo+1, y+4,  10, r-4, s);   // arcane walls
    px(g, 0x383060, x+mo+1, y+r-2,10,  2,  s);   // base
    px(g, 0x7060a8, x+mo,   y+0,  12,  4,  s);   // magic arch roof
    px(g, 0x9080c8, x+mo+2, y+0,   8,  1,  s);   // roof highlight
    px(g, 0xa0c8ff, x+mo+5, y+0,   2,  2,  s);   // crystal spire
    px(g, 0xffffff, x+mo+5, y+0,   1,  1,  s);
    px(g, 0xd4a017, x+mo,   y+4,  12,  1,  s);   // gold frieze
    px(g, 0xd4a017, x+mo+1, y+4,   1, r-6, s);   // left column
    px(g, 0xd4a017, x+mo+10,y+4,   1, r-6, s);   // right column
    px(g, 0x2a1808, x+mo+4, y+dT,  2,  7,  s);   // double door L
    px(g, 0x2a1808, x+mo+6, y+dT,  2,  7,  s);   // double door R
    px(g, 0xd4a017, x+mo+3, y+dT-1,6,  2,  s);   // door arch
    px(g, 0xa0d8ff, x+mo+2, y+5,   2,  7,  s);   // window L upper
    px(g, 0xa0d8ff, x+mo+8, y+5,   2,  7,  s);   // window R upper
    px(g, 0xffffff, x+mo+2, y+5,   1,  1,  s);
    px(g, 0xffffff, x+mo+8, y+5,   1,  1,  s);
    px(g, 0xa0d8ff, x+mo+2, y+14,  2,  5,  s);   // window L lower
    px(g, 0xa0d8ff, x+mo+8, y+14,  2,  5,  s);   // window R lower
    // ── Left wing: crystal exhibition hall (cols 0..mo-1) ──
    px(g, 0x484068, x+0,    y+3,  mo,  r-5, s);  // wing walls
    px(g, 0x282040, x+0,    y+r-2,mo,  2,   s);  // wing base
    px(g, 0x6858a0, x+0,    y+0,  mo,  4,   s);  // wing roof
    px(g, 0xa0c8ff, x+2,    y+5,   3,  5,   s);  // crystal window 1
    px(g, 0xa0c8ff, x+8,    y+5,   3,  5,   s);  // crystal window 2
    px(g, 0xa0c8ff, x+14,   y+5,   3,  5,   s);  // crystal window 3
    px(g, 0xc0e0ff, x+2,    y+5,   1,  1,   s);
    px(g, 0xc0e0ff, x+8,    y+5,   1,  1,   s);
    px(g, 0xc0e0ff, x+14,   y+5,   1,  1,   s);
    px(g, 0xa0c8ff, x+2,    y+13,  3,  5,   s);  // floor 2 windows
    px(g, 0xa0c8ff, x+8,    y+13,  3,  5,   s);
    px(g, 0xa0c8ff, x+14,   y+13,  3,  5,   s);
    px(g, 0xa0c8ff, x+5,    y+21,  3,  4,   s);  // floor 3 windows
    px(g, 0xa0c8ff, x+12,   y+21,  3,  4,   s);
    px(g, 0xa0c8ff, x+9,    y+0,   2,  3,   s);  // crystal ball on roof
    px(g, 0xffffff, x+9,    y+0,   1,  1,   s);
    // ── Right wing: magic teleport platform (cols mo+12..mo+31) ──
    px(g, 0x484068, x+mo+12,y+3,  20,  r-5, s);  // wing walls
    px(g, 0x282040, x+mo+12,y+r-2,20,  2,   s);  // wing base
    px(g, 0x6858a0, x+mo+12,y+0,  20,  4,   s);  // wing roof
    px(g, 0x6040a0, x+mo+14,y+r-8,15,  6,   s);  // teleport outer ring
    px(g, 0x8060c0, x+mo+15,y+r-7,13,  4,   s);  // inner ring
    px(g, 0xa080e0, x+mo+16,y+r-6,11,  2,   s);  // glow ring
    px(g, 0x706090, x+mo+13,y+r-11,1, 11,   s);  // pillar L
    px(g, 0x706090, x+mo+18,y+r-11,1, 11,   s);  // pillar M
    px(g, 0x706090, x+mo+23,y+r-11,1, 11,   s);  // pillar R
    px(g, 0xd0b0ff, x+mo+13,y+r-12,1,  1,   s);  // pillar glow L
    px(g, 0xd0b0ff, x+mo+18,y+r-12,1,  1,   s);
    px(g, 0xd0b0ff, x+mo+23,y+r-12,1,  1,   s);
    px(g, 0xa0d8ff, x+mo+14,y+5,   3,  5,   s);  // wing windows
    px(g, 0xa0d8ff, x+mo+20,y+5,   3,  5,   s);
    px(g, 0xa0d8ff, x+mo+14,y+13,  3,  5,   s);
    px(g, 0xa0d8ff, x+mo+20,y+13,  3,  5,   s);
  } else if (townLevel >= 5) {
    // Lv5: 王室商行扩展 (132×78, mo=16, r=26)
    const mo = 16, r = 26, dT = 19;
    // ── Main building ──
    px(g, 0x908070, x+mo+1, y+4,  10, r-4, s);   // noble stone walls
    px(g, 0x705850, x+mo+1, y+r-2,10,  2,  s);   // base
    px(g, 0x206090, x+mo,   y+0,  12,  4,  s);   // deep-blue awning
    px(g, 0xd4a017, x+mo,   y+0,  12,  1,  s);   // gold top edge
    px(g, 0xd4a017, x+mo,   y+0,   2,  2,  s);   // left spire
    px(g, 0xd4a017, x+mo+10,y+0,   2,  2,  s);   // right spire
    px(g, 0xffd040, x+mo,   y+0,   1,  1,  s);
    px(g, 0xffd040, x+mo+11,y+0,   1,  1,  s);
    px(g, 0xd4a017, x+mo+1, y+4,   1, r-6, s);   // left column
    px(g, 0xd4a017, x+mo+10,y+4,   1, r-6, s);   // right column
    px(g, 0xd4a017, x+mo+2, y+0,   8,  2,  s);   // large gold sign
    px(g, 0x3a2010, x+mo+3, y+0,   6,  1,  s);
    px(g, 0x3a1808, x+mo+4, y+dT,  4,  7,  s);   // ornate door
    px(g, 0xd4a017, x+mo+3, y+dT-1,6,  1,  s);   // arch
    px(g, 0xd0c898, x+mo+2, y+5,   2,  6,  s);   // windows
    px(g, 0xd0c898, x+mo+8, y+5,   2,  6,  s);
    px(g, 0xd4a017, x+mo+2, y+5,   2,  1,  s);
    px(g, 0xd4a017, x+mo+8, y+5,   2,  1,  s);
    px(g, 0xd0c898, x+mo+2, y+13,  2,  4,  s);   // 2nd floor windows
    px(g, 0xd0c898, x+mo+8, y+13,  2,  4,  s);
    // ── Left wing: 3-floor exhibition gallery (cols 0..mo-1) ──
    px(g, 0x807060, x+0,    y+3,  mo,  r-5, s);  // gallery walls
    px(g, 0x604040, x+0,    y+r-2,mo,  2,   s);  // gallery base
    px(g, 0x306090, x+0,    y+0,  mo,  4,   s);  // gallery roof
    px(g, 0xd0c898, x+2,    y+5,   4,  5,   s);  // floor 1 window L
    px(g, 0xd0c898, x+9,    y+5,   4,  5,   s);  // floor 1 window R
    px(g, 0xd4a017, x+2,    y+5,   4,  1,   s);
    px(g, 0xd4a017, x+9,    y+5,   4,  1,   s);
    px(g, 0xd0c898, x+2,    y+12,  4,  4,   s);  // floor 2 windows
    px(g, 0xd0c898, x+9,    y+12,  4,  4,   s);
    px(g, 0xd0c898, x+2,    y+18,  4,  4,   s);  // floor 3 window
    px(g, 0x3a1808, x+6,    y+dT,  4,  7,   s);  // gallery door
    px(g, 0xd4a017, x+5,    y+dT-1,6,  1,   s);
    // ── Right wing: guard booth + warehouse (cols mo+12..mo+27) ──
    px(g, 0x807060, x+mo+12,y+3,  16,  r-5, s);  // wing walls
    px(g, 0x604040, x+mo+12,y+r-2,16,  2,   s);  // base
    px(g, 0x306090, x+mo+12,y+0,  16,  4,   s);  // roof
    px(g, 0xd4a017, x+mo+13,y+4,   1, r-6,  s);  // booth column
    px(g, 0xd0c898, x+mo+13,y+6,   3,  4,   s);  // booth window
    px(g, 0xd0c898, x+mo+19,y+5,   4,  5,   s);  // display window 1
    px(g, 0xd0c898, x+mo+19,y+12,  4,  4,   s);  // display window 2
    px(g, 0xd4a017, x+mo+19,y+5,   4,  1,   s);
    px(g, 0x3a1808, x+mo+22,y+dT,  4,  7,   s);  // warehouse door
  } else if (townLevel >= 4) {
    // Lv4: 大商场扩展 (108×69, mo=12, r=23)
    const mo = 12, r = 23, dT = 16;
    // ── Main building ──
    px(g, 0x9a8878, x+mo+1, y+4,  10, r-4, s);   // stone walls
    px(g, 0x686050, x+mo+1, y+r-2,10,  2,  s);   // base
    px(g, 0x3a70c0, x+mo,   y+0,  12,  4,  s);   // wide awning
    px(g, 0x2860a8, x+mo,   y+0,  12,  1,  s);   // awning shadow
    px(g, 0x5a4838, x+mo+1, y+8,  10,  1,  s);   // floor divider
    px(g, 0xb0a090, x+mo+1, y+4,   2, r-6, s);   // column L
    px(g, 0xb0a090, x+mo+9, y+4,   2, r-6, s);   // column R
    px(g, 0xd4a017, x+mo+3, y+0,   6,  2,  s);   // sign
    px(g, 0x5a3010, x+mo+4, y+dT,  2,  7,  s);   // double door L
    px(g, 0x5a3010, x+mo+6, y+dT,  2,  7,  s);   // double door R
    px(g, 0xd0c090, x+mo+2, y+5,   2,  3,  s);   // windows floor 1
    px(g, 0xd0c090, x+mo+8, y+5,   2,  3,  s);
    px(g, 0xd0c090, x+mo+2, y+10,  2,  3,  s);   // windows floor 2
    px(g, 0xd0c090, x+mo+8, y+10,  2,  3,  s);
    // ── Left wing: 2-story storage annex (cols 0..mo-1) ──
    px(g, 0x8a7868, x+0,    y+3,  mo,  r-5, s);  // annex walls
    px(g, 0x685848, x+0,    y+r-2,mo,  2,   s);  // base
    px(g, 0x4a6090, x+0,    y+0,  mo,  4,   s);  // roof
    px(g, 0xd0c090, x+2,    y+5,   2,  3,   s);  // windows floor 1
    px(g, 0xd0c090, x+8,    y+5,   2,  3,   s);
    px(g, 0xd0c090, x+2,    y+11,  2,  3,   s);  // windows floor 2
    px(g, 0xd0c090, x+8,    y+11,  2,  3,   s);
    px(g, 0x5a3010, x+4,    y+dT,  4,  7,   s);  // annex door
    // ── Right wing: outdoor display with roof (cols mo+12..mo+23) ──
    px(g, 0x8a7868, x+mo+12,y+3,  12,  r-5, s);  // display walls
    px(g, 0x685848, x+mo+12,y+r-2,12,  2,   s);  // base
    px(g, 0x3a70c0, x+mo+12,y+0,  12,  4,   s);  // matching awning
    px(g, 0x2860a8, x+mo+12,y+0,  12,  1,   s);  // awning shadow
    px(g, 0xd4a017, x+mo+14,y+r-8, 8,  5,   s);  // display counter
    px(g, 0xd0c090, x+mo+14,y+r-9, 2,  1,   s);  // item 1
    px(g, 0xd0c090, x+mo+17,y+r-9, 2,  1,   s);  // item 2
    px(g, 0xd0c090, x+mo+20,y+r-9, 2,  1,   s);  // item 3
    px(g, 0xd0c090, x+mo+13,y+5,   2,  4,   s);  // window 1
    px(g, 0xd0c090, x+mo+18,y+5,   2,  4,   s);  // window 2
  } else if (townLevel >= 3) {
    // Lv3: 石砌商馆扩展 (84×63, mo=8, r=21)
    const mo = 8, r = 21, dT = 14;
    // ── Main building ──
    px(g, 0x808878, x+mo+1, y+4,  10, r-4, s);   // stone walls
    px(g, 0x606858, x+mo+1, y+r-2,10,  2,  s);   // base
    px(g, 0x2a68b0, x+mo,   y+0,  12,  4,  s);   // awning
    px(g, 0x1a58a0, x+mo,   y+0,  12,  1,  s);   // awning shadow
    px(g, 0x909880, x+mo+3, y+dT-1,6,  2,  s);   // stone arch over door
    px(g, 0x5a3010, x+mo+4, y+dT,  4,  7,  s);   // door
    px(g, 0xd4a017, x+mo+2, y+0,   8,  2,  s);   // sign
    px(g, 0xd0c898, x+mo+2, y+5,   2,  5,  s);   // window L
    px(g, 0xd0c898, x+mo+8, y+5,   2,  5,  s);   // window R
    px(g, 0x606858, x+mo+1, y+5,   1,  5,  s);   // stone frame L
    px(g, 0x606858, x+mo+10,y+5,   1,  5,  s);   // stone frame R
    // ── Left wing: covered porch (cols 0..mo-1) ──
    px(g, 0x757878, x+0,    y+4,   mo, r-6, s);  // porch walls
    px(g, 0x555858, x+0,    y+r-2, mo,  2,  s);  // porch base
    px(g, 0x2060a8, x+0,    y+0,   mo,  4,  s);  // porch awning
    px(g, 0x6a4a20, x+1,    y+r-5,  5,  3,  s);  // bench
    px(g, 0x5a3a10, x+1,    y+r-5,  5,  1,  s);  // bench top
    px(g, 0xd0c898, x+2,    y+5,    3,  4,  s);  // window
    // ── Right wing: open-air market stall (cols mo+12..mo+19) ──
    px(g, 0x757878, x+mo+12,y+5,    8, r-7, s);  // stall back wall
    px(g, 0x555858, x+mo+12,y+r-2,  8,  2,  s);  // stall base
    px(g, 0x2a68b0, x+mo+12,y+3,    8,  3,  s);  // canopy
    px(g, 0x1a58a0, x+mo+12,y+3,    8,  1,  s);  // canopy shadow
    px(g, 0x5a3010, x+mo+12,y+4,    1, r-6, s);  // support post
    px(g, 0xd4a017, x+mo+13,y+r-6,  6,  4,  s);  // goods table
    px(g, 0xd0c898, x+mo+14,y+r-7,  1,  1,  s);  // item 1
    px(g, 0xd0c898, x+mo+16,y+r-7,  1,  1,  s);  // item 2
    px(g, 0xd0c898, x+mo+18,y+r-7,  1,  1,  s);  // item 3
  } else if (townLevel >= 2) {
    // Lv2: 砖砌小铺扩展 (60×57, mo=4, r=19)
    const mo = 4, r = 19, dT = 12;
    // ── Main building ──
    px(g, 0x9a7868, x+mo+1, y+4,  10, r-4, s);   // brick walls
    px(g, 0x785848, x+mo+1, y+r-2,10,  2,  s);   // base
    px(g, 0x2a70c0, x+mo,   y+0,  12,  5,  s);   // blue awning
    px(g, 0x1a50a0, x+mo,   y+0,  12,  1,  s);   // awning shadow
    px(g, 0x786050, x+mo+1, y+9,  10,  1,  s);   // brick line
    px(g, 0x786050, x+mo+1, y+13, 10,  1,  s);   // brick line
    px(g, 0xd4a017, x+mo+2, y+0,   8,  2,  s);   // sign
    px(g, 0x3a2010, x+mo+3, y+0,   6,  1,  s);
    px(g, 0x5a3010, x+mo+4, y+dT,  4,  7,  s);   // door
    px(g, 0x8a5020, x+mo+4, y+dT+1,1,  1,  s);   // knob
    px(g, 0xd0c090, x+mo+2, y+5,   2,  4,  s);   // window L
    px(g, 0xd0c090, x+mo+8, y+5,   2,  4,  s);   // window R
    // ── Left wing: crate pile (cols 0..mo-1) ──
    px(g, 0x6a4a20, x+0,    y+r-6,  3,  4,  s);  // crate stack
    px(g, 0x5a3a10, x+0,    y+r-6,  3,  1,  s);  // crate top
    px(g, 0x6a4a20, x+1,    y+r-3,  2,  3,  s);  // small crate
    px(g, 0x5a3a10, x+1,    y+r-3,  2,  1,  s);  // crate top
    // ── Right wing: hanging sign post (cols mo+12..mo+15) ──
    px(g, 0x5a3010, x+mo+12,y+2,    1, r-4, s);  // sign pole
    px(g, 0x5a3010, x+mo+12,y+2,    4,  1,  s);  // horizontal arm
    px(g, 0xd4a017, x+mo+12,y+3,    4,  4,  s);  // gold sign plate
    px(g, 0x3a2010, x+mo+13,y+4,    2,  2,  s);  // sign text area
    px(g, 0xffd040, x+mo+12,y+3,    4,  1,  s);  // sign highlight
  } else {
    // Lv1: 木棚 + 蓝布遮阳 (original design)
    px(g, 0x8a7060, x+1, y+5,  10, 12, s);
    px(g, 0x6a5040, x+1, y+15, 10,  2, s);
    px(g, 0x2a70c0, x,   y+1,  12,  5, s);
    px(g, 0x1a50a0, x,   y+1,  12,  1, s);
    px(g, 0xd4a017, x+3, y+0,   6,  2, s);
    px(g, 0x5a3010, x+4, y+10,  4,  7, s);
    px(g, 0xd0c090, x+2, y+6,   2,  3, s);
    px(g, 0xd0c090, x+8, y+6,   2,  3, s);
  }
}

export function drawCraftBuilding(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number, townLevel: number = 1): void {
  if (townLevel >= 6) {
    // Lv6: 神话熔炉扩展 (156×87, mo=20, r=29)
    const mo = 20, r = 29, dT = 22;
    // ── Main building ──
    px(g, 0x5a4830, x+mo+1, y+4,  10, r-4, s);  // dark forge walls
    px(g, 0x3a2810, x+mo+1, y+r-2,10,  2,  s);  // base
    px(g, 0x483820, x+mo,   y+2,  12,  2,  s);  // roof
    px(g, 0xff4400, x+mo+3, y+6,   1,  8,  s);  // lava crack L
    px(g, 0xff6600, x+mo+7, y+8,   1,  6,  s);  // lava crack R
    px(g, 0x3a2810, x+mo+2, y+1,   2, 10,  s);  // chimney 1
    px(g, 0x282008, x+mo+2, y+1,   1,  2,  s);
    px(g, 0xff6600, x+mo+2, y+1,   2,  1,  s);  // fire 1
    px(g, 0x3a2810, x+mo+5, y+2,   2,  9,  s);  // chimney 2
    px(g, 0x282008, x+mo+5, y+2,   1,  2,  s);
    px(g, 0xff4400, x+mo+5, y+2,   2,  1,  s);  // fire 2
    px(g, 0x3a2810, x+mo+8, y+3,   2,  8,  s);  // chimney 3
    px(g, 0x282008, x+mo+8, y+3,   1,  2,  s);
    px(g, 0xff2200, x+mo+8, y+3,   2,  1,  s);  // fire 3
    px(g, 0x5a3010, x+mo+4, y+dT,  4,  7,  s);  // door
    px(g, 0xff6030, x+mo+2, y+7,   2,  6,  s);  // lava window
    px(g, 0xff8050, x+mo+2, y+7,   1,  1,  s);
    // ── Left wing: lava pool zone (cols 0..mo-1) ──
    px(g, 0x484030, x+0,    y+3,  mo,  r-5, s);  // zone walls
    px(g, 0x302010, x+0,    y+r-2,mo,  2,   s);  // base
    px(g, 0x383020, x+0,    y+0,  mo,  4,   s);  // roof
    px(g, 0xff4400, x+3,    y+r-8,13,  6,   s);  // lava pool outer
    px(g, 0xff6600, x+4,    y+r-7,11,  4,   s);  // lava pool inner
    px(g, 0xffa040, x+6,    y+r-6, 7,  2,   s);  // hot center
    px(g, 0x888070, x+1,    y+r-9, 2,  6,   s);  // guardian L
    px(g, 0x888070, x+1,    y+r-10,1,  1,   s);  // guardian head L
    px(g, 0x888070, x+17,   y+r-9, 2,  6,   s);  // guardian R
    px(g, 0x888070, x+17,   y+r-10,1,  1,   s);  // guardian head R
    px(g, 0xff6030, x+2,    y+5,   2,  5,   s);  // forge window 1
    px(g, 0xff6030, x+8,    y+5,   2,  5,   s);  // forge window 2
    px(g, 0xff6030, x+15,   y+5,   2,  5,   s);  // forge window 3
    // ── Right wing: mythic forge platform (cols mo+12..mo+31) ──
    px(g, 0x484030, x+mo+12,y+3,  20,  r-5, s);  // wing walls
    px(g, 0x302010, x+mo+12,y+r-2,20,  2,   s);  // base
    px(g, 0x383020, x+mo+12,y+0,  20,  4,   s);  // roof
    px(g, 0x5a3810, x+mo+14,y+r-8,15,  6,   s);  // forge outer
    px(g, 0xff4400, x+mo+16,y+r-7,11,  4,   s);  // lava inner
    px(g, 0xffa040, x+mo+18,y+r-6, 7,  2,   s);  // hot center
    px(g, 0xd4a017, x+mo+14,y+10,  1,  8,   s);  // mythic sword L
    px(g, 0xd4a017, x+mo+13,y+11,  3,  1,   s);  // crossguard L
    px(g, 0xd4a017, x+mo+25,y+10,  1,  8,   s);  // mythic sword R
    px(g, 0xd4a017, x+mo+24,y+11,  3,  1,   s);  // crossguard R
    px(g, 0xff6030, x+mo+16,y+5,   3,  4,   s);  // window 1
    px(g, 0xff6030, x+mo+22,y+5,   3,  4,   s);  // window 2
  } else if (townLevel >= 5) {
    // Lv5: 皇家铸造所扩展 (132×78, mo=16, r=26)
    const mo = 16, r = 26, dT = 19;
    // ── Main building ──
    px(g, 0x686050, x+mo+1, y+4,  10, r-4, s);
    px(g, 0x484030, x+mo+1, y+r-2,10,  2,  s);
    px(g, 0x585040, x+mo,   y+1,  12,  3,  s);
    px(g, 0x4a3820, x+mo+7, y+1,   3, 10,  s);  // chimney 1
    px(g, 0x382808, x+mo+8, y+1,   1,  2,  s);
    px(g, 0x4080ff, x+mo+7, y+1,   3,  1,  s);  // blue magic flame 1
    px(g, 0x80c0ff, x+mo+8, y+1,   1,  1,  s);
    px(g, 0x4a3820, x+mo+3, y+2,   3,  9,  s);  // chimney 2
    px(g, 0x382808, x+mo+4, y+2,   1,  2,  s);
    px(g, 0x4080ff, x+mo+3, y+2,   3,  1,  s);  // blue magic flame 2
    px(g, 0x80c0ff, x+mo+4, y+2,   1,  1,  s);
    px(g, 0x5a3010, x+mo+4, y+dT,  4,  7,  s);  // door
    px(g, 0x80b0ff, x+mo+2, y+5,   2,  6,  s);  // magic glow window L
    px(g, 0xc0e0ff, x+mo+2, y+5,   1,  1,  s);
    px(g, 0x80b0ff, x+mo+8, y+5,   2,  6,  s);  // magic glow window R
    px(g, 0x606850, x+mo,   y+4,   1, r-6, s);  // side fittings
    px(g, 0x606850, x+mo+11,y+4,   1, r-6, s);
    // ── Left wing: magic ingredient tower (cols 0..mo-1) ──
    px(g, 0x585848, x+0,    y+3,  mo,  r-5, s);  // tower walls
    px(g, 0x383828, x+0,    y+r-2,mo,  2,   s);  // base
    px(g, 0x484838, x+0,    y+0,  mo,  4,   s);  // roof
    px(g, 0x4080ff, x+7,    y+0,   2,  2,   s);  // crystal top
    px(g, 0x80c0ff, x+7,    y+0,   1,  1,   s);
    px(g, 0x4080ff, x+3,    y+7,   1,  1,   s);  // rune dots
    px(g, 0x4080ff, x+9,    y+10,  1,  1,   s);
    px(g, 0x4080ff, x+6,    y+14,  1,  1,   s);
    px(g, 0x4080ff, x+3,    y+18,  1,  1,   s);
    px(g, 0x80b0ff, x+2,    y+5,   3,  5,   s);  // window 1
    px(g, 0x80b0ff, x+10,   y+5,   3,  5,   s);  // window 2
    px(g, 0x80b0ff, x+5,    y+13,  3,  5,   s);  // window 3
    // ── Right wing: weapons display gallery (cols mo+12..mo+27) ──
    px(g, 0x585848, x+mo+12,y+3,  16,  r-5, s);
    px(g, 0x383828, x+mo+12,y+r-2,16,  2,   s);
    px(g, 0x484838, x+mo+12,y+0,  16,  4,   s);
    px(g, 0x4a3820, x+mo+13,y+r-7,14,  1,   s);  // shelf 1
    px(g, 0x4a3820, x+mo+13,y+r-12,14, 1,   s);  // shelf 2
    px(g, 0xd4a017, x+mo+14,y+r-11,1,  5,   s);  // sword 1
    px(g, 0xd4a017, x+mo+13,y+r-9, 3,  1,   s);  // guard 1
    px(g, 0x80b0ff, x+mo+14,y+r-11,1,  1,   s);  // glow 1
    px(g, 0xd4a017, x+mo+18,y+r-11,1,  5,   s);  // sword 2
    px(g, 0xd4a017, x+mo+17,y+r-9, 3,  1,   s);  // guard 2
    px(g, 0x80b0ff, x+mo+18,y+r-11,1,  1,   s);  // glow 2
    px(g, 0x80b0ff, x+mo+14,y+5,   3,  5,   s);  // window 1
    px(g, 0x80b0ff, x+mo+20,y+5,   3,  5,   s);  // window 2
  } else if (townLevel >= 4) {
    // Lv4: 大型工坊扩展 (108×69, mo=12, r=23)
    const mo = 12, r = 23, dT = 16;
    // ── Main building ──
    px(g, 0x646055, x+mo+1, y+4,  10, r-4, s);
    px(g, 0x444035, x+mo+1, y+r-2,10,  2,  s);
    px(g, 0x545045, x+mo,   y+1,  12,  3,  s);
    px(g, 0x4a3820, x+mo+9, y+2,   2,  9,  s);  // chimney 1
    px(g, 0x302010, x+mo+9, y+2,   1,  2,  s);
    px(g, 0x4a3820, x+mo+6, y+3,   2,  8,  s);  // chimney 2
    px(g, 0x302010, x+mo+6, y+3,   1,  2,  s);
    px(g, 0x4a3820, x+mo+3, y+4,   2,  7,  s);  // chimney 3
    px(g, 0x302010, x+mo+3, y+4,   1,  2,  s);
    px(g, 0x5a3010, x+mo+4, y+dT,  4,  7,  s);  // door
    px(g, 0xff6030, x+mo+2, y+5,   2,  5,  s);  // forge window L
    px(g, 0xff8050, x+mo+2, y+5,   1,  1,  s);
    px(g, 0xff6030, x+mo+8, y+5,   2,  5,  s);  // forge window R
    // ── Left wing: material store (cols 0..mo-1) ──
    px(g, 0x5a5048, x+0,    y+3,  mo,  r-5, s);
    px(g, 0x3a3028, x+0,    y+r-2,mo,  2,   s);
    px(g, 0x4a4038, x+0,    y+0,  mo,  4,   s);
    px(g, 0x808080, x+2,    y+r-5, 4,  3,   s);  // ore pile L
    px(g, 0xa0a0a0, x+2,    y+r-5, 4,  1,   s);  // ore highlight
    px(g, 0x808080, x+7,    y+r-5, 4,  3,   s);  // ore pile R
    px(g, 0xa0a0a0, x+7,    y+r-5, 4,  1,   s);
    px(g, 0x3a3028, x+1,    y+4,   1,  8,   s);  // loading hook arm
    px(g, 0x3a3028, x+1,    y+4,   4,  1,   s);
    px(g, 0x888880, x+4,    y+5,   1,  2,   s);  // hook
    px(g, 0xff6030, x+3,    y+6,   2,  4,   s);  // window L
    px(g, 0xff6030, x+8,    y+6,   2,  4,   s);  // window R
    // ── Right wing: large outdoor furnace (cols mo+12..mo+23) ──
    px(g, 0x5a5048, x+mo+12,y+3,  12,  r-5, s);
    px(g, 0x3a3028, x+mo+12,y+r-2,12,  2,   s);
    px(g, 0x4a4038, x+mo+12,y+0,  12,  4,   s);
    px(g, 0x3a2008, x+mo+13,y+r-8,10,  6,   s);  // furnace outer
    px(g, 0xff4400, x+mo+14,y+r-7, 8,  4,   s);  // furnace fire
    px(g, 0xff8040, x+mo+15,y+r-6, 6,  2,   s);  // hot center
    px(g, 0x2040a0, x+mo+13,y+r-11,5,  3,   s);  // water quench pool
    px(g, 0x4060c0, x+mo+14,y+r-10,3,  1,   s);  // water highlight
    px(g, 0xff6030, x+mo+14,y+5,   2,  4,   s);  // window 1
    px(g, 0xff6030, x+mo+20,y+5,   2,  4,   s);  // window 2
  } else if (townLevel >= 3) {
    // Lv3: 炼铁坊扩展 (84×63, mo=8, r=21)
    const mo = 8, r = 21, dT = 14;
    // ── Main building ──
    px(g, 0x707060, x+mo+1, y+4,  10, r-4, s);
    px(g, 0x505040, x+mo+1, y+r-2,10,  2,  s);
    px(g, 0x606050, x+mo,   y+2,  12,  3,  s);
    px(g, 0x505040, x+mo+9, y+1,   3,  4,  s);  // upper chimney
    px(g, 0x5a4a30, x+mo+9, y+5,   3,  6,  s);  // lower chimney (wider)
    px(g, 0x303030, x+mo+9, y+1,   2,  2,  s);  // smoke hole
    px(g, 0xff6030, x+mo+2, y+5,   2,  5,  s);  // forge glow window
    px(g, 0xff9060, x+mo+2, y+5,   1,  1,  s);
    px(g, 0x5a3010, x+mo+4, y+dT,  4,  7,  s);  // door
    px(g, 0xd4a017, x+mo+2, y+0,   8,  2,  s);  // sign
    // ── Left wing: tool rack area (cols 0..mo-1) ──
    px(g, 0x606050, x+0,    y+4,   mo, r-6, s);
    px(g, 0x404030, x+0,    y+r-2, mo,  2,  s);
    px(g, 0x505040, x+0,    y+0,   mo,  4,  s);
    px(g, 0x5a3010, x+1,    y+5,   1,  r-7, s);  // rack pole
    px(g, 0x5a3010, x+1,    y+5,   6,  1,   s);  // top bar
    px(g, 0x888888, x+2,    y+6,   2,  2,   s);  // hammer head 1
    px(g, 0x5a3010, x+3,    y+7,   1,  4,   s);  // handle 1
    px(g, 0x888888, x+5,    y+7,   2,  2,   s);  // hammer head 2
    px(g, 0x5a3010, x+5,    y+8,   1,  4,   s);  // handle 2
    px(g, 0xff6030, x+2,    y+r-7, 3,  4,   s);  // forge window
    // ── Right wing: outdoor forge area (cols mo+12..mo+19) ──
    px(g, 0x606050, x+mo+12,y+4,   8, r-6,  s);
    px(g, 0x404030, x+mo+12,y+r-2, 8,  2,   s);
    px(g, 0x505040, x+mo+12,y+0,   8,  4,   s);
    px(g, 0x3a2010, x+mo+13,y+r-7, 6,  5,   s);  // forge pit
    px(g, 0xff4400, x+mo+14,y+r-6, 4,  3,   s);  // fire
    px(g, 0xff8040, x+mo+15,y+r-5, 2,  1,   s);  // hot center
    px(g, 0x202018, x+mo+13,y+r-10,2,  2,   s);  // coal pile
    px(g, 0xff6020, x+mo+13,y+r-9, 1,  1,   s);  // coal glow
    px(g, 0x505040, x+mo+18,y+0,   2,  7,   s);  // chimney/vent
    px(g, 0x303030, x+mo+18,y+0,   1,  2,   s);
  } else if (townLevel >= 2) {
    // Lv2: 砖炉扩展 (60×57, mo=4, r=19)
    const mo = 4, r = 19, dT = 12;
    // ── Main building ──
    px(g, 0x787060, x+mo+1, y+4,  10, r-4, s);
    px(g, 0x585040, x+mo+1, y+r-2,10,  2,  s);
    px(g, 0x686058, x+mo,   y+2,  12,  4,  s);
    px(g, 0x505040, x+mo+9, y+1,   3,  9,  s);  // chimney 1
    px(g, 0x303030, x+mo+10,y+1,   2,  2,  s);  // smoke hole
    px(g, 0x4a4030, x+mo+5, y+3,   3,  8,  s);  // chimney 2
    px(g, 0x282020, x+mo+5, y+3,   2,  2,  s);
    px(g, 0x5a3010, x+mo+4, y+dT,  4,  7,  s);  // door
    px(g, 0xd0c090, x+mo+2, y+6,   2,  4,  s);  // window
    px(g, 0x585040, x+mo+1, y+10, 10,  1,  s);  // brick line
    // ── Left wing: fuel/coal storage (cols 0..mo-1) ──
    px(g, 0x585048, x+0,    y+r-7,  3,  5,  s);  // coal pile
    px(g, 0x404038, x+0,    y+r-7,  3,  1,  s);  // pile top
    px(g, 0xff6020, x+1,    y+r-6,  1,  1,  s);  // coal glow
    // ── Right wing: anvil work area (cols mo+12..mo+15) ──
    px(g, 0x808080, x+mo+12,y+r-5,  3,  1,  s);  // anvil base
    px(g, 0x909090, x+mo+13,y+r-8,  2,  4,  s);  // anvil body
    px(g, 0xa0a0a0, x+mo+12,y+r-6,  1,  2,  s);  // anvil horn
    px(g, 0x888888, x+mo+13,y+r-10, 2,  2,  s);  // hammer head
    px(g, 0x5a3010, x+mo+14,y+r-9,  1,  4,  s);  // hammer handle
  } else {
    // Lv1: 小锻炉 + 细烟囱 (original design)
    px(g, 0x707060, x+1, y+5,  10, 12, s);
    px(g, 0x505040, x+1, y+15, 10,  2, s);
    px(g, 0x606050, x,   y+2,  12,  4, s);
    px(g, 0x505040, x+9, y-2,   3,  9, s);
    px(g, 0x303030, x+10,y-2,   2,  2, s);
    px(g, 0x5a3010, x+4, y+9,   4,  8, s);
    px(g, 0xd0c090, x+2, y+6,   2,  3, s);
  }
}

export function drawCombatBuilding(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number, townLevel: number = 1): void {
  if (townLevel >= 6) {
    // Lv6: 神话战神堡扩展 (156×87, mo=20, r=29)
    const mo = 20, r = 29, dT = 22;
    // ── Main building + integrated towers ──
    px(g, 0x504868, x+mo+1, y+4,  10, r-4, s);  // main walls
    px(g, 0x383048, x+mo+1, y+r-2,10,  2,  s);  // base
    px(g, 0x603050, x+mo,   y+0,  12,  4,  s);  // roof
    px(g, 0x484060, x+mo,   y+0,   3,  r,  s);  // left tower
    px(g, 0x484060, x+mo+9, y+0,   3,  r,  s);  // right tower
    px(g, 0x6050a0, x+mo,   y+0,   1,  2,  s);  // tower battlement L1
    px(g, 0x6050a0, x+mo+2, y+0,   1,  2,  s);  // tower battlement L2
    px(g, 0x6050a0, x+mo+9, y+0,   1,  2,  s);  // tower battlement R1
    px(g, 0x6050a0, x+mo+11,y+0,   1,  2,  s);  // tower battlement R2
    px(g, 0x8060c8, x+mo,   y+4,  12,  1,  s);  // magic glow frieze
    px(g, 0x603050, x+mo+3, y+0,   2,  4,  s);  // battlement center L
    px(g, 0x603050, x+mo+7, y+0,   2,  4,  s);  // battlement center R
    px(g, 0x181018, x+mo+4, y+dT,  4,  7,  s);  // gate
    px(g, 0x6050a0, x+mo+3, y+dT-1,6,  2,  s);  // magic arch
    px(g, 0x5a3010, x+mo+6, y+1,   1,  6,  s);  // flagpole
    px(g, 0x8060c8, x+mo+6, y+1,   3,  3,  s);  // magic flag
    px(g, 0xffffff, x+mo+7, y+2,   1,  1,  s);  // star
    px(g, 0xc0b0d8, x+mo+3, y+5,   2,  4,  s);  // window L
    px(g, 0xc0b0d8, x+mo+7, y+5,   2,  4,  s);  // window R
    // ── Left wing: magic rune fortress (cols 0..mo-1) ──
    px(g, 0x404058, x+0,    y+3,  mo,  r-5, s);  // wing walls
    px(g, 0x282038, x+0,    y+r-2,mo,  2,   s);  // base
    px(g, 0x503060, x+0,    y+0,  mo,  4,   s);  // roof
    px(g, 0x6050a0, x+1,    y+0,   2,  2,   s);  // battlements
    px(g, 0x6050a0, x+6,    y+0,   2,  2,   s);
    px(g, 0x6050a0, x+11,   y+0,   2,  2,   s);
    px(g, 0x6050a0, x+16,   y+0,   2,  2,   s);
    px(g, 0x8060c8, x+3,    y+7,   2,  2,   s);  // rune marks
    px(g, 0x8060c8, x+9,    y+12,  2,  2,   s);
    px(g, 0x8060c8, x+15,   y+7,   2,  2,   s);
    px(g, 0x8060c8, x+3,    y+18,  2,  2,   s);
    px(g, 0x281828, x+4,    y+5,   1,  4,   s);  // arrow slits
    px(g, 0x281828, x+10,   y+8,   1,  4,   s);
    px(g, 0x281828, x+16,   y+5,   1,  4,   s);
    // ── Right wing: divine cannon platform (cols mo+12..mo+31) ──
    px(g, 0x404058, x+mo+12,y+3,  20,  r-5, s);  // wing walls
    px(g, 0x282038, x+mo+12,y+r-2,20,  2,   s);  // base
    px(g, 0x503060, x+mo+12,y+0,  20,  4,   s);  // roof
    px(g, 0x6050a0, x+mo+13,y+0,   2,  2,   s);  // battlements
    px(g, 0x6050a0, x+mo+18,y+0,   2,  2,   s);
    px(g, 0x6050a0, x+mo+23,y+0,   2,  2,   s);
    px(g, 0x808090, x+mo+15,y+r-9,10,  3,   s);  // cannon barrel
    px(g, 0xa0a0b0, x+mo+15,y+r-8,10,  1,   s);  // barrel highlight
    px(g, 0x6050a0, x+mo+14,y+r-8, 1,  3,   s);  // cannon mount L
    px(g, 0x6050a0, x+mo+25,y+r-8, 1,  3,   s);  // cannon mount R
    px(g, 0x8060c8, x+mo+24,y+r-9, 2,  3,   s);  // muzzle glow
    px(g, 0xd0b0ff, x+mo+25,y+r-8, 1,  1,   s);  // bright glow
    px(g, 0x281828, x+mo+14,y+5,   1,  4,   s);  // arrow slits
    px(g, 0x281828, x+mo+20,y+8,   1,  4,   s);
    px(g, 0x281828, x+mo+26,y+5,   1,  4,   s);
    px(g, 0x8060c8, x+mo+14,y+10,  2,  2,   s);  // runes
    px(g, 0x8060c8, x+mo+20,y+16,  2,  2,   s);
  } else if (townLevel >= 5) {
    // Lv5: 王家卫队城堡扩展 (132×78, mo=16, r=26)
    const mo = 16, r = 26, dT = 19;
    // ── Main building + towers ──
    px(g, 0x908070, x+mo+1, y+4,  10, r-4, s);
    px(g, 0x706050, x+mo+1, y+r-2,10,  2,  s);
    px(g, 0x8a3030, x+mo,   y+1,  12,  3,  s);
    px(g, 0x807060, x+mo,   y+1,   4,  r,  s);  // left tower
    px(g, 0x807060, x+mo+8, y+1,   4,  r,  s);  // right tower
    px(g, 0x8a3030, x+mo,   y+1,   2,  2,  s);  // tower spires
    px(g, 0x8a3030, x+mo+10,y+1,   2,  2,  s);
    px(g, 0xd4a017, x+mo,   y+1,   1,  1,  s);  // gold spire tips
    px(g, 0xd4a017, x+mo+11,y+1,   1,  1,  s);
    px(g, 0xaa4040, x+mo+4, y+1,   2,  3,  s);  // wall battlements
    px(g, 0xaa4040, x+mo+7, y+1,   1,  3,  s);
    px(g, 0x5a3010, x+mo+6, y+2,   1,  5,  s);  // flagpole
    px(g, 0xaa3020, x+mo+6, y+2,   3,  3,  s);  // flag
    px(g, 0x3a2010, x+mo+4, y+dT,  4,  7,  s);  // door
    px(g, 0x8a3030, x+mo+3, y+dT-1,6,  2,  s);  // arch
    px(g, 0xd0c090, x+mo+2, y+5,   2,  4,  s);  // windows floor 1
    px(g, 0xd0c090, x+mo+8, y+5,   2,  4,  s);
    px(g, 0xd0c090, x+mo+2, y+11,  2,  3,  s);  // windows floor 2
    px(g, 0xd0c090, x+mo+8, y+11,  2,  3,  s);
    // ── Left wing: cavalry stables (cols 0..mo-1) ──
    px(g, 0x807060, x+0,    y+3,  mo,  r-5, s);
    px(g, 0x604040, x+0,    y+r-2,mo,  2,   s);
    px(g, 0x7a3020, x+0,    y+0,  mo,  4,   s);
    px(g, 0x5a3010, x+2,    y+dT-3,3,  5,  s);  // stall doors
    px(g, 0x5a3010, x+7,    y+dT-3,3,  5,  s);
    px(g, 0x5a3010, x+12,   y+dT-3,3,  5,  s);
    px(g, 0xd0c090, x+2,    y+5,   2,  3,  s);  // windows
    px(g, 0xd0c090, x+8,    y+5,   2,  3,  s);
    px(g, 0xd0c090, x+13,   y+5,   2,  3,  s);
    px(g, 0xaa4040, x+1,    y+0,   2,  3,  s);  // battlements
    px(g, 0xaa4040, x+6,    y+0,   2,  3,  s);
    px(g, 0xaa4040, x+11,   y+0,   2,  3,  s);
    // ── Right wing: war council annex (cols mo+12..mo+27) ──
    px(g, 0x807060, x+mo+12,y+3,  16,  r-5, s);
    px(g, 0x604040, x+mo+12,y+r-2,16,  2,   s);
    px(g, 0x7a3020, x+mo+12,y+0,  16,  4,   s);
    px(g, 0xd0c090, x+mo+13,y+5,   3,  5,  s);  // windows
    px(g, 0xd0c090, x+mo+19,y+5,   3,  5,  s);
    px(g, 0xd0c090, x+mo+13,y+12,  3,  4,  s);
    px(g, 0xd0c090, x+mo+19,y+12,  3,  4,  s);
    px(g, 0x3a2010, x+mo+16,y+dT,  4,  7,  s);  // council door
    px(g, 0x8a3030, x+mo+15,y+dT-1,6,  2,  s);
    px(g, 0xaa4040, x+mo+13,y+0,   2,  3,  s);  // battlements
    px(g, 0xaa4040, x+mo+19,y+0,   2,  3,  s);
    px(g, 0xaa4040, x+mo+25,y+0,   2,  3,  s);
  } else if (townLevel >= 4) {
    // Lv4: 要塞式兵营扩展 (108×69, mo=12, r=23)
    const mo = 12, r = 23, dT = 16;
    // ── Main building ──
    px(g, 0x8a7a68, x+mo+1, y+4,  10, r-4, s);
    px(g, 0x685848, x+mo+1, y+r-2,10,  2,  s);
    px(g, 0x8a3030, x+mo,   y+1,  12,  3,  s);
    px(g, 0xaa4040, x+mo+1, y+1,   2,  3,  s);  // battlements
    px(g, 0xaa4040, x+mo+5, y+1,   2,  3,  s);
    px(g, 0xaa4040, x+mo+9, y+1,   2,  3,  s);
    px(g, 0x3a2010, x+mo+4, y+dT,  4,  7,  s);  // iron gate
    px(g, 0x484040, x+mo+4, y+dT,  1,  7,  s);  // portcullis bar L
    px(g, 0x484040, x+mo+6, y+dT,  1,  7,  s);  // portcullis bar R
    px(g, 0x484040, x+mo+4, y+dT+2,4,  1,  s);  // portcullis cross H1
    px(g, 0x484040, x+mo+4, y+dT+5,4,  1,  s);  // portcullis cross H2
    px(g, 0x5a3010, x+mo+6, y+1,   1,  5,  s);  // flagpole
    px(g, 0xaa3020, x+mo+6, y+2,   3,  2,  s);  // flag
    px(g, 0xd0c090, x+mo+2, y+5,   2,  3,  s);  // windows
    px(g, 0xd0c090, x+mo+8, y+5,   2,  3,  s);
    px(g, 0xd0c090, x+mo+2, y+10,  2,  3,  s);
    px(g, 0xd0c090, x+mo+8, y+10,  2,  3,  s);
    // ── Left wing: inner fortress tower (cols 0..mo-1) ──
    px(g, 0x7a6a58, x+0,    y+3,  mo,  r-5, s);
    px(g, 0x584838, x+0,    y+r-2,mo,  2,   s);
    px(g, 0x7a3020, x+0,    y+0,  mo,  4,   s);
    px(g, 0xaa4040, x+1,    y+0,   2,  3,   s);  // battlements
    px(g, 0xaa4040, x+5,    y+0,   2,  3,   s);
    px(g, 0xaa4040, x+9,    y+0,   2,  3,   s);
    px(g, 0x281818, x+3,    y+6,   1,  4,   s);  // arrow slits
    px(g, 0x281818, x+7,    y+10,  1,  4,   s);
    px(g, 0xd0c090, x+2,    y+5,   2,  3,   s);  // windows
    px(g, 0xd0c090, x+8,    y+5,   2,  3,   s);
    // ── Right wing: training / war room (cols mo+12..mo+23) ──
    px(g, 0x7a6a58, x+mo+12,y+3,  12,  r-5, s);
    px(g, 0x584838, x+mo+12,y+r-2,12,  2,   s);
    px(g, 0x7a3020, x+mo+12,y+0,  12,  4,   s);
    px(g, 0xaa4040, x+mo+13,y+0,   2,  3,   s);  // battlements
    px(g, 0xaa4040, x+mo+17,y+0,   2,  3,   s);
    px(g, 0xaa4040, x+mo+21,y+0,   2,  3,   s);
    px(g, 0x5a3010, x+mo+14,y+r-7, 1,  5,   s);  // training post
    px(g, 0x8a5020, x+mo+13,y+r-7, 3,  2,   s);  // target arms
    px(g, 0x888888, x+mo+18,y+r-6, 1,  4,   s);  // sword display 1
    px(g, 0xd4a017, x+mo+17,y+r-5, 3,  1,   s);  // crossguard 1
    px(g, 0x888888, x+mo+21,y+r-6, 1,  4,   s);  // sword display 2
    px(g, 0xd0c090, x+mo+14,y+5,   2,  3,   s);  // windows
    px(g, 0xd0c090, x+mo+20,y+5,   2,  3,   s);
    px(g, 0xd0c090, x+mo+14,y+10,  2,  3,   s);
    px(g, 0xd0c090, x+mo+20,y+10,  2,  3,   s);
  } else if (townLevel >= 3) {
    // Lv3: 城堡式营房扩展 (84×63, mo=8, r=21)
    const mo = 8, r = 21, dT = 14;
    // ── Main building ──
    px(g, 0x8a7060, x+mo+1, y+4,  10, r-4, s);
    px(g, 0x6a5040, x+mo+1, y+r-2,10,  2,  s);
    px(g, 0x8a3030, x+mo,   y+2,  12,  3,  s);
    px(g, 0xaa4040, x+mo+1, y+2,   2,  2,  s);  // three battlements
    px(g, 0xaa4040, x+mo+5, y+2,   2,  2,  s);
    px(g, 0xaa4040, x+mo+9, y+2,   2,  2,  s);
    px(g, 0x5a3010, x+mo+6, y+2,   1,  5,  s);  // flagpole
    px(g, 0xaa3020, x+mo+6, y+2,   3,  3,  s);  // flag
    px(g, 0xffd040, x+mo+7, y+3,   1,  1,  s);  // emblem
    px(g, 0x5a3010, x+mo+4, y+dT,  4,  7,  s);  // door
    px(g, 0xd0c090, x+mo+2, y+6,   2,  3,  s);  // windows
    px(g, 0xd0c090, x+mo+8, y+6,   2,  3,  s);
    // ── Left wing: armory (cols 0..mo-1) ──
    px(g, 0x807060, x+0,    y+4,   mo, r-6, s);
    px(g, 0x605040, x+0,    y+r-2, mo,  2,  s);
    px(g, 0x7a3020, x+0,    y+0,   mo,  4,  s);
    px(g, 0xaa4040, x+1,    y+0,   2,  2,  s);  // battlements
    px(g, 0xaa4040, x+5,    y+0,   2,  2,  s);
    px(g, 0x888888, x+2,    y+6,   1,  5,  s);  // sword display L
    px(g, 0xd4a017, x+1,    y+7,   3,  1,  s);  // crossguard L
    px(g, 0x888888, x+5,    y+6,   1,  5,  s);  // sword display R
    px(g, 0xd4a017, x+4,    y+7,   3,  1,  s);  // crossguard R
    px(g, 0xd0c090, x+2,    y+r-7, 3,  3,  s);  // window
    // ── Right wing: training yard (cols mo+12..mo+19) ──
    px(g, 0x807060, x+mo+12,y+4,   8, r-6,  s);
    px(g, 0x605040, x+mo+12,y+r-2, 8,  2,   s);
    px(g, 0x7a3020, x+mo+12,y+0,   8,  4,   s);
    px(g, 0xaa4040, x+mo+12,y+0,   2,  2,   s);  // battlements
    px(g, 0xaa4040, x+mo+16,y+0,   2,  2,   s);
    px(g, 0x5a3010, x+mo+15,y+r-7, 1,  5,   s);  // training post
    px(g, 0x8a5020, x+mo+14,y+r-7, 3,  2,   s);  // target arms
    px(g, 0xd0c090, x+mo+14,y+5,   3,  3,   s);  // window
  } else if (townLevel >= 2) {
    // Lv2: 石基兵房扩展 (60×57, mo=4, r=19)
    const mo = 4, r = 19, dT = 12;
    // ── Main building ──
    px(g, 0x8a7060, x+mo+1, y+4,  10, r-4, s);
    px(g, 0x6a5040, x+mo+1, y+r-2,10,  2,  s);
    px(g, 0x8a3030, x+mo,   y+2,  12,  4,  s);
    px(g, 0xaa4040, x+mo+1, y+2,   2,  2,  s);  // battlements
    px(g, 0xaa4040, x+mo+5, y+2,   2,  2,  s);
    px(g, 0xaa4040, x+mo+9, y+2,   2,  2,  s);
    px(g, 0x5a3010, x+mo+4, y+dT,  4,  7,  s);  // door
    px(g, 0x8a5020, x+mo+4, y+dT,  4,  1,  s);  // door top
    px(g, 0xd0c090, x+mo+2, y+6,   2,  3,  s);  // windows
    px(g, 0xd0c090, x+mo+8, y+6,   2,  3,  s);
    // ── Left wing: guard post (cols 0..mo-1) ──
    px(g, 0x807060, x+0,    y+r-8,  3,  6,  s);  // guard booth body
    px(g, 0x8a3030, x+0,    y+r-8,  3,  2,  s);  // booth roof
    px(g, 0x5a3010, x+1,    y+r-3,  1,  3,  s);  // booth door
    // ── Right wing: weapon rack (cols mo+12..mo+15) ──
    px(g, 0x5a3010, x+mo+12,y+5,    1, r-7, s);  // rack post
    px(g, 0x5a3010, x+mo+12,y+5,    4,  1,  s);  // rack bar
    px(g, 0x888888, x+mo+12,y+6,    1,  4,  s);  // sword 1
    px(g, 0xd4a017, x+mo+12,y+7,    2,  1,  s);  // guard 1
    px(g, 0x888888, x+mo+15,y+6,    1,  4,  s);  // sword 2
    px(g, 0xd4a017, x+mo+14,y+7,    2,  1,  s);  // guard 2
  } else {
    // Lv1: 简陋营地房 (original design)
    px(g, 0x8a7060, x+1, y+5,  10, 12, s);
    px(g, 0x6a5040, x+1, y+15, 10,  2, s);
    px(g, 0x8a3030, x,   y+2,  12,  4, s);
    px(g, 0xaa4040, x+1, y+1,   2,  2, s);
    px(g, 0xaa4040, x+5, y+1,   2,  2, s);
    px(g, 0xaa4040, x+9, y+1,   2,  2, s);
    px(g, 0x5a3010, x+4, y+10,  4,  7, s);
    px(g, 0xd0c090, x+2, y+6,   2,  3, s);
    px(g, 0xd0c090, x+8, y+6,   2,  3, s);
  }
}

export function drawRestBuilding(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number) {
  px(g, 0x9a8070, x+1, y+5,  10, 12, s);
  px(g, 0x7a6050, x+1, y+15, 10, 2,  s);
  px(g, 0x7a5030, x,   y+2,  12, 4,  s);
  px(g, 0xd09050, x+2, y+0,   4, 2,  s);   // sign
  px(g, 0x5a3010, x+4, y+10,  4, 7,  s);
  px(g, 0xd0c090, x+2, y+6,   2, 3,  s);
  px(g, 0xd0c090, x+8, y+6,   2, 3,  s);
}

export function drawTownHall(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number, townLevel: number = 1) {
  if (townLevel >= 6) {
    // Lv6: 神圣议政殿扩展 (156×87, mo=20, r=29)
    const mo = 20, r = 29, dT = 22;
    // ── Main building (cols mo..mo+11) ──
    px(g, 0x706080, x+mo+1, y+4,  10, r-4, s); // divine purple walls
    px(g, 0x504060, x+mo+1, y+r-2,10,  2, s);  // base
    px(g, 0x906090, x+mo,   y+0,  12,  4, s);  // divine canopy roof
    px(g, 0xffd040, x+mo,   y+0,  12,  1, s);  // gold rim
    px(g, 0xd4a017, x+mo+1, y+4,   1, r-6, s); // gold column L
    px(g, 0xd4a017, x+mo+10,y+4,   1, r-6, s); // gold column R
    px(g, 0xffd040, x+mo+2, y+0,   8,  1, s);  // halo glow
    px(g, 0xffffff, x+mo+5, y+0,   2,  1, s);  // halo shine
    px(g, 0xd4a017, x+mo+5, y+0,   2,  2, s);  // central spire
    px(g, 0xffffff, x+mo+5, y+0,   1,  1, s);  // spire tip
    px(g, 0x3a2010, x+mo+4, y+dT,  4,  7, s);  // tall ornate door
    px(g, 0xd4a017, x+mo+3, y+dT-1,6,  2, s);  // door arch
    px(g, 0xd4a017, x+mo+4, y+dT+1,1,  1, s);  // knob
    px(g, 0xe0d0ff, x+mo+2, y+5,   2,  6, s);  // glowing window L
    px(g, 0xe0d0ff, x+mo+8, y+5,   2,  6, s);  // glowing window R
    px(g, 0xffd040, x+mo+2, y+5,   2,  1, s);
    px(g, 0xffd040, x+mo+8, y+5,   2,  1, s);
    px(g, 0xe0d0ff, x+mo+2, y+14,  2,  5, s);  // 2nd floor windows
    px(g, 0xe0d0ff, x+mo+8, y+14,  2,  5, s);
    px(g, 0x5a3010, x+mo+6, y+1,   1,  4, s);  // flagpole
    px(g, 0xd4a017, x+mo+6, y+1,   3,  2, s);  // flag
    px(g, 0xffffff, x+mo+7, y+2,   1,  1, s);  // star
    // ── Left wing: sacred hall (cols 0..mo-1) ──
    px(g, 0x605070, x+0,    y+3,  mo,  r-5, s); // sacred hall walls
    px(g, 0x403050, x+0,    y+r-2,mo,  2, s);   // base
    px(g, 0x806090, x+0,    y+0,  mo,  4, s);   // roof
    px(g, 0xffd040, x+2,    y+0,  mo-4,1, s);   // gold rim on roof
    px(g, 0xd4a017, x+9,    y+0,   1,  3, s);   // gold cross vertical
    px(g, 0xd4a017, x+7,    y+1,   5,  1, s);   // gold cross horizontal
    px(g, 0xe0d0ff, x+2,    y+5,   3,  5, s);   // rose window 1
    px(g, 0xe0d0ff, x+8,    y+5,   3,  5, s);   // rose window 2
    px(g, 0xe0d0ff, x+14,   y+5,   3,  5, s);   // rose window 3
    px(g, 0xffd040, x+2,    y+5,   3,  1, s);
    px(g, 0xffd040, x+8,    y+5,   3,  1, s);
    px(g, 0xffd040, x+14,   y+5,   3,  1, s);
    px(g, 0xe0d0ff, x+4,    y+13,  3,  5, s);   // floor 2 windows
    px(g, 0xe0d0ff, x+11,   y+13,  3,  5, s);
    px(g, 0x3a2010, x+8,    y+dT,  4,  7, s);   // sacred hall door
    px(g, 0xd4a017, x+7,    y+dT-1,6,  1, s);   // arch
    // ── Right wing: divine library (cols mo+12..mo+31) ──
    px(g, 0x605070, x+mo+12,y+3,  20,  r-5, s); // library walls
    px(g, 0x403050, x+mo+12,y+r-2,20,  2, s);   // base
    px(g, 0x806090, x+mo+12,y+0,  20,  4, s);   // roof
    px(g, 0xffd040, x+mo+12,y+0,  20,  1, s);   // gold rim
    px(g, 0xe0d0ff, x+mo+14,y+5,   3,  5, s);   // windows floor 1
    px(g, 0xe0d0ff, x+mo+20,y+5,   3,  5, s);
    px(g, 0xffd040, x+mo+14,y+5,   3,  1, s);
    px(g, 0xffd040, x+mo+20,y+5,   3,  1, s);
    px(g, 0xe0d0ff, x+mo+14,y+13,  3,  5, s);   // windows floor 2
    px(g, 0xe0d0ff, x+mo+20,y+13,  3,  5, s);
    px(g, 0xe0d0ff, x+mo+14,y+21,  3,  4, s);   // windows floor 3
    px(g, 0xd4a017, x+mo+17,y+0,   1,  4, s);   // library spire
    px(g, 0xffd040, x+mo+17,y+0,   1,  1, s);   // spire tip
    px(g, 0x3a2010, x+mo+22,y+dT,  4,  7, s);   // library door
    px(g, 0xd4a017, x+mo+21,y+dT-1,6,  1, s);
  } else if (townLevel >= 5) {
    // Lv5: 王宫正殿扩展 (132×78, mo=16, r=26)
    const mo = 16, r = 26, dT = 19;
    // ── Main building ──
    px(g, 0x908070, x+mo+1, y+4,  10, r-4, s); // palatial stone walls
    px(g, 0x706050, x+mo+1, y+r-2,10,  2, s);  // base
    px(g, 0x8a3030, x+mo,   y+0,  12,  4, s);  // red palace roof
    px(g, 0xd4a017, x+mo,   y+0,  12,  1, s);  // gold roof trim
    px(g, 0xd4a017, x+mo,   y+0,   2,  2, s);  // left spire
    px(g, 0xd4a017, x+mo+10,y+0,   2,  2, s);  // right spire
    px(g, 0xffd040, x+mo,   y+0,   1,  1, s);
    px(g, 0xffd040, x+mo+11,y+0,   1,  1, s);
    px(g, 0xd4a017, x+mo+1, y+4,   1, r-6, s); // column L
    px(g, 0xd4a017, x+mo+10,y+4,   1, r-6, s); // column R
    px(g, 0x5a3010, x+mo+6, y+2,   1,  4, s);  // flagpole
    px(g, 0xaa3020, x+mo+6, y+2,   4,  3, s);  // flag
    px(g, 0xd4a017, x+mo+7, y+3,   2,  1, s);  // emblem
    px(g, 0x3a2010, x+mo+4, y+dT,  4,  7, s);  // ornate door
    px(g, 0xd4a017, x+mo+3, y+dT-1,6,  1, s);  // arch
    px(g, 0xd4a017, x+mo+4, y+dT+1,1,  1, s);  // knob
    px(g, 0xd0c898, x+mo+2, y+5,   2,  6, s);  // windows L upper
    px(g, 0xd0c898, x+mo+8, y+5,   2,  6, s);  // windows R upper
    px(g, 0xd4a017, x+mo+2, y+5,   2,  1, s);
    px(g, 0xd4a017, x+mo+8, y+5,   2,  1, s);
    px(g, 0xd0c898, x+mo+2, y+13,  2,  4, s);  // 2nd floor windows
    px(g, 0xd0c898, x+mo+8, y+13,  2,  4, s);
    // ── Left wing: royal garden (cols 0..mo-1) ──
    px(g, 0x5a6a48, x+0,    y+3,  mo,  r-5, s); // garden walls (green tinted)
    px(g, 0x3a4a28, x+0,    y+r-2,mo,  2, s);   // base
    px(g, 0x8a3030, x+0,    y+0,  mo,  4, s);   // roof
    px(g, 0xd4a017, x+0,    y+0,  mo,  1, s);   // gold trim
    px(g, 0x3a7a38, x+3,    y+r-8, 4,  6, s);   // garden tree L (round crown)
    px(g, 0x4a9a4a, x+3,    y+r-9, 4,  3, s);   // tree highlight
    px(g, 0x5a3010, x+4,    y+r-5, 2,  5, s);   // tree trunk L
    px(g, 0x3a7a38, x+10,   y+r-8, 4,  6, s);   // garden tree R
    px(g, 0x4a9a4a, x+10,   y+r-9, 4,  3, s);   // tree highlight R
    px(g, 0x5a3010, x+11,   y+r-5, 2,  5, s);   // tree trunk R
    px(g, 0xd0c090, x+2,    y+5,   3,  5, s);   // garden window 1
    px(g, 0xd0c090, x+9,    y+5,   3,  5, s);   // garden window 2
    px(g, 0xd4a017, x+2,    y+5,   3,  1, s);
    px(g, 0xd4a017, x+9,    y+5,   3,  1, s);
    // ── Right wing: guard quarters (cols mo+12..mo+27) ──
    px(g, 0x9a8a78, x+mo+12,y+3,  16,  r-5, s); // quarters walls
    px(g, 0x786858, x+mo+12,y+r-2,16,  2, s);   // base
    px(g, 0x8a3030, x+mo+12,y+0,  16,  4, s);   // roof
    px(g, 0xd4a017, x+mo+12,y+0,  16,  1, s);   // gold trim
    px(g, 0xd0c090, x+mo+14,y+5,   3,  5, s);   // windows floor 1
    px(g, 0xd0c090, x+mo+20,y+5,   3,  5, s);
    px(g, 0xd4a017, x+mo+14,y+5,   3,  1, s);
    px(g, 0xd4a017, x+mo+20,y+5,   3,  1, s);
    px(g, 0xd0c090, x+mo+14,y+12,  3,  4, s);   // windows floor 2
    px(g, 0xd0c090, x+mo+20,y+12,  3,  4, s);
    px(g, 0x5a3010, x+mo+17,y+dT,  4,  7, s);   // guard door
    px(g, 0x8a3030, x+mo+16,y+dT-1,6,  1, s);   // arch
  } else if (townLevel >= 4) {
    // Lv4: 领主殿堂扩展 (108×69, mo=12, r=23)
    const mo = 12, r = 23, dT = 16;
    // ── Main building + side towers ──
    px(g, 0x9a8878, x+mo+1, y+4,  10, r-4, s); // lord's manor walls
    px(g, 0x686050, x+mo+1, y+r-2,10,  2, s);  // base
    px(g, 0x8a3030, x+mo,   y+1,  12,  3, s);  // red roof
    px(g, 0x888070, x+mo,   y+1,   4,  r, s);  // left tower
    px(g, 0x888070, x+mo+8, y+1,   4,  r, s);  // right tower
    px(g, 0xaa4040, x+mo,   y+1,   2,  2, s);  // tower battlements
    px(g, 0xaa4040, x+mo+2, y+1,   2,  2, s);
    px(g, 0xaa4040, x+mo+8, y+1,   2,  2, s);
    px(g, 0xaa4040, x+mo+10,y+1,   2,  2, s);
    px(g, 0x5a3010, x+mo+6, y+1,   1,  5, s);  // flagpole
    px(g, 0xaa3020, x+mo+6, y+2,   4,  3, s);  // flag
    px(g, 0xd4a017, x+mo+7, y+3,   2,  1, s);  // emblem
    px(g, 0x5a3010, x+mo+4, y+dT,  2,  7, s);  // double door L
    px(g, 0x5a3010, x+mo+6, y+dT,  2,  7, s);  // double door R
    px(g, 0x8a5020, x+mo+4, y+dT+1,1,  1, s);  // knob L
    px(g, 0x8a5020, x+mo+7, y+dT+1,1,  1, s);  // knob R
    px(g, 0xd0c090, x+mo+2, y+5,   2,  3, s);  // windows
    px(g, 0xd0c090, x+mo+8, y+5,   2,  3, s);
    px(g, 0xd0c090, x+mo+2, y+10,  2,  3, s);
    px(g, 0xd0c090, x+mo+8, y+10,  2,  3, s);
    // ── Left wing: guard post (cols 0..mo-1) ──
    px(g, 0x8a7868, x+0,    y+3,  mo,  r-5, s); // guard post walls
    px(g, 0x685848, x+0,    y+r-2,mo,  2, s);   // base
    px(g, 0x7a3020, x+0,    y+0,  mo,  4, s);   // roof
    px(g, 0xaa4040, x+1,    y+0,   2,  3, s);   // battlements
    px(g, 0xaa4040, x+5,    y+0,   2,  3, s);
    px(g, 0xaa4040, x+9,    y+0,   2,  3, s);
    px(g, 0xd0c090, x+2,    y+5,   2,  3, s);   // windows
    px(g, 0xd0c090, x+8,    y+5,   2,  3, s);
    px(g, 0x5a3010, x+4,    y+dT,  4,  7, s);   // guard door
    // ── Right wing: council annex (cols mo+12..mo+23) ──
    px(g, 0x8a7868, x+mo+12,y+3,  12,  r-5, s); // annex walls
    px(g, 0x685848, x+mo+12,y+r-2,12,  2, s);   // base
    px(g, 0x8a3030, x+mo+12,y+0,  12,  4, s);   // roof
    px(g, 0xaa4040, x+mo+13,y+0,   2,  3, s);   // battlements
    px(g, 0xaa4040, x+mo+17,y+0,   2,  3, s);
    px(g, 0xaa4040, x+mo+21,y+0,   2,  3, s);
    px(g, 0xd0c090, x+mo+14,y+5,   2,  3, s);   // windows
    px(g, 0xd0c090, x+mo+20,y+5,   2,  3, s);
    px(g, 0xd0c090, x+mo+14,y+10,  2,  3, s);
    px(g, 0xd0c090, x+mo+20,y+10,  2,  3, s);
    px(g, 0x5a3010, x+mo+16,y+dT,  4,  7, s);   // council door
    px(g, 0x8a3030, x+mo+15,y+dT-1,6,  1, s);   // arch
  } else if (townLevel >= 3) {
    // Lv3: 石制市政厅扩展 (84×63, mo=8, r=21)
    const mo = 8, r = 21, dT = 14;
    // ── Main building ──
    px(g, 0x808878, x+mo+1, y+4,  10, r-4, s); // stone walls
    px(g, 0x606858, x+mo+1, y+r-2,10,  2, s);  // stone base
    px(g, 0x8a3030, x+mo,   y+2,  12,  3, s);  // red roof
    px(g, 0xa04040, x+mo+1, y+2,  10,  1, s);  // roof highlight
    px(g, 0x909880, x+mo+3, y+dT-1,6,  2, s);  // stone arch over entrance
    px(g, 0x5a3010, x+mo+6, y+1,   1,  4, s);  // flag
    px(g, 0xaa3020, x+mo+6, y+2,   4,  2, s);
    px(g, 0xd4a017, x+mo+7, y+2,   2,  1, s);  // emblem
    px(g, 0x5a3010, x+mo+4, y+dT,  4,  7, s);  // door
    px(g, 0x8a5020, x+mo+4, y+dT+1,1,  1, s);  // knob
    px(g, 0xd0c090, x+mo+2, y+5,   2,  3, s);  // windows
    px(g, 0xd0c090, x+mo+8, y+5,   2,  3, s);
    px(g, 0xd4a017, x+mo+2, y+0,   8,  2, s);  // gold sign
    // ── Left wing: garden path (cols 0..mo-1) ──
    px(g, 0x758878, x+0,    y+4,   mo, r-6, s); // garden wall
    px(g, 0x556858, x+0,    y+r-2, mo,  2, s);  // base
    px(g, 0x8a3030, x+0,    y+0,   mo,  4, s);  // roof
    px(g, 0x3a7a38, x+1,    y+r-7,  4,  5, s); // small tree
    px(g, 0x4a9a4a, x+1,    y+r-8,  4,  3, s); // tree crown
    px(g, 0x5a3010, x+2,    y+r-5,  2,  5, s); // trunk
    px(g, 0xd0c090, x+2,    y+5,    3,  3, s); // window
    // ── Right wing: announcement hall (cols mo+12..mo+19) ──
    px(g, 0x758878, x+mo+12,y+4,   8,  r-6, s); // hall wall
    px(g, 0x556858, x+mo+12,y+r-2, 8,  2, s);   // base
    px(g, 0x8a3030, x+mo+12,y+0,   8,  4, s);   // roof
    px(g, 0xd4a017, x+mo+12,y+0,   8,  2, s);   // gold sign
    px(g, 0xd0c090, x+mo+14,y+5,   3,  3, s);   // windows
    px(g, 0x5a3010, x+mo+14,y+dT,  4,  7, s);   // hall door
    px(g, 0xa04040, x+mo+13,y+0,   2,  2, s);   // roof battlement
    px(g, 0xa04040, x+mo+17,y+0,   2,  2, s);
  } else if (townLevel >= 2) {
    // Lv2: 二层木楼扩展 (60×57, mo=4, r=19)
    const mo = 4, r = 19, dT = 12;
    // ── Main building ──
    px(g, 0x9a8070, x+mo+1, y+4,  10, r-4, s); // warmer wood walls
    px(g, 0x7a6050, x+mo+1, y+r-2,10,  2, s);  // base
    px(g, 0x8a3030, x+mo,   y+2,  12,  4, s);  // red roof
    px(g, 0xa04040, x+mo+1, y+2,  10,  1, s);  // roof highlight
    px(g, 0x7a6050, x+mo+1, y+9,  10,  1, s);  // floor divider
    px(g, 0x5a3010, x+mo+6, y+1,   1,  4, s);  // flag
    px(g, 0xaa3020, x+mo+6, y+1,   4,  3, s);  // banner
    px(g, 0xd4a017, x+mo+7, y+2,   2,  1, s);  // emblem
    px(g, 0x5a3010, x+mo+4, y+dT,  4,  7, s);  // door
    px(g, 0x8a5020, x+mo+4, y+dT+1,1,  1, s);  // knob
    px(g, 0xd0c090, x+mo+2, y+5,   2,  3, s);  // windows floor 1
    px(g, 0xd0c090, x+mo+8, y+5,   2,  3, s);
    px(g, 0xd0c090, x+mo+2, y+11,  2,  3, s);  // windows floor 2
    px(g, 0xd0c090, x+mo+8, y+11,  2,  3, s);
    // ── Left wing: small storage (cols 0..mo-1) ──
    px(g, 0x8a7060, x+0,    y+r-8,  3,  6, s); // storage body
    px(g, 0x8a3030, x+0,    y+r-8,  3,  2, s); // storage roof
    px(g, 0x5a3010, x+1,    y+r-3,  1,  3, s); // storage door
    // ── Right wing: notice board (cols mo+12..mo+15) ──
    px(g, 0x5a3010, x+mo+12,y+3,    1, r-5, s); // board post
    px(g, 0x5a3010, x+mo+12,y+3,    4,  1, s);  // frame top
    px(g, 0x5a3010, x+mo+12,y+r-2,  4,  1, s);  // frame bottom
    px(g, 0x5a3010, x+mo+12,y+3,    1, r-5, s); // frame left
    px(g, 0x5a3010, x+mo+15,y+3,    1, r-5, s); // frame right
    px(g, 0xd4c8a0, x+mo+13,y+4,    2,  r-7, s);// notice board fill
    px(g, 0x5a4030, x+mo+13,y+5,    2,  1, s);  // notice line 1
    px(g, 0x5a4030, x+mo+13,y+7,    2,  1, s);  // notice line 2
    px(g, 0x5a4030, x+mo+13,y+9,    2,  1, s);  // notice line 3
    px(g, 0x5a4030, x+mo+13,y+11,   2,  1, s);  // notice line 4
  } else {
    // Lv1: 村委木屋 + 小旗 (original design)
    px(g, 0x8a7060, x+1,  y+5,  10, 12, s);
    px(g, 0x7a6050, x+1,  y+15, 10,  2, s);
    px(g, 0x8a3030, x,    y+2,  12,  4, s);
    px(g, 0xa04040, x+1,  y+1,  10,  1, s);
    px(g, 0xa04040, x+2,  y+0,   8,  1, s);
    px(g, 0x5a3010, x+4,  y+9,   4,  8, s);
    px(g, 0x8a5020, x+4,  y+10,  1,  1, s);
    px(g, 0xd0c090, x+2,  y+6,   2,  3, s);
    px(g, 0xd0c090, x+8,  y+6,   2,  3, s);
    px(g, 0xd4a017, x+5,  y+2,   2,  3, s);
    px(g, 0xcc3030, x+6,  y+1,   3,  2, s);
  }
}

// ── Magic ─────────────────────────────────────────────────────────────────────

export const drawMagic: DrawFn = (g, x, y, s) => {
  const m1 = 0x9040d0, m2 = 0x6020a0, sp = 0xffffff;
  const cx = x + 6, cy = y + 8;
  px(g, m1, cx-1, cy-4, 2, 8, s);
  px(g, m1, cx-4, cy-1, 8, 2, s);
  px(g, m1, cx-3, cy-3, 2, 2, s);
  px(g, m1, cx+1, cy-3, 2, 2, s);
  px(g, m1, cx-3, cy+1, 2, 2, s);
  px(g, m1, cx+1, cy+1, 2, 2, s);
  px(g, m2, cx,   cy,   2, 2, s);
  px(g, sp, cx-5, cy-2, 1, 1, s);
  px(g, sp, cx+4, cy+1, 1, 1, s);
  px(g, sp, cx-2, cy+4, 1, 1, s);
};

// ── Passerby ──────────────────────────────────────────────────────────────────
// 纹理 18x24px, 图形占 y+0..7, 底部 = y+7*3=21px
// setOrigin(0.5,1) → 底部(24px)贴 groundY，图形底部在 groundY-3px

export const drawPasserby: DrawFn = (g, x, y, s) => {
  const skin = 0xf0c080, hat = 0x4a3010, coat = 0x9a7040, shoe = 0x3a2010;
  px(g, skin, x+1, y+1, 2, 2, s);   // head
  px(g, hat,  x+1, y+0, 2, 1, s);   // hat
  px(g, coat, x+0, y+3, 4, 3, s);   // body
  px(g, 0x7a5020, x+0, y+5, 4, 1, s);  // belt
  px(g, 0x5a4030, x+0, y+6, 2, 2, s);  // leg L
  px(g, 0x5a4030, x+2, y+6, 2, 2, s);  // leg R
  px(g, shoe, x+0, y+7, 2, 1, s);   // shoe L (bottom = y+7,贴地)
  px(g, shoe, x+2, y+7, 2, 1, s);   // shoe R
};

// ── Tree ─────────────────────────────────────────────────────────────────────
// 纹理 24x36px, 图形 y+0..11, 底部 = y+11*3=33px
// setOrigin(0.5,1) → 底部(36px)贴地

export const drawTree: DrawFn = (g, x, y, s) => {
  px(g, 0x5a3010, x+2, y+7, 2, 5, s);   // trunk (bottom=y+11)
  px(g, 0x2a5a2a, x+0, y+2, 6, 6, s);   // foliage
  px(g, 0x2a5a2a, x+1, y+1, 4, 2, s);
  px(g, 0x3a8a3a, x+1, y+3, 4, 3, s);   // highlight
  px(g, 0x3a8a3a, x+2, y+2, 2, 2, s);
};

// ── Monster sprite registry ───────────────────────────────────────────────────

// Combined registry — human cards from cardSprites.ts + monsters
export const CARD_SPRITE_REGISTRY: Record<string, CardSpriteEntry> = {
  ...HUMAN_SPRITE_REGISTRY,
  ...MONSTER_SPRITE_REGISTRY,
};

// ── Texture generation ────────────────────────────────────────────────────────

export type SpriteKey =
  | 'human_shop_0'  | 'human_shop_1'  | 'human_shop_2'
  | 'human_shop_3'  | 'human_shop_4'  | 'human_shop_5'
  | 'human_craft_0' | 'human_craft_1' | 'human_craft_2'
  | 'human_craft_3' | 'human_craft_4' | 'human_craft_5'
  | 'human_combat_0'| 'human_combat_1'| 'human_combat_2'
  | 'human_combat_3'| 'human_combat_4'| 'human_combat_5'
  | 'human_idle'
  | 'human_farmer' | 'human_peddler' | 'human_guard'
  | 'human_blacksmith' | 'human_merchant' | 'human_knight'
  | 'human_master_blacksmith' | 'human_guild_master' | 'human_paladin'
  | 'human_grandmaster' | 'human_tycoon' | 'human_warlord'
  | 'human_legend_smith' | 'human_legend_tycoon' | 'human_immortal'
  | 'human_divine_smith' | 'human_divine_merchant' | 'human_divine_warrior'
  | 'human_mage' | 'human_sage' | 'human_hero' | 'human_dragonborn' | 'human_demigod'
  | 'monster_rat' | 'monster_wolf' | 'monster_troll'
  | 'monster_harpy' | 'monster_dragon'
  | 'monster_mutant' | 'monster_chaos_beast' | 'monster_abyss_lord'
  | 'monster_primordial' | 'monster_world_ender'
  | 'monster_slime' | 'monster_skeleton' | 'monster_poison_slime'
  | 'monster_skeleton_knight' | 'monster_lich' | 'monster_death_lord'
  | 'monster_void_god' | 'monster_end_bringer'
  | 'monster_ancient_dragon' | 'monster_dragon_king' | 'monster_primordial_dragon'
  | 'building_basic' | 'magic_basic' | 'tree' | 'passerby';

export function generateAllTextures(scene: Phaser.Scene): void {
  function gen(key: string, fn: DrawFn, w: number, h: number): void {
    if (scene.textures.exists(key)) return;
    const g = scene.add.graphics();
    fn(g, 0, 0, 3);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  // ── 纹理高度 = 图形实际底部像素值，确保 setOrigin(0.5,1) 后底部精确贴地 ──
  // 人物 s=3: 鞋底 logical y+15 → 像素 45px。纹理高 = 45
  for (let d = 0; d < 6; d++) {
    const depth = d;
    gen(`human_shop_${d}`,   (g, x, y, s) => drawShopWorker(g, x, y, s, depth),   32, 45);
    gen(`human_craft_${d}`,  (g, x, y, s) => drawCraftWorker(g, x, y, s, depth),  32, 45);
    gen(`human_combat_${d}`, (g, x, y, s) => drawCombatWorker(g, x, y, s, depth), 32, 45);
  }
  gen('human_idle', drawIdleWorker as DrawFn, 32, 45);

  // 每张人物卡 / 怪物卡的专属纹理 — 从 CARD_SPRITE_REGISTRY 统一生成
  for (const [id, entry] of Object.entries(CARD_SPRITE_REGISTRY)) {
    gen(id, entry.draw, entry.w, entry.h);
  }

  // 建筑 s=3: 墙基 logical y+17 → 像素 51px。纹理高 = 51
  gen('building_basic', drawBuilding, 48, 51);
  gen('magic_basic',    drawMagic,    48, 48);

  // 其他
  gen('tree',      drawTree,      24, 36);
  gen('passerby',  drawPasserby,  18, 24);
}

/** Return the right texture key for a card instance */
export function spriteKeyForCard(
  definitionId: string,
  job?: string,
  level = 0
): string {
  // ── Registry-first: if a dedicated sprite exists, use definitionId as key ──
  if (definitionId in CARD_SPRITE_REGISTRY) return definitionId;

  // ── Fallback: job-based textures for regular human cards ──────────────────
  const depth = Math.min(level, 5);
  if (definitionId.startsWith('human')) {
    if (job === 'shop')   return `human_shop_${depth}`;
    if (job === 'craft')  return `human_craft_${depth}`;
    if (job === 'combat') return `human_combat_${depth}`;
    return 'human_idle';
  }
  if (definitionId.startsWith('building')) return 'building_basic';
  if (definitionId.startsWith('magic'))    return 'magic_basic';
  return 'human_idle';
}
