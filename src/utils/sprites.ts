import Phaser from 'phaser';
import {
  DrawFn, CardSpriteEntry, JOB_COLORS,
  drawShopWorker, drawCraftWorker, drawCombatWorker, drawIdleWorker,
  CARD_SPRITE_REGISTRY as HUMAN_SPRITE_REGISTRY,
} from './cardSprites';

export type { DrawFn, CardSpriteEntry };
export { JOB_COLORS };

// ── px helper ─────────────────────────────────────────────────────────────────
function px(g: Phaser.GameObjects.Graphics, c: number,
            x: number, y: number, w = 1, h = 1, s = 1) {
  g.fillStyle(c, 1);
  g.fillRect(x * s, y * s, w * s, h * s);
}

// ── Monster egg-card sprites ───────────────────────────────────────────────────

export const drawMonsterMutant: DrawFn = (g, x, y, s) => {
  // Lv1 egg: asymmetric mutated blob — 32x45px, bottom = y+14
  const c1 = 0x9040c0, c2 = 0x6020a0;
  const c3 = 0x40c060;                   // mutation colour
  const eye = 0xff2020;
  // lopsided body
  px(g, c1,  x+1, y+3, 7, 6, s);
  px(g, c2,  x+1, y+7, 7, 2, s);
  // head (bigger on left)
  px(g, c1,  x+2, y+0, 5, 4, s);
  px(g, c2,  x+2, y+0, 2, 2, s);        // horn L
  px(g, c3,  x+6, y+0, 1, 2, s);        // mutation spike R
  px(g, eye, x+3, y+2, 1, 1, s);        // big eye L
  px(g, eye, x+5, y+2, 1, 1, s);
  px(g, 0xff8800, x+6, y+1, 1, 1, s);   // extra eye (mutation)
  // mutant arm L (different size)
  px(g, c1,  x+0, y+3, 1, 5, s);
  px(g, c3,  x+0, y+6, 1, 2, s);        // mutation claw
  // arm R (thin)
  px(g, c2,  x+8, y+3, 1, 3, s);
  // legs
  px(g, c2,  x+1, y+9,  2, 4, s);
  px(g, c2,  x+5, y+9,  2, 4, s);
  px(g, c3,  x+1, y+12, 2, 2, s);       // mutant feet
  px(g, c1,  x+5, y+12, 2, 2, s);
};

export const drawMonsterChaosBeast: DrawFn = (g, x, y, s) => {
  // Lv2 egg: chaotic purple form — 36x51px, bottom = y+16
  const c1 = 0x8020c0, c2 = 0x4010a0;
  const swirl = 0xd040ff;
  const eye   = 0xff0088;
  // chaotic body (wide)
  px(g, c1,   x+1, y+4, 8, 7, s);
  px(g, c2,   x+0, y+7, 10, 2, s);      // wide belly
  px(g, swirl,x+2, y+5, 2, 2, s);       // chaos swirl L
  px(g, swirl,x+6, y+5, 2, 2, s);       // chaos swirl R
  // head
  px(g, c1,   x+2, y+0, 6, 5, s);
  px(g, c2,   x+1, y+1, 1, 3, s);       // horn L
  px(g, c2,   x+8, y+1, 1, 3, s);       // horn R
  // 3 eyes
  px(g, eye,  x+3, y+2, 1, 1, s);
  px(g, eye,  x+5, y+2, 1, 1, s);
  px(g, eye,  x+7, y+2, 1, 1, s);       // third eye
  // tentacle arms
  px(g, c2,   x-1, y+4, 2, 6, s);
  px(g, swirl,x-1, y+9, 2, 1, s);
  px(g, c2,   x+9, y+4, 2, 6, s);
  px(g, swirl,x+9, y+9, 2, 1, s);
  // legs
  px(g, c2,   x+1, y+11, 3, 5, s);
  px(g, c2,   x+6, y+11, 3, 5, s);
  px(g, c1,   x+1, y+14, 3, 2, s);
  px(g, c1,   x+6, y+14, 3, 2, s);
};

