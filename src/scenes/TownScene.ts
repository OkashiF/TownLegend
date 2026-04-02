import Phaser from 'phaser';
import { store, LogEntry, defById } from '../systems/store';
import { CardType, JobType, HumanStats, MonsterStats } from '../types';
import {
  generateAllTextures, spriteKeyForCard,
  drawTree, drawPasserby,
  drawShopBuilding, drawCraftBuilding, drawCombatBuilding,
} from '../utils/sprites';
import { WORLD_WIDTH } from '../main';

// ── Timing ─────────────────────────────────────────────────────────────────────
const MS_PER_TICK = 125;

// ── World zone coordinates (fixed pixel values in world space) ─────────────────
export const ZONE = {
  // 怪物出生点收回到相机可视边界内，避免出现在不可见区域
  spawnLeft:    200,    // 左侧怪物出生点（原 -120，现收至可视范围左侧）
  spawnRight:  3400,    // 右侧怪物出生点（原 3720，现收至可视范围右侧）
  spawnSouth:  1800,    // 南侧出生点（从画面正上方进入，x 不变）

  wallLeft:     900,    // 左城墙 / 城门
  wallRight:   2700,    // 右城墙 / 城门

  shop:        1100,    // 商店区中心
  craft:       1400,    // 制造区中心
  town:        1800,    // 城镇大厅中心
  barracks:    2200,    // 兵营区中心

  patrolLeft:   950,    // 战士巡逻左边界（城门内侧）
  patrolRight: 2650,    // 战士巡逻右边界（城门内侧）
};

// 区域内漫步半径
const WANDER      = 40;
// 地面 Y 占场景高度的比例
const GROUND_FRAC = 0.62;
// 移动速度 px/tick
const HUMAN_SPEED   = 35;
const MONSTER_SPEED = 22;

// 人物精灵相对建筑的缩放比（建筑 scale=1，人物 scale=HUMAN_SCALE）
// 让人物明显小于建筑，符合像素风比例习惯
const HUMAN_SCALE   = 0.55;
const MONSTER_SCALE = 0.65;  // 怪物略大于人物

// ── Combat state for warriors ─────────────────────────────────────────────────
type WarriorState = 'patrol' | 'chase' | 'fight' | 'loot' | 'return';

// ── Interfaces ────────────────────────────────────────────────────────────────
interface LootDrop {
  id: string;
  worldX: number;
  worldY: number;
  itemId: string;
  qty: number;
  sprite: Phaser.GameObjects.Text;
}

interface FieldSprite {
  instanceId: string;
  sprite:     Phaser.GameObjects.Image;
  label:      Phaser.GameObjects.Text;
  hpBar:      Phaser.GameObjects.Graphics;
  x: number; y: number;
  targetX: number; targetY: number;
  bobPhase: number;
  warriorState:   WarriorState;
  attackCooldown: number;
  combatTarget:   string | null;
  lootTarget:     string | null;
  patrolDir:      1 | -1;
}

interface PasserbySprite {
  img: Phaser.GameObjects.Image;
  x: number; speed: number; groundY: number;
}

// ── Scene ─────────────────────────────────────────────────────────────────────
export class TownScene extends Phaser.Scene {
  private bgLayer!:     Phaser.GameObjects.Container;
  private bldgLayer!:   Phaser.GameObjects.Container;
  private entityLayer!: Phaser.GameObjects.Container;
  private fxLayer!:     Phaser.GameObjects.Container;
  private labelLayer!:  Phaser.GameObjects.Container;

  private sprites:      Map<string, FieldSprite> = new Map();
  private lootDrops:    Map<string, LootDrop>    = new Map();
  private passerbyList: PasserbySprite[] = [];
  private sideLogEl!:   HTMLElement;

  private groundY = 0;
  private sceneH  = 0;

  private isDragging  = false;
  private dragStartX  = 0;
  private dragCamX    = 0;

  private tickAccum   = 0;
  private lootDropSeq = 0;

  constructor() { super({ key: 'TownScene' }); }

  // ── Lifecycle ─────────────────────────────────────────────────────────────────

