<div align="center">

**Đọc bằng:** [English](README.md) · **Tiếng Việt**

# Minimal Vibe Coding Kit

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.2.0-2ea44f.svg)](CHANGELOG.md)
![Claude](https://img.shields.io/badge/Claude%20Code-Commands%20%26%20Skills-111111)
![Cursor](https://img.shields.io/badge/Cursor-Rules%20%26%20Commands-1f6feb)
![Codex](https://img.shields.io/badge/Codex-AGENTS.md%20%26%20Plugin-6f42c1)
![AgentShield](https://img.shields.io/badge/Security-AgentShield-d62828)
![Node](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)

**Một bộ kit AI-coding gọn nhẹ cho Claude Code, Cursor và Codex — chạy được trên mọi repo, mọi ngôn ngữ.**

Cài đặt, để agent tự dò stack, duyệt diff đề xuất, rồi bắt đầu code.

</div>

---

## Mục lục

- [Có gì mới ở 0.2.0](#có-gì-mới-ở-020)
- [Bộ kit này là gì](#bộ-kit-này-là-gì)
- [Bắt đầu nhanh](#bắt-đầu-nhanh)
- [Prompt đầu tiên](#prompt-đầu-tiên)
- [Profile cài đặt](#profile-cài-đặt)
- [Cấu trúc repo](#cấu-trúc-repo)
- [Workflow theo từng tool](#workflow-theo-từng-tool)
- [Tham chiếu Commands & Skills](#tham-chiếu-commands--skills)
- [Vòng lặp Autoresearch](#vòng-lặp-autoresearch)
- [AgentShield - rà soát bảo mật](#agentshield---rà-soát-bảo-mật)
- [Cải tiến hằng ngày](#cải-tiến-hằng-ngày)
- [Validate trước khi release](#validate-trước-khi-release)
- [Mục tiêu thiết kế](#mục-tiêu-thiết-kế)
- [Khắc phục sự cố](#khắc-phục-sự-cố)
- [Đóng góp](#đóng-góp)
- [Giấy phép](#giấy-phép)

> 🇺🇸 Want to read in English? See [README.md](README.md).

---

## Có gì mới ở 0.2.0

| Mảng | Thay đổi |
| --- | --- |
| Trình cài đặt | CLI một lệnh: `mvck install <project>` (kèm `install.sh` / `install.ps1`). |
| Hỗ trợ Codex | Thêm các bề mặt `.agents/`, `.codex/`, và `.codex-plugin/plugin.json`. |
| Hướng dẫn chung | File `AGENTS.md` mới được `CLAUDE.md` import để tránh trùng lặp. |
| Backbone | `backbone.yml` template gọn + helper tự dò cấu hình. |
| Skills | Thêm `vibekit-init`, `agentshield-security-review`, `daily-workflow-curator`. |
| Bảo mật | Probe AgentShield chỉ đọc + tích hợp scanner. |
| Vòng lặp daily | `daily-enhance` chỉ đề xuất - không tự viết đè rules. |
| Validation | `validate-kit.mjs` + GitHub Actions workflow. |

Chi tiết đầy đủ trong [CHANGELOG.md](CHANGELOG.md).

## Bộ kit này là gì

Một bộ kit gọn nhẹ, không phụ thuộc dự án, gồm **rules**, **skills**, **commands** dùng chung, cộng với một **backbone manifest** giúp các AI coding assistant hiểu mọi project theo cùng một cách.

Triết lý là tối giản:

- Không framework nặng, không ép cấu trúc.
- `CLAUDE.md` / `AGENTS.md` hiện có **không bao giờ bị ghi đè** - kit chỉ thêm managed block.
- Ba file template làm phần lớn việc:
  - [backbone.yml](backbone.yml) - nguồn sự thật duy nhất về cấu trúc, đường dẫn, quy ước.
  - [CLAUDE-template.md](CLAUDE-template.md) - khung `CLAUDE.md` ngắn, import `AGENTS.md`.
  - [FIRST_TIME_INIT.md](FIRST_TIME_INIT.md) - runbook khởi tạo với guardrails.

Luồng hoạt động:

1. Cài kit vào project. `backbone.yml` mặc định có `meta.template_status: uninitialized` và các giá trị `<<PLACEHOLDER>>`.
2. Dán [prompt đầu tiên](#prompt-đầu-tiên) vào Claude Code, Cursor, hoặc Codex.
3. Agent quét fingerprint stack và các quy ước hiện có, rồi **đề xuất một diff thống nhất**.
4. Bạn review backbone và project rules được suy ra (`yes` / `edit` / `abort`). Agent chỉ ghi sau khi được duyệt và đổi status sang `initialized`.
5. Mọi phiên sau đó đọc `backbone.yml` đã điền và bỏ qua bước init.

Phù hợp với single-repo, monorepo và multi-repo. Không ghi đè ngầm. Không có code đặc thù dự án trong kit gốc.

Trong lần init đầu tiên, proposal cũng ghi lại rules riêng của repo trong `backbone.yml` dưới mục `conventions`: naming style, kiến trúc thư mục, cách truy cập asset/resource dùng chung, localization/message accessor, generated definitions, và khác biệt theo app/package khi evidence không giống nhau.

## Bắt đầu nhanh

### 1. Cài kit vào project bất kỳ

Từ thư mục kit này:

```bash
./install.sh /path/to/your-project
```

PowerShell trên Windows:

```powershell
./install.ps1 -Target C:\path\to\your-project
```

Hoặc dùng trực tiếp Node CLI:

```bash
node scripts/mvck.mjs install /path/to/your-project --profile all
```

Sau khi repo này được publish lên GitHub, người dùng cuối cài từ bất cứ đâu bằng:

```bash
npx github:giang6283623/minimal-vibe-coding-kit install /path/to/your-project
```

### 2. Khởi tạo backbone

```bash
cd /path/to/your-project
node scripts/init-backbone.mjs . --propose      # xem trước đề xuất
node scripts/init-backbone.mjs . --write --yes  # ghi sau khi bạn đã review backbone + rules
```

### 3. Validate

```bash
npm test
npm run security:probe
node scripts/mvck.mjs doctor .
```

### 4. Mở project và dán [prompt đầu tiên](#prompt-đầu-tiên).

## Prompt đầu tiên

Dán đoạn này vào Claude Code, Cursor, hoặc Codex sau khi cài kit:

```text
Read FIRST_TIME_INIT.md and initialize this repo with Minimal Vibe Coding Kit.
First print the requirements you will check. Then run detection, propose one diff
for backbone.yml and managed instruction blocks, and wait for my yes before writing.
Include inferred project conventions for naming, architecture, resources,
localization, generated definitions, and per-app/package differences.
After approval, write the files, run validation, and summarize what changed.
```

Các biến thể prompt riêng cho từng tool có trong [FIRST_PROMPT.md](FIRST_PROMPT.md).

## Profile cài đặt

Cài tất cả (mặc định):

```bash
node scripts/mvck.mjs install . --profile all
```

Chỉ cài phần bạn dùng:

```bash
node scripts/mvck.mjs install . --profile claude          # chỉ Claude Code
node scripts/mvck.mjs install . --profile claude,cursor   # Claude + Cursor
node scripts/mvck.mjs install . --profile codex           # Codex (và bất kỳ agent dùng AGENTS.md)
```

Cờ hữu ích: `--force` (ghi đè file đã tồn tại), `--dry-run` (xem trước, không ghi).

## Cấu trúc repo

```text
.
├── backbone.yml                  ← bản đồ project + cấu hình workflow (template)
├── AGENTS.md                     ← hướng dẫn chung cho Claude, Cursor, Codex
├── CLAUDE-template.md            ← starter Claude ngắn gọn (import AGENTS.md)
├── FIRST_PROMPT.md               ← prompt copy/paste cho từng tool
├── FIRST_TIME_INIT.md            ← runbook khởi tạo an toàn kèm guardrails
│
├── .claude/                      ← bề mặt Claude Code
│   ├── agents/                   (10 role agent: code-reviewer, debug-fixer, …)
│   ├── commands/                 (/init-vibe, /security-scan, /daily-enhance, /autoresearch-coding, /council)
│   ├── rules/                    (vibe-core, security, autoresearch, tooling)
│   ├── skills/                   (bản sao của shared skills)
│   └── settings.json
│
├── .cursor/                      ← bề mặt Cursor (rules/, commands/)
├── .agents/skills/               ← skills cho Codex / portable
├── .codex/                       ← config mẫu cho Codex
├── .codex-plugin/plugin.json     ← manifest plugin Codex
│
├── skills/                       ← shared skills (canonical)
│   ├── vibekit-init/
│   ├── autoresearch-coding/
│   ├── agentshield-security-review/
│   └── daily-workflow-curator/
├── commands/                     ← prompt command dùng chung
│
├── scripts/                      ← CLI mvck, init-backbone, daily-enhance, validate-kit
├── bin/                          ← entrypoint npm bin (mvck, vibe-kit)
├── docs/                         ← tài liệu sâu hơn (giữ ngoài root)
└── .github/workflows/            ← workflow validation cho repo
```

## Workflow theo từng tool

### Claude Code

Claude đọc `CLAUDE.md`, `AGENTS.md`, `.claude/rules`, `.claude/commands`, `.claude/agents`, và `.claude/skills`.

Các slash command hữu ích:

```text
/init-vibe              khởi tạo hoặc sửa setup của kit
/security-scan          AgentShield probe + scan
/daily-enhance          sinh báo cáo cải tiến chỉ đề xuất
/autoresearch-coding    chạy vòng lặp thử nghiệm có metric
/council                phối hợp nhiều agent chuyên biệt
```

`CLAUDE.md` sinh ra cố tình giữ ngắn và import nội dung chung qua `@AGENTS.md`.

### Cursor

Cursor nhận project rules từ:

```text
.cursor/rules/*.mdc      001-vibe-core, 010-init, 020-security-agentshield, 030-autoresearch-loop
.cursor/commands/*.md    cùng 5 command như Claude
AGENTS.md
backbone.yml
```

Rules được tách theo chủ đề để context luôn nhỏ.

### Codex

Codex nhận hướng dẫn từ:

```text
AGENTS.md
.agents/skills/*/SKILL.md
.codex/config.example.toml
.codex-plugin/plugin.json
backbone.yml
```

Prompt khuyến nghị:

```text
Read AGENTS.md and FIRST_TIME_INIT.md. Use the vibekit-init skill if available.
Initialize backbone.yml, keep AGENTS.md concise, and wait for approval before writing.
```

## Tham chiếu Commands & Skills

### Commands

| Command | Skill phía sau | Dùng khi |
| --- | --- | --- |
| `/init-vibe` | `vibekit-init` | Init lần đầu hoặc sửa chữa. In requirements, đề xuất diff, chờ duyệt. |
| `/security-scan` | `agentshield-security-review` | Review bề mặt agent, hooks, MCP, skills, commands, installer. |
| `/daily-enhance` | `daily-workflow-curator` | Đề xuất cải tiến rules, skills, workflows, `backbone.yml`. Chỉ propose. |
| `/autoresearch-coding` | `autoresearch-coding` | Cải tiến repo qua các thử nghiệm có thể đo, kèm baseline + budget. |
| `/council` | (đa agent) | Phối hợp research-coordinator, security-reviewer, code-reviewer, results-analyst. |

### Skills (`skills/` là canonical; `.claude/skills`, `.agents/skills`, và `.cursor/skills` mirror lại)

| Skill | Mục đích |
| --- | --- |
| [`vibekit-init`](skills/vibekit-init/SKILL.md) | Init lần đầu: dò stack, đề xuất diff, chờ `yes`, rồi mới ghi. |
| [`autoresearch-coding`](skills/autoresearch-coding/SKILL.md) | Vòng lặp nghiên cứu theo metric, có baseline, experiment và log kết quả. |
| [`agentshield-security-review`](skills/agentshield-security-review/SKILL.md) | Probe chỉ đọc + scanner tùy chọn cho bảo mật bề mặt agent. |
| [`daily-workflow-curator`](skills/daily-workflow-curator/SKILL.md) | Báo cáo daily + đề xuất diff. Không bao giờ ghi ngầm. |
| [`clearthought`](skills/clearthought/SKILL.md) | Lý luận có cấu trúc cho task mơ hồ, debug, thiết kế, và lập kế hoạch triển khai. |
| [`sequential-thinking`](skills/sequential-thinking/SKILL.md) | Chia nhỏ công việc phức tạp theo từng bước, có revision và branch. |
| [`reviewing-4p-priorities`](skills/reviewing-4p-priorities/SKILL.md) | Triage P0-P4 cho bug, review finding, rủi ro, và thứ tự fix. |

Ba skill reasoning này có kèm examples/references trong thư mục skill và chỉ load khi cần thêm chi tiết.

### Agents (`.claude/agents/`)

Role prompt sẵn sàng dùng: `code-reviewer`, `debug-fixer`, `hypothesis-planner`, `implementation-hacker`, `research-coordinator`, `results-analyst`, `test-runner`, `security-reviewer`, `context-architect`, `workflow-curator`.

## Vòng lặp Autoresearch

Dùng khi bạn muốn agent cải tiến repo qua các thử nghiệm đo được:

```text
Use the autoresearch-coding skill.
Goal: improve this repo for maintainability and coding-agent usefulness.
Metric command: node scripts/validate-kit.mjs .
Direction: higher.
Editable paths: README.md docs scripts skills commands .claude .cursor .agents
                .codex-plugin backbone.yml AGENTS.md CLAUDE-template.md
                FIRST_TIME_INIT.md package.json install.sh install.ps1.
Protected paths: .git .env* node_modules vendor secrets lockfiles.
Budget: 3.
```

Hợp đồng vòng lặp:

1. Chạy metric baseline.
2. Thực hiện một thử nghiệm nhỏ.
3. Chạy lại metric.
4. Chỉ giữ lại cải tiến hoặc đơn giản hóa an toàn.
5. Ghi log kết quả.
6. Lặp cho đến hết budget.

## AgentShield - rà soát bảo mật

Probe chỉ đọc, nhanh (chỉ cần Python):

```bash
node scripts/agentshield-probe.mjs .
```

Scanner đầy đủ (tùy chọn, khi có npm):

```bash
npx ecc-agentshield scan --path . --format text --min-severity medium
```

Nguyên tắc bảo mật:

- Không chạy hooks, MCP server, package lifecycle scripts, deploy scripts, migrations, hoặc lệnh phá hủy nào chỉ để kiểm tra một repo lạ.
- Không bao giờ in secrets đầy đủ.
- Mọi thay đổi tới `CLAUDE.md`, `AGENTS.md`, `.claude/**`, `.cursor/**`, `.agents/**`, `.codex-plugin/**`, `skills/**`, `commands/**`, hooks, hoặc MCP config đều phải kích hoạt review kiểu AgentShield.

## Cải tiến hằng ngày

Sinh báo cáo local:

```bash
node scripts/daily-enhance.mjs . --write-report
```

Prompt cho agent:

```text
Use the daily-workflow-curator skill. Run the daily report, AgentShield probe,
and kit validation. Propose improvements to rules, skills, workflows, and
backbone.yml. Do not write until I approve the diff.
```

Cải tiến hằng ngày mặc định **chỉ đề xuất**. Không tự commit hay viết đè rules.

## Validate trước khi release

```bash
npm run validate        # validate cấu trúc
npm run validate:all    # validate + AgentShield probe + package dry-run
```

Kết quả mong đợi: validation pass, AgentShield probe không báo lỗi cấu trúc nghiêm trọng, và `npm run pack:dry-run` liệt kê đúng các file trong package.

Checklist publish nằm trong [PUSH_TO_GITHUB.md](PUSH_TO_GITHUB.md).

## Mục tiêu thiết kế

- Dùng được với mọi ngôn ngữ và framework.
- Hỗ trợ project đang có sẵn mà không ghi đè hướng dẫn riêng của bạn.
- Giữ file root ngắn - thủ tục dài đẩy vào skills và `docs/`.
- Cải tiến AI workflow phải đo được qua autoresearch.
- Đưa security review bề mặt agent thành một phần của workflow bình thường.

## Khắc phục sự cố

| Triệu chứng | Nguyên nhân thường gặp | Cách xử lý |
| --- | --- | --- |
| Agent bỏ qua luồng init | Thiếu `CLAUDE.md` hoặc managed block bị xóa. | Chạy lại installer, hoặc copy [CLAUDE-template.md](CLAUDE-template.md) thành `CLAUDE.md`. |
| Agent hỏi init lại mỗi phiên | `meta.template_status` vẫn `uninitialized`. | Chạy init, duyệt diff, đảm bảo `template_status` thành `initialized` và `initialized_at` đã được set. |
| Dò sai stack | Lockfile của ngôn ngữ cũ còn sót, hoặc pattern dò chưa cập nhật. | Xóa file cũ, hoặc mở rộng phần detection trong [backbone.yml](backbone.yml). |
| Agent chạm vào path không nên | Path chưa có trong `policy.protected_paths`. | Thêm vào (hỗ trợ glob). |
| `CLAUDE.md` cũ bị ghi đè | Guardrail merge bị bypass. | Khôi phục từ git. Chạy lại installer - kit chỉ append managed block. |
| Validation cảnh báo AgentShield probe | Thiếu Python hoặc script probe. | Cài Python 3, hoặc bỏ qua - đây là warning, không phải failure. |
| Sau khi install không thấy `node scripts/...` | Installer bỏ qua file đã có. | Chạy lại với `--force`, hoặc copy thủ công thư mục `scripts/`. |

## Đóng góp

Issue và PR luôn welcome tại [`giang6283623/minimal-vibe-coding-kit`](https://github.com/giang6283623/minimal-vibe-coding-kit).

Khi sửa kit:

- Mirror thay đổi giữa `.claude/`, `.cursor/`, và `.agents/` để cả ba tool đồng bộ.
- Giữ template trung lập - không tên công ty, không port hardcode.
- Mỗi command/skill mới phải có một dòng mô tả mục đích và một ví dụ.
- Chạy `npm run validate:all` trước khi mở PR.

**Tác giả:** [GiangBV](https://www.linkedin.com/in/buivangiang1992), [AuPMH](https://www.linkedin.com/in/pham-au-2a1bb1162)
**Powered by:** Caffeine, Determination, AI Collaboration, và những đêm code cuối tuần.

## Giấy phép

MIT. Xem [LICENSE](LICENSE).

> 🇻🇳 *Nếu bạn yêu Việt Nam và con người Việt Nam, bạn hoàn toàn được dùng miễn phí mọi thứ trong đây.*