export const drawMonsterAbyssLord: DrawFn = (g, x, y, s) => {
  // Lv3 egg: dark spider-like abyss lord — 42x57px, bottom = y+18
  const c1 = 0x1a0040, c2 = 0x0a0020;
  const glow = 0xa020ff;
  const eye  = 0x8000ff;
  // dark massive body
  px(g, c1,  x+1, y+5, 10, 8, s);
  px(g, c2,  x+0, y+9, 12, 3, s);       // widest part
  px(g, glow,x+2, y+6, 2, 2, s);        // glow detail L
  px(g, glow,x+8, y+6, 2, 2, s);        // glow detail R
  // imposing head with crown
  px(g, c1,  x+3, y+0, 6, 6, s);
  px(g, glow,x+3, y+0, 1, 2, s);        // crown spike L
  px(g, glow,x+5, y+0, 2, 2, s);        // crown spike mid
  px(g, glow,x+8, y+0, 1, 2, s);        // crown spike R
  // multiple eyes
  px(g, eye, x+4, y+3, 1, 1, s);
  px(g, eye, x+6, y+3, 1, 1, s);
  px(g, eye, x+8, y+3, 1, 1, s);
  px(g, 0x6000c0, x+3, y+4, 1, 1, s);   // dark inner eye
  // spider legs (4 on each side)
  px(g, c2,  x-1, y+5,  1, 3, s); px(g, c2, x-2, y+7,  1, 2, s);
  px(g, c2,  x-1, y+9,  1, 3, s); px(g, c2, x-2, y+11, 1, 2, s);
  px(g, c2,  x+11,y+5,  1, 3, s); px(g, c2, x+12,y+7,  1, 2, s);
  px(g, c2,  x+11,y+9,  1, 3, s); px(g, c2, x+12,y+11, 1, 2, s);
  // legs
  px(g, c2,  x+1, y+13, 4, 5, s);
  px(g, c2,  x+7, y+13, 4, 5, s);
  px(g, glow,x+1, y+16, 4, 2, s);
  px(g, glow,x+7, y+16, 4, 2, s);
};

export const drawMonsterPrimordial: DrawFn = (g, x, y, s) => {
  // Lv4 egg: colossal primordial beast — 48x63px, bottom = y+20
  const c1 = 0x5a3010, c2 = 0x3a1a00;
  const horn = 0x2a1000;
  const eye  = 0xff4400;
  // massive ancient body
  px(g, c1,  x+1, y+5,  12, 10, s);
  px(g, c2,  x+0, y+10, 14,  4, s);     // widest midsection
  px(g, c2,  x+1, y+13, 12,  2, s);     // underbelly
  // multiple large horns on head
  px(g, horn,x+2, y+0,  2, 4, s);       // horn far L
  px(g, horn,x+5, y+0,  2, 4, s);       // horn mid L
  px(g, horn,x+9, y+0,  2, 4, s);       // horn mid R
  px(g, horn,x+12,y+0,  2, 4, s);       // horn far R
  // huge head
  px(g, c1,  x+2, y+2,  10, 7, s);
  px(g, c2,  x+2, y+5,  10, 2, s);      // snout area
  // menacing eyes
  px(g, eye, x+4, y+3,  2, 2, s);
  px(g, eye, x+8, y+3,  2, 2, s);
  px(g, 0xff8800, x+5, y+3, 1, 1, s);   // inner eye L
  px(g, 0xff8800, x+9, y+3, 1, 1, s);   // inner eye R
  // massive arms
  px(g, c2,  x-1, y+5,  3, 8, s);
  px(g, c1,  x-1, y+11, 3, 2, s);       // claws L
  px(g, c2,  x+12,y+5,  3, 8, s);
  px(g, c1,  x+12,y+11, 3, 2, s);       // claws R
  // pillar legs
  px(g, c2,  x+2, y+15, 4, 5, s);
  px(g, c2,  x+8, y+15, 4, 5, s);
  px(g, c1,  x+2, y+18, 4, 3, s);       // feet
  px(g, c1,  x+8, y+18, 4, 3, s);
};

