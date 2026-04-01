import Phaser from 'phaser';
import { store, LogEntry, defById } from '../systems/store';
import { CardType, JobType, HumanStats, MonsterStats } from '../types';
import {
  generateAllTextures, spriteKeyForCard,
  drawTree, drawPasserby,
  drawShopBuilding, drawCraftBuilding, drawCombatBuilding, drawRestBuilding,
} from '../utils/sprites';

// ── Timing ─────────────────────────────────────────────────────────────────────
const MS_PER_TICK = 125;   // 160 ticks/month ≈ 20s/month

// ── Zone definitions (fraction of canvas width) ───────────────────────────────
// Layout: [LEFT_BORDER .. SHOP .. CRAFT .. TOWNHALL .. COMBAT .. BARRACKS .. RIGHT_BORDER]
const ZONE = {
  shop:   0.18,   // centre x of shop zone
  craft:  0.36,
  town:   0.54,   // town hall
  combat: 0.72,
  barracks: 0.86,
};

// Horizontal wander radius inside each zone
const WANDER = 30;
// Ground Y fraction
const GROUND_FRAC = 0.60;

// ── Interfaces ────────────────────────────────────────────────────────────────

interface FieldSprite {
  instanceId: string;
  sprite:     Phaser.GameObjects.Image;
  label:      Phaser.GameObjects.Text;
  hpBar:      Phaser.GameObjects.Graphics;
  x: number; y: number;
  targetX: number; targetY: number;
  // combat state
  combatTarget: string | null;   // instanceId of monster being attacked
  attackCooldown: number;        // ticks until next hit
  // idle bob phase
  bobPhase: number;
}

interface PasserbySprite {
  img: Phaser.GameObjects.Image;
  x: number; speed: number; groundY: number;
}

// ── Scene ─────────────────────────────────────────────────────────────────────

export class TownScene extends Phaser.Scene {
  private bgLayer!:     Phaser.GameObjects.Container;
  private bldgLayer!:   Phaser.GameObjects.Container;  // zone buildings
  private entityLayer!: Phaser.GameObjects.Container;
  private fxLayer!:     Phaser.GameObjects.Container;
  private labelLayer!:  Phaser.GameObjects.Container;

  private sprites: Map<string, FieldSprite> = new Map();
  private passerbyList: PasserbySprite[] = [];
  private sideLogEl!: HTMLElement;

  private groundY = 0;
  private W = 0;

  private tickAccum = 0;

  constructor() { super({ key: 'TownScene' }); }

  // ── Lifecycle ─────────────────────────────────────────────────────────────────

