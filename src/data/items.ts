import { LootDef, ProductDef, Recipe } from '../types';

// ── Loot definitions ──────────────────────────────────────────────────────────

export const LOOT_DB: LootDef[] = [
  // 野兽系
  { id: 'loot_rat_hide',       name: '鼠皮',     emoji: '🐭', value: 3  },
  { id: 'loot_wolf_fang',      name: '狼牙',     emoji: '🦷', value: 8  },
  { id: 'loot_troll_gem',      name: '魔晶',     emoji: '💎', value: 12 },
  { id: 'loot_harpy_feather',  name: '妖羽',     emoji: '🪶', value: 21 },
  { id: 'loot_dragon_scale',   name: '龙鳞',     emoji: '🐉', value: 44 },
  { id: 'loot_ancient_scale',  name: '远古龙鳞', emoji: '🔥', value: 90 },
  { id: 'loot_dragon_orb',     name: '龙王宝珠', emoji: '🔮', value: 200 },
  { id: 'loot_genesis_crystal',name: '创世龙晶', emoji: '🌋', value: 500 },

  // 亡灵系
  { id: 'loot_bone',           name: '白骨',     emoji: '🦴', value: 3  },
  { id: 'loot_slime_core',     name: '史莱姆核', emoji: '🫧', value: 5  },
  { id: 'loot_cursed_bone',    name: '诅咒骨',   emoji: '💀', value: 15 },
  { id: 'loot_magic_gel',      name: '魔法凝胶', emoji: '🧪', value: 18 },
  { id: 'loot_dark_gem',       name: '黑魔晶',   emoji: '⬛', value: 40 },
  { id: 'loot_void_essence',   name: '虚空精华', emoji: '🌑', value: 100 },
  { id: 'loot_void_heart',     name: '虚空之心', emoji: '🖤', value: 250 },
  { id: 'loot_end_shard',      name: '终焉碎片', emoji: '🕳️', value: 600 },

  // 彩蛋怪物战利品（稀有混合材料）
  { id: 'loot_mutant_tissue',      name: '变异组织',   emoji: '🧬', value: 30  },
  { id: 'loot_chaos_crystal',      name: '混沌晶核',   emoji: '🌀', value: 80  },
  { id: 'loot_abyss_essence',      name: '深渊精髓',   emoji: '🕸️', value: 180 },
  { id: 'loot_primordial_essence', name: '原初精华',   emoji: '⭐', value: 400 },
  { id: 'loot_world_shard',        name: '世界碎片',   emoji: '💥', value: 1000 },
];

// ── Product definitions ───────────────────────────────────────────────────────
// 分三个层次：
//   初级成品（Lv1-2怪物战利品产出，售价50~150）
//   中级成品（Lv2-3怪物战利品产出，售价200~500）
//   高级成品（Lv4-5怪物战利品，或多材料合成，售价800~2000）

