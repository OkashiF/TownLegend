import Phaser from 'phaser';

// ── px helper ─────────────────────────────────────────────────────────────────
function px(g: Phaser.GameObjects.Graphics, c: number,
            x: number, y: number, w = 1, h = 1, s = 1) {
  g.fillStyle(c, 1);
  g.fillRect(x * s, y * s, w * s, h * s);
}

type DrawFn = (g: Phaser.GameObjects.Graphics, x: number, y: number, s: number) => void;

// ── Job colour tints ──────────────────────────────────────────────────────────
// depth 0–5 correspond to card levels 0–5
export const JOB_COLORS = {
  shop:   [0x4ab0e0, 0x2a80c0, 0x1050a0, 0x7030c0, 0xc89010, 0xf8f0c0],
  craft:  [0xe0a020, 0xc07010, 0x804800, 0x503000, 0x1840a0, 0xd0d0e8],
  combat: [0xe04040, 0xb02020, 0x801010, 0xb81818, 0x1038a8, 0xd4a017],
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

  if (depth >= 3) {
    // Fancy merchant coat: gold collar + belt + chest badge
    px(g, 0xd4a017, x+1, y+5, 6, 1, s);  // gold collar
    px(g, 0xd4a017, x+1, y+8, 6, 1, s);  // gold belt
    px(g, 0xd4a017, x+3, y+6, 2, 2, s);  // chest badge
  } else {
    // Basic apron overlay on body
    px(g, 0xffffff, x+2, y+6, 4, 3, s);
    px(g, c2,       x+2, y+6, 4, 1, s);
  }
  if (depth >= 4) {
    // Top hat overwrites hair area
    px(g, 0x1a1208, x+2, y+0, 4, 2, s);  // hat crown
    px(g, 0xd4a017, x+3, y+0, 2, 1, s);  // gold hatband
    px(g, 0x1a1208, x+1, y+2, 6, 1, s);  // hat brim
  }
  if (depth >= 5) {
    // Divine glow trim on sides of body
    px(g, 0xffffc0, x+0, y+5, 1, 4, s);  // left glow
    px(g, 0xffffc0, x+7, y+5, 1, 4, s);  // right glow
  }
}

function drawCraftWorker(g: Phaser.GameObjects.Graphics,
                         x: number, y: number, s: number, depth: number) {
  const c  = JOB_COLORS.craft[depth] ?? JOB_COLORS.craft[0];
  const c2 = Math.max(0, c - 0x202020);
  drawHumanColored(g, x, y, s, c, c2);

  if (depth >= 3) {
    // Heavy leather apron
    px(g, 0x3a1800, x+2, y+5, 4, 5, s);  // dark apron
    px(g, 0x5a2800, x+2, y+6, 4, 1, s);  // apron highlight
    // Larger hammer head
    px(g, 0x888888, x+8, y+4, 3, 3, s);  // big head
    px(g, 0x666666, x+8, y+5, 3, 1, s);  // shadow
    px(g, 0x5a3010, x+8, y+7, 1, 5, s);  // handle
  } else {
    // Basic hammer accessory
    px(g, 0x888888, x+8, y+5, 2, 2, s);  // head
    px(g, 0x5a3010, x+8, y+7, 1, 4, s);  // handle
  }
  if (depth >= 4) {
    // Forge-work shoulder plate
    px(g, 0x608090, x+0, y+5, 1, 3, s);  // shoulder L
    px(g, 0x608090, x+7, y+5, 1, 3, s);  // shoulder R
    // Tool belt details
    px(g, 0x888888, x+2, y+9, 1, 1, s);  // tool L
    px(g, 0x888888, x+5, y+9, 1, 1, s);  // tool R
  }
  if (depth >= 5) {
    // Legendary silver hammer with glow
    px(g, 0xe8e8ff, x+8, y+4, 3, 3, s);  // divine hammer head
    px(g, 0xc0c0ff, x+9, y+4, 1, 1, s);  // glow highlight
    px(g, 0xc0c0ff, x+0, y+5, 1, 3, s);  // divine shoulder glow L
    px(g, 0xc0c0ff, x+7, y+5, 1, 3, s);  // divine shoulder glow R
  }
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

  if (depth >= 3) {
    // Battle-worn plate: shoulder guards
    px(g, armC2, x+0, y+5, 1, 3, s);   // pauldron L
    px(g, armC2, x+7, y+5, 1, 3, s);   // pauldron R
    // Wider sword guard
    px(g, 0xd4a017, x+7, y+5, 2, 1, s);
    // Visor detail on helmet
    px(g, armC2, x+3, y+2, 2, 1, s);   // visor slit
  }
  if (depth >= 4) {
    // Royal blue with cape hint (red strip behind body)
    px(g, 0x8a1010, x+0, y+6, 1, 5, s);  // cape L
    px(g, 0x8a1010, x+7, y+6, 1, 5, s);  // cape R
    // Bigger blade
    px(g, 0xd0d0d0, x+8, y+7, 2, 5, s);  // wide blade
    px(g, 0xe8e8e8, x+8, y+7, 1, 1, s);  // blade tip highlight
  }
  if (depth >= 5) {
    // Divine gold gleam on armor
    px(g, 0xffd040, x+1, y+5, 6, 1, s);  // top armor glow
    px(g, 0xffd040, x+1, y+9, 6, 1, s);  // bottom armor glow
    // Radiant sword blade
    px(g, 0xffffc0, x+8, y+7, 2, 1, s);  // sword glow
    px(g, 0xffffc0, x+8, y+10, 2, 1, s);
  }
}

