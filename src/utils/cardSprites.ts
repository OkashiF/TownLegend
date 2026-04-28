import Phaser from 'phaser';

// ── px helper ─────────────────────────────────────────────────────────────────
function px(g: Phaser.GameObjects.Graphics, c: number,
            x: number, y: number, w = 1, h = 1, s = 1): void {
  g.fillStyle(c, 1);
  g.fillRect(x * s, y * s, w * s, h * s);
}

// ── Types ─────────────────────────────────────────────────────────────────────
export type DrawFn = (g: Phaser.GameObjects.Graphics, x: number, y: number, s: number) => void;

/** A single entry in the card-sprite registry. */
export interface CardSpriteEntry {
  draw: DrawFn;
  w: number;
  h: number;
}

// ── Job colour tints ──────────────────────────────────────────────────────────
// depth 0–5 correspond to card levels 0–5
export const JOB_COLORS = {
  shop:   [0x4ab0e0, 0x2a80c0, 0x1050a0, 0x7030c0, 0xc89010, 0xf8f0c0],
  craft:  [0xe0a020, 0xc07010, 0x804800, 0x503000, 0x1840a0, 0xd0d0e8],
  combat: [0xe04040, 0xb02020, 0x801010, 0xb81818, 0x1038a8, 0xd4a017],
  idle:   [0x80a060, 0x608040, 0x406020],
} as const;

// ── Human base ────────────────────────────────────────────────────────────────
export function drawHumanColored(g: Phaser.GameObjects.Graphics,
                                 x: number, y: number, s: number,
                                 shirt: number, shirt2: number): void {
  const skin = 0xf0c080, skin2 = 0xd4a060,
        hair = 0x4a2800,
        pants = 0x2a4a6a, pants2 = 0x1a3050,
        shoe  = 0x3a2010;
  px(g, skin,   x+2, y+1, 4, 4, s);
  px(g, hair,   x+2, y+1, 4, 1, s);
  px(g, hair,   x+1, y+2, 1, 2, s);
  px(g, skin2,  x+3, y+3, 1, 1, s);
  px(g, skin2,  x+5, y+3, 1, 1, s);
  px(g, shirt,  x+1, y+5, 6, 4, s);
  px(g, shirt2, x+1, y+6, 6, 1, s);
  px(g, shirt,  x,   y+5, 1, 3, s);
  px(g, shirt,  x+7, y+5, 1, 3, s);
  px(g, skin,   x,   y+8, 1, 1, s);
  px(g, skin,   x+7, y+8, 1, 1, s);
  px(g, pants,  x+1, y+9,  2, 4, s);
  px(g, pants,  x+5, y+9,  2, 4, s);
  px(g, pants2, x+1, y+12, 2, 1, s);
  px(g, pants2, x+5, y+12, 2, 1, s);
  px(g, shoe,   x+1, y+13, 2, 2, s);
  px(g, shoe,   x+5, y+13, 2, 2, s);
}

// ── Job worker helpers (exported for sprites.ts fallback textures) ─────────────
export function drawShopWorker(g: Phaser.GameObjects.Graphics,
                               x: number, y: number, s: number, depth: number): void {
  const c  = JOB_COLORS.shop[depth] ?? JOB_COLORS.shop[0];
  const c2 = Math.max(0, c - 0x202020);
  drawHumanColored(g, x, y, s, c, c2);
  if (depth >= 3) {
    px(g, 0xd4a017, x+1, y+5, 6, 1, s);
    px(g, 0xd4a017, x+1, y+8, 6, 1, s);
    px(g, 0xd4a017, x+3, y+6, 2, 2, s);
  } else {
    px(g, 0xffffff, x+2, y+6, 4, 3, s);
    px(g, c2,       x+2, y+6, 4, 1, s);
  }
  if (depth >= 4) {
    px(g, 0x1a1208, x+2, y+0, 4, 2, s);
    px(g, 0xd4a017, x+3, y+0, 2, 1, s);
    px(g, 0x1a1208, x+1, y+2, 6, 1, s);
  }
  if (depth >= 5) {
    px(g, 0xffffc0, x+0, y+5, 1, 4, s);
    px(g, 0xffffc0, x+7, y+5, 1, 4, s);
  }
}

