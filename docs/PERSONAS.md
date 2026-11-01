# 给我已打包的 persona 文件夹

最方便的方式：在聊天里直接上传 ZIP，或提供电脑上 ZIP/文件夹的绝对路径。如果现有结构不同，无需先整理，我可以先检查并转换。

不要将真实原始资料直接提交到此公开仓库。先放在本地 `private-personas/`，该目录和 ZIP 都已被 Git 忽略。仓库内 `examples/personas/` 仅包含虚构示例。

## 标准目录

```
private-personas/
  manifest.json
  p01/
    metadata.json
    skill.md
  p02/
    metadata.json
    skill.md
  p03/ ...
  p04/ ...
  p05/ ...
```

manifest.json：

```json
{"ids":["p01","p02","p03","p04","p05"]}
```

metadata.json 示例：

```json
{
  "id": "p01",
  "name": "人物显示名",
  "en": "可选英文名（没有则空字符串）",
  "age": "29 岁",
  "role": "职业或身份",
  "city": "城市或地区",
  "tags": ["性格特点一", "性格特点二"],
  "bio": "基础经历",
  "values": "价值观",
  "interests": "兴趣与日常",
  "voice": "表达习惯",
  "quote": "代表性表达（没有则空字符串）"
}
```

所有字段均需要提供；没有内容的文本字段可用空字符串。`metadata.json` 是参与者可见的 ground truth，请仅放你希望他们看到的内容。邮箱、电话、详细住址、身份证明和未经批准的其他隐私字段不会自动映射到前端。

`skill.md` 使用你现有的 Markdown persona 指令即可。它仅由服务端在 B 组加载；A 组不会注入这份文件。它不是可执行脚本，不需要包含 API key。

## 校验与上传

```sh
node scripts/upload-personas.mjs /absolute/path/to/personas --check
```

配置 Cloudflare 登录/环境后：

```sh
npx wrangler login
PERSONAS_BUCKET=persona-human-judge-personas node scripts/upload-personas.mjs /absolute/path/to/personas
```

上传目标是私有 R2，不是 GitHub Pages。上传脚本只接受五组 metadata.json/skill.md，校验字段并拒绝疑似 API key。只在明确准备上传时执行不带 `--check` 的命令。

修改 metadata 或 skill 无需把它们提交 GitHub。请在开始新一批评估前统一更新，避免同一轮研究中资料版本变化。