export const drawMonsterWorldEnder: DrawFn = (g, x, y, s) => {
  // Lv5 egg: apocalyptic world ender — 54x69px, bottom = y+22
  const c1   = 0x0a0010, c2 = 0x180028;
  const crack = 0xff2800;
  const eye   = 0xff0000;
  const aura  = 0x6000a0;
  // colossal dark body
  px(g, c2,   x+1,  y+6,  14, 11, s);
  px(g, c1,   x+0,  y+11, 16,  5, s);   // absolute dark core
  // cracks/fire in body
  px(g, crack,x+2,  y+7,  1, 4, s);
  px(g, crack,x+5,  y+9,  1, 3, s);
  px(g, crack,x+9,  y+8,  1, 5, s);
  px(g, crack,x+12, y+7,  1, 3, s);
  // apocalyptic head
  px(g, c2,   x+3,  y+0,  10, 7, s);
  px(g, aura, x+2,  y+0,   1, 3, s);    // aura spike L
  px(g, aura, x+5,  y+0,   1, 2, s);    // aura mid L
  px(g, aura, x+11, y+0,   1, 2, s);    // aura mid R
  px(g, aura, x+13, y+0,   1, 3, s);    // aura spike R
  // multiple glowing red eyes
  px(g, eye,  x+4,  y+2,  2, 2, s);
  px(g, eye,  x+8,  y+2,  2, 2, s);
  px(g, eye,  x+11, y+3,  1, 1, s);
  px(g, eye,  x+3,  y+3,  1, 1, s);
  px(g, 0xff6000, x+6, y+4, 3, 1, s);  // maw/mouth glow
  // void arms (massive)
  px(g, c1,   x-2,  y+6,  4, 9, s);
  px(g, aura, x-2,  y+14, 4, 1, s);    // arm tip glow L
  px(g, c1,   x+14, y+6,  4, 9, s);
  px(g, aura, x+14, y+14, 4, 1, s);    // arm tip glow R
  // pillar-like legs
  px(g, c2,   x+2,  y+17, 5, 5, s);
  px(g, c2,   x+9,  y+17, 5, 5, s);
  px(g, aura, x+2,  y+20, 5, 3, s);    // void feet glow L
  px(g, aura, x+9,  y+20, 5, 3, s);    // void feet glow R
};

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

// ── New monster sprites (亡灵系 Lv0-5 + 野兽系高级 Lv3-5) ───────────────────

export const drawSlime: DrawFn = (g, x, y, s) => {
  // 亡灵系 Lv0 — 32x42px, bottom = y+13
  const c1 = 0xd0d0d0, c2 = 0xaaaaaa;
  const eye = 0xff2020;
  px(g, c1, x+2, y+2, 4, 2, s);       // dome top
  px(g, c1, x+1, y+4, 6, 6, s);       // round body
  px(g, c2, x+0, y+7, 8, 3, s);       // dark belly (widest)
  px(g, c2, x+1, y+11, 6, 2, s);      // flat bottom (→ y+13)
  px(g, 0xeeeeee, x+2, y+4, 2, 2, s); // highlight
  px(g, eye, x+2, y+6, 1, 1, s);      // eye L
  px(g, eye, x+5, y+6, 1, 1, s);      // eye R
};

export const drawSkeleton: DrawFn = (g, x, y, s) => {
  // 亡灵系 Lv0 — 32x42px, bottom = y+13
  const bone = 0xeeeecc, bone2 = 0xccccaa;
  const dark = 0x111111;
  px(g, bone,  x+2, y+0, 4, 4, s);    // skull
  px(g, dark,  x+2, y+2, 1, 1, s);    // eye socket L
  px(g, dark,  x+5, y+2, 1, 1, s);    // eye socket R
  px(g, bone2, x+2, y+4, 4, 5, s);    // ribcage
  px(g, dark,  x+2, y+5, 4, 1, s);    // rib gap 1
  px(g, dark,  x+2, y+7, 4, 1, s);    // rib gap 2
  px(g, bone2, x+1, y+4, 1, 5, s);    // arm L
  px(g, bone2, x+6, y+4, 1, 5, s);    // arm R
  px(g, bone,  x+2, y+9, 4, 1, s);    // pelvis
  px(g, bone2, x+2, y+10, 1, 3, s);   // leg L (thin)
  px(g, bone2, x+5, y+10, 1, 3, s);   // leg R (thin)
  px(g, bone,  x+1, y+12, 2, 1, s);   // foot L (→ y+13)
  px(g, bone,  x+5, y+12, 2, 1, s);   // foot R
};