  create() {
    this.W       = this.scale.width;
    this.groundY = this.scale.height * GROUND_FRAC;

    generateAllTextures(this);

    this.bgLayer     = this.add.container(0, 0);
    this.bldgLayer   = this.add.container(0, 0);
    this.entityLayer = this.add.container(0, 0);
    this.fxLayer     = this.add.container(0, 0);
    this.labelLayer  = this.add.container(0, 0);

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

  // ── Tick ──────────────────────────────────────────────────────────────────────

  private doTick() {
    try {
      this.runAI();
      const { newLogs } = store.advanceTick();
      if (newLogs.length > 0) {
        for (const e of [...newLogs].reverse()) this.pushLogEntry(e);
        this.syncSprites();   // refresh on log events (week/month changes)
      }
      if (store.tick % 24 === 0) this.maybeSpawnPasserby();
    } catch (e) {
      console.error('[doTick]', e);
    }
  }

  // ── AI ────────────────────────────────────────────────────────────────────────

  private runAI() {
    const W = this.W, gy = this.groundY;

    // Build monster snapshot
    const monsterSprites = store.field
      .filter(c => c.definitionId && defById(c.definitionId).type === CardType.Monster)
      .map(c => ({ inst: c, sp: this.sprites.get(c.instanceId) }))
      .filter(m => m.sp) as { inst: typeof store.field[0]; sp: FieldSprite }[];

    const anyAttacking = monsterSprites.some(m => m.inst.aggressionCountdown === 0 && m.inst.isActive);

    for (const inst of store.field) {
      if (!inst?.definitionId) continue;
      const def = defById(inst.definitionId);
      if (def.name === '???') continue;
      const sp = this.sprites.get(inst.instanceId);
      if (!sp) continue;

      // ── Human AI ────────────────────────────────────────────────────────────
      if (def.type === CardType.Human) {
        if (!inst.isActive) {
          // Resting: drift to town hall
          sp.targetX = W * ZONE.town + (Math.random() - 0.5) * WANDER;
          sp.targetY = gy;
          sp.combatTarget = null;
          continue;
        }

        const job = inst.jobAssignment ?? JobType.Idle;

        if (job === JobType.Combat) {
          if (anyAttacking) {
            // Find nearest attacking monster
            let nearestSp: FieldSprite | null = null;
            let nearestDist = Infinity;
            for (const m of monsterSprites) {
              if (m.inst.aggressionCountdown !== 0 || !m.inst.isActive) continue;
              const d = Math.hypot(m.sp.x - sp.x, m.sp.y - sp.y);
              if (d < nearestDist) { nearestDist = d; nearestSp = m.sp; sp.combatTarget = m.inst.instanceId; }
            }
            if (nearestSp) {
              sp.targetX = nearestSp.x;
              sp.targetY = nearestSp.y;

              // Close enough to fight?
              if (nearestDist < 36) {
                sp.attackCooldown--;
                if (sp.attackCooldown <= 0) {
                  sp.attackCooldown = 2;  // hit every 2 ticks
                  this.resolveHit(inst, store.field.find(c => c.instanceId === sp.combatTarget)!);
                }
              }
            }
          } else {
            // No attackers – return to barracks zone
            sp.combatTarget = null;
            sp.targetX = W * ZONE.barracks + (Math.random() - 0.5) * WANDER;
            sp.targetY = gy;
          }
        } else {
          // Non-combat jobs stay in their zone
          const zoneX = job === JobType.Shop  ? W * ZONE.shop
                      : job === JobType.Craft ? W * ZONE.craft
                      : W * ZONE.town;
          // Idle drift within zone
          if (Math.abs(sp.x - zoneX) > WANDER * 1.5 || Math.random() < 0.02) {
            sp.targetX = zoneX + (Math.random() - 0.5) * WANDER;
            sp.targetY = gy + (Math.random() - 0.5) * 8;
          }
          sp.combatTarget = null;
        }
      }

      // ── Monster AI ──────────────────────────────────────────────────────────
      if (def.type === CardType.Monster) {
        if (!inst.isActive) continue;

        if (inst.aggressionCountdown > 0) {
          // Waiting at spawn – gentle idle wander
          const spawnX = this.monsterSpawnX(inst);
          if (Math.abs(sp.x - spawnX) > WANDER || Math.random() < 0.02) {
            sp.targetX = spawnX + (Math.random() - 0.5) * WANDER * 0.5;
            sp.targetY = gy - 10 + (Math.random() - 0.5) * 8;
          }
        } else {
          // Marching toward town
          sp.targetX = W * ZONE.town + (Math.random() - 0.5) * 20;
          sp.targetY = gy;
        }
      }
    }
  }

  /** Pixel-level combat: one attacker hits one defender */
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

    // Monster defeated visually – store resolveMonth will handle loot on month end
    if (ds.hp <= 0) {
      ds.hp = ds.maxHp;
      defender.aggressionCountdown = ds.aggression;
      // Fly monster back to spawn
      const mSpr = this.sprites.get(defender.instanceId);
      if (mSpr) {
        mSpr.targetX = this.monsterSpawnX(defender);
        mSpr.targetY = this.groundY - 10;
        store.addLog(`⚔️ ${defById(attacker.definitionId).name} 击退了 ${defById(defender.definitionId).name}！`, 'good');
      }
      this.grantLoot(defender);
    }
    if (as.hp <= 0) {
      as.hp = as.maxHp;
      attacker.isActive = false;
      attacker.restMonthsLeft = store.townLevel;
      store.addLog(`😵 ${defById(attacker.definitionId).name} 被打倒，休息 ${store.townLevel} 月`, 'bad');
      const hSpr = this.sprites.get(attacker.instanceId);
      if (hSpr) {
        // Fly back toward town hall
        hSpr.targetX = this.W * ZONE.town;
        hSpr.targetY = this.groundY;
      }
    }
  }

