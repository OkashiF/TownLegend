import { CardType, CardDefinition } from '../types';

// ── 等级价格表（同等级所有卡牌价格相同）────────────────────────────────────────
export const LEVEL_COST: Record<number, number> = {
  0: 20,
  1: 50,
  2: 100,
  3: 180,
};

// ── 等级维护费表 ──────────────────────────────────────────────────────────────
const LEVEL_UPKEEP: Record<number, number> = {
  0: 5,
  1: 10,
  2: 20,
  3: 35,
};

function cost(level: number)   { return LEVEL_COST[level]   ?? 20; }
function upkeep(level: number) { return LEVEL_UPKEEP[level] ?? 5;  }

// ── 商店刷新费用 = 当前城镇等级对应的Lv(等级-1)卡售价 ──────────────────────────
export function shopRefreshCost(townLevel: number): number {
  const lvl = Math.max(0, townLevel - 1);
  return LEVEL_COST[lvl] ?? LEVEL_COST[0];
}

// ── 商店大小随城镇等级变化 ────────────────────────────────────────────────────
export function shopSize(townLevel: number): number {
  return 3 + townLevel * 2;  // Lv1=5, Lv2=7, Lv3=9...
}

export const CARD_DB: CardDefinition[] = [
  // ── Level 0 Humans ──────────────────────────────────────────────
  {
    id: 'human_farmer',
    name: '农夫',
    type: CardType.Human,
    level: 0,
    cost: cost(0),
    upkeep: upkeep(0),
    emoji: '🧑‍🌾',
    description: '勤劳的农夫，制造岗位的好手。',
    stats: { hp: 30, maxHp: 30, atk: 5, def: 3, intellect: 1, strength: 2, diligence: 5 },
    upgradeTargetId: 'human_blacksmith',
  },
  {
    id: 'human_peddler',
    name: '小贩',
    type: CardType.Human,
    level: 0,
    cost: cost(0),
    upkeep: upkeep(0),
    emoji: '🧑‍💼',
    description: '口才不错的商人苗子，商店岗位效率高。',
    stats: { hp: 25, maxHp: 25, atk: 3, def: 2, intellect: 5, strength: 1, diligence: 2 },
    upgradeTargetId: 'human_merchant',
  },
  {
    id: 'human_guard',
    name: '守卫',
    type: CardType.Human,
    level: 0,
    cost: cost(0),
    upkeep: upkeep(0),
    emoji: '💂',
    description: '基础战士，战斗岗位首选。',
    stats: { hp: 40, maxHp: 40, atk: 8, def: 6, intellect: 1, strength: 5, diligence: 2 },
    upgradeTargetId: 'human_knight',
  },

  // ── Level 1 Humans ──────────────────────────────────────────────
  {
    id: 'human_merchant',
    name: '商人',
    type: CardType.Human,
    level: 1,
    cost: cost(1),
    upkeep: upkeep(1),
    emoji: '🤵',
    description: '经验丰富的商人，大幅提升商店收益。',
    stats: { hp: 35, maxHp: 35, atk: 4, def: 3, intellect: 8, strength: 2, diligence: 3 },
    upgradeTargetId: 'human_archmage',
  },
  {
    id: 'human_blacksmith',
    name: '铁匠',
    type: CardType.Human,
    level: 1,
    cost: cost(1),
    upkeep: upkeep(1),
    emoji: '⚒️',
    description: '精工细作，制造岗位产出加成。',
    stats: { hp: 45, maxHp: 45, atk: 6, def: 5, intellect: 2, strength: 4, diligence: 8 },
    upgradeTargetId: 'human_archmage',
  },
  {
    id: 'human_knight',
    name: '骑士',
    type: CardType.Human,
    level: 1,
    cost: cost(1),
    upkeep: upkeep(1),
    emoji: '🧝',
    description: '装备精良的战士，战斗岗位强力人选。',
    stats: { hp: 60, maxHp: 60, atk: 14, def: 10, intellect: 2, strength: 8, diligence: 3 },
    upgradeTargetId: 'human_archmage',
  },

  // ── Level 2 Humans ──────────────────────────────────────────────
  {
    id: 'human_archmage',
    name: '法师',
    type: CardType.Human,
    level: 2,
    cost: cost(2),
    upkeep: upkeep(2),
    emoji: '🧙',
    description: '博学多识，各岗位均有加成。',
    stats: { hp: 40, maxHp: 40, atk: 10, def: 5, intellect: 10, strength: 5, diligence: 6 },
  },

  // ── Level 0 Monsters ────────────────────────────────────────────
  {
    id: 'monster_rat',
    name: '老鼠',
    type: CardType.Monster,
    level: 0,
    cost: cost(0),
    upkeep: 0,
    emoji: '🐀',
    description: '微小的威胁，掉落价值低，几乎不具攻击性。',
    stats: { hp: 15, maxHp: 15, atk: 4, def: 1, rarity: 1, aggression: 4, strength: 1, lootId: 'loot_rat_hide',     lootQtyMin: 2, lootQtyMax: 4 },
    upgradeTargetId: 'monster_wolf',
  },
  {
    id: 'monster_wolf',
    name: '野狼',
    type: CardType.Monster,
    level: 0,
    cost: cost(0),
    upkeep: 0,
    emoji: '🐺',
    description: '常见的威胁，攻击性一般。',
    stats: { hp: 25, maxHp: 25, atk: 8, def: 3, rarity: 2, aggression: 3, strength: 3, lootId: 'loot_wolf_fang',    lootQtyMin: 1, lootQtyMax: 3 },
    upgradeTargetId: 'monster_troll',
  },

  // ── Level 1 Monsters ────────────────────────────────────────────
  {
    id: 'monster_troll',
    name: '巨魔',
    type: CardType.Monster,
    level: 1,
    cost: cost(1),
    upkeep: 0,
    emoji: '👹',
    description: '强壮的怪物，掉落丰厚，但攻击倒计时较短。',
    stats: { hp: 50, maxHp: 50, atk: 15, def: 8, rarity: 4, aggression: 2, strength: 6, lootId: 'loot_troll_gem',    lootQtyMin: 1, lootQtyMax: 2 },
    upgradeTargetId: 'monster_dragon',
  },
  {
    id: 'monster_harpy',
    name: '鸟妖',
    type: CardType.Monster,
    level: 1,
    cost: cost(1),
    upkeep: 0,
    emoji: '🦅',
    description: '快速且具侵略性，频繁骚扰城镇。',
    stats: { hp: 35, maxHp: 35, atk: 12, def: 4, rarity: 3, aggression: 1, strength: 4, lootId: 'loot_harpy_feather', lootQtyMin: 2, lootQtyMax: 5 },
    upgradeTargetId: 'monster_dragon',
  },

  // ── Level 2 Monsters ────────────────────────────────────────────
  {
    id: 'monster_dragon',
    name: '幼龙',
    type: CardType.Monster,
    level: 2,
    cost: cost(2),
    upkeep: 0,
    emoji: '🐉',
    description: '极稀有的宝藏猎物，极具侵略性且战力强大。',
    stats: { hp: 100, maxHp: 100, atk: 25, def: 15, rarity: 8, aggression: 1, strength: 10, lootId: 'loot_dragon_scale', lootQtyMin: 1, lootQtyMax: 3 },
  },

  // ── Level 1 Buildings（原0级建筑上调至1级）──────────────────────
  {
    id: 'building_stall',
    name: '小摊位',
    type: CardType.Building,
    level: 1,
    cost: cost(1),
    upkeep: upkeep(1),
    emoji: '🏪',
    description: '简易商店，增加行人购买意愿。月末售价×1.3。',
    stats: { capacity: 1, bonus: 1.3 },
  },
  {
    id: 'building_workshop',
    name: '工坊',
    type: CardType.Building,
    level: 1,
    cost: cost(1),
    upkeep: upkeep(1),
    emoji: '🏗️',
    description: '制造场所，大幅提升制造产出速率。',
    stats: { capacity: 2, bonus: 1.4 },
  },

  // ── Level 1 Buildings（原有）──────────────────────────────────────
  {
    id: 'building_inn',
    name: '旅馆',
    type: CardType.Building,
    level: 1,
    cost: cost(1),
    upkeep: upkeep(1),
    emoji: '🏨',
    description: '吸引更多行人驻留，增加商店收益。',
    stats: { capacity: 3, bonus: 1.5 },
  },
  {
    id: 'building_barracks',
    name: '兵营',
    type: CardType.Building,
    level: 1,
    cost: cost(1),
    upkeep: upkeep(1),
    emoji: '🏰',
    description: '战斗岗位人物攻击力加成，战士可在此回血。',
    stats: { capacity: 4, bonus: 1.4 },
  },

  // ── Level 1 Magic（原0级魔法卡上调至1级）──────────────────────────
  {
    id: 'magic_blessing',
    name: '祝福',
    type: CardType.Magic,
    level: 1,
    cost: cost(1),
    upkeep: upkeep(1),
    emoji: '✨',
    description: '场上所有人物攻击力+3。',
    stats: { effect: 'buff_human_atk', power: 3 },
  },
  {
    id: 'magic_curse',
    name: '诅咒',
    type: CardType.Magic,
    level: 1,
    cost: cost(1),
    upkeep: upkeep(1),
    emoji: '💀',
    description: '场上所有怪物攻击力-3。',
    stats: { effect: 'debuff_monster_atk', power: 3 },
  },
  {
    id: 'magic_market',
    name: '市集魔法',
    type: CardType.Magic,
    level: 1,
    cost: cost(1),
    upkeep: upkeep(1),
    emoji: '🎪',
    description: '每月额外增加5名行人。',
    stats: { effect: 'extra_passersby', power: 5 },
  },
  {
    id: 'magic_fortify',
    name: '强化术',
    type: CardType.Magic,
    level: 1,
    cost: cost(1),
    upkeep: upkeep(1),
    emoji: '🛡️',
    description: '场上所有人物防御力+4。',
    stats: { effect: 'buff_human_def', power: 4 },
  },
];

/** 按城镇等级过滤可用卡池
 *  - 1级城镇只能看到0级卡（人物+怪物）
 *  - 2级及以上才有建筑/魔法卡和1级卡
 */
export function getCardPool(townLevel: number): CardDefinition[] {
  if (townLevel === 1) {
    // 1级只能买0级人物卡和怪物卡
    return CARD_DB.filter(c => c.level === 0 &&
      (c.type === CardType.Human || c.type === CardType.Monster));
  }
  return CARD_DB.filter(c => c.level <= townLevel);
}

/**
 * 生成一批商店卡牌（不重复，直到池耗尽）
 * 数量由 shopSize(townLevel) 决定
 */
export function drawShopCards(townLevel: number, count: number, exclude: string[] = []): CardDefinition[] {
  const pool = getCardPool(townLevel).filter(c => !exclude.includes(c.id));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}
