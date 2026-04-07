import Phaser from 'phaser';

// ── px helper ─────────────────────────────────────────────────────────────────
function px(g: Phaser.GameObjects.Graphics, c: number,
            x: number, y: number, w = 1, h = 1, s = 1) {
  g.fillStyle(c, 1);
  g.fillRect(x * s, y * s, w * s, h * s);
}

type DrawFn = (g: Phaser.GameObjects.Graphics, x: number, y: number, s: number) => void;

// ── Job colour tints ──────────────────────────────────────────────────────────
export const JOB_COLORS = {
  shop:   [0x4ab0e0, 0x2a80c0, 0x1050a0],
  craft:  [0xe0a020, 0xc07010, 0x804800],
  combat: [0xe04040, 0xb02020, 0x801010],
  idle:   [0x80a060, 0x608040, 0x406020],
} as const;

// ── Human sprites ─────────────────────────────────────────────────────────────
// 纹理尺寸 32x54px (s=3, logical 10.6x18)
// 图形在 y=0..17 (logical)，s=3 → 像素 y=0..51，剩余 3px 留白
// setOrigin(0.5, 1) → 纹理底部(y=54)对准 groundY，图形底部(y=51)贴地

function drawHumanColored(g: Phaser.GameObjects.Graphics,
                          x: number, y: number, s: number,
                          shirt: number, shirt2: number) {
  const skin = 0xf0c080, skin2 = 0xd4a060,
        hair = 0x4a2800,
        pants = 0x2a4a6a, pants2 = 0x1a3050,
        shoe  = 0x3a2010;
  // head  (logical y+1..4)
  px(g, skin,   x+2, y+1, 4, 4, s);
  px(g, hair,   x+2, y+1, 4, 1, s);
  px(g, hair,   x+1, y+2, 1, 2, s);
  px(g, skin2,  x+3, y+3, 1, 1, s);
  px(g, skin2,  x+5, y+3, 1, 1, s);
  // body  (y+5..8)
  px(g, shirt,  x+1, y+5, 6, 4, s);
  px(g, shirt2, x+1, y+6, 6, 1, s);
  px(g, shirt,  x,   y+5, 1, 3, s);   // arms
  px(g, shirt,  x+7, y+5, 1, 3, s);
  px(g, skin,   x,   y+8, 1, 1, s);   // hands
  px(g, skin,   x+7, y+8, 1, 1, s);
  // legs  (y+9..12)
  px(g, pants,  x+1, y+9,  2, 4, s);
  px(g, pants,  x+5, y+9,  2, 4, s);
  px(g, pants2, x+1, y+12, 2, 1, s);
  px(g, pants2, x+5, y+12, 2, 1, s);
  // shoes (y+13..14) — logical bottom = y+14, pixel = (y+14)*3=42+offset
  px(g, shoe,   x+1, y+13, 2, 2, s);
  px(g, shoe,   x+5, y+13, 2, 2, s);
}

function drawShopWorker(g: Phaser.GameObjects.Graphics,
                        x: number, y: number, s: number, depth: number) {
  const c  = JOB_COLORS.shop[depth] ?? JOB_COLORS.shop[0];
  const c2 = Math.max(0, c - 0x202020);
  drawHumanColored(g, x, y, s, c, c2);
  // apron overlay on body
  px(g, 0xffffff, x+2, y+6, 4, 3, s);
  px(g, c2,       x+2, y+6, 4, 1, s);
}

function drawCraftWorker(g: Phaser.GameObjects.Graphics,
                         x: number, y: number, s: number, depth: number) {
  const c  = JOB_COLORS.craft[depth] ?? JOB_COLORS.craft[0];
  const c2 = Math.max(0, c - 0x202020);
  drawHumanColored(g, x, y, s, c, c2);
  // hammer accessory
  px(g, 0x888888, x+8, y+5, 2, 2, s);  // head
  px(g, 0x5a3010, x+8, y+7, 1, 4, s);  // handle
}

