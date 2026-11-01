# 数据流与私密边界

- 浏览器 → Worker：研究访问口令（仅登录时）、参与者消息、评分和可选理由。
- Worker → OpenAI：当前组的历史消息；只有 B 组附加该 persona 的 skill。API key 仅在服务端请求头中使用。
- Worker → D1：会话归属、消息事件、评分、模型回复、模型配置、skill 哈希、响应 ID、usage 和时间。
- 私有 R2 → Worker：人格资料与 skill；前端只收到白名单 metadata，不提供 skill 下载接口。
- GitHub → Pages：只有 `web/` 构建产物及公开 API 地址；不上传 server、数据库、persona 私有文件或 Secrets。

参与者通过研究口令获取有时效的签名访问 token。token 保存在当前浏览器；服务器由 token 决定数据归属，忽略用户伪造的身份头。跨域访问仅允许指定前端 Origin，登录端有 Cloudflare 限流。共享研究口令是研究准入，不是防止口令持有人重复参加的实名系统。

模型设置只在后端读取；参与者导出不包含模型参数或 skill。轮次上限因参与者需要知道剩余轮数，会显示在 UI 中。研究负责人可在 D1 读取完整记录。

前端在网络失败时保留未上传事件，并阻止未确认保存的评分进入下一段；已成功持久化的模型回复重试不会再次生成。关闭页面前仍未上传的记录只能依赖同一浏览器中的本地备份恢复，不能保证用户清理浏览器后的恢复。

工作流 Secrets 仅用于受信任的 main 分支和手动部署，不在 pull_request 事件中执行。不要在不可信第三方代码的工作流中提供 Secrets。

## Research dashboard

Open `https://yonglixiang.github.io/Persona-Human-Judge/admin.html` and sign in with the separate `ADMIN_ACCESS_CODE`. Set this repository Actions Secret and rerun the backend workflow to sync it to the Worker. There is no minimum passcode length; it must be nonempty and different from the participant passcode. Admin authentication expires after one hour and is kept only in the tab's session storage. Participant tokens cannot read dashboard APIs; admin tokens cannot act as participants.

The dashboard reads existing D1 records (no migration or data copying). Only `mode=study` records count. Participants are distinct anonymous login identities with at least one uploaded event, not unique real people or page views. Repeat sign-ins/browsers may create new identities. Multiple study sessions under one identity are shown separately. Scores are the latest submitted rating per session/persona/condition. Means weight these session-level ratings equally, include partial sessions, show n, and exclude missing scores. A complete session has 10 distinct ratings; complete participants have at least one complete session. Rating details show the original note, turn count and server receipt time. Search accepts anonymous participant or session IDs, with 25 sessions per page. Refresh updates results on demand.

## Formal evaluation and personal ratings

Formal evaluation starts at `2026-11-01T09:29:38.000Z` (2026-11-01 17:29:38 Asia/Shanghai). The client uses `paired-formal-20261101`; the backend rejects previous client queues and pre-boundary timestamps. On refresh, clients remove the previous v4 test progress and use a new local storage namespace. Historical D1 cleanup is a one-time operator action, never a deployment migration.

Participants use `my-scores.html` via “我的评分 / My ratings”. `/api/my-ratings` returns only server-confirmed ratings for the authenticated owner, across their study sessions. It never accepts another owner ID from query parameters. Anonymous identities cannot be recovered across a new login or browser. Drafts and pending uploads are not shown as submitted.

The dashboard's overall with/without means are macro-averages: first compute each persona's session-level mean within the group, then average the nonempty persona means with equal weights. Report coverage (personas out of five) and rating count; empty groups remain null, never zero. Individual persona statistics remain available below the macro-average.

Formal dashboards and personal history include only the formal protocol. Older-client events received during the deployment transition remain outside the formal statistics, even if received after the cutoff.

## Participant nicknames

After access-code login, participants supply a nickname before starting or resuming evaluation. `participant_profiles` links the nickname to the authenticated owner ID; no nickname is sent to the model. Nicknames are shown in admin session rows/details and can be searched. Duplicate nicknames do not merge identities or ratings. Existing records without a profile display “No nickname” until that identity supplies one. Names are self-reported, not verified identities. A profile alone is not counted as study participation until an event is uploaded. Profiles are kept across sessions for the same login identity.