export function drawCraftWorker(g: Phaser.GameObjects.Graphics,
                                x: number, y: number, s: number, depth: number): void {
  const c  = JOB_COLORS.craft[depth] ?? JOB_COLORS.craft[0];
  const c2 = Math.max(0, c - 0x202020);
  drawHumanColored(g, x, y, s, c, c2);
  if (depth >= 3) {
    px(g, 0x3a1800, x+2, y+5, 4, 5, s);
    px(g, 0x5a2800, x+2, y+6, 4, 1, s);
    px(g, 0x888888, x+8, y+4, 3, 3, s);
    px(g, 0x666666, x+8, y+5, 3, 1, s);
    px(g, 0x5a3010, x+8, y+7, 1, 5, s);
  } else {
    px(g, 0x888888, x+8, y+5, 2, 2, s);
    px(g, 0x5a3010, x+8, y+7, 1, 4, s);
  }
  if (depth >= 4) {
    px(g, 0x608090, x+0, y+5, 1, 3, s);
    px(g, 0x608090, x+7, y+5, 1, 3, s);
    px(g, 0x888888, x+2, y+9, 1, 1, s);
    px(g, 0x888888, x+5, y+9, 1, 1, s);
  }
  if (depth >= 5) {
    px(g, 0xe8e8ff, x+8, y+4, 3, 3, s);
    px(g, 0xc0c0ff, x+9, y+4, 1, 1, s);
    px(g, 0xc0c0ff, x+0, y+5, 1, 3, s);
    px(g, 0xc0c0ff, x+7, y+5, 1, 3, s);
  }
}

export function drawCombatWorker(g: Phaser.GameObjects.Graphics,
                                 x: number, y: number, s: number, depth: number): void {
  const armC  = JOB_COLORS.combat[depth] ?? JOB_COLORS.combat[0];
  const armC2 = Math.max(0, armC - 0x202020);
  const eyeW  = 0xffffff;
  const shoe  = 0x2a1808;
  px(g, armC,  x+2, y+1, 4, 4, s);
  px(g, armC2, x+1, y+2, 1, 2, s);
  px(g, armC2, x+6, y+2, 1, 2, s);
  px(g, eyeW,  x+3, y+3, 1, 1, s);
  px(g, eyeW,  x+5, y+3, 1, 1, s);
  px(g, armC,  x+1, y+5, 6, 5, s);
  px(g, 0xd4a017, x+3, y+6, 2, 3, s);
  px(g, armC2, x+1, y+9, 6, 1, s);
  px(g, 0x8a6020, x+8, y+5, 1, 2, s);
  px(g, 0xc0c0c0, x+8, y+7, 1, 5, s);
  px(g, 0xd4a017, x+7, y+6, 2, 1, s);
  px(g, armC,  x+1, y+10, 2, 3, s);
  px(g, armC,  x+5, y+10, 2, 3, s);
  px(g, shoe,  x+1, y+13, 2, 2, s);
  px(g, shoe,  x+5, y+13, 2, 2, s);
  if (depth >= 3) {
    px(g, armC2, x+0, y+5, 1, 3, s);
    px(g, armC2, x+7, y+5, 1, 3, s);
    px(g, 0xd4a017, x+7, y+5, 2, 1, s);
    px(g, armC2, x+3, y+2, 2, 1, s);
  }
  if (depth >= 4) {
    px(g, 0x8a1010, x+0, y+6, 1, 5, s);
    px(g, 0x8a1010, x+7, y+6, 1, 5, s);
    px(g, 0xd0d0d0, x+8, y+7, 2, 5, s);
    px(g, 0xe8e8e8, x+8, y+7, 1, 1, s);
  }
  if (depth >= 5) {
    px(g, 0xffd040, x+1, y+5, 6, 1, s);
    px(g, 0xffd040, x+1, y+9, 6, 1, s);
    px(g, 0xffffc0, x+8, y+7, 2, 1, s);
    px(g, 0xffffc0, x+8, y+10, 2, 1, s);
  }
}

export function drawIdleWorker(g: Phaser.GameObjects.Graphics,
                               x: number, y: number, s: number): void {
  drawHumanColored(g, x, y, s, 0x80a060, 0x608040);
}

