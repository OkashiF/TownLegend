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

// SpawnZone 不再由玩家选择，改为按上场顺序自动分配
// 保留枚举供内部使用
export enum SpawnZone {
  Left0  = 'left0',   // 左近位 x≈700
  Left1  = 'left1',   // 左中位 x≈450
  Left2  = 'left2',   // 左远位 x≈200
  Right0 = 'right0',  // 右近位 x≈2300（场上第4只）
  Right1 = 'right1',  // 右中位 x≈2550
  Right2 = 'right2',  // 右远位 x≈3400
}

// ─── Item system ──────────────────────────────────────────────────────────────

/** A raw material dropped by a monster */
export interface LootDef {
  id: string;
  name: string;
  emoji: string;
  value: number;
}

/** A crafted product made from loot */
export interface ProductDef {
  id: string;
  name: string;
  emoji: string;
  sellPrice: number;
}

export interface Recipe {
  id: string;
  inputs: Array<{ lootId: string; qty: number }>;
  outputProductId: string;
  outputQty: number;
  craftCost: number;
}

/** Runtime stack of items in inventory */
export interface ItemStack {
  itemId: string;
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
  lootId: string;
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
  /** 升级目标卡牌ID（3张合1张更高级卡）*/
  upgradeTargetId?: string;
}

export interface CardInstance {
  instanceId: string;
  definitionId: string;
  level: number;
  upgrades: number;
  isOnField: boolean;
  isActive: boolean;
  jobAssignment?: JobType;
  spawnZone?: SpawnZone;    // 自动分配，不由玩家选择
  strikeMonthsLeft: number;
  restMonthsLeft: number;
  aggressionCountdown: number;
  runtimeStats: HumanStats | MonsterStats | BuildingStats | MagicStats;
  /** 怪物是否正在攻城（aggressionCountdown=0 且 isActive） */
  isAttacking?: boolean;
  /** 怪物休息进度（0~restMonthsLeft，用于巢穴动画） */
  restProgress?: number;
}

// ─── Achievement types ────────────────────────────────────────────────────────

export interface AchievementRecord {
  id: string;
  unlockedAt: number | null;  // month number when unlocked, or null if locked
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
  achievements?: AchievementRecord[];
  totalCardsBought?: number;
  totalUpgradesDone?: number;
  totalMonstersDefeated?: number;
  wildcardEverTriggered?: boolean;
}
