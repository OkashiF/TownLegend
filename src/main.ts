import Phaser from 'phaser';
import { TownScene } from './scenes/TownScene';
import { initUI } from './ui/UIController';
import { store } from './systems/store';

// ── World dimensions ───────────────────────────────────────────────────────────
export const WORLD_HEIGHT = 600;    // will be overridden at runtime by scene height

function getGameHeight(): number {
  const panel  = document.getElementById('card-panel');
  const topBar = document.getElementById('top-bar');
  const panelH = panel  ? panel.offsetHeight  : 170;
  const topH   = topBar ? topBar.offsetHeight  : 40;
  return window.innerHeight - panelH - topH;
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width:  window.innerWidth,
  height: getGameHeight(),
  backgroundColor: '#0a0604',
  parent: 'game-container',
  pixelArt: true,
  antialias: false,
  scene: [TownScene],
  scale: {
    mode: Phaser.Scale.NONE,
  },
};

document.addEventListener('DOMContentLoaded', () => {
  initUI();

  const game = new Phaser.Game(config);

  function syncLayout() {
    const topBar = document.getElementById('top-bar');
    const topH   = topBar ? topBar.offsetHeight : 40;
    const panel  = document.getElementById('card-panel');
    const panelH = panel  ? panel.offsetHeight  : 170;
    const W      = window.innerWidth;
    const H      = window.innerHeight - panelH - topH;

    game.scale.resize(W, H);

    const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
    if (canvas) {
      canvas.style.position = 'absolute';
      canvas.style.top      = `${topH}px`;
      canvas.style.left     = '0';
      canvas.style.width    = `${W}px`;
      canvas.style.height   = `${H}px`;
    }

    const sideLog = document.getElementById('side-log');
    if (sideLog) {
      sideLog.style.top    = `${topH}px`;
      sideLog.style.bottom = `${panelH}px`;
    }
  }

  requestAnimationFrame(() => { syncLayout(); });
  window.addEventListener('resize', syncLayout);

  (window as any).cheat = {
    addGold: (n: number): void => { store.gold += n; store.emit('tick'); },
  };
});