// ── 18 individual normal human card draw functions ────────────────────────────
// Lv0
const drawHumanFarmer: DrawFn = (g, x, y, s) => {
  // Base human: yellow-brown work shirt
  drawHumanColored(g, x, y, s, 0xe0a020, 0xb07818);
  // Straw hat brim (wide, sits above head at y+0)
  px(g, 0xd4a018, x+1, y+0, 6, 1, s);
  // Hat crown (center, slightly darker)
  px(g, 0xc89010, x+2, y+0, 4, 1, s);
  // Hat highlight
  px(g, 0xe8c040, x+3, y+0, 2, 1, s);
  // Hoe handle (wooden, right side)
  px(g, 0x5a3010, x+8, y+4, 1, 8, s);
  // Hoe blade (metal, horizontal at top of handle)
  px(g, 0x909090, x+7, y+4, 2, 1, s);
  px(g, 0x606070, x+7, y+5, 1, 1, s);
};
const drawHumanPeddler: DrawFn = (g, x, y, s) => drawShopWorker(g, x, y, s, 0);
const drawHumanGuard:   DrawFn = (g, x, y, s) => drawCombatWorker(g, x, y, s, 0);
// Lv1
const drawHumanBlacksmith: DrawFn = (g, x, y, s) => drawCraftWorker(g, x, y, s, 1);
const drawHumanMerchant:   DrawFn = (g, x, y, s) => drawShopWorker(g, x, y, s, 1);
const drawHumanKnight: DrawFn = (g, x, y, s) => {
  const armor  = 0xb02020;
  const armor2 = 0x801818;
  const helm   = 0x707080;
  const helm2  = 0x484858;
  const skin   = 0xf0c080;
  const gold   = 0xd4a017;
  const silver = 0xc0c0d0;
  const dark   = 0x181820;
  const boot   = 0x2a1808;
  // Helmet
  px(g, helm,  x+2, y+0, 4, 1, s);
  px(g, helm,  x+1, y+1, 6, 3, s);
  px(g, helm2, x+1, y+2, 6, 1, s);
  px(g, dark,  x+2, y+2, 4, 1, s);
  px(g, skin,  x+3, y+3, 2, 1, s);
  // Chest plate
  px(g, armor,  x+1, y+4, 6, 5, s);
  px(g, armor2, x+1, y+5, 6, 1, s);
  px(g, armor2, x+1, y+8, 6, 1, s);
  // Gold cross emblem
  px(g, gold, x+3, y+5, 2, 3, s);
  px(g, gold, x+2, y+6, 4, 1, s);
  // Arms (plate)
  px(g, armor,  x+0, y+4, 1, 4, s);
  px(g, armor,  x+7, y+4, 1, 4, s);
  px(g, skin,   x+0, y+8, 1, 1, s);
  px(g, skin,   x+7, y+8, 1, 1, s);
  // Legs (plate greaves)
  px(g, armor,  x+1, y+9,  2, 4, s);
  px(g, armor,  x+5, y+9,  2, 4, s);
  px(g, armor2, x+1, y+12, 2, 1, s);
  px(g, armor2, x+5, y+12, 2, 1, s);
  // Boots
  px(g, boot, x+1, y+13, 2, 2, s);
  px(g, boot, x+5, y+13, 2, 2, s);
  // Shield (left arm, peeking from left edge)
  px(g, armor,  x-1, y+4, 2, 6, s);
  px(g, armor2, x-1, y+4, 2, 1, s);
  px(g, armor2, x-1, y+9, 2, 1, s);
  px(g, gold,   x-1, y+6, 2, 2, s);
  // Sword (right arm, blade upright)
  px(g, gold,   x+8, y+3, 2, 1, s);
  px(g, silver, x+8, y+4, 1, 7, s);
  px(g, silver, x+9, y+5, 1, 1, s);
  px(g, 0x3a1800, x+8, y+11, 1, 2, s);
};
// Lv2
const drawHumanMasterBlacksmith: DrawFn = (g, x, y, s) => drawCraftWorker(g, x, y, s, 2);
const drawHumanGuildMaster:      DrawFn = (g, x, y, s) => drawShopWorker(g, x, y, s, 2);
const drawHumanPaladin: DrawFn = (g, x, y, s) => {
  const armor  = 0x801010;
  const armor2 = 0x5a0c0c;
  const gold   = 0xd4a017;
  const gold2  = 0xa07010;
  const dark   = 0x180808;
  const silver = 0xc0c0d0;
  const skin   = 0xf0c080;
  const boot   = 0x2a1808;

  // Full-face helmet with gold crest
  px(g, armor,  x+2, y+0, 4, 1, s);
  px(g, gold,   x+3, y+0, 2, 1, s);
  px(g, armor,  x+1, y+1, 6, 3, s);
  px(g, armor2, x+1, y+2, 6, 1, s);
  px(g, dark,   x+2, y+2, 4, 1, s);  // visor slit
  px(g, skin,   x+3, y+3, 2, 1, s);  // chin gap

  // Chest plate
  px(g, armor,  x+1, y+4, 6, 5, s);
  px(g, armor2, x+1, y+5, 6, 1, s);
  px(g, armor2, x+1, y+8, 6, 1, s);
  // Holy cross emblem in gold
  px(g, gold,   x+3, y+5, 2, 3, s);
  px(g, gold,   x+2, y+6, 4, 1, s);

  // Pauldrons / arms (plate)
  px(g, armor,  x+0, y+4, 1, 4, s);
  px(g, armor,  x+7, y+4, 1, 4, s);
  px(g, gold2,  x+0, y+4, 1, 1, s);  // shoulder trim
  px(g, gold2,  x+7, y+4, 1, 1, s);
  px(g, skin,   x+0, y+8, 1, 1, s);
  px(g, skin,   x+7, y+8, 1, 1, s);

  // Greaves
  px(g, armor,  x+1, y+9,  2, 4, s);
  px(g, armor,  x+5, y+9,  2, 4, s);
  px(g, gold2,  x+1, y+10, 2, 1, s);  // gold knee cap
  px(g, gold2,  x+5, y+10, 2, 1, s);
  px(g, armor2, x+1, y+12, 2, 1, s);
  px(g, armor2, x+5, y+12, 2, 1, s);

  // Boots
  px(g, boot,   x+1, y+13, 2, 2, s);
  px(g, boot,   x+5, y+13, 2, 2, s);

  // Shield on left (deep red with gold boss)
  px(g, armor,  x-1, y+4, 2, 6, s);
  px(g, armor2, x-1, y+4, 2, 1, s);
  px(g, armor2, x-1, y+9, 2, 1, s);
  px(g, gold,   x-1, y+6, 2, 2, s);

  // Longsword on right (upright)
  px(g, gold,    x+8, y+3, 2, 1, s);   // crossguard
  px(g, silver,  x+8, y+4, 1, 7, s);   // blade
  px(g, silver,  x+9, y+5, 1, 1, s);   // blade edge highlight
  px(g, 0x3a1800, x+8, y+11, 1, 2, s); // hilt/grip
};
// Lv3
const drawHumanGrandmaster: DrawFn = (g, x, y, s) => drawCraftWorker(g, x, y, s, 3);
const drawHumanTycoon:      DrawFn = (g, x, y, s) => drawShopWorker(g, x, y, s, 3);
const drawHumanWarlord: DrawFn = (g, x, y, s) => {
  const armor  = 0xb81818;  // main dark red
  const armor2 = 0x901010;  // shadow dark red
  const gold   = 0xd4a017;  // gold trim
  const gold2  = 0xa07010;  // dark gold
  const dark   = 0x180808;  // visor slit / dark
  const skin   = 0xf0c080;  // skin
  const cape   = 0x6a0808;  // deep crimson cape
  const boot   = 0x2a1808;  // boots
  const silver = 0xc0c0d0;  // axe blade

  // === War Crown Helmet ===
  // Crown tips (3 spikes: sides + center)
  px(g, gold,  x+2, y+0, 1, 1, s);
  px(g, gold,  x+3, y+0, 2, 1, s);  // center double spike
  px(g, gold,  x+5, y+0, 1, 1, s);
  // Crown base ring
  px(g, gold,  x+2, y+1, 4, 1, s);
  // Helmet body
  px(g, armor, x+1, y+1, 6, 3, s);
  px(g, armor2,x+1, y+2, 6, 1, s);  // shadow band
  px(g, dark,  x+2, y+2, 4, 1, s);  // visor slit
  px(g, skin,  x+3, y+3, 2, 1, s);  // chin gap

  // === Battle Cape (behind torso, hanging wide) ===
  px(g, cape,  x+0, y+4, 1, 9, s);  // left cape edge
  px(g, cape,  x+7, y+4, 1, 9, s);  // right cape edge
  px(g, cape,  x-1, y+5, 1, 7, s); // left cape overhang
  px(g, cape,  x+8, y+5, 1, 7, s); // right cape overhang

  // === Chest Plate ===
  px(g, armor, x+1, y+4, 6, 5, s);
  px(g, armor2,x+1, y+5, 6, 1, s);  // chest shadow stripe
  px(g, armor2,x+1, y+8, 6, 1, s);  // belly plate bottom
  // Skull / war emblem on chest (gold)
  px(g, gold,  x+3, y+5, 2, 1, s);  // emblem top
  px(g, gold,  x+2, y+6, 4, 1, s);  // emblem mid bar
  px(g, gold,  x+3, y+7, 2, 1, s);  // emblem bottom

  // === Pauldrons / Arms ===
  px(g, armor2,x+0, y+4, 1, 1, s);  // left shoulder trim
  px(g, armor2,x+7, y+4, 1, 1, s);  // right shoulder trim
  px(g, gold2, x+0, y+4, 1, 1, s);  // left gold shoulder
  px(g, gold2, x+7, y+4, 1, 1, s);  // right gold shoulder
  px(g, armor, x+0, y+5, 1, 3, s);  // left arm plate
  px(g, armor, x+7, y+5, 1, 3, s);  // right arm plate
  px(g, skin,  x+0, y+8, 1, 1, s);  // left hand peek
  px(g, skin,  x+7, y+8, 1, 1, s);  // right hand peek

  // === Greaves (leg armor) ===
  px(g, armor, x+1, y+9,  2, 4, s);
  px(g, armor, x+5, y+9,  2, 4, s);
  px(g, gold2, x+1, y+10, 2, 1, s); // left knee cap
  px(g, gold2, x+5, y+10, 2, 1, s); // right knee cap
  px(g, armor2,x+1, y+12, 2, 1, s);
  px(g, armor2,x+5, y+12, 2, 1, s);

  // === Boots ===
  px(g, boot,  x+1, y+13, 2, 2, s);
  px(g, boot,  x+5, y+13, 2, 2, s);

  // === War Axe (right side, upright) ===
  px(g, gold,  x+8, y+3, 2, 1, s);   // axe top gold trim
  px(g, silver,x+9, y+4, 1, 4, s);   // axe upper blade
  px(g, silver,x+8, y+5, 1, 2, s);   // axe inner blade
  px(g, armor2,x+8, y+4, 1, 1, s);   // axe top dark
  px(g, 0x8a6020, x+9, y+8, 1, 1, s);// axe handle joint
  px(g, 0x5a3010, x+9, y+9, 1, 4, s);// axe haft / handle
  px(g, gold,  x+9, y+8, 1, 1, s);   // haft top wrap
};
// Lv4
const drawHumanLegendSmith:  DrawFn = (g, x, y, s) => drawCraftWorker(g, x, y, s, 4);
const drawHumanLegendTycoon: DrawFn = (g, x, y, s) => drawShopWorker(g, x, y, s, 4);
const drawHumanImmortal: DrawFn = (g, x, y, s) => {
  const armor  = 0x1038a8;  // deep divine blue
  const armor2 = 0x082088;  // shadow blue
  const gold   = 0xd4a017;  // gold trim
  const gold2  = 0xa07010;  // dark gold
  const dark   = 0x080818;  // visor dark
  const skin   = 0xf0c080;  // skin
  const divine = 0x80c0ff;  // divine glow
  const silver = 0xc0c0d0;  // blade
  const boot   = 0x1a1030;  // dark blue-black boot

  // Divine Crown — 3 gold spikes
  px(g, gold,  x+2, y+0, 1, 1, s);
  px(g, gold,  x+3, y+0, 2, 1, s);
  px(g, gold,  x+5, y+0, 1, 1, s);
  // Crown base band
  px(g, gold,  x+2, y+1, 4, 1, s);
  // Helmet body
  px(g, armor, x+1, y+1, 6, 3, s);
  px(g, armor2,x+1, y+2, 6, 1, s);
  // Visor slit with divine glowing eyes
  px(g, dark,  x+2, y+2, 4, 1, s);
  px(g, divine,x+3, y+2, 1, 1, s);
  px(g, divine,x+5, y+2, 1, 1, s);
  // Chin gap
  px(g, skin,  x+3, y+3, 2, 1, s);

  // Divine aura glow on sides (cape-like columns)
  px(g, divine,x+0, y+4, 1, 9, s);
  px(g, divine,x+7, y+4, 1, 9, s);

  // Chest plate
  px(g, armor, x+1, y+4, 6, 5, s);
  px(g, armor2,x+1, y+5, 6, 1, s);
  px(g, armor2,x+1, y+8, 6, 1, s);
  // Divine star emblem (cross + corners)
  px(g, gold,  x+3, y+5, 2, 1, s);
  px(g, gold,  x+2, y+6, 4, 1, s);
  px(g, gold,  x+3, y+7, 2, 1, s);
  px(g, divine,x+3, y+6, 2, 1, s);  // glowing centre

  // Pauldrons / arms
  px(g, gold2, x+0, y+4, 1, 1, s);  // left gold shoulder cap
  px(g, gold2, x+7, y+4, 1, 1, s);  // right gold shoulder cap
  px(g, armor, x+0, y+5, 1, 3, s);
  px(g, armor, x+7, y+5, 1, 3, s);
  px(g, skin,  x+0, y+8, 1, 1, s);
  px(g, skin,  x+7, y+8, 1, 1, s);

  // Greaves (leg armour)
  px(g, armor, x+1, y+9,  2, 4, s);
  px(g, armor, x+5, y+9,  2, 4, s);
  px(g, gold2, x+1, y+10, 2, 1, s);  // gold knee cap
  px(g, gold2, x+5, y+10, 2, 1, s);
  px(g, armor2,x+1, y+12, 2, 1, s);
  px(g, armor2,x+5, y+12, 2, 1, s);

  // Boots
  px(g, boot,  x+1, y+13, 2, 2, s);
  px(g, boot,  x+5, y+13, 2, 2, s);

  // Divine shield (left, peeks from left edge)
  px(g, armor,  x-1, y+4, 2, 6, s);
  px(g, armor2, x-1, y+4, 2, 1, s);  // shield top edge
  px(g, armor2, x-1, y+9, 2, 1, s);  // shield bottom edge
  px(g, gold,   x-1, y+6, 2, 2, s);  // gold boss
  px(g, divine, x-1, y+7, 1, 1, s);  // glowing rune on boss

  // Divine longsword (right side, upright)
  px(g, divine, x+8, y+2, 1, 2, s);   // divine blade tip glow
  px(g, gold,   x+8, y+4, 2, 1, s);   // crossguard
  px(g, silver, x+8, y+5, 1, 6, s);   // blade
  px(g, divine, x+8, y+5, 1, 1, s);   // blade highlight
  px(g, gold2,  x+8, y+11, 1, 2, s);  // grip
};
// Lv5
const drawHumanDivineSmith:    DrawFn = (g, x, y, s) => drawCraftWorker(g, x, y, s, 5);
const drawHumanDivineMerchant: DrawFn = (g, x, y, s) => drawShopWorker(g, x, y, s, 5);
const drawHumanDivineWarrior:  DrawFn = (g, x, y, s) => {
  const gold   = 0xd4a017;  // divine gold
  const gold2  = 0xa07010;  // shadow gold
  const glow   = 0xffff80;  // divine aura glow
  const holy   = 0xfffff0;  // holy white
  const silver = 0xe0e0f8;  // blessed blade
  const dark   = 0x100800;  // visor dark
  const skin   = 0xf0c080;  // skin
  const boot   = 0x3a2808;  // dark boot

  // === Divine Crown (3 tall gold spikes) ===
  px(g, gold,  x+2, y+0, 1, 1, s);
  px(g, glow,  x+3, y+0, 2, 1, s);  // centre spike glows
  px(g, gold,  x+5, y+0, 1, 1, s);
  // Crown base band
  px(g, gold,  x+2, y+1, 4, 1, s);

  // === Helmet body ===
  px(g, gold,  x+1, y+1, 6, 3, s);
  px(g, gold2, x+1, y+2, 6, 1, s);   // shadow band
  px(g, dark,  x+2, y+2, 4, 1, s);   // visor slit
  // Divine glowing eyes in visor
  px(g, glow,  x+3, y+2, 1, 1, s);
  px(g, glow,  x+5, y+2, 1, 1, s);
  // Chin gap
  px(g, skin,  x+3, y+3, 2, 1, s);

  // === Holy aura columns (wings of light behind torso) ===
  px(g, glow,  x+0, y+4, 1, 9, s);
  px(g, glow,  x+7, y+4, 1, 9, s);
  px(g, holy,  x-1, y+5, 1, 7, s);   // outer halo left
  px(g, holy,  x+8, y+5, 1, 7, s);   // outer halo right

  // === Chest plate (full gold) ===
  px(g, gold,  x+1, y+4, 6, 5, s);
  px(g, gold2, x+1, y+5, 6, 1, s);   // chest shadow stripe
  px(g, gold2, x+1, y+8, 6, 1, s);   // belly plate bottom edge
  // Divine sun emblem (cross + 4 corner dots)
  px(g, glow,  x+3, y+5, 2, 1, s);   // emblem top
  px(g, glow,  x+2, y+6, 4, 1, s);   // emblem centre bar
  px(g, glow,  x+3, y+7, 2, 1, s);   // emblem bottom
  px(g, holy,  x+3, y+6, 2, 1, s);   // centre fill — pure white

  // === Pauldrons / Arms ===
  px(g, glow,  x+0, y+4, 1, 1, s);   // left gold shoulder
  px(g, glow,  x+7, y+4, 1, 1, s);   // right gold shoulder
  px(g, gold,  x+0, y+5, 1, 3, s);
  px(g, gold,  x+7, y+5, 1, 3, s);
  px(g, skin,  x+0, y+8, 1, 1, s);
  px(g, skin,  x+7, y+8, 1, 1, s);

  // === Greaves (gold leg armour) ===
  px(g, gold,  x+1, y+9,  2, 4, s);
  px(g, gold,  x+5, y+9,  2, 4, s);
  px(g, glow,  x+1, y+10, 2, 1, s);  // gold knee cap glow
  px(g, glow,  x+5, y+10, 2, 1, s);
  px(g, gold2, x+1, y+12, 2, 1, s);
  px(g, gold2, x+5, y+12, 2, 1, s);

  // === Boots ===
  px(g, boot,  x+1, y+13, 2, 2, s);
  px(g, boot,  x+5, y+13, 2, 2, s);
  // Gold boot trim
  px(g, gold2, x+1, y+13, 2, 1, s);
  px(g, gold2, x+5, y+13, 2, 1, s);

  // === Divine Greatsword (right side, upright) ===
  px(g, glow,   x+9, y+0, 1, 2, s);   // glowing tip
  px(g, holy,   x+9, y+2, 1, 2, s);   // upper blade holy
  px(g, silver, x+9, y+4, 1, 6, s);   // blade body
  px(g, glow,   x+9, y+5, 1, 1, s);   // blade rune highlight
  px(g, gold,   x+8, y+4, 2, 1, s);   // crossguard
  px(g, glow,   x+8, y+4, 1, 1, s);   // crossguard left glow
  px(g, gold2,  x+9, y+10, 1, 3, s);  // grip

  // === Sacred Shield (left side) ===
  px(g, gold,  x-1, y+4, 2, 6, s);
  px(g, glow,  x-1, y+4, 2, 1, s);   // shield top glow
  px(g, gold2, x-1, y+9, 2, 1, s);   // shield bottom edge
  px(g, holy,  x-1, y+6, 2, 2, s);   // holy boss centre
  px(g, glow,  x-1, y+7, 1, 1, s);   // boss rune glow
};