  /** Grant loot from a monster when defeated in combat */
  private grantLoot(monster: typeof store.field[0]) {
    const ms = monster.runtimeStats as MonsterStats;
    if (!ms.lootId) return;
    const qty = ms.lootQtyMin + Math.floor(Math.random() * (ms.lootQtyMax - ms.lootQtyMin + 1));
    store.addItem(ms.lootId, 'loot', qty);
    store.emit('inventory');
  }

  /** X position where a monster spawns, based on spawnZone */
  private monsterSpawnX(inst: typeof store.field[0]): number {
    const zone = inst.spawnZone ?? 'north';
    if (zone === 'east')  return this.W + 60;
    if (zone === 'south') return this.W * 0.5;
    return -60;   // north = left side
  }

  // ── Sprite sync ───────────────────────────────────────────────────────────────

  private syncSprites() {
    const fieldIds = new Set(store.field.map(c => c.instanceId));

    // Remove gone sprites
    for (const [id, sp] of this.sprites) {
      if (!fieldIds.has(id)) {
        sp.sprite.destroy(); sp.label.destroy(); sp.hpBar.destroy();
        this.sprites.delete(id);
      }
    }

    // Update textures for existing (job may have changed)
    for (const inst of store.field) {
      const sp = this.sprites.get(inst.instanceId);
      if (!sp) continue;
      const newKey = spriteKeyForCard(inst.definitionId, inst.jobAssignment, inst.level);
      if ((sp.sprite as any).__texKey !== newKey) {
        sp.sprite.setTexture(newKey);
        (sp.sprite as any).__texKey = newKey;
      }
    }

    // Add new sprites
    for (const inst of store.field) {
      if (this.sprites.has(inst.instanceId)) continue;
      const def = defById(inst.definitionId);
      if (def.name === '???') continue;

      const key = spriteKeyForCard(inst.definitionId, inst.jobAssignment, inst.level);
      const sprite = this.add.image(0, 0, key);
      (sprite as any).__texKey = key;
      this.entityLayer.add(sprite);

      const label = this.add.text(0, 0, def.name, {
        fontFamily: '"Silkscreen", monospace',
        fontSize: '8px', color: '#f5e6c8',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5, 1);
      this.labelLayer.add(label);

      const hpBar = this.add.graphics();
      this.labelLayer.add(hpBar);

      // Initial position
      let sx = this.W * ZONE.town, sy = this.groundY;
      if (def.type === CardType.Monster) {
        sx = this.monsterSpawnX(inst);
        sy = this.groundY - 10;
      } else if (def.type === CardType.Human) {
        const job = inst.jobAssignment ?? JobType.Idle;
        sx = job === JobType.Shop   ? this.W * ZONE.shop
           : job === JobType.Craft  ? this.W * ZONE.craft
           : job === JobType.Combat ? this.W * ZONE.barracks
           : this.W * ZONE.town;
        sy = this.groundY;
      }

      sprite.setPosition(sx, sy);

      this.sprites.set(inst.instanceId, {
        instanceId: inst.instanceId,
        sprite, label, hpBar,
        x: sx, y: sy,
        targetX: sx, targetY: sy,
        combatTarget: null,
        attackCooldown: 0,
        bobPhase: Math.random() * Math.PI * 2,
      });
    }
  }

  // ── Visual interpolation ──────────────────────────────────────────────────────

  private interpolate(dt: number) {
    const SPEED = 80; // px per tick

    for (const [id, sp] of this.sprites) {
      const inst = store.field.find(c => c.instanceId === id);
      if (!inst?.definitionId) continue;

      sp.bobPhase += 0.06;

      if (!inst.isActive) {
        sp.sprite.setAlpha(0.45);
        // gentle bob in place
        sp.sprite.setPosition(sp.x, sp.y + Math.sin(sp.bobPhase) * 1.5);
      } else {
        sp.sprite.setAlpha(1);
        const dx = sp.targetX - sp.x;
        const dy = sp.targetY - sp.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 1) {
          const step = Math.min(SPEED * dt, dist);
          sp.x += (dx / dist) * step;
          sp.y += (dy / dist) * step;
          sp.sprite.setFlipX(dx < 0);
        } else {
          // Idle bob when standing still
          sp.y = sp.targetY + Math.sin(sp.bobPhase) * 1.5;
        }
        sp.sprite.setPosition(sp.x, sp.y);
      }

      sp.label.setPosition(sp.x, sp.y - 28);
      this.drawHpBar(sp, inst);
    }
  }