export const PRODUCT_DB: ProductDef[] = [
  // ── 初级成品（野兽系）────────────────────────────────────────────────
  { id: 'prod_leather',        name: '皮革',       emoji: '🧤', sellPrice: 15  },
  { id: 'prod_weapon',         name: '武器',       emoji: '⚔️', sellPrice: 30  },
  { id: 'prod_magic_stone',    name: '魔法石',     emoji: '🪨', sellPrice: 55  },
  { id: 'prod_plume_cloak',    name: '羽毛斗篷',   emoji: '🧣', sellPrice: 90  },
  { id: 'prod_dragon_armor',   name: '龙甲',       emoji: '🛡️', sellPrice: 160 },

  // ── 初级成品（亡灵系）────────────────────────────────────────────────
  { id: 'prod_bone_powder',    name: '骨粉',       emoji: '⬜', sellPrice: 12  },
  { id: 'prod_slime_potion',   name: '史莱姆药水', emoji: '🍶', sellPrice: 20  },
  { id: 'prod_cursed_staff',   name: '诅咒法杖',   emoji: '🪄', sellPrice: 60  },
  { id: 'prod_magic_armor',    name: '魔法铠甲',   emoji: '🦺', sellPrice: 80  },
  { id: 'prod_lich_crown',     name: '巫妖王冠',   emoji: '👑', sellPrice: 180 },

  // ── 中级成品（Lv3怪物战利品）────────────────────────────────────────
  { id: 'prod_ancient_mail',   name: '远古锁甲',   emoji: '⛓️', sellPrice: 320 },
  { id: 'prod_void_crystal',   name: '虚空晶体',   emoji: '💜', sellPrice: 380 },

  // ── 高级成品（Lv4-5怪物战利品）──────────────────────────────────────
  { id: 'prod_dragon_orb_gem', name: '龙王宝石',   emoji: '💠', sellPrice: 800  },
  { id: 'prod_void_blade',     name: '虚空之刃',   emoji: '🗡️', sellPrice: 900  },

  // ── 终极成品（彩蛋材料 / Lv5战利品）─────────────────────────────────
  { id: 'prod_genesis_relic',  name: '创世圣物',   emoji: '🌟', sellPrice: 2000 },
  { id: 'prod_end_artifact',   name: '终焉神器',   emoji: '🔱', sellPrice: 2500 },

  // ── 彩蛋材料成品────────────────────────────────────────────────────
  { id: 'prod_mutant_extract', name: '变异提取物', emoji: '🧫', sellPrice: 100  },
  { id: 'prod_chaos_core',     name: '混沌核心',   emoji: '🌀', sellPrice: 300  },
  { id: 'prod_abyss_gem',      name: '深渊宝石',   emoji: '🔲', sellPrice: 700  },
  { id: 'prod_primordial_gem', name: '原初宝石',   emoji: '💎', sellPrice: 1500 },
  { id: 'prod_world_gem',      name: '世界宝石',   emoji: '🌍', sellPrice: 3000 },
];

// ── Recipes ───────────────────────────────────────────────────────────────────
// craftCost 单位：勤劳点。
// 数值原则：craftCost ≈ (输出售价 / 基础制造速率) 使制造岗位始终有价值。
// 基础制造速率约为铁匠(diligence=12) / TICKS_PER_WEEK(40) ≈ 0.3 点/tick
// 约每 TICKS_PER_WEEK(40) tick产出 12 勤劳点，即每月 48 勤劳点