// ── 5 human egg-card draw functions (migrated from sprites.ts) ────────────────
function drawHumanMage(g: Phaser.GameObjects.Graphics,
                       x: number, y: number, s: number): void {
  const skin = 0xf0c080, skin2 = 0xd4a060;
  const robe = 0x5028b0, robe2 = 0x3010a0;
  const hat  = 0x1a1060;
  px(g, hat,    x+2, y+0, 4, 2, s);
  px(g, 0x8040f0, x+3, y+0, 2, 1, s);
  px(g, hat,    x+1, y+2, 6, 1, s);
  px(g, skin,   x+2, y+3, 4, 3, s);
  px(g, skin2,  x+3, y+5, 1, 1, s);
  px(g, 0x2020c0, x+3, y+4, 1, 1, s);
  px(g, 0x2020c0, x+5, y+4, 1, 1, s);
  px(g, robe,   x+1, y+6, 6, 7, s);
  px(g, robe2,  x+1, y+7, 6, 1, s);
  px(g, robe,   x+0, y+6, 1, 5, s);
  px(g, robe,   x+7, y+6, 1, 5, s);
  px(g, skin,   x+0, y+11, 1, 1, s);
  px(g, skin,   x+7, y+11, 1, 1, s);
  px(g, robe2,  x+1, y+13, 6, 1, s);
  px(g, robe,   x+1, y+14, 6, 1, s);
  px(g, 0x5a3010, x+8, y+6, 1, 7, s);
  px(g, 0x60c0ff, x+8, y+5, 2, 2, s);
  px(g, 0xa0e0ff, x+8, y+5, 1, 1, s);
}

