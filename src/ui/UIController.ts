import { store, defById, monthlyTax, LogEntry } from '../systems/store';
import { CardInstance, CardDefinition, CardType, JobType, SpawnZone } from '../types';
import { CARD_DB } from '../data/cards';
import { LOOT_DB, PRODUCT_DB, RECIPE_DB, lootById, productById } from '../data/items';

// ── DOM helpers ────────────────────────────────────────────────────────────────

function $(id: string): HTMLElement { return document.getElementById(id)!; }

function notify(msg: string, type: 'info' | 'danger' | 'success' = 'info') {
  const el = document.createElement('div');
  el.className = `notif${type !== 'info' ? ' ' + type : ''}`;
  el.textContent = msg;
  $('notifications').prepend(el);
  setTimeout(() => { el.classList.add('fade'); setTimeout(() => el.remove(), 1000); }, 2500);
}

function showModal(title: string, body: string) {
  ($('modal-title') as HTMLElement).textContent = title;
  ($('modal-body')  as HTMLElement).innerHTML   = body;
  $('modal-overlay').classList.add('open');
}

// ── Card info HTML ─────────────────────────────────────────────────────────────

function statRow(label: string, val: string | number) {
  return `<div style="display:flex;justify-content:space-between;border-bottom:1px solid #2a1a0a;padding:3px 0">
    <span style="color:#9a7a50">${label}</span>
    <span style="color:#f0c040">${val}</span>
  </div>`;
}

function cardInfoHTML(def: CardDefinition, inst?: CardInstance): string {
  const rs   = (inst?.runtimeStats ?? def.stats) as any;
  const rows = [
    statRow('类型',  { human:'人物', monster:'怪物', building:'建筑', magic:'魔法' }[def.type] ?? def.type),
    statRow('等级',  `Lv.${inst?.level ?? def.level}`),
    statRow('购买',  `${def.cost} 💰`),
    statRow('维护',  def.upkeep ? `${def.upkeep}/月` : '免费'),
  ];
  if ('hp'         in rs) rows.push(statRow('体力',        `${rs.hp}/${rs.maxHp}`));
  if ('atk'        in rs) rows.push(statRow('攻击',        rs.atk));
  if ('def'        in rs) rows.push(statRow('防御',        rs.def));
  if ('intellect'  in rs) rows.push(statRow('智力（商店）', rs.intellect));
  if ('diligence'  in rs) rows.push(statRow('勤劳（制造）', rs.diligence));
  if ('strength'   in rs && def.type !== CardType.Monster)
                          rows.push(statRow('力量（战斗）', rs.strength));
  if ('rarity'     in rs) rows.push(statRow('稀有',        rs.rarity));
  if ('aggression' in rs) rows.push(statRow('侵略倒计时',   rs.aggression));
  if ('lootId'     in rs) {
    try { const l = lootById(rs.lootId); rows.push(statRow('战利品', `${l.emoji}${l.name}`)); } catch {}
  }
  if ('effect'     in rs) rows.push(statRow('效果',        rs.effect));
  if ('power'      in rs) rows.push(statRow('能量',        rs.power));
  if ('bonus'      in rs) rows.push(statRow('加成',        `×${rs.bonus}`));
  if (inst?.isOnField && inst.jobAssignment) rows.push(statRow('岗位', inst.jobAssignment));
  if (inst?.isOnField && inst.spawnZone)     rows.push(statRow('出生点', inst.spawnZone));
  if (inst && !inst.isActive) {
    rows.push(statRow('状态', `⚠️ 休息中（${inst.restMonthsLeft + inst.strikeMonthsLeft}月）`));
  }
  if (inst?.upgrades) rows.push(statRow('已升级', inst.upgrades + '次'));

  return `<div style="font-style:italic;color:#9a7a50;margin-bottom:10px">${def.description}</div>
    <div>${rows.join('')}</div>`;
}

// ── Card element ───────────────────────────────────────────────────────────────

function typeLabel(t: CardType) {
  return { human:'人物', monster:'怪物', building:'建筑', magic:'魔法' }[t] ?? t;
}

