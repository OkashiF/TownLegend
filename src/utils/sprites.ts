import Phaser from 'phaser';

// ── px helper ─────────────────────────────────────────────────────────────────
function px(g: Phaser.GameObjects.Graphics, c: number,
            x: number, y: number, w = 1, h = 1, s = 1) {
  g.fillStyle(c, 1);
  g.fillRect(x * s, y * s, w * s, h * s);
}

type DrawFn = (g: Phaser.GameObjects.Graphics, x: number, y: number, s: number) => void;

// ── Job colour tints (main body colour per job × level depth) ─────────────────
// Lv0: base, Lv1: +1 step deeper, Lv2: +2 steps
export const JOB_COLORS = {
  shop:   [0x4ab0e0, 0x2a80c0, 0x1050a0],   // blue → deep blue
  craft:  [0xe0a020, 0xc07010, 0x804800],    // amber → burnt
  combat: [0xe04040, 0xb02020, 0x801010],    // red → crimson
  idle:   [0x80a060, 0x608040, 0x406020],    // muted green
} as const;

// ── Human (job-coloured shirt) ────────────────────────────────────────────────
function drawHumanColored(g: Phaser.GameObjects.Graphics,
                          x: number, y: number, s: number,
                          shirt: number, shirt2: number) {
  const skin = 0xf0c080, skin2 = 0xd4a060,
        hair = 0x4a2800,
        pants = 0x2a4a6a, pants2 = 0x1a3050;
  // head
  px(g, skin,   x+2, y,   4, 4, s);
  px(g, hair,   x+2, y,   4, 1, s);
  px(g, hair,   x+1, y+1, 1, 2, s);
  px(g, hair,   x+3, y+2, 1, 1, s);
  px(g, hair,   x+5, y+2, 1, 1, s);
  // body
  px(g, shirt,  x+1, y+4, 6, 4, s);
  px(g, shirt2, x+1, y+5, 6, 1, s);
  px(g, shirt,  x,   y+4, 1, 3, s);
  px(g, shirt,  x+7, y+4, 1, 3, s);
  px(g, skin,   x,   y+7, 1, 1, s);
  px(g, skin,   x+7, y+7, 1, 1, s);
  // legs
  px(g, pants,  x+1, y+8, 2, 4, s);
  px(g, pants,  x+5, y+8, 2, 4, s);
  px(g, pants2, x+1, y+11,2, 1, s);
  px(g, pants2, x+5, y+11,2, 1, s);
}

// shop worker: blue apron overlay
function drawShopWorker(g: Phaser.GameObjects.Graphics,
                        x: number, y: number, s: number, depth: number) {
  const c  = JOB_COLORS.shop[depth] ?? JOB_COLORS.shop[0];
  const c2 = Math.max(0, c - 0x202020);
  drawHumanColored(g, x, y, s, c, c2);
  // apron
  px(g, 0xffffff, x+2, y+5, 4, 3, s);
  px(g, c2,       x+2, y+5, 4, 1, s);
}

// craft worker: hammer accessory
function drawCraftWorker(g: Phaser.GameObjects.Graphics,
                         x: number, y: number, s: number, depth: number) {
  const c  = JOB_COLORS.craft[depth] ?? JOB_COLORS.craft[0];
  const c2 = Math.max(0, c - 0x202020);
  drawHumanColored(g, x, y, s, c, c2);
  // hammer head
  px(g, 0x888888, x+8, y+4, 2, 2, s);
  px(g, 0x5a3010, x+8, y+6, 1, 3, s);
}

// combat: armoured
function drawCombatWorker(g: Phaser.GameObjects.Graphics,
                          x: number, y: number, s: number, depth: number) {
  const armC  = JOB_COLORS.combat[depth] ?? JOB_COLORS.combat[0];
  const armC2 = Math.max(0, armC - 0x202020);
  const skin  = 0xf0c080;
  const eyeW  = 0xffffff;
  // helmet
  px(g, armC,  x+2, y,   4, 4, s);
  px(g, armC2, x+1, y+1, 1, 2, s);
  px(g, armC2, x+6, y+1, 1, 2, s);
  px(g, eyeW,  x+3, y+2, 1, 1, s);
  px(g, eyeW,  x+5, y+2, 1, 1, s);
  // body
  px(g, armC,  x+1, y+4, 6, 5, s);
  px(g, 0xd4a017,x+3, y+5, 2, 3, s);  // gold trim
  px(g, armC2, x+1, y+8, 6, 1, s);
  // sword
  px(g, 0x8a6020, x+8, y+4, 1, 2, s);
  px(g, 0xc0c0c0, x+8, y+6, 1, 5, s);
  px(g, 0xd4a017, x+7, y+5, 2, 1, s);
  // legs
  px(g, armC,  x+1, y+9, 2, 3, s);
  px(g, armC,  x+5, y+9, 2, 3, s);
  px(g, armC2, x+1, y+11,2, 1, s);
  px(g, armC2, x+5, y+11,2, 1, s);
}