function drawCombatWorker(g: Phaser.GameObjects.Graphics,
                          x: number, y: number, s: number, depth: number) {
  const armC  = JOB_COLORS.combat[depth] ?? JOB_COLORS.combat[0];
  const armC2 = Math.max(0, armC - 0x202020);
  const eyeW  = 0xffffff;
  const shoe  = 0x2a1808;
  // helmet (y+1..4)
  px(g, armC,  x+2, y+1, 4, 4, s);
  px(g, armC2, x+1, y+2, 1, 2, s);
  px(g, armC2, x+6, y+2, 1, 2, s);
  px(g, eyeW,  x+3, y+3, 1, 1, s);
  px(g, eyeW,  x+5, y+3, 1, 1, s);
  // armour body (y+5..9)
  px(g, armC,  x+1, y+5, 6, 5, s);
  px(g, 0xd4a017,x+3, y+6, 2, 3, s);  // gold trim
  px(g, armC2, x+1, y+9, 6, 1, s);
  // sword
  px(g, 0x8a6020, x+8, y+5, 1, 2, s);  // guard
  px(g, 0xc0c0c0, x+8, y+7, 1, 5, s);  // blade
  px(g, 0xd4a017, x+7, y+6, 2, 1, s);  // crossguard
  // legs (y+10..12)
  px(g, armC,  x+1, y+10, 2, 3, s);
  px(g, armC,  x+5, y+10, 2, 3, s);
  // boots (y+13..14)
  px(g, shoe,  x+1, y+13, 2, 2, s);
  px(g, shoe,  x+5, y+13, 2, 2, s);
}

function drawIdleWorker(g: Phaser.GameObjects.Graphics,
                        x: number, y: number, s: number) {
  drawHumanColored(g, x, y, s, 0x80a060, 0x608040);
}

// ── Monsters ──────────────────────────────────────────────────────────────────
// 各怪物纹理高度不同，但图形底部均填满到 (纹理高度 - 3px) 处
// setOrigin(0.5,1) → 纹理底部对准 groundY

function drawMonsterBase(g: Phaser.GameObjects.Graphics,
                         x: number, y: number, s: number,
                         c1: number, c2: number) {
  const eye = 0xff4040;
  // body (y+3..8)
  px(g, c1, x+1, y+3, 6, 6, s);
  px(g, c2, x+1, y+7, 6, 2, s);
  // head (y+0..3)
  px(g, c1, x+2, y+0, 4, 4, s);
  px(g, c2, x+2, y+0, 1, 2, s);  // horn L
  px(g, c2, x+5, y+0, 1, 2, s);  // horn R
  px(g, eye,x+3, y+2, 1, 1, s);
  px(g, eye,x+5, y+2, 1, 1, s);
  // arms
  px(g, c1, x,   y+3, 1, 4, s);
  px(g, c1, x+7, y+3, 1, 4, s);
  px(g, c2, x,   y+6, 1, 1, s);
  px(g, c2, x+7, y+6, 1, 1, s);
  // legs (y+9..12) — bottom at y+13
  px(g, c2, x+1, y+9,  2, 4, s);
  px(g, c2, x+5, y+9,  2, 4, s);
  px(g, c1, x+1, y+12, 2, 1, s);  // feet
  px(g, c1, x+5, y+12, 2, 1, s);
}

export const drawRat: DrawFn = (g, x, y, s) => {
  // 纹理 32x42px, 图形占 y+0..13
  px(g, 0xcccccc, x+2, y+2,  4, 3, s);   // head
  px(g, 0xff8888, x+3, y+3,  1, 1, s);   // eye
  px(g, 0xffaaaa, x+2, y+2,  1, 1, s);   // ear L
  px(g, 0xffaaaa, x+5, y+2,  1, 1, s);   // ear R
  px(g, 0xaaaaaa, x+1, y+4,  6, 5, s);   // body
  px(g, 0x888888, x+1, y+8,  6, 3, s);
  px(g, 0x888888, x+1, y+11, 2, 3, s);   // legs
  px(g, 0x888888, x+5, y+11, 2, 3, s);
  px(g, 0x777777, x+0, y+12, 3, 2, s);   // feet (bottom=y+13)
  px(g, 0x777777, x+5, y+12, 3, 2, s);
  px(g, 0x999999, x+7, y+6,  3, 1, s);   // tail
};