function drawHumanSage(g: Phaser.GameObjects.Graphics,
                       x: number, y: number, s: number): void {
  const skin  = 0xe8b870, skin2 = 0xc09050;
  const robe  = 0xe8e0c0, robe2 = 0xc0b890;
  const beard = 0xd8d8d8;
  px(g, beard, x+2, y+1, 4, 1, s);
  px(g, beard, x+1, y+2, 1, 2, s);
  px(g, skin,  x+2, y+1, 4, 4, s);
  px(g, 0x505050, x+3, y+3, 1, 1, s);
  px(g, 0x505050, x+5, y+3, 1, 1, s);
  px(g, beard, x+2, y+4, 4, 2, s);
  px(g, skin2, x+3, y+4, 2, 1, s);
  px(g, robe,  x+1, y+5, 6, 8, s);
  px(g, robe2, x+1, y+6, 6, 1, s);
  px(g, 0xd4a017, x+1, y+5, 6, 1, s);
  px(g, robe,  x+0, y+5, 1, 5, s);
  px(g, robe,  x+7, y+5, 1, 5, s);
  px(g, skin,  x+0, y+10, 1, 1, s);
  px(g, skin,  x+7, y+10, 1, 1, s);
  px(g, 0xf0e0b0, x-1, y+8, 2, 4, s);
  px(g, 0xd4a017, x-1, y+8, 2, 1, s);
  px(g, 0xd4a017, x-1, y+11, 2, 1, s);
  px(g, robe2, x+1, y+13, 6, 1, s);
  px(g, robe,  x+1, y+14, 6, 1, s);
}