export const drawPoisonSlime: DrawFn = (g, x, y, s) => {
  // 亡灵系 Lv1 — 36x51px, bottom = y+16
  const c1 = 0x40c060, c2 = 0x20a040;
  const eye = 0xff2020;
  px(g, 0x60e080, x+1, y+0, 2, 2, s); // bubble L
  px(g, 0x60e080, x+7, y+0, 2, 2, s); // bubble R
  px(g, 0x60e080, x+4, y+1, 2, 2, s); // bubble mid
  px(g, c1, x+2, y+2, 6, 3, s);       // dome top
  px(g, c1, x+1, y+5, 8, 8, s);       // wide body
  px(g, c2, x+0, y+9, 10, 3, s);      // dark belly (widest)
  px(g, c2, x+1, y+13, 8, 3, s);      // flat bottom (→ y+16)
  px(g, 0x80ff80, x+3, y+6, 2, 2, s); // highlight
  px(g, eye, x+3, y+7, 1, 1, s);      // eye L
  px(g, eye, x+6, y+7, 1, 1, s);      // eye R
};

export const drawSkeletonKnight: DrawFn = (g, x, y, s) => {
  // 亡灵系 Lv1 — 36x51px, bottom = y+16
  const bone = 0xeeeecc, bone2 = 0xccccaa;
  const armr = 0x888888, armr2 = 0x666666;
  const dark = 0x111111;
  px(g, bone,  x+2, y+0, 5, 4, s);     // skull
  px(g, armr,  x+1, y+1, 7, 4, s);     // helmet
  px(g, dark,  x+3, y+2, 1, 1, s);     // eye socket L
  px(g, dark,  x+5, y+2, 1, 1, s);     // eye socket R
  px(g, armr,  x+1, y+5, 7, 6, s);     // armored body
  px(g, armr2, x+1, y+6, 7, 1, s);     // armor stripe
  px(g, armr2, x+1, y+9, 7, 1, s);     // armor stripe
  px(g, bone2, x+0, y+5, 1, 4, s);     // arm L (bone)
  px(g, armr,  x+8, y+5, 1, 4, s);     // arm R (armored)
  // sword (right side, reference drawCombatWorker)
  px(g, 0x8a6020, x+9, y+4, 1, 2, s);  // grip
  px(g, 0xaaaaaa, x+8, y+5, 2, 1, s);  // crossguard
  px(g, 0xc0c0c0, x+9, y+6, 1, 5, s);  // blade
  px(g, bone,  x+2, y+11, 5, 1, s);    // pelvis
  px(g, bone2, x+2, y+12, 2, 4, s);    // leg L
  px(g, bone2, x+5, y+12, 2, 4, s);    // leg R
  px(g, armr2, x+1, y+15, 3, 1, s);    // foot L armored (→ y+16)
  px(g, armr2, x+5, y+15, 3, 1, s);    // foot R armored
};

export const drawLich: DrawFn = (g, x, y, s) => {
  // 亡灵系 Lv2 — 42x57px, bottom = y+18
  const robe = 0x3a1060, robe2 = 0x20094a;
  const bone = 0xeeeecc;
  const dark = 0x111111;
  const orb  = 0xa040ff;
  px(g, bone,  x+4, y+0, 6, 5, s);     // skull
  px(g, dark,  x+4, y+2, 2, 2, s);     // eye socket L
  px(g, dark,  x+8, y+2, 2, 2, s);     // eye socket R
  px(g, orb,   x+5, y+2, 1, 1, s);     // glowing eye L
  px(g, orb,   x+9, y+2, 1, 1, s);     // glowing eye R
  px(g, robe,  x+2, y+5, 10, 10, s);   // robe body
  px(g, robe2, x+2, y+6,  10, 1, s);   // robe stripe
  px(g, robe2, x+2, y+10, 10, 1, s);   // robe band
  px(g, robe,  x+1, y+5,   1, 7, s);   // sleeve L
  px(g, robe,  x+12, y+5,  1, 7, s);   // sleeve R
  px(g, bone,  x+1, y+12,  1, 1, s);   // hand L
  px(g, bone,  x+12, y+12, 1, 1, s);   // hand R
  px(g, robe2, x+3, y+15,  8, 1, s);   // robe hem
  px(g, robe,  x+4, y+16,  6, 2, s);   // robe bottom (→ y+18)
  // staff (right side, reference drawHumanMage)
  px(g, 0x5a3010, x+13, y+6,  1, 8, s); // staff shaft
  px(g, orb,      x+12, y+4,  2, 3, s); // magic orb
  px(g, 0xd0a0ff, x+12, y+4,  1, 1, s); // orb highlight
};