export const RECIPE_DB: Recipe[] = [
  // ── 野兽系初级配方（适合1-2级城镇）─────────────────────────────────
  {
    id: 'recipe_leather',
    inputs: [{ lootId: 'loot_rat_hide', qty: 3 }],
    outputProductId: 'prod_leather',
    outputQty: 1,
    craftCost: 8,
  },
  {
    id: 'recipe_weapon',
    inputs: [{ lootId: 'loot_wolf_fang', qty: 2 }],
    outputProductId: 'prod_weapon',
    outputQty: 1,
    craftCost: 12,
  },
  {
    id: 'recipe_magic_stone',
    inputs: [{ lootId: 'loot_troll_gem', qty: 1 }],
    outputProductId: 'prod_magic_stone',
    outputQty: 1,
    craftCost: 10,
  },
  {
    id: 'recipe_plume_cloak',
    inputs: [{ lootId: 'loot_harpy_feather', qty: 4 }],
    outputProductId: 'prod_plume_cloak',
    outputQty: 1,
    craftCost: 14,
  },
  {
    id: 'recipe_dragon_armor',
    inputs: [{ lootId: 'loot_dragon_scale', qty: 2 }],
    outputProductId: 'prod_dragon_armor',
    outputQty: 1,
    craftCost: 20,
  },

  // ── 亡灵系初级配方（适合1-2级城镇）─────────────────────────────────
  {
    id: 'recipe_bone_powder',
    inputs: [{ lootId: 'loot_bone', qty: 4 }],
    outputProductId: 'prod_bone_powder',
    outputQty: 1,
    craftCost: 6,
  },
  {
    id: 'recipe_slime_potion',
    inputs: [{ lootId: 'loot_slime_core', qty: 3 }],
    outputProductId: 'prod_slime_potion',
    outputQty: 1,
    craftCost: 8,
  },
  {
    id: 'recipe_cursed_staff',
    inputs: [{ lootId: 'loot_cursed_bone', qty: 2 }],
    outputProductId: 'prod_cursed_staff',
    outputQty: 1,
    craftCost: 16,
  },
  {
    id: 'recipe_magic_armor',
    inputs: [{ lootId: 'loot_magic_gel', qty: 2 }],
    outputProductId: 'prod_magic_armor',
    outputQty: 1,
    craftCost: 18,
  },
  {
    id: 'recipe_lich_crown',
    inputs: [{ lootId: 'loot_dark_gem', qty: 1 }],
    outputProductId: 'prod_lich_crown',
    outputQty: 1,
    craftCost: 22,
  },

  // ── 中级配方（适合3-4级城镇）────────────────────────────────────────
  {
    id: 'recipe_ancient_mail',
    inputs: [{ lootId: 'loot_ancient_scale', qty: 2 }],
    outputProductId: 'prod_ancient_mail',
    outputQty: 1,
    craftCost: 35,
  },
  {
    id: 'recipe_void_crystal',
    inputs: [{ lootId: 'loot_void_essence', qty: 1 }],
    outputProductId: 'prod_void_crystal',
    outputQty: 1,
    craftCost: 30,
  },

  // ── 高级配方（适合4-5级城镇）────────────────────────────────────────
  {
    id: 'recipe_dragon_orb_gem',
    inputs: [{ lootId: 'loot_dragon_orb', qty: 1 }],
    outputProductId: 'prod_dragon_orb_gem',
    outputQty: 1,
    craftCost: 50,
  },
  {
    id: 'recipe_void_blade',
    inputs: [{ lootId: 'loot_void_heart', qty: 1 }],
    outputProductId: 'prod_void_blade',
    outputQty: 1,
    craftCost: 55,
  },

  // ── 终极配方（适合5-6级城镇）────────────────────────────────────────
  {
    id: 'recipe_genesis_relic',
    inputs: [{ lootId: 'loot_genesis_crystal', qty: 1 }],
    outputProductId: 'prod_genesis_relic',
    outputQty: 1,
    craftCost: 80,
  },
  {
    id: 'recipe_end_artifact',
    inputs: [{ lootId: 'loot_end_shard', qty: 1 }],
    outputProductId: 'prod_end_artifact',
    outputQty: 1,
    craftCost: 90,
  },

  // ── 彩蛋材料配方 ─────────────────────────────────────────────────────
  {
    id: 'recipe_mutant_extract',
    inputs: [{ lootId: 'loot_mutant_tissue', qty: 2 }],
    outputProductId: 'prod_mutant_extract',
    outputQty: 1,
    craftCost: 20,
  },
  {
    id: 'recipe_chaos_core',
    inputs: [{ lootId: 'loot_chaos_crystal', qty: 1 }],
    outputProductId: 'prod_chaos_core',
    outputQty: 1,
    craftCost: 30,
  },
  {
    id: 'recipe_abyss_gem',
    inputs: [{ lootId: 'loot_abyss_essence', qty: 1 }],
    outputProductId: 'prod_abyss_gem',
    outputQty: 1,
    craftCost: 50,
  },
  {
    id: 'recipe_primordial_gem',
    inputs: [{ lootId: 'loot_primordial_essence', qty: 1 }],
    outputProductId: 'prod_primordial_gem',
    outputQty: 1,
    craftCost: 70,
  },
  {
    id: 'recipe_world_gem',
    inputs: [{ lootId: 'loot_world_shard', qty: 1 }],
    outputProductId: 'prod_world_gem',
    outputQty: 1,
    craftCost: 100,
  },
];

// ── Lookup helpers ────────────────────────────────────────────────────────────

export function lootById(id: string): LootDef {
  const d = LOOT_DB.find(l => l.id === id);
  if (!d) throw new Error(`Unknown loot: ${id}`);
  return d;
}

export function productById(id: string): ProductDef {
  const d = PRODUCT_DB.find(p => p.id === id);
  if (!d) throw new Error(`Unknown product: ${id}`);
  return d;
}

export function recipeForLoot(lootId: string): Recipe | undefined {
  return RECIPE_DB.find(r => r.inputs.some(i => i.lootId === lootId));
}
