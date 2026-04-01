// ─── Enums ────────────────────────────────────────────────────────────────────

export enum CardType {
  Human    = 'human',
  Monster  = 'monster',
  Building = 'building',
  Magic    = 'magic',
}

export enum JobType {
  Shop   = 'shop',
  Craft  = 'craft',
  Combat = 'combat',
  Idle   = 'idle',
}

export enum SpawnZone {
  North = 'north',
  East  = 'east',
  South = 'south',
}

// ─── Item system ──────────────────────────────────────────────────────────────

/** A raw material dropped by a monster */
export interface LootDef {
  id: string;       // e.g. 'loot_rat_hide'
  name: string;     // e.g. '鼠皮'
  emoji: string;
  value: number;    // base sell value if sold directly (future use)
}

/** A crafted product made from loot */
export interface ProductDef {
  id: string;       // e.g. 'prod_leather'
  name: string;     // e.g. '皮革'
  emoji: string;
  sellPrice: number; // gold per unit when sold to passersby
}

/**
 * A crafting recipe: one or more input stacks → one output stack.
 * Currently 1-to-1 but structured for future multi-input support.
 */
export interface Recipe {
  id: string;
  inputs: Array<{ lootId: string; qty: number }>;
  outputProductId: string;
  outputQty: number;
  craftCost: number; // diligence points required per batch
}

/** Runtime stack of items in inventory */
export interface ItemStack {
  itemId: string;   // lootDef.id or productDef.id
  kind: 'loot' | 'product';
  qty: number;
}

// ─── Card stat shapes ─────────────────────────────────────────────────────────

export interface CardStats {
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
}

export interface HumanStats extends CardStats {
  intellect: number;
  strength: number;
  diligence: number;
}

export interface MonsterStats extends CardStats {
  rarity: number;
  aggression: number;
  strength: number;
  lootId: string;      // which LootDef it drops
  lootQtyMin: number;
  lootQtyMax: number;
}

export interface BuildingStats {
  capacity: number;
  bonus: number;
}

export interface MagicStats {
  effect: string;
  power: number;
}

// ─── Card definition & instance ───────────────────────────────────────────────

export interface CardDefinition {
  id: string;
  name: string;
  type: CardType;
  level: number;
  cost: number;
  upkeep: number;
  emoji: string;
  description: string;
  stats: HumanStats | MonsterStats | BuildingStats | MagicStats;
}

export interface CardInstance {
  instanceId: string;
  definitionId: string;
  level: number;
  upgrades: number;
  isOnField: boolean;
  isActive: boolean;
  jobAssignment?: JobType;
  spawnZone?: SpawnZone;
  strikeMonthsLeft: number;
  restMonthsLeft: number;
  aggressionCountdown: number;
  runtimeStats: HumanStats | MonsterStats | BuildingStats | MagicStats;
}

// ─── Saveable snapshot ────────────────────────────────────────────────────────

export interface SaveSnapshot {
  version: number;
  gold: number;
  townLevel: number;
  tick: number;
  week: number;
  month: number;
  hand: CardInstance[];
  field: CardInstance[];
  discarded: CardInstance[];
  shopSlots: Array<{ defId: string; sold: boolean }>;
  inventory: ItemStack[];
  log: import('./systems/store').LogEntry[];
}
