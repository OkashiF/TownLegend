import Phaser from 'phaser';
import { store, LogEntry, defById, TICKS_PER_MONTH, YearSummary, AchievementDef } from '../systems/store';
import { CardType, JobType, CardInstance, CardDefinition, HumanStats, MonsterStats, SpawnZone } from '../types';
import { ZoneConfig, computeZoneConfig } from '../config/zones';
import {
  generateAllTextures, spriteKeyForCard,
  drawPasserby,
  drawShopBuilding, drawCraftBuilding, drawCombatBuilding, drawTownHall,
  bldgTexSize,
} from '../utils/sprites';

const MS_PER_TICK = 200;

const WANDER      = 40;
const GROUND_FRAC = 0.62;

const HUMAN_SPEED   = 20;
const MONSTER_SPEED = 14;
const HEAL_SPEED    = 14;

const HUMAN_SCALE   = 0.55;
const MONSTER_SCALE = 0.65;

const ATTACK_COOLDOWN = 8;
const ATTACK_RANGE    = 60;
const CHASE_RANGE     = 800;

type WarriorState    = 'patrol' | 'chase' | 'fight' | 'loot' | 'return' | 'heal';
type MonsterBehavior = 'waiting' | 'marching' | 'fighting' | 'attacking' | 'retreating';

interface LootDrop {
  id: string;
  worldX: number; worldY: number;
  itemId: string; qty: number;
  sprite: Phaser.GameObjects.Text;
}

interface FieldSprite {
  instanceId: string;
  sprite:   Phaser.GameObjects.Image;
  label:    Phaser.GameObjects.Text;
  hpBar:    Phaser.GameObjects.Graphics;
  craftBar: Phaser.GameObjects.Graphics;
  x: number; y: number;
  targetX: number; targetY: number;
  bobPhase: number;
  isStatic: boolean;
  warriorState:    WarriorState;
  attackCooldown:  number;
  combatTarget:    string | null;
  lootTarget:      string | null;
  patrolDir:       1 | -1;
  hitFlashTimer:   number;
  shopServeTarget: { x: number; timer: number } | null;
  monsterBehavior: MonsterBehavior;
  knockbackX:      number;
  knockbackTimer:  number;
  dyingTimer:      number;
  // ── Bug修复：标记该sprite是否为"临时死亡占位"，阻止syncSprites重新创建 ──
  isDead: boolean;
}

interface PasserbySprite {
  img: Phaser.GameObjects.Image;
  x: number; speed: number; groundY: number;
  hasTraded: boolean;
}

interface DenSprite {
  instanceId: string;
  worldX: number;
  img: Phaser.GameObjects.Graphics;
  restPulse: Phaser.GameObjects.Graphics;
  pulseTimer: number;
  occupantId: string | null;
}

export class TownScene extends Phaser.Scene {
  private bgLayer!:     Phaser.GameObjects.Container;
  private bldgLayer!:   Phaser.GameObjects.Container;
  private denLayer!:    Phaser.GameObjects.Container;
  private entityLayer!: Phaser.GameObjects.Container;
  private fxLayer!:     Phaser.GameObjects.Container;
  private labelLayer!:  Phaser.GameObjects.Container;

  private zoneConfig!: ZoneConfig;

  /** UIController sets this true during card drag to suppress camera movement */
  isCardDragActive = false;
  private dropZoneOverlays: Phaser.GameObjects.GameObject[] = [];

  private sprites:      Map<string, FieldSprite> = new Map();
  private lootDrops:    Map<string, LootDrop>    = new Map();
  private passerbyList: PasserbySprite[] = [];
  private dens:         DenSprite[]      = [];
  private sideLogEl!:   HTMLElement;

  private groundY = 0;
  private sceneH  = 0;

  private isDragging = false;
  private dragStartX = 0;
  private dragCamX   = 0;

  private tickAccum   = 0;
  private lootDropSeq = 0;
  private hiddenAt    = 0;

  constructor() { super({ key: 'TownScene' }); }

