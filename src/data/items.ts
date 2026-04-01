import { LootDef, ProductDef, Recipe } from '../types';

// ── Loot definitions ──────────────────────────────────────────────────────────
export const LOOT_DB: LootDef[] = [
  { id: 'loot_rat_hide',    name: '鼠皮',   emoji: '🐭', value: 3  },
  { id: 'loot_wolf_fang',   name: '狼牙',   emoji: '🦷', value: 8  },
  { id: 'loot_troll_gem',   name: '魔晶',   emoji: '💎', value: 12 },
  { id: 'loot_harpy_feather',name: '妖羽',  emoji: '🪶', value: 21  },
  { id: 'loot_dragon_scale', name: '龙鳞',  emoji: '🐉', value: 44 },
];

// ── Product definitions ───────────────────────────────────────────────────────
export const PRODUCT_DB: ProductDef[] = [
  { id: 'prod_leather',     name: '皮革',   emoji: '🧤', sellPrice: 15  },
  { id: 'prod_weapon',      name: '武器',   emoji: '⚔️', sellPrice: 25 },
  { id: 'prod_magic_stone', name: '魔法石', emoji: '🔮', sellPrice: 38 },
  { id: 'prod_plume_cloak', name: '羽毛斗篷',emoji: '🧣', sellPrice: 62 },
  { id: 'prod_dragon_armor',name: '龙甲',   emoji: '🛡️', sellPrice: 120 },
];

// ── Recipes ───────────────────────────────────────────────────────────────────
// Structured for future multi-input: inputs is an array even when length=1
export const RECIPE_DB: Recipe[] = [
  {
    id: 'recipe_leather',
    inputs: [{ lootId: 'loot_rat_hide',     qty: 3 }],
    outputProductId: 'prod_leather',
    outputQty: 1,
    craftCost: 8,   // diligence points needed per batch
  },
  {
    id: 'recipe_weapon',
    inputs: [{ lootId: 'loot_wolf_fang',    qty: 2 }],
    outputProductId: 'prod_weapon',
    outputQty: 1,
    craftCost: 12,
  },
  {
    id: 'recipe_magic_stone',
    inputs: [{ lootId: 'loot_troll_gem',    qty: 1 }],
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
    inputs: [{ lootId: 'loot_dragon_scale',  qty: 2 }],
    outputProductId: 'prod_dragon_armor',
    outputQty: 1,
    craftCost: 20,
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

/** Find a recipe that consumes the given lootId as its primary input */
export function recipeForLoot(lootId: string): Recipe | undefined {
  return RECIPE_DB.find(r => r.inputs.some(i => i.lootId === lootId));
}
