# Persona Human Judge

五个人格的人类一致性评估：每个人格先与 **A（without skill）** 对话并评分，再与 **B（with skill）** 对话并评分。参与者只看到 A/B；两组使用同一个服务端模型配置、各自独立的对话历史。每段可提前结束，评分必填，上传确认后才进入下一段。

本仓库是唯一维护源。前端部署到 GitHub Pages，后端部署到自己的 Cloudflare Worker，结构化记录保存在 D1，persona 文件保存在私有 R2。原 Sites 原型独立保留作历史参考，不参与本仓库部署。

- [部署与配置指南](docs/DEPLOYMENT.md)
- [Persona 文件格式与交付方式](docs/PERSONAS.md)
- [数据与隐私边界](docs/DATA.md)

## 目录

```
web/                 GitHub Pages 前端
server/              OpenAI、对话、评分、鉴权 API
migrations/          D1 数据库增量迁移
scripts/             部署配置、Secrets 同步、persona 校验上传
examples/personas/   完全虚构的格式示例，可公开
.github/workflows/   前后端自动部署
```

## 当前运行状态

没有后端地址时，网页显示“后端尚未部署”，禁用开始对话；不会伪造模型回复或上传成功。前端仍可预览桌面/手机版人物资料。后端接好后需要研究访问口令，随后读取私有存储中允许向参与者展示的 metadata。

模型、推理强度和轮次配置从服务端 Secrets 读取；仓库和浏览器包不包含实际值。轮次上限会在用户界面展示，因此不是对参与者保密的信息。已发送消息、模型回复、评分与时间保存在服务端。API 密钥不经过浏览器。

## 本地开发

Node.js 22.13+。运行 `npm ci`、`npm run check`、`npm test`。

将所需服务端变量放在被忽略的 `.dev.vars`（参照 `.env.example`，不要提交）。

```sh
npx wrangler d1 migrations apply DB --local --config wrangler.local.jsonc
npm run dev
```

前端另开终端：

```sh
API_BASE_URL=http://127.0.0.1:8787 npm run build:web
python3 -m http.server 8080 --directory site
```

浏览器使用 `http://localhost:8080`，与本地允许的 Origin 一致。生产 persona 上传脚本使用 `--remote`，不会被本地开发命令自动执行。
