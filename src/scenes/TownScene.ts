import Phaser from 'phaser';
import { store, LogEntry, defById } from '../systems/store';
import { MONSTER_SPAWN_POSITIONS } from '../systems/store';
import { CardType, JobType, CardInstance, CardDefinition, HumanStats, MonsterStats, SpawnZone } from '../types';
import {
  generateAllTextures, spriteKeyForCard,
  drawPasserby,
  drawShopBuilding, drawCraftBuilding, drawCombatBuilding,
} from '../utils/sprites';
import { WORLD_WIDTH } from '../main';

const MS_PER_TICK = 200;

export const ZONE = {
  wallLeft:     900,
  wallRight:   2700,
  shop:        1100,
  craft:       1400,
  town:        1800,
  barracks:    2200,
  patrolLeft:   950,
  patrolRight: 2650,
};

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
}

interface PasserbySprite {
  img: Phaser.GameObjects.Image;
  x: number; speed: number; groundY: number;
  hasTraded: boolean;
}

interface DenSprite {
  spawnZone: SpawnZone;
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

  constructor() { super({ key: 'TownScene' }); }

  create() {
    this.sceneH  = this.scale.height;
    this.groundY = this.sceneH * GROUND_FRAC;

    generateAllTextures(this);

    this.bgLayer     = this.add.container(0, 0);
    this.bldgLayer   = this.add.container(0, 0);
    this.denLayer    = this.add.container(0, 0);
    this.entityLayer = this.add.container(0, 0);
    this.fxLayer     = this.add.container(0, 0);
    this.labelLayer  = this.add.container(0, 0);

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, this.sceneH);
    this.cameras.main.centerOn(ZONE.town, this.sceneH / 2);
    this.cameras.main.setZoom(1.0);

    this.setupCameraControls();
    this.buildBackground();
    this.buildZoneBuildings();
    this.buildSideLog();