function drawIdleWorker(g: Phaser.GameObjects.Graphics,
                        x: number, y: number, s: number) {
  drawHumanColored(g, x, y, s, 0x80a060, 0x608040);
}

// ── Human egg-card sprites ─────────────────────────────────────────────────────

function drawHumanMage(g: Phaser.GameObjects.Graphics,
                       x: number, y: number, s: number) {
  const skin = 0xf0c080, skin2 = 0xd4a060;
  const robe = 0x5028b0, robe2 = 0x3010a0;
  const hat  = 0x1a1060;
  // wizard hat brim overwrites hair
  px(g, hat,    x+2, y+0, 4, 2, s);   // hat crown
  px(g, 0x8040f0, x+3, y+0, 2, 1, s); // hat band
  px(g, hat,    x+1, y+2, 6, 1, s);   // hat brim
  // head (y+3..5)
  px(g, skin,   x+2, y+3, 4, 3, s);
  px(g, skin2,  x+3, y+5, 1, 1, s);
  px(g, 0x2020c0, x+3, y+4, 1, 1, s); // left eye (magical)
  px(g, 0x2020c0, x+5, y+4, 1, 1, s); // right eye
  // robe body (y+6..12)
  px(g, robe,   x+1, y+6, 6, 7, s);
  px(g, robe2,  x+1, y+7, 6, 1, s);   // robe highlight stripe
  px(g, robe,   x+0, y+6, 1, 5, s);   // wide sleeves
  px(g, robe,   x+7, y+6, 1, 5, s);
  px(g, skin,   x+0, y+11, 1, 1, s);  // hands
  px(g, skin,   x+7, y+11, 1, 1, s);
  // robe hem + shoes
  px(g, robe2,  x+1, y+13, 6, 1, s);
  px(g, robe,   x+1, y+14, 6, 1, s);
  // staff (right side)
  px(g, 0x5a3010, x+8, y+6, 1, 7, s);  // staff shaft
  px(g, 0x60c0ff, x+8, y+5, 2, 2, s);  // magic orb
  px(g, 0xa0e0ff, x+8, y+5, 1, 1, s);  // orb highlight
}