function makeCardEl(def: CardDefinition, inst?: CardInstance): HTMLElement {
  const el = document.createElement('div');
  el.className = `card card-${def.type}`;
  if (inst && !inst.isActive) el.style.opacity = '0.5';
  const badge   = (inst?.upgrades ?? 0) > 0 ? `<div class="card-level-badge">+${inst!.upgrades}</div>` : '';
  const footer  = inst
    ? `<div class="card-cost">${def.upkeep ? `维护:${def.upkeep}` : '免费'}</div>`
    : `<div class="card-cost">💰 ${def.cost}</div>`;
  el.innerHTML  = `${badge}
    <div class="card-header">${typeLabel(def.type)}</div>
    <div class="card-pixel-art">${def.emoji}</div>
    <div class="card-footer"><div class="card-name">${def.name}</div>${footer}</div>`;
  return el;
}

// ── Action menu ────────────────────────────────────────────────────────────────

// FIX: capture copies at open time, not closed-over mutable vars
let _menuInst: CardInstance | null = null;
let _menuDef:  CardDefinition | null = null;
let menuOpen   = false;

function openActionMenu(inst: CardInstance, def: CardDefinition, anchor: HTMLElement) {
  // Capture copies before any async/event gap
  _menuInst = inst;
  _menuDef  = def;

  const menu       = $('card-action-menu');
  const playBtn    = $('cam-play')    as HTMLButtonElement;
  const assignBtn  = $('cam-assign')  as HTMLButtonElement;
  const upgradeBtn = $('cam-upgrade') as HTMLButtonElement;

  playBtn.disabled    = inst.isOnField;
  assignBtn.disabled  = !inst.isOnField || (def.type !== CardType.Human && def.type !== CardType.Monster);
  const count = [...store.hand, ...store.field].filter(c => c.definitionId === def.id).length;
  upgradeBtn.disabled   = count < 3;
  upgradeBtn.textContent = `⬆ 升级（${count}/3）`;

  const rect = anchor.getBoundingClientRect();
  menu.style.left = `${Math.min(rect.left, window.innerWidth - 165)}px`;
  menu.style.top  = `${Math.max(4, rect.top - 172)}px`;
  menu.classList.add('open');
  menuOpen = true;
}

function closeMenu() {
  $('card-action-menu').classList.remove('open');
  menuOpen   = false;
  _menuInst  = null;
  _menuDef   = null;
}

// ── Assign modal ───────────────────────────────────────────────────────────────

function openAssignModal(inst: CardInstance, def: CardDefinition) {
  const opts = $('assign-options');
  $('assign-title').textContent = `分配：${def.name}`;
  opts.innerHTML = '';

  if (def.type === CardType.Human) {
    const rs = inst.runtimeStats as any;
    [
      { job: JobType.Shop,   label: '🏪 商店', stat: `智力 ${rs.intellect}` },
      { job: JobType.Craft,  label: '⚒️ 制造', stat: `勤劳 ${rs.diligence}` },
      { job: JobType.Combat, label: '⚔️ 战斗', stat: `力量 ${rs.strength}` },
    ].forEach(j => {
      const el = document.createElement('div');
      el.className = 'assign-option';
      el.innerHTML = `<span class="opt-name">${j.label}</span><span class="opt-stat">${j.stat}</span>`;
      el.onclick   = () => {
        store.assignJob(inst.instanceId, j.job);
        notify(`${def.name} → ${j.label}`, 'success');
        $('assign-modal').classList.remove('open');
      };
      opts.appendChild(el);
    });
  } else {
    [
      { zone: SpawnZone.North, label: '⬅ 左侧出生' },
      { zone: SpawnZone.East,  label: '➡ 右侧出生' },
      { zone: SpawnZone.South, label: '⬆ 顶部出生' },
    ].forEach(z => {
      const el = document.createElement('div');
      el.className = 'assign-option';
      el.innerHTML = `<span class="opt-name">${z.label}</span>`;
      el.onclick   = () => {
        store.assignSpawnZone(inst.instanceId, z.zone);
        notify(`${def.name} → ${z.label}`, 'success');
        $('assign-modal').classList.remove('open');
      };
      opts.appendChild(el);
    });
  }

  $('assign-modal').classList.add('open');
}

