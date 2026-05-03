---
tracker:
  kind: linear
  api_key: $LINEAR_API_KEY
  project_slug: oneday-372ff07c565b
  todo_state: Todo
  running_state: In Progress
  review_state: In Review
  closed_states: [Done, Canceled, Duplicate]

workspace:
  root: ./workspace

backend:
  kind: codex

polling:
  interval_ms: 30000

agent:
  max_concurrent_agents: 1
  max_turns: 5
  max_retry_backoff_ms: 300000

codex:
  command: codex app-server
  turn_timeout_ms: 3600000
  stall_timeout_ms: 300000

pi:
  command: pi --mode rpc --no-session
  provider: deepseek
  model: deepseek-v4-flash
  read_timeout_ms: 5000
  turn_timeout_ms: 3600000
  stall_timeout_ms: 300000

server:
  port: 3030

hooks:
  after_create: |
    git clone https://github.com/shanxiao-studio/oneday.git .
    ISSUE_KEY="$(basename "$PWD")"
    git checkout -b "${ISSUE_KEY}"
  before_run: |
    git fetch origin
    git status
---
你正在处理 Linear issue：

- ID: {{ issue.identifier }}
- 标题: {{ issue.title }}
- 状态: {{ issue.state }}
- URL: {{ issue.url }}

描述：
{{ issue.description }}

请在当前 GitHub repo 工作区完成任务。

要求：
0. 在当前分支完成代码修改，确保测试通过，可正常运行
1. 提交 commit 并推送分支到 Github
2. 创建待 Review 的 Pull Request，PR 标题需包含 {{ issue.identifier }}
3. 必要时可在 PR 详情中使用 chrome-devtools 截图或录制视频以帮助用户审核