function drawHumanSage(g: Phaser.GameObjects.Graphics,
                       x: number, y: number, s: number) {
  const skin  = 0xe8b870, skin2 = 0xc09050;
  const robe  = 0xe8e0c0, robe2 = 0xc0b890;
  const beard = 0xd8d8d8;
  // white hair
  px(g, beard, x+2, y+1, 4, 1, s);
  px(g, beard, x+1, y+2, 1, 2, s);
  // head (y+1..4)
  px(g, skin,  x+2, y+1, 4, 4, s);
  px(g, 0x505050, x+3, y+3, 1, 1, s);  // eye L
  px(g, 0x505050, x+5, y+3, 1, 1, s);  // eye R
  // beard (y+4..5)
  px(g, beard, x+2, y+4, 4, 2, s);
  px(g, skin2, x+3, y+4, 2, 1, s);     // face behind beard
  // cream robe body
  px(g, robe,  x+1, y+5, 6, 8, s);
  px(g, robe2, x+1, y+6, 6, 1, s);     // robe stripe
  px(g, 0xd4a017, x+1, y+5, 6, 1, s);  // gold collar
  px(g, robe,  x+0, y+5, 1, 5, s);     // sleeves
  px(g, robe,  x+7, y+5, 1, 5, s);
  px(g, skin,  x+0, y+10, 1, 1, s);    // hands
  px(g, skin,  x+7, y+10, 1, 1, s);
  // scroll held in left hand
  px(g, 0xf0e0b0, x-1, y+8, 2, 4, s);  // scroll body
  px(g, 0xd4a017, x-1, y+8, 2, 1, s);  // scroll top
  px(g, 0xd4a017, x-1, y+11, 2, 1, s); // scroll bottom
  // robe legs/hem
  px(g, robe2, x+1, y+13, 6, 1, s);
  px(g, robe,  x+1, y+14, 6, 1, s);
}

function drawHumanHero(g: Phaser.GameObjects.Graphics,
                       x: number, y: number, s: number) {
  const armr = 0xc8c8d8, armr2 = 0x9090a8;
  const gold = 0xd4a017;
  const cape = 0xb01010;
  // helmet (y+1..4) — bright silver
  px(g, armr,  x+2, y+1, 4, 4, s);
  px(g, armr2, x+1, y+2, 1, 2, s);
  px(g, armr2, x+6, y+2, 1, 2, s);
  px(g, 0x60a0ff, x+3, y+3, 1, 1, s);  // blue eye-glow L
  px(g, 0x60a0ff, x+5, y+3, 1, 1, s);  // blue eye-glow R
  px(g, gold,  x+2, y+1, 4, 1, s);     // gold crown on helmet
  // cape behind body (drawn before body so body is on top)
  px(g, cape,  x+0, y+5, 1, 8, s);     // cape L edge
  px(g, cape,  x+7, y+5, 1, 8, s);     // cape R edge
  // shining armor body
  px(g, armr,  x+1, y+5, 6, 5, s);
  px(g, gold,  x+3, y+6, 2, 3, s);     // gold chest emblem
  px(g, armr2, x+1, y+9, 6, 1, s);
  // large sword (right side)
  px(g, gold,  x+8, y+4, 2, 1, s);     // crossguard
  px(g, armr,  x+9, y+5, 1, 7, s);     // big blade
  px(g, 0xffffff, x+9, y+5, 1, 1, s);  // blade shine
  px(g, 0x8a6020, x+8, y+3, 1, 2, s);  // grip
  // legs
  px(g, armr,  x+1, y+10, 2, 3, s);
  px(g, armr,  x+5, y+10, 2, 3, s);
  // boots
  px(g, 0x2a1808, x+1, y+13, 2, 2, s);
  px(g, 0x2a1808, x+5, y+13, 2, 2, s);
}

