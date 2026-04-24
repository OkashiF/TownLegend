import {
  CardInstance, CardDefinition, CardType, JobType, SpawnZone,
  HumanStats, MonsterStats, MagicStats, BuildingStats, ItemStack, SaveSnapshot, LootDef,
  AchievementRecord,
} from '../types';
import { CARD_DB, drawShopCards, LEVEL_COST, shopSize, shopRefreshCost, HUMAN_WILDCARD_BY_LEVEL, MONSTER_WILDCARD_BY_LEVEL, WILDCARD_CHANCE } from '../data/cards';
import { LOOT_DB, PRODUCT_DB, RECIPE_DB, lootById, productById } from '../data/items';

// ─── Achievement definitions ───────────────────────────────────────────────────

export interface AchievementDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

export const ACHIEVEMENT_DB: AchievementDef[] = [
  { id: 'first_town',              name: '建镇之始', emoji: '🏰', description: '创建你的第一个城镇。' },
  { id: 'first_monster_defeated',  name: '初战告捷', emoji: '⚔️', description: '首次击败一只怪物。' },
  { id: 'buy_10_cards',            name: '购物达人', emoji: '🛒', description: '累计购买10张卡牌。' },
  { id: 'first_upgrade',           name: '合成师',   emoji: '⬆️', description: '首次将3张卡牌合成升级。' },
  { id: 'wildcard_upgrade',        name: '幸运降临', emoji: '✨', description: '触发彩蛋升级，获得传说卡牌。' },
  { id: 'gold_500',                name: '富甲一方', emoji: '💰', description: '同时拥有500枚金币。' },
  { id: 'town_level_3',            name: '城镇繁荣', emoji: '🎉', description: '城镇升至3级。' },
  { id: 'survive_12_months',       name: '岁月悠长', emoji: '📅', description: '游戏进行满1年（12个月）。' },
];

let _idCounter = 0;
export function newId(): string { return `card_${++_idCounter}`; }

export function defById(id: string): CardDefinition {
  const d = CARD_DB.find(c => c.id === id);
  if (!d) {
    console.warn(`[defById] Unknown card id: "${id}" — returning sentinel`);
    return {
      id, name: '???', type: 'human' as any, level: 0,
      cost: 0, upkeep: 0, emoji: '❓', description: '',
      stats: { hp:1, maxHp:1, atk:0, def:0, intellect:0, strength:0, diligence:0 } as any,
    };
  }
  return d;
}

function cloneStats(s: object): any { return JSON.parse(JSON.stringify(s)); }

export function instantiate(def: CardDefinition): CardInstance {
  return {
    instanceId: newId(),
    definitionId: def.id,
    level: def.level,
    upgrades: 0,
    isOnField: false,
    isActive: true,
    strikeMonthsLeft: 0,
    restMonthsLeft: 0,
    aggressionCountdown: 'aggression' in def.stats
      ? (def.stats as MonsterStats).aggression : 0,
    runtimeStats: cloneStats(def.stats),
    isAttacking: false,
    restProgress: 0,
  };
}

export const MONSTER_SPAWN_POSITIONS: Record<SpawnZone, number> = {
  [SpawnZone.Left0]:  700,
  [SpawnZone.Left1]:  450,
  [SpawnZone.Left2]:  200,
  [SpawnZone.Right0]: 2900,
  [SpawnZone.Right1]: 3100,
  [SpawnZone.Right2]: 3400,
};

const SPAWN_ZONE_ORDER: SpawnZone[] = [
  SpawnZone.Left0, SpawnZone.Left1, SpawnZone.Left2,
  SpawnZone.Right0, SpawnZone.Right1, SpawnZone.Right2,
];

export function assignSpawnZone(monsterCount: number): SpawnZone {
  return SPAWN_ZONE_ORDER[monsterCount % SPAWN_ZONE_ORDER.length];
}

export const TICKS_PER_WEEK  = 40;
export const WEEKS_PER_MONTH = 4;
export const TICKS_PER_MONTH = TICKS_PER_WEEK * WEEKS_PER_MONTH;
const SAVE_KEY     = 'town_legend_save';
// ── 版本号升至 6：新增成就系统（achievements 字段） ──
const SAVE_VERSION = 6;

export function fieldCap(level: number): number { return 5 + (level - 1) * 2; }
export { shopRefreshCost };

/**
 * 升级进度计算（方案C）：
 * Lv0 卡贡献 0 单位（不计入升级进度）
 * Lv1 卡贡献 1 单位
 * Lv2 卡贡献 3 单位（= 3张Lv1）
 * Lv3 卡贡献 9 单位（= 3张Lv2 = 9张Lv1）
 * ... Lv N 贡献 3^(N-1) 单位
 *
 * 城镇 x 级升级阈值 = 10 × 3^(x-1) 单位（以Lv1为基准）
 * 即：1→2级 需要10单位（10张Lv1卡，或等价组合）
 *     2→3级 需要30单位（对标10张Lv2卡）
 *     3→4级 需要90单位（对标10张Lv3卡）
 */