  create() {
    this.sceneH  = this.scale.height;
    this.groundY = this.sceneH * GROUND_FRAC;

    generateAllTextures(this);

    this.bgLayer     = this.add.container(0, 0);
    this.bldgLayer   = this.add.container(0, 0);
    this.entityLayer = this.add.container(0, 0);
    this.fxLayer     = this.add.container(0, 0);
    this.labelLayer  = this.add.container(0, 0);

    // ── 相机设置 ──────────────────────────────────────────────────────────────
    // 边界从 x=0 扩展到 x=WORLD_WIDTH，覆盖怪物出生点所在的新坐标范围
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, this.sceneH);
    this.cameras.main.centerOn(ZONE.town, this.sceneH / 2);
    this.cameras.main.setZoom(1.0);

    this.setupCameraControls();

    this.buildBackground();
    this.buildZoneBuildings();
    this.buildSideLog();

    store.subscribe(evt => {
      if (evt === 'field' || evt === 'upgrade') {
        try { this.syncSprites(); } catch (e) { console.error('[sync]', e); }
      }
    });
    this.syncSprites();
  }

  update(_t: number, delta: number) {
    this.tickAccum += delta;
    while (this.tickAccum >= MS_PER_TICK) {
      this.tickAccum -= MS_PER_TICK;
      this.doTick();
    }
    this.interpolate(delta / MS_PER_TICK);
    this.updatePasserby(delta / 1000);
  }

  // ── Camera controls ────────────────────────────────────────────────────────

  private setupCameraControls() {
    const cam = this.cameras.main;

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.isDragging = true;
      this.dragStartX = p.x;
      this.dragCamX   = cam.scrollX;
    });

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.isDragging) return;
      const dx = (p.x - this.dragStartX) / cam.zoom;
      cam.scrollX = Phaser.Math.Clamp(
        this.dragCamX - dx,
        0,
        WORLD_WIDTH - cam.width / cam.zoom
      );
    });

    this.input.on('pointerup', () => { this.isDragging = false; });

    this.input.on('wheel',
      (_p: Phaser.Input.Pointer, _gos: unknown, _dx: number, _dy: number, dy: number) => {
        const newZoom = Phaser.Math.Clamp(cam.zoom - dy * 0.001, 0.75, 1.5);
        cam.setZoom(newZoom);
      }
    );
  }

  // ── Tick ──────────────────────────────────────────────────────────────────────

  private doTick() {
    try {
      this.runAI();
      const { newLogs } = store.advanceTick();
      if (newLogs.length > 0) {
        for (const e of [...newLogs].reverse()) this.pushLogEntry(e);
        this.syncSprites();
      }
      if (store.tick % 24 === 0) this.maybeSpawnPasserby();
    } catch (e) {
      console.error('[doTick]', e);
    }
  }

  // ── AI ────────────────────────────────────────────────────────────────────────

  private runAI() {
    const gy = this.groundY;

    const monsterInsts = store.field.filter(c => {
      if (!c.definitionId) return false;
      return defById(c.definitionId).type === CardType.Monster && c.isActive;
    });

    for (const inst of store.field) {
      if (!inst?.definitionId) continue;
      const def = defById(inst.definitionId);
      if (def.name === '???') continue;
      const sp = this.sprites.get(inst.instanceId);
      if (!sp) continue;

      if (def.type === CardType.Human) {
        if (!inst.isActive) {
          sp.targetX = ZONE.town + (Math.random() - 0.5) * WANDER;
          sp.targetY = gy;
          sp.warriorState  = 'patrol';
          sp.combatTarget  = null;
          sp.lootTarget    = null;
          continue;
        }

        const job = inst.jobAssignment ?? JobType.Idle;

        if (job === JobType.Combat) {
          this.runWarriorAI(inst, sp, monsterInsts, gy);
        } else {
          const zoneX = job === JobType.Shop  ? ZONE.shop
                      : job === JobType.Craft ? ZONE.craft
                      : ZONE.town;
          if (Math.abs(sp.x - zoneX) > WANDER * 1.5 || Math.random() < 0.02) {
            sp.targetX = zoneX + (Math.random() - 0.5) * WANDER;
            sp.targetY = gy + (Math.random() - 0.5) * 6;
          }
          sp.combatTarget = null;
          sp.lootTarget   = null;
        }
      }

      if (def.type === CardType.Monster) {
        if (!inst.isActive) continue;

        if (inst.aggressionCountdown > 0) {
          const spawnX = this.monsterSpawnX(inst);
          if (Math.abs(sp.x - spawnX) > WANDER || Math.random() < 0.02) {
            sp.targetX = spawnX + (Math.random() - 0.5) * WANDER * 0.5;
            sp.targetY = gy - 10 + (Math.random() - 0.5) * 6;
          }
        } else {
          sp.targetX = ZONE.town + (Math.random() - 0.5) * 20;
          sp.targetY = gy;
        }
      }
    }
  }

  // ── Warrior state machine ─────────────────────────────────────────────────────

  private runWarriorAI(
    inst: typeof store.field[0],
    sp: FieldSprite,
    monsters: typeof store.field,
    gy: number
  ) {
    if (sp.lootTarget) {
      const drop = this.lootDrops.get(sp.lootTarget);
      if (!drop) {
        sp.lootTarget  = null;
        sp.warriorState = 'return';
      } else {
        sp.warriorState = 'loot';
        sp.targetX = drop.worldX;
        sp.targetY = drop.worldY;
        const dist = Math.hypot(sp.x - drop.worldX, sp.y - drop.worldY);
        if (dist < 24) {
          store.addItem(drop.itemId, 'loot', drop.qty);
          store.emit('inventory');
          drop.sprite.destroy();
          this.lootDrops.delete(sp.lootTarget);
          sp.lootTarget   = null;
          sp.warriorState = 'return';
          store.addLog(`🎒 战士捡起了战利品`, 'good');
        }
      }
      return;
    }

    if (sp.warriorState === 'return') {
      sp.targetX = ZONE.barracks + (Math.random() - 0.5) * WANDER;
      sp.targetY = gy;
      const dist = Math.hypot(sp.x - ZONE.barracks, sp.y - gy);
      if (dist < 60) sp.warriorState = 'patrol';
      return;
    }

    if (monsters.length > 0) {
      let nearestInst: typeof store.field[0] | null = null;
      let nearestSp:   FieldSprite | null = null;
      let nearestDist  = Infinity;

      for (const m of monsters) {
        const mSp = this.sprites.get(m.instanceId);
        if (!mSp) continue;
        const d = Math.hypot(mSp.x - sp.x, mSp.y - sp.y);
        if (d < nearestDist) { nearestDist = d; nearestInst = m; nearestSp = mSp; }
      }

      if (nearestInst && nearestSp) {
        sp.combatTarget = nearestInst.instanceId;
        sp.warriorState = nearestDist < 200 ? 'fight' : 'chase';
        sp.targetX = nearestSp.x;
        sp.targetY = nearestSp.y;

        if (nearestDist < 36) {
          sp.attackCooldown--;
          if (sp.attackCooldown <= 0) {
            sp.attackCooldown = 2;
            this.resolveHit(inst, nearestInst);
          }
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
      if (nearestDrop) {
        sp.lootTarget   = nearestDrop.id;
        sp.warriorState = 'loot';
        return;
      }
    }

    sp.warriorState = 'patrol';
    sp.combatTarget = null;
    const atLeft  = sp.x <= ZONE.patrolLeft  + 20;
    const atRight = sp.x >= ZONE.patrolRight - 20;
    if (atLeft)  sp.patrolDir =  1;
    if (atRight) sp.patrolDir = -1;
    sp.targetX = sp.patrolDir === 1 ? ZONE.patrolRight : ZONE.patrolLeft;
    sp.targetY = gy;
  }

  // ── Combat resolution ──────────────────────────────────────────────────────

  private resolveHit(attacker: typeof store.field[0], defender: typeof store.field[0]) {
    if (!attacker || !defender) return;
    const as = attacker.runtimeStats as HumanStats;
    const ds = defender.runtimeStats as MonsterStats;
    const atkBuff   = store.getMagicBonus('buff_human_atk');
    const defBuff   = store.getMagicBonus('buff_human_def');
    const monDebuff = store.getMagicBonus('debuff_monster_atk');

    const dmgToMon  = Math.max(1, (as.atk + atkBuff) - ds.def);
    const dmgToHero = Math.max(0, (ds.atk - monDebuff) - (as.def + defBuff));
    ds.hp -= dmgToMon;
    as.hp -= dmgToHero;

    const mSp = this.sprites.get(defender.instanceId);
    const hSp = this.sprites.get(attacker.instanceId);
    if (mSp && hSp) this.spawnCombatFX((mSp.x + hSp.x) / 2, (mSp.y + hSp.y) / 2);

    if (ds.hp <= 0) {
      ds.hp = ds.maxHp;
      defender.aggressionCountdown = ds.aggression;
      this.spawnLootDrop(defender, mSp?.x ?? ZONE.town, mSp?.y ?? this.groundY);
      if (mSp) {
        mSp.targetX = this.monsterSpawnX(defender);
        mSp.targetY = this.groundY - 10;
      }
      store.addLog(`⚔️ ${defById(attacker.definitionId).name} 击败了 ${defById(defender.definitionId).name}！`, 'good');
    }

    if (as.hp <= 0) {
      as.hp = as.maxHp;
      attacker.isActive       = false;
      attacker.restMonthsLeft = store.townLevel;
      store.addLog(`😵 ${defById(attacker.definitionId).name} 被打倒，休息 ${store.townLevel} 月`, 'bad');
      if (hSp) { hSp.targetX = ZONE.town; hSp.targetY = this.groundY; }
    }
  }

  // ── Loot drop ─────────────────────────────────────────────────────────────

  private spawnLootDrop(monster: typeof store.field[0], wx: number, wy: number) {
    const ms = monster.runtimeStats as MonsterStats;
    if (!ms.lootId) return;
    const qty = ms.lootQtyMin + Math.floor(Math.random() * (ms.lootQtyMax - ms.lootQtyMin + 1));

    const lootDef = store.getLootDef(ms.lootId);
    const emoji   = lootDef?.emoji ?? '📦';

    const dropId = `drop_${++this.lootDropSeq}`;
    const sprite = this.add.text(wx, wy - 8, emoji, { fontSize: '16px' }).setOrigin(0.5);
    this.entityLayer.add(sprite);

    this.lootDrops.set(dropId, { id: dropId, worldX: wx, worldY: wy, itemId: ms.lootId, qty, sprite });
  }

  // ── Sprite sync ───────────────────────────────────────────────────────────────

  private syncSprites() {
    const fieldIds = new Set(store.field.map(c => c.instanceId));

    for (const [id, sp] of this.sprites) {
      if (!fieldIds.has(id)) {
        sp.sprite.destroy(); sp.label.destroy(); sp.hpBar.destroy();
        this.sprites.delete(id);
      }
    }

    for (const inst of store.field) {
      const sp = this.sprites.get(inst.instanceId);
      if (!sp) continue;
      const newKey = spriteKeyForCard(inst.definitionId, inst.jobAssignment, inst.level);
      if ((sp.sprite as any).__texKey !== newKey) {
        sp.sprite.setTexture(newKey);
        (sp.sprite as any).__texKey = newKey;
      }
    }

    for (const inst of store.field) {
      if (this.sprites.has(inst.instanceId)) continue;
      const def = defById(inst.definitionId);
      if (def.name === '???') continue;

      const key    = spriteKeyForCard(inst.definitionId, inst.jobAssignment, inst.level);
      const sprite = this.add.image(0, 0, key);
      (sprite as any).__texKey = key;

      // 人物比建筑小，怪物居中
      const isMonster = def.type === CardType.Monster;
      sprite.setScale(isMonster ? MONSTER_SCALE : HUMAN_SCALE);
      // origin 底部居中，让脚踩在地面线上
      sprite.setOrigin(0.5, 1);

      this.entityLayer.add(sprite);

      const label = this.add.text(0, 0, def.name, {
        fontFamily: '"Silkscreen", monospace',
        fontSize: '8px', color: '#f5e6c8',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5, 1);
      this.labelLayer.add(label);

      const hpBar = this.add.graphics();
      this.labelLayer.add(hpBar);

      let sx = ZONE.town, sy = this.groundY;
      if (def.type === CardType.Monster) {
        sx = this.monsterSpawnX(inst);
        sy = this.groundY;
      } else if (def.type === CardType.Human) {
        const job = inst.jobAssignment ?? JobType.Idle;
        sx = job === JobType.Shop   ? ZONE.shop
           : job === JobType.Craft  ? ZONE.craft
           : job === JobType.Combat ? ZONE.barracks
           : ZONE.town;
        sy = this.groundY;
      }

      sprite.setPosition(sx, sy);

      this.sprites.set(inst.instanceId, {
        instanceId: inst.instanceId,
        sprite, label, hpBar,
        x: sx, y: sy,
        targetX: sx, targetY: sy,
        bobPhase: Math.random() * Math.PI * 2,
        warriorState:   'patrol',
        attackCooldown: 0,
        combatTarget:   null,
        lootTarget:     null,
        patrolDir:      1,
      });
    }
  }

  // ── Interpolation ─────────────────────────────────────────────────────────────

  private interpolate(dt: number) {
    for (const [id, sp] of this.sprites) {
      const inst = store.field.find(c => c.instanceId === id);
      if (!inst?.definitionId) continue;
      const def = defById(inst.definitionId);

      sp.bobPhase += 0.06;

      const isMonster = def.type === CardType.Monster;
      const speed     = isMonster ? MONSTER_SPEED : HUMAN_SPEED;

      if (!inst.isActive) {
        sp.sprite.setAlpha(0.45);
        // origin=(0.5,1) 时，sprite.y 是脚的位置，bob 直接加到 y 即可
        sp.sprite.setPosition(sp.x, sp.y + Math.sin(sp.bobPhase) * 1.5);
      } else {
        sp.sprite.setAlpha(1);
        const dx   = sp.targetX - sp.x;
        const dy   = sp.targetY - sp.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 1) {
          const step = Math.min(speed * dt, dist);
          sp.x += (dx / dist) * step;
          sp.y += (dy / dist) * step;
          sp.sprite.setFlipX(dx < 0);
        } else {
          // 站立时轻微上下浮动
          sp.y = sp.targetY + Math.sin(sp.bobPhase) * 1.5;
        }
        sp.sprite.setPosition(sp.x, sp.y);
      }

      // origin=(0.5,1) → 名牌在头顶上方
      sp.label.setPosition(sp.x, sp.y - 30);
      this.drawHpBar(sp, inst);
    }
  }

  private drawHpBar(sp: FieldSprite, inst: any) {
    sp.hpBar.clear();
    const rs = inst.runtimeStats as any;
    if (!('hp' in rs && 'maxHp' in rs)) return;
    const pct = Math.max(0, rs.hp / rs.maxHp);
    const w = 32, h = 3;
    // origin=(0.5,1) → 脚在 sp.y，血条放在名牌下方 / 头顶上方
    const bx = sp.x - w / 2, by = sp.y - 26;
    sp.hpBar.fillStyle(0x220000); sp.hpBar.fillRect(bx, by, w, h);
    const col = pct > 0.5 ? 0x40cc40 : pct > 0.25 ? 0xcccc40 : 0xcc4040;
    sp.hpBar.fillStyle(col);
    sp.hpBar.fillRect(bx, by, Math.round(w * pct), h);
  }

  // ── Spawn point ───────────────────────────────────────────────────────────────

  private monsterSpawnX(inst: typeof store.field[0]): number {
    const zone = inst.spawnZone ?? 'north';
    if (zone === 'east')  return ZONE.spawnRight;
    if (zone === 'south') return ZONE.spawnSouth;
    return ZONE.spawnLeft;
  }

  // ── Background ────────────────────────────────────────────────────────────────

  private buildBackground() {
    const W  = WORLD_WIDTH;
    const H  = this.sceneH;
    const gy = this.groundY;
    const g  = this.add.graphics();
    this.bgLayer.add(g);

    // 天空渐变
    for (let i = 0; i < gy; i++) {
      const t  = i / gy;
      const r  = Phaser.Math.Linear(0x1a, 0x5a, t) | 0;
      const gr = Phaser.Math.Linear(0x28, 0x8a, t) | 0;
      const b  = Phaser.Math.Linear(0x4a, 0xbb, t) | 0;
      g.fillStyle((r << 16) | (gr << 8) | b, 1);
      g.fillRect(0, i, W, 1);
    }

    // 地面
    g.fillStyle(0x4a7a3a); g.fillRect(0, gy,     W, H - gy);
    g.fillStyle(0x3a6a2a); g.fillRect(0, gy + 6, W, H - gy - 6);

    // 城内道路
    g.fillStyle(0x7a6a5a);
    g.fillRect(ZONE.wallLeft, gy + 1, ZONE.wallRight - ZONE.wallLeft, 10);
    g.fillStyle(0x9a8a7a);
    for (let rx = ZONE.wallLeft + 10; rx < ZONE.wallRight; rx += 60) {
      g.fillRect(rx, gy + 5, 28, 2);
    }

    // 城外土路
    g.fillStyle(0x8a7060);
    g.fillRect(0,              gy + 2, ZONE.wallLeft,          6);
    g.fillRect(ZONE.wallRight, gy + 2, W - ZONE.wallRight,     6);

    // 太阳
    g.fillStyle(0xffd040); g.fillRect(W - 120, 20, 18, 18);
    g.fillStyle(0xffb020);
    [[W-128,24,4,10],[W-106,24,4,10],[W-116,14,10,4],[W-116,40,10,4]].forEach(
      ([x,y,w,h]) => g.fillRect(x as number, y as number, w as number, h as number)
    );

    // 云朵
    [[200,0.08],[600,0.05],[1100,0.10],[1700,0.06],[2300,0.09],[2900,0.07],[3400,0.05]].forEach(
      ([cx, ty]) => {
        g.fillStyle(0xe8f0ff, 0.8);
        g.fillRect(cx as number, (H * ty) as number, 36, 10);
        g.fillRect((cx as number) + 5, (H * ty) as number - 5, 26, 10);
      }
    );

    // 树木（城外两侧）
    const treePositions = [
      300, 450, 580, 700, 780,          // 左侧（从新出生点 200 之后开始）
      2780, 2880, 2980, 3100, 3250      // 右侧（到新出生点 3400 之前结束）
    ];
    for (const tx of treePositions) {
      const key = `tree_w_${tx}`;
      if (!this.textures.exists(key)) {
        const tg = this.add.graphics();
        drawTree(tg, 0, 0, 4);
        g.generateTexture(key, 32, 40);
        tg.destroy();
      }
      // 树木底部贴地：origin=(0.5,1)
      const t = this.add.image(tx, gy, key).setOrigin(0.5, 1);
      this.bgLayer.add(t);
    }

    this.buildWalls(g, gy, H);
  }

  // ── Wall drawing ──────────────────────────────────────────────────────────────

  private buildWalls(g: Phaser.GameObjects.Graphics, gy: number, H: number) {
    const wallH   = 70;
    const wallW   = 28;
    const gateW   = 36;
    const crenH   = 10;
    const crenW   = 10;
    const crenGap = 8;

    const stoneLight = 0xa09070;
    const stoneMid   = 0x806850;
    const stoneDark  = 0x604830;
    const gateColor  = 0x3a2010;
    const gateHigh   = 0x5a3820;

    for (const wallX of [ZONE.wallLeft, ZONE.wallRight]) {
      const wx = wallX - wallW / 2;

      const wingL = wx - 80;
      g.fillStyle(stoneMid);
      g.fillRect(wingL, gy - wallH, 80, wallH);
      g.fillStyle(stoneLight);
      g.fillRect(wingL, gy - wallH, 80, 6);
      g.fillStyle(stoneDark);
      g.fillRect(wingL, gy - wallH + 6, 80, 3);

      const wingR = wx + wallW + gateW;
      g.fillStyle(stoneMid);
      g.fillRect(wingR, gy - wallH, 80, wallH);
      g.fillStyle(stoneLight);
      g.fillRect(wingR, gy - wallH, 80, 6);
      g.fillStyle(stoneDark);
      g.fillRect(wingR, gy - wallH + 6, 80, 3);

      const towerW = wallW + 8;
      for (const tx of [wx - 8, wx + wallW + gateW - wallW]) {
        g.fillStyle(stoneMid);
        g.fillRect(tx, gy - wallH - 20, towerW, wallH + 20);
        g.fillStyle(stoneLight);
        g.fillRect(tx, gy - wallH - 20, towerW, 6);
        g.fillStyle(stoneDark);
        g.fillRect(tx, gy - wallH - 14, towerW, 3);

        for (let cx = tx; cx < tx + towerW - crenW + 2; cx += crenW + crenGap) {
          g.fillStyle(stoneLight);
          g.fillRect(cx, gy - wallH - 20 - crenH, crenW, crenH);
          g.fillStyle(stoneDark);
          g.fillRect(cx, gy - wallH - 20 - crenH, crenW, 2);
        }

        g.fillStyle(stoneDark);
        g.fillRect(tx + Math.floor(towerW / 2) - 1, gy - wallH - 10, 3, 8);
      }

      g.fillStyle(gateColor);
      g.fillRect(wx + wallW, gy - 44, gateW, 44);
      g.fillStyle(gateHigh);
      g.fillRect(wx + wallW + 2, gy - 42, gateW - 4, 5);
      g.fillStyle(gateColor);
      g.fillRect(wx + wallW + 4, gy - 50, gateW - 8, 8);
      g.fillRect(wx + wallW + 2, gy - 48, gateW - 4, 4);

      g.fillStyle(0x484030);
      for (let bar = 0; bar < 4; bar++) {
        g.fillRect(wx + wallW + 4 + bar * 8, gy - 44, 3, 44);
      }

      g.fillStyle(0x201000, 0.4);
      g.fillRect(wx + wallW, gy, gateW, 8);
    }
  }

  // ── Zone buildings ────────────────────────────────────────────────────────────

  private buildZoneBuildings() {
    const gy    = this.groundY;
    const scale = 3;

    const zones: [string, (g: Phaser.GameObjects.Graphics, x: number, y: number, s: number) => void, number][] = [
      ['bldg_shop',     drawShopBuilding,   ZONE.shop],
      ['bldg_craft',    drawCraftBuilding,  ZONE.craft],
      ['bldg_townhall', drawTownHall,       ZONE.town],
      ['bldg_barracks', drawCombatBuilding, ZONE.barracks],
    ];

    for (const [key, fn, cx] of zones) {
      if (!this.textures.exists(key)) {
        const g = this.add.graphics();
        fn(g, 0, 0, scale);
        g.generateTexture(key, 48, 48);
        g.destroy();
      }
      // origin=(0.5,1) 让建筑底部贴地，消除浮空感
      const img = this.add.image(cx, gy, key).setOrigin(0.5, 1);
      this.bldgLayer.add(img);
    }

    const labelStyle = {
      fontFamily: '"Silkscreen", monospace', fontSize: '9px',
      color: '#c8b890', stroke: '#000', strokeThickness: 2,
    };
    ([
      [ZONE.shop,    '商店'],
      [ZONE.craft,   '制造'],
      [ZONE.town,    '大厅'],
      [ZONE.barracks,'兵营'],
    ] as [number, string][]).forEach(([x, txt]) => {
      // 标签跟着建筑顶部走：建筑 48px 高，底部在 gy，顶部在 gy-48，标签再往上 10px
      const t = this.add.text(x, gy - 58, txt, labelStyle).setOrigin(0.5, 1);
      this.bldgLayer.add(t);
    });
  }

  // ── Passerby ─────────────────────────────────────────────────────────────────

  private maybeSpawnPasserby() {
    const underAttack = store.field.some(c => {
      if (!c.definitionId) return false;
      return defById(c.definitionId).type === CardType.Monster && c.aggressionCountdown === 0;
    });
    if (underAttack || this.passerbyList.length >= 6) return;

    if (!this.textures.exists('passerby_tex')) {
      const g = this.add.graphics();
      drawPasserby(g, 0, 0, 3);
      g.generateTexture('passerby_tex', 18, 24);
      g.destroy();
    }

    const fromLeft  = Math.random() > 0.5;
    const startX    = fromLeft ? ZONE.wallLeft + 10 : ZONE.wallRight - 10;
    const img       = this.add.image(startX, this.groundY, 'passerby_tex').setOrigin(0.5, 1);
    img.setFlipX(!fromLeft);
    this.entityLayer.add(img);

    this.passerbyList.push({
      img, x: startX,
      speed: (fromLeft ? 1 : -1) * (20 + Math.random() * 14),
      groundY: this.groundY,
    });
  }

  private updatePasserby(dt: number) {
    for (let i = this.passerbyList.length - 1; i >= 0; i--) {
      const p = this.passerbyList[i];
      p.x += p.speed * dt;
      // origin=(0.5,1) → y 直接是地面
      p.img.setPosition(p.x, p.groundY + Math.sin(p.x * 0.05) * 1.5);

      if (p.x < ZONE.wallLeft - 20 || p.x > ZONE.wallRight + 20) {
        p.img.destroy();
        this.passerbyList.splice(i, 1);
      }
    }
  }

  // ── Combat FX ─────────────────────────────────────────────────────────────────

  private spawnCombatFX(x: number, y: number) {
    const colors = [0xffd040, 0xff8020, 0xffffff, 0xff4040];
    for (let i = 0; i < 5; i++) {
      const dot = this.add.graphics();
      this.fxLayer.add(dot);
      dot.fillStyle(colors[i % colors.length]);
      dot.fillRect(0, 0, 4, 4);
      dot.setPosition(x, y);
      const angle = (Math.PI * 2 * i) / 5 + Math.random() * 0.5;
      this.tweens.add({
        targets: dot,
        x: x + Math.cos(angle) * (12 + Math.random() * 16),
        y: y + Math.sin(angle) * (12 + Math.random() * 16),
        alpha: 0, duration: 300, ease: 'Quad.Out',
        onComplete: () => dot.destroy(),
      });
    }
  }

  // ── Side log ──────────────────────────────────────────────────────────────────

  private buildSideLog() {
    const existing = document.getElementById('side-log');
    if (existing) { this.sideLogEl = existing; return; }

    const panel = document.createElement('div');
    panel.id = 'side-log';
    panel.style.cssText = `
      position:absolute; right:0; top:40px; bottom:170px;
      width:220px; overflow-y:auto; overflow-x:hidden;
      background:rgba(10,5,2,0.82); border-left:2px solid #5a3a1a;
      padding:8px 0; z-index:8; pointer-events:none;
      scrollbar-width:thin; scrollbar-color:#5a3a1a transparent;
      transition: width 0.2s ease;
    `;
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
}

// ── Town Hall draw fn ─────────────────────────────────────────────────────────
function drawTownHall(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number) {
  function px(c: number, px2: number, py: number, w: number, h: number) {
    g.fillStyle(c, 1); g.fillRect(px2 * s, py * s, w * s, h * s);
  }
  px(0x8a7060, x+1,  y+4,  10, 8);
  px(0x7a6050, x+1,  y+10, 10, 2);
  px(0x8a3030, x,    y+2,  12, 3);
  px(0xa04040, x+1,  y+1,  10, 1);
  px(0xa04040, x+2,  y,     8, 1);
  px(0x5a3010, x+4,  y+7,   4, 5);
  px(0x8a5020, x+4,  y+8,   1, 1);
  px(0xd0c090, x+2,  y+5,   2, 2);
  px(0xd0c090, x+8,  y+5,   2, 2);
  px(0xd4a017, x+5,  y+1,   2, 3);
  px(0xcc3030, x+6,  y+1,   3, 2);
}