export const drawDeathLord: DrawFn = (g, x, y, s) => {
  // 亡灵系 Lv3 — 42x57px, bottom = y+18
  const c1 = 0x1a1a2a, c2 = 0x0a0a1a;
  const bone = 0xeeeecc;
  const glow = 0x40ff80;
  // bone crown spikes
  px(g, bone, x+3, y+0, 1, 2, s);
  px(g, bone, x+5, y+0, 1, 3, s);
  px(g, bone, x+7, y+0, 2, 3, s);
  px(g, bone, x+10, y+0, 1, 2, s);
  // dark head
  px(g, c1, x+2, y+2, 9, 4, s);
  px(g, glow, x+3, y+3, 2, 2, s);     // glowing eye L
  px(g, glow, x+8, y+3, 2, 2, s);     // glowing eye R
  // heavy black armor body
  px(g, c1, x+1, y+6, 11, 8, s);
  px(g, c2, x+1, y+9, 11, 2, s);      // dark armor band
  // glow dots around body
  px(g, glow, x+0, y+7,  1, 1, s);
  px(g, glow, x+0, y+11, 1, 1, s);
  px(g, glow, x+12, y+7,  1, 1, s);
  px(g, glow, x+12, y+11, 1, 1, s);
  // arms
  px(g, c2, x+0,  y+6, 1, 6, s);
  px(g, c2, x+12, y+6, 1, 6, s);
  // legs (→ y+18)
  px(g, c2, x+2, y+14, 4, 4, s);
  px(g, c2, x+8, y+14, 4, 4, s);
  px(g, glow, x+2, y+16, 4, 2, s);    // foot glow L (→ y+18)
  px(g, glow, x+8, y+16, 4, 2, s);    // foot glow R
};

export const drawVoidGod: DrawFn = (g, x, y, s) => {
  // 亡灵系 Lv4 — 48x63px, bottom = y+20
  const c1 = 0x080010, c2 = 0x100020;
  const eye1 = 0xff0040, eye2 = 0x8000ff;
  // tentacles (4, two per side, reference drawMonsterChaosBeast)
  px(g, c2, x-1, y+5, 2, 3, s);       // tentacle L-top
  px(g, c2, x-1, y+9, 2, 3, s);       // tentacle L-bot
  px(g, c2, x+14, y+5, 2, 3, s);      // tentacle R-top
  px(g, c2, x+14, y+9, 2, 3, s);      // tentacle R-bot
  // dark body
  px(g, c2, x+1, y+4, 13, 10, s);
  px(g, c1, x+0, y+8, 15,  4, s);     // absolute dark core
  // massive head
  px(g, c2, x+2, y+0, 11, 5, s);
  // 4 eyes (3 red/purple)
  px(g, eye1, x+3,  y+1, 2, 2, s);    // red eye L
  px(g, eye2, x+7,  y+1, 2, 2, s);    // purple eye mid
  px(g, eye1, x+10, y+1, 2, 2, s);    // red eye R
  px(g, eye2, x+6,  y+3, 2, 1, s);    // small lower eye
  // legs (→ y+20)
  px(g, c2, x+2,  y+14, 4, 6, s);
  px(g, c2, x+9,  y+14, 4, 6, s);
  px(g, eye2, x+2,  y+18, 4, 2, s);   // void foot glow L (→ y+20)
  px(g, eye2, x+9,  y+18, 4, 2, s);   // void foot glow R
};