function computeCardRawValue(cards: CardInstance[]): number {
  return cards.reduce((sum, c) => {
    const def = CARD_DB.find(d => d.id === c.definitionId);
    const lv = def?.level ?? 0;
    if (lv === 0) return sum; // Lv0 不贡献升级进度
    return sum + Math.pow(3, lv - 1); // Lv1=1, Lv2=3, Lv3=9, Lv4=27, Lv5=81
  }, 0);
}

/** 城镇等级上限 */
export const MAX_TOWN_LEVEL = 6;

/** 升级阈值 = 10 × 3^(townLevel-1)（以Lv1单位计）
 *  1级→2级: 10, 2级→3级: 30, 3级→4级: 90, 4级→5级: 270, 5级→6级: 810 */
function getLevelThreshold(townLevel: number): number {
  return 10 * Math.pow(3, townLevel - 1);
}

export function monthlyTax(level: number): number {
  return (LEVEL_COST[level] ?? LEVEL_COST[0]) * 0.5;
}

export interface LogEntry {
  id: number;
  month: number;
  week: number;
  text: string;
  kind: 'info' | 'good' | 'bad';
}

export interface ShopSlot {
  def: CardDefinition;
  sold: boolean;
}

// ── 年度总结数据结构 ─────────────────────────────────────────────────────────
export interface YearSummary {
  year: number;
  cardsBought: number;
  upgradesDone: number;
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
}

type Listener = (event?: string) => void;
let _logId = 0;

export class GameStore {
  private listeners: Set<Listener> = new Set();

  gold      = 120;
  townLevel = 1;
  hand:      CardInstance[] = [];
  field:     CardInstance[] = [];
  discarded: CardInstance[] = [];

  tick  = 0;
  week  = 1;
  month = 1;

  shopSlots: ShopSlot[] = [];
  log: LogEntry[] = [];
  inventory: ItemStack[] = [];

  // ── 成就系统 ──────────────────────────────────────────────────────────────────
  achievements: AchievementRecord[] = ACHIEVEMENT_DB.map(def => ({ id: def.id, unlockedAt: null }));
  // 最近解锁的成就（供TownScene消费一次）
  private _pendingAchievement: AchievementDef | null = null;

  takePendingAchievement(): AchievementDef | null {
    const a = this._pendingAchievement;
    this._pendingAchievement = null;
    return a;
  }

  unlockAchievement(id: string): void {
    const rec = this.achievements.find(a => a.id === id);
    if (!rec || rec.unlockedAt !== null) return;
    rec.unlockedAt = this.month;
    const def = ACHIEVEMENT_DB.find(d => d.id === id);
    if (def) {
      this.addLog(`🏆 成就解锁：${def.emoji} ${def.name}`, 'good');
      this._pendingAchievement = def;
    }
    this.emit('achievement');
  }

  checkAchievements(): void {
    // 建镇之始（游戏启动时由constructor解锁）

    // 首次击败怪物
    if (this._totalMonstersDefeated > 0) {
      this.unlockAchievement('first_monster_defeated');
    }

    // 购物达人：累计购买10张卡牌
    if (this._totalCardsBought >= 10) {
      this.unlockAchievement('buy_10_cards');
    }

    // 合成师：首次升级
    if (this._totalUpgradesDone >= 1) {
      this.unlockAchievement('first_upgrade');
    }

    // 幸运降临：首次彩蛋
    if (this._wildcardEverTriggered) {
      this.unlockAchievement('wildcard_upgrade');
    }

    // 富甲一方：持有>=500金币
    if (this.gold >= 500) {
      this.unlockAchievement('gold_500');
    }

    // 城镇繁荣：城镇>=3级
    if (this.townLevel >= 3) {
      this.unlockAchievement('town_level_3');
    }

    // 岁月悠长：进行满12个月
    if (this.month >= 12) {
      this.unlockAchievement('survive_12_months');
    }
  }

  // ── 月度统计（每月初清零）──────────────────────────────────────────────────
  private monthStats = {
    taxIncome: 0,
    shopIncome: 0,
    upkeepCost: 0,
    monstersDefeated: 0,
    productsCrafted: 0,
    wildcardTriggered: false,
    siegeOccurred: false,
    leveledUp: false,
    newLevel: 1,
  };

  // ── 年度总结（供UI读取）──────────────────────────────────────────────────
  lastYearSummary: YearSummary | null = null;

  // ── 年度统计（每年清零）──────────────────────────────────────────────────
  private yearStats = {
    cardsBought:   0,
    upgradesDone:  0,
    totalIncome:   0,
    totalExpenses: 0,
  };

  private siegeMonthsCount = 0;
  private _lastSiegeState = false;
  private craftPoints = 0;
  private _lastCraftedEmoji: string | null = null;

  // ── 成就用累计计数（永不清零）────────────────────────────────────────────────
  private _totalCardsBought    = 0;
  private _totalUpgradesDone   = 0;
  private _totalMonstersDefeated = 0;
  private _wildcardEverTriggered = false;

  takeCraftedEmoji(): string | null {
    const e = this._lastCraftedEmoji;
    this._lastCraftedEmoji = null;
    return e;
  }

