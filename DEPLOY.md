# 部署手册

## 项目信息

| 项目 | 内容 |
|---|---|
| 游戏名称 | 镇主传说 · Town Legend |
| 技术栈 | Phaser 3 + TypeScript + Vite |
| 构建目标 | 单文件 HTML（可离线运行） |

---

## 环境要求

- [Node.js](https://nodejs.org/) v18 及以上

---

## 首次使用

克隆或解压项目后，在项目根目录执行一次依赖安装：

```powershell
npm install
```

---

## 打包

```powershell
npm run build
```

输出文件：`dist/index.html`（约 1.5 MB，包含所有代码）

双击该文件即可在浏览器中直接运行，无需服务器，无需其他附属文件。

> 若 `npm run build` 无响应，使用以下命令替代：
> ```powershell
> node node_modules/vite/bin/vite.js build
> ```

---

## 开发模式

```powershell
npm run dev
```

启动本地热更新开发服务器，默认地址：`http://localhost:5173`

---

## 已做的修改

### 1. 安装 `vite-plugin-singlefile`

```powershell
npm install --save-dev vite-plugin-singlefile
```

作用：将构建产物（JS/CSS）全部内联进 `index.html`，使其成为单个独立文件。

### 2. 修改 `vite.config.ts`

在原有配置基础上引入并注册插件：

```typescript
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    target: 'esnext',
  },
});
```

---

## 注意事项

- **字体需要联网**：`index.html` 通过 Google Fonts CDN 加载字体。离线时字体回退为系统默认字体，游戏功能不受影响。
- **文件体积**：单文件较大（约 1.5 MB），主要来自 Phaser 3 本身，属正常现象。
- **存档**：游戏存档保存在浏览器 `localStorage`，清除浏览器数据会导致存档丢失。