function drawHumanHero(g: Phaser.GameObjects.Graphics,
                       x: number, y: number, s: number): void {
  const armr = 0xc8c8d8, armr2 = 0x9090a8;
  const gold = 0xd4a017;
  const cape = 0xb01010;
  px(g, armr,  x+2, y+1, 4, 4, s);
  px(g, armr2, x+1, y+2, 1, 2, s);
  px(g, armr2, x+6, y+2, 1, 2, s);
  px(g, 0x60a0ff, x+3, y+3, 1, 1, s);
  px(g, 0x60a0ff, x+5, y+3, 1, 1, s);
  px(g, gold,  x+2, y+1, 4, 1, s);
  px(g, cape,  x+0, y+5, 1, 8, s);
  px(g, cape,  x+7, y+5, 1, 8, s);
  px(g, armr,  x+1, y+5, 6, 5, s);
  px(g, gold,  x+3, y+6, 2, 3, s);
  px(g, armr2, x+1, y+9, 6, 1, s);
  px(g, gold,  x+8, y+4, 2, 1, s);
  px(g, armr,  x+9, y+5, 1, 7, s);
  px(g, 0xffffff, x+9, y+5, 1, 1, s);
  px(g, 0x8a6020, x+8, y+3, 1, 2, s);
  px(g, armr,  x+1, y+10, 2, 3, s);
  px(g, armr,  x+5, y+10, 2, 3, s);
  px(g, 0x2a1808, x+1, y+13, 2, 2, s);
  px(g, 0x2a1808, x+5, y+13, 2, 2, s);
}