function drawHumanDragonborn(g: Phaser.GameObjects.Graphics,
                              x: number, y: number, s: number) {
  const scales = 0x3a8040, scales2 = 0x206030;
  const gold   = 0xd4a017;
  const eye    = 0xff8800;
  // dragon horns (y+0..1)
  px(g, 0x206030, x+2, y+0, 1, 2, s);   // horn L
  px(g, 0x206030, x+5, y+0, 1, 2, s);   // horn R
  // head with scales
  px(g, scales,  x+2, y+1, 4, 4, s);
  px(g, scales2, x+2, y+1, 4, 1, s);    // scale row top
  px(g, scales2, x+2, y+3, 4, 1, s);    // scale row mid
  px(g, eye,     x+3, y+3, 1, 1, s);    // slit eye L
  px(g, eye,     x+5, y+3, 1, 1, s);    // slit eye R
  // scaled armor body
  px(g, scales,  x+1, y+5, 6, 5, s);
  px(g, scales2, x+1, y+5, 6, 1, s);    // scale row
  px(g, scales2, x+1, y+7, 6, 1, s);    // scale row
  px(g, gold,    x+3, y+6, 2, 2, s);    // gold chest plate
  // clawed arms
  px(g, scales,  x+0, y+5, 1, 3, s);
  px(g, scales,  x+7, y+5, 1, 3, s);
  px(g, 0x1a4020, x+0, y+8, 1, 1, s);   // claw L
  px(g, 0x1a4020, x+7, y+8, 1, 1, s);   // claw R
  // wing tips (y+5..9, behind body)
  px(g, 0x2a5530, x-1, y+5, 2, 5, s);   // wing L
  px(g, 0x2a5530, x+7, y+5, 2, 5, s);   // wing R
  // legs + feet
  px(g, scales,  x+1, y+10, 2, 4, s);
  px(g, scales,  x+5, y+10, 2, 4, s);
  px(g, 0x1a4020, x+1, y+13, 2, 2, s);  // feet
  px(g, 0x1a4020, x+5, y+13, 2, 2, s);
}