// ── Tab management ─────────────────────────────────────────────────────────────

type Tab = 'hand' | 'shop' | 'field' | 'inventory';
let currentTab: Tab = 'shop';

function setTab(tab: Tab) {
  currentTab = tab;
  document.querySelectorAll('.card-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`[data-tab="${tab}"]`)!.classList.add('active');
  $('hand-container').style.display      = tab === 'hand'      ? 'flex' : 'none';
  $('shop-container').style.display      = tab === 'shop'      ? 'flex' : 'none';
  $('field-list').style.display          = tab === 'field'     ? 'flex' : 'none';
  $('inventory-panel').style.display     = tab === 'inventory' ? 'block' : 'none';
  renderCurrentTab();
}

function renderCurrentTab() {
  if (currentTab === 'hand')      renderHand();
  if (currentTab === 'shop')      renderShop();
  if (currentTab === 'field')     renderField();
  if (currentTab === 'inventory') renderInventory();
}

// ── Render hand ───────────────────────────────────────────────────────────────

function renderHand() {
  const c = $('hand-container');
  c.innerHTML = '';
  if (!store.hand.length) {
    c.innerHTML = '<div style="color:#5a4a30;font-family:Silkscreen,monospace;font-size:11px;padding:36px 0;width:100%;text-align:center;">手牌为空 — 去商店购买卡牌</div>';
    return;
  }
  for (const inst of store.hand) {
    const def = CARD_DB.find(d => d.id === inst.definitionId)!;
    const el  = makeCardEl(def, inst);
    el.onclick = e => { e.stopPropagation(); openActionMenu(inst, def, el); };
    c.appendChild(el);
  }
}

// ── Render shop ───────────────────────────────────────────────────────────────

function renderShop() {
  const c = $('shop-container');
  c.innerHTML = '';

  const btn = document.createElement('button');
  btn.id    = 'shop-refresh-btn';
  btn.innerHTML = '🔄 刷新<br><span style="font-size:8px">(5💰)</span>';
  btn.onclick   = () => {
    const r = store.manualRefreshShop();
    if (!r.ok) notify(r.reason ?? '刷新失败', 'danger');
    else { renderShop(); updateHUD(); }
  };
  c.appendChild(btn);

  for (let i = 0; i < store.shopSlots.length; i++) {
    const slot = store.shopSlots[i];
    if (slot.sold) {
      const ph = document.createElement('div');
      ph.className = `card card-${slot.def.type}`;
      ph.style.cssText = 'opacity:0.2;cursor:default;';
      ph.innerHTML = `<div class="card-pixel-art" style="flex:1;display:flex;align-items:center;justify-content:center;font-family:Silkscreen,monospace;font-size:9px;color:#555">已售出</div>`;
      c.appendChild(ph);
    } else {
      const el = makeCardEl(slot.def);
      const slotIdx = i; // capture
      el.onclick = () => {
        const r = store.buyCard(slotIdx);
        if (!r.ok) notify(r.reason ?? '购买失败', 'danger');
        else { notify(`购买了 ${slot.def.name}`, 'success'); updateHUD(); renderShop(); }
      };
      c.appendChild(el);
    }
  }
}

// ── Render field ──────────────────────────────────────────────────────────────

function renderField() {
  const c = $('field-list');
  c.innerHTML = '';
  if (!store.field.length) {
    c.innerHTML = '<div style="color:#5a4a30;font-family:Silkscreen,monospace;font-size:11px;padding:36px 0;width:100%;text-align:center;">场上没有牌</div>';
    return;
  }
  for (const inst of store.field) {
    const def = CARD_DB.find(d => d.id === inst.definitionId)!;
    const el  = makeCardEl(def, inst);
    el.onclick = e => { e.stopPropagation(); openActionMenu(inst, def, el); };
    c.appendChild(el);
  }
}

// ── Render inventory ──────────────────────────────────────────────────────────

function renderInventory() {
  const panel = $('inventory-panel');
  panel.innerHTML = '';

  // Section: loot
  const lootStacks = store.inventory.filter(s => s.kind === 'loot');
  const prodStacks = store.inventory.filter(s => s.kind === 'product');

  const lootHdr = document.createElement('div');
  lootHdr.style.cssText = 'font-family:Silkscreen,monospace;font-size:10px;color:#9a7a50;padding:4px 8px 2px;';
  lootHdr.textContent = '⚔ 战利品';
  panel.appendChild(lootHdr);

  if (!lootStacks.length) {
    const empty = document.createElement('div');
    empty.style.cssText = 'font-family:Silkscreen,monospace;font-size:9px;color:#444;padding:4px 8px;';
    empty.textContent = '暂无 — 击败怪物获取';
    panel.appendChild(empty);
  } else {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;padding:4px 8px;';
    for (const stack of lootStacks) {
      try {
        const loot = lootById(stack.itemId);
        const chip = document.createElement('div');
        chip.style.cssText = `
          background:#1a0e05;border:1px solid #5a3a1a;border-radius:3px;
          padding:4px 8px;display:flex;align-items:center;gap:4px;
          font-family:Silkscreen,monospace;font-size:10px;color:#f5e6c8;
        `;
        chip.innerHTML = `${loot.emoji} <span style="color:#9a7a50">${loot.name}</span>
          <span style="color:#f0c040;margin-left:4px">×${stack.qty}</span>`;
        row.appendChild(chip);
      } catch {}
    }
    panel.appendChild(row);
  }

  // Section: products
  const prodHdr = document.createElement('div');
  prodHdr.style.cssText = 'font-family:Silkscreen,monospace;font-size:10px;color:#9a7a50;padding:6px 8px 2px;';
  prodHdr.textContent = '🔨 商品（可出售）';
  panel.appendChild(prodHdr);

  if (!prodStacks.length) {
    const empty = document.createElement('div');
    empty.style.cssText = 'font-family:Silkscreen,monospace;font-size:9px;color:#444;padding:4px 8px;';
    empty.textContent = '暂无 — 安排制造岗位加工战利品';
    panel.appendChild(empty);
  } else {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;padding:4px 8px;';
    for (const stack of prodStacks) {
      try {
        const prod = productById(stack.itemId);
        const chip = document.createElement('div');
        chip.style.cssText = `
          background:#1a0e05;border:1px solid #3a5a1a;border-radius:3px;
          padding:4px 8px;display:flex;align-items:center;gap:4px;
          font-family:Silkscreen,monospace;font-size:10px;color:#f5e6c8;
        `;
        chip.innerHTML = `${prod.emoji} <span style="color:#9a7a50">${prod.name}</span>
          <span style="color:#f0c040;margin-left:4px">×${stack.qty}</span>
          <span style="color:#60cc60;margin-left:4px">${prod.sellPrice}💰</span>`;
        row.appendChild(chip);
      } catch {}
    }
    panel.appendChild(row);
  }

  // Recipes hint
  const recipeHdr = document.createElement('div');
  recipeHdr.style.cssText = 'font-family:Silkscreen,monospace;font-size:10px;color:#9a7a50;padding:6px 8px 2px;';
  recipeHdr.textContent = '📜 制造配方';
  panel.appendChild(recipeHdr);

  const recipeRow = document.createElement('div');
  recipeRow.style.cssText = 'padding:4px 8px;display:flex;flex-direction:column;gap:3px;';
  for (const recipe of RECIPE_DB) {
    try {
      const prod = productById(recipe.outputProductId);
      const inputs = recipe.inputs.map(inp => {
        const loot = lootById(inp.lootId);
        return `${loot.emoji}${loot.name}×${inp.qty}`;
      }).join(' + ');
      const have = recipe.inputs.every(inp => store.countItem(inp.lootId, 'loot') >= inp.qty);
      const r = document.createElement('div');
      r.style.cssText = `font-family:Silkscreen,monospace;font-size:9px;
        color:${have ? '#80cc80' : '#555'};`;
      r.textContent = `${inputs} → ${prod.emoji}${prod.name}（需工时${recipe.craftCost}）`;
      recipeRow.appendChild(r);
    } catch {}
  }
  panel.appendChild(recipeRow);
}

// ── HUD ───────────────────────────────────────────────────────────────────────

function updateHUD() {
  const m  = store.month;
  const yr = Math.ceil(m / 12), mo = ((m - 1) % 12) + 1;
  ($('stat-month')    as HTMLElement).textContent = `Y${yr}·M${mo}·W${store.week}`;
  ($('stat-gold')     as HTMLElement).textContent = `💰 ${store.gold}`;
  ($('stat-level')    as HTMLElement).textContent = `⭐ ${store.townLevel}`;
  ($('stat-progress') as HTMLElement).textContent = `${store.levelProgress}/10`;
  ($('stat-field')    as HTMLElement).textContent = `${store.field.length}/${store.fieldCapacity}`;
  ($('stat-tax')      as HTMLElement).textContent = `🏛 ${monthlyTax(store.townLevel)}/月`;

  const bar = document.getElementById('month-progress-bar');
  if (bar) bar.style.width = `${(store.tick / 160) * 100}%`;
}

// ── Init ──────────────────────────────────────────────────────────────────────

export function initUI() {
  // ── Save/load prompt ────────────────────────────────────────────────────────
  const hasSave = store.loadFromLocalStorage();
  if (hasSave) {
    store.addLog('📂 已载入上次存档', 'good');
    notify('已自动载入存档！', 'success');
  }

  // ── Tabs ────────────────────────────────────────────────────────────────────
  document.querySelectorAll('.card-tab').forEach(btn => {
    btn.addEventListener('click', () => setTab(btn.getAttribute('data-tab') as Tab));
  });

  // ── Action menu buttons ──────────────────────────────────────────────────────

  $('cam-play').addEventListener('click', () => {
    // FIX: copy refs before closing menu (closeMenu nulls them)
    const inst = _menuInst;
    const def  = _menuDef;
    if (!inst || !def) return;

    if (store.field.length >= store.fieldCapacity) {
      notify('场上已满！', 'danger');
      closeMenu();
      return;
    }

    const r = store.playCard(inst.instanceId);
    closeMenu(); // close AFTER capturing refs, BEFORE using field lookup

    if (r.ok) {
      notify(`打出了 ${def.name}`, 'success');
      // Now safely look up in field using the instanceId we captured
      if (def.type === CardType.Human || def.type === CardType.Monster) {
        const fieldInst = store.field.find(c => c.instanceId === inst.instanceId);
        if (fieldInst) openAssignModal(fieldInst, def);
      }
    } else {
      notify(r.reason ?? '失败', 'danger');
    }

    updateHUD();
    renderCurrentTab();
  });

  $('cam-assign').addEventListener('click', () => {
    const inst = _menuInst;
    const def  = _menuDef;
    if (!inst || !def) return;
    closeMenu();
    openAssignModal(inst, def);
  });

  $('cam-upgrade').addEventListener('click', () => {
    const inst = _menuInst;
    if (!inst) return;
    const r = store.upgradeCard(inst.definitionId);
    if (r.ok) notify('升级成功！属性+30%', 'success');
    else notify(r.reason ?? '失败', 'danger');
    closeMenu();
    updateHUD();
    renderCurrentTab();
  });

  $('cam-info').addEventListener('click', () => {
    const inst = _menuInst;
    const def  = _menuDef;
    if (!inst || !def) return;
    showModal(def.name, cardInfoHTML(def, inst));
    closeMenu();
  });

  document.addEventListener('click', e => {
    if (menuOpen && !(e.target as HTMLElement).closest('#card-action-menu')) closeMenu();
  });

  $('modal-close').addEventListener('click',  () => $('modal-overlay').classList.remove('open'));
  $('assign-cancel').addEventListener('click', () => $('assign-modal').classList.remove('open'));

  // ── Store subscription ───────────────────────────────────────────────────────
  store.subscribe(evt => {
    updateHUD();
    if (evt !== 'tick') renderCurrentTab();
  });

  // ── Initial render ───────────────────────────────────────────────────────────
  updateHUD();
  setTab(hasSave ? 'hand' : 'shop');

  if (!hasSave) {
    setTimeout(() => notify('城镇已建立！先去商店购买卡牌。', 'success'), 600);
  }
}
