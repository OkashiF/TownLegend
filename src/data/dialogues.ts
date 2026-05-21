// ─── 角色头顶气泡台词数据 ─────────────────────────────────────────────────────

export type DialogueScene =
  | 'chase'
  | 'fight'
  | 'victory'
  | 'defeat'
  | 'craftStart'
  | 'craftDone'
  | 'passerby'
  | 'restock'
  | 'saleDone'
  | 'siegeStart'
  | 'siegeEnd'
  | 'assignCombat'
  | 'assignCraft'
  | 'assignShop';

export const DIALOGUES: Record<DialogueScene, string[]> = {
  chase: [
    '别跑！',
    '来受死！',
    '为城镇而战！',
    '抓住它！',
    '冲啊！',
  ],
  fight: [
    '吃我一剑！',
    '看招！',
    '决一死战！',
    '绝不退让！',
    '嘿哈！',
  ],
  victory: [
    '胜利！',
    '就这？',
    '守卫成功！',
    '下一个！',
    '为镇主！',
  ],
  defeat: [
    '啊不好了…',
    '我不行了…',
    '撤退！',
    '好痛…',
    '下次一定！',
  ],
  craftStart: [
    '开工！',
    '让我来！',
    '好材料！',
    '干活了！',
    '全力以赴！',
  ],
  craftDone: [
    '完工啦！',
    '精品出炉！',
    '完美！',
    '又一件！',
    '好活儿！',
  ],
  passerby: [
    '东西不错！',
    '能便宜点吗？',
    '好货！',
    '带一个！',
    '来逛逛！',
  ],
  restock: [
    '新货到了！',
    '快来看！',
    '补货啦！',
    '货架满了！',
    '有好东西！',
  ],
  saleDone: [
    '谢惠顾！',
    '请慢走！',
    '再来啊！',
    '卖出去了！',
    '生意不错！',
  ],
  siegeStart: [
    '怪物来了！',
    '城镇告急！',
    '快逃！',
    '完了完了！',
    '敌袭！',
  ],
  siegeEnd: [
    '终于安全了',
    '怪物退了！',
    '守住了！',
    '可以喘气了',
    '太险了！',
  ],
  assignCombat: [
    '为城镇而战！',
    '我来守卫！',
    '保卫家园！',
    '战斗是我的使命！',
    '敌人休想过来！',
  ],
  assignCraft: [
    '我来制造！',
    '工坊开工！',
    '精益求精！',
    '干活干活！',
    '交给我！',
  ],
  assignShop: [
    '欢迎光临！',
    '我来招待！',
    '最实惠的价格！',
    '生意兴隆！',
    '保证满意！',
  ],
};

export function getDialogue(scene: DialogueScene): string {
  const lines = DIALOGUES[scene];
  return lines[Math.floor(Math.random() * lines.length)];
}
