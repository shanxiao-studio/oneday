# oneday

一个只处理今日 TODO 的网页版待办应用。待办支持标签，未完成的昨日任务会在再次打开应用时自动进入收件箱，并可在当前视图内按标签筛选查看。

## Tech Stack

- Vite
- TypeScript
- React
- Tailwind CSS
- shadcn/ui style components

## Scripts

```bash
npm install
npm run dev
npm test
npm run build
```

## PR Preview

仓库通过 GitHub Pages 提供正式站点和 PR preview：

- `main` 分支推送会把 `dist/` 发布到 `gh-pages`
- PR 打开、更新和重新打开时，会把预览发布到 `gh-pages/pr-preview/pr-<number>/`
- PR 关闭时会自动清理对应预览

仓库需要打开以下 GitHub 设置：

- 仓库方案本身需要支持 GitHub Pages
- `Settings > Pages` 选择 `Deploy from a branch`
- 部署分支设为 `gh-pages`，目录设为 `/ (root)`
- `Settings > Actions > General > Workflow permissions` 设为 `Read and write permissions`
- 如果组织策略强制 `GITHUB_TOKEN` 只读，则需额外配置 `PREVIEW_TOKEN` secret，值为具备仓库写权限的 PAT