    store.subscribe(evt => {
      if (evt === 'field' || evt === 'upgrade' || evt === 'sell') {
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
    this.updateDens(delta);
  }

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
      cam.scrollX = Phaser.Math.Clamp(this.dragCamX - dx, 0, WORLD_WIDTH - cam.width / cam.zoom);
    });
    this.input.on('pointerup', () => { this.isDragging = false; });
    this.input.on('wheel',
      (_p: Phaser.Input.Pointer, _gos: unknown, _dx: number, _dy: number, dy: number) => {
        cam.setZoom(Phaser.Math.Clamp(cam.zoom - dy * 0.001, 0.75, 1.5));
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
            sp.sprite.destroy();
            sp.label.destroy();
            sp.hpBar.destroy();
            sp.craftBar.destroy();
            this.sprites.delete(sp.instanceId);
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

      // ── 攻城预警：倒计时=1 时闪城墙 ──────────────────────────────────────
      for (const inst of store.field) {
        if (!inst.definitionId) continue;
        const def = defById(inst.definitionId);
        if (def.type !== CardType.Monster || !inst.isActive) continue;
        if (inst.aggressionCountdown === 1) {
          if (!(inst as any).__warnedAggression) {
            (inst as any).__warnedAggression = true;
            store.addLog(`⚠️ ${def.name} 将在下月进攻！做好准备！`, 'bad');
            this.flashWalls();
          }
        } else {
          (inst as any).__warnedAggression = false;
        }
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

  // ── 攻城预警：城墙红色闪烁 ────────────────────────────────────────────────
  private flashWalls() {
    for (const wallX of [ZONE.wallLeft, ZONE.wallRight]) {
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
      if (!sp || sp.dyingTimer > 0) continue;

      if (def.type === CardType.Human) {
        if (!inst.isActive) {
          sp.targetX = ZONE.town + (Math.random() - 0.5) * WANDER;
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
          const zoneX = job === JobType.Shop  ? ZONE.shop
                      : job === JobType.Craft ? ZONE.craft
                      : ZONE.town;
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
      sp.targetX = ZONE.barracks + (Math.random() - 0.5) * 30;
      sp.targetY = gy;
      const distToBarracks = Math.abs(sp.x - ZONE.barracks);
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
      sp.targetX = ZONE.barracks + (Math.random() - 0.5) * WANDER;
      sp.targetY = gy;
      const dist = Math.hypot(sp.x - ZONE.barracks, sp.y - gy);
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
        if (!mSp || mSp.dyingTimer > 0) continue;
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
      const atLeft  = sp.x <= ZONE.patrolLeft  + 20;
      const atRight = sp.x >= ZONE.patrolRight - 20;
      if (atLeft)  sp.patrolDir =  1;
      if (atRight) sp.patrolDir = -1;
      sp.targetX = sp.patrolDir === 1 ? ZONE.patrolRight : ZONE.patrolLeft;
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

    const activeTown = townspeople.filter(c => c.isActive);
    if (activeTown.length === 0) {
      sp.monsterBehavior = 'retreating';
      sp.targetX = spawnX; sp.targetY = gy - 10;
      return;
    }

    if (sp.x > ZONE.wallLeft && sp.x < ZONE.wallRight) {
      sp.monsterBehavior = 'attacking';
      let nearestHuman: CardInstance | null = null;
      let nearestHumanSp: FieldSprite | null = null;
      let nearestDist = Infinity;
      for (const c of activeTown) {
        const hSp = this.sprites.get(c.instanceId);
        if (!hSp) continue;
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
    sp.targetX = ZONE.town + (Math.random() - 0.5) * 20;
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

    const dmgToMon  = Math.max(1, (as.atk + atkBuff + barracksBuff) - ds.def);
    const dmgToHero = Math.max(0, (ds.atk - monDebuff) - (as.def + defBuff));
    ds.hp -= dmgToMon;
    as.hp -= dmgToHero;

    const mSp = this.sprites.get(defender.instanceId);
    const hSp = this.sprites.get(attacker.instanceId);

    if (mSp && hSp) {
      this.spawnCombatFX((mSp.x + hSp.x) / 2, (mSp.y + hSp.y) / 2);
      this.spawnDamageText(mSp.x, mSp.y, dmgToMon, '#ff4040');
      if (dmgToHero > 0) this.spawnDamageText(hSp.x, hSp.y, dmgToHero, '#ff9966');

      // 攻击前冲动画
      const dir = mSp.x > hSp.x ? 1 : -1;
      this.tweens.add({
        targets: hSp.sprite,
        x: hSp.sprite.x + dir * 8,
        duration: 80, yoyo: true, ease: 'Quad.Out',
      });
      // 被击退动画
      this.tweens.add({
        targets: mSp.sprite,
        x: mSp.sprite.x + dir * 6,
        duration: 120, yoyo: true, ease: 'Quad.Out',
      });
    }

    if (mSp) mSp.hitFlashTimer = 4;
    if (hSp && dmgToHero > 0) hSp.hitFlashTimer = 4;

    if (ds.hp <= 0) this.killMonster(defender, mSp, attacker);

    if (as.hp <= 0) {
      as.hp = as.maxHp;
      attacker.isActive       = false;
      attacker.restMonthsLeft = store.townLevel;
      store.addLog(`😵 ${defById(attacker.definitionId).name} 被打倒，休息 ${store.townLevel} 月`, 'bad');
      if (hSp) { hSp.targetX = ZONE.town; hSp.targetY = this.groundY; }
    }
  }

  private resolveMonsterHitsHuman(monster: CardInstance, human: CardInstance) {
    const ms = monster.runtimeStats as MonsterStats;
    const hs = human.runtimeStats as HumanStats;
    const monDebuff = store.getMagicBonus('debuff_monster_atk');
    const defBuff   = store.getMagicBonus('buff_human_def');
    const dmg = Math.max(1, (ms.atk - monDebuff) - (hs.def + defBuff));
    hs.hp -= dmg;

    const hSp = this.sprites.get(human.instanceId);
    const mSp = this.sprites.get(monster.instanceId);
    if (hSp && mSp) {
      this.spawnCombatFX((hSp.x + mSp.x) / 2, (hSp.y + mSp.y) / 2);
      this.spawnDamageText(hSp.x, hSp.y, dmg, '#ff9966');
      hSp.hitFlashTimer = 4;

      // 怪物攻击前冲
      const dir = hSp.x > mSp.x ? 1 : -1;
      this.tweens.add({
        targets: mSp.sprite, x: mSp.sprite.x + dir * 8,
        duration: 80, yoyo: true, ease: 'Quad.Out',
      });
    }

    if (hs.hp <= 0) {
      hs.hp = hs.maxHp;
      human.isActive       = false;
      human.restMonthsLeft = store.townLevel;
      store.addLog(`😵 ${defById(human.definitionId).name} 被 ${defById(monster.definitionId).name} 击败！`, 'bad');
      if (hSp) { hSp.targetX = ZONE.town; hSp.targetY = this.groundY; }
    }
  }

  private killMonster(defender: CardInstance, mSp: FieldSprite | undefined, attacker: CardInstance) {
    const ms = defender.runtimeStats as MonsterStats;
    ms.hp = ms.maxHp;
    defender.isActive       = false;
    defender.restMonthsLeft = 3;
    defender.restProgress   = 0;

    store.addLog(`⚔️ ${defById(attacker.definitionId).name} 击败了 ${defById(defender.definitionId).name}！`, 'good');

    if (mSp) this.spawnLootDrop(defender, mSp.x, mSp.y);

    // 死亡动画：先放大到 1.1x，再缩小+消失（总 600ms）
    if (mSp) {
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
      if (!monster.spawnZone) continue;
      const zone   = monster.spawnZone as SpawnZone;
      const worldX = MONSTER_SPAWN_POSITIONS[zone] ?? 200;

      let den = this.dens.find(d => d.spawnZone === zone);
      if (!den) {
        const img = this.add.graphics();
        this.drawDen(img, worldX, this.groundY, monster.definitionId);
        this.denLayer.add(img);
        const restPulse = this.add.graphics();
        this.denLayer.add(restPulse);
        den = { spawnZone: zone, worldX, img, restPulse, pulseTimer: 0, occupantId: null };
        this.dens.push(den);
      }

      den.occupantId = !monster.isActive ? monster.instanceId : null;
    }

    const activeZones = new Set(monsters.map(m => m.spawnZone));
    this.dens = this.dens.filter(den => {
      if (!activeZones.has(den.spawnZone)) {
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

  // ── Sprite sync ────────────────────────────────────────────────────────────

  private syncSprites() {
    const fieldIds = new Set(store.field.map(c => c.instanceId));

    for (const [id, sp] of this.sprites) {
      if (!fieldIds.has(id) && sp.dyingTimer === 0) {
        sp.sprite.destroy(); sp.label.destroy(); sp.hpBar.destroy(); sp.craftBar.destroy();
        this.sprites.delete(id);
      }
    }

    for (const inst of store.field) {
      const sp = this.sprites.get(inst.instanceId);
      if (!sp) continue;
      if (sp.dyingTimer > 0) continue;
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

      const isMonster = def.type === CardType.Monster;
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

      let sx = ZONE.town, sy = this.groundY;
      if (def.type === CardType.Monster && inst.spawnZone) {
        sx = MONSTER_SPAWN_POSITIONS[inst.spawnZone as SpawnZone] ?? ZONE.town;
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
        sprite, label, hpBar, craftBar,
        x: sx, y: sy, targetX: sx, targetY: sy,
        bobPhase: Math.random() * Math.PI * 2,
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
      if (sp.dyingTimer > 0) continue;

      const inst = store.field.find(c => c.instanceId === id);
      if (!inst?.definitionId) continue;
      const def = defById(inst.definitionId);

      sp.bobPhase += 0.04;
      const isMonster = def.type === CardType.Monster;
      const speed     = isMonster ? MONSTER_SPEED : (sp.warriorState === 'heal' ? HEAL_SPEED : HUMAN_SPEED);

      if (!inst.isActive) {
        sp.sprite.setAlpha(0.45);
        sp.sprite.clearTint();
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
        if (dist > 1) {
          const step = Math.min(speed * dt, dist);
          sp.x += (dx / dist) * step;
          sp.y += (dy / dist) * step;
          sp.sprite.setFlipX(dx < 0);
        } else {
          sp.y = sp.targetY + Math.sin(sp.bobPhase) * 1.5;
        }
        sp.sprite.setPosition(sp.x, sp.y);
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

  // ── 制造进度条（修复版）──────────────────────────────────────────────────────
  // 修复：getCraftProgressInfo 返回 maxPoints=0 时不绘制，避免空转时进度条满值
  private drawCraftBar(sp: FieldSprite, inst: CardInstance, def: CardDefinition) {
    sp.craftBar.clear();
    if (def.type !== CardType.Human || inst.jobAssignment !== JobType.Craft || !inst.isActive) return;
    const { points, maxPoints } = store.getCraftProgressInfo();
    if (maxPoints === 0) return;  // 没有可制造配方 → 不显示
    const pct = Math.min(1, points / maxPoints);
    const w = 32, h = 2;
    const bx = sp.x - w / 2, by = sp.y - 22;
    sp.craftBar.fillStyle(0x1a1a0a); sp.craftBar.fillRect(bx, by, w, h);
    sp.craftBar.fillStyle(0xe0a020);
    sp.craftBar.fillRect(bx, by, Math.round(w * pct), h);
  }

  private monsterSpawnX(inst: CardInstance): number {
    if (!inst.spawnZone) return MONSTER_SPAWN_POSITIONS[SpawnZone.Left0];
    return MONSTER_SPAWN_POSITIONS[inst.spawnZone as SpawnZone] ?? MONSTER_SPAWN_POSITIONS[SpawnZone.Left0];
  }

  // ── Background ────────────────────────────────────────────────────────────

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

    // 地面基础色
    g.fillStyle(0x4a7a3a); g.fillRect(0, gy,     W, H - gy);
    g.fillStyle(0x3a6a2a); g.fillRect(0, gy + 8, W, H - gy - 8);

    // 城内道路
    const roadW = ZONE.wallRight - ZONE.wallLeft;
    g.fillStyle(0x8a7a60); g.fillRect(ZONE.wallLeft, gy, roadW, 40);
    g.fillStyle(0x9a8a70); g.fillRect(ZONE.wallLeft, gy + 2, roadW, 32);
    g.fillStyle(0x6a5a48);
    for (let rx = ZONE.wallLeft; rx < ZONE.wallRight; rx += 48) {
      g.fillRect(rx, gy + 2, 2, 32);
    }
    for (let ry = gy + 12; ry < gy + 36; ry += 12) {
      g.fillRect(ZONE.wallLeft, ry, roadW, 1);
    }
    g.fillStyle(0x5a8a40);
    for (let rx = ZONE.wallLeft; rx < ZONE.wallRight; rx += 18) {
      const h2 = 3 + (rx % 3);
      g.fillRect(rx, gy - h2, 4, h2);
    }
    g.fillStyle(0xb0a088);
    for (let i = 0; i < 40; i++) {
      const rx = ZONE.wallLeft + 10 + (i * 67 % (roadW - 20));
      const ry = gy + 6 + (i * 37 % 22);
      g.fillRect(rx, ry, 3, 2);
    }

    // 城外土路
    g.fillStyle(0x7a6050); g.fillRect(0, gy, ZONE.wallLeft, 30);
    g.fillStyle(0x8a7060); g.fillRect(0, gy + 4, ZONE.wallLeft, 20);
    g.fillStyle(0x5a4030);
    for (let i = 0; i < 20; i++) {
      const rx = 10 + (i * 53 % (ZONE.wallLeft - 20));
      const ry = gy + 6 + (i * 31 % 12);
      g.fillRect(rx, ry, 5, 3);
    }
    g.fillStyle(0x7a6050); g.fillRect(ZONE.wallRight, gy, W - ZONE.wallRight, 30);
    g.fillStyle(0x8a7060); g.fillRect(ZONE.wallRight, gy + 4, W - ZONE.wallRight, 20);
    g.fillStyle(0x5a4030);
    for (let i = 0; i < 20; i++) {
      const rx = ZONE.wallRight + 10 + (i * 53 % (W - ZONE.wallRight - 20));
      const ry = gy + 6 + (i * 31 % 12);
      g.fillRect(rx, ry, 5, 3);
    }

    // 路边植草
    g.fillStyle(0x4a8a38);
    for (let rx = 0; rx < ZONE.wallLeft; rx += 14) {
      const h3 = 2 + (rx % 3); g.fillRect(rx, gy - h3, 3, h3);
    }
    for (let rx = ZONE.wallRight; rx < W; rx += 14) {
      const h3 = 2 + (rx % 3); g.fillRect(rx, gy - h3, 3, h3);
    }

    // 太阳
    g.fillStyle(0xffd040); g.fillRect(W - 120, 20, 18, 18);
    g.fillStyle(0xffb020);
    [[W-128,24,4,10],[W-106,24,4,10],[W-116,14,10,4],[W-116,40,10,4]].forEach(
      ([x,y,w,h]) => g.fillRect(x as number,y as number,w as number,h as number)
    );

    // 云朵
    [[200,0.08],[600,0.05],[1100,0.10],[1700,0.06],[2300,0.09],[2900,0.07],[3400,0.05]].forEach(
      ([cx, ty]) => {
        g.fillStyle(0xe8f0ff, 0.8);
        g.fillRect(cx as number, (H * ty) as number, 36, 10);
        g.fillRect((cx as number) + 5, (H * ty) as number - 5, 26, 10);
      }
    );

    // 树木
    const treePositions = [300, 450, 580, 700, 780, 2780, 2880, 2980, 3100, 3250];
    for (const tx of treePositions) {
      const key = `tree_w_${tx}`;
      if (!this.textures.exists(key)) {
        const tg = this.add.graphics();
        const s = 4;
        tg.fillStyle(0x5a3010); tg.fillRect(2*s, 6*s, 2*s, 4*s);
        tg.fillStyle(0x2a5a2a); tg.fillRect(0, 2*s, 6*s, 4*s);
        tg.fillStyle(0x3a8a3a); tg.fillRect(s, 3*s, 4*s, 2*s);
        tg.generateTexture(key, 32, 44);
        tg.destroy();
      }
      // setOrigin(0.5, 1) 使树底部贴地
      const t = this.add.image(tx, gy, key).setOrigin(0.5, 1);
      this.bgLayer.add(t);
    }

    this.buildWalls(g, gy, H);
  }

  private buildWalls(g: Phaser.GameObjects.Graphics, gy: number, H: number) {
    const wallH = 70, wallW = 28, gateW = 36, crenH = 10, crenW = 10, crenGap = 8;
    const stoneLight = 0xa09070, stoneMid = 0x806850, stoneDark = 0x604830;
    const gateColor = 0x3a2010, gateHigh = 0x5a3820;

    for (const wallX of [ZONE.wallLeft, ZONE.wallRight]) {
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
      }
      g.fillStyle(gateColor); g.fillRect(wx + wallW, gy - 44, gateW, 44);
      g.fillStyle(gateHigh); g.fillRect(wx + wallW + 2, gy - 42, gateW - 4, 5);
      g.fillStyle(gateColor); g.fillRect(wx + wallW + 4, gy - 50, gateW - 8, 8);
      g.fillRect(wx + wallW + 2, gy - 48, gateW - 4, 4);
      g.fillStyle(0x484030);
      for (let bar = 0; bar < 4; bar++) {
        g.fillRect(wx + wallW + 4 + bar * 8, gy - 44, 3, 44);
      }
      g.fillStyle(0x201000, 0.4); g.fillRect(wx + wallW, gy, gateW, 8);
    }
  }

  // ── Zone buildings ─────────────────────────────────────────────────────────

  private buildZoneBuildings() {
    const gy = this.groundY;
    const scale = 3;

    type DrawFnType = (g: Phaser.GameObjects.Graphics, x: number, y: number, s: number) => void;
    const zones: [string, DrawFnType, number][] = [
      ['bldg_shop',     drawShopBuilding,   ZONE.shop],
      ['bldg_craft',    drawCraftBuilding,  ZONE.craft],
      ['bldg_townhall', drawTownHall,       ZONE.town],
      ['bldg_barracks', drawCombatBuilding, ZONE.barracks],
    ];

    for (const [key, fn, cx] of zones) {
      if (!this.textures.exists(key)) {
        const g = this.add.graphics();
        fn(g, 0, 0, scale);
        g.generateTexture(key, 48, 60);  // 统一 48x60
        g.destroy();
      }
      // setOrigin(0.5, 1) 使建筑底部贴地
      const img = this.add.image(cx, gy, key).setOrigin(0.5, 1);
      this.bldgLayer.add(img);
      // 建筑底部椭圆阴影
      const shadow = this.add.graphics();
      shadow.fillStyle(0x000000, 0.22);
      shadow.fillEllipse(cx, gy + 3, 52, 10);
      this.bldgLayer.add(shadow);
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
      const t = this.add.text(x, gy - 68, txt, labelStyle).setOrigin(0.5, 1);
      this.bldgLayer.add(t);
    });
  }

  // ── Passerby ───────────────────────────────────────────────────────────────

  private maybeSpawnPasserby() {
    if (store.isUnderSiege || this.passerbyList.length >= 6) return;
    if (!this.textures.exists('passerby_tex')) {
      const g = this.add.graphics();
      drawPasserby(g, 0, 0, 3);
      g.generateTexture('passerby_tex', 18, 24);
      g.destroy();
    }
    const fromLeft = Math.random() > 0.5;
    const startX   = fromLeft ? ZONE.wallLeft + 10 : ZONE.wallRight - 10;
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
      // setOrigin(0.5,1) → y直接用groundY，Bob效果在y方向偏移
      p.img.setPosition(p.x, p.groundY + Math.sin(p.x * 0.05) * 1.5);

      if (!p.hasTraded && store.totalProducts > 0) {
        const inShopZone = Math.abs(p.x - ZONE.shop) < 55;
        if (inShopZone) {
          let nearestWorkerSp: FieldSprite | null = null;
          let nearestDist = Infinity;
          for (const c of store.field) {
            const d = defById(c.definitionId);
            if (d.type !== CardType.Human || c.jobAssignment !== JobType.Shop || !c.isActive) continue;
            const wSp = this.sprites.get(c.instanceId);
            if (!wSp || wSp.shopServeTarget) continue;
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

      if (p.x < ZONE.wallLeft - 20 || p.x > ZONE.wallRight + 20) {
        p.img.destroy();
        this.passerbyList.splice(i, 1);
      }
    }
  }

  // ── FX ─────────────────────────────────────────────────────────────────────

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

  // ── Side log ────────────────────────────────────────────────────────────────

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

// ── Town Hall ─────────────────────────────────────────────────────────────────
function drawTownHall(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number) {
  function px(c: number, px2: number, py: number, w: number, h: number) {
    g.fillStyle(c, 1); g.fillRect(px2 * s, py * s, w * s, h * s);
  }
  // 底部在 y+17，与其他建筑一致
  px(0x8a7060, x+1,  y+5,  10, 12);
  px(0x7a6050, x+1,  y+15, 10, 2);
  px(0x8a3030, x,    y+2,  12, 4);
  px(0xa04040, x+1,  y+1,  10, 1);
  px(0xa04040, x+2,  y+0,   8, 1);
  px(0x5a3010, x+4,  y+9,   4, 8);
  px(0x8a5020, x+4,  y+10,  1, 1);
  px(0xd0c090, x+2,  y+6,   2, 3);
  px(0xd0c090, x+8,  y+6,   2, 3);
  px(0xd4a017, x+5,  y+2,   2, 3);
  px(0xcc3030, x+6,  y+1,   3, 2);
}