  private drawHpBar(sp: FieldSprite, inst: any) {
    sp.hpBar.clear();
    const rs = inst.runtimeStats as any;
    if (!('hp' in rs && 'maxHp' in rs)) return;
    const pct = Math.max(0, rs.hp / rs.maxHp);
    const w = 32, h = 3, bx = sp.x - w / 2, by = sp.y - 22;
    sp.hpBar.fillStyle(0x220000); sp.hpBar.fillRect(bx, by, w, h);
    const col = pct > 0.5 ? 0x40cc40 : pct > 0.25 ? 0xcccc40 : 0xcc4040;
    sp.hpBar.fillStyle(col);
    sp.hpBar.fillRect(bx, by, Math.round(w * pct), h);
  }

  // ── Background ───────────────────────────────────────────────────────────────

  private buildBackground() {
    const W = this.W, H = this.scale.height, gy = this.groundY;
    const g = this.add.graphics();
    this.bgLayer.add(g);

    // Sky gradient
    for (let i = 0; i < gy; i++) {
      const t  = i / gy;
      const r  = (Phaser.Math.Linear(0x1a, 0x6a, t)) | 0;
      const gr = (Phaser.Math.Linear(0x28, 0x9a, t)) | 0;
      const b  = (Phaser.Math.Linear(0x4a, 0xcc, t)) | 0;
      g.fillStyle((r << 16) | (gr << 8) | b, 1);
      g.fillRect(0, i, W, 1);
    }

    // Ground
    g.fillStyle(0x4a7a3a); g.fillRect(0, gy, W, H - gy);
    g.fillStyle(0x3a6a2a); g.fillRect(0, gy + 6, W, H - gy - 6);

    // Road (horizontal strip)
    g.fillStyle(0x7a6a5a); g.fillRect(0, gy + 1, W, 10);
    g.fillStyle(0x9a8a7a);
    for (let rx = 0; rx < W; rx += 60) g.fillRect(rx + 8, gy + 5, 28, 2);

    // Clouds
    [[80,0.08],[260,0.04],[480,0.11],[700,0.06]].forEach(([cx, ty]) => {
      g.fillStyle(0xe8f0ff, 0.85);
      g.fillRect(cx as number, (H * ty) as number, 28, 8);
      g.fillRect((cx as number)+4, (H * ty) as number - 4, 20, 8);
    });

    // Sun
    g.fillStyle(0xffd040); g.fillRect(W - 72, 16, 18, 18);
    g.fillStyle(0xffb020);
    [[W-80,20,4,10],[W-58,20,4,10],[W-68,12,10,4],[W-68,36,10,4]].forEach(
      ([x,y,w,h]) => g.fillRect(x as number, y as number, w as number, h as number)
    );

    // Trees at edges
    ['tree_L1','tree_L2','tree_R1','tree_R2'].forEach((key, i) => {
      const tx = i < 2 ? 30 + i * 55 : W - 80 + (i - 2) * 55;
      if (!this.textures.exists(key)) {
        const tg = this.add.graphics();
        drawTree(tg, 0, 0, 4);
        tg.generateTexture(key, 32, 40);
        tg.destroy();
      }
      const t = this.add.image(tx, gy - 16, key);
      this.bgLayer.add(t);
    });
  }

  // ── Zone buildings ────────────────────────────────────────────────────────────