  // ── 制造进度信息 ─────────────────────────────────────────────────────────────
  getCraftProgressInfo(): { points: number; maxPoints: number } {
    for (const recipe of RECIPE_DB) {
      const hasMats = recipe.inputs.every(inp =>
        this.countItem(inp.lootId, 'loot') >= inp.qty
      );
      if (hasMats) {
        return {
          points:    Math.min(this.craftPoints, recipe.craftCost),
          maxPoints: recipe.craftCost,
        };
      }
    }
    return { points: 0, maxPoints: 0 };
  }

  // ── 攻城状态 ──────────────────────────────────────────────────────────────────
  get isUnderSiege(): boolean {
    const hasReadyMonster = this.field.some(c => {
      if (!c.definitionId) return false;
      const def = defById(c.definitionId);
      return def.type === CardType.Monster && c.isActive && c.aggressionCountdown === 0;
    });
    return hasReadyMonster && !this.hasActiveCombatWorkers;
  }

  get hasActiveCombatWorkers(): boolean {
    return this.field.some(c => {
      if (!c.definitionId) return false;
      const def = defById(c.definitionId);
      return def.type === CardType.Human && c.jobAssignment === JobType.Combat && c.isActive;
    });
  }

  checkSiegeTransition(): void {
    const currentSiege = this.isUnderSiege;
    if (currentSiege && !this._lastSiegeState) {
      this.addLog('⚔️ 无人守卫！怪物开始向城镇进军！', 'bad');
    }
    this._lastSiegeState = currentSiege;
  }

  get hasActiveMonsters(): boolean {
    return this.field.some(c => {
      if (!c.definitionId) return false;
      return defById(c.definitionId).type === CardType.Monster && c.isActive;
    });
  }

  // ── Building helpers ──────────────────────────────────────────────────────────
  getBuildingCapacity(defId: string): number {
    return this.field
      .filter(c => c.definitionId === defId && c.isActive)
      .reduce((s, c) => s + (c.runtimeStats as BuildingStats).capacity, 0);
  }

  private getBuildingExtraRate(defId: string): number {
    return this.field
      .filter(c => c.definitionId === defId && c.isActive)
      .reduce((s, c) => s + ((c.runtimeStats as BuildingStats).bonus - 1), 0);
  }

  /** 获取所有激活建筑中最高的 bonus（用于互斥效果，如大市集 vs 小摊位不叠加） */
  private getBuildingMaxBonus(defId: string): number {
    const cards = this.field.filter(c => c.definitionId === defId && c.isActive);
    if (cards.length === 0) return 0;
    return Math.max(...cards.map(c => (c.runtimeStats as BuildingStats).bonus));
  }

  // ── 商店售价乘数（小摊位/大市集/贸易中心/世界市场 叠加）───────────────────
  getStallSaleBonus(): number {
    // 各类型最高bonus取一个，多张同类叠加
    // 设计：同类建筑的bonus是可叠加的（多张小摊位 → 1.3+0.3+...）
    return 1
      + this.getBuildingExtraRate('building_stall')          // Lv2 小摊位 ×1.3
      + this.getBuildingExtraRate('building_market')         // Lv3 大市集 ×1.8
      + this.getBuildingExtraRate('building_trading_post')   // Lv4 贸易中心 ×2.5
      + this.getBuildingExtraRate('building_world_market');  // Lv5 世界市场 ×4
  }

  // ── 制造速率加成（工坊/大锻造炉/炼金工坊/神圣锻造台 取最高一个，不叠加）──
  // 设计：同一区域只放一个主制造建筑，取最大值
  getCraftSpeedBonus(): number {
    const workshop     = this.getBuildingExtraRate('building_workshop');       // +0.4
    const forge        = this.getBuildingExtraRate('building_forge');          // +1.5
    const alchemyLab   = this.getBuildingExtraRate('building_alchemy_lab');    // +3.0
    const divineForge  = this.getBuildingExtraRate('building_divine_forge');   // +7.0
    return 1 + workshop + forge + alchemyLab + divineForge;
  }

  // ── 行人数加成（旅馆类建筑，capacity字段直接代表额外行人）─────────────────
  getInnPasserbyBonus(): number {
    return this.getBuildingCapacity('building_inn')          // +3
      + this.getBuildingCapacity('building_grand_inn')       // +8
      + this.getBuildingCapacity('building_palace')          // +15（宫殿行人用capacity=15）
      + this.getBuildingCapacity('building_divine_palace');  // +30
  }

  // ── 兵营ATK加成 ────────────────────────────────────────────────────────────
  getBarracksAtkBonus(): number {
    return this.getBuildingCapacity('building_barracks')      // +4
      + this.getBuildingCapacity('building_fortress')         // +10
      + this.getBuildingCapacity('building_citadel')          // +20
      + this.getBuildingCapacity('building_eternal_citadel'); // +40
  }

  // ── 兵营DEF加成（城塞专属）──────────────────────────────────────────────
  getBarracksDefBonus(): number {
    // 城塞 building_citadel 的 DEF+10 效果
    // capacity 字段存的是ATK值，这里用独立计算
    const citadels = this.field.filter(c => c.definitionId === 'building_citadel' && c.isActive);
    return citadels.length * 10;
  }