// idle / unassigned
function drawIdleWorker(g: Phaser.GameObjects.Graphics,
                        x: number, y: number, s: number) {
  drawHumanColored(g, x, y, s, 0x80a060, 0x608040);
}

// ── Monsters ──────────────────────────────────────────────────────────────────

function drawMonsterBase(g: Phaser.GameObjects.Graphics,
                         x: number, y: number, s: number,
                         c1: number, c2: number) {
  const eye = 0xff4040;
  px(g, c1, x+1, y+2, 6, 6, s);
  px(g, c2, x+1, y+6, 6, 2, s);
  px(g, c1, x+2, y,   4, 3, s);
  px(g, c2, x+2, y-1, 1, 2, s);
  px(g, c2, x+5, y-1, 1, 2, s);
  px(g, eye,x+3, y+1, 1, 1, s);
  px(g, eye,x+5, y+1, 1, 1, s);
  px(g, c1, x,   y+2, 1, 4, s);
  px(g, c1, x+7, y+2, 1, 4, s);
  px(g, c2, x,   y+5, 1, 1, s);
  px(g, c2, x+7, y+5, 1, 1, s);
  px(g, c2, x+1, y+8, 2, 3, s);
  px(g, c2, x+5, y+8, 2, 3, s);
}

export const drawRat: DrawFn = (g, x, y, s) => {
  // small, grey, round
  px(g, 0x888888, x+2, y+2, 4, 4, s);
  px(g, 0x666666, x+1, y+4, 6, 2, s);
  px(g, 0xaaaaaa, x+3, y+1, 2, 2, s); // head
  px(g, 0xff8888, x+3, y+2, 1, 1, s); // eye
  px(g, 0x888888, x+2, y+6, 2, 2, s); // legs
  px(g, 0x888888, x+4, y+6, 2, 2, s);
  px(g, 0x888888, x,   y+3, 2, 1, s); // ears
  px(g, 0x888888, x+6, y+3, 2, 1, s);
  px(g, 0xaaaaaa, x+7, y+5, 2, 1, s); // tail
};

export const drawWolf: DrawFn = (g, x, y, s) => {
  drawMonsterBase(g, x, y, s, 0x7a7a9a, 0x4a4a6a);
};

export const drawTroll: DrawFn = (g, x, y, s) => {
  drawMonsterBase(g, x, y, s, 0x3a7a3a, 0x1a4a1a);
  // bigger body
  px(g, 0x3a7a3a, x, y+1, 9, 8, s);
};

export const drawHarpy: DrawFn = (g, x, y, s) => {
  drawMonsterBase(g, x, y, s, 0x8a5a2a, 0x5a3a0a);
  // wings
  px(g, 0xc08040, x-2, y+2, 3, 4, s);
  px(g, 0xc08040, x+7, y+2, 3, 4, s);
};

export const drawDragon: DrawFn = (g, x, y, s) => {
  px(g, 0x1a6a2a, x+2, y+4, 8, 6, s);
  px(g, 0x0a4a1a, x+2, y+8, 8, 2, s);
  px(g, 0x1a6a2a, x+6, y+1, 6, 4, s);
  px(g, 0x0a4a1a, x+10,y+2, 2, 2, s);
  px(g, 0xff4040, x+8, y+2, 1, 1, s);
  px(g, 0x0a4a1a, x,   y+2, 3, 4, s);
  px(g, 0x0a4a1a, x,   y+3, 2, 2, s);
  px(g, 0x1a6a2a, x+2, y+10,2, 2, s);
  px(g, 0x1a6a2a, x+8, y+10,2, 2, s);
  px(g, 0x1a6a2a, x,   y+8, 2, 2, s);
  px(g, 0x0a4a1a, x-1, y+9, 2, 1, s);
};

// ── Buildings ─────────────────────────────────────────────────────────────────

export const drawBuilding: DrawFn = (g, x, y, s) => {
  const bldg = 0x8a7060, bldgD = 0x6a5040, roof = 0x8a3030, win = 0xd0c090;
  px(g, bldg,  x+1, y+4, 10, 8, s);
  px(g, bldgD, x+1, y+11,10, 1, s);
  px(g, roof,  x,   y+2, 12, 3, s);
  px(g, roof,  x+1, y+1, 10, 1, s);
  px(g, roof,  x+2, y,   8,  1, s);
  px(g, 0x5a3010,x+5,y+7, 3, 5, s);
  px(g, 0x8a5020,x+5,y+8, 1, 1, s);
  px(g, win,   x+2, y+5, 2, 2, s);
  px(g, win,   x+8, y+5, 2, 2, s);
  px(g, bldgD, x+3, y+5, 1, 2, s);
  px(g, bldgD, x+9, y+5, 1, 2, s);
};

