# 一次配置，之后 GitHub 自动部署

## 1. GitHub Pages

仓库 Settings → Pages → Source 选择 **GitHub Actions**。推送 main 后，`Deploy frontend to GitHub Pages` 会校验、构建并发布。

网址：`https://yonglixiang.github.io/Persona-Human-Judge/`

GitHub Pages 只运行静态网页，不能安全存储 API key、调用付费 API 或写数据库，所以需要以下后端。前端在后端未配置时会显示明确的配置提示。

## 2. 创建 Cloudflare 资源

1. 注册/登录 [Cloudflare](https://dash.cloudflare.com/)。
2. 在 Workers & Pages 完成 Workers 子域名初始化，并记录 **Account ID**。
3. 在 Storage & databases → D1 创建数据库 `persona-human-judge`，记录 **Database ID**。
4. 在 R2 创建桶 `persona-human-judge-personas`。**保持私有，不启用 Public access / r2.dev 公共访问。** 账户可能需要先开通 R2。
5. My Profile → API Tokens 创建自定义 token，资源限定为你的账户。部署所需权限：Workers Scripts Edit、D1 Edit、Workers R2 Storage Edit；按 Cloudflare 当时的权限名称选择。仅用于这个项目，复制后保存为下方的 GitHub Secret。

这里只需要 Worker/D1/R2，不必将现有域名 DNS 转到 Cloudflare，也不需要购买域名。

## 3. GitHub Secrets（私密）

进入仓库 **Settings → Secrets and variables → Actions → Secrets**，逐项填写：

| Secret | 用途 |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | 部署 Worker、D1 迁移和私有 R2 访问 |
| `OPENAI_API_KEY` | OpenAI 项目的 API key，需有目标模型权限/额度 |
| `OPENAI_MODEL` | 目标模型的准确 API ID |
| `REASONING_EFFORT` | reasoning effort |
| `MAX_TURNS` | 每组最大完整问答轮次，1–20 |
| `MAX_OUTPUT_TOKENS` | 每次最大生成 token，256–16384，含模型推理消耗 |
| `SESSION_SECRET` | 随机生成的至少 32 字符签名密钥 |
| `STUDY_ACCESS_CODE` | 参与者进入研究时输入的口令，建议随机长口令 |

项目初始模型/轮次参数可由维护者预先写入 Secrets，无需把实际值写到源码里。`SESSION_SECRET` 可在自己的终端通过 `openssl rand -hex 32` 生成；不要把输出提交 Git。

GitHub Secrets 加密保存，工作流将值通过 stdin 上传到 Cloudflare Workers Secrets。脚本不输出值、不将其写入构建产物。公开仓库的工作流日志可见，因此不要自行添加 `echo`、`printenv` 或调试请求头。

## 4. GitHub Variables（非私密）

在同页面 **Variables** 设置：

| Variable | 值 |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | 第 2 步的 Account ID |
| `CLOUDFLARE_D1_DATABASE_ID` | 第 2 步的 Database ID |
| `WORKER_NAME` | `persona-human-judge-api` |
| `PERSONAS_BUCKET` | `persona-human-judge-personas` |
| `ALLOWED_ORIGIN` | `https://yonglixiang.github.io`（不含项目路径） |
| `BACKEND_ENABLED` | 完成 Secrets 后设为 `true` |
| `API_BASE_URL` | 部署成功后填写 Worker 的 HTTPS 地址，不带末尾 `/` |

模型/轮次参数不要填写到 Variables，它们已按你的偏好作为 Secrets 管理。

## 5. 首次上线

1. 完成以上配置，在 Actions 手动运行 **Deploy backend to Cloudflare**。
2. 工作流校验代码、应用 D1 增量迁移、部署 Worker、同步 Secrets。等整个工作流成功后再开始评估。
3. 查看 Cloudflare 中该 Worker 的 `workers.dev` 地址，写入 GitHub Variable `API_BASE_URL`。
4. 上传五个人格资料，详见 [PERSONAS.md](PERSONAS.md)。
5. 手动运行 **Deploy frontend to GitHub Pages**。打开页面，输入研究口令，确认可以聊天和评分。

以后推送 main 自动部署。只修改 GitHub Secrets/Variables 不会触发 push：修改服务端设置后手动运行 backend；修改 API_BASE_URL 后手动运行 frontend。

模型/轮次设置应在新一批评估开始前修改。进行中的评估应保持配置不变，以保证两组可比。轮次上限对参与者可见；API model ID 和密钥不由客户端读取。

## 6. 数据和访问

GitHub Pages 网站本身是公开的，但需要研究口令才能访问后端和人格资料。口令不会授予 OpenAI key，也不能读取他人的记录。研究数据不提交 GitHub，保存在你的 Cloudflare D1 中。

在 Cloudflare D1 控制台可查询 `study_sessions`、`study_events`、`model_turns`。完整研究数据导出应由维护者从 D1 完成，参与者导出仅限自己的会话。不要将导出文件上传到这个公开仓库。

注意：原 Sites 原型数据库不会自动迁移到新的 Cloudflare 账户；两个部署是独立数据集。需要迁移旧测试数据时单独处理。

## 官方参考

- [GitHub Pages 静态托管](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [Cloudflare GitHub Actions 部署](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)
- [Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)

## 研究者看板

GitHub Actions Secrets 中新增 `ADMIN_ACCESS_CODE`（独立于 `STUDY_ACCESS_CODE`，不限制字符长度），重新运行后端部署。访问 `https://yonglixiang.github.io/Persona-Human-Judge/admin.html`，输入管理员口令查看参与身份数、每个人格两组平均分与样本数、每个匿名参与者的会话评分明细。管理员口令不写入前端或仓库，参与者口令无法访问看板数据。已有历史评分自动纳入统计，无需重新上传。