  // ── 宫殿税收加成（神圣宫殿 税收×2）────────────────────────────────────
  getPalaceTaxMultiplier(): number {
    const divinePalaces = this.field.filter(
      c => c.definitionId === 'building_divine_palace' && c.isActive
    ).length;
    return divinePalaces > 0 ? 2 : 1;
  }

  // ── 旧接口兼容 ────────────────────────────────────────────────────────────
  getWorkshopCraftBonus(): number { return this.getCraftSpeedBonus(); }

  constructor() {
    this.refreshShopFull();
    this.addLog('🏰 城镇建立！欢迎来到镇主传说。', 'good');
    this.unlockAchievement('first_town');
  }

  subscribe(fn: Listener)   { this.listeners.add(fn); }
  unsubscribe(fn: Listener) { this.listeners.delete(fn); }
  emit(event?: string) { this.listeners.forEach(fn => fn(event)); }

  get fieldCapacity() { return fieldCap(this.townLevel); }

  /** 当前升级进度（Lv1单位，Lv0不计入） */
  get levelProgress(): number {
    return computeCardRawValue([...this.hand, ...this.field]);
  }
  /** 升级阈值 */
  get levelThreshold(): number { return getLevelThreshold(this.townLevel); }
  /** 是否已达等级上限 */
  get levelMaxed(): boolean { return this.townLevel >= MAX_TOWN_LEVEL; }

  getLootDef(lootId: string): LootDef | undefined {
    return LOOT_DB.find(l => l.id === lootId);
  }

  // ── Inventory ─────────────────────────────────────────────────────────────────
  addItem(itemId: string, kind: ItemStack['kind'], qty: number) {
    const existing = this.inventory.find(s => s.itemId === itemId && s.kind === kind);
    if (existing) { existing.qty += qty; }
    else { this.inventory.push({ itemId, kind, qty }); }
  }

  removeItem(itemId: string, kind: ItemStack['kind'], qty: number): boolean {
    const stack = this.inventory.find(s => s.itemId === itemId && s.kind === kind);
    if (!stack || stack.qty < qty) return false;
    stack.qty -= qty;
    if (stack.qty === 0) {
      this.inventory = this.inventory.filter(s => !(s.itemId === itemId && s.kind === kind));
    }
    return true;
  }

  countItem(itemId: string, kind: ItemStack['kind']): number {
    return this.inventory.find(s => s.itemId === itemId && s.kind === kind)?.qty ?? 0;
  }

  get totalProducts(): number {
    return this.inventory.filter(s => s.kind === 'product').reduce((sum, s) => sum + s.qty, 0);
  }

  // ── Shop ──────────────────────────────────────────────────────────────────────
  refreshShopFull() {
    const size = shopSize(this.townLevel);
    const defs = drawShopCards(this.townLevel, size);
    this.shopSlots = defs.map(def => ({ def, sold: false }));
    this.emit('shop');
  }

  buyCard(slotIdx: number): { ok: boolean; reason?: string } {
    const slot = this.shopSlots[slotIdx];
    if (!slot || slot.sold) return { ok: false, reason: '该卡已售出' };
    const def = slot.def;
    if (this.gold < def.cost) return { ok: false, reason: `金币不足（需要 ${def.cost}）` };
    this.gold -= def.cost;
    slot.sold = true;
    this.hand.push(instantiate(def));
    this.yearStats.cardsBought++;
    this._totalCardsBought++;
    this.addLog(`购买了 ${def.name}`, 'info');
    if (this.shopSlots.every(s => s.sold)) {
      this.refreshShopFull();
      this.addLog('商店售罄，自动刷新！', 'good');
    }
    this.checkAchievements();
    this.emit('buy');
    return { ok: true };
  }

  manualRefreshShop(): { ok: boolean; reason?: string } {
    const refCost = shopRefreshCost(this.townLevel);
    if (this.gold < refCost) return { ok: false, reason: `刷新需要${refCost}金币` };
    this.gold -= refCost;
    this.refreshShopFull();
    return { ok: true };
  }

  sellCard(instanceId: string): { ok: boolean; reason?: string; gold?: number } {
    const handIdx = this.hand.findIndex(c => c.instanceId === instanceId);
    if (handIdx !== -1) {
      const inst = this.hand[handIdx];
      const def  = defById(inst.definitionId);
      const refund = Math.max(1, Math.floor(def.cost * 0.3));
      this.hand.splice(handIdx, 1);
      this.gold += refund;
      this.addLog(`💸 出售了 ${def.name}，回收 ${refund}💰`, 'info');
      this.emit('sell');
      return { ok: true, gold: refund };
    }
    const fieldIdx = this.field.findIndex(c => c.instanceId === instanceId);
    if (fieldIdx !== -1) {
      const inst = this.field[fieldIdx];
      const def  = defById(inst.definitionId);
      let refund: number;
      if (def.type === CardType.Monster) {
        refund = 0;
        this.addLog(`💸 出售了 ${def.name}（怪物卡，不返还金币）`, 'info');
      } else {
        refund = Math.max(1, Math.floor(def.cost * 0.3));
        this.addLog(`💸 出售了 ${def.name}，回收 ${refund}💰`, 'info');
      }
      this.field.splice(fieldIdx, 1);
      this.gold += refund;
      if (def.type === CardType.Human && inst.jobAssignment === JobType.Combat) {
        this.checkSiegeTransition();
      }
      this.emit('sell');
      this.emit('field');
      return { ok: true, gold: refund };
    }
    return { ok: false, reason: '找不到该卡牌' };
  }