function drawHumanDragonborn(g: Phaser.GameObjects.Graphics,
                              x: number, y: number, s: number): void {
  const scales = 0x3a8040, scales2 = 0x206030;
  const gold   = 0xd4a017;
  const eye    = 0xff8800;
  px(g, 0x206030, x+2, y+0, 1, 2, s);
  px(g, 0x206030, x+5, y+0, 1, 2, s);
  px(g, scales,  x+2, y+1, 4, 4, s);
  px(g, scales2, x+2, y+1, 4, 1, s);
  px(g, scales2, x+2, y+3, 4, 1, s);
  px(g, eye,     x+3, y+3, 1, 1, s);
  px(g, eye,     x+5, y+3, 1, 1, s);
  px(g, scales,  x+1, y+5, 6, 5, s);
  px(g, scales2, x+1, y+5, 6, 1, s);
  px(g, scales2, x+1, y+7, 6, 1, s);
  px(g, gold,    x+3, y+6, 2, 2, s);
  px(g, scales,  x+0, y+5, 1, 3, s);
  px(g, scales,  x+7, y+5, 1, 3, s);
  px(g, 0x1a4020, x+0, y+8, 1, 1, s);
  px(g, 0x1a4020, x+7, y+8, 1, 1, s);
  px(g, 0x2a5530, x-1, y+5, 2, 5, s);
  px(g, 0x2a5530, x+7, y+5, 2, 5, s);
  px(g, scales,  x+1, y+10, 2, 4, s);
  px(g, scales,  x+5, y+10, 2, 4, s);
  px(g, 0x1a4020, x+1, y+13, 2, 2, s);
  px(g, 0x1a4020, x+5, y+13, 2, 2, s);
}

