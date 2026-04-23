import { CardType, CardDefinition } from '../types';

// ── 等级价格表 ────────────────────────────────────────────────────────────────
// Lv0=20, Lv1=50, Lv2=100, Lv3=180, Lv4=300, Lv5=480
export const LEVEL_COST: Record<number, number> = {
  0: 20,
  1: 50,
  2: 100,
  3: 180,
  4: 300,
  5: 480,
};

// ── 等级维护费表 ──────────────────────────────────────────────────────────────
const LEVEL_UPKEEP: Record<number, number> = {
  0: 5,
  1: 10,
  2: 20,
  3: 35,
  4: 55,
  5: 80,
};

function cost(level: number)   { return LEVEL_COST[level]   ?? 20; }
function upkeep(level: number) { return LEVEL_UPKEEP[level] ?? 5;  }

// ── 商店刷新费用 ──────────────────────────────────────────────────────────────
export function shopRefreshCost(townLevel: number): number {
  const lvl = Math.max(0, townLevel - 1);
  return LEVEL_COST[lvl] ?? LEVEL_COST[0];
}

// ── 商店大小随城镇等级变化 ────────────────────────────────────────────────────
export function shopSize(townLevel: number): number {
  return 3 + townLevel * 2;  // Lv1=5, Lv2=7, Lv3=9, Lv4=11, Lv5=13, Lv6=15
}

// ── 彩蛋合成概率 ─────────────────────────────────────────────────────────────
export const WILDCARD_CHANCE = 0.10; // 10% 概率

// ── 彩蛋卡映射：触发等级 → 彩蛋卡ID ─────────────────────────────────────────
// 人物合成彩蛋（任意同等级人物×3触发）
export const HUMAN_WILDCARD_BY_LEVEL: Record<number, string> = {
  0: 'human_mage',        // Lv0×3 → 法师(Lv1彩蛋)
  1: 'human_sage',        // Lv1×3 → 圣贤(Lv2彩蛋)
  2: 'human_hero',        // Lv2×3 → 英雄(Lv3彩蛋)
  3: 'human_dragonborn',  // Lv3×3 → 龙裔(Lv4彩蛋)
  4: 'human_demigod',     // Lv4×3 → 半神(Lv5彩蛋)
};

// 怪物合成彩蛋（任意同等级怪物×3触发）
export const MONSTER_WILDCARD_BY_LEVEL: Record<number, string> = {
  0: 'monster_mutant',      // Lv0×3 → 变异体(Lv1彩蛋)
  1: 'monster_chaos_beast', // Lv1×3 → 混沌魔兽(Lv2彩蛋)
  2: 'monster_abyss_lord',  // Lv2×3 → 深渊领主(Lv3彩蛋)
  3: 'monster_primordial',  // Lv3×3 → 原初神兽(Lv4彩蛋)
  4: 'monster_world_ender', // Lv4×3 → 终焉之兽(Lv5彩蛋)
};

