# oneday

一个只处理今日 TODO 的 Electron 桌面待办应用。待办支持标签，未完成的昨日任务会在再次打开应用时自动进入收件箱，并可在当前视图内按标签筛选查看。

## Tech Stack

- Vite
- TypeScript
- React
- Electron
- Tailwind CSS
- shadcn/ui style components

## Scripts

```bash
npm install
npm run dev
npm test
npm run build
npm run preview
```

## Run Modes

- `npm run dev`: 启动 Vite renderer 并拉起 Electron 桌面应用
- `npm run build`: 构建 renderer 资源与 Electron 主进程代码
- `npm run preview`: 运行最新构建产物对应的桌面应用