  playCard(instanceId: string, opts?: { job?: JobType }): { ok: boolean; reason?: string } {
    const idx = this.hand.findIndex(c => c.instanceId === instanceId);
    if (idx === -1) return { ok: false, reason: '找不到卡牌' };
    if (this.field.length >= this.fieldCapacity)
      return { ok: false, reason: `场上已满（${this.fieldCapacity}）` };
    const inst = this.hand[idx];
    const def  = defById(inst.definitionId);
    inst.isOnField = true;
    if (opts?.job) inst.jobAssignment = opts.job;
    if (def.type === CardType.Monster) {
      const ms = inst.runtimeStats as MonsterStats;
      inst.aggressionCountdown = ms.aggression;

      // 恐惧术：场上有 delay_aggression 魔法时，倒计时额外+N
      const delayBonus = this.getMagicBonus('delay_aggression');
      if (delayBonus > 0) inst.aggressionCountdown += delayBonus;

      const monsterCount = this.field.filter(c =>
        defById(c.definitionId).type === CardType.Monster
      ).length;
      inst.spawnZone = assignSpawnZone(monsterCount);
    }
    this.hand.splice(idx, 1);
    this.field.push(inst);
    this.addLog(`打出了 ${def.name}`, 'info');
    this.emit('field');
    return { ok: true };
  }

  assignJob(instanceId: string, job: JobType): boolean {
    const inst = this.field.find(c => c.instanceId === instanceId);
    if (!inst) return false;
    inst.jobAssignment = job;
    this.emit('field');
    return true;
  }

  upgradeCard(definitionId: string): { ok: boolean; reason?: string; wildcard?: boolean } {
    const def = defById(definitionId);
    if (!def.upgradeTargetId) return { ok: false, reason: '该卡牌已是最高等级，无法升级' };

    const all     = [...this.hand, ...this.field];
    const matches = all.filter(c => c.definitionId === definitionId);
    if (matches.length < 3) return { ok: false, reason: `需要3张（当前 ${matches.length}/3）` };

    let finalTargetId = def.upgradeTargetId;
    let isWildcard    = false;

    if (Math.random() < WILDCARD_CHANCE) {
      const isHuman   = def.type === CardType.Human;
      const isMonster = def.type === CardType.Monster;
      const wildcardMap = isHuman   ? HUMAN_WILDCARD_BY_LEVEL
                        : isMonster ? MONSTER_WILDCARD_BY_LEVEL
                        : null;
      if (wildcardMap && wildcardMap[def.level] !== undefined) {
        finalTargetId = wildcardMap[def.level];
        isWildcard    = true;
      }
    }

    const targetDef = CARD_DB.find(c => c.id === finalTargetId);
    if (!targetDef) return { ok: false, reason: '升级目标不存在' };

    const toRemove = matches.slice(0, 3);
    for (const r of toRemove) {
      const hi = this.hand.findIndex(c => c.instanceId === r.instanceId);
      if (hi !== -1) { this.hand.splice(hi, 1); continue; }
      const fi = this.field.findIndex(c => c.instanceId === r.instanceId);
      if (fi !== -1) this.field.splice(fi, 1);
    }

    const newInst = instantiate(targetDef);
    this.hand.push(newInst);

    if (isWildcard) {
      this.monthStats.wildcardTriggered = true;
      this._wildcardEverTriggered = true;
      this.addLog(
        `🎉✨ 奇迹！3张 ${def.name} 触发彩蛋，合成为传说中的 ${targetDef.name}！`,
        'good'
      );
    } else {
      this.addLog(`⬆️ 3张 ${def.name} 合成为 ${targetDef.name}！`, 'good');
    }

    this.yearStats.upgradesDone++;
    this._totalUpgradesDone++;
    this.checkAchievements();
    this.emit('upgrade');
    return { ok: true, wildcard: isWildcard };
  }

  // ── 对外暴露：怪物被击败时由场景调用，记录到月度统计 ──────────────────────
  recordMonsterDefeated() {
    this.monthStats.monstersDefeated++;
    this._totalMonstersDefeated++;
    this.checkAchievements();
  }

  // ── Tick ──────────────────────────────────────────────────────────────────────
  advanceTick(): { weekEnd: boolean; monthEnd: boolean; newLogs: LogEntry[] } {
    const prevLen = this.log.length;
    this.tick++;
    let weekEnd  = false;
    let monthEnd = false;
    this.resolveRealtimeCraft();
    if (this.tick >= TICKS_PER_MONTH) {
      this.tick = 0;
      this.week = 1;
      this.month++;
      monthEnd = true;
      this.resolveMonth();
      this.saveToLocalStorage();
    } else {
      this.week = Math.floor(this.tick / TICKS_PER_WEEK) + 1;
      if (this.tick % TICKS_PER_WEEK === 0) weekEnd = true;
    }
    const newLogs = this.log.slice(0, this.log.length - prevLen);
    this.emit('tick');
    return { weekEnd, monthEnd, newLogs };
  }