export const CARD_DB: CardDefinition[] = [

  // ══════════════════════════════════════════════════════════════════════
  // 人物卡 · 主线升级路线（三条专精）
  // ══════════════════════════════════════════════════════════════════════

  // ── Lv0 基础人物 ─────────────────────────────────────────────────────
  {
    id: 'human_farmer',
    name: '农夫',
    type: CardType.Human,
    level: 0,
    cost: cost(0), upkeep: upkeep(0),
    emoji: '🧑‍🌾',
    description: '勤劳的农夫，制造岗位的好手。3张可合成铁匠。',
    stats: { hp: 30, maxHp: 30, atk: 5, def: 3, intellect: 1, strength: 2, diligence: 5 },
    upgradeTargetId: 'human_blacksmith',
  },
  {
    id: 'human_peddler',
    name: '小贩',
    type: CardType.Human,
    level: 0,
    cost: cost(0), upkeep: upkeep(0),
    emoji: '🧑‍💼',
    description: '口才不错的商人苗子，商店岗位效率高。3张可合成商人。',
    stats: { hp: 25, maxHp: 25, atk: 3, def: 2, intellect: 5, strength: 1, diligence: 2 },
    upgradeTargetId: 'human_merchant',
  },
  {
    id: 'human_guard',
    name: '守卫',
    type: CardType.Human,
    level: 0,
    cost: cost(0), upkeep: upkeep(0),
    emoji: '💂',
    description: '基础战士，战斗岗位首选。3张可合成骑士。',
    stats: { hp: 40, maxHp: 40, atk: 8, def: 6, intellect: 1, strength: 5, diligence: 2 },
    upgradeTargetId: 'human_knight',
  },

  // ── Lv1 专精人物 ─────────────────────────────────────────────────────
  {
    id: 'human_blacksmith',
    name: '铁匠',
    type: CardType.Human,
    level: 1,
    cost: cost(1), upkeep: upkeep(1),
    emoji: '⚒️',
    description: '精工细作，制造岗位产出大幅提升。3张合成大师铁匠。',
    stats: { hp: 45, maxHp: 45, atk: 6, def: 5, intellect: 2, strength: 4, diligence: 12 },
    upgradeTargetId: 'human_master_blacksmith',
  },
  {
    id: 'human_merchant',
    name: '商人',
    type: CardType.Human,
    level: 1,
    cost: cost(1), upkeep: upkeep(1),
    emoji: '🤵',
    description: '经验丰富的商人，大幅提升商店收益。3张合成行会长。',
    stats: { hp: 35, maxHp: 35, atk: 4, def: 3, intellect: 12, strength: 2, diligence: 3 },
    upgradeTargetId: 'human_guild_master',
  },
  {
    id: 'human_knight',
    name: '骑士',
    type: CardType.Human,
    level: 1,
    cost: cost(1), upkeep: upkeep(1),
    emoji: '🧝',
    description: '装备精良的战士，战斗岗位强力人选。3张合成圣骑士。',
    stats: { hp: 60, maxHp: 60, atk: 16, def: 12, intellect: 2, strength: 8, diligence: 3 },
    upgradeTargetId: 'human_paladin',
  },

  // ── Lv2 精英人物 ─────────────────────────────────────────────────────
  {
    id: 'human_master_blacksmith',
    name: '大师铁匠',
    type: CardType.Human,
    level: 2,
    cost: cost(2), upkeep: upkeep(2),
    emoji: '🔨',
    description: '炉火纯青的锻造技艺，制造速度是常人的两倍。3张合成工匠大师。',
    stats: { hp: 55, maxHp: 55, atk: 8, def: 8, intellect: 3, strength: 6, diligence: 22 },
    upgradeTargetId: 'human_grandmaster',
  },
  {
    id: 'human_guild_master',
    name: '行会长',
    type: CardType.Human,
    level: 2,
    cost: cost(2), upkeep: upkeep(2),
    emoji: '👑',
    description: '统领商会，售价加成显著，自带人脉吸引行人。3张合成商业大亨。',
    stats: { hp: 45, maxHp: 45, atk: 5, def: 4, intellect: 22, strength: 2, diligence: 5 },
    upgradeTargetId: 'human_tycoon',
  },
  {
    id: 'human_paladin',
    name: '圣骑士',
    type: CardType.Human,
    level: 2,
    cost: cost(2), upkeep: upkeep(2),
    emoji: '⚔️',
    description: '神佑之力，战斗能力大幅跃升，回血速度加倍。3张合成战争领主。',
    stats: { hp: 90, maxHp: 90, atk: 26, def: 20, intellect: 3, strength: 12, diligence: 4 },
    upgradeTargetId: 'human_warlord',
  },

  // ── Lv3 传奇人物 ─────────────────────────────────────────────────────
  {
    id: 'human_grandmaster',
    name: '工匠大师',
    type: CardType.Human,
    level: 3,
    cost: cost(3), upkeep: upkeep(3),
    emoji: '⚗️',
    description: '传世技艺，可解锁高阶配方，制造成品价值翻倍。3张合成传说锻造师。',
    stats: { hp: 70, maxHp: 70, atk: 10, def: 10, intellect: 5, strength: 8, diligence: 35 },
    upgradeTargetId: 'human_legend_smith',
  },
  {
    id: 'human_tycoon',
    name: '商业大亨',
    type: CardType.Human,
    level: 3,
    cost: cost(3), upkeep: upkeep(3),
    emoji: '💎',
    description: '富可敌国，商店收益达到极限，每月为城镇带来额外税收。3张合成传说大亨。',
    stats: { hp: 55, maxHp: 55, atk: 6, def: 5, intellect: 35, strength: 3, diligence: 6 },
    upgradeTargetId: 'human_legend_tycoon',
  },
  {
    id: 'human_warlord',
    name: '战争领主',
    type: CardType.Human,
    level: 3,
    cost: cost(3), upkeep: upkeep(3),
    emoji: '🗡️',
    description: '战场之神，单骑可抗幼龙，战斗岗位最强人选。3张合成不朽战神。',
    stats: { hp: 140, maxHp: 140, atk: 42, def: 30, intellect: 3, strength: 18, diligence: 5 },
    upgradeTargetId: 'human_immortal',
  },

  // ── Lv4 史诗人物 ─────────────────────────────────────────────────────
  {
    id: 'human_legend_smith',
    name: '传说锻造师',
    type: CardType.Human,
    level: 4,
    cost: cost(4), upkeep: upkeep(4),
    emoji: '🌟',
    description: '名留史册的锻造宗师，产出的成品品质举世无双。3张合成神匠。',
    stats: { hp: 90, maxHp: 90, atk: 14, def: 14, intellect: 7, strength: 10, diligence: 55 },
    upgradeTargetId: 'human_divine_smith',
  },
  {
    id: 'human_legend_tycoon',
    name: '传说大亨',
    type: CardType.Human,
    level: 4,
    cost: cost(4), upkeep: upkeep(4),
    emoji: '👸',
    description: '富甲天下，商业帝国缔造者，每月行人数量大幅增加。3张合成神商。',
    stats: { hp: 70, maxHp: 70, atk: 8, def: 7, intellect: 55, strength: 4, diligence: 8 },
    upgradeTargetId: 'human_divine_merchant',
  },
  {
    id: 'human_immortal',
    name: '不朽战神',
    type: CardType.Human,
    level: 4,
    cost: cost(4), upkeep: upkeep(4),
    emoji: '🔱',
    description: '超越凡人极限，单枪匹马守护全城。3张合成神将。',
    stats: { hp: 220, maxHp: 220, atk: 65, def: 48, intellect: 4, strength: 28, diligence: 6 },
    upgradeTargetId: 'human_divine_warrior',
  },

  // ── Lv5 神话人物（终点，无升级目标）────────────────────────────────
  {
    id: 'human_divine_smith',
    name: '神匠',
    type: CardType.Human,
    level: 5,
    cost: cost(5), upkeep: upkeep(5),
    emoji: '⚡',
    description: '神明赐予的锻造之力，所制之物堪称神器，制造速度无人能及。',
    stats: { hp: 120, maxHp: 120, atk: 18, def: 18, intellect: 10, strength: 14, diligence: 80 },
  },
  {
    id: 'human_divine_merchant',
    name: '神商',
    type: CardType.Human,
    level: 5,
    cost: cost(5), upkeep: upkeep(5),
    emoji: '🏆',
    description: '掌控城镇经济命脉，商业收益突破天际，行人络绎不绝。',
    stats: { hp: 90, maxHp: 90, atk: 10, def: 9, intellect: 80, strength: 5, diligence: 10 },
  },
  {
    id: 'human_divine_warrior',
    name: '神将',
    type: CardType.Human,
    level: 5,
    cost: cost(5), upkeep: upkeep(5),
    emoji: '🌠',
    description: '降临凡间的战神化身，任何怪物在其面前都不堪一击。',
    stats: { hp: 350, maxHp: 350, atk: 100, def: 75, intellect: 5, strength: 45, diligence: 8 },
  },

  // ══════════════════════════════════════════════════════════════════════
  // 人物卡 · 彩蛋卡（不可再升级，特殊合成产物）
  // ══════════════════════════════════════════════════════════════════════

  {
    id: 'human_mage',
    name: '法师',
    type: CardType.Human,
    level: 1,
    cost: cost(1), upkeep: upkeep(1),
    emoji: '🧙',
    description: '【彩蛋】博学多识的全能型人才，各岗位均有不错加成。由Lv0人物合成时10%概率获得。',
    stats: { hp: 40, maxHp: 40, atk: 10, def: 5, intellect: 10, strength: 5, diligence: 10 },
  },
  {
    id: 'human_sage',
    name: '圣贤',
    type: CardType.Human,
    level: 2,
    cost: cost(2), upkeep: upkeep(2),
    emoji: '🔮',
    description: '【彩蛋】智慧超群，商店和制造均达极致，但不擅长战斗。由Lv1人物合成时10%概率获得。',
    stats: { hp: 40, maxHp: 40, atk: 10, def: 4, intellect: 20, strength: 5, diligence: 20 },
  },
  {
    id: 'human_hero',
    name: '英雄',
    type: CardType.Human,
    level: 3,
    cost: cost(3), upkeep: upkeep(3),
    emoji: '🦸',
    description: '【彩蛋】传奇冒险家，战斗力惊人且全属性均衡。由Lv2人物合成时10%概率获得。',
    stats: { hp: 120, maxHp: 120, atk: 40, def: 25, intellect: 12, strength: 20, diligence: 15 },
  },
  {
    id: 'human_dragonborn',
    name: '龙裔',
    type: CardType.Human,
    level: 4,
    cost: cost(4), upkeep: upkeep(4),
    emoji: '🐲',
    description: '【彩蛋】龙族血脉觉醒，各项能力全面碾压同等级卡牌。由Lv3人物合成时10%概率获得。',
    stats: { hp: 200, maxHp: 200, atk: 60, def: 40, intellect: 20, strength: 30, diligence: 25 },
  },
  {
    id: 'human_demigod',
    name: '半神',
    type: CardType.Human,
    level: 5,
    cost: cost(5), upkeep: upkeep(5),
    emoji: '✨',
    description: '【彩蛋】神明之子降临，全属性傲视群雄，是城镇最强的守护者。由Lv4人物合成时10%概率获得。',
    stats: { hp: 400, maxHp: 400, atk: 110, def: 80, intellect: 50, strength: 50, diligence: 50 },
  },

  // ══════════════════════════════════════════════════════════════════════
  // 怪物卡 · 路线A：野兽系
  // ══════════════════════════════════════════════════════════════════════

  {
    id: 'monster_rat',
    name: '老鼠',
    type: CardType.Monster,
    level: 0,
    cost: cost(0), upkeep: 0,
    emoji: '🐀',
    description: '微小的威胁，掉落鼠皮，几乎不具攻击性。3张合成野狼。',
    stats: { hp: 15, maxHp: 15, atk: 4, def: 1, rarity: 1, aggression: 4, strength: 1,
             lootId: 'loot_rat_hide', lootQtyMin: 1, lootQtyMax: 8 },
    upgradeTargetId: 'monster_wolf',
  },
  {
    id: 'monster_wolf',
    name: '野狼',
    type: CardType.Monster,
    level: 0,
    cost: cost(0), upkeep: 0,
    emoji: '🐺',
    description: '常见的威胁，攻击性一般，掉落狼牙。3张合成巨魔。',
    stats: { hp: 25, maxHp: 25, atk: 8, def: 3, rarity: 2, aggression: 3, strength: 3,
             lootId: 'loot_wolf_fang', lootQtyMin: 3, lootQtyMax: 5 },
    upgradeTargetId: 'monster_troll',
  },
  {
    id: 'monster_troll',
    name: '巨魔',
    type: CardType.Monster,
    level: 1,
    cost: cost(1), upkeep: 0,
    emoji: '👹',
    description: '强壮的怪物，掉落魔晶，攻城倒计时较短。3张合成幼龙。',
    stats: { hp: 50, maxHp: 50, atk: 15, def: 8, rarity: 4, aggression: 2, strength: 6,
             lootId: 'loot_troll_gem', lootQtyMin: 4, lootQtyMax: 5 },
    upgradeTargetId: 'monster_dragon',
  },
  {
    id: 'monster_harpy',
    name: '鸟妖',
    type: CardType.Monster,
    level: 1,
    cost: cost(1), upkeep: 0,
    emoji: '🦅',
    description: '快速且具侵略性，频繁骚扰城镇，掉落妖羽。3张合成幼龙。',
    stats: { hp: 35, maxHp: 35, atk: 12, def: 4, rarity: 3, aggression: 1, strength: 4,
             lootId: 'loot_harpy_feather', lootQtyMin: 3, lootQtyMax: 7 },
    upgradeTargetId: 'monster_dragon',
  },
  {
    id: 'monster_dragon',
    name: '幼龙',
    type: CardType.Monster,
    level: 2,
    cost: cost(2), upkeep: 0,
    emoji: '🐉',
    description: '极稀有的宝藏猎物，掉落龙鳞，侵略性极强。3张合成远古龙。',
    stats: { hp: 100, maxHp: 100, atk: 25, def: 15, rarity: 8, aggression: 1, strength: 10,
             lootId: 'loot_dragon_scale', lootQtyMin: 2, lootQtyMax: 3 },
    upgradeTargetId: 'monster_ancient_dragon',
  },
  {
    id: 'monster_ancient_dragon',
    name: '远古龙',
    type: CardType.Monster,
    level: 3,
    cost: cost(3), upkeep: 0,
    emoji: '🔥',
    description: '传说中的毁灭者，掉落远古龙鳞，是野兽系的最强形态。3张合成龙王。',
    stats: { hp: 250, maxHp: 250, atk: 50, def: 30, rarity: 15, aggression: 1, strength: 20,
             lootId: 'loot_ancient_scale', lootQtyMin: 1, lootQtyMax: 2 },
    upgradeTargetId: 'monster_dragon_king',
  },
  {
    id: 'monster_dragon_king',
    name: '龙王',
    type: CardType.Monster,
    level: 4,
    cost: cost(4), upkeep: 0,
    emoji: '👁️',
    description: '万龙之王，掌控烈焰与风暴，掉落龙王宝珠。3张合成原初神龙。',
    stats: { hp: 500, maxHp: 500, atk: 90, def: 55, rarity: 25, aggression: 1, strength: 35,
             lootId: 'loot_dragon_orb', lootQtyMin: 1, lootQtyMax: 2 },
    upgradeTargetId: 'monster_primordial_dragon',
  },
  {
    id: 'monster_primordial_dragon',
    name: '原初神龙',
    type: CardType.Monster,
    level: 5,
    cost: cost(5), upkeep: 0,
    emoji: '🌋',
    description: '世界诞生时便存在的神龙，掉落创世龙晶，是野兽系终点。',
    stats: { hp: 1000, maxHp: 1000, atk: 160, def: 100, rarity: 50, aggression: 1, strength: 60,
             lootId: 'loot_genesis_crystal', lootQtyMin: 1, lootQtyMax: 2 },
  },

  // ══════════════════════════════════════════════════════════════════════
  // 怪物卡 · 路线B：亡灵系
  // ══════════════════════════════════════════════════════════════════════

  {
    id: 'monster_skeleton',
    name: '骷髅',
    type: CardType.Monster,
    level: 0,
    cost: cost(0), upkeep: 0,
    emoji: '💀',
    description: '防御为零的亡灵，战士极易击败，掉落白骨。3张合成骷髅骑士。',
    stats: { hp: 12, maxHp: 12, atk: 3, def: 0, rarity: 1, aggression: 5, strength: 1,
             lootId: 'loot_bone', lootQtyMin: 3, lootQtyMax: 5 },
    upgradeTargetId: 'monster_skeleton_knight',
  },
  {
    id: 'monster_slime',
    name: '史莱姆',
    type: CardType.Monster,
    level: 0,
    cost: cost(0), upkeep: 0,
    emoji: '🫧',
    description: '侵略性极低，几乎不主动攻城，掉落史莱姆核，适合挂机收材料。3张合成毒液史莱姆。',
    stats: { hp: 20, maxHp: 20, atk: 2, def: 2, rarity: 1, aggression: 6, strength: 1,
             lootId: 'loot_slime_core', lootQtyMin: 1, lootQtyMax: 8 },
    upgradeTargetId: 'monster_poison_slime',
  },
  {
    id: 'monster_skeleton_knight',
    name: '骷髅骑士',
    type: CardType.Monster,
    level: 1,
    cost: cost(1), upkeep: 0,
    emoji: '🦴',
    description: '持剑的亡灵骑士，防御极高但HP一般，掉落诅咒骨。3张合成巫妖。',
    stats: { hp: 45, maxHp: 45, atk: 12, def: 16, rarity: 4, aggression: 3, strength: 5,
             lootId: 'loot_cursed_bone', lootQtyMin: 2, lootQtyMax: 5 },
    upgradeTargetId: 'monster_lich',
  },
  {
    id: 'monster_poison_slime',
    name: '毒液史莱姆',
    type: CardType.Monster,
    level: 1,
    cost: cost(1), upkeep: 0,
    emoji: '☣️',
    description: '进化后的史莱姆，毒素腐蚀防甲，掉落魔法凝胶。3张合成巫妖。',
    stats: { hp: 60, maxHp: 60, atk: 10, def: 6, rarity: 3, aggression: 4, strength: 4,
             lootId: 'loot_magic_gel', lootQtyMin: 2, lootQtyMax: 4 },
    upgradeTargetId: 'monster_lich',
  },
  {
    id: 'monster_lich',
    name: '巫妖',
    type: CardType.Monster,
    level: 2,
    cost: cost(2), upkeep: 0,
    emoji: '🧟',
    description: '强大的亡灵法师，掉落黑魔晶，是亡灵系的中期强敌。3张合成死灵君主。',
    stats: { hp: 120, maxHp: 120, atk: 30, def: 12, rarity: 8, aggression: 2, strength: 10,
             lootId: 'loot_dark_gem', lootQtyMin: 1, lootQtyMax: 3 },
    upgradeTargetId: 'monster_death_lord',
  },
  {
    id: 'monster_death_lord',
    name: '死灵君主',
    type: CardType.Monster,
    level: 3,
    cost: cost(3), upkeep: 0,
    emoji: '☠️',
    description: '统领亡灵大军，掉落虚空精华，对城镇构成严重威胁。3张合成虚空之神。',
    stats: { hp: 300, maxHp: 300, atk: 55, def: 25, rarity: 15, aggression: 1, strength: 20,
             lootId: 'loot_void_essence', lootQtyMin: 1, lootQtyMax: 3 },
    upgradeTargetId: 'monster_void_god',
  },
  {
    id: 'monster_void_god',
    name: '虚空之神',
    type: CardType.Monster,
    level: 4,
    cost: cost(4), upkeep: 0,
    emoji: '🌑',
    description: '来自虚空的古老神明，掌控死亡与黑暗，掉落虚空之心。3张合成终焉之主。',
    stats: { hp: 600, maxHp: 600, atk: 100, def: 60, rarity: 25, aggression: 1, strength: 38,
             lootId: 'loot_void_heart', lootQtyMin: 1, lootQtyMax: 2 },
    upgradeTargetId: 'monster_end_bringer',
  },
  {
    id: 'monster_end_bringer',
    name: '终焉之主',
    type: CardType.Monster,
    level: 5,
    cost: cost(5), upkeep: 0,
    emoji: '🕳️',
    description: '世界终结的化身，掌握毁灭一切的力量，掉落终焉碎片，亡灵系终点。',
    stats: { hp: 1200, maxHp: 1200, atk: 180, def: 110, rarity: 50, aggression: 1, strength: 65,
             lootId: 'loot_end_shard', lootQtyMin: 1, lootQtyMax: 2 },
  },

  // ══════════════════════════════════════════════════════════════════════
  // 怪物卡 · 彩蛋卡
  // ══════════════════════════════════════════════════════════════════════

  {
    id: 'monster_mutant',
    name: '变异体',
    type: CardType.Monster,
    level: 1,
    cost: cost(1), upkeep: 0,
    emoji: '👾',
    description: '【彩蛋】基因突变的神秘生物，HP极高但攻击力低，掉落混合战利品。由Lv0怪物合成时10%概率获得。',
    stats: { hp: 80, maxHp: 80, atk: 6, def: 5, rarity: 5, aggression: 5, strength: 3,
             lootId: 'loot_mutant_tissue', lootQtyMin: 4, lootQtyMax: 8 },
  },
  {
    id: 'monster_chaos_beast',
    name: '混沌魔兽',
    type: CardType.Monster,
    level: 2,
    cost: cost(2), upkeep: 0,
    emoji: '🌀',
    description: '【彩蛋】混沌能量孕育的怪物，侵略性最高(aggression=1)，掉落混沌晶核。由Lv1怪物合成时10%概率获得。',
    stats: { hp: 150, maxHp: 150, atk: 35, def: 8, rarity: 10, aggression: 1, strength: 14,
             lootId: 'loot_chaos_crystal', lootQtyMin: 2, lootQtyMax: 6 },
  },
  {
    id: 'monster_abyss_lord',
    name: '深渊领主',
    type: CardType.Monster,
    level: 3,
    cost: cost(3), upkeep: 0,
    emoji: '🕸️',
    description: '【彩蛋】深渊中最强的存在，全属性均超越同等级怪物，掉落深渊精髓。由Lv2怪物合成时10%概率获得。',
    stats: { hp: 400, maxHp: 400, atk: 70, def: 35, rarity: 20, aggression: 1, strength: 25,
             lootId: 'loot_abyss_essence', lootQtyMin: 2, lootQtyMax: 3 },
  },
  {
    id: 'monster_primordial',
    name: '原初神兽',
    type: CardType.Monster,
    level: 4,
    cost: cost(4), upkeep: 0,
    emoji: '🌟',
    description: '【彩蛋】远古时代的神话生物，力量媲美神明，掉落原初精华。由Lv3怪物合成时10%概率获得。',
    stats: { hp: 800, maxHp: 800, atk: 120, def: 75, rarity: 35, aggression: 1, strength: 45,
             lootId: 'loot_primordial_essence', lootQtyMin: 1, lootQtyMax: 2 },
  },
  {
    id: 'monster_world_ender',
    name: '终焉之兽',
    type: CardType.Monster,
    level: 5,
    cost: cost(5), upkeep: 0,
    emoji: '💥',
    description: '【彩蛋】存在本身即是终结，全游戏最强怪物，掌握它意味着挑战极限。由Lv4怪物合成时10%概率获得。',
    stats: { hp: 2000, maxHp: 2000, atk: 250, def: 150, rarity: 100, aggression: 1, strength: 80,
             lootId: 'loot_world_shard', lootQtyMin: 1, lootQtyMax: 2 },
  },

  // ══════════════════════════════════════════════════════════════════════
  // 建筑卡（Lv2起，3级城镇解锁；Lv3起，4级城镇解锁；依此类推）
  // ══════════════════════════════════════════════════════════════════════

  // ── Lv2 基础建筑（3级城镇解锁）──────────────────────────────────────
  {
    id: 'building_stall',
    name: '小摊位',
    type: CardType.Building,
    level: 2,
    cost: cost(2), upkeep: upkeep(2),
    emoji: '🏪',
    description: '简易商店摊位，增加行人购买意愿。月末售价×1.3。（3级城镇解锁）',
    stats: { capacity: 1, bonus: 1.3 },
  },
  {
    id: 'building_workshop',
    name: '工坊',
    type: CardType.Building,
    level: 2,
    cost: cost(2), upkeep: upkeep(2),
    emoji: '🏗️',
    description: '基础制造场所，提升制造产出速率×1.4。（3级城镇解锁）',
    stats: { capacity: 2, bonus: 1.4 },
  },
  {
    id: 'building_inn',
    name: '旅馆',
    type: CardType.Building,
    level: 2,
    cost: cost(2), upkeep: upkeep(2),
    emoji: '🏨',
    description: '吸引更多行人驻留，每月额外行人+3。（3级城镇解锁）',
    stats: { capacity: 3, bonus: 1.5 },
  },
  {
    id: 'building_barracks',
    name: '兵营',
    type: CardType.Building,
    level: 2,
    cost: cost(2), upkeep: upkeep(2),
    emoji: '🏰',
    description: '战斗人物攻击力+4，战士可在此回血。（3级城镇解锁）',
    stats: { capacity: 4, bonus: 1.4 },
  },

  // ── Lv3 强化建筑（4级城镇解锁）──────────────────────────────────────
  {
    id: 'building_market',
    name: '大市集',
    type: CardType.Building,
    level: 3,
    cost: cost(3), upkeep: upkeep(3),
    emoji: '🛍️',
    description: '繁华的市集，售价×1.8，每月额外行人+8。（4级城镇解锁）',
    stats: { capacity: 5, bonus: 1.8 },
  },
  {
    id: 'building_forge',
    name: '大锻造炉',
    type: CardType.Building,
    level: 3,
    cost: cost(3), upkeep: upkeep(3),
    emoji: '⚙️',
    description: '高效的制造工坊，制造速率×2.5，可解锁高阶配方。（4级城镇解锁）',
    stats: { capacity: 6, bonus: 2.5 },
  },
  {
    id: 'building_grand_inn',
    name: '大旅馆',
    type: CardType.Building,
    level: 3,
    cost: cost(3), upkeep: upkeep(3),
    emoji: '🏩',
    description: '豪华旅馆，每月额外行人+10，同时降低全体维护费效果。（4级城镇解锁）',
    stats: { capacity: 8, bonus: 1.5 },
  },
  {
    id: 'building_fortress',
    name: '要塞',
    type: CardType.Building,
    level: 3,
    cost: cost(3), upkeep: upkeep(3),
    emoji: '🛡️',
    description: '战士ATK+10，战斗人物受伤后恢复时间减半。（4级城镇解锁）',
    stats: { capacity: 10, bonus: 1.4 },
  },

  // ── Lv4 高阶建筑（5级城镇解锁）──────────────────────────────────────
  {
    id: 'building_trading_post',
    name: '贸易中心',
    type: CardType.Building,
    level: 4,
    cost: cost(4), upkeep: upkeep(4),
    emoji: '🏦',
    description: '跨城贸易，售价×2.5，行人数量大幅增加+15/月。（5级城镇解锁）',
    stats: { capacity: 12, bonus: 2.5 },
  },
  {
    id: 'building_alchemy_lab',
    name: '炼金工坊',
    type: CardType.Building,
    level: 4,
    cost: cost(4), upkeep: upkeep(4),
    emoji: '⚗️',
    description: '高端炼金实验室，制造速率×4，解锁最高阶配方。（5级城镇解锁）',
    stats: { capacity: 12, bonus: 4.0 },
  },
  {
    id: 'building_palace',
    name: '宫殿',
    type: CardType.Building,
    level: 4,
    cost: cost(4), upkeep: upkeep(4),
    emoji: '🏯',
    description: '金碧辉煌的宫殿，行人+20/月，大幅提升城镇税收。（5级城镇解锁）',
    stats: { capacity: 15, bonus: 2.0 },
  },
  {
    id: 'building_citadel',
    name: '城塞',
    type: CardType.Building,
    level: 4,
    cost: cost(4), upkeep: upkeep(4),
    emoji: '⚔️',
    description: '坚不可摧的军事要塞，战士ATK+20，DEF+10，免疫普通怪物攻城惩罚。（5级城镇解锁）',
    stats: { capacity: 20, bonus: 1.8 },
  },

  // ── Lv5 神话建筑（6级城镇解锁）──────────────────────────────────────
  {
    id: 'building_world_market',
    name: '世界市场',
    type: CardType.Building,
    level: 5,
    cost: cost(5), upkeep: upkeep(5),
    emoji: '🌐',
    description: '连通世界各地的商业枢纽，售价×4，行人+30/月。（6级城镇解锁）',
    stats: { capacity: 25, bonus: 4.0 },
  },
  {
    id: 'building_divine_forge',
    name: '神圣锻造台',
    type: CardType.Building,
    level: 5,
    cost: cost(5), upkeep: upkeep(5),
    emoji: '🌟',
    description: '神明赐予的锻造之地，制造速率×8，所有成品价值翻倍。（6级城镇解锁）',
    stats: { capacity: 25, bonus: 8.0 },
  },
  {
    id: 'building_divine_palace',
    name: '神圣宫殿',
    type: CardType.Building,
    level: 5,
    cost: cost(5), upkeep: upkeep(5),
    emoji: '🏛️',
    description: '城镇的神圣象征，行人+40/月，税收×2，是6级城镇的终极建筑。（6级城镇解锁）',
    stats: { capacity: 30, bonus: 2.0 },
  },
  {
    id: 'building_eternal_citadel',
    name: '永恒城塞',
    type: CardType.Building,
    level: 5,
    cost: cost(5), upkeep: upkeep(5),
    emoji: '⚡',
    description: '无法被攻破的传说要塞，战士ATK+40，怪物攻城永远不会造成税收惩罚。（6级城镇解锁）',
    stats: { capacity: 40, bonus: 2.5 },
  },

  // ══════════════════════════════════════════════════════════════════════
  // 魔法卡（Lv1~Lv4，随城镇等级解锁）
  // ══════════════════════════════════════════════════════════════════════

  // ── Lv1 基础魔法（2级城镇解锁）──────────────────────────────────────
  {
    id: 'magic_blessing',
    name: '祝福',
    type: CardType.Magic,
    level: 1,
    cost: cost(1), upkeep: upkeep(1),
    emoji: '✨',
    description: '场上所有人物攻击力+3。',
    stats: { effect: 'buff_human_atk', power: 3 },
  },
  {
    id: 'magic_curse',
    name: '诅咒',
    type: CardType.Magic,
    level: 1,
    cost: cost(1), upkeep: upkeep(1),
    emoji: '💀',
    description: '场上所有怪物攻击力-3。',
    stats: { effect: 'debuff_monster_atk', power: 3 },
  },
  {
    id: 'magic_market',
    name: '市集魔法',
    type: CardType.Magic,
    level: 1,
    cost: cost(1), upkeep: upkeep(1),
    emoji: '🎪',
    description: '每月额外增加5名行人。',
    stats: { effect: 'extra_passersby', power: 5 },
  },
  {
    id: 'magic_fortify',
    name: '强化术',
    type: CardType.Magic,
    level: 1,
    cost: cost(1), upkeep: upkeep(1),
    emoji: '🛡️',
    description: '场上所有人物防御力+4。',
    stats: { effect: 'buff_human_def', power: 4 },
  },

  // ── Lv2 进阶魔法（3级城镇解锁）──────────────────────────────────────
  {
    id: 'magic_prosperity',
    name: '繁荣咒',
    type: CardType.Magic,
    level: 2,
    cost: cost(2), upkeep: upkeep(2),
    emoji: '🌟',
    description: '月末税收+50%，城镇繁荣昌盛。',
    stats: { effect: 'tax_bonus', power: 50 },
  },
  {
    id: 'magic_haste',
    name: '时间加速',
    type: CardType.Magic,
    level: 2,
    cost: cost(2), upkeep: upkeep(2),
    emoji: '⏩',
    description: '全体制造速率×1.5，时间在工匠手中加速流逝。',
    stats: { effect: 'craft_haste', power: 50 },
  },
  {
    id: 'magic_terror',
    name: '恐惧术',
    type: CardType.Magic,
    level: 2,
    cost: cost(2), upkeep: upkeep(2),
    emoji: '😱',
    description: '所有场上怪物侵略倒计时+2月，延迟敌人进攻。',
    stats: { effect: 'delay_aggression', power: 2 },
  },
  {
    id: 'magic_battle_cry',
    name: '战争号角',
    type: CardType.Magic,
    level: 2,
    cost: cost(2), upkeep: upkeep(2),
    emoji: '📯',
    description: '所有战斗人物ATK×1.5，战士们奋勇杀敌。',
    stats: { effect: 'combat_fury', power: 50 },
  },

  // ── Lv3 高阶魔法（4级城镇解锁）──────────────────────────────────────
  {
    id: 'magic_divine_protection',
    name: '神圣护佑',
    type: CardType.Magic,
    level: 3,
    cost: cost(3), upkeep: upkeep(3),
    emoji: '🌈',
    description: '全体人物DEF×2，神明降下庇护。',
    stats: { effect: 'divine_def', power: 100 },
  },
  {
    id: 'magic_golden_age',
    name: '黄金时代',
    type: CardType.Magic,
    level: 3,
    cost: cost(3), upkeep: upkeep(3),
    emoji: '💰',
    description: '月末行人数量×2，经济进入爆发期。',
    stats: { effect: 'golden_passersby', power: 100 },
  },
  {
    id: 'magic_master_craft',
    name: '大师工艺',
    type: CardType.Magic,
    level: 3,
    cost: cost(3), upkeep: upkeep(3),
    emoji: '🔧',
    description: '制造成品售价×1.5，工艺水准提升。',
    stats: { effect: 'craft_price_bonus', power: 50 },
  },

  // ── Lv4 神话魔法（5级城镇解锁）──────────────────────────────────────
  {
    id: 'magic_omnipotence',
    name: '全能祝福',
    type: CardType.Magic,
    level: 4,
    cost: cost(4), upkeep: upkeep(4),
    emoji: '🌠',
    description: '全体人物所有属性+10，神明的全面恩赐。',
    stats: { effect: 'all_buff', power: 10 },
  },
  {
    id: 'magic_eternity',
    name: '永恒诅咒',
    type: CardType.Magic,
    level: 4,
    cost: cost(4), upkeep: upkeep(4),
    emoji: '⚫',
    description: '所有怪物ATK-15，DEF-10，永恒的诅咒削弱敌人。',
    stats: { effect: 'great_debuff', power: 15 },
  },
];

/** 按城镇等级过滤可用卡池：城镇 x 级可购买等级 < x 的所有卡牌 */
export function getCardPool(townLevel: number): CardDefinition[] {
  return CARD_DB.filter(c => c.level < townLevel);
}

/**
 * 生成一批商店卡牌（允许重复，有放回随机抽取）
 * 彩蛋卡不在商店出现，只能通过合成获得
 */
export function drawShopCards(townLevel: number, count: number): CardDefinition[] {
  // 排除彩蛋卡（通过description包含"【彩蛋】"判断，或直接用ID白名单）
  const WILDCARD_IDS = new Set([
    'human_mage','human_sage','human_hero','human_dragonborn','human_demigod',
    'monster_mutant','monster_chaos_beast','monster_abyss_lord',
    'monster_primordial','monster_world_ender',
  ]);
  const pool = CARD_DB.filter(c => c.level < townLevel && !WILDCARD_IDS.has(c.id));
  if (pool.length === 0) return [];
  const result: CardDefinition[] = [];
  for (let i = 0; i < count; i++) {
    result.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  return result;
}
