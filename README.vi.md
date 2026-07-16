<div align="center">

**Đọc bằng:** [English](README.md) · **Tiếng Việt**

# Minimal Vibe Coding Kit

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.4.0-2ea44f.svg)](CHANGELOG.md)
![Claude](https://img.shields.io/badge/Claude%20Code-Commands%20%26%20Skills-111111)
![Cursor](https://img.shields.io/badge/Cursor-Rules%20%26%20Commands-1f6feb)
![Codex](https://img.shields.io/badge/Codex-AGENTS.md%20%26%20Plugin-6f42c1)
![AgentShield](https://img.shields.io/badge/Security-AgentShield-d62828)
![Node](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)

**Một bộ kit AI-coding cài một lần cho Claude Code, Cursor và Codex — mọi repo, mọi ngôn ngữ.**

Cài đặt → dán một prompt → duyệt đề xuất → code với guardrails.

</div>

---

## Bộ kit này là gì?

Một bộ kit nhỏ gồm **rules**, **skills**, **commands** dùng chung, cộng một manifest **`backbone.yml`**, giúp Claude Code, Cursor và Codex hiểu project của bạn theo cùng một cách.

- Không bao giờ ghi đè `CLAUDE.md` / `AGENTS.md` sẵn có — chỉ thêm managed block.
- Mọi thao tác ghi khi setup đều chờ bạn duyệt.
- Rà soát bảo mật bề mặt agent (AgentShield) là một phần của workflow bình thường.

## Bắt đầu nhanh

Ba bước, khoảng hai phút.

**1. Cài vào project của bạn** (không cần clone):

```bash
npx github:giang6283623/minimal-vibe-coding-kit install /path/to/your-project
```

Hoặc từ bản clone của repo này: `./install.sh /path/to/your-project` (Windows: `./install.ps1 -Target C:\path\to\your-project`).

**2. Mở project trong Claude Code, Cursor hoặc Codex và dán:**

```text
Read .vibekit/init/FIRST_TIME_INIT.md and initialize this repo with Minimal Vibe Coding Kit.
First print the requirements you will check. Then run detection, propose one diff
for backbone.yml and managed instruction blocks, and wait for my yes before writing.
```

**3. Review diff được đề xuất và trả lời `yes`.**

Agent điền `backbone.yml` với stack và quy ước đã dò được, rồi chuyển sang `initialized`. Xong — mọi phiên sau tự động đọc file này và bỏ qua bước init.

Kiểm tra sức khỏe bất cứ lúc nào:

```bash
node .vibekit/scripts/mvck.mjs doctor .
```

## Những gì được cài vào repo của bạn

Cài đặt chỉ thêm đúng những mục sau — không đụng vào bất cứ thứ gì khác:

```text
your-project/
├── backbone.yml              ← bản đồ project mà agent đọc đầu tiên (nguồn sự thật duy nhất)
├── AGENTS.md                 ← hướng dẫn chung cho agent (managed block)
├── CLAUDE.md                 ← ngắn gọn; import AGENTS.md (chỉ tạo khi chưa có)
├── .gitignore                ← các entry của kit thêm trong managed block
├── .claude/                  ← Claude Code: rules, commands, agents, skills
├── .cursor/                  ← Cursor: rules, commands, skills
├── .agents/                  ← skills cho Codex / portable
├── .codex/  .codex-plugin/   ← config mẫu Codex + plugin manifest
└── .vibekit/                 ← mọi thứ thuộc kit, trong MỘT thư mục
    ├── skills/               ← shared skills canonical (mirror sang các harness)
    ├── commands/             ← prompt command dùng chung
    ├── scripts/              ← CLI mvck, init, validate, doctor, security probe
    ├── docs/                 ← tài liệu tham khảo sâu hơn
    └── init/                 ← file onboarding một lần (xóa được bằng /vibe-finalize)
```

File sẵn có không bao giờ bị thay thế — kit chỉ merge managed block (`BEGIN/END: minimal-vibe-coding-kit`) và bỏ qua những gì thuộc về bạn.

## Các mảnh ghép kết nối thế nào

```text
Bạn (prompt) ──▶ Claude Code / Cursor / Codex
                      │  đọc đầu tiên
                      ▼
        backbone.yml  +  AGENTS.md / CLAUDE.md  +  rules
                      │  load khi cần
                      ▼
        skills (quy trình)  +  commands (phím tắt)
                      │  được bảo vệ bởi
                      ▼
        protected paths · đề xuất-trước-khi-ghi · AgentShield probe
```

- **`backbone.yml`** — đường dẫn, quy ước, protected paths, và lệnh validate của repo bạn.
- **Rules** — guardrails ngắn, luôn được load (đọc backbone trước, diff nhỏ, security review khi sửa bề mặt agent).
- **Skills** — quy trình lặp lại được, chỉ load khi task cần.
- **Commands** — phím tắt một từ cho các skill hay dùng nhất.

## Hướng dẫn — sử dụng hằng ngày

1. **Cứ code bình thường.** Yêu cầu feature/fix như thường lệ; agent theo quy ước trong `backbone.yml` và giữ diff nhỏ.
2. **Task lớn hoặc mơ hồ?** Bắt đầu với skill `clearthought` hoặc `sequential-thinking` để có kế hoạch trước.
3. **Câu hỏi toàn repo hoặc review lớn?** Dùng `parallel-analysis` — chia các lane phân tích chỉ-đọc chạy song song rồi xác minh kết quả gộp.
4. **Đã sửa `.claude/`, skills, hooks, hoặc script installer?** Chạy `/security-scan` trước khi merge.
5. **Muốn cải tiến đo được?** Chạy `/autoresearch-coding` với metric và budget.
6. **Giữ setup luôn sắc bén:** `/daily-enhance` đề xuất cải tiến — không bao giờ tự áp dụng.
7. **Onboarding xong hẳn?** `/vibe-finalize` dọn các file bootstrap một lần.

## Commands

| Command | Chức năng | Ví dụ |
| --- | --- | --- |
| `/init-vibe` | Init lần đầu hoặc sửa chữa: đề xuất một diff, chờ duyệt. | `/init-vibe` — review diff rồi trả lời `yes`. |
| `/security-scan` | AgentShield probe chỉ-đọc + scanner tùy chọn cho bề mặt agent. | `/security-scan` trước khi merge thay đổi `.claude/**` hoặc skills. |
| `/daily-enhance` | Báo cáo chỉ-đề-xuất để cải tiến rules, skills, workflows. | `/daily-enhance` — review diff đề xuất rồi duyệt. |
| `/autoresearch-coding` | Vòng lặp thử nghiệm theo metric với baseline và budget. | `/autoresearch-coding` Goal: giảm lỗi lint. Budget: 3. |
| `/council` | Phối hợp các agent reviewer/researcher/analyst thành một kế hoạch gộp. | `/council` trên diff của branch này. |
| `/vibe-finalize` | Tốt nghiệp project: chuyển file bootstrap một lần vào `_vibekit-cleanup/`. | `/vibe-finalize` — xem trước, áp dụng sau khi duyệt. |

## Skills

Cả 12 skill nằm trong `.vibekit/skills/` và được mirror cho từng tool. Gọi bằng tên ("Use the X skill…") hoặc qua các command ở trên.

| Skill | Dùng khi | Prompt ví dụ |
| --- | --- | --- |
| `vibekit-init` | Setup lần đầu, hoặc `backbone.yml` / managed blocks cần sửa. | "Use the vibekit-init skill. Propose one diff and wait for my yes." |
| `parallel-analysis` | Câu hỏi toàn repo, review diff lớn, audit tính nhất quán. | "Use parallel-analysis: where is auth handled and what depends on it?" |
| `agentshield-security-review` | Audit config agent, skills, hooks, MCP, commands trước khi merge. | "Use agentshield-security-review on .claude/** and .vibekit/skills/**." |
| `autoresearch-coding` | Cải tiến repo qua các thử nghiệm đo được. | "Use autoresearch-coding. Metric: `npm test`. Direction: higher. Budget: 3." |
| `daily-workflow-curator` | Tune-up định kỳ cho rules, skills, workflows (chỉ đề xuất). | "Use daily-workflow-curator and propose today's improvements." |
| `path-sensitive-shell-safety` | Trước khi sửa logic shell/installer/deploy có biến path hoặc `rm`/`mv`/`rsync`. | "Use path-sensitive-shell-safety before changing this cleanup script." |
| `visual-design-loop` | Polish UI: render → screenshot → review → fix, theo vòng lặp. | "Use visual-design-loop on /dashboard. Budget 3 loops." |
| `clearthought` | Yêu cầu mơ hồ, tradeoff thiết kế, quyết định rủi ro. | "Use clearthought. Operation: implementation_plan. Split this feature into safe tasks." |
| `sequential-thinking` | Chia nhỏ công việc phức tạp theo từng bước. | "Use sequential-thinking. Break this refactor into ordered steps with tests." |
| `reviewing-4p-priorities` | Triage bug/finding theo thứ tự fix P0–P4. | "Use reviewing-4p-priorities. Classify these findings and give a fix sequence." |
| `memento` | Task nhiều ngày: lưu ngữ cảnh trước khi dừng, resume phiên sau. | "/memento — write MEMENTO.md with Goal, Done, Stuck, Next." |
| `coding-level` | Chỉnh độ chi tiết khi giải thích (0 = ELI5 … 5 = chuyên gia). | "/coding-level 2" |

## Nâng cao

### Profile cài đặt

Chỉ cài các bề mặt bạn dùng (mặc định là `all`):

```bash
npx github:giang6283623/minimal-vibe-coding-kit install . --profile claude          # chỉ Claude Code
npx github:giang6283623/minimal-vibe-coding-kit install . --profile claude,cursor   # Claude + Cursor
npx github:giang6283623/minimal-vibe-coding-kit install . --profile codex           # Codex / agent dùng AGENTS.md
```

Cờ: `--force` (ghi đè file kit sẵn có), `--dry-run` (xem trước), `--json` (kế hoạch dạng máy đọc).

### Cập nhật project đã cài

Chạy trong project của bạn khi kit có skill hoặc script mới:

```bash
npx github:giang6283623/minimal-vibe-coding-kit update . --dry-run   # xem trước
npx github:giang6283623/minimal-vibe-coding-kit update .             # áp dụng
```

`update` chỉ làm mới **file thuộc kit**, không bao giờ đụng `backbone.yml` hay nội dung của bạn, cập nhật managed block tại chỗ, và backup file bị thay vào `.vibekit/update-backup/<timestamp>/`. Chi tiết: [.vibekit/docs/INSTALL.md](.vibekit/docs/INSTALL.md).

### Vòng lặp Autoresearch

```text
Use the autoresearch-coding skill.
Goal: improve maintainability. Metric command: <lệnh validate của bạn>. Direction: higher.
Editable paths: src/ docs/. Protected paths: .git .env* node_modules lockfiles.
Budget: 3.
```

Hợp đồng: baseline trước → mỗi lần một thử nghiệm nhỏ → chỉ giữ thay đổi cải thiện metric → log tất cả.

### Rà soát bảo mật (AgentShield)

```bash
node .vibekit/scripts/agentshield-probe.mjs .                          # probe chỉ-đọc, nhanh
npx ecc-agentshield scan --path . --format text --min-severity medium  # scan đầy đủ, tùy chọn
```

Mọi thay đổi tới `CLAUDE.md`, `AGENTS.md`, `.claude/**`, `.cursor/**`, `.agents/**`, `.codex-plugin/**`, hoặc `.vibekit/skills|commands|scripts/**` đều nên kích hoạt review. Mô hình: [.vibekit/docs/SECURITY_MODEL.md](.vibekit/docs/SECURITY_MODEL.md).

### Doctor và báo cáo

```bash
node .vibekit/scripts/mvck.mjs doctor .                 # health check chỉ-đọc
node .vibekit/scripts/mvck.mjs doctor . --write-report  # ghi VIBE_REPORT.md
node .vibekit/scripts/daily-enhance.mjs . --write-report
```

### Cho người phát triển kit

```bash
npm test                # syntax + test cài đặt thật vào thư mục tạm + validate cấu trúc
npm run validate:all    # npm test + AgentShield probe + npm pack dry-run
```

Checklist publish: [.vibekit/init/PUSH_TO_GITHUB.md](.vibekit/init/PUSH_TO_GITHUB.md). Tài liệu sâu hơn: [.vibekit/docs/](.vibekit/docs/).

<details>
<summary><strong>Khắc phục sự cố</strong></summary>

| Triệu chứng | Cách xử lý |
| --- | --- |
| Agent bỏ qua luồng init | Chạy lại installer, hoặc copy [.vibekit/init/CLAUDE-template.md](.vibekit/init/CLAUDE-template.md) thành `CLAUDE.md`. |
| Agent hỏi init lại mỗi phiên | Chạy init và duyệt; xác nhận `meta.template_status: initialized` trong `backbone.yml`. |
| Dò sai stack | Xóa lockfile cũ, hoặc sửa `backbone.yml` trực tiếp. |
| Agent chạm path không nên | Thêm path vào `policy.protected_paths` trong `backbone.yml` (hỗ trợ glob). |
| AgentShield probe cảnh báo | Cài Python 3, hoặc bỏ qua — là warning, không phải failure. |
| Thiếu script sau khi cài | Chạy lại install với `--force`, hoặc copy thủ công `.vibekit/scripts/`. |

</details>

## Đóng góp

Issue và PR luôn welcome tại [`giang6283623/minimal-vibe-coding-kit`](https://github.com/giang6283623/minimal-vibe-coding-kit). Trước khi mở PR: mirror thay đổi skill giữa `.claude/`, `.cursor/`, `.agents/`, giữ template trung lập, và chạy `npm run validate:all`. Xem [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

**Tác giả:** [GiangBV](https://www.linkedin.com/in/buivangiang1992), [AuPMH](https://www.linkedin.com/in/pham-au-2a1bb1162)
**Powered by:** Caffeine, Determination, AI Collaboration, và những đêm code cuối tuần.

## Giấy phép

MIT. Xem [LICENSE](LICENSE).

> 🇻🇳 *Nếu bạn yêu Việt Nam và con người Việt Nam, bạn hoàn toàn được dùng miễn phí mọi thứ trong đây.*