export const drawEndBringer: DrawFn = (g, x, y, s) => {
  // 亡灵系 Lv5 — 54x69px, bottom = y+22
  const c1 = 0x050008, c2 = 0x0a0012;
  const crack = 0xff2800;
  const aura  = 0x4a006a;  // dark purple halo
  // colossal black body
  px(g, c2, x+1,  y+7,  15, 11, s);
  px(g, c1, x+0,  y+11, 17,  6, s);   // absolute dark core
  // cracks (reference drawMonsterWorldEnder crack style)
  px(g, crack, x+2,  y+8,  1, 4, s);
  px(g, crack, x+6,  y+10, 1, 3, s);
  px(g, crack, x+10, y+9,  1, 5, s);
  px(g, crack, x+14, y+8,  1, 4, s);
  // head with dark purple halo on top
  px(g, c2,   x+3,  y+0,  11, 8, s);
  px(g, aura, x+3,  y+0,  11, 1, s);  // halo arc top
  px(g, aura, x+2,  y+0,   1, 3, s);  // halo spike L
  px(g, aura, x+14, y+0,   1, 3, s);  // halo spike R
  // eyes
  px(g, 0xff0000, x+5,  y+2, 2, 2, s);
  px(g, 0xff0000, x+10, y+2, 2, 2, s);
  px(g, crack,    x+7,  y+4, 3, 1, s); // maw glow
  // void arms
  px(g, c1,   x-2,  y+7,  4, 10, s);
  px(g, aura, x-2,  y+16, 4,  1, s);   // arm tip glow L
  px(g, c1,   x+15, y+7,  4, 10, s);
  px(g, aura, x+15, y+16, 4,  1, s);   // arm tip glow R
  // pillar legs (→ y+22)
  px(g, c2,   x+3, y+18, 5, 4, s);
  px(g, c2,   x+9, y+18, 5, 4, s);
  px(g, aura, x+3, y+20, 5, 3, s);     // void foot glow L (→ y+23=69px)
  px(g, aura, x+9, y+20, 5, 3, s);     // void foot glow R
};

export const drawAncientDragon: DrawFn = (g, x, y, s) => {
  // 野兽系 Lv3 — 42x57px, bottom = y+18  (weathered dragon + bone spines)
  const c1 = 0x0a3a1a, c2 = 0x062010;  // weathered dark gray-green
  const spine = 0xd0d0c0;              // bone spines on ridge
  // wing L
  px(g, c2, x+0, y+4, 3, 6, s);
  px(g, c1, x-1, y+5, 2, 4, s);        // wing tip (extends left, reference drawDragon)
  // main body
  px(g, c1, x+2, y+5,  9, 8, s);
  px(g, c2, x+2, y+11, 9, 4, s);
  // bone spines on dorsal ridge
  px(g, spine, x+3, y+4, 1, 2, s);
  px(g, spine, x+5, y+3, 1, 2, s);
  px(g, spine, x+7, y+3, 1, 3, s);
  px(g, spine, x+9, y+4, 1, 2, s);
  // head + neck
  px(g, c1, x+7, y+1, 5, 5, s);
  px(g, c2, x+11, y+3, 2, 3, s);       // snout
  px(g, 0xff4040, x+8, y+2, 1, 1, s);  // eye
  // tail
  px(g, c1, x+11, y+9, 3, 3, s);
  px(g, c2, x+12, y+11, 2, 2, s);
  // legs/feet (→ y+18)
  px(g, c1, x+2, y+15, 4, 3, s);
  px(g, c1, x+7, y+15, 4, 3, s);
  px(g, c2, x+2, y+16, 4, 2, s);       // feet (→ y+18)
  px(g, c2, x+7, y+16, 4, 2, s);
};

export const drawDragonKing: DrawFn = (g, x, y, s) => {
  // 野兽系 Lv4 — 48x63px, bottom = y+20  (dragon + gold crown + wider wings)
  const c1 = 0x1a6a2a, c2 = 0x0a4a1a;  // same base as drawDragon
  const gold = 0xd4a017;
  const eye  = 0xffd040;                // golden eyes
  // wider wing L (reference drawDragon)
  px(g, c2, x+0, y+4, 4, 8, s);
  px(g, c2, x-1, y+5, 2, 6, s);        // wing tip (clips left)
  // body
  px(g, c1, x+3, y+5,  10, 10, s);
  px(g, c2, x+3, y+12, 10,  5, s);
  // gold crown on head
  px(g, gold, x+9,  y+0, 1, 2, s);     // crown spike L
  px(g, gold, x+11, y+0, 2, 3, s);     // crown spike mid
  px(g, gold, x+14, y+0, 1, 2, s);     // crown spike R
  px(g, gold, x+9,  y+1, 6, 1, s);     // crown band
  // head + neck
  px(g, c1, x+8,  y+1, 7, 6, s);
  px(g, c2, x+13, y+4, 3, 3, s);       // snout
  px(g, eye, x+9, y+2, 2, 2, s);       // golden eye
  // tail
  px(g, c1, x+13, y+10, 4, 4, s);
  px(g, c2, x+15, y+12, 2, 2, s);      // tail tip (clips right edge)
  // legs/feet (→ y+20)
  px(g, c1, x+3, y+17, 4, 3, s);
  px(g, c1, x+9, y+17, 4, 3, s);
  px(g, c2, x+3, y+18, 4, 2, s);       // feet (→ y+20)
  px(g, c2, x+9, y+18, 4, 2, s);
};