  // ── 实时制造（接入建筑和魔法加速效果）──────────────────────────────────────
  private resolveRealtimeCraft() {
    if (this.isUnderSiege) {
      this.craftPoints = 0;
      return;
    }

    const craftWorkers = this.field.filter(c =>
      defById(c.definitionId).type === CardType.Human &&
      c.jobAssignment === JobType.Craft && c.isActive
    );
    if (craftWorkers.length === 0) {
      this.craftPoints = 0;
      return;
    }

    const hasCraftableRecipe = RECIPE_DB.some(recipe =>
      recipe.inputs.every(inp => this.countItem(inp.lootId, 'loot') >= inp.qty)
    );

    if (!hasCraftableRecipe) {
      this.craftPoints = 0;
      return;
    }

    // 建筑加速 + 时间加速魔法（craft_haste power=50 → ×1.5）
    const buildingBonus = this.getCraftSpeedBonus();
    const hasteBonus    = 1 + (this.getMagicBonus('craft_haste') / 100);
    const totalBonus    = buildingBonus * hasteBonus;

    const diligencePerTick = craftWorkers.reduce(
      (s, c) => s + (c.runtimeStats as HumanStats).diligence, 0
    ) / TICKS_PER_WEEK;

    this.craftPoints += diligencePerTick * totalBonus;

    let crafted = false;
    for (const recipe of RECIPE_DB) {
      if (this.craftPoints < recipe.craftCost) continue;
      const canCraft = recipe.inputs.every(inp =>
        this.countItem(inp.lootId, 'loot') >= inp.qty
      );
      if (!canCraft) continue;

      recipe.inputs.forEach(inp => this.removeItem(inp.lootId, 'loot', inp.qty));
      this.craftPoints -= recipe.craftCost;

      const stillHasMats = RECIPE_DB.some(r =>
        r.inputs.every(inp => this.countItem(inp.lootId, 'loot') >= inp.qty)
      );
      if (!stillHasMats) this.craftPoints = 0;

      this.addItem(recipe.outputProductId, 'product', recipe.outputQty);
      const prod = productById(recipe.outputProductId);
      this._lastCraftedEmoji = prod.emoji;
      this.monthStats.productsCrafted += recipe.outputQty;
      this.addLog(`🔨 制造了 ${prod.emoji} ${prod.name} ×${recipe.outputQty}`, 'good');
      crafted = true;
    }
    if (crafted) this.emit('inventory');
  }

  // ── Monthly resolution ────────────────────────────────────────────────────────
  private resolveMonth() {
    const underSiege = this.isUnderSiege;
    if (underSiege) this.monthStats.siegeOccurred = true;

    // 1. 税收（繁荣咒 tax_bonus power=50 → +50%；神圣宫殿 税收×2）
    if (underSiege && this.siegeMonthsCount >= 1) {
      this.addLog(`⚔️ 怪物围城！本月税收为 0💰`, 'bad');
    } else {
      const baseTax = monthlyTax(this.townLevel);
      const prosperityBonus = this.getMagicBonus('tax_bonus'); // e.g. 50 → 50%
      const palaceMult      = this.getPalaceTaxMultiplier();   // 1 or 2
      const tax = Math.round(baseTax * (1 + prosperityBonus / 100) * palaceMult);
      this.gold += tax;
      this.monthStats.taxIncome += tax;
      let taxNote = `🏛️ 税收 +${tax}💰`;
      if (prosperityBonus > 0) taxNote += `（繁荣咒 +${prosperityBonus}%）`;
      if (palaceMult > 1)      taxNote += `（神圣宫殿 ×${palaceMult}）`;
      this.addLog(taxNote, 'good');
    }

    // 2. 攻城计时
    if (underSiege) {
      this.siegeMonthsCount++;
      if (this.siegeMonthsCount === 1)
        this.addLog(`⚠️ 怪物仍在攻城！若持续，下月税收将为0！`, 'bad');
    } else {
      this.siegeMonthsCount = 0;
    }

    // 3. 怪物侵略倒计时
    for (const inst of this.field) {
      const def = defById(inst.definitionId);
      if (def.type !== CardType.Monster || !inst.isActive) continue;
      if (inst.aggressionCountdown > 0) {
        inst.aggressionCountdown--;
        if (inst.aggressionCountdown === 0)
          this.addLog(`⚔️ ${def.name} 开始向城镇进军！`, 'bad');
      }
    }

    // 4. 商店收入
    if (!underSiege) {
      this.resolveShopIncome();
    } else {
      this.addLog(`🏪 怪物围城，商店无法营业！`, 'bad');
    }

    // 5. 维护费
    this.resolveUpkeep();

    // 6. 恢复
    this.resolveRecovery();

    // 7. 升级检查
    const rawVal = computeCardRawValue([...this.hand, ...this.field]);
    if (this.townLevel < MAX_TOWN_LEVEL && rawVal >= getLevelThreshold(this.townLevel)) {
      this.townLevel++;
      this.monthStats.leveledUp = true;
      this.monthStats.newLevel  = this.townLevel;
      this.refreshShopFull();
      this.addLog(`🎉 城镇升至 ${this.townLevel} 级！场上槽位 ${this.fieldCapacity}，商店扩展！`, 'good');
    }

    // 8. 累加年度统计
    this.yearStats.totalIncome   += this.monthStats.taxIncome + this.monthStats.shopIncome;
    this.yearStats.totalExpenses += this.monthStats.upkeepCost;

    // 9. 年终结算（每12个月触发）
    if (this.month % 12 === 0) {
      const year = Math.floor(this.month / 12);
      this.lastYearSummary = {
        year,
        cardsBought:   this.yearStats.cardsBought,
        upgradesDone:  this.yearStats.upgradesDone,
        totalIncome:   this.yearStats.totalIncome,
        totalExpenses: this.yearStats.totalExpenses,
        netBalance:    this.yearStats.totalIncome - this.yearStats.totalExpenses,
      };
      this.emit('yearSummary');
      this.yearStats = { cardsBought: 0, upgradesDone: 0, totalIncome: 0, totalExpenses: 0 };
    }

    // 10. 成就检查（月末统一）
    this.checkAchievements();

    // 11. 重置月度统计
    this.monthStats = {
      taxIncome: 0, shopIncome: 0, upkeepCost: 0,
      monstersDefeated: 0, productsCrafted: 0,
      wildcardTriggered: false, siegeOccurred: false,
      leveledUp: false, newLevel: this.townLevel,
    };
  }