  private buildZoneBuildings() {
    const W = this.W, gy = this.groundY;
    const scale = 3;

    const zones: [string, (g: Phaser.GameObjects.Graphics, x:number, y:number, s:number)=>void, number][] = [
      ['bldg_shop',    drawShopBuilding,    W * ZONE.shop],
      ['bldg_craft',   drawCraftBuilding,   W * ZONE.craft],
      ['bldg_townhall',drawTownHall,        W * ZONE.town],
      ['bldg_barracks',drawCombatBuilding,  W * ZONE.barracks],
    ];

    for (const [key, fn, cx] of zones) {
      if (!this.textures.exists(key)) {
        const g = this.add.graphics();
        fn(g, 0, 0, scale);
        g.generateTexture(key, 48, 48);
        g.destroy();
      }
      const img = this.add.image(cx, gy - 24, key);
      this.bldgLayer.add(img);
    }

    // Zone labels
    const labelStyle = {
      fontFamily: '"Silkscreen", monospace', fontSize: '8px',
      color: '#9a8a70', stroke: '#000', strokeThickness: 2,
    };
    [
      [W * ZONE.shop,    '商店'],
      [W * ZONE.craft,   '制造'],
      [W * ZONE.town,    ''],
      [W * ZONE.barracks,'兵营'],
    ].forEach(([x, txt]) => {
      if (!txt) return;
      const t = this.add.text(x as number, gy - 52, txt as string, labelStyle).setOrigin(0.5, 1);
      this.bldgLayer.add(t);
    });
  }

  // ── Town Hall (inline draw fn, not exported) ──────────────────────────────────
  // Called in buildZoneBuildings to generate the centre building texture

  // ── Passerby ─────────────────────────────────────────────────────────────────

  private maybeSpawnPasserby() {
    const underAttack = store.field.some(c => {
      if (!c.definitionId) return false;
      const d = defById(c.definitionId);
      return d.type === CardType.Monster && c.aggressionCountdown === 0;
    });
    if (underAttack || this.passerbyList.length >= 5) return;

    if (!this.textures.exists('passerby_tex')) {
      const g = this.add.graphics();
      drawPasserby(g, 0, 0, 3);
      g.generateTexture('passerby_tex', 18, 24);
      g.destroy();
    }

    const fromLeft = Math.random() > 0.5;
    const img = this.add.image(fromLeft ? -20 : this.W + 20, this.groundY + 8, 'passerby_tex');
    img.setFlipX(!fromLeft);
    this.entityLayer.add(img);

    this.passerbyList.push({
      img, x: fromLeft ? -20 : this.W + 20,
      speed: (fromLeft ? 1 : -1) * (26 + Math.random() * 18),
      groundY: this.groundY + 8,
    });
  }

  private updatePasserby(dt: number) {
    for (let i = this.passerbyList.length - 1; i >= 0; i--) {
      const p = this.passerbyList[i];
      p.x += p.speed * dt;
      p.img.setPosition(p.x, p.groundY + Math.sin(p.x * 0.08) * 1.5);
      if (p.x < -60 || p.x > this.W + 60) {
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
    const el = document.getElementById('side-log');
    if (el) { this.sideLogEl = el; return; }

    const panel = document.createElement('div');
    panel.id = 'side-log';
    panel.style.cssText = `
      position:absolute; right:0; top:40px; bottom:170px;
      width:220px; overflow-y:auto; overflow-x:hidden;
      background:rgba(10,5,2,0.82); border-left:2px solid #5a3a1a;
      padding:8px 0; z-index:8; pointer-events:none;
      scrollbar-width:thin; scrollbar-color:#5a3a1a transparent;
    `;
    document.getElementById('game-container')!.appendChild(panel);
    this.sideLogEl = panel;
    for (const e of [...store.log].reverse()) this.pushLogEntry(e);
  }

  private pushLogEntry(entry: LogEntry) {
    if (!this.sideLogEl) return;
    const el = document.createElement('div');
    const col = entry.kind === 'good' ? '#60cc60' : entry.kind === 'bad' ? '#cc6060' : '#9a8a70';
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

// ── Town-hall draw fn (used only for texture generation) ──────────────────────
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
  px(0xd4a017, x+5,  y+1,   2, 3);  // flag
  px(0xcc3030, x+6,  y+1,   3, 2);
}
