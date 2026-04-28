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

    this.zoneConfig = computeZoneConfig(store.townLevel);

    generateAllTextures(this);

    this.bgLayer     = this.add.container(0, 0);
    this.bldgLayer   = this.add.container(0, 0);
    this.denLayer    = this.add.container(0, 0);
    this.entityLayer = this.add.container(0, 0);
    this.fxLayer     = this.add.container(0, 0);
    this.labelLayer  = this.add.container(0, 0);

    this.cameras.main.setBounds(0, 0, this.zoneConfig.worldWidth, this.sceneH);
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

    // ── 城镇升级：更新区域配置并重绘世界视觉 ────────────────────────────────
    store.subscribe(evt => {
      if (evt === 'townLevelUp') {
        this.zoneConfig = computeZoneConfig(store.townLevel);
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
        this.zoneConfig = computeZoneConfig(store.townLevel);
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
        sp.targetY = gy - 10 + (Math.random() - 0.5) * 6;
      }
      return;
    }

    // 有战斗岗位人员时，怪物保持等待状态（战斗进行中，不进军）
    if (store.hasActiveCombatWorkers) {
      sp.monsterBehavior = 'waiting';
      if (Math.abs(sp.x - spawnX) > WANDER || Math.random() < 0.02) {
        sp.targetX = spawnX + (Math.random() - 0.5) * WANDER * 0.5;
        sp.targetY = gy - 10 + (Math.random() - 0.5) * 6;
      }
      return;
    }

    const activeTown = townspeople.filter(c => c.isActive);
    if (activeTown.length === 0) {
      sp.monsterBehavior = 'retreating';
      sp.targetX = spawnX; sp.targetY = gy - 10;
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
        fontSize: '8px', color: '#f5e6c8',
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
        sp.label.setPosition(sp.x, sp.y - 32);
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

      sp.label.setPosition(sp.x, sp.y - 30);
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
    if (lv >= 6) {
      // Lv6: 发光星纹地板 — 蓝紫色魔法铺路
      g.fillStyle(0x282048); g.fillRect(wallLeft, gy, roadW, 40);
      g.fillStyle(0x383060); g.fillRect(wallLeft, gy + 2, roadW, 32);
      // glowing grid lines (blue-purple)
      g.fillStyle(0x6060c8);
      for (let rx = wallLeft; rx < wallRight; rx += 40) {
        g.fillRect(rx, gy + 2, 1, 32);
      }
      for (let ry = gy + 8; ry < gy + 36; ry += 8) {
        g.fillRect(wallLeft, ry, roadW, 1);
      }
      // star sparkles
      g.fillStyle(0xa0b0ff);
      for (let i = 0; i < 30; i++) {
        const rx = wallLeft + 8 + (i * 61 % (roadW - 16));
        const ry = gy + 6 + (i * 41 % 22);
        g.fillRect(rx, ry, 2, 2);
      }
    } else if (lv >= 5) {
      // Lv5: 大理石铺路，金色路石
      g.fillStyle(0xd0c8a8); g.fillRect(wallLeft, gy, roadW, 40);
      g.fillStyle(0xe0d8b8); g.fillRect(wallLeft, gy + 2, roadW, 32);
      // marble grid
      g.fillStyle(0xb8b098);
      for (let rx = wallLeft; rx < wallRight; rx += 48) {
        g.fillRect(rx, gy + 2, 2, 32);
      }
      for (let ry = gy + 12; ry < gy + 36; ry += 12) {
        g.fillRect(wallLeft, ry, roadW, 1);
      }
      // golden accent stones
      g.fillStyle(0xd4a017);
      for (let i = 0; i < 20; i++) {
        const rx = wallLeft + 12 + (i * 73 % (roadW - 24));
        const ry = gy + 6 + (i * 43 % 22);
        g.fillRect(rx, ry, 4, 2);
      }
    } else if (lv >= 4) {
      // Lv4: 精雕石板路，路石高光
      g.fillStyle(0xa8a090); g.fillRect(wallLeft, gy, roadW, 40);
      g.fillStyle(0xb8b0a0); g.fillRect(wallLeft, gy + 2, roadW, 32);
      g.fillStyle(0x888070);
      for (let rx = wallLeft; rx < wallRight; rx += 48) {
        g.fillRect(rx, gy + 2, 2, 32);
      }
      for (let ry = gy + 12; ry < gy + 36; ry += 12) {
        g.fillRect(wallLeft, ry, roadW, 1);
      }
      // polished stone highlights
      g.fillStyle(0xc8c0a8);
      for (let i = 0; i < 30; i++) {
        const rx = wallLeft + 8 + (i * 59 % (roadW - 16));
        const ry = gy + 4 + (i * 37 % 22);
        g.fillRect(rx, ry, 6, 2);
      }
    } else if (lv >= 3) {
      // Lv3: 石板路 + 路沿
      g.fillStyle(0x8a8878); g.fillRect(wallLeft, gy, roadW, 40);
      g.fillStyle(0x9a9888); g.fillRect(wallLeft, gy + 2, roadW, 32);
      // stone tile joints
      g.fillStyle(0x686858);
      for (let rx = wallLeft; rx < wallRight; rx += 48) {
        g.fillRect(rx, gy + 2, 2, 32);
      }
      for (let ry = gy + 12; ry < gy + 36; ry += 12) {
        g.fillRect(wallLeft, ry, roadW, 1);
      }
      // curb edges
      g.fillStyle(0xb0a898); g.fillRect(wallLeft, gy, 4, 40);
      g.fillStyle(0xb0a898); g.fillRect(wallRight - 4, gy, 4, 40);
      // pebble details
      g.fillStyle(0xb8b0a0);
      for (let i = 0; i < 25; i++) {
        const rx = wallLeft + 10 + (i * 67 % (roadW - 20));
        const ry = gy + 6 + (i * 37 % 22);
        g.fillRect(rx, ry, 3, 2);
      }
    } else if (lv >= 2) {
      // Lv2: 夯土路 + 草边
      g.fillStyle(0x7a6a50); g.fillRect(wallLeft, gy, roadW, 40);
      g.fillStyle(0x8a7a60); g.fillRect(wallLeft, gy + 2, roadW, 32);
      g.fillStyle(0x6a5a48);
      for (let rx = wallLeft; rx < wallRight; rx += 48) {
        g.fillRect(rx, gy + 2, 2, 32);
      }
      for (let ry = gy + 12; ry < gy + 36; ry += 12) {
        g.fillRect(wallLeft, ry, roadW, 1);
      }
      g.fillStyle(0xa89878);
      for (let i = 0; i < 30; i++) {
        const rx = wallLeft + 10 + (i * 67 % (roadW - 20));
        const ry = gy + 6 + (i * 37 % 22);
        g.fillRect(rx, ry, 4, 2);
      }
    } else {
      // Lv1: 泥土小道 (original)
      g.fillStyle(0x8a7a60); g.fillRect(wallLeft, gy, roadW, 40);
      g.fillStyle(0x9a8a70); g.fillRect(wallLeft, gy + 2, roadW, 32);
      g.fillStyle(0x6a5a48);
      for (let rx = wallLeft; rx < wallRight; rx += 48) {
        g.fillRect(rx, gy + 2, 2, 32);
      }
      for (let ry = gy + 12; ry < gy + 36; ry += 12) {
        g.fillRect(wallLeft, ry, roadW, 1);
      }
      g.fillStyle(0x5a8a40);
      for (let rx = wallLeft; rx < wallRight; rx += 18) {
        const h2 = 3 + (rx % 3);
        g.fillRect(rx, gy - h2, 4, h2);
      }
      g.fillStyle(0xb0a088);
      for (let i = 0; i < 40; i++) {
        const rx = wallLeft + 10 + (i * 67 % (roadW - 20));
        const ry = gy + 6 + (i * 37 % 22);
        g.fillRect(rx, ry, 3, 2);
      }
    }

    // Lv3+: grass tufts along road edge
    if (lv >= 2) {
      g.fillStyle(0x5a8a40);
      for (let rx = wallLeft; rx < wallRight; rx += 18) {
        const h2 = 3 + (rx % 3);
        g.fillRect(rx, gy - h2, 4, h2);
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
    // Dimensions scale up with town level
    const wallH  = [55, 70, 82, 97, 114, 134][townLevel - 1] ?? 70;
    const wallW  = [22, 28, 33, 39, 46,  54][townLevel - 1]  ?? 28;
    const gateW  = [30, 36, 42, 46, 50,  56][townLevel - 1]  ?? 36;
    const crenH  = [ 7, 10, 13, 15, 17,  20][townLevel - 1]  ?? 10;
    const crenW  = [ 8, 10, 11, 12, 14,  16][townLevel - 1]  ?? 10;
    const crenGap = [6,  8,  9, 10, 11,  12][townLevel - 1]  ?? 8;

    // Colour palette varies by level
    const palettes: [number, number, number, number, number][] = [
      // stoneLight,  stoneMid,   stoneDark,  gateColor,  gateHigh      — wood/rough for Lv1
      [0xa09060, 0x806840, 0x585020, 0x4a2c10, 0x6a4220],
      // Lv2 — stone (original)
      [0xa09070, 0x806850, 0x604830, 0x3a2010, 0x5a3820],
      // Lv3 — heavier castle stone
      [0x9a9080, 0x707060, 0x504840, 0x382810, 0x584030],
      // Lv4 — dark fortress stone + iron gate
      [0x9a9888, 0x787068, 0x585048, 0x282020, 0x484040],
      // Lv5 — noble stone with gold trim
      [0xb0a888, 0x888070, 0x605848, 0x2a1808, 0x4a3020],
      // Lv6 — legendary dark stone with magic glow
      [0x9090a8, 0x686878, 0x484858, 0x181018, 0x383048],
    ];
    const [stoneLight, stoneMid, stoneDark, gateColor, gateHigh] = palettes[townLevel - 1] ?? palettes[1];

    for (const wallX of [this.zoneConfig.wallLeft, this.zoneConfig.wallRight]) {
      const wx = wallX - wallW / 2;
      for (const [wingX, wingW] of [[wx - 80, 80], [wx + wallW + gateW, 80]] as [number, number][]) {
        g.fillStyle(stoneMid); g.fillRect(wingX, gy - wallH, wingW, wallH);
        g.fillStyle(stoneLight); g.fillRect(wingX, gy - wallH, wingW, 6);
        g.fillStyle(stoneDark); g.fillRect(wingX, gy - wallH + 6, wingW, 3);
      }
      const towerW = wallW + 8;
      for (const tx of [wx - 8, wx + wallW + gateW - wallW]) {
        g.fillStyle(stoneMid); g.fillRect(tx, gy - wallH - 20, towerW, wallH + 20);
        g.fillStyle(stoneLight); g.fillRect(tx, gy - wallH - 20, towerW, 6);
        g.fillStyle(stoneDark); g.fillRect(tx, gy - wallH - 14, towerW, 3);
        for (let cx = tx; cx < tx + towerW - crenW + 2; cx += crenW + crenGap) {
          g.fillStyle(stoneLight); g.fillRect(cx, gy - wallH - 20 - crenH, crenW, crenH);
          g.fillStyle(stoneDark); g.fillRect(cx, gy - wallH - 20 - crenH, crenW, 2);
        }
        g.fillStyle(stoneDark); g.fillRect(tx + Math.floor(towerW / 2) - 1, gy - wallH - 10, 3, 8);

        // Lv3+: extra horizontal belt on tower
        if (townLevel >= 3) {
          g.fillStyle(stoneDark); g.fillRect(tx, gy - wallH - 20 + Math.floor((wallH + 20) / 2), towerW, 3);
        }
        // Lv5+: decorative spire on tower top
        if (townLevel >= 5) {
          const spireX = tx + Math.floor(towerW / 2) - 2;
          g.fillStyle(0xd4a017); g.fillRect(spireX, gy - wallH - 20 - crenH - 10, 4, 10);
          g.fillStyle(0xffd040); g.fillRect(spireX + 1, gy - wallH - 20 - crenH - 12, 2, 4);
        }
        // Lv6: magic glow on battlements
        if (townLevel >= 6) {
          for (let cx = tx; cx < tx + towerW - crenW + 2; cx += crenW + crenGap) {
            g.fillStyle(0x8060ff, 0.7);
            g.fillRect(cx, gy - wallH - 20 - crenH, crenW, 2);
          }
        }
      }

      g.fillStyle(gateColor); g.fillRect(wx + wallW, gy - 44, gateW, 44);
      g.fillStyle(gateHigh); g.fillRect(wx + wallW + 2, gy - 42, gateW - 4, 5);
      g.fillStyle(gateColor); g.fillRect(wx + wallW + 4, gy - 50, gateW - 8, 8);
      g.fillRect(wx + wallW + 2, gy - 48, gateW - 4, 4);

      // Lv4+: iron portcullis bars
      if (townLevel >= 4) {
        g.fillStyle(0x484040);
        for (let bar = 0; bar < 4; bar++) {
          g.fillRect(wx + wallW + 4 + bar * 8, gy - 44, 3, 44);
        }
        g.fillStyle(0x484040);
        for (let row = 0; row < 3; row++) {
          g.fillRect(wx + wallW + 4, gy - 44 + row * 14, gateW - 8, 2);
        }
      } else {
        g.fillStyle(0x484030);
        for (let bar = 0; bar < 4; bar++) {
          g.fillRect(wx + wallW + 4 + bar * 8, gy - 44, 3, 44);
        }
      }

      g.fillStyle(0x201000, 0.4); g.fillRect(wx + wallW, gy, gateW, 8);

      // Lv5+: gold crest emblem above gate
      if (townLevel >= 5) {
        const gcx = wx + wallW + Math.floor(gateW / 2) - 4;
        g.fillStyle(0xd4a017); g.fillRect(gcx, gy - wallH - 6, 8, 6);
        g.fillStyle(0xffd040); g.fillRect(gcx + 2, gy - wallH - 8, 4, 4);
      }
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
      fontFamily: '"Silkscreen", monospace', fontSize: '9px',
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
      fontSize: '10px', color,
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
    const bubble = this.add.text(x, y - 20, text, { fontSize: '16px' }).setOrigin(0.5, 1);
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
   * Regular cells fill wallLeft+100 → wallRight-100 with 140px gaps.
   * If all regular cells are occupied, up to 3 overflow cells extend to the right.
   */
  private generateBuildingCells(): number[] {
    const { wallLeft, wallRight } = this.zoneConfig;
    const GAP   = 140;
    const start = wallLeft  + 100;
    const end   = wallRight - 100;

    const occupiedXs = store.field
      .filter(c => defById(c.definitionId).type === CardType.Building && c.fieldX != null)
      .map(c => c.fieldX!);
    const isOccupied = (x: number) => occupiedXs.some(ox => Math.abs(ox - x) < GAP * 0.8);

    const regularCount = Math.max(1, Math.floor((end - start) / GAP) + 1);
    const cells: number[] = [];
    for (let i = 0; i < regularCount; i++) {
      cells.push(start + i * GAP);
    }

    // If all regular slots occupied, add up to 3 overflow slots
    if (cells.every(x => isOccupied(x))) {
      for (let i = 0; i < 3; i++) {
        cells.push(start + (regularCount + i) * GAP);
      }
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
      fontSize: '9px',
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
      addZone(z.town    - 120, 240, '大厅');
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
        [z.town,     JobType.Idle],
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