  private resolveShopIncome() {
    const shopWorkers = this.field.filter(c => {
      const d = defById(c.definitionId);
      return d.type === CardType.Human && c.jobAssignment === JobType.Shop && c.isActive;
    });

    // 行人计算：基础 + 城镇等级 + 魔法（extra_passersby）+ 建筑旅馆 + 黄金时代
    const innBonus     = this.getInnPasserbyBonus();
    const magicExtra   = this.getMagicBonus('extra_passersby'); // 市集魔法 +5
    let passersby = 5 + this.townLevel * 3 + magicExtra + innBonus;

    // 黄金时代：行人×2（golden_passersby power=100）
    if (this.getMagicBonus('golden_passersby') > 0) passersby *= 2;

    const totalProds = this.totalProducts;

    if (shopWorkers.length > 0 && totalProds > 0 && passersby > 0) {
      const sellCapacity = Math.min(totalProds, passersby * 2);
      let remaining   = sellCapacity;
      let totalIncome = 0;
      const shopPower = shopWorkers.reduce(
        (s, c) => s + (c.runtimeStats as HumanStats).intellect, 0
      );

      // 售价乘数：商人智力加成 + 建筑摊位加成 + 大师工艺魔法
      const stallMult = this.getStallSaleBonus();
      const craftPriceMult = 1 + (this.getMagicBonus('craft_price_bonus') / 100); // 大师工艺 ×1.5

      for (const stack of [...this.inventory].filter(s => s.kind === 'product')) {
        if (remaining <= 0) break;
        const sell   = Math.min(stack.qty, remaining);
        const prod   = productById(stack.itemId);
        // 成品价格额外乘以大师工艺系数
        const income = Math.round(
          sell * prod.sellPrice * (1 + shopPower * 0.05) * stallMult * craftPriceMult
        );
        this.removeItem(stack.itemId, 'product', sell);
        this.gold   += income;
        totalIncome += income;
        remaining   -= sell;
        this.addLog(`💰 售出 ${prod.emoji}${prod.name}×${sell}，+${income}💰`, 'good');
      }
      if (totalIncome > 0) {
        this.monthStats.shopIncome += totalIncome;
        this.addLog(`👥 本月行人 ${passersby} 人，商店总收入 +${totalIncome}💰`, 'good');
        this.emit('inventory');
      }
    } else if (shopWorkers.length > 0 && totalProds === 0) {
      this.addLog(`🏪 商店有人但无商品，行人空手而归`, 'info');
    }
  }

  private resolveUpkeep() {
    // 手牌不收维护费；场上不活跃（罢工/休息）的卡不收维护费
    // 怪物永远不收维护费
    const fieldUpkeep = this.field
      .filter(c => defById(c.definitionId).type !== CardType.Monster && c.isActive)
      .reduce((s, c) => s + defById(c.definitionId).upkeep, 0);

    this.monthStats.upkeepCost += fieldUpkeep;

    if (this.gold >= fieldUpkeep) {
      this.gold -= fieldUpkeep;
      if (fieldUpkeep > 0) this.addLog(`🏠 维护费 -${fieldUpkeep}`, 'info');
    } else {
      const deficit = fieldUpkeep - this.gold;
      this.gold = 0;
      this.addLog(`⚠️ 金币不足！欠维护费 ${deficit}`, 'bad');
      const candidates = [...this.field]
        .reverse()
        .filter(c => defById(c.definitionId).type !== CardType.Monster && c.isActive);
      let rem = deficit;
      for (const c of candidates) {
        if (rem <= 0) break;
        c.isActive         = false;
        c.strikeMonthsLeft = 1;
        rem -= defById(c.definitionId).upkeep;
        this.addLog(`😡 ${defById(c.definitionId).name} 罢工！`, 'bad');
      }
    }
    this.checkSiegeTransition();
  }