export const drawPrimordialDragon: DrawFn = (g, x, y, s) => {
  // 野兽系 Lv5 — 54x69px, bottom = y+22  (largest, lava-cracked)
  const c1 = 0x0a3a0a, c2 = 0x062006;  // very dark green
  const lava1 = 0xff4400, lava2 = 0xff8800; // lava cracks
  // wide wing L (extends left)
  px(g, c2, x+0, y+4, 5, 10, s);
  px(g, c2, x-1, y+5, 3,  8, s);
  // massive body
  px(g, c1, x+4, y+5,  12, 12, s);
  px(g, c2, x+4, y+13, 12,  6, s);
  // lava cracks on body (reference drawMonsterWorldEnder crack style)
  px(g, lava1, x+5,  y+6, 1, 4, s);
  px(g, lava2, x+8,  y+8, 1, 3, s);
  px(g, lava1, x+11, y+7, 1, 5, s);
  px(g, lava2, x+14, y+9, 1, 3, s);
  // head + neck
  px(g, c1, x+9, y+0, 8, 7, s);
  px(g, c2, x+15, y+3, 2, 3, s);       // snout
  px(g, lava1, x+10, y+2, 2, 2, s);    // eye L (lava glow)
  px(g, lava2, x+13, y+2, 2, 2, s);    // eye R (lava glow)
  px(g, lava2, x+11, y+1, 1, 2, s);    // head crack
  // tail
  px(g, c1,   x+14, y+11, 4, 5, s);
  px(g, lava1, x+15, y+12, 2, 2, s);   // lava crack on tail
  // legs/feet (→ y+22)
  px(g, c1,   x+4,  y+19, 5, 3, s);
  px(g, c1,   x+11, y+19, 5, 3, s);
  px(g, lava1, x+4,  y+20, 5, 2, s);   // lava feet L (→ y+22)
  px(g, lava1, x+11, y+20, 5, 2, s);   // lava feet R
};

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
const MONSTER_SPRITE_REGISTRY: Record<string, CardSpriteEntry> = {
  // Monsters — beast route
  monster_rat:                { draw: drawRat,              w: 32, h: 42 },
  monster_wolf:               { draw: drawWolf,             w: 32, h: 39 },
  monster_troll:              { draw: drawTroll,            w: 36, h: 60 },
  monster_harpy:              { draw: drawHarpy,            w: 42, h: 39 },
  monster_dragon:             { draw: drawDragon,           w: 54, h: 63 },
  monster_ancient_dragon:     { draw: drawAncientDragon,    w: 42, h: 57 },
  monster_dragon_king:        { draw: drawDragonKing,       w: 48, h: 63 },
  monster_primordial_dragon:  { draw: drawPrimordialDragon, w: 54, h: 69 },

  // Monsters — undead route
  monster_slime:           { draw: drawSlime,          w: 32, h: 42 },
  monster_skeleton:        { draw: drawSkeleton,       w: 32, h: 42 },
  monster_poison_slime:    { draw: drawPoisonSlime,    w: 36, h: 51 },
  monster_skeleton_knight: { draw: drawSkeletonKnight, w: 36, h: 51 },
  monster_lich:            { draw: drawLich,           w: 42, h: 57 },
  monster_death_lord:      { draw: drawDeathLord,      w: 42, h: 57 },
  monster_void_god:        { draw: drawVoidGod,        w: 48, h: 63 },
  monster_end_bringer:     { draw: drawEndBringer,     w: 54, h: 69 },

  // Monster egg cards
  monster_mutant:      { draw: drawMonsterMutant,      w: 32, h: 45 },
  monster_chaos_beast: { draw: drawMonsterChaosBeast,  w: 36, h: 51 },
  monster_abyss_lord:  { draw: drawMonsterAbyssLord,   w: 42, h: 57 },
  monster_primordial:  { draw: drawMonsterPrimordial,  w: 48, h: 63 },
  monster_world_ender: { draw: drawMonsterWorldEnder,  w: 54, h: 69 },
};

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
