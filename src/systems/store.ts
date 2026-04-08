import {
  CardInstance, CardDefinition, CardType, JobType, SpawnZone,
  HumanStats, MonsterStats, MagicStats, BuildingStats, ItemStack, SaveSnapshot, LootDef,
} from '../types';
import { CARD_DB, drawShopCards, LEVEL_COST, shopSize, shopRefreshCost } from '../data/cards';
import { LOOT_DB, PRODUCT_DB, RECIPE_DB, lootById, productById } from '../data/items';

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
  [SpawnZone.Right0]: 2900,  // 修复：原2300在城墙内，移至右城墙(2700)外
  [SpawnZone.Right1]: 3100,  // 修复：原2550在城墙内，移至城外
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
const SAVE_VERSION = 3;

export function fieldCap(level: number): number { return 5 + (level - 1) * 2; }
export { shopRefreshCost };

/** 将所有卡牌换算为"原始单位"（0级卡 = 3^0 = 1单位，1级卡 = 3^1 = 3单位，2级卡 = 3^2 = 9单位，…）*/
function computeCardRawValue(cards: CardInstance[]): number {
  return cards.reduce((sum, c) => {
    const def = CARD_DB.find(d => d.id === c.definitionId);
    return sum + Math.pow(3, def?.level ?? 0);
  }, 0);
}

/**
 * 城镇 x 级升级所需的原始单位阈值。
 * 规则：总卡牌换算成 x 级卡牌 >= 10x 张
 * （3张 (x-1)级卡 = 1张 x 级卡，以此类推）
 * 原始阈值 = 10 * x * 3^(x-1)
 */