  private resolveRecovery() {
    for (const inst of this.field) {
      if (inst.isActive) continue;
      const defn = defById(inst.definitionId);
      if (defn.type === CardType.Monster) {
        if (inst.restMonthsLeft > 0) {
          inst.restMonthsLeft--;
          inst.restProgress = (inst.restProgress ?? 0) + 1;
        }
        if (inst.restMonthsLeft === 0) {
          inst.isActive     = true;
          inst.restProgress = 0;
          const ms = inst.runtimeStats as MonsterStats;
          inst.aggressionCountdown = ms.aggression;
          inst.runtimeStats = { ...ms, hp: ms.maxHp };
          this.addLog(`👹 ${defn.name} 伤愈归巢，重整侵略！`, 'bad');
        }
      } else {
        if (inst.restMonthsLeft  > 0) inst.restMonthsLeft--;
        if (inst.strikeMonthsLeft > 0) inst.strikeMonthsLeft--;
        if (inst.restMonthsLeft === 0 && inst.strikeMonthsLeft === 0) {
          inst.isActive = true;
          const rs = inst.runtimeStats as HumanStats;
          rs.hp = rs.maxHp;
          this.addLog(`✅ ${defn.name} 已恢复满血`, 'good');
        }
      }
    }
  }

  // ── getMagicBonus：接入全部魔法效果 ──────────────────────────────────────────
  getMagicBonus(effect: string): number {
    return this.field
      .filter(c => defById(c.definitionId).type === CardType.Magic && c.isActive)
      .reduce((sum, c) => {
        const ms = c.runtimeStats as MagicStats;
        return ms.effect === effect ? sum + ms.power : sum;
      }, 0);
  }

  // ── Save / Load ───────────────────────────────────────────────────────────────
  saveToLocalStorage() {
    try {
      const snap: SaveSnapshot = {
        version:   SAVE_VERSION,
        gold:      this.gold,
        townLevel: this.townLevel,
        tick:      this.tick,
        week:      this.week,
        month:     this.month,
        hand:      this.hand,
        field:     this.field,
        discarded: this.discarded,
        shopSlots: this.shopSlots.map(s => ({ defId: s.def.id, sold: s.sold })),
        inventory: this.inventory,
        log:       this.log.slice(0, 50),
        achievements:           this.achievements,
        totalCardsBought:       this._totalCardsBought,
        totalUpgradesDone:      this._totalUpgradesDone,
        totalMonstersDefeated:  this._totalMonstersDefeated,
        wildcardEverTriggered:  this._wildcardEverTriggered,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(snap));
    } catch (e) { console.warn('Save failed:', e); }
  }

  loadFromLocalStorage(): boolean {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const snap: SaveSnapshot = JSON.parse(raw);
      if (snap.version !== SAVE_VERSION) return false;
      this.gold      = snap.gold;
      this.townLevel = snap.townLevel;
      this.tick      = snap.tick;
      this.week      = snap.week;
      this.month     = snap.month;
      this.hand      = snap.hand;
      this.field     = snap.field;
      this.discarded = snap.discarded;
      this.inventory = snap.inventory ?? [];
      this.log       = snap.log ?? [];
      this.shopSlots = snap.shopSlots.map(s => {
        const def = CARD_DB.find(c => c.id === s.defId);
        return def ? { def, sold: s.sold } : null;
      }).filter(Boolean) as ShopSlot[];
      if (this.shopSlots.length === 0) this.refreshShopFull();
      // 成就数据：若存档有成就则加载，否则初始化（旧存档迁移）
      if (snap.achievements && snap.achievements.length > 0) {
        // 合并：以ACHIEVEMENT_DB为准，补充旧存档中没有的新成就
        this.achievements = ACHIEVEMENT_DB.map(def => {
          const saved = snap.achievements!.find(a => a.id === def.id);
          return saved ?? { id: def.id, unlockedAt: null };
        });
      } else {
        this.achievements = ACHIEVEMENT_DB.map(def => ({ id: def.id, unlockedAt: null }));
      }
      this._totalCardsBought      = snap.totalCardsBought      ?? 0;
      this._totalUpgradesDone     = snap.totalUpgradesDone     ?? 0;
      this._totalMonstersDefeated = snap.totalMonstersDefeated ?? 0;
      this._wildcardEverTriggered = snap.wildcardEverTriggered ?? false;
      // 清除构造器中可能遗留的 pending（加载存档时不触发解锁弹窗）
      this._pendingAchievement = null;
      const maxId = [...this.hand, ...this.field, ...this.discarded]
        .map(c => parseInt(c.instanceId.replace('card_', '')) || 0)
        .reduce((a, b) => Math.max(a, b), 0);
      _idCounter = maxId;
      return true;
    } catch (e) { console.warn('Load failed:', e); return false; }
  }

  clearSave() { localStorage.removeItem(SAVE_KEY); }

  addLog(text: string, kind: LogEntry['kind'] = 'info') {
    this.log.unshift({ id: ++_logId, month: this.month, week: this.week, text, kind });
    if (this.log.length > 300) this.log.pop();
  }
}

export const store = new GameStore();