export const drawWolf: DrawFn = (g, x, y, s) => {
  // 纹理 32x48px, 图形占 y+0..15
  drawMonsterBase(g, x, y, s, 0x7a7a9a, 0x4a4a6a);
  px(g, 0x9a9aba, x+3, y+3,  3, 2, s);  // snout
  px(g, 0xee2222, x+3, y+4,  3, 1, s);  // grin
};

export const drawTroll: DrawFn = (g, x, y, s) => {
  // 纹理 36x60px, 图形占 y+0..19, 底部 = y+19
  px(g, 0x3a7a3a, x+1, y+0,  8, 14, s);  // huge body
  px(g, 0x1a4a1a, x+1, y+12, 8, 5,  s);
  px(g, 0x4a8a4a, x+2, y+0,  6, 5,  s);  // head (top)
  px(g, 0xff4040, x+3, y+2,  1, 1,  s);  // eye L
  px(g, 0xff4040, x+6, y+2,  1, 1,  s);  // eye R
  px(g, 0x1a4a1a, x-1, y+4,  3, 7,  s);  // arm L
  px(g, 0x1a4a1a, x+8, y+4,  3, 7,  s);  // arm R
  // feet bottom = y+19
  px(g, 0x1a3a1a, x+1, y+17, 3, 3,  s);
  px(g, 0x1a3a1a, x+6, y+17, 3, 3,  s);
};

export const drawHarpy: DrawFn = (g, x, y, s) => {
  // 纹理 42x48px, 图形占 y+0..15
  drawMonsterBase(g, x, y, s, 0x8a5a2a, 0x5a3a0a);
  px(g, 0xc08040, x-2, y+3,  3, 6, s);  // wing L
  px(g, 0xd09050, x-3, y+4,  2, 4, s);
  px(g, 0xc08040, x+7, y+3,  3, 6, s);  // wing R
  px(g, 0xd09050, x+9, y+4,  2, 4, s);
  px(g, 0xe0b060, x+3, y+0,  2, 2, s);  // crest
};

export const drawDragon: DrawFn = (g, x, y, s) => {
  // 纹理 54x66px, 图形占 y+0..21
  px(g, 0x1a6a2a, x+3, y+5,  9, 10, s);  // main body
  px(g, 0x0a4a1a, x+3, y+12, 9, 5,  s);
  px(g, 0x1a6a2a, x+8, y+1,  7, 6,  s);  // neck+head
  px(g, 0x0a4a1a, x+13,y+4,  3, 3,  s);  // snout
  px(g, 0xff4040, x+9, y+2,  1, 1,  s);  // eye
  px(g, 0x0a4a1a, x+0, y+4,  4, 7,  s);  // wing L
  px(g, 0x0a3a0a, x-1, y+5,  2, 5,  s);
  px(g, 0x1a6a2a, x+12,y+10, 4, 4,  s); // tail
  px(g, 0x0a4a1a, x+14,y+12, 3, 3,  s);
  // legs, feet bottom = y+19
  px(g, 0x1a6a2a, x+3, y+17, 4, 4,  s);
  px(g, 0x1a6a2a, x+9, y+17, 4, 4,  s);
  px(g, 0x0a3a0a, x+3, y+19, 4, 2,  s);  // feet
  px(g, 0x0a3a0a, x+9, y+19, 4, 2,  s);
};

// ── Buildings ─────────────────────────────────────────────────────────────────
// 纹理 48x60px, s=3 → 图形逻辑坐标 0..19，像素 0..57
// setOrigin(0.5,1) 使纹理底部(60px)贴地，图形底部(57px)略在地面以上，视觉上贴地

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

export function drawShopBuilding(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number) {
  px(g, 0x8a7060, x+1, y+5,  10, 12, s);   // walls
  px(g, 0x6a5040, x+1, y+15, 10, 2,  s);   // base
  px(g, 0x2a70c0, x,   y+1,  12, 5,  s);   // awning
  px(g, 0x1a50a0, x,   y+1,  12, 1,  s);
  px(g, 0xd4a017, x+3, y+0,   6, 2,  s);   // sign
  px(g, 0x5a3010, x+4, y+10,  4, 7,  s);   // door
  px(g, 0xd0c090, x+2, y+6,   2, 3,  s);   // windows
  px(g, 0xd0c090, x+8, y+6,   2, 3,  s);
}