function drawHumanDemigod(g: Phaser.GameObjects.Graphics,
                          x: number, y: number, s: number) {
  const skin = 0xfce8c0, skin2 = 0xe8c890;
  const robe = 0xf8f8f0, robe2 = 0xe0d8c0;
  const gold = 0xd4a017;
  const glow = 0xffff80;
  // divine halo (y+0) — golden ring above head
  px(g, gold, x+2, y+0, 4, 1, s);       // halo arc top
  px(g, gold, x+1, y+1, 1, 1, s);       // halo L
  px(g, gold, x+6, y+1, 1, 1, s);       // halo R
  // head (y+1..4) — slightly luminous skin
  px(g, skin,  x+2, y+1, 4, 4, s);
  px(g, skin2, x+3, y+3, 1, 1, s);
  px(g, 0xd0a040, x+3, y+3, 1, 1, s);   // golden eye L
  px(g, 0xd0a040, x+5, y+3, 1, 1, s);   // golden eye R
  // divine white robe body
  px(g, robe,  x+1, y+5, 6, 8, s);
  px(g, gold,  x+1, y+5, 6, 1, s);      // gold collar
  px(g, gold,  x+1, y+8, 6, 1, s);      // gold belt
  px(g, robe2, x+3, y+6, 2, 2, s);      // robe detail
  // glowing sleeves
  px(g, glow,  x+0, y+5, 1, 5, s);      // divine light L
  px(g, glow,  x+7, y+5, 1, 5, s);      // divine light R
  px(g, skin,  x+0, y+10, 1, 1, s);     // hands
  px(g, skin,  x+7, y+10, 1, 1, s);
  // robe hem
  px(g, robe2, x+1, y+13, 6, 1, s);
  px(g, robe,  x+1, y+14, 6, 1, s);
  // divine glow on shoes
  px(g, glow,  x+1, y+13, 2, 2, s);
  px(g, glow,  x+5, y+13, 2, 2, s);
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
  | 'human_shop_3'  | 'human_shop_4'  | 'human_shop_5'
  | 'human_craft_0' | 'human_craft_1' | 'human_craft_2'
  | 'human_craft_3' | 'human_craft_4' | 'human_craft_5'
  | 'human_combat_0'| 'human_combat_1'| 'human_combat_2'
  | 'human_combat_3'| 'human_combat_4'| 'human_combat_5'
  | 'human_idle'
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
  function gen(key: string, fn: DrawFn, w: number, h: number) {
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

  // 彩蛋人物：同样 32x45px
  gen('human_mage',       drawHumanMage       as DrawFn, 32, 45);
  gen('human_sage',       drawHumanSage       as DrawFn, 32, 45);
  gen('human_hero',       drawHumanHero       as DrawFn, 32, 45);
  gen('human_dragonborn', drawHumanDragonborn as DrawFn, 32, 45);
  gen('human_demigod',    drawHumanDemigod    as DrawFn, 32, 45);

  // 怪物：纹理高 = 图形实际底部像素
  // rat:    feet bottom = (12+2)*3 = 42px
  // wolf:   feet bottom = (12+1)*3 = 39px
  // troll:  feet bottom = (17+3)*3 = 60px
  // harpy:  feet bottom = (12+1)*3 = 39px
  // dragon: feet bottom = (19+2)*3 = 63px
  gen('monster_rat',    drawRat,    32, 42);
  gen('monster_wolf',   drawWolf,   32, 39);
  gen('monster_troll',  drawTroll,  36, 60);
  gen('monster_harpy',  drawHarpy,  42, 39);
  gen('monster_dragon', drawDragon, 54, 63);

  // 新增怪物 (亡灵系 Lv0-5 + 野兽系高级 Lv3-5)
  gen('monster_slime',            drawSlime,            32, 42);
  gen('monster_skeleton',         drawSkeleton,         32, 42);
  gen('monster_poison_slime',     drawPoisonSlime,      36, 51);
  gen('monster_skeleton_knight',  drawSkeletonKnight,   36, 51);
  gen('monster_lich',             drawLich,             42, 57);
  gen('monster_death_lord',       drawDeathLord,        42, 57);
  gen('monster_void_god',         drawVoidGod,          48, 63);
  gen('monster_end_bringer',      drawEndBringer,       54, 69);
  gen('monster_ancient_dragon',   drawAncientDragon,    42, 57);
  gen('monster_dragon_king',      drawDragonKing,       48, 63);
  gen('monster_primordial_dragon',drawPrimordialDragon, 54, 69);

  // 彩蛋怪物
  // mutant:      bottom = y+14 → 45px  (32 wide)
  // chaos_beast: bottom = y+16 → 51px  (36 wide)
  // abyss_lord:  bottom = y+18 → 57px  (42 wide)
  // primordial:  bottom = y+20 → 63px  (48 wide)
  // world_ender: bottom = y+22 → 69px  (54 wide)
  gen('monster_mutant',      drawMonsterMutant,      32, 45);
  gen('monster_chaos_beast', drawMonsterChaosBeast,  36, 51);
  gen('monster_abyss_lord',  drawMonsterAbyssLord,   42, 57);
  gen('monster_primordial',  drawMonsterPrimordial,  48, 63);
  gen('monster_world_ender', drawMonsterWorldEnder,  54, 69);

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
  // ── Egg human cards: exact match before startsWith check ──────────────────
  switch (definitionId) {
    case 'human_mage':       return 'human_mage';
    case 'human_sage':       return 'human_sage';
    case 'human_hero':       return 'human_hero';
    case 'human_dragonborn': return 'human_dragonborn';
    case 'human_demigod':    return 'human_demigod';
  }

  // ── Egg monster cards: exact match ────────────────────────────────────────
  switch (definitionId) {
    case 'monster_mutant':      return 'monster_mutant';
    case 'monster_chaos_beast': return 'monster_chaos_beast';
    case 'monster_abyss_lord':  return 'monster_abyss_lord';
    case 'monster_primordial':  return 'monster_primordial';
    case 'monster_world_ender': return 'monster_world_ender';
  }

  const depth = Math.min(level, 5);
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
  if (definitionId === 'monster_slime')            return 'monster_slime';
  if (definitionId === 'monster_skeleton')         return 'monster_skeleton';
  if (definitionId === 'monster_poison_slime')     return 'monster_poison_slime';
  if (definitionId === 'monster_skeleton_knight')  return 'monster_skeleton_knight';
  if (definitionId === 'monster_lich')             return 'monster_lich';
  if (definitionId === 'monster_death_lord')       return 'monster_death_lord';
  if (definitionId === 'monster_void_god')         return 'monster_void_god';
  if (definitionId === 'monster_end_bringer')      return 'monster_end_bringer';
  if (definitionId === 'monster_ancient_dragon')   return 'monster_ancient_dragon';
  if (definitionId === 'monster_dragon_king')      return 'monster_dragon_king';
  if (definitionId === 'monster_primordial_dragon') return 'monster_primordial_dragon';
  if (definitionId.startsWith('building')) return 'building_basic';
  if (definitionId.startsWith('magic'))    return 'magic_basic';
  return 'human_idle';
}