function getLevelThresholdRaw(townLevel: number): number {
  return 10 * townLevel * Math.pow(3, townLevel - 1);
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

  private siegeMonthsCount = 0;
  private craftPoints = 0;
  private _lastCraftedEmoji: string | null = null;

  takeCraftedEmoji(): string | null {
    const e = this._lastCraftedEmoji;
    this._lastCraftedEmoji = null;
    return e;
  }

  // ── 制造进度信息 ─────────────────────────────────────────────────────────────
  // 修复：只有在有「材料充足的配方」时才返回进度；否则返回 {0,0} 使进度条隐藏
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
    // 没有任何可制造配方 → 进度条隐藏（maxPoints=0）
    return { points: 0, maxPoints: 0 };
  }

  // ── 攻城状态 ──────────────────────────────────────────────────────────────────
  get isUnderSiege(): boolean {
    return this.field.some(c => {
      if (!c.definitionId) return false;
      const def = defById(c.definitionId);
      return def.type === CardType.Monster && c.isActive && c.aggressionCountdown === 0;
    });
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

  getWorkshopCraftBonus(): number { return 1 + this.getBuildingExtraRate('building_workshop'); }
  getBarracksAtkBonus():   number { return this.getBuildingCapacity('building_barracks'); }
  getStallSaleBonus():     number { return 1 + this.getBuildingExtraRate('building_stall'); }

  constructor() {
    this.refreshShopFull();
    this.addLog('🏰 城镇建立！欢迎来到镇主传说。', 'good');
  }

  subscribe(fn: Listener)   { this.listeners.add(fn); }
  unsubscribe(fn: Listener) { this.listeners.delete(fn); }
  emit(event?: string) { this.listeners.forEach(fn => fn(event)); }

  get fieldCapacity() { return fieldCap(this.townLevel); }
  /** 当前升级进度（换算成当前等级卡牌数）*/
  get levelProgress(): number {
    const raw = computeCardRawValue([...this.hand, ...this.field]);
    return Math.floor(raw / Math.pow(3, this.townLevel - 1));
  }
  /** 当前升级阈值 = 10 × 城镇等级 */
  get levelThreshold(): number { return 10 * this.townLevel; }

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
    this.addLog(`购买了 ${def.name}`, 'info');
    if (this.shopSlots.every(s => s.sold)) {
      this.refreshShopFull();
      this.addLog('商店售罄，自动刷新！', 'good');
    }
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
      const refund = Math.max(1, Math.floor(def.cost * 0.1));
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
      if (def.type === CardType.Monster && inst.isActive && inst.aggressionCountdown === 0) {
        return { ok: false, reason: '怪物正在攻城，无法出售！' };
      }
      const refund = Math.max(1, Math.floor(def.cost * 0.1));
      this.field.splice(fieldIdx, 1);
      this.gold += refund;
      this.addLog(`💸 出售了 ${def.name}，回收 ${refund}💰`, 'info');
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

  upgradeCard(definitionId: string): { ok: boolean; reason?: string } {
    const def = defById(definitionId);
    if (!def.upgradeTargetId) return { ok: false, reason: '该卡牌已是最高等级，无法升级' };
    const all     = [...this.hand, ...this.field];
    const matches = all.filter(c => c.definitionId === definitionId);
    if (matches.length < 3) return { ok: false, reason: `需要3张（当前 ${matches.length}/3）` };
    const targetDef = CARD_DB.find(c => c.id === def.upgradeTargetId);
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
    this.addLog(`⬆️ 3张 ${def.name} 合成为 ${targetDef.name}！`, 'good');
    this.emit('upgrade');
    return { ok: true };
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

  // ── 实时制造（修复版）────────────────────────────────────────────────────────
  // 修复：只有存在「有材料」的配方时，才累积 craftPoints
  // 没有可制造目标时，归零 craftPoints，使进度条归零
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

    // 检查是否存在材料充足的配方
    const hasCraftableRecipe = RECIPE_DB.some(recipe =>
      recipe.inputs.every(inp => this.countItem(inp.lootId, 'loot') >= inp.qty)
    );

    if (!hasCraftableRecipe) {
      // 无材料：不累积，保持归零状态
      this.craftPoints = 0;
      return;
    }

    const workshopBonus = this.getWorkshopCraftBonus();
    const diligencePerTick = craftWorkers.reduce(
      (s, c) => s + (c.runtimeStats as HumanStats).diligence, 0
    ) / TICKS_PER_WEEK;

    this.craftPoints += diligencePerTick * workshopBonus;

    let crafted = false;
    for (const recipe of RECIPE_DB) {
      if (this.craftPoints < recipe.craftCost) continue;
      const canCraft = recipe.inputs.every(inp =>
        this.countItem(inp.lootId, 'loot') >= inp.qty
      );
      if (!canCraft) continue;

      recipe.inputs.forEach(inp => this.removeItem(inp.lootId, 'loot', inp.qty));
      this.craftPoints -= recipe.craftCost;

      // 制造完成后：若没有剩余可制造配方，归零避免残留
      const stillHasMats = RECIPE_DB.some(r =>
        r.inputs.every(inp => this.countItem(inp.lootId, 'loot') >= inp.qty)
      );
      if (!stillHasMats) this.craftPoints = 0;

      this.addItem(recipe.outputProductId, 'product', recipe.outputQty);
      const prod = productById(recipe.outputProductId);
      this._lastCraftedEmoji = prod.emoji;
      this.addLog(`🔨 制造了 ${prod.emoji} ${prod.name} ×${recipe.outputQty}`, 'good');
      crafted = true;
    }
    if (crafted) this.emit('inventory');
  }

  // ── Monthly resolution ────────────────────────────────────────────────────────
  private resolveMonth() {
    const underSiege = this.isUnderSiege;

    if (underSiege && this.siegeMonthsCount >= 1) {
      this.addLog(`⚔️ 怪物围城！本月税收为 0💰`, 'bad');
    } else {
      const tax = monthlyTax(this.townLevel);
      this.gold += tax;
      this.addLog(`🏛️ 税收 +${tax}💰`, 'good');
    }

    if (underSiege) {
      this.siegeMonthsCount++;
      if (this.siegeMonthsCount === 1)
        this.addLog(`⚠️ 怪物仍在攻城！若持续，下月税收将为0！`, 'bad');
    } else {
      this.siegeMonthsCount = 0;
    }

    for (const inst of this.field) {
      const def = defById(inst.definitionId);
      if (def.type !== CardType.Monster || !inst.isActive) continue;
      if (inst.aggressionCountdown > 0) {
        inst.aggressionCountdown--;
        if (inst.aggressionCountdown === 0)
          this.addLog(`⚔️ ${def.name} 开始向城镇进军！`, 'bad');
      }
    }

    if (!underSiege) {
      this.resolveShopIncome();
    } else {
      this.addLog(`🏪 怪物围城，商店无法营业！`, 'bad');
    }

    this.resolveUpkeep();
    this.resolveRecovery();

    const rawVal = computeCardRawValue([...this.hand, ...this.field]);
    if (rawVal >= getLevelThresholdRaw(this.townLevel)) {
      this.townLevel++;
      this.refreshShopFull();
      this.addLog(`🎉 城镇升至 ${this.townLevel} 级！场上槽位 ${this.fieldCapacity}，商店扩展！`, 'good');
    }
  }

  private resolveShopIncome() {
    const shopWorkers = this.field.filter(c => {
      const d = defById(c.definitionId);
      return d.type === CardType.Human && c.jobAssignment === JobType.Shop && c.isActive;
    });
    const innBonus  = this.getBuildingCapacity('building_inn');
    const passersby = 5 + this.townLevel * 3 + this.getMagicBonus('extra_passersby') + innBonus;
    const totalProds = this.totalProducts;

    if (shopWorkers.length > 0 && totalProds > 0 && passersby > 0) {
      const sellCapacity = Math.min(totalProds, passersby * 2);
      let remaining   = sellCapacity;
      let totalIncome = 0;
      const shopPower = shopWorkers.reduce(
        (s, c) => s + (c.runtimeStats as HumanStats).intellect, 0
      );
      const stallMult = this.getStallSaleBonus();
      for (const stack of [...this.inventory].filter(s => s.kind === 'product')) {
        if (remaining <= 0) break;
        const sell   = Math.min(stack.qty, remaining);
        const prod   = productById(stack.itemId);
        const income = Math.round(sell * prod.sellPrice * (1 + shopPower * 0.05) * stallMult);
        this.removeItem(stack.itemId, 'product', sell);
        this.gold   += income;
        totalIncome += income;
        remaining   -= sell;
        this.addLog(`💰 售出 ${prod.emoji}${prod.name}×${sell}，+${income}💰`, 'good');
      }
      if (totalIncome > 0) {
        this.addLog(`👥 本月行人 ${passersby} 人，商店总收入 +${totalIncome}💰`, 'good');
        this.emit('inventory');
      }
    } else if (shopWorkers.length > 0 && totalProds === 0) {
      this.addLog(`🏪 商店有人但无商品，行人空手而归`, 'info');
    }
  }

  private resolveUpkeep() {
    const handUpkeep  = this.hand.reduce(
      (s, c) => s + Math.ceil(defById(c.definitionId).upkeep * 0.5), 0
    );
    const fieldUpkeep = this.field
      .filter(c => defById(c.definitionId).type !== CardType.Monster)
      .reduce((s, c) => s + defById(c.definitionId).upkeep, 0);
    const totalUpkeep = handUpkeep + fieldUpkeep;

    if (this.gold >= totalUpkeep) {
      this.gold -= totalUpkeep;
      if (totalUpkeep > 0) this.addLog(`🏠 维护费 -${totalUpkeep}`, 'info');
    } else {
      const deficit = totalUpkeep - this.gold;
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