export function drawCraftBuilding(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number) {
  px(g, 0x707060, x+1, y+5,  10, 12, s);   // walls
  px(g, 0x505040, x+1, y+15, 10, 2,  s);   // base
  px(g, 0x606050, x,   y+2,  12, 4,  s);   // roof
  px(g, 0x505040, x+9, y-2,   3, 9,  s);   // chimney (sticks up)
  px(g, 0x303030, x+10,y-2,   2, 2,  s);   // smoke hole
  px(g, 0x5a3010, x+4, y+9,   4, 8,  s);   // door
  px(g, 0xd0c090, x+2, y+6,   2, 3,  s);   // window
}

export function drawCombatBuilding(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number) {
  px(g, 0x8a7060, x+1, y+5,  10, 12, s);
  px(g, 0x6a5040, x+1, y+15, 10, 2,  s);
  px(g, 0x8a3030, x,   y+2,  12, 4,  s);   // red roof
  px(g, 0xaa4040, x+1, y+1,   2, 2,  s);   // battlements
  px(g, 0xaa4040, x+5, y+1,   2, 2,  s);
  px(g, 0xaa4040, x+9, y+1,   2, 2,  s);
  px(g, 0x5a3010, x+4, y+10,  4, 7,  s);
  px(g, 0xd0c090, x+2, y+6,   2, 3,  s);
  px(g, 0xd0c090, x+8, y+6,   2, 3,  s);
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

// ── Texture generation ────────────────────────────────────────────────────────

export type SpriteKey =
  | 'human_shop_0'  | 'human_shop_1'  | 'human_shop_2'
  | 'human_craft_0' | 'human_craft_1' | 'human_craft_2'
  | 'human_combat_0'| 'human_combat_1'| 'human_combat_2'
  | 'human_idle'
  | 'monster_rat' | 'monster_wolf' | 'monster_troll'
  | 'monster_harpy' | 'monster_dragon'
  | 'building_basic' | 'magic_basic' | 'tree' | 'passerby';

export function generateAllTextures(scene: Phaser.Scene): void {
  function gen(key: string, fn: DrawFn, w: number, h: number) {
    if (scene.textures.exists(key)) return;
    const g = scene.add.graphics();
    fn(g, 0, 0, 3);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  // 人物: 32x54px  setOrigin(0.5,1) → 底部(54px)贴 groundY
  for (let d = 0; d < 3; d++) {
    const depth = d;
    gen(`human_shop_${d}`,   (g, x, y, s) => drawShopWorker(g, x, y, s, depth),   32, 54);
    gen(`human_craft_${d}`,  (g, x, y, s) => drawCraftWorker(g, x, y, s, depth),  32, 54);
    gen(`human_combat_${d}`, (g, x, y, s) => drawCombatWorker(g, x, y, s, depth), 32, 54);
  }
  gen('human_idle', drawIdleWorker as DrawFn, 32, 54);

  // 怪物（尺寸各异，均填满到纹理底部）
  gen('monster_rat',    drawRat,    32, 42);
  gen('monster_wolf',   drawWolf,   32, 48);
  gen('monster_troll',  drawTroll,  36, 63);
  gen('monster_harpy',  drawHarpy,  42, 48);
  gen('monster_dragon', drawDragon, 54, 66);

  // 建筑: 48x60px
  gen('building_basic', drawBuilding, 48, 60);
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
  const depth = Math.min(level, 2);
  if (definitionId.startsWith('human')) {
    if (job === 'shop')   return `human_shop_${depth}`;
    if (job === 'craft')  return `human_craft_${depth}`;
    if (job === 'combat') return `human_combat_${depth}`;
    return 'human_idle';
  }
  if (definitionId === 'monster_rat')    return 'monster_rat';
  if (definitionId === 'monster_wolf')   return 'monster_wolf';
  if (definitionId === 'monster_troll')  return 'monster_troll';
  if (definitionId === 'monster_harpy')  return 'monster_harpy';
  if (definitionId === 'monster_dragon') return 'monster_dragon';
  if (definitionId.startsWith('building')) return 'building_basic';
  if (definitionId.startsWith('magic'))    return 'magic_basic';
  return 'human_idle';
}
