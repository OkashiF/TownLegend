import {
  CardInstance, CardDefinition, CardType, JobType, SpawnZone,
  HumanStats, MonsterStats, MagicStats, BuildingStats, ItemStack, SaveSnapshot, LootDef,
} from '../types';
import { CARD_DB, drawShopCards, LEVEL_COST } from '../data/cards';
import { LOOT_DB, PRODUCT_DB, RECIPE_DB, lootById, productById } from '../data/items';

// ── ID factory ─────────────────────────────────────────────────────────────────
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
  };
}

// ── Constants ──────────────────────────────────────────────────────────────────
export const TICKS_PER_WEEK  = 40;
export const WEEKS_PER_MONTH = 4;
export const TICKS_PER_MONTH = TICKS_PER_WEEK * WEEKS_PER_MONTH; // 160
export const LEVEL_THRESHOLD = 10;
const SHOP_SIZE    = 6;
const SAVE_KEY     = 'town_legend_save';
const SAVE_VERSION = 2;

export function fieldCap(level: number): number { return 5 + (level - 1) * 2; }

function countLevelProgress(hand: CardInstance[], field: CardInstance[], townLevel: number): number {
  return [...hand, ...field].filter(c => c.level >= townLevel).length;
}

export function monthlyTax(level: number): number {
  return (LEVEL_COST[level] ?? LEVEL_COST[0]) * 0.5;
}

// ── Types ─────────────────────────────────────────────────────────────────────
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