// Job-specific small buildings (drawn directly in scene)
export function drawShopBuilding(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number) {
  // Market stall – blue awning
  px(g, 0x8a7060, x+1, y+5, 10, 7, s);
  px(g, 0x2a70c0, x,   y+2, 12, 4, s);  // awning
  px(g, 0x1a50a0, x,   y+2, 12, 1, s);
  px(g, 0x5a3010, x+4, y+8, 4, 4, s);  // door
  px(g, 0xd0c090, x+2, y+6, 2, 2, s);  // window
  px(g, 0xd0c090, x+8, y+6, 2, 2, s);
}

export function drawCraftBuilding(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number) {
  // Workshop – stone + chimney
  px(g, 0x707060, x+1, y+4, 10, 8, s);
  px(g, 0x505040, x+1, y+10,10, 2, s);
  px(g, 0x606050, x,   y+2, 12, 3, s);  // roof
  px(g, 0x505040, x+9, y-2, 3, 6, s);   // chimney
  px(g, 0x303030, x+10,y-2, 2, 1, s);   // smoke hole
  px(g, 0x5a3010, x+4, y+7, 4, 5, s);   // door
  px(g, 0xd0c090, x+2, y+5, 2, 2, s);
}

export function drawCombatBuilding(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number) {
  // Barracks – red roof + battlements
  px(g, 0x8a7060, x+1, y+4, 10, 8, s);
  px(g, 0x8a3030, x,   y+2, 12, 3, s);
  px(g, 0xaa4040, x+1, y+1, 2, 2, s);   // battlements
  px(g, 0xaa4040, x+5, y+1, 2, 2, s);
  px(g, 0xaa4040, x+9, y+1, 2, 2, s);
  px(g, 0x5a3010, x+4, y+7, 4, 5, s);
  px(g, 0xd0c090, x+2, y+5, 2, 2, s);
  px(g, 0xd0c090, x+8, y+5, 2, 2, s);
}

export function drawRestBuilding(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number) {
  // Inn – warm tones
  px(g, 0x9a8070, x+1, y+4, 10, 8, s);
  px(g, 0x7a5030, x,   y+2, 12, 3, s);
  px(g, 0xd09050, x+2, y,   4,  2, s);  // sign board
  px(g, 0x5a3010, x+4, y+7, 4, 5, s);
  px(g, 0xd0c090, x+2, y+5, 2, 2, s);
  px(g, 0xd0c090, x+8, y+5, 2, 2, s);
}

// ── Magic / environment ───────────────────────────────────────────────────────

export const drawMagic: DrawFn = (g, x, y, s) => {
  const m1 = 0x9040d0, m2 = 0x6020a0, sp = 0xffffff;
  const cx = x + 6, cy = y + 6;
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

export const drawTree: DrawFn = (g, x, y, s) => {
  px(g, 0x5a3010, x+2, y+6, 2, 4, s);
  px(g, 0x2a5a2a, x,   y+2, 6, 4, s);
  px(g, 0x2a5a2a, x+1, y+1, 4, 1, s);
  px(g, 0x2a5a2a, x+1, y,   4, 1, s);
  px(g, 0x3a8a3a, x+1, y+3, 4, 2, s);
};

export const drawPasserby: DrawFn = (g, x, y, s) => {
  px(g, 0xf0c080, x+1, y,   2, 2, s);
  px(g, 0x8a5020, x+1, y,   2, 1, s);
  px(g, 0x9a7040, x,   y+2, 4, 3, s);
  px(g, 0x7a5020, x,   y+4, 4, 1, s);
  px(g, 0x5a4030, x,   y+5, 2, 2, s);
  px(g, 0x5a4030, x+2, y+5, 2, 2, s);
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
  function gen(key: string, fn: DrawFn, w = 48, h = 48) {
    if (scene.textures.exists(key)) return;
    const g = scene.add.graphics();
    fn(g, 0, 0, 3);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  // Human variants per job × level
  for (let d = 0; d < 3; d++) {
    const depth = d;
    gen(`human_shop_${d}`,   (g, x, y, s) => drawShopWorker(g, x, y, s, depth));
    gen(`human_craft_${d}`,  (g, x, y, s) => drawCraftWorker(g, x, y, s, depth));
    gen(`human_combat_${d}`, (g, x, y, s) => drawCombatWorker(g, x, y, s, depth));
  }
  gen('human_idle', drawIdleWorker as DrawFn);

  // Monsters
  gen('monster_rat',    drawRat);
  gen('monster_wolf',   drawWolf);
  gen('monster_troll',  drawTroll, 54, 54);
  gen('monster_harpy',  drawHarpy);
  gen('monster_dragon', drawDragon, 60, 54);

  // Buildings / misc
  gen('building_basic', drawBuilding);
  gen('magic_basic',    drawMagic);
  gen('tree',           drawTree, 32, 40);
  gen('passerby',       drawPasserby, 18, 24);
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