function drawHumanDemigod(g: Phaser.GameObjects.Graphics,
                          x: number, y: number, s: number): void {
  const skin = 0xfce8c0, skin2 = 0xe8c890;
  const robe = 0xf8f8f0, robe2 = 0xe0d8c0;
  const gold = 0xd4a017;
  const glow = 0xffff80;
  px(g, gold, x+2, y+0, 4, 1, s);
  px(g, gold, x+1, y+1, 1, 1, s);
  px(g, gold, x+6, y+1, 1, 1, s);
  px(g, skin,  x+2, y+1, 4, 4, s);
  px(g, skin2, x+3, y+3, 1, 1, s);
  px(g, 0xd0a040, x+3, y+3, 1, 1, s);
  px(g, 0xd0a040, x+5, y+3, 1, 1, s);
  px(g, robe,  x+1, y+5, 6, 8, s);
  px(g, gold,  x+1, y+5, 6, 1, s);
  px(g, gold,  x+1, y+8, 6, 1, s);
  px(g, robe2, x+3, y+6, 2, 2, s);
  px(g, glow,  x+0, y+5, 1, 5, s);
  px(g, glow,  x+7, y+5, 1, 5, s);
  px(g, skin,  x+0, y+10, 1, 1, s);
  px(g, skin,  x+7, y+10, 1, 1, s);
  px(g, robe2, x+1, y+13, 6, 1, s);
  px(g, robe,  x+1, y+14, 6, 1, s);
  px(g, glow,  x+1, y+13, 2, 2, s);
  px(g, glow,  x+5, y+13, 2, 2, s);
}

// ── Human card sprite registry (18 normal + 5 egg = 23 cards) ─────────────────
export const CARD_SPRITE_REGISTRY: Record<string, CardSpriteEntry> = {
  // 18 normal cards
  human_farmer:            { draw: drawHumanFarmer,           w: 32, h: 45 },
  human_peddler:           { draw: drawHumanPeddler,          w: 32, h: 45 },
  human_guard:             { draw: drawHumanGuard,            w: 32, h: 45 },
  human_blacksmith:        { draw: drawHumanBlacksmith,       w: 32, h: 45 },
  human_merchant:          { draw: drawHumanMerchant,         w: 32, h: 45 },
  human_knight:            { draw: drawHumanKnight,           w: 32, h: 45 },
  human_master_blacksmith: { draw: drawHumanMasterBlacksmith, w: 32, h: 45 },
  human_guild_master:      { draw: drawHumanGuildMaster,      w: 32, h: 45 },
  human_paladin:           { draw: drawHumanPaladin,          w: 32, h: 45 },
  human_grandmaster:       { draw: drawHumanGrandmaster,      w: 32, h: 45 },
  human_tycoon:            { draw: drawHumanTycoon,           w: 32, h: 45 },
  human_warlord:           { draw: drawHumanWarlord,          w: 32, h: 45 },
  human_legend_smith:      { draw: drawHumanLegendSmith,      w: 32, h: 45 },
  human_legend_tycoon:     { draw: drawHumanLegendTycoon,     w: 32, h: 45 },
  human_immortal:          { draw: drawHumanImmortal,         w: 32, h: 45 },
  human_divine_smith:      { draw: drawHumanDivineSmith,      w: 32, h: 45 },
  human_divine_merchant:   { draw: drawHumanDivineMerchant,   w: 32, h: 45 },
  human_divine_warrior:    { draw: drawHumanDivineWarrior,    w: 32, h: 45 },
  // 5 egg cards
  human_mage:       { draw: drawHumanMage as DrawFn,       w: 32, h: 45 },
  human_sage:       { draw: drawHumanSage as DrawFn,       w: 32, h: 45 },
  human_hero:       { draw: drawHumanHero as DrawFn,       w: 32, h: 45 },
  human_dragonborn: { draw: drawHumanDragonborn as DrawFn, w: 32, h: 45 },
  human_demigod:    { draw: drawHumanDemigod as DrawFn,    w: 32, h: 45 },
};