// ── Store ──────────────────────────────────────────────────────────────────────
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

  // Per-tick craft accumulator (diligence points) – realtime, not weekly
  private craftPoints = 0;

  // Last crafted product emoji, consumed by TownScene for bubble FX
  private _lastCraftedEmoji: string | null = null;

  /** Consume last crafted emoji (returns null if nothing was just crafted) */
  takeCraftedEmoji(): string | null {
    const e = this._lastCraftedEmoji;
    this._lastCraftedEmoji = null;
    return e;
  }

  /** Progress toward the current/next craftable recipe */
  getCraftProgressInfo(): { points: number; maxPoints: number } {
    for (const recipe of RECIPE_DB) {
      const hasMats = recipe.inputs.every(inp => this.countItem(inp.lootId, 'loot') >= inp.qty);
      if (hasMats) {
        return { points: Math.min(this.craftPoints, recipe.craftCost), maxPoints: recipe.craftCost };
      }
    }
    const fallback = RECIPE_DB[0];
    return { points: Math.min(this.craftPoints, fallback.craftCost), maxPoints: fallback.craftCost };
  }

  // ── Building helpers ──────────────────────────────────────────────────────────

  /** Sum of capacity across all active instances of a building.
   *  Returns 0 if no such building is on the field (expected behavior for bonus calculations). */
  getBuildingCapacity(defId: string): number {
    return this.field
      .filter(c => c.definitionId === defId && c.isActive)
      .reduce((s, c) => s + (c.runtimeStats as BuildingStats).capacity, 0);
  }

  /** Returns the total "extra rate" bonus for on-field buildings of a given type.
   *  Each instance with bonus B contributes (B - 1), e.g. bonus=1.3 → +0.3 per instance. */
  private getBuildingExtraRate(defId: string): number {
    return this.field
      .filter(c => c.definitionId === defId && c.isActive)
      .reduce((s, c) => s + ((c.runtimeStats as BuildingStats).bonus - 1), 0);
  }

  /** Craft rate multiplier from workshops on field (1 + 0.3 per workshop with bonus=1.3) */
  getWorkshopCraftBonus(): number {
    const extra = this.getBuildingExtraRate('building_workshop');
    return 1 + extra;
  }

  /** ATK bonus granted to warriors by barracks buildings (= total capacity) */
  getBarracksAtkBonus(): number {
    return this.getBuildingCapacity('building_barracks');
  }

  /** Income multiplier from market stalls (1 + 0.2 per stall with bonus=1.2) */
  getStallSaleBonus(): number {
    const extra = this.getBuildingExtraRate('building_stall');
    return 1 + extra;
  }

  constructor() {
    this.refreshShopFull();
    this.addLog('🏰 城镇建立！欢迎来到镇主传说。', 'good');
  }

  subscribe(fn: Listener)   { this.listeners.add(fn); }
  unsubscribe(fn: Listener) { this.listeners.delete(fn); }
  emit(event?: string) { this.listeners.forEach(fn => fn(event)); }

  get fieldCapacity() { return fieldCap(this.townLevel); }
  get levelProgress() { return countLevelProgress(this.hand, this.field, this.townLevel); }

  // ── Loot def lookup (used by TownScene for emoji) ─────────────────────────────
  getLootDef(lootId: string): LootDef | undefined {
    return LOOT_DB.find(l => l.id === lootId);
  }

  // ── Inventory helpers ─────────────────────────────────────────────────────────

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
    const defs = drawShopCards(this.townLevel, SHOP_SIZE);
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
    const cost = 5;
    if (this.gold < cost) return { ok: false, reason: '刷新需要5金币' };
    this.gold -= cost;
    this.refreshShopFull();
    return { ok: true };
  }

  // ── Play / Assign ─────────────────────────────────────────────────────────────

  playCard(instanceId: string, opts?: { job?: JobType; zone?: SpawnZone }): { ok: boolean; reason?: string } {
    const idx = this.hand.findIndex(c => c.instanceId === instanceId);
    if (idx === -1) return { ok: false, reason: '找不到卡牌' };
    if (this.field.length >= this.fieldCapacity)
      return { ok: false, reason: `场上已满（${this.fieldCapacity}）` };

    const inst = this.hand[idx];
    const def  = defById(inst.definitionId);
    inst.isOnField = true;
    if (opts?.job)  inst.jobAssignment = opts.job;
    if (opts?.zone) inst.spawnZone = opts.zone;

    if (def.type === CardType.Monster) {
      const ms = inst.runtimeStats as MonsterStats;
      inst.aggressionCountdown = ms.aggression;
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

  assignSpawnZone(instanceId: string, zone: SpawnZone): boolean {
    const inst = this.field.find(c => c.instanceId === instanceId);
    if (!inst) return false;
    inst.spawnZone = zone;
    this.emit('field');
    return true;
  }

  // ── Upgrade ───────────────────────────────────────────────────────────────────

  upgradeCard(definitionId: string): { ok: boolean; reason?: string } {
    const all     = [...this.hand, ...this.field];
    const matches = all.filter(c => c.definitionId === definitionId);
    if (matches.length < 3) return { ok: false, reason: `需要3张（当前 ${matches.length}/3）` };

    const [keep, ...rest] = matches;
    keep.upgrades++;
    keep.level++;
    const rs = keep.runtimeStats as any;
    for (const k of Object.keys(rs)) {
      if (typeof rs[k] === 'number') rs[k] = Math.round(rs[k] * 1.3);
    }

    for (const r of rest.slice(0, 2)) {
      const hi = this.hand.findIndex(c => c.instanceId === r.instanceId);
      if (hi !== -1) { this.hand.splice(hi, 1); continue; }
      const fi = this.field.findIndex(c => c.instanceId === r.instanceId);
      if (fi !== -1) this.field.splice(fi, 1);
    }

    const bonus = drawShopCards(this.townLevel, 1);
    if (bonus[0]) this.hand.push(instantiate(bonus[0]));

    this.addLog(`⬆️ ${defById(definitionId).name} 升级！属性+30%，免费抽牌。`, 'good');
    this.emit('upgrade');
    return { ok: true };
  }

  // ── Tick ──────────────────────────────────────────────────────────────────────

  advanceTick(): { weekEnd: boolean; monthEnd: boolean; newLogs: LogEntry[] } {
    const prevLen = this.log.length;
    this.tick++;
    let weekEnd  = false;
    let monthEnd = false;

    // ── Realtime crafting (every tick) ─────────────────────────────────────────
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

  // ── Realtime crafting ─────────────────────────────────────────────────────────
  // Runs every tick; accumulates diligence and produces when threshold met.

  private resolveRealtimeCraft() {
    const craftWorkers = this.field.filter(c =>
      defById(c.definitionId).type === CardType.Human &&
      c.jobAssignment === JobType.Craft && c.isActive
    );
    if (craftWorkers.length === 0) return;

    // Accumulate at 1/40 rate per tick so a full month (160 tick) = 4 weeks of points
    // Apply workshop craft bonus (each workshop with bonus=1.3 adds +30%)
    const workshopBonus = this.getWorkshopCraftBonus();
    const diligencePerTick = craftWorkers.reduce(
      (s, c) => s + (c.runtimeStats as HumanStats).diligence, 0
    ) / TICKS_PER_WEEK;

    this.craftPoints += diligencePerTick * workshopBonus;

    // Try each recipe
    let crafted = false;
    for (const recipe of RECIPE_DB) {
      if (this.craftPoints < recipe.craftCost) continue;
      const canCraft = recipe.inputs.every(inp =>
        this.countItem(inp.lootId, 'loot') >= inp.qty
      );
      if (!canCraft) continue;

      recipe.inputs.forEach(inp => this.removeItem(inp.lootId, 'loot', inp.qty));
      this.craftPoints -= recipe.craftCost;
      this.addItem(recipe.outputProductId, 'product', recipe.outputQty);
      const prod = productById(recipe.outputProductId);
      this._lastCraftedEmoji = prod.emoji;
      this.addLog(`🔨 制造了 ${prod.emoji} ${prod.name} ×${recipe.outputQty}`, 'good');
      crafted = true;
    }
    if (crafted) this.emit('inventory');
  }

  // ── Monthly resolution ────────────────────────────────────────────────────────
  // Only tax, upkeep, aggression countdown, shop income, and level check remain here.

  private resolveMonth() {
    // 1. Tax
    const tax = monthlyTax(this.townLevel);
    this.gold += tax;
    this.addLog(`🏛️ 税收 +${tax} 💰`, 'good');

    // 2. Monster aggression countdown
    for (const inst of this.field) {
      const def = defById(inst.definitionId);
      if (def.type !== CardType.Monster || !inst.isActive) continue;
      if (inst.aggressionCountdown > 0) {
        inst.aggressionCountdown--;
        if (inst.aggressionCountdown === 0)
          this.addLog(`⚔️ ${def.name} 开始进攻城镇！`, 'bad');
      }
    }

    // 3. Attackers check (for passerby suppression)
    const attackers = this.field.filter(c => {
      const d = defById(c.definitionId);
      return d.type === CardType.Monster && c.aggressionCountdown === 0 && c.isActive;
    });

    // 4. Shop income
    // Inn buildings add to passersby; stall buildings multiply sale income
    const shopWorkers = this.field.filter(c => {
      const d = defById(c.definitionId);
      return d.type === CardType.Human && c.jobAssignment === JobType.Shop && c.isActive;
    });
    const underAttack = attackers.length > 0;
    const innBonus    = this.getBuildingCapacity('building_inn');
    const passersby   = underAttack
      ? 0
      : 5 + this.townLevel * 3 + this.getMagicBonus('extra_passersby') + innBonus;

    const totalProds = this.totalProducts;

    if (shopWorkers.length > 0 && totalProds > 0 && passersby > 0) {
      const sellCapacity = Math.min(totalProds, passersby * 2);
      let remaining      = sellCapacity;
      let totalIncome    = 0;

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
    } else if (shopWorkers.length > 0 && totalProds === 0 && passersby > 0) {
      this.addLog(`🏪 商店有人但无商品，行人空手而归`, 'info');
    }

    // 5. Upkeep
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
        c.isActive        = false;
        c.strikeMonthsLeft = 1;
        rem -= defById(c.definitionId).upkeep;
        this.addLog(`😡 ${defById(c.definitionId).name} 罢工！`, 'bad');
      }
    }

    // 6. Recover resting/striking units
    for (const inst of this.field) {
      if (inst.isActive) continue;
      if (inst.restMonthsLeft  > 0) inst.restMonthsLeft--;
      if (inst.strikeMonthsLeft > 0) inst.strikeMonthsLeft--;
      if (inst.restMonthsLeft === 0 && inst.strikeMonthsLeft === 0) {
        inst.isActive = true;
        const defn = defById(inst.definitionId);
        if (defn.type === CardType.Monster) {
          // Reset aggression countdown so monster starts fresh patrol after recovery
          const ms = inst.runtimeStats as MonsterStats;
          inst.aggressionCountdown = ms.aggression;
          this.addLog(`👹 ${defn.name} 伤愈，重整侵略！`, 'bad');
        } else {
          this.addLog(`✅ ${defn.name} 已恢复`, 'good');
        }
      }
    }

    // 7. Level up check
    if (countLevelProgress(this.hand, this.field, this.townLevel) >= LEVEL_THRESHOLD) {
      this.townLevel++;
      this.refreshShopFull();
      this.addLog(`🎉 城镇升至 ${this.townLevel} 级！场上槽位 ${this.fieldCapacity}`, 'good');
    }
  }

  // ── Magic bonus ───────────────────────────────────────────────────────────────

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
    } catch (e) {
      console.warn('Save failed:', e);
    }
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
    } catch (e) {
      console.warn('Load failed:', e);
      return false;
    }
  }

  clearSave() { localStorage.removeItem(SAVE_KEY); }

  // ── Logging ───────────────────────────────────────────────────────────────────

  addLog(text: string, kind: LogEntry['kind'] = 'info') {
    this.log.unshift({ id: ++_logId, month: this.month, week: this.week, text, kind });
    if (this.log.length > 300) this.log.pop();
  }
}

export const store = new GameStore();