  create() {
    this.sceneH  = this.scale.height;
    this.groundY = this.sceneH * GROUND_FRAC;

    this.zoneConfig = computeZoneConfig(store.townLevel, store.segmentExpansions);

    generateAllTextures(this);

    this.bgLayer     = this.add.container(0, 0);
    this.bldgLayer   = this.add.container(0, 0);
    this.denLayer    = this.add.container(0, 0);
    this.entityLayer = this.add.container(0, 0);
    this.fxLayer     = this.add.container(0, 0);
    this.labelLayer  = this.add.container(0, 0);

    this.cameras.main.setBounds(0, 0, this.zoneConfig.worldWidth, this.sceneH);
    this.cameras.main.setBackgroundColor(0x3a6a2a);
    this.cameras.main.centerOn(this.zoneConfig.town, this.sceneH / 2);
    this.cameras.main.setZoom(1.0);

    this.setupCameraControls();
    this.buildBackground();
    this.buildZoneBuildings();
    this.buildSideLog();

    // ── 年度总结弹窗监听 ─────────────────────────────────────────────────────
    store.subscribe(evt => {
      if (evt === 'yearSummary' && store.lastYearSummary) {
        this.showYearlySummary(store.lastYearSummary);
      }
      if (evt === 'achievement') {
        const pending = store.takePendingAchievement();
        if (pending) this.showAchievementPopup(pending);
      }
    });

    // ── 区间扩张：平移受影响建筑坐标，扩展世界宽度，重绘视觉 ─────────────────
    store.subscribe(evt => {
      if (evt === 'zoneExpand') {
        const oldConfig = this.zoneConfig;
        this.zoneConfig = computeZoneConfig(store.townLevel, store.segmentExpansions);
        this.cameras.main.setBounds(0, 0, this.zoneConfig.worldWidth, this.sceneH);
        this.shiftBuildingFieldX(oldConfig, this.zoneConfig);
        this.rebuildWorldVisuals();
        this.syncSprites();
      }
    });

    // ── 城镇升级：更新区域配置并重绘世界视觉 ────────────────────────────────
    store.subscribe(evt => {
      if (evt === 'townLevelUp') {
        this.zoneConfig = computeZoneConfig(store.townLevel, store.segmentExpansions);
        this.cameras.main.setBounds(0, 0, this.zoneConfig.worldWidth, this.sceneH);
        this.rebuildWorldVisuals();
      }
    });

    // ── 轮回：立即清理场上精灵/巢穴/战利品，并恢复1级城镇视觉 ───────────────
    store.subscribe(evt => {
      if (evt === 'reincarnate') {
        // 强制销毁所有精灵（含正在播放死亡动画的）
        for (const sp of this.sprites.values()) {
          if (!sp.isDead || sp.dyingTimer > 0) {
            sp.sprite.destroy(); sp.label.destroy(); sp.hpBar.destroy(); sp.craftBar.destroy();
          }
        }
        this.sprites.clear();

        // 清理战利品掉落
        for (const drop of this.lootDrops.values()) drop.sprite.destroy();
        this.lootDrops.clear();

        // 清理巢穴精灵
        for (const den of this.dens) { den.img.destroy(); den.restPulse.destroy(); }
        this.dens = [];

        // 重置区域配置并重建1级城镇视觉
        this.zoneConfig = computeZoneConfig(store.townLevel, store.segmentExpansions);
        this.cameras.main.setBounds(0, 0, this.zoneConfig.worldWidth, this.sceneH);
        this.cameras.main.centerOn(this.zoneConfig.town, this.sceneH / 2);
        this.rebuildWorldVisuals();
      }
    });

    // ── 后台继续运行 ─────────────────────────────────────────────────────────
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.hiddenAt = Date.now();
      } else if (this.hiddenAt > 0) {
        const elapsed   = Date.now() - this.hiddenAt;
        const maxTicks  = 6 * TICKS_PER_MONTH;
        const catchUp   = Math.min(Math.floor(elapsed / MS_PER_TICK), maxTicks);
        for (let i = 0; i < catchUp; i++) {
          const { newLogs } = store.advanceTick();
          if (newLogs.length > 0) {
            for (const e of [...newLogs].reverse()) this.pushLogEntry(e);
          }
        }
        if (catchUp > 0) {
          this.syncSprites();
          this.syncDens();
        }
        this.hiddenAt = 0;
      }
    });

    store.subscribe(evt => {
      if (evt === 'field' || evt === 'upgrade' || evt === 'sell') {
        try { this.syncSprites(); } catch (e) { console.error('[sync]', e); }
      }
    });
    this.syncSprites();

    // Expose reference so UIController can access without circular imports
    (window as any).__townScene = this;
  }

  update(_t: number, delta: number) {
    this.tickAccum += delta;
    while (this.tickAccum >= MS_PER_TICK) {
      this.tickAccum -= MS_PER_TICK;
      this.doTick();
    }
    this.interpolate(delta / MS_PER_TICK);
    this.updatePasserby(delta / 1000);
    this.updateDens(delta);
  }

  private setupCameraControls() {
    const cam = this.cameras.main;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.isCardDragActive) return;
      this.isDragging = true;
      this.dragStartX = p.x;
      this.dragCamX   = cam.scrollX;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.isCardDragActive) return;
      if (!this.isDragging) return;
      const dx = (p.x - this.dragStartX) / cam.zoom;
      cam.scrollX = Phaser.Math.Clamp(this.dragCamX - dx, 0, this.zoneConfig.worldWidth - cam.width / cam.zoom);
    });
    this.input.on('pointerup', () => { this.isDragging = false; });
    this.input.on('wheel',
      (_p: Phaser.Input.Pointer, _gos: unknown, _dx: number, deltaY: number) => {
        cam.setZoom(Phaser.Math.Clamp(cam.zoom - deltaY * 0.001, 0.75, 1.5));
      }
    );
  }

  private doTick() {
    try {
      for (const sp of this.sprites.values()) {
        if (sp.hitFlashTimer > 0) sp.hitFlashTimer--;
        if (sp.knockbackTimer > 0) sp.knockbackTimer--;
        if (sp.shopServeTarget) {
          sp.shopServeTarget.timer--;
          if (sp.shopServeTarget.timer <= 0) sp.shopServeTarget = null;
        }
        if (sp.dyingTimer > 0) {
          sp.dyingTimer--;
          if (sp.dyingTimer === 0) {
            // 死亡动画结束：销毁Phaser对象，但保留Map条目（isDead=true）
            // 这样syncSprites看到instanceId已在Map中，不会重新创建sprite
            sp.sprite.destroy();
            sp.label.destroy();
            sp.hpBar.destroy();
            sp.craftBar.destroy();
            // 注意：不从sprites Map中删除，isDead标记阻止重新创建
          }
        }
      }

      this.runAI();
      const { newLogs } = store.advanceTick();
      if (newLogs.length > 0) {
        for (const e of [...newLogs].reverse()) this.pushLogEntry(e);
        this.syncSprites();
        this.syncDens();
      }

      const craftedEmoji = store.takeCraftedEmoji();
      if (craftedEmoji) {
        const craftWorker = store.field.find(c => {
          const d = defById(c.definitionId);
          return d.type === CardType.Human && c.jobAssignment === JobType.Craft && c.isActive;
        });
        if (craftWorker) {
          const sp = this.sprites.get(craftWorker.instanceId);
          if (sp) this.spawnBubble(sp.x, sp.y, craftedEmoji);
        }
      }

      if (store.tick % 24 === 0) this.maybeSpawnPasserby();
    } catch (e) {
      console.error('[doTick]', e);
    }
  }

  // ── 年度总结弹窗 ────────────────────────────────────────────────────────────
  private showYearlySummary(summary: YearSummary) {
    const existing = document.getElementById('yearly-summary-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'yearly-summary-modal';
    overlay.style.cssText = `
      position:fixed; inset:0; background:rgba(0,0,0,0.75);
      z-index:200; display:flex; align-items:center; justify-content:center;
      pointer-events:all;
    `;

    const netColor = summary.netBalance >= 0 ? '#60cc60' : '#cc4040';

    overlay.innerHTML = `
      <div style="
        background:rgba(20,12,5,0.97);
        border:2px solid #d4a017;
        border-radius:8px;
        padding:24px 32px;
        min-width:300px; max-width:420px;
        font-family:'Silkscreen',monospace;
        color:#f5e6c8;
      ">
        <div style="font-size:14px;color:#d4a017;text-align:center;margin-bottom:16px;letter-spacing:2px;">
          📜 第 ${summary.year} 年 年终总结
        </div>

        <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px;">
          ${this.summaryRow('💳 购买卡牌',  `${summary.cardsBought} 张`)}
          ${this.summaryRow('⬆️ 升级次数',  `${summary.upgradesDone} 次`)}
          ${this.summaryRow('💰 总收入',    `+${summary.totalIncome}💰`,   '#60cc60')}
          ${this.summaryRow('🏠 总支出',    `-${summary.totalExpenses}💰`, '#cc8040')}
          <div style="border-top:1px solid #5a3a1a;margin:4px 0;"></div>
          ${this.summaryRow('📊 年度盈余',  `${summary.netBalance >= 0 ? '+' : ''}${summary.netBalance}💰`, netColor)}
        </div>

        <button id="yearly-summary-close" style="
          display:block; width:100%;
          font-family:'Silkscreen',monospace; font-size:11px;
          background:#8b1a1a; color:#f5e6c8;
          border:1px solid #c04040; padding:8px;
          cursor:pointer; border-radius:3px;
        ">继续 →</button>
      </div>
    `;

    document.getElementById('game-container')!.appendChild(overlay);

    const closeBtn = document.getElementById('yearly-summary-close')!;
    const close = () => overlay.remove();
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  }

  private summaryRow(label: string, value: string, valueColor = '#f0c040'): string {
    return `<div style="display:flex;justify-content:space-between;align-items:center;">
      <span style="color:#9a7a50;font-size:10px;">${label}</span>
      <span style="color:${valueColor};font-size:11px;">${value}</span>
    </div>`;
  }

  private showAchievementPopup(def: AchievementDef): void {
    const existing = document.getElementById('achievement-popup');
    if (existing) existing.remove();

    const popup = document.createElement('div');
    popup.id = 'achievement-popup';
    popup.style.cssText = `
      position:fixed;
      top:70px; right:16px;
      background:rgba(20,12,5,0.97);
      border:2px solid #d4a017;
      border-radius:6px;
      padding:10px 16px;
      z-index:250;
      display:flex; align-items:center; gap:10px;
      font-family:'Silkscreen',monospace;
      color:#f5e6c8;
      min-width:220px; max-width:280px;
      box-shadow:0 4px 16px rgba(212,160,23,0.4);
      opacity:0;
      transition:opacity 0.3s;
    `;

    popup.innerHTML = `
      <div style="font-size:22px;flex-shrink:0;">${def.emoji}</div>
      <div style="display:flex;flex-direction:column;gap:2px;min-width:0;">
        <div style="font-size:8px;color:#d4a017;letter-spacing:1px;">🏆 成就解锁</div>
        <div style="font-size:10px;color:#f0c040;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${def.name}</div>
        <div style="font-size:8px;color:#9a7a50;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${def.description}</div>
      </div>
    `;

    const container = document.getElementById('game-container') ?? document.body;
    container.appendChild(popup);

    // 淡入
    this.time.delayedCall(50, () => { popup.style.opacity = '1'; });
    // 停留2秒后淡出移除
    this.time.delayedCall(2600, () => {
      popup.style.transition = 'opacity 0.6s';
      popup.style.opacity = '0';
      this.time.delayedCall(650, () => { popup.remove(); });
    });

    // 顶栏短暂闪烁提示（金色）
    const topBar = document.getElementById('top-bar');
    if (topBar) {
      const origBorder = topBar.style.borderBottomColor;
      const origBg     = topBar.style.background;
      topBar.style.borderBottomColor = '#d4a017';
      topBar.style.background = 'rgba(50,35,5,0.97)';
      this.time.delayedCall(1500, () => {
        topBar.style.borderBottomColor = origBorder;
        topBar.style.background        = origBg;
      });
    }
  }

  private flashWalls() {
    for (const wallX of [this.zoneConfig.wallLeft, this.zoneConfig.wallRight]) {
      const flash = this.add.graphics();
      this.fxLayer.add(flash);
      flash.fillStyle(0xff2020, 0.01);
      flash.fillRect(wallX - 60, this.groundY - 80, 120, 80);

      let alpha = 0.01;
      let dir   = 1;
      const step = () => {
        alpha += dir * 0.04;
        flash.clear();
        flash.fillStyle(0xff2020, Math.max(0, Math.min(0.4, alpha)));
        flash.fillRect(wallX - 60, this.groundY - 80, 120, 80);
        if (alpha >= 0.4) dir = -1;
        if (alpha <= 0) {
          flash.destroy();
          return;
        }
        this.time.delayedCall(50, step);
      };
      this.time.delayedCall(50, step);
    }
  }

  private runAI() {
    const gy = this.groundY;

    const activeMonsters = store.field.filter(c => {
      if (!c.definitionId) return false;
      return defById(c.definitionId).type === CardType.Monster && c.isActive;
    });

    const activeTownspeople = store.field.filter(c => {
      if (!c.definitionId) return false;
      const d = defById(c.definitionId);
      return d.type === CardType.Human && c.isActive;
    });

    for (const inst of store.field) {
      if (!inst?.definitionId) continue;
      const def = defById(inst.definitionId);
      if (def.name === '???') continue;
      const sp = this.sprites.get(inst.instanceId);
      // isDead sprite 不参与AI
      if (!sp || sp.dyingTimer > 0 || sp.isDead) continue;

      if (def.type === CardType.Human) {
        if (!inst.isActive) {
          sp.targetX = this.zoneConfig.town + (Math.random() - 0.5) * WANDER;
          sp.targetY = gy;
          sp.warriorState = 'patrol';
          sp.combatTarget = null;
          sp.lootTarget   = null;
          continue;
        }

        const job = inst.jobAssignment ?? JobType.Idle;

        if (job === JobType.Combat) {
          this.runWarriorAI(inst, sp, activeMonsters, activeTownspeople, gy);
        } else {
          const zoneX = job === JobType.Shop  ? this.zoneConfig.shop
                      : job === JobType.Craft ? this.zoneConfig.craft
                      : this.zoneConfig.town;
          if (job === JobType.Shop && sp.shopServeTarget) {
            sp.targetX = sp.shopServeTarget.x;
            sp.targetY = gy;
          } else if (Math.abs(sp.x - zoneX) > WANDER * 1.5 || Math.random() < 0.02) {
            sp.targetX = zoneX + (Math.random() - 0.5) * WANDER;
            sp.targetY = gy + (Math.random() - 0.5) * 6;
          }
          sp.combatTarget = null;
          sp.lootTarget   = null;
        }
      }

      if (def.type === CardType.Monster) {
        if (!inst.isActive) continue;
        this.runMonsterAI(inst, sp, activeTownspeople, gy);
      }
    }
  }

  private runWarriorAI(
    inst: CardInstance, sp: FieldSprite,
    monsters: CardInstance[], townspeople: CardInstance[], gy: number
  ) {
    const rs = inst.runtimeStats as HumanStats;

    if (sp.warriorState === 'heal') {
      sp.targetX = this.zoneConfig.barracks + (Math.random() - 0.5) * 30;
      sp.targetY = gy;
      const distToBarracks = Math.abs(sp.x - this.zoneConfig.barracks);
      if (distToBarracks < 50) {
        rs.hp = Math.min(rs.maxHp, rs.hp + Math.ceil(rs.maxHp / 40));
        if (rs.hp >= rs.maxHp) {
          rs.hp = rs.maxHp;
          sp.warriorState = 'patrol';
          this.spawnBubble(sp.x, sp.y, '💪');
        } else if (Math.random() < 0.05) {
          this.spawnBubble(sp.x, sp.y - 10, '❤️');
        }
      }
      if (monsters.length > 0) sp.warriorState = 'patrol';
      return;
    }

    if (sp.lootTarget) {
      const drop = this.lootDrops.get(sp.lootTarget);
      if (!drop) {
        sp.lootTarget = null; sp.warriorState = 'return';
      } else {
        sp.warriorState = 'loot';
        sp.targetX = drop.worldX; sp.targetY = drop.worldY;
        const dist = Math.hypot(sp.x - drop.worldX, sp.y - drop.worldY);
        if (dist < 24) {
          store.addItem(drop.itemId, 'loot', drop.qty);
          store.emit('inventory');
          drop.sprite.destroy();
          this.lootDrops.delete(sp.lootTarget);
          sp.lootTarget = null; sp.warriorState = 'return';
          store.addLog(`🎒 战士捡起了战利品`, 'good');
        }
      }
      return;
    }

    if (sp.warriorState === 'return') {
      sp.targetX = this.zoneConfig.barracks + (Math.random() - 0.5) * WANDER;
      sp.targetY = gy;
      const dist = Math.hypot(sp.x - this.zoneConfig.barracks, sp.y - gy);
      if (dist < 60) {
        sp.warriorState = 'patrol';
        if (rs.hp < rs.maxHp && monsters.length === 0) sp.warriorState = 'heal';
      }
      return;
    }

    if (monsters.length > 0) {
      let nearestInst: CardInstance | null = null;
      let nearestSp:   FieldSprite | null  = null;
      let nearestDist  = Infinity;
      for (const m of monsters) {
        const mSp = this.sprites.get(m.instanceId);
        // 跳过正在死亡或已死亡的sprite
        if (!mSp || mSp.dyingTimer > 0 || mSp.isDead) continue;
        const d = Math.hypot(mSp.x - sp.x, mSp.y - sp.y);
        if (d < nearestDist) { nearestDist = d; nearestInst = m; nearestSp = mSp; }
      }
      if (nearestInst && nearestSp) {
        sp.combatTarget = nearestInst.instanceId;
        if (nearestDist <= ATTACK_RANGE) {
          sp.warriorState = 'fight';
          sp.attackCooldown--;
          if (sp.attackCooldown <= 0) {
            sp.attackCooldown = ATTACK_COOLDOWN;
            this.resolveHit(inst, nearestInst);
          }
        } else {
          sp.warriorState = 'chase';
          const dirX = nearestSp.x > sp.x ? 1 : -1;
          sp.targetX = nearestSp.x - dirX * (ATTACK_RANGE - 10);
          sp.targetY = nearestSp.y;
        }
        return;
      }
    }

    if (this.lootDrops.size > 0) {
      const alreadyClaimed = new Set<string>();
      for (const other of this.sprites.values()) {
        if (other.lootTarget) alreadyClaimed.add(other.lootTarget);
      }
      let nearestDrop: LootDrop | null = null;
      let nearestDist = Infinity;
      for (const drop of this.lootDrops.values()) {
        if (alreadyClaimed.has(drop.id)) continue;
        const d = Math.hypot(drop.worldX - sp.x, drop.worldY - sp.y);
        if (d < nearestDist) { nearestDist = d; nearestDrop = drop; }
      }
      if (nearestDrop) { sp.lootTarget = nearestDrop.id; sp.warriorState = 'loot'; return; }
    }

    if (rs.hp < rs.maxHp) {
      sp.warriorState = 'heal';
    } else {
      sp.warriorState = 'patrol';
      sp.combatTarget = null;
      const atLeft  = sp.x <= this.zoneConfig.patrolLeft  + 20;
      const atRight = sp.x >= this.zoneConfig.patrolRight - 20;
      if (atLeft)  sp.patrolDir =  1;
      if (atRight) sp.patrolDir = -1;
      sp.targetX = sp.patrolDir === 1 ? this.zoneConfig.patrolRight : this.zoneConfig.patrolLeft;
      sp.targetY = gy;
    }
  }

  private runMonsterAI(
    inst: CardInstance, sp: FieldSprite,
    townspeople: CardInstance[], gy: number
  ) {
    const spawnX = this.monsterSpawnX(inst);
    if (inst.aggressionCountdown > 0) {
      sp.monsterBehavior = 'waiting';
      if (Math.abs(sp.x - spawnX) > WANDER || Math.random() < 0.02) {
        sp.targetX = spawnX + (Math.random() - 0.5) * WANDER * 0.5;
        sp.targetY = gy + (Math.random() - 0.5) * 6;// spawn点附近徘徊，偶尔小范围移动
      }
      return;
    }

    // 有战斗岗位人员时，怪物保持等待状态（战斗进行中，不进军）
    if (store.hasActiveCombatWorkers) {
      sp.monsterBehavior = 'waiting';
      if (Math.abs(sp.x - spawnX) > WANDER || Math.random() < 0.02) {
        sp.targetX = spawnX + (Math.random() - 0.5) * WANDER * 0.5;
        sp.targetY = gy + (Math.random() - 0.5) * 6;// spawn点附近徘徊，偶尔小范围移动
      }
      return;
    }

    const activeTown = townspeople.filter(c => c.isActive);
    if (activeTown.length === 0) {
      sp.monsterBehavior = 'retreating';
      sp.targetX = spawnX; sp.targetY = gy;
      return;
    }

    if (sp.x > this.zoneConfig.wallLeft && sp.x < this.zoneConfig.wallRight) {
      sp.monsterBehavior = 'attacking';
      let nearestHuman: CardInstance | null = null;
      let nearestHumanSp: FieldSprite | null = null;
      let nearestDist = Infinity;
      for (const c of activeTown) {
        const hSp = this.sprites.get(c.instanceId);
        if (!hSp || hSp.isDead) continue;
        const d = Math.hypot(hSp.x - sp.x, hSp.y - sp.y);
        if (d < nearestDist) { nearestDist = d; nearestHuman = c; nearestHumanSp = hSp; }
      }
      if (nearestHuman && nearestHumanSp) {
        if (nearestDist <= ATTACK_RANGE) {
          sp.attackCooldown--;
          if (sp.attackCooldown <= 0) {
            sp.attackCooldown = ATTACK_COOLDOWN;
            this.resolveMonsterHitsHuman(inst, nearestHuman);
          }
          const dirX = nearestHumanSp.x > sp.x ? 1 : -1;
          sp.targetX = nearestHumanSp.x - dirX * (ATTACK_RANGE - 5);
          sp.targetY = nearestHumanSp.y;
        } else {
          sp.targetX = nearestHumanSp.x; sp.targetY = nearestHumanSp.y;
        }
      }
      return;
    }

    sp.monsterBehavior = 'marching';
    sp.targetX = this.zoneConfig.town + (Math.random() - 0.5) * 20;
    sp.targetY = gy;
  }

  // ── 战斗结算 ────────────────────────────────────────────────────────────────

  private resolveHit(attacker: CardInstance, defender: CardInstance) {
    if (!attacker || !defender) return;
    const as = attacker.runtimeStats as HumanStats;
    const ds = defender.runtimeStats as MonsterStats;
    const atkBuff      = store.getMagicBonus('buff_human_atk');
    const defBuff      = store.getMagicBonus('buff_human_def');
    const monDebuff    = store.getMagicBonus('debuff_monster_atk');
    const barracksBuff = store.getBarracksAtkBonus();
    const barracksDefBuff = store.getBarracksDefBonus();

    // 战争号角：战斗人物ATK×1.5（combat_fury power=50 → 1.5倍）
    const combatFuryMult = 1 + (store.getMagicBonus('combat_fury') / 100);

    // 神圣护佑：DEF×2（divine_def power=100 → ×2）
    const divineDefMult = store.getMagicBonus('divine_def') > 0 ? 2 : 1;

    // 永恒诅咒：怪物ATK额外-15（great_debuff power=15）
    const greatDebuff = store.getMagicBonus('great_debuff');

    // 全能祝福：全体属性+10（all_buff power=10）
    const allBuff = store.getMagicBonus('all_buff');

    const finalAtk = (as.atk + atkBuff + barracksBuff + allBuff) * combatFuryMult;
    const finalDef = (as.def + defBuff + barracksDefBuff + allBuff) * divineDefMult;
    const monFinalAtk = ds.atk - monDebuff - greatDebuff;

    const dmgToMon  = Math.max(1, Math.round(finalAtk) - ds.def);
    const dmgToHero = Math.max(0, monFinalAtk - Math.round(finalDef));
    ds.hp -= dmgToMon;
    as.hp -= dmgToHero;

    const mSp = this.sprites.get(defender.instanceId);
    const hSp = this.sprites.get(attacker.instanceId);

    if (mSp && hSp && !mSp.isDead) {
      this.spawnCombatFX((mSp.x + hSp.x) / 2, (mSp.y + hSp.y) / 2);
      this.spawnDamageText(mSp.x, mSp.y, dmgToMon, '#ff4040');
      if (dmgToHero > 0) this.spawnDamageText(hSp.x, hSp.y, dmgToHero, '#ff9966');

      const dir = mSp.x > hSp.x ? 1 : -1;
      // 击退：通过 knockbackX 在 interpolate 中渲染（x tween 会被 setPosition 覆盖）
      hSp.knockbackX = dir * 8;
      mSp.knockbackX = dir * 6;
      // 命中时怪物摆动
      this.tweens.add({
        targets: mSp.sprite,
        angle: dir * 12,
        duration: 70, yoyo: true, ease: 'Quad.Out',
      });
      // 人物受击时摆动
      if (dmgToHero > 0) {
        this.tweens.add({
          targets: hSp.sprite,
          angle: -dir * 10,
          duration: 70, yoyo: true, ease: 'Quad.Out',
        });
      }
    }

    if (mSp && !mSp.isDead) mSp.hitFlashTimer = 4;
    if (hSp && dmgToHero > 0) hSp.hitFlashTimer = 4;

    if (ds.hp <= 0) this.killMonster(defender, mSp, attacker);

    if (as.hp <= 0) {
      as.hp = as.maxHp;
      attacker.isActive       = false;
      attacker.restMonthsLeft = store.townLevel;
      store.addLog(`😵 ${defById(attacker.definitionId).name} 被打倒，休息 ${store.townLevel} 月`, 'bad');
      if (hSp) { hSp.targetX = this.zoneConfig.town; hSp.targetY = this.groundY; }
      store.checkSiegeTransition();
    }
  }

  private resolveMonsterHitsHuman(monster: CardInstance, human: CardInstance) {
    const ms = monster.runtimeStats as MonsterStats;
    const hs = human.runtimeStats as HumanStats;
    const monDebuff   = store.getMagicBonus('debuff_monster_atk');
    const defBuff     = store.getMagicBonus('buff_human_def');
    const greatDebuff = store.getMagicBonus('great_debuff');
    const allBuff     = store.getMagicBonus('all_buff');
    const divineDefMult = store.getMagicBonus('divine_def') > 0 ? 2 : 1;
    const barracksDefBuff = store.getBarracksDefBonus();

    const monFinalAtk = ms.atk - monDebuff - greatDebuff;
    const humanFinalDef = (hs.def + defBuff + barracksDefBuff + allBuff) * divineDefMult;

    const dmg = Math.max(1, monFinalAtk - Math.round(humanFinalDef));
    hs.hp -= dmg;

    const hSp = this.sprites.get(human.instanceId);
    const mSp = this.sprites.get(monster.instanceId);
    if (hSp && mSp && !mSp.isDead) {
      this.spawnCombatFX((hSp.x + mSp.x) / 2, (hSp.y + mSp.y) / 2);
      this.spawnDamageText(hSp.x, hSp.y, dmg, '#ff9966');
      hSp.hitFlashTimer = 4;

      const dir = hSp.x > mSp.x ? 1 : -1;
      // 怪物攻击前冲：通过 knockbackX 在 interpolate 中渲染（x tween 会被 setPosition 覆盖）
      mSp.knockbackX = dir * 8;
      // 人物受击摆动
      this.tweens.add({
        targets: hSp.sprite,
        angle: -dir * 10,
        duration: 70, yoyo: true, ease: 'Quad.Out',
      });
    }

    if (hs.hp <= 0) {
      hs.hp = hs.maxHp;
      human.isActive       = false;
      human.restMonthsLeft = store.townLevel;
      store.addLog(`😵 ${defById(human.definitionId).name} 被 ${defById(monster.definitionId).name} 击败！`, 'bad');
      if (hSp) { hSp.targetX = this.zoneConfig.town; hSp.targetY = this.groundY; }
      store.checkSiegeTransition();
    }
  }

  private killMonster(defender: CardInstance, mSp: FieldSprite | undefined, attacker: CardInstance) {
    const ms = defender.runtimeStats as MonsterStats;
    ms.hp = ms.maxHp;
    defender.isActive       = false;
    defender.restMonthsLeft = 3;
    defender.restProgress   = 0;

    // 记录到月度统计
    store.recordMonsterDefeated(defById(defender.definitionId).level);

    store.addLog(`⚔️ ${defById(attacker.definitionId).name} 击败了 ${defById(defender.definitionId).name}！`, 'good');

    if (mSp) this.spawnLootDrop(defender, mSp.x, mSp.y);

    // ── Bug修复：死亡动画期间标记isDead，阻止syncSprites重新创建sprite ──
    if (mSp) {
      mSp.isDead     = true;  // 关键修复：立即标记死亡
      mSp.dyingTimer = Math.ceil(600 / MS_PER_TICK) + 1;

      this.tweens.add({
        targets: mSp.sprite,
        scaleX: MONSTER_SCALE * 1.1,
        scaleY: MONSTER_SCALE * 1.1,
        duration: 150,
        ease: 'Quad.Out',
        onComplete: () => {
          this.tweens.add({
            targets: mSp.sprite,
            scaleX: 0, scaleY: 0,
            alpha: 0,
            duration: 450,
            ease: 'Quad.In',
          });
        },
      });
      this.tweens.add({
        targets: [mSp.label, mSp.hpBar],
        alpha: 0,
        duration: 300,
        ease: 'Quad.In',
      });
    }
  }

  private spawnLootDrop(monster: CardInstance, wx: number, wy: number) {
    const ms = monster.runtimeStats as MonsterStats;
    if (!ms.lootId) return;
    const qty = ms.lootQtyMin + Math.floor(Math.random() * (ms.lootQtyMax - ms.lootQtyMin + 1));
    const lootDef = store.getLootDef(ms.lootId);
    const emoji   = lootDef?.emoji ?? '📦';
    const dropId  = `drop_${++this.lootDropSeq}`;
    const sprite  = this.add.text(wx, wy - 8, emoji, { fontSize: '16px' }).setOrigin(0.5);
    this.entityLayer.add(sprite);
    this.lootDrops.set(dropId, { id: dropId, worldX: wx, worldY: wy, itemId: ms.lootId, qty, sprite });
  }

  // ── 巢穴系统 ──────────────────────────────────────────────────────────────────

  private syncDens() {
    const monsters = store.field.filter(c =>
      defById(c.definitionId).type === CardType.Monster
    );

    for (const monster of monsters) {
      // 需要 fieldX 或 spawnZone 才能确定巢穴位置
      if (monster.fieldX == null && !monster.spawnZone) continue;
      const worldX = monster.fieldX != null
        ? monster.fieldX
        : this.spawnZoneX(monster.spawnZone as SpawnZone);

      let den = this.dens.find(d => d.instanceId === monster.instanceId);
      if (!den) {
        const img = this.add.graphics();
        this.drawDen(img, worldX, this.groundY, monster.definitionId);
        this.denLayer.add(img);
        const restPulse = this.add.graphics();
        this.denLayer.add(restPulse);
        den = { instanceId: monster.instanceId, worldX, img, restPulse, pulseTimer: 0, occupantId: null };
        this.dens.push(den);
      }

      den.occupantId = !monster.isActive ? monster.instanceId : null;
    }

    const activeIds = new Set(monsters.map(m => m.instanceId));
    this.dens = this.dens.filter(den => {
      if (!activeIds.has(den.instanceId)) {
        den.img.destroy(); den.restPulse.destroy(); return false;
      }
      return true;
    });
  }

  private updateDens(delta: number) {
    for (const den of this.dens) {
      if (!den.occupantId) { den.restPulse.clear(); continue; }
      den.pulseTimer += delta;
      const scale = 0.5 + 0.5 * Math.sin(den.pulseTimer * 0.003);
      den.restPulse.clear();
      den.restPulse.lineStyle(2, 0xff8888, 0.6 * scale);
      den.restPulse.strokeCircle(den.worldX, this.groundY - 20, 20 + 10 * scale);
    }
  }

  private drawDen(g: Phaser.GameObjects.Graphics, wx: number, gy: number, monsterId: string) {
    g.clear();
    if (monsterId.includes('rat')) {
      g.fillStyle(0x8a6a40); g.fillEllipse(wx, gy - 6, 60, 20);
      g.fillStyle(0x2a1a08); g.fillEllipse(wx, gy - 4, 24, 14);
      g.fillStyle(0x5a3a18); g.fillEllipse(wx - 8, gy - 12, 16, 10);
      g.fillStyle(0x5a3a18); g.fillEllipse(wx + 8, gy - 12, 16, 10);
    } else if (monsterId.includes('wolf')) {
      g.fillStyle(0x707070); g.fillEllipse(wx, gy - 10, 70, 26);
      g.fillStyle(0x909090); g.fillEllipse(wx - 14, gy - 16, 28, 18);
      g.fillStyle(0x909090); g.fillEllipse(wx + 14, gy - 16, 28, 18);
      g.fillStyle(0x1a1a1a); g.fillEllipse(wx, gy - 6, 28, 16);
    } else if (monsterId.includes('troll')) {
      g.fillStyle(0x606060); g.fillRect(wx - 30, gy - 50, 60, 52);
      g.fillStyle(0x808080); g.fillRect(wx - 28, gy - 48, 56, 10);
      g.fillStyle(0x1a1a1a); g.fillRect(wx - 14, gy - 38, 28, 38);
      g.fillStyle(0x404040); g.fillRect(wx - 30, gy - 52, 14, 14);
      g.fillStyle(0x404040); g.fillRect(wx + 16, gy - 52, 14, 14);
    } else if (monsterId.includes('harpy')) {
      g.fillStyle(0x5a3a10); g.fillRect(wx - 4, gy - 60, 8, 60);
      g.fillStyle(0x8a6a30); g.fillEllipse(wx, gy - 62, 56, 26);
      g.fillStyle(0x6a4a18); g.fillEllipse(wx - 4, gy - 60, 44, 18);
    } else if (monsterId.includes('dragon')) {
      g.fillStyle(0x404040); g.fillEllipse(wx, gy - 24, 90, 50);
      g.fillStyle(0x602020); g.fillEllipse(wx - 20, gy - 30, 30, 20);
      g.fillStyle(0x602020); g.fillEllipse(wx + 20, gy - 30, 30, 20);
      g.fillStyle(0x1a0000); g.fillEllipse(wx, gy - 12, 42, 26);
      g.fillStyle(0xff4400, 0.5); g.fillEllipse(wx, gy - 8, 24, 14);
    } else {
      g.fillStyle(0x808080); g.fillEllipse(wx, gy - 8, 50, 20);
      g.fillStyle(0x1a1a1a); g.fillEllipse(wx, gy - 4, 20, 12);
    }
  }

  // ── Sprite sync ──────────────────────────────────────────────────────────────

  private buildingZoneX(defId: string): number {
    if (defId === 'building_stall')    return this.zoneConfig.shop;
    if (defId === 'building_workshop') return this.zoneConfig.craft;
    if (defId === 'building_inn')      return this.zoneConfig.town;
    if (defId === 'building_barracks') return this.zoneConfig.barracks;
    return this.zoneConfig.town;
  }

  private buildingFieldX(instanceId: string, defId: string): number {
    const base = this.buildingZoneX(defId);
    let idx = 0;
    for (const c of store.field) {
      if (c.instanceId === instanceId) break;
      if (c.definitionId === defId) idx++;
    }
    const offsets = [-70, 70, -140, 140, -210, 210];
    return base + (offsets[idx] ?? 0);
  }

  private syncSprites() {
    const fieldIds = new Set(store.field.map(c => c.instanceId));

    // 清理：已不在field中的sprite（且不在死亡动画中）
    for (const [id, sp] of this.sprites) {
      if (!fieldIds.has(id)) {
        if (sp.isDead || sp.dyingTimer === 0) {
          // 已死亡或已销毁：从Map中移除
          if (!sp.isDead) {
            sp.sprite.destroy(); sp.label.destroy(); sp.hpBar.destroy(); sp.craftBar.destroy();
          }
          this.sprites.delete(id);
        }
        // dyingTimer > 0 且不在field中（已标记isDead）：保留，等死亡动画结束
      }
    }

    for (const inst of store.field) {
      const sp = this.sprites.get(inst.instanceId);
      if (!sp) continue;
      // isDead的sprite跳过所有更新（它只在等待动画结束后清理）
      if (sp.isDead) continue;
      if (sp.dyingTimer > 0) continue;
      const def = defById(inst.definitionId);
      if (def.type === CardType.Building) {
        const bx = inst.fieldX != null ? inst.fieldX : this.buildingFieldX(inst.instanceId, inst.definitionId);
        sp.x = bx; sp.y = this.groundY;
        sp.targetX = bx; sp.targetY = this.groundY;
        sp.sprite.setPosition(bx, this.groundY);
      }
      const newKey = spriteKeyForCard(inst.definitionId, inst.jobAssignment, inst.level);
      if ((sp.sprite as any).__texKey !== newKey) {
        sp.sprite.setTexture(newKey);
        (sp.sprite as any).__texKey = newKey;
      }
    }

    for (const inst of store.field) {
      if (this.sprites.has(inst.instanceId)) {
        const sp = this.sprites.get(inst.instanceId)!;
        if (!sp.isDead) continue;           // 存活的sprite，无需重建
        if (!inst.isActive) continue;       // 怪物仍在恢复中，等待复活完成
        // isDead=true 且 isActive 已重新变为 true：怪物已复活，清理死亡记录后重建sprite
        this.sprites.delete(inst.instanceId);
      }

      const def = defById(inst.definitionId);
      if (def.name === '???') continue;
      if (def.type === CardType.Magic) continue;

      const key    = spriteKeyForCard(inst.definitionId, inst.jobAssignment, inst.level);
      const sprite = this.add.image(0, 0, key);
      (sprite as any).__texKey = key;

      const isMonster  = def.type === CardType.Monster;
      const isBuilding = def.type === CardType.Building;
      sprite.setScale(isMonster ? MONSTER_SCALE : HUMAN_SCALE);
      sprite.setOrigin(0.5, 1);
      this.entityLayer.add(sprite);

      const label = this.add.text(0, 0, def.name, {
        fontFamily: '"Silkscreen", monospace',
        fontSize: '16px', color: '#f5e6c8',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5, 1);
      this.labelLayer.add(label);

      const hpBar    = this.add.graphics();
      const craftBar = this.add.graphics();
      this.labelLayer.add(hpBar);
      this.labelLayer.add(craftBar);

      let sx = this.zoneConfig.town, sy = this.groundY;
      if (isBuilding) {
        sx = inst.fieldX != null ? inst.fieldX : this.buildingFieldX(inst.instanceId, inst.definitionId);
        sy = this.groundY;
      } else if (isMonster) {
        sx = this.monsterSpawnX(inst);
        sy = this.groundY;
      } else if (def.type === CardType.Human) {
        const job = inst.jobAssignment ?? JobType.Idle;
        sx = job === JobType.Shop   ? this.zoneConfig.shop
           : job === JobType.Craft  ? this.zoneConfig.craft
           : job === JobType.Combat ? this.zoneConfig.barracks
           : this.zoneConfig.town;
        sy = this.groundY;
      }

      sprite.setPosition(sx, sy);

      this.sprites.set(inst.instanceId, {
        instanceId: inst.instanceId,
        sprite, label, hpBar, craftBar,
        x: sx, y: sy, targetX: sx, targetY: sy,
        bobPhase: Math.random() * Math.PI * 2,
        isStatic: isBuilding,
        isDead: false,  // 新建sprite默认非死亡
        warriorState: 'patrol', attackCooldown: ATTACK_COOLDOWN,
        combatTarget: null, lootTarget: null, patrolDir: 1,
        hitFlashTimer: 0, shopServeTarget: null,
        monsterBehavior: 'waiting',
        knockbackX: 0, knockbackTimer: 0,
        dyingTimer: 0,
      });
    }

    this.syncDens();
  }

  // ── Interpolation ──────────────────────────────────────────────────────────

  private interpolate(dt: number) {
    for (const [id, sp] of this.sprites) {
      // isDead sprite 不参与渲染更新
      if (sp.isDead) continue;
      if (sp.dyingTimer > 0) continue;

      const inst = store.field.find(c => c.instanceId === id);
      if (!inst?.definitionId) continue;
      const def = defById(inst.definitionId);

      if (sp.isStatic) {
        sp.sprite.setAlpha(inst.isActive ? 1 : 0.45);
        sp.sprite.setPosition(sp.x, sp.y);
        sp.label.setPosition(sp.x, sp.y - 38);
        sp.hpBar.clear();
        sp.craftBar.clear();
        continue;
      }

      sp.bobPhase += 0.04;
      const isMonster = def.type === CardType.Monster;
      const speed     = isMonster ? MONSTER_SPEED : (sp.warriorState === 'heal' ? HEAL_SPEED : HUMAN_SPEED);

      if (!inst.isActive) {
        sp.sprite.setAlpha(0.45);
        sp.sprite.clearTint();
        sp.sprite.setAngle(0);
        if (isMonster) sp.sprite.setScale(MONSTER_SCALE);
        sp.sprite.setPosition(sp.x, sp.y + Math.sin(sp.bobPhase) * 1.5);
      } else {
        if (sp.hitFlashTimer > 0) {
          sp.sprite.setTint(isMonster ? 0xff3333 : 0xff9966);
          sp.sprite.setAlpha(0.8);
        } else {
          sp.sprite.setAlpha(1);
          sp.sprite.clearTint();
        }

        if (!isMonster && sp.warriorState === 'heal') {
          sp.sprite.setTint(0xaaffaa);
          sp.sprite.setAlpha(0.85);
        }

        const dx   = sp.targetX - sp.x;
        const dy   = sp.targetY - sp.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let renderBobY = 0;
        if (dist > 1) {
          const step = Math.min(speed * dt, dist);
          sp.x += (dx / dist) * step;
          sp.y += (dy / dist) * step;
          sp.sprite.setFlipX(dx < 0);
          // 步伐弹跳：更快频率上下振荡模拟走路
          renderBobY = Math.sin(sp.bobPhase * 4) * 2.5;
          // 战士追击/战斗时轻微身体摆动
          if (!isMonster && (sp.warriorState === 'chase' || sp.warriorState === 'fight')
              && sp.hitFlashTimer <= 0) {
            sp.sprite.setAngle(Math.sin(sp.bobPhase * 6) * 3);
          } else if (sp.hitFlashTimer <= 0) {
            sp.sprite.setAngle(0);
          }
        } else {
          renderBobY = Math.sin(sp.bobPhase) * 1.5;
          // 静止时角色角度动画（hitFlash 期间交由 tween 控制）
          if (sp.hitFlashTimer <= 0) {
            if (!isMonster && inst.jobAssignment === JobType.Craft && inst.isActive) {
              // 锤击/弯腰动作
              sp.sprite.setAngle(Math.sin(sp.bobPhase * 3) * 5);
            } else if (!isMonster && inst.jobAssignment === JobType.Shop
                       && inst.isActive && sp.shopServeTarget) {
              // 服务顾客时前倾
              sp.sprite.setAngle(5);
            } else {
              sp.sprite.setAngle(0);
            }
          }
        }
        // 击退偏移：每帧指数衰减，不影响逻辑坐标 sp.x
        const kbX = sp.knockbackX;
        sp.knockbackX *= 0.7;
        if (Math.abs(sp.knockbackX) < 0.5) sp.knockbackX = 0;
        sp.sprite.setPosition(sp.x + kbX, sp.y + renderBobY);

        // 怪物待机呼吸缩放
        if (isMonster && sp.monsterBehavior === 'waiting') {
          sp.sprite.setScale(MONSTER_SCALE + Math.sin(sp.bobPhase * 1.5) * 0.02);
        } else {
          sp.sprite.setScale(isMonster ? MONSTER_SCALE : HUMAN_SCALE);
        }
      }

      sp.label.setPosition(sp.x, sp.y - 38);
      this.drawHpBar(sp, inst);
      this.drawCraftBar(sp, inst, def);
    }
  }

  private drawHpBar(sp: FieldSprite, inst: any) {
    sp.hpBar.clear();
    const rs = inst.runtimeStats as any;
    if (!('hp' in rs && 'maxHp' in rs)) return;
    const pct = Math.max(0, rs.hp / rs.maxHp);
    const w = 32, h = 3;
    const bx = sp.x - w / 2, by = sp.y - 26;
    sp.hpBar.fillStyle(0x220000); sp.hpBar.fillRect(bx, by, w, h);
    const col = pct > 0.5 ? 0x40cc40 : pct > 0.25 ? 0xcccc40 : 0xcc4040;
    sp.hpBar.fillStyle(col);
    sp.hpBar.fillRect(bx, by, Math.round(w * pct), h);
  }

  private drawCraftBar(sp: FieldSprite, inst: CardInstance, def: CardDefinition) {
    sp.craftBar.clear();
    if (def.type !== CardType.Human || inst.jobAssignment !== JobType.Craft || !inst.isActive) return;
    const { points, maxPoints } = store.getCraftProgressInfo();
    if (maxPoints === 0) return;
    const pct = Math.min(1, points / maxPoints);
    const w = 32, h = 2;
    const bx = sp.x - w / 2, by = sp.y - 22;
    sp.craftBar.fillStyle(0x1a1a0a); sp.craftBar.fillRect(bx, by, w, h);
    sp.craftBar.fillStyle(0xe0a020);
    sp.craftBar.fillRect(bx, by, Math.round(w * pct), h);
  }

  /** Map a SpawnZone enum value to a world X coordinate using the current zoneConfig. */
  private spawnZoneX(zone: SpawnZone): number {
    const { left, right } = this.zoneConfig.monsterSpawn;
    switch (zone) {
      case SpawnZone.Left0:  return left[0];
      case SpawnZone.Left1:  return left[1];
      case SpawnZone.Left2:  return left[2];
      case SpawnZone.Right0: return right[0];
      case SpawnZone.Right1: return right[1];
      case SpawnZone.Right2: return right[2];
      default:               return left[0];
    }
  }

  private monsterSpawnX(inst: CardInstance): number {
    if (inst.fieldX != null) return inst.fieldX;
    if (!inst.spawnZone) return this.zoneConfig.monsterSpawn.left[0];
    return this.spawnZoneX(inst.spawnZone as SpawnZone);
  }

  // ── Background ────────────────────────────────────────────────────────────

  /** Clear and redraw the static world visuals (bg + zone buildings).
   *  Called once at create() and again whenever town level changes. */
  private rebuildWorldVisuals(): void {
    this.bgLayer.removeAll(true);
    this.bldgLayer.removeAll(true);
    this.buildBackground();
    this.buildZoneBuildings();
  }

  /**
   * When a segment expands, shift fieldX of buildings that sit past the expanding anchor.
   * Called before rebuildWorldVisuals() so Sprites are repositioned in the new coordinate system.
   *
   * Rule (only one segment expands per call):
   *  - seg0 expanded (craft moved right): shift buildings with fieldX > oldCfg.craft
   *  - seg1 expanded (town moved right):  shift buildings with fieldX > oldCfg.town
   *  - seg2 expanded (barracks moved):    no buildings need shifting (seg2 adds space to the right)
   */
  private shiftBuildingFieldX(oldCfg: ZoneConfig, newCfg: ZoneConfig): void {
    const craftDelta = newCfg.craft - oldCfg.craft;
    const townDelta  = newCfg.town  - oldCfg.town;

    for (const inst of store.field) {
      if (defById(inst.definitionId).type !== CardType.Building) continue;
      if (inst.fieldX == null) continue;

      if (craftDelta > 0) {
        // seg0 expanded: buildings in seg1 and seg2 (past old craft) shift right
        if (inst.fieldX > oldCfg.craft) inst.fieldX += 140;
      } else if (townDelta > 0) {
        // seg1 expanded: buildings in seg2 (past old town) shift right
        if (inst.fieldX > oldCfg.town) inst.fieldX += 140;
      }
      // seg2 expanded: barracks shifts right, existing buildings in seg2 stay
    }
  }

  private buildBackground() {
    const W  = this.zoneConfig.worldWidth;
    const H  = this.sceneH;
    const gy = this.groundY;
    const lv = store.townLevel;
    const g  = this.add.graphics();
    this.bgLayer.add(g);

    for (let i = 0; i < gy; i++) {
      const t  = i / gy;
      const r  = Phaser.Math.Linear(0x1a, 0x5a, t) | 0;
      const gr = Phaser.Math.Linear(0x28, 0x8a, t) | 0;
      const b  = Phaser.Math.Linear(0x4a, 0xbb, t) | 0;
      g.fillStyle((r << 16) | (gr << 8) | b, 1);
      g.fillRect(0, i, W, 1);
    }

    g.fillStyle(0x4a7a3a); g.fillRect(0, gy,     W, H - gy);
    g.fillStyle(0x3a6a2a); g.fillRect(0, gy + 8, W, H - gy - 8);

    const wallLeft  = this.zoneConfig.wallLeft;
    const wallRight = this.zoneConfig.wallRight;
    const roadW = wallRight - wallLeft;

    // Road appearance by level
    // Road visual heights: Lv1=32, Lv2=38, Lv3=44, Lv4=52, Lv5=60, Lv6=68
    if (lv >= 6) {
      // Lv6: 魔法永恒大道 — 深蓝紫魔法石，发光网格线与星形符文
      const rh = 68;
      g.fillStyle(0x282048); g.fillRect(wallLeft, gy, roadW, rh);
      g.fillStyle(0x302858); g.fillRect(wallLeft, gy + 2, roadW, rh - 4);
      // glowing grid lines (blue-purple)
      g.fillStyle(0x6060c8);
      for (let rx = wallLeft; rx < wallRight; rx += 40) {
        g.fillRect(rx, gy + 2, 1, rh - 4);
      }
      for (let ry = gy + 8; ry < gy + rh - 4; ry += 8) {
        g.fillRect(wallLeft, ry, roadW, 1);
      }
      // crystalline glowing curb on both sides
      g.fillStyle(0x60d8ff); g.fillRect(wallLeft, gy, 5, rh);
      g.fillStyle(0x60d8ff); g.fillRect(wallRight - 5, gy, 5, rh);
      g.fillStyle(0xa0e8ff); g.fillRect(wallLeft, gy, 2, rh);
      g.fillStyle(0xa0e8ff); g.fillRect(wallRight - 2, gy, 2, rh);
      // star-shaped arcane rune sigils along center
      g.fillStyle(0xa0b0ff);
      for (let rx = wallLeft + 32; rx < wallRight - 16; rx += 64) {
        const cy = gy + Math.floor(rh / 2);
        g.fillRect(rx - 1, cy - 3, 3, 7); // vertical bar
        g.fillRect(rx - 3, cy - 1, 7, 3); // horizontal bar
        g.fillRect(rx - 2, cy - 2, 2, 2); // top-left arm
        g.fillRect(rx + 1, cy - 2, 2, 2); // top-right arm
        g.fillRect(rx - 2, cy + 1, 2, 2); // bottom-left arm
        g.fillRect(rx + 1, cy + 1, 2, 2); // bottom-right arm
      }
      // sparkle pixel dots
      g.fillStyle(0xc0c8ff);
      for (let i = 0; i < 40; i++) {
        const rx = wallLeft + 8 + (i * 61 % (roadW - 16));
        const ry = gy + 4 + (i * 41 % (rh - 8));
        g.fillRect(rx, ry, 1, 1);
      }
    } else if (lv >= 5) {
      // Lv5: 金边王道 — 奶白色大理石，金色嵌线，路沿描金
      const rh = 60;
      g.fillStyle(0xd0c8a8); g.fillRect(wallLeft, gy, roadW, rh);
      g.fillStyle(0xe0d8b8); g.fillRect(wallLeft, gy + 2, roadW, rh - 4);
      // marble slab grid
      g.fillStyle(0xb8b098);
      for (let rx = wallLeft; rx < wallRight; rx += 48) {
        g.fillRect(rx, gy + 2, 2, rh - 4);
      }
      for (let ry = gy + 12; ry < gy + rh - 4; ry += 12) {
        g.fillRect(wallLeft, ry, roadW, 1);
      }
      // gold center dividing strip
      g.fillStyle(0xd4a017);
      g.fillRect(wallLeft + Math.floor(roadW / 2) - 1, gy + 2, 2, rh - 4);
      // ornate gold-topped curbs
      g.fillStyle(0xc8b890); g.fillRect(wallLeft, gy, 6, rh);
      g.fillStyle(0xc8b890); g.fillRect(wallRight - 6, gy, 6, rh);
      g.fillStyle(0xffd040); g.fillRect(wallLeft, gy, 6, 3);
      g.fillStyle(0xffd040); g.fillRect(wallRight - 6, gy, 6, 3);
      // royal medallion accent marks
      g.fillStyle(0xd4a017);
      for (let i = 0; i < 20; i++) {
        const rx = wallLeft + 24 + (i * 73 % (roadW - 48));
        const ry = gy + 6 + (i * 43 % (rh - 16));
        g.fillRect(rx, ry, 4, 2);
        g.fillRect(rx + 1, ry - 1, 2, 1);
        g.fillRect(rx + 1, ry + 2, 2, 1);
      }
    } else if (lv >= 4) {
      // Lv4: 精雕御道 — 大方石板，抛光高光，双层路沿，排水沟
      const rh = 52;
      g.fillStyle(0xa8a090); g.fillRect(wallLeft, gy, roadW, rh);
      g.fillStyle(0xb8b0a0); g.fillRect(wallLeft, gy + 2, roadW, rh - 4);
      // dressed stone joints
      g.fillStyle(0x888070);
      for (let rx = wallLeft; rx < wallRight; rx += 48) {
        g.fillRect(rx, gy + 2, 2, rh - 4);
      }
      for (let ry = gy + 12; ry < gy + rh - 4; ry += 12) {
        g.fillRect(wallLeft, ry, roadW, 1);
      }
      // double curb: outer (8px) + inner (4px) with drainage gutter between
      g.fillStyle(0xc8c0a8); g.fillRect(wallLeft, gy, 8, rh);
      g.fillStyle(0xc8c0a8); g.fillRect(wallRight - 8, gy, 8, rh);
      g.fillStyle(0xb0a898); g.fillRect(wallLeft + 8, gy, 4, rh);
      g.fillStyle(0xb0a898); g.fillRect(wallRight - 12, gy, 4, rh);
      // drainage gutter channel
      g.fillStyle(0x706858); g.fillRect(wallLeft + 5, gy + 4, 3, rh - 8);
      g.fillStyle(0x706858); g.fillRect(wallRight - 8, gy + 4, 3, rh - 8);
      // polished stone highlights (top-left pixel per tile)
      g.fillStyle(0xd8d0b8);
      for (let i = 0; i < 30; i++) {
        const rx = wallLeft + 12 + (i * 59 % (roadW - 24));
        const ry = gy + 4 + (i * 37 % (rh - 10));
        g.fillRect(rx, ry, 6, 2);
      }
    } else if (lv >= 3) {
      // Lv3: 石板铺路 — 灰色长方石板，错缝砌法，路沿石，苔藓
      const rh = 44;
      g.fillStyle(0x8a8878); g.fillRect(wallLeft, gy, roadW, rh);
      g.fillStyle(0x9a9888); g.fillRect(wallLeft, gy + 2, roadW, rh - 4);
      // offset cobblestone tile joints
      g.fillStyle(0x686858);
      for (let rx = wallLeft; rx < wallRight; rx += 48) {
        g.fillRect(rx, gy + 2, 2, rh - 4);
      }
      for (let ry = gy + 10; ry < gy + rh - 4; ry += 10) {
        g.fillRect(wallLeft, ry, roadW, 1);
      }
      // raised stone curb on both sides
      g.fillStyle(0xb0a898); g.fillRect(wallLeft, gy, 4, rh);
      g.fillStyle(0xb0a898); g.fillRect(wallRight - 4, gy, 4, rh);
      // moss patches near curb
      g.fillStyle(0x608040);
      for (let i = 0; i < 12; i++) {
        const rx = wallLeft + 4 + (i * 71 % (roadW - 8));
        g.fillRect(rx, gy + 2, 3, 2);
      }
      // pebble details
      g.fillStyle(0xb8b0a0);
      for (let i = 0; i < 20; i++) {
        const rx = wallLeft + 10 + (i * 67 % (roadW - 20));
        const ry = gy + 6 + (i * 37 % (rh - 12));
        g.fillRect(rx, ry, 3, 2);
      }
    } else if (lv >= 2) {
      // Lv2: 夯土商道 — 夯实红棕土路，卵石路边，踏脚石
      const rh = 38;
      g.fillStyle(0x7a6a50); g.fillRect(wallLeft, gy, roadW, rh);
      g.fillStyle(0x8a7a60); g.fillRect(wallLeft, gy + 2, roadW, rh - 4);
      // faint tamping lines
      g.fillStyle(0x6a5a48);
      for (let ry = gy + 6; ry < gy + rh - 4; ry += 6) {
        g.fillRect(wallLeft, ry, roadW, 1);
      }
      // rough fieldstone border on each edge
      g.fillStyle(0xa09078);
      for (let rx = wallLeft; rx < wallRight; rx += 10) {
        const sh = 3 + (rx % 3);
        g.fillRect(rx, gy, 8, sh);
        g.fillRect(rx, gy + rh - sh, 8, sh);
      }
      // occasional flat stepping stones embedded in center
      g.fillStyle(0xb0a888);
      for (let i = 0; i < 8; i++) {
        const rx = wallLeft + 20 + (i * 97 % (roadW - 40));
        g.fillRect(rx, gy + Math.floor(rh / 2) - 2, 10, 4);
      }
      // scattered pebble texture
      g.fillStyle(0xa89878);
      for (let i = 0; i < 25; i++) {
        const rx = wallLeft + 10 + (i * 67 % (roadW - 20));
        const ry = gy + 4 + (i * 37 % (rh - 10));
        g.fillRect(rx, ry, 4, 2);
      }
      // patchy grass tufts at road edge
      g.fillStyle(0x5a8a40);
      for (let rx = wallLeft; rx < wallRight; rx += 20) {
        const h2 = 2 + (rx % 2);
        g.fillRect(rx + 2, gy - h2, 2, h2);
      }
    } else {
      // Lv1: 泥泞村道 — 暖棕色泥土，车辙压痕，野草碎石
      const rh = 32;
      g.fillStyle(0x8a7a60); g.fillRect(wallLeft, gy, roadW, rh);
      g.fillStyle(0x9a8a70); g.fillRect(wallLeft, gy + 2, roadW, rh - 4);
      // two wagon-wheel rut lines running lengthwise
      g.fillStyle(0x6a5a48);
      g.fillRect(wallLeft, gy + Math.floor(rh * 0.3), roadW, 2);
      g.fillRect(wallLeft, gy + Math.floor(rh * 0.65), roadW, 2);
      // uneven muddy texture patches
      g.fillStyle(0x7a6a55);
      for (let i = 0; i < 20; i++) {
        const rx = wallLeft + 4 + (i * 53 % (roadW - 8));
        const ry = gy + 3 + (i * 31 % (rh - 8));
        g.fillRect(rx, ry, 5 + (i % 3), 2);
      }
      // scattered small pebbles
      g.fillStyle(0xb0a088);
      for (let i = 0; i < 35; i++) {
        const rx = wallLeft + 4 + (i * 67 % (roadW - 8));
        const ry = gy + 2 + (i * 37 % (rh - 6));
        g.fillRect(rx, ry, 2, 1);
      }
      // sparse weeds / dry grass tufts at road edges
      g.fillStyle(0x5a8a40);
      for (let rx = wallLeft; rx < wallRight; rx += 22) {
        const h2 = 2 + (rx % 3);
        g.fillRect(rx, gy - h2, 3, h2);
      }
      // dry grass tufts (yellowish)
      g.fillStyle(0xa09040);
      for (let rx = wallLeft + 6; rx < wallRight; rx += 30) {
        g.fillRect(rx, gy - 2, 2, 2);
      }
    }

    g.fillStyle(0x7a6050); g.fillRect(0, gy, wallLeft, 30);
    g.fillStyle(0x8a7060); g.fillRect(0, gy + 4, wallLeft, 20);
    g.fillStyle(0x5a4030);
    for (let i = 0; i < 20; i++) {
      const rx = 10 + (i * 53 % (wallLeft - 20));
      const ry = gy + 6 + (i * 31 % 12);
      g.fillRect(rx, ry, 5, 3);
    }
    g.fillStyle(0x7a6050); g.fillRect(wallRight, gy, W - wallRight, 30);
    g.fillStyle(0x8a7060); g.fillRect(wallRight, gy + 4, W - wallRight, 20);
    g.fillStyle(0x5a4030);
    for (let i = 0; i < 20; i++) {
      const rx = wallRight + 10 + (i * 53 % (W - wallRight - 20));
      const ry = gy + 6 + (i * 31 % 12);
      g.fillRect(rx, ry, 5, 3);
    }

    g.fillStyle(0x4a8a38);
    for (let rx = 0; rx < wallLeft; rx += 14) {
      const h3 = 2 + (rx % 3); g.fillRect(rx, gy - h3, 3, h3);
    }
    for (let rx = wallRight; rx < W; rx += 14) {
      const h3 = 2 + (rx % 3); g.fillRect(rx, gy - h3, 3, h3);
    }

    // 太阳（始终贴近右边缘，与 worldWidth 同步）
    g.fillStyle(0xffd040); g.fillRect(W - 120, 20, 18, 18);
    g.fillStyle(0xffb020);
    [[W-128,24,4,10],[W-106,24,4,10],[W-116,14,10,4],[W-116,40,10,4]].forEach(
      ([x,y,w,h]) => g.fillRect(x as number,y as number,w as number,h as number)
    );

    // 云朵：按 worldWidth 比例均匀分布
    const cloudDefs: [number, number][] = [
      [Math.round(W * 0.056), 0.08],
      [Math.round(W * 0.167), 0.05],
      [Math.round(W * 0.306), 0.10],
      [Math.round(W * 0.472), 0.06],
      [Math.round(W * 0.639), 0.09],
      [Math.round(W * 0.806), 0.07],
      [Math.round(W * 0.944), 0.05],
    ];
    cloudDefs.forEach(([cx, ty]) => {
      g.fillStyle(0xe8f0ff, 0.8);
      g.fillRect(cx, (H * ty) | 0, 36, 10);
      g.fillRect(cx + 5, ((H * ty) | 0) - 5, 26, 10);
    });

    // 树木：左侧树群在 [0, wallLeft] 内按比例分布，右侧在 [wallRight, W] 内
    const lW = wallLeft;
    const rW = W - wallRight;
    const treePositions: number[] = [
      Math.round(lW * 0.33),
      Math.round(lW * 0.50),
      Math.round(lW * 0.64),
      Math.round(lW * 0.78),
      Math.round(lW * 0.87),
      wallRight + Math.round(rW * 0.09),
      wallRight + Math.round(rW * 0.20),
      wallRight + Math.round(rW * 0.31),
      wallRight + Math.round(rW * 0.44),
      wallRight + Math.round(rW * 0.61),
    ];
    if (!this.textures.exists('tree_shared')) {
      const tg = this.add.graphics();
      const s = 4;
      tg.fillStyle(0x5a3010); tg.fillRect(2*s, 6*s, 2*s, 5*s);
      tg.fillStyle(0x2a5a2a); tg.fillRect(0, 2*s, 6*s, 4*s);
      tg.fillStyle(0x3a8a3a); tg.fillRect(s, 3*s, 4*s, 2*s);
      tg.generateTexture('tree_shared', 32, 44);
      tg.destroy();
    }
    for (const tx of treePositions) {
      const t = this.add.image(tx, gy, 'tree_shared').setOrigin(0.5, 1);
      this.bgLayer.add(t);
    }

    this.buildWalls(g, gy, H, lv);
  }

  private buildWalls(g: Phaser.GameObjects.Graphics, gy: number, H: number, townLevel: number) {
    for (const wallX of [this.zoneConfig.wallLeft, this.zoneConfig.wallRight]) {
      if      (townLevel === 1) this._drawWallLv1(g, gy, wallX);
      else if (townLevel === 2) this._drawWallLv2(g, gy, wallX);
      else if (townLevel === 3) this._drawWallLv3(g, gy, wallX);
      else if (townLevel === 4) this._drawWallLv4(g, gy, wallX);
      else if (townLevel === 5) this._drawWallLv5(g, gy, wallX);
      else                      this._drawWallLv6(g, gy, wallX);
    }
  }

  // ─── Lv1: 木栅栏墙 ────────────────────────────────────────────────────────
  private _drawWallLv1(g: Phaser.GameObjects.Graphics, gy: number, wallX: number) {
    // 整体尺寸：矮小破旧木栅栏
    const wallH = 48;   // 总高度（偏矮）
    const gateW = 28;   // 门洞宽
    const wingW = 80;   // 两翼延伸宽
    const wx    = wallX - Math.floor(gateW / 2);

    // ── 泥土/石基 ──
    g.fillStyle(0x7a6a52); g.fillRect(wx - wingW, gy - 5, wingW * 2 + gateW, 5);

    // ── 两翼木栅栏（粗糙竖立原木，高度不一）──
    for (const [wingX, ww] of [[wx - wingW, wingW], [wx + gateW, wingW]] as [number, number][]) {
      // 底部原木墙体（深木色）
      g.fillStyle(0x8B5E3C); g.fillRect(wingX, gy - wallH, ww, wallH);
      // 原木分段线（模拟单根圆木绑合）
      g.fillStyle(0x5C3D1E);
      for (let lx = wingX + 6; lx < wingX + ww - 2; lx += 7) {
        // 每根木桩随机高矮 (偏移 -4~+4)
        const jitter = ((lx * 7) % 9) - 4;
        g.fillRect(lx, gy - wallH - jitter, 1, wallH + jitter);
      }
      // 顶部削尖桩头
      g.fillStyle(0xD4A96A);
      for (let lx = wingX + 2; lx < wingX + ww - 2; lx += 7) {
        const jitter = ((lx * 7) % 9) - 4;
        g.fillRect(lx + 2, gy - wallH - jitter - 4, 3, 4);
        g.fillRect(lx + 3, gy - wallH - jitter - 6, 1, 2);
      }
      // 绑绳横条（两道）
      g.fillStyle(0x5C3D1E);
      g.fillRect(wingX, gy - wallH + 10, ww, 2);
      g.fillRect(wingX, gy - wallH + 26, ww, 2);
      // 亮色木纹高光（顶边）
      g.fillStyle(0xD4A96A); g.fillRect(wingX, gy - wallH, ww, 2);
      // 基础草根
      g.fillStyle(0x5a8a40);
      for (let gx = wingX; gx < wingX + ww; gx += 5) {
        const gh = 2 + (gx % 3);
        g.fillRect(gx, gy - gh, 2, gh);
      }
    }

    // ── 门（两扇不规则木板，横木加固）──
    const gateH = 36;
    const gateY = gy - gateH;
    // 左扇门
    g.fillStyle(0x8B5E3C); g.fillRect(wx, gateY, Math.floor(gateW / 2) - 1, gateH);
    g.fillStyle(0x5C3D1E); g.fillRect(wx, gateY, 1, gateH);
    // 右扇门
    g.fillStyle(0x8B5E3C); g.fillRect(wx + Math.floor(gateW / 2) + 1, gateY, Math.ceil(gateW / 2) - 1, gateH);
    g.fillStyle(0x5C3D1E); g.fillRect(wx + gateW - 1, gateY, 1, gateH);
    // 门上横木加固（两道）
    g.fillStyle(0x5C3D1E);
    g.fillRect(wx, gateY + 6, gateW, 3);
    g.fillRect(wx, gateY + gateH - 9, gateW, 3);
    // 木纹高光
    g.fillStyle(0xD4A96A);
    g.fillRect(wx + 2, gateY + 1, Math.floor(gateW / 2) - 4, 1);
    // 铁箍（门左右各一）
    g.fillStyle(0x3a3020);
    g.fillRect(wx + 2, gateY + 4, 3, 8);
    g.fillRect(wx + gateW - 5, gateY + 4, 3, 8);
    // 门缝中线
    g.fillStyle(0x3a2a10); g.fillRect(wx + Math.floor(gateW / 2) - 1, gateY, 2, gateH);

    // ── 火把架（门两侧各一，简陋铁架）──
    for (const tx of [wx - 5, wx + gateW + 2]) {
      g.fillStyle(0x5C3D1E); g.fillRect(tx, gy - wallH + 6, 2, 10);   // 架臂
      g.fillStyle(0x3a2a10); g.fillRect(tx - 1, gy - wallH + 5, 4, 2); // 固定箍
      // 火把（未点燃，深色）
      g.fillStyle(0x8B5E3C); g.fillRect(tx, gy - wallH + 2, 2, 5);
      g.fillStyle(0x5C3D1E); g.fillRect(tx, gy - wallH + 1, 2, 2);
    }
  }

  // ─── Lv2: 石砌矮墙 ───────────────────────────────────────────────────────
  private _drawWallLv2(g: Phaser.GameObjects.Graphics, gy: number, wallX: number) {
    const wallH = 62;
    const gateW = 34;
    const wingW = 80;
    const wx    = wallX - Math.floor(gateW / 2);
    const crenH = 8;
    const crenW = 7;
    const crenGap = 5;

    // ── 两翼矮石墙 ──
    for (const [wingX, ww] of [[wx - wingW, wingW], [wx + gateW, wingW]] as [number, number][]) {
      g.fillStyle(0x8A8A8A); g.fillRect(wingX, gy - wallH, ww, wallH);
      // 不规则石块砌缝（偏移错落体现低级感）
      g.fillStyle(0x5A5A5A);
      for (let row = 0; row < 4; row++) {
        const rowY = gy - wallH + 4 + row * 14;
        const offset = (row % 2) * 8;
        for (let bx = wingX + offset; bx < wingX + ww; bx += 16) {
          g.fillRect(bx, rowY, 1, 12);
        }
        g.fillRect(wingX, rowY, ww, 1);
      }
      // 顶部高光
      g.fillStyle(0xb0b0b0); g.fillRect(wingX, gy - wallH, ww, 2);
      // 苔藓点缀
      g.fillStyle(0x5a7a40);
      for (let i = 0; i < 6; i++) {
        const mx = wingX + 4 + (i * 13 % (ww - 8));
        const my = gy - wallH + 10 + (i * 7 % (wallH - 20));
        g.fillRect(mx, my, 3, 2);
      }
      // 矩形垛口
      for (let cx = wingX + 2; cx < wingX + ww - crenW; cx += crenW + crenGap) {
        g.fillStyle(0x8A8A8A); g.fillRect(cx, gy - wallH - crenH, crenW, crenH);
        g.fillStyle(0x5A5A5A); g.fillRect(cx, gy - wallH - crenH, crenW, 2);
      }
      // 鹅卵石路基
      g.fillStyle(0x7A6A52); g.fillRect(wingX, gy - 5, ww, 5);
    }

    // ── 两侧嵌入式壁龛（守卫站位）──
    for (const tx of [wx - 14, wx + gateW + 2]) {
      const towerW = 14;
      const towerH = wallH + 14;
      g.fillStyle(0x7a7a7a); g.fillRect(tx, gy - towerH, towerW, towerH);
      g.fillStyle(0x5A5A5A);
      for (let row = 0; row < 4; row++) {
        g.fillRect(tx, gy - towerH + 4 + row * 14, towerW, 1);
        for (let bx = tx + (row % 2) * 6; bx < tx + towerW; bx += 10) {
          g.fillRect(bx, gy - towerH + 4 + row * 14, 1, 12);
        }
      }
      // 壁龛顶部垛口
      g.fillStyle(0x8A8A8A);
      for (let cx = tx; cx < tx + towerW - crenW + 2; cx += crenW + crenGap) {
        g.fillRect(cx, gy - towerH - crenH, crenW, crenH);
        g.fillStyle(0x5A5A5A); g.fillRect(cx, gy - towerH - crenH, crenW, 2);
        g.fillStyle(0x8A8A8A);
      }
      // 点燃的火把架
      g.fillStyle(0x4A3D2A); g.fillRect(tx + Math.floor(towerW / 2) - 1, gy - towerH + 6, 2, 8);
      g.fillStyle(0xff8820); g.fillRect(tx + Math.floor(towerW / 2) - 1, gy - towerH + 3, 2, 4);
      g.fillStyle(0xffcc40); g.fillRect(tx + Math.floor(towerW / 2), gy - towerH + 2, 1, 2);
    }

    // ── 门（双扇厚木板配铁带）──
    const gateH = 40;
    const gateY = gy - gateH;
    const half  = Math.floor(gateW / 2);
    g.fillStyle(0xC8A86A); g.fillRect(wx, gateY, half - 1, gateH);
    g.fillStyle(0xC8A86A); g.fillRect(wx + half + 1, gateY, gateW - half - 1, gateH);
    // 铁带横条（加固）
    g.fillStyle(0x4A3D2A);
    for (const gy2 of [gateY + 5, gateY + gateH / 2 - 1, gateY + gateH - 7]) {
      g.fillRect(wx, gy2, gateW, 3);
    }
    // 铆钉（四角）
    g.fillStyle(0x282018);
    for (const [rx, ry] of [[wx+3, gateY+7],[wx+gateW-6, gateY+7],[wx+3, gateY+gateH-9],[wx+gateW-6, gateY+gateH-9]] as [number,number][]) {
      g.fillRect(rx, ry, 3, 3);
    }
    // 门缝
    g.fillStyle(0x3a2a10); g.fillRect(wx + half - 1, gateY, 2, gateH);
    // 门洞上方拱头（简单横梁）
    g.fillStyle(0x5A5A5A); g.fillRect(wx - 2, gateY - 4, gateW + 4, 4);
    // 鹅卵石门前路
    g.fillStyle(0x888070); g.fillRect(wx - 4, gy - 5, gateW + 8, 5);
  }

  // ─── Lv3: 整砌城墙 ───────────────────────────────────────────────────────
  private _drawWallLv3(g: Phaser.GameObjects.Graphics, gy: number, wallX: number) {
    const wallH  = 80;
    const gateW  = 40;
    const wingW  = 80;
    const towerW = 22;
    const wx     = wallX - Math.floor(gateW / 2);
    const crenH  = 12;
    const crenW  = 9;
    const crenGap = 7;

    // ── 两翼整石城墙 ──
    for (const [wingX, ww] of [[wx - wingW, wingW], [wx + gateW, wingW]] as [number, number][]) {
      g.fillStyle(0xA0A0A8); g.fillRect(wingX, gy - wallH, ww, wallH);
      g.fillStyle(0x686878);
      for (let row = 0; row < 5; row++) {
        const rowY = gy - wallH + 3 + row * 15;
        g.fillRect(wingX, rowY, ww, 1);
        const offset = (row % 2) * 12;
        for (let bx = wingX + offset; bx < wingX + ww; bx += 22) {
          g.fillRect(bx, rowY - 13, 1, 14);
        }
      }
      g.fillStyle(0xb8b8c0); g.fillRect(wingX, gy - wallH, ww, 2);
      // 阶梯式垛口
      for (let cx = wingX + 2; cx < wingX + ww - crenW; cx += crenW + crenGap) {
        g.fillStyle(0xA0A0A8); g.fillRect(cx, gy - wallH - crenH, crenW, crenH);
        g.fillStyle(0x686878); g.fillRect(cx, gy - wallH - crenH, crenW, 2);
        // 阶梯分层感
        g.fillStyle(0x888898); g.fillRect(cx + 1, gy - wallH - crenH + 3, crenW - 2, 2);
      }
    }

    // ── 方形侧塔 ──
    for (const tx of [wx - towerW - 2, wx + gateW + 2]) {
      const th = wallH + 22;
      g.fillStyle(0x9898a0); g.fillRect(tx, gy - th, towerW, th);
      // 石块砌缝
      g.fillStyle(0x686878);
      for (let row = 0; row < 6; row++) {
        const rowY = gy - th + 3 + row * 16;
        g.fillRect(tx, rowY, towerW, 1);
        const off = (row % 2) * 8;
        for (let bx = tx + off; bx < tx + towerW; bx += 14) {
          g.fillRect(bx, rowY - 14, 1, 15);
        }
      }
      // 水平腰带
      g.fillStyle(0x505060); g.fillRect(tx, gy - th + Math.floor(th / 2), towerW, 3);
      // 塔顶阶梯垛口
      for (let cx = tx; cx < tx + towerW - crenW + 2; cx += crenW + crenGap) {
        g.fillStyle(0x9898a0); g.fillRect(cx, gy - th - crenH, crenW, crenH);
        g.fillStyle(0x686878); g.fillRect(cx, gy - th - crenH, crenW, 2);
      }
      // 旗帜（红色）
      g.fillStyle(0x888898); g.fillRect(tx + Math.floor(towerW / 2) - 1, gy - th - crenH - 14, 2, 14);
      g.fillStyle(0xC8282E); g.fillRect(tx + Math.floor(towerW / 2) + 1, gy - th - crenH - 14, 8, 6);
      // 塔侧火把壁灯
      g.fillStyle(0x505060); g.fillRect(tx + 2, gy - th + 10, 2, 6);
      g.fillStyle(0xff8820); g.fillRect(tx + 2, gy - th + 7, 2, 4);
      g.fillStyle(0xffcc40); g.fillRect(tx + 2, gy - th + 6, 2, 2);
    }

    // ── 拱形城门 + 铁闸 ──
    const gateH = 48;
    const gateY = gy - gateH;
    const archR = Math.floor(gateW / 2);
    // 门洞背景（暗色）
    g.fillStyle(0x303040); g.fillRect(wx, gateY, gateW, gateH);
    // 拱顶（逐行模拟弧形）
    g.fillStyle(0x303040);
    for (let i = 0; i < archR; i++) {
      const arcW = Math.round(archR * 2 * Math.sqrt(1 - ((archR - i) / archR) ** 2));
      const arcX = wx + archR - Math.floor(arcW / 2);
      g.fillRect(arcX, gateY - archR + i, arcW, 1);
    }
    // 拱门石框
    g.fillStyle(0x888898);
    g.fillRect(wx - 2, gateY - archR, 4, gateH + archR); // 左柱
    g.fillRect(wx + gateW - 2, gateY - archR, 4, gateH + archR); // 右柱
    // 拱顶楔形石（keystone）
    g.fillStyle(0xF5D060); g.fillRect(wx + archR - 2, gateY - archR - 2, 4, 6);
    // 铁闸（portcullis）纵横格
    g.fillStyle(0x484858, 0.9);
    for (let bar = 0; bar < 4; bar++) {
      g.fillRect(wx + 3 + bar * 9, gateY, 3, gateH);
    }
    for (let row = 0; row < 3; row++) {
      g.fillRect(wx + 3, gateY + 8 + row * 12, gateW - 6, 2);
    }
    // 盾形族徽（门上方）
    const scx = wx + Math.floor(gateW / 2);
    g.fillStyle(0xC8282E); g.fillRect(scx - 5, gy - wallH - 12, 10, 12);
    g.fillStyle(0xF5D060); g.fillRect(scx - 2, gy - wallH - 10, 4, 4);
    g.fillStyle(0x686878); g.fillRect(scx - 6, gy - wallH - 13, 12, 2);
  }

  // ─── Lv4: 要塞城墙 ───────────────────────────────────────────────────────
  private _drawWallLv4(g: Phaser.GameObjects.Graphics, gy: number, wallX: number) {
    const wallH  = 96;
    const gateW  = 44;
    const wingW  = 80;
    const towerW = 26;
    const wx     = wallX - Math.floor(gateW / 2);
    const crenH  = 14;
    const crenW  = 10;
    const crenGap = 8;

    // ── 两翼厚重深色花岗岩城墙 ──
    for (const [wingX, ww] of [[wx - wingW, wingW], [wx + gateW, wingW]] as [number, number][]) {
      g.fillStyle(0x4A4A5A); g.fillRect(wingX, gy - wallH, ww, wallH);
      // 凿痕纹理（花岗岩感）
      g.fillStyle(0x2A2A38);
      for (let row = 0; row < 6; row++) {
        const rowY = gy - wallH + 2 + row * 15;
        g.fillRect(wingX, rowY, ww, 1);
        const off = (row % 2) * 10;
        for (let bx = wingX + off; bx < wingX + ww; bx += 18) {
          g.fillRect(bx, rowY - 13, 1, 14);
        }
      }
      // 微小凿痕点
      g.fillStyle(0x3a3a4a);
      for (let i = 0; i < 8; i++) {
        g.fillRect(wingX + 4 + (i * 11 % (ww - 8)), gy - wallH + 6 + (i * 7 % (wallH - 12)), 2, 1);
      }
      // 悬挑墙顶（machicolations — 凸出齿形）
      g.fillStyle(0x3a3a4a);
      for (let cx = wingX; cx < wingX + ww; cx += 10) {
        g.fillRect(cx, gy - wallH - 4, 8, 4);
      }
      // 交错高度垛口
      for (let i = 0, cx = wingX + 2; cx < wingX + ww - crenW; cx += crenW + crenGap, i++) {
        const extraH = (i % 2 === 0) ? 4 : 0;
        g.fillStyle(0x4A4A5A); g.fillRect(cx, gy - wallH - crenH - extraH, crenW, crenH + extraH);
        g.fillStyle(0x2A2A38); g.fillRect(cx, gy - wallH - crenH - extraH, crenW, 2);
      }
    }

    // ── 圆形棱堡侧翼（bastions）──
    for (const tx of [wx - towerW - 4, wx + gateW + 4]) {
      const th = wallH + 28;
      const rad = Math.floor(towerW / 2);
      // 圆形塔身（用矩形近似）
      g.fillStyle(0x404050); g.fillRect(tx, gy - th, towerW, th);
      // 圆弧前沿（凸出）
      for (let i = 0; i < th; i += 2) {
        const bulge = Math.round(rad * 0.3 * Math.sin((i / th) * Math.PI));
        g.fillRect(tx - bulge, gy - th + i, towerW + bulge * 2, 2);
      }
      // 塔身石缝
      g.fillStyle(0x2A2A38);
      for (let row = 0; row < 7; row++) {
        g.fillRect(tx - 2, gy - th + 3 + row * 14, towerW + 4, 1);
      }
      // 箭孔（arrow slits）
      g.fillStyle(0x181828);
      g.fillRect(tx + rad - 1, gy - th + 18, 2, 8);
      g.fillRect(tx + rad - 1, gy - th + 36, 2, 8);
      // 悬挑马面（overhanging machicolations）
      g.fillStyle(0x2A2A38);
      for (let cx = tx - 2; cx < tx + towerW + 2; cx += 8) {
        g.fillRect(cx, gy - th - 5, 6, 5);
      }
      // 塔顶交错垛口
      for (let cx = tx - 2; cx < tx + towerW; cx += crenW + crenGap) {
        g.fillStyle(0x404050); g.fillRect(cx, gy - th - crenH, crenW, crenH);
        g.fillStyle(0x2A2A38); g.fillRect(cx, gy - th - crenH, crenW, 2);
      }
      // 战旗（深红破损感）
      g.fillStyle(0x606060); g.fillRect(tx + rad - 1, gy - th - crenH - 16, 2, 16);
      g.fillStyle(0x8C1A1A); g.fillRect(tx + rad + 1, gy - th - crenH - 15, 9, 7);
      g.fillStyle(0x600000); g.fillRect(tx + rad + 7, gy - th - crenH - 13, 3, 5); // 撕裂效果
      // 投油锅座（oil cauldron mount）
      g.fillStyle(0x2A2A38); g.fillRect(tx + 2, gy - th + 8, towerW - 4, 3);
      g.fillStyle(0x181828); g.fillRect(tx + 5, gy - th + 4, towerW - 10, 5);
    }

    // ── 大型双层铁闸拱门 ──
    const gateH = 54;
    const gateY = gy - gateH;
    const archR = 16;
    // 门洞
    g.fillStyle(0x101018); g.fillRect(wx, gateY, gateW, gateH);
    // 拱顶
    for (let i = 0; i < archR; i++) {
      const arcW = Math.round(archR * 2 * Math.sqrt(1 - ((archR - i) / archR) ** 2));
      const arcX = wx + Math.floor(gateW / 2) - Math.floor(arcW / 2);
      g.fillStyle(0x101018); g.fillRect(arcX, gateY - archR + i, arcW, 1);
    }
    // 厚重石框
    g.fillStyle(0x383848);
    g.fillRect(wx - 3, gateY - archR, 5, gateH + archR);
    g.fillRect(wx + gateW - 2, gateY - archR, 5, gateH + archR);
    // 金属包裹门板
    g.fillStyle(0x282838);
    g.fillRect(wx + 2, gateY, Math.floor(gateW / 2) - 2, gateH);
    g.fillRect(wx + Math.floor(gateW / 2) + 2, gateY, gateW - Math.floor(gateW / 2) - 4, gateH);
    // 第一层铁闸
    g.fillStyle(0x484858, 0.9);
    for (let bar = 0; bar < 5; bar++) {
      g.fillRect(wx + 3 + bar * 8, gateY, 3, gateH);
    }
    for (let row = 0; row < 4; row++) {
      g.fillRect(wx + 3, gateY + 6 + row * 12, gateW - 6, 2);
    }
    // 第二层铁闸（略微偏移，营造双层感）
    g.fillStyle(0x303040, 0.7);
    for (let bar = 0; bar < 4; bar++) {
      g.fillRect(wx + 6 + bar * 8, gateY + 4, 2, gateH - 4);
    }
    // 铁闸底部锯齿
    g.fillStyle(0x484858);
    for (let bar = 0; bar < 5; bar++) {
      g.fillRect(wx + 4 + bar * 8, gy - 5, 2, 5);
      g.fillRect(wx + 5 + bar * 8, gy - 7, 1, 2);
    }
    // 锁链（gate chains）
    g.fillStyle(0x484040);
    for (let i = 0; i < 6; i++) {
      g.fillRect(wx + 5, gy - wallH + 10 + i * 10, 2, 6);
      g.fillRect(wx + gateW - 7, gy - wallH + 10 + i * 10, 2, 6);
    }
    // 大剑徽章（crossed swords）
    const gcx = wx + Math.floor(gateW / 2);
    g.fillStyle(0x888898); g.fillRect(gcx - 1, gy - wallH - 14, 2, 14);  // 竖剑
    g.fillRect(gcx - 7, gy - wallH - 10, 14, 2);  // 横剑
    g.fillStyle(0xaaaaaa); g.fillRect(gcx - 5, gy - wallH - 12, 2, 2);  // 护手
    g.fillRect(gcx + 3, gy - wallH - 12, 2, 2);
    // 拱顶楔形石符文（蓝色发光）
    g.fillStyle(0x6A8CFF); g.fillRect(gcx - 2, gateY - archR - 3, 4, 4);
    g.fillStyle(0x4a6aff, 0.7); g.fillRect(gcx - 3, gateY - archR - 4, 6, 1);
  }

  // ─── Lv5: 传说城墙 ───────────────────────────────────────────────────────
  private _drawWallLv5(g: Phaser.GameObjects.Graphics, gy: number, wallX: number) {
    const wallH  = 118;
    const gateW  = 50;
    const wingW  = 80;
    const towerW = 30;
    const wx     = wallX - Math.floor(gateW / 2);
    const crenH  = 16;
    const crenW  = 12;
    const crenGap = 9;

    // ── 两翼大理石城墙 ──
    for (const [wingX, ww] of [[wx - wingW, wingW], [wx + gateW, wingW]] as [number, number][]) {
      // 大理石白底
      g.fillStyle(0xE8E0CC); g.fillRect(wingX, gy - wallH, ww, wallH);
      // 金色纹理嵌入（marble veins）
      g.fillStyle(0xC8A830);
      for (let i = 0; i < 5; i++) {
        const vx = wingX + 4 + (i * 17 % (ww - 8));
        g.fillRect(vx, gy - wallH + 2, 1, wallH - 4);
      }
      // 石砌缝（精整）
      g.fillStyle(0xc0b8a0);
      for (let row = 0; row < 7; row++) {
        const rowY = gy - wallH + 3 + row * 16;
        g.fillRect(wingX, rowY, ww, 1);
        const off = (row % 2) * 14;
        for (let bx = wingX + off; bx < wingX + ww; bx += 26) {
          g.fillRect(bx, rowY - 14, 1, 15);
        }
      }
      // 顶部高光
      g.fillStyle(0xf8f0dc); g.fillRect(wingX, gy - wallH, ww, 2);
      // 骑士头盔形垛口
      for (let i = 0, cx = wingX + 2; cx < wingX + ww - crenW; cx += crenW + crenGap, i++) {
        g.fillStyle(0xE8E0CC); g.fillRect(cx, gy - wallH - crenH, crenW, crenH);
        // 头盔形状：顶部弧形（用梯形近似）
        g.fillStyle(0xC8A830); g.fillRect(cx + 2, gy - wallH - crenH - 4, crenW - 4, 4);
        g.fillStyle(0xd4c898); g.fillRect(cx, gy - wallH - crenH, crenW, 2);
      }
      // 金链装饰（两端）
      g.fillStyle(0xC8A830);
      for (let i = 0; i < 3; i++) {
        g.fillRect(wingX + 2 + i * 4, gy - wallH + 4 + i, 2, 2);
      }
    }

    // ── 高塔（锥形帽 + 金尖顶）──
    for (const tx of [wx - towerW - 4, wx + gateW + 4]) {
      const th = wallH + 30;
      // 塔身
      g.fillStyle(0xdcd4b8); g.fillRect(tx, gy - th, towerW, th);
      // 金色嵌线
      g.fillStyle(0xC8A830);
      for (let i = 0; i < 4; i++) {
        const vx = tx + 3 + (i * 8 % (towerW - 6));
        g.fillRect(vx, gy - th + 2, 1, th - 4);
      }
      // 石缝
      g.fillStyle(0xc0b8a0);
      for (let row = 0; row < 8; row++) {
        g.fillRect(tx, gy - th + 3 + row * 14, towerW, 1);
        const off = (row % 2) * 8;
        for (let bx = tx + off; bx < tx + towerW; bx += 14) {
          g.fillRect(bx, gy - th + 3 + row * 14 - 12, 1, 13);
        }
      }
      // 腰带（水平金色）
      g.fillStyle(0xC8A830); g.fillRect(tx, gy - th + Math.floor(th / 2), towerW, 3);
      // 锥形帽（conical roof）
      const roofH = 20;
      for (let i = 0; i < roofH; i++) {
        const rw = Math.round(towerW * (roofH - i) / roofH);
        const rx = tx + Math.floor((towerW - rw) / 2);
        g.fillStyle(0x3A5A8C); g.fillRect(rx, gy - th - roofH + i, rw, 1);
      }
      // 金色尖顶
      g.fillStyle(0xF5D060); g.fillRect(tx + Math.floor(towerW / 2) - 1, gy - th - roofH - 8, 2, 8);
      g.fillStyle(0xffd040); g.fillRect(tx + Math.floor(towerW / 2) - 1, gy - th - roofH - 12, 2, 4);
      g.fillStyle(0xfff080); g.fillRect(tx + Math.floor(towerW / 2), gy - th - roofH - 14, 1, 2);
      // 大型纹章旗帜
      g.fillStyle(0xC8A830); g.fillRect(tx + 2, gy - th + 8, 2, 18);
      g.fillStyle(0x3A5A8C); g.fillRect(tx + 4, gy - th + 8, 12, 10);
      g.fillStyle(0xF5D060); g.fillRect(tx + 8, gy - th + 10, 4, 6); // 纹章金
      // 塔顶火焰台（brazier）
      g.fillStyle(0x888870); g.fillRect(tx + Math.floor(towerW / 2) - 3, gy - th - roofH - 1, 6, 4);
    }

    // ── 凯旋拱门 + 英雄浮雕 ──
    const gateH = 62;
    const gateY = gy - gateH;
    const archR = 20;
    // 门洞（暗色内部）
    g.fillStyle(0x201808); g.fillRect(wx, gateY, gateW, gateH);
    // 拱顶
    for (let i = 0; i < archR; i++) {
      const arcW = Math.round(archR * 2 * Math.sqrt(1 - ((archR - i) / archR) ** 2));
      const arcX = wx + Math.floor(gateW / 2) - Math.floor(arcW / 2);
      g.fillStyle(0x201808); g.fillRect(arcX, gateY - archR + i, arcW, 1);
    }
    // 大理石门框（宽厚）
    g.fillStyle(0xE8E0CC);
    g.fillRect(wx - 4, gateY - archR, 6, gateH + archR);
    g.fillRect(wx + gateW - 2, gateY - archR, 6, gateH + archR);
    // 拱顶楔形金石
    g.fillStyle(0xC8A830); g.fillRect(wx + Math.floor(gateW / 2) - 3, gateY - archR - 4, 6, 6);
    // 拱肩浮雕（hero reliefs — 简化为纹章图案）
    g.fillStyle(0xd4cc98);
    g.fillRect(wx + 6, gateY - archR + 4, 8, 10); // 左浮雕块
    g.fillRect(wx + gateW - 14, gateY - archR + 4, 8, 10); // 右浮雕块
    g.fillStyle(0xC8A830);
    g.fillRect(wx + 9, gateY - archR + 6, 2, 6);   // 左浮雕纹
    g.fillRect(wx + gateW - 11, gateY - archR + 6, 2, 6); // 右浮雕纹
    // 门板（金属包面）
    g.fillStyle(0x4a3820); g.fillRect(wx + 2, gateY, Math.floor(gateW / 2) - 2, gateH);
    g.fillStyle(0x4a3820); g.fillRect(wx + Math.floor(gateW / 2) + 2, gateY, gateW - Math.floor(gateW / 2) - 4, gateH);
    // 金色铆钉装饰
    g.fillStyle(0xF5D060);
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 3; col++) {
        g.fillRect(wx + 5 + col * 8, gateY + 6 + row * 13, 2, 2);
        g.fillRect(wx + Math.floor(gateW / 2) + 5 + col * 8, gateY + 6 + row * 13, 2, 2);
      }
    }
    // 门缝
    g.fillStyle(0x201808); g.fillRect(wx + Math.floor(gateW / 2) - 1, gateY, 2, gateH);
    // 门上方发光魔法护盾浮入墙面
    const scx = wx + Math.floor(gateW / 2);
    g.fillStyle(0x3A5A8C); g.fillRect(scx - 7, gy - wallH - 16, 14, 16);
    g.fillStyle(0xF5D060); g.fillRect(scx - 4, gy - wallH - 13, 8, 8);
    g.fillStyle(0xF0C860, 0.6); g.fillRect(scx - 2, gy - wallH - 11, 4, 4); // 光晕
    // 金链装饰（两塔之间）
    g.fillStyle(0xC8A830);
    for (let i = 0; i < 8; i++) {
      const cx2 = wx - towerW + i * Math.floor((gateW + towerW * 2) / 7);
      const sag = Math.round(4 * Math.sin((i / 7) * Math.PI));
      g.fillRect(cx2, gy - wallH - 4 + sag, 3, 2);
    }
  }

  // ─── Lv6: 神圣永恒城墙 ───────────────────────────────────────────────────
  private _drawWallLv6(g: Phaser.GameObjects.Graphics, gy: number, wallX: number) {
    const wallH  = 144;
    const gateW  = 56;
    const wingW  = 80;
    const towerW = 34;
    const wx     = wallX - Math.floor(gateW / 2);
    const crenH  = 18;
    const crenW  = 14;
    const crenGap = 10;

    // ── 两翼神圣乳白城墙（全面符文覆盖）──
    for (const [wingX, ww] of [[wx - wingW, wingW], [wx + gateW, wingW]] as [number, number][]) {
      // 乳白石底
      g.fillStyle(0xF8F4E8); g.fillRect(wingX, gy - wallH, ww, wallH);
      // 精整砌缝（极细）
      g.fillStyle(0xd8d4c0);
      for (let row = 0; row < 8; row++) {
        const rowY = gy - wallH + 2 + row * 17;
        g.fillRect(wingX, rowY, ww, 1);
        const off = (row % 2) * 16;
        for (let bx = wingX + off; bx < wingX + ww; bx += 28) {
          g.fillRect(bx, rowY - 15, 1, 16);
        }
      }
      // 金色符文（发光）覆盖整面墙
      g.fillStyle(0xFFD700);
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 4; col++) {
          const rx = wingX + 4 + col * Math.floor((ww - 8) / 3);
          const ry = gy - wallH + 10 + row * Math.floor((wallH - 20) / 4);
          // 符文形状（T形/十字）
          g.fillRect(rx, ry, 4, 1);
          g.fillRect(rx + 1, ry - 3, 2, 7);
        }
      }
      // 天界蓝白光晕叠加
      g.fillStyle(0xA0C8FF, 0.3);
      for (let i = 0; i < 6; i++) {
        g.fillRect(wingX + 2 + (i * 14 % (ww - 4)), gy - wallH + 4 + (i * 9 % (wallH - 8)), 5, 2);
      }
      // 天使翼形垛口
      for (let i = 0, cx = wingX + 2; cx < wingX + ww - crenW; cx += crenW + crenGap, i++) {
        g.fillStyle(0xF8F4E8); g.fillRect(cx, gy - wallH - crenH, crenW, crenH);
        g.fillStyle(0xFFD700); g.fillRect(cx, gy - wallH - crenH, crenW, 2);
        // 翅膀展开形（向两侧微翘）
        g.fillStyle(0xF8F4E8);
        g.fillRect(cx - 2, gy - wallH - crenH + 4, 3, crenH - 6);  // 左翼
        g.fillRect(cx + crenW - 1, gy - wallH - crenH + 4, 3, crenH - 6); // 右翼
        g.fillStyle(0xFFD700);
        g.fillRect(cx - 2, gy - wallH - crenH + 4, 3, 2);
        g.fillRect(cx + crenW - 1, gy - wallH - crenH + 4, 3, 2);
      }
      // 顶边金色镶边
      g.fillStyle(0xFFD700); g.fillRect(wingX, gy - wallH, ww, 2);
    }

    // ── 以太灵塔（双塔，星月顶饰）──
    for (const tx of [wx - towerW - 4, wx + gateW + 4]) {
      const th = wallH + 40;
      // 塔身（乳白）
      g.fillStyle(0xF0ECE0); g.fillRect(tx, gy - th, towerW, th);
      // 符文密布
      g.fillStyle(0xFFD700);
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 2; col++) {
          const rx = tx + 4 + col * Math.floor(towerW / 2);
          const ry = gy - th + 6 + row * Math.floor((th - 12) / 7);
          g.fillRect(rx, ry, 3, 1);
          g.fillRect(rx + 1, ry - 2, 1, 5);
        }
      }
      // 天界蓝光
      g.fillStyle(0xA0C8FF, 0.4);
      for (let i = 0; i < 5; i++) {
        g.fillRect(tx + 2 + (i * 6 % (towerW - 4)), gy - th + 5 + i * 8, 4, 2);
      }
      // 腰带（金色三道）
      g.fillStyle(0xFFD700);
      for (const belt of [0.25, 0.5, 0.75]) {
        g.fillRect(tx, gy - th + Math.floor(th * belt), towerW, 3);
      }
      // 锥形塔帽
      const roofH = 26;
      for (let i = 0; i < roofH; i++) {
        const rw = Math.round(towerW * (roofH - i) / roofH);
        const rx = tx + Math.floor((towerW - rw) / 2);
        g.fillStyle(i < 4 ? 0xFFD700 : 0xA0C8FF); g.fillRect(rx, gy - th - roofH + i, rw, 1);
      }
      // 星月顶饰（crescent + star）
      const spireX = tx + Math.floor(towerW / 2);
      g.fillStyle(0xFFD700);
      g.fillRect(spireX - 1, gy - th - roofH - 12, 2, 12); // 杆
      g.fillRect(spireX - 4, gy - th - roofH - 18, 8, 2);  // 弦月横
      g.fillRect(spireX - 2, gy - th - roofH - 20, 4, 2);  // 弦月弧
      g.fillRect(spireX - 5, gy - th - roofH - 22, 2, 4);  // 左角
      g.fillRect(spireX + 3, gy - th - roofH - 22, 2, 4);  // 右角
      g.fillStyle(0xfff0a0); g.fillRect(spireX, gy - th - roofH - 14, 1, 1); // 星点
      // 神圣焰柱（divine flame pillars）
      g.fillStyle(0xFF9820); g.fillRect(tx + Math.floor(towerW / 2) - 2, gy - th + 4, 4, 8);
      g.fillStyle(0xFFD700); g.fillRect(tx + Math.floor(towerW / 2) - 1, gy - th + 2, 2, 4);
      g.fillStyle(0xfff8e0); g.fillRect(tx + Math.floor(towerW / 2), gy - th + 1, 1, 2);
      // 天界旗帜（带神祇符号）
      g.fillStyle(0xFFD700); g.fillRect(tx + 3, gy - th + 14, 2, 18);
      g.fillStyle(0xA0C8FF); g.fillRect(tx + 5, gy - th + 14, 14, 11);
      g.fillStyle(0xFFD700); g.fillRect(tx + 10, gy - th + 17, 4, 5); // 神祇符
      g.fillRect(tx + 12, gy - th + 15, 1, 9); // 符文十字
    }

    // ── 天界圣门（太阳光芒纹纯金属）──
    const gateH = 72;
    const gateY = gy - gateH;
    const archR = 24;
    // 神圣光晕背景（门拱顶放射）
    g.fillStyle(0xFFD700, 0.15);
    for (let r = archR + 10; r > archR; r--) {
      const rw = r * 2;
      g.fillRect(wx + Math.floor(gateW / 2) - r, gateY - archR - (r - archR), rw, 1);
    }
    // 门洞（神圣光）
    g.fillStyle(0xf0e8c0); g.fillRect(wx, gateY, gateW, gateH);
    // 拱顶
    for (let i = 0; i < archR; i++) {
      const arcW = Math.round(archR * 2 * Math.sqrt(1 - ((archR - i) / archR) ** 2));
      const arcX = wx + Math.floor(gateW / 2) - Math.floor(arcW / 2);
      g.fillStyle(0xf0e8c0); g.fillRect(arcX, gateY - archR + i, arcW, 1);
    }
    // 纯金属门框（厚重）
    g.fillStyle(0xFFD700);
    g.fillRect(wx - 5, gateY - archR, 7, gateH + archR);
    g.fillRect(wx + gateW - 2, gateY - archR, 7, gateH + archR);
    // 金属门板（太阳光芒纹）
    g.fillStyle(0xF5D060);
    g.fillRect(wx + 2, gateY, Math.floor(gateW / 2) - 2, gateH);
    g.fillRect(wx + Math.floor(gateW / 2) + 2, gateY, gateW - Math.floor(gateW / 2) - 4, gateH);
    // 太阳光芒纹（放射线）
    const dcx = wx + Math.floor(gateW / 2);
    const dcy = gateY + Math.floor(gateH / 2);
    g.fillStyle(0xFF9820);
    for (let angle = 0; angle < 8; angle++) {
      const rad = (angle * Math.PI) / 4;
      for (let r = 4; r < 16; r++) {
        const rx = Math.round(dcx + r * Math.cos(rad));
        const ry = Math.round(dcy + r * Math.sin(rad));
        g.fillRect(rx - 1, ry - 1, 2, 2);
      }
    }
    g.fillStyle(0xFFD700); g.fillRect(dcx - 3, dcy - 3, 6, 6); // 太阳核
    // 金色铆钉
    g.fillStyle(0xff9820);
    for (let row = 0; row < 4; row++) {
      g.fillRect(wx + 4, gateY + 5 + row * 15, 2, 2);
      g.fillRect(wx + gateW - 6, gateY + 5 + row * 15, 2, 2);
    }
    // 门缝（细金线）
    g.fillStyle(0xFFD700); g.fillRect(wx + Math.floor(gateW / 2) - 1, gateY, 2, gateH);
    // 拱顶楔形金石
    g.fillStyle(0xfff8c0); g.fillRect(wx + Math.floor(gateW / 2) - 3, gateY - archR - 5, 6, 7);
    // 门顶神圣光圈（divine sigil circle）
    const sigX = wx + Math.floor(gateW / 2);
    const sigY = gy - wallH - 16;
    g.fillStyle(0xFFD700); g.fillRect(sigX - 8, sigY, 16, 3);   // 横
    g.fillRect(sigX - 1, sigY - 8, 3, 18);  // 竖
    g.fillRect(sigX - 6, sigY - 5, 12, 12); // 外圆（方形近似）
    g.fillStyle(0xF8F4E8); g.fillRect(sigX - 4, sigY - 3, 8, 8);  // 内填充
    g.fillStyle(0xFF9820); g.fillRect(sigX - 2, sigY - 1, 4, 4);  // 核心光
    // 浮空魔法球（光链锚定）
    for (const [ox, oy] of [[-20, -20], [20, -20]] as [number, number][]) {
      const bx = wx + Math.floor(gateW / 2) + ox;
      const by = gy - wallH + oy;
      // 光链（虚线）
      g.fillStyle(0xFFD700, 0.6);
      for (let i = 0; i < 5; i++) {
        g.fillRect(bx + (ox > 0 ? -i * 3 : i * 3), by + i * 3, 2, 2);
      }
      // 魔法球
      g.fillStyle(0xA0C8FF); g.fillRect(bx - 4, by - 4, 8, 8);
      g.fillStyle(0xfff8ff); g.fillRect(bx - 2, by - 2, 4, 4);
      g.fillStyle(0xFFD700, 0.8); g.fillRect(bx - 1, by - 1, 2, 2);
    }
    // 门基神圣火焰柱（divine flame pillars）
    for (const fx of [wx - 4, wx + gateW + 2]) {
      // 底座
      g.fillStyle(0xFFD700); g.fillRect(fx, gy - 16, 6, 16);
      g.fillStyle(0xF5D060); g.fillRect(fx - 1, gy - 18, 8, 4);
      // 火焰
      g.fillStyle(0xFF9820); g.fillRect(fx, gy - 24, 6, 8);
      g.fillStyle(0xFFD700); g.fillRect(fx + 1, gy - 28, 4, 6);
      g.fillStyle(0xfff8c0); g.fillRect(fx + 2, gy - 30, 2, 4);
    }
  }

  private buildZoneBuildings() {
    const gy = this.groundY;
    const scale = 3;
    const lv = store.townLevel;

    type DrawFnType = (g: Phaser.GameObjects.Graphics, x: number, y: number, s: number) => void;
    const zones: [string, DrawFnType, number][] = [
      [`bldg_shop_lv${lv}`,     (g, x, y, s) => drawShopBuilding(g, x, y, s, lv),   this.zoneConfig.shop],
      [`bldg_craft_lv${lv}`,    (g, x, y, s) => drawCraftBuilding(g, x, y, s, lv),  this.zoneConfig.craft],
      [`bldg_townhall_lv${lv}`, (g, x, y, s) => drawTownHall(g, x, y, s, lv),       this.zoneConfig.town],
      [`bldg_barracks_lv${lv}`, (g, x, y, s) => drawCombatBuilding(g, x, y, s, lv), this.zoneConfig.barracks],
    ];

    const [tw, th] = bldgTexSize(lv);
    for (const [key, fn, cx] of zones) {
      if (!this.textures.exists(key)) {
        const g = this.add.graphics();
        fn(g, 0, 0, scale);
        g.generateTexture(key, tw, th);
        g.destroy();
      }
      const img = this.add.image(cx, gy, key).setOrigin(0.5, 1);
      this.bldgLayer.add(img);
      const shadow = this.add.graphics();
      shadow.fillStyle(0x000000, 0.22);
      shadow.fillEllipse(cx, gy + 3, tw + 4, 10);
      this.bldgLayer.add(shadow);
    }

    const labelStyle = {
      fontFamily: '"Silkscreen", monospace', fontSize: '16px',
      color: '#c8b890', stroke: '#000', strokeThickness: 2,
    };
    ([
      [this.zoneConfig.shop,    '商店'],
      [this.zoneConfig.craft,   '制造'],
      [this.zoneConfig.town,    '大厅'],
      [this.zoneConfig.barracks,'兵营'],
    ] as [number, string][]).forEach(([x, txt]) => {
      const t = this.add.text(x, gy - 68, txt, labelStyle).setOrigin(0.5, 1);
      this.bldgLayer.add(t);
    });
  }

  private maybeSpawnPasserby() {
    if (store.isUnderSiege || this.passerbyList.length >= 6) return;
    if (!this.textures.exists('passerby_tex')) {
      const g = this.add.graphics();
      drawPasserby(g, 0, 0, 3);
      g.generateTexture('passerby_tex', 18, 24);
      g.destroy();
    }
    const fromLeft = Math.random() > 0.5;
    const startX   = fromLeft ? this.zoneConfig.wallLeft + 10 : this.zoneConfig.wallRight - 10;
    const img      = this.add.image(startX, this.groundY, 'passerby_tex').setOrigin(0.5, 1);
    img.setFlipX(!fromLeft);
    this.entityLayer.add(img);
    this.passerbyList.push({
      img, x: startX,
      speed: (fromLeft ? 1 : -1) * (20 + Math.random() * 14),
      groundY: this.groundY,
      hasTraded: false,
    });
  }

  private updatePasserby(dt: number) {
    for (let i = this.passerbyList.length - 1; i >= 0; i--) {
      const p = this.passerbyList[i];
      p.x += p.speed * dt;
      p.img.setPosition(p.x, p.groundY + Math.sin(p.x * 0.05) * 1.5);

      if (!p.hasTraded && store.totalProducts > 0) {
        const inShopZone = Math.abs(p.x - this.zoneConfig.shop) < 55;
        if (inShopZone) {
          let nearestWorkerSp: FieldSprite | null = null;
          let nearestDist = Infinity;
          for (const c of store.field) {
            const d = defById(c.definitionId);
            if (d.type !== CardType.Human || c.jobAssignment !== JobType.Shop || !c.isActive) continue;
            const wSp = this.sprites.get(c.instanceId);
            if (!wSp || wSp.shopServeTarget || wSp.isDead) continue;
            const dist = Math.abs(wSp.x - p.x);
            if (dist < nearestDist) { nearestDist = dist; nearestWorkerSp = wSp; }
          }
          if (nearestWorkerSp) {
            nearestWorkerSp.shopServeTarget = { x: p.x, timer: 28 };
            p.hasTraded = true;
            this.spawnBubble(p.x, p.groundY, '💰');
          }
        }
      }

      if (p.x < this.zoneConfig.wallLeft - 20 || p.x > this.zoneConfig.wallRight + 20) {
        p.img.destroy();
        this.passerbyList.splice(i, 1);
      }
    }
  }

  private spawnDamageText(x: number, y: number, dmg: number, color: string) {
    const txt = this.add.text(x, y - 20, `-${dmg}`, {
      fontFamily: '"Silkscreen", monospace',
      fontSize: '18px', color,
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5, 1);
    this.fxLayer.add(txt);
    this.tweens.add({
      targets: txt, y: y - 50, alpha: 0,
      duration: 800, ease: 'Quad.Out',
      onComplete: () => txt.destroy(),
    });
  }

  private spawnBubble(x: number, y: number, text: string) {
    const bubble = this.add.text(x, y - 20, text, { fontSize: '20px' }).setOrigin(0.5, 1);
    this.fxLayer.add(bubble);
    this.tweens.add({
      targets: bubble, y: y - 54, alpha: 0,
      duration: 1100, ease: 'Quad.Out',
      onComplete: () => bubble.destroy(),
    });
  }

  private spawnCombatFX(x: number, y: number) {
    const colors = [0xffd040, 0xff8020, 0xffffff, 0xff4040];
    for (let i = 0; i < 8; i++) {
      const dot = this.add.graphics();
      this.fxLayer.add(dot);
      dot.fillStyle(colors[i % colors.length]);
      dot.fillRect(0, 0, 4, 4);
      dot.setPosition(x, y);
      const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.4;
      this.tweens.add({
        targets: dot,
        x: x + Math.cos(angle) * (18 + Math.random() * 22),
        y: y + Math.sin(angle) * (18 + Math.random() * 22),
        alpha: 0, duration: 450, ease: 'Quad.Out',
        onComplete: () => dot.destroy(),
      });
    }
  }

  private buildSideLog() {
    const existing = document.getElementById('side-log');
    if (existing) { this.sideLogEl = existing; return; }
    const panel = document.createElement('div');
    panel.id = 'side-log';
    panel.style.cssText = `
      position:absolute; right:0; top:40px; bottom:170px;
      width:220px; overflow-y:auto; overflow-x:hidden;
      background:rgba(10,5,2,0.82); border-left:2px solid #5a3a1a;
      padding:8px 0; z-index:8; pointer-events:auto;
      scrollbar-width:thin; scrollbar-color:#5a3a1a transparent;
      transition: width 0.2s ease;
    `;
    // Stop wheel events from bubbling to the Phaser canvas (which would trigger camera zoom)
    panel.addEventListener('wheel', e => { e.stopPropagation(); }, { passive: true });
    document.getElementById('game-container')!.appendChild(panel);
    this.sideLogEl = panel;
    for (const e of [...store.log].reverse()) this.pushLogEntry(e);
  }

  private pushLogEntry(entry: LogEntry) {
    if (!this.sideLogEl) return;
    const el  = document.createElement('div');
    const col = entry.kind === 'good' ? '#60cc60'
              : entry.kind === 'bad'  ? '#cc6060'
              : '#9a8a70';
    el.style.cssText = `font-family:'Silkscreen',monospace;font-size:9px;
      color:${col};padding:3px 10px;border-bottom:1px solid #2a1a0a;
      line-height:1.5;opacity:0;transition:opacity 0.3s;`;
    el.textContent = `[${entry.month}月] ${entry.text}`;
    this.sideLogEl.prepend(el);
    requestAnimationFrame(() => { el.style.opacity = '1'; });
    while (this.sideLogEl.children.length > 60)
      this.sideLogEl.removeChild(this.sideLogEl.lastChild!);
  }

  // ── Drag-and-drop support (called by UIController) ───────────────────────────

  /**
   * Generate grid cell X-coordinates for monster placement on one side.
   * Generates cells outward from the wall until at least one empty cell exists.
   */
  private generateMonsterCells(side: 'left' | 'right'): number[] {
    const { wallLeft, wallRight } = this.zoneConfig;
    const GAP   = 160;
    const start = side === 'left' ? wallLeft  - 200 : wallRight + 200;
    const dir   = side === 'left' ? -1 : 1;

    const occupiedXs = store.field
      .filter(c => defById(c.definitionId).type === CardType.Monster && c.fieldX != null)
      .map(c => c.fieldX!);
    const isOccupied = (x: number) => occupiedXs.some(ox => Math.abs(ox - x) < GAP * 0.8);

    const cells: number[] = [];
    // Generate at least 3 cells, and enough so there is at least one empty
    while (cells.length < 3 || cells.every(x => isOccupied(x))) {
      cells.push(start + dir * cells.length * GAP);
      if (cells.length > 12) break; // safety cap
    }
    return cells;
  }

  /**
   * Generate grid cell X-coordinates for building placement inside the walls.
   * Cells are generated per-segment: each segment contributes cells from
   * (anchorLeft + 70) to (anchorRight - 70) with 140 px steps.
   * If all cells are occupied, one overflow cell is appended.
   */
  private generateBuildingCells(): number[] {
    const { shop, craft, town, barracks } = this.zoneConfig;
    const GAP = 140;

    const segments: [number, number][] = [
      [shop + 70, craft - 70],    // seg0: between shop and craft
      [craft + 70, town - 70],    // seg1: between craft and town
      [town + 70, barracks - 70], // seg2: between town and barracks
    ];

    const cells: number[] = [];
    for (const [start, end] of segments) {
      for (let x = start; x <= end + 0.5; x += GAP) {
        cells.push(Math.round(x));
      }
    }

    const occupiedXs = store.field
      .filter(c => defById(c.definitionId).type === CardType.Building && c.fieldX != null)
      .map(c => c.fieldX!);
    const isOccupied = (x: number) => occupiedXs.some(ox => Math.abs(ox - x) < GAP * 0.8);

    // Safety overflow: if all cells are full, extend one extra slot to the right
    if (cells.length > 0 && cells.every(x => isOccupied(x))) {
      cells.push(cells[cells.length - 1] + GAP);
    }
    return cells;
  }

  /** Highlight valid drop areas for the given card type. */
  showDropZones(cardType: CardType, _defId: string) {
    this.hideDropZones();
    const z  = this.zoneConfig;
    const gy = this.groundY;
    const H  = this.sceneH;

    const labelStyle = {
      fontFamily: '"Silkscreen", monospace',
      fontSize: '16px',
      color: '#ffd040',
      stroke: '#000000',
      strokeThickness: 2,
    };

    const addZone = (x: number, w: number, label: string) => {
      const g = this.add.graphics();
      g.fillStyle(0xffd040, 0.18);
      g.fillRect(x, 0, w, H - 20);
      g.lineStyle(1.5, 0xffd040, 0.65);
      g.strokeRect(x, 0, w, H - 20);
      const t = this.add.text(x + w / 2, gy - 90, label, labelStyle).setOrigin(0.5, 1);
      this.fxLayer.add(g);
      this.fxLayer.add(t);
      this.dropZoneOverlays.push(g, t);
    };

    /**
     * Draw a per-cell glowing highlight with pulsing alpha.
     * cellWidth should be (gridGAP - 12) so cells nearly fill the gap with only a
     * small margin on each side (~6 px world units ≈ ~2 mm on screen).
     */
    const addCellHighlight = (cx: number, cellWidth: number) => {
      const W = cellWidth, cellH = 170;
      const x0 = cx - W / 2;
      const y0 = gy - cellH;
      const arm = 10; // corner bracket arm length

      const g = this.add.graphics();

      // Main semi-transparent fill
      g.fillStyle(0xffd040, 1);
      g.fillRect(x0, y0, W, cellH);

      // Subtle inner shine strip
      g.fillStyle(0xfffff0, 0.12);
      g.fillRect(x0 + 4, y0 + 4, W - 8, cellH - 12);

      // Ground-level emphasis band
      g.fillStyle(0xffe870, 1);
      g.fillRect(x0, gy - 7, W, 7);

      // Outer border
      g.lineStyle(2, 0xffe060, 1);
      g.strokeRect(x0, y0, W, cellH);

      // Corner bracket accents (L-shapes)
      g.fillStyle(0xffffff, 1);
      g.fillRect(x0,           y0,       arm, 2); g.fillRect(x0,           y0,       2, arm);
      g.fillRect(x0 + W - arm, y0,       arm, 2); g.fillRect(x0 + W - 2,   y0,       2, arm);
      g.fillRect(x0,           gy - 2,   arm, 2); g.fillRect(x0,           gy - arm, 2, arm);
      g.fillRect(x0 + W - arm, gy - 2,   arm, 2); g.fillRect(x0 + W - 2,   gy - arm, 2, arm);

      // Downward chevron "drop here" indicator near top centre
      const chevY = y0 + 18;
      g.fillRect(cx - 9, chevY,      18, 3);
      g.fillRect(cx - 6, chevY + 5,  12, 3);
      g.fillRect(cx - 3, chevY + 10,  6, 3);

      g.setAlpha(0.18);
      this.fxLayer.add(g);
      this.dropZoneOverlays.push(g);
      this.tweens.add({
        targets: g,
        alpha: { from: 0.18, to: 0.50 },
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      });
    };

    if (cardType === CardType.Human) {
      addZone(z.shop    - 120, 240, '商店');
      addZone(z.craft   - 120, 240, '制造');
      addZone(z.barracks - 120, 240, '兵营');
    } else if (cardType === CardType.Monster) {
      const GAP = 160;
      const occupiedXs = store.field
        .filter(c => defById(c.definitionId).type === CardType.Monster && c.fieldX != null)
        .map(c => c.fieldX!);
      const isOccupied = (x: number) => occupiedXs.some(ox => Math.abs(ox - x) < GAP * 0.8);

      for (const side of ['left', 'right'] as const) {
        const cells = this.generateMonsterCells(side);
        for (const cx of cells) {
          if (!isOccupied(cx)) addCellHighlight(cx, GAP - 12);
        }
      }
    } else if (cardType === CardType.Building) {
      const GAP = 140;
      const occupiedXs = store.field
        .filter(c => defById(c.definitionId).type === CardType.Building && c.fieldX != null)
        .map(c => c.fieldX!);
      const isOccupied = (x: number) => occupiedXs.some(ox => Math.abs(ox - x) < GAP * 0.8);

      const cells = this.generateBuildingCells();
      for (const cx of cells) {
        if (!isOccupied(cx)) addCellHighlight(cx, GAP - 12);
      }
    } else if (cardType === CardType.Magic) {
      addZone(z.wallLeft, z.wallRight - z.wallLeft, '放置区域');
    }
  }

  /** Remove all drop zone highlights. */
  hideDropZones() {
    for (const obj of this.dropZoneOverlays) {
      obj.destroy();
    }
    this.dropZoneOverlays = [];
  }

  /** Convert a CSS-pixel screen position to Phaser world coordinates. */
  screenToWorld(clientX: number, clientY: number): { worldX: number; worldY: number } {
    const rect = this.game.canvas.getBoundingClientRect();
    const cam  = this.cameras.main;
    const sx   = this.game.canvas.width  / rect.width;
    const sy   = this.game.canvas.height / rect.height;
    return {
      worldX: (clientX - rect.left) * sx / cam.zoom + cam.scrollX,
      worldY: (clientY - rect.top)  * sy / cam.zoom + cam.scrollY,
    };
  }

  /** Return the best matching drop zone for the given world X, or null if none. */
  hitTestDropZone(worldX: number, cardType: CardType): { job?: JobType; fieldX?: number } | null {
    const z = this.zoneConfig;

    if (cardType === CardType.Human) {
      const centers: [number, JobType][] = [
        [z.shop,     JobType.Shop],
        [z.craft,    JobType.Craft],
        [z.barracks, JobType.Combat],
      ];
      let best: [number, JobType] | null = null;
      let bestDist = Infinity;
      for (const [cx, job] of centers) {
        const d = Math.abs(worldX - cx);
        if (d < bestDist) { bestDist = d; best = [cx, job]; }
      }
      if (best && bestDist < 150) return { job: best[1] };
      return null;
    }

    if (cardType === CardType.Monster) {
      // Only valid if drop is in the outside-walls zone
      if (worldX >= z.wallLeft - 60 && worldX <= z.wallRight + 60) return null;

      const GAP = 160;
      const leftCells  = this.generateMonsterCells('left');
      const rightCells = this.generateMonsterCells('right');
      const allCells   = [...leftCells, ...rightCells];

      const occupiedXs = store.field
        .filter(c => defById(c.definitionId).type === CardType.Monster && c.fieldX != null)
        .map(c => c.fieldX!);
      const isOccupied = (x: number) => occupiedXs.some(ox => Math.abs(ox - x) < GAP * 0.8);
      const emptyCells = allCells.filter(x => !isOccupied(x));

      if (emptyCells.length === 0) {
        // All cells full: extend by one more cell on the nearest side
        const side = worldX < z.wallLeft ? 'left' : 'right';
        const baseCells = side === 'left' ? leftCells : rightCells;
        const start = side === 'left' ? z.wallLeft - 200 : z.wallRight + 200;
        const dir   = side === 'left' ? -1 : 1;
        return { fieldX: start + dir * baseCells.length * GAP };
      }

      // Snap to nearest empty cell
      let best = emptyCells[0];
      let bestDist = Math.abs(worldX - best);
      for (const x of emptyCells.slice(1)) {
        const d = Math.abs(worldX - x);
        if (d < bestDist) { bestDist = d; best = x; }
      }
      return { fieldX: best };
    }

    if (cardType === CardType.Building) {
      // Only valid inside the walls
      if (worldX < z.wallLeft || worldX > z.wallRight) return null;

      const GAP = 140;
      const cells = this.generateBuildingCells();

      const occupiedXs = store.field
        .filter(c => defById(c.definitionId).type === CardType.Building && c.fieldX != null)
        .map(c => c.fieldX!);
      const isOccupied = (x: number) => occupiedXs.some(ox => Math.abs(ox - x) < GAP * 0.8);
      const emptyCells = cells.filter(x => !isOccupied(x));

      if (emptyCells.length === 0) {
        return { fieldX: cells[cells.length - 1] + GAP };
      }

      // Snap to nearest empty cell
      let best = emptyCells[0];
      let bestDist = Math.abs(worldX - best);
      for (const x of emptyCells.slice(1)) {
        const d = Math.abs(worldX - x);
        if (d < bestDist) { bestDist = d; best = x; }
      }
      return { fieldX: best };
    }

    // Magic: anywhere inside the walls
    if (worldX >= z.wallLeft && worldX <= z.wallRight) return {};
    return null;
  }
}