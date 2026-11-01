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
  "suggested_questions": ["自然的开场问题一？", "自然的开场问题二？", "自然的开场问题三？"],
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

## 固定开场问题

每份 metadata 必须包含 `suggested_questions`：恰好 3 条互不相同的非空字符串，每条最多 300 字符。A/B 两组使用同一份问题，不向模型预先注入；点击只填入输入框，用户可编辑后发送。发送时记录 `inputSource`（suggested/custom），点击本身不计轮次。

可选字段 `birthplace`、`personality`、`education` 支持显示出生地、原始人格描述及教育信息。出生地不应自动映射为现居城市。原始资料与 ID 映射说明保留在本地私有目录，不提交公开仓库。

## 中英双语

`translations` 可包含完整的 `zh` / `en` 展示对象（字段与顶层 metadata 相同，但不含 `id` 或嵌套 translations）。两种语言各提供 3 个 `suggested_questions`，编号和语义一一对应。服务器只返回白名单展示字段，skill 不包含在翻译数据中。原始 skill 不翻译或改写。

界面语言会随每条研究事件保存为 `uiLanguage`。切换语言不会翻译已发送的消息，也不会改变已有评分。实际聊天回复沿用用户提问语言。

## 原始 metadata（当前真实资料使用此格式）

用户提供的 `metadata.json` 与 skill 原文是唯一资料来源，不做摘要、改写、字段删减或自动纠错。仅执行用户明确指定的修改（目前只有 p03 改名）。`skill.md` 保留原始 `SKILL.md` 的完整内容。

每个人格目录另放 `questions.json`：`{"zh":["问题1","问题2","问题3"],"en":["Question 1","Question 2","Question 3"]}`。问题属于辅助交互，不写入 metadata 或 skill。

原始 metadata 字段为 `persona`, `name`, `age`, `gender`, `race`, `born place`, `general experience`, `personality`, `occupation`, `education`, `big_five`, `language_style`, `character`。前端根据这些字段展示全文，保留换行；不从出生地推断现居地，不从 skill 生成展示资料。界面标签支持中英文，资料内容使用原文，直到用户提供或确认忠实翻译。其他未声明字段不自动公开。

前述简化 schema 仅用于仓库中的虚构示例，真实资料无需转换到该 schema。上传脚本同时支持两种格式。上传原始资料时需同时上传独立的 `questions.json`，已整理的 `private-personas-ready.zip` 包含此文件。
