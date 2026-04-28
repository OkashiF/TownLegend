import Phaser from 'phaser';
import { DrawFn, CardSpriteEntry } from './cardSprites';

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

// ── Monster sprite registry ───────────────────────────────────────────────────
export const MONSTER_SPRITE_REGISTRY: Record<string, CardSpriteEntry> = {
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
