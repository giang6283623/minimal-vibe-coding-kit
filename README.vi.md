<div align="center">

**Ngôn ngữ:** [English](README.md) · **Tiếng Việt**

# Minimal Vibe Coding Kit

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Claude](https://img.shields.io/badge/Claude-Command%20%26%20Skills-111111)
![Cursor](https://img.shields.io/badge/Cursor-Command%20%26%20Skills-1f6feb)
![Markdown](https://img.shields.io/badge/Format-Markdown-000000?logo=markdown&logoColor=white)
![Focus](https://img.shields.io/badge/Focus-Minimal%20%26%20Reusable-2ea44f)

**Bộ kit tối giản, không phụ thuộc dự án, cho workflow AI-coding tái sử dụng — chạy trên mọi repo, mọi ngôn ngữ.**

Copy vào → để AI tự detect stack → duyệt đề xuất → bắt tay ship code.

</div>

---

## Mục Lục

- [Repo Này Là Gì](#repo-này-là-gì)
- [Cách Hoạt Động (Template + Auto-Init)](#cách-hoạt-động-template--auto-init)
- [Bắt Đầu Nhanh](#bắt-đầu-nhanh)
- [Prompt Init Lần Đầu](#prompt-init-lần-đầu)
- [Cấu Trúc Repo](#cấu-trúc-repo)
- [Tham Chiếu Thành Phần](#tham-chiếu-thành-phần)
- [Best Practice](#best-practice)
- [Khắc Phục Sự Cố](#khắc-phục-sự-cố)
- [Giấy Phép MIT](#giấy-phép-mit)

> 🇬🇧 Want to read in English? See [README.md](README.md).

---

## Repo Này Là Gì

Bộ kit nhẹ, không phụ thuộc dự án, gồm **rules**, **skills**, **commands** dùng chung và một **backbone manifest** giúp các AI coding (Claude Code, Cursor…) hiểu mọi dự án theo cùng một cách.

Tối giản có chủ đích:

- Không framework nặng
- Không ép cấu trúc
- Ba file template lo phần lớn:
  - [backbone.yml](backbone.yml) — nguồn sự thật duy nhất về cấu trúc, đường dẫn và convention của dự án.
  - [CLAUDE-template.md](CLAUDE-template.md) — khung `CLAUDE.md` có sẵn **trigger tự khởi tạo lần đầu**.
  - [FIRST_TIME_INIT.md](FIRST_TIME_INIT.md) — prompt + quy trình từng bước cùng guardrails để bootstrap bất kỳ repo nào.

## Cách Hoạt Động (Template + Auto-Init)

Luồng:

1. Bạn copy kit vào dự án. `backbone.yml` mặc định `meta.template_status: uninitialized` và còn nhiều giá trị `<<PLACEHOLDER>>`.
2. Bạn để AI tự nhận diện trạng thái chưa init, hoặc paste prompt từ [FIRST_TIME_INIT.md](FIRST_TIME_INIT.md).
3. AI quét repo theo **stack fingerprint** khai báo ở `backbone.yml → detection` (go.mod, package.json, pyproject.toml, Cargo.toml, file config framework, marker monorepo…).
4. AI suy luận giá trị (tên dự án, ngôn ngữ chính, port, package manager, lệnh kiểm tra, đường dẫn) và **đề xuất một diff duy nhất** cho `backbone.yml`. Nếu dự án đã có sẵn `CLAUDE.md`, AI sẽ **append** khối trigger vào cuối thay vì ghi đè.
5. Bạn duyệt (`yes` / `edit` / `abort`). Khi duyệt, AI ghi file và đổi trạng thái thành `initialized`.
6. Các phiên sau sẽ đọc `backbone.yml` đã điền như bản đồ chính thức và **bỏ qua** init flow.

Không ghi file thầm lặng. Bộ base không chứa mã đặc thù dự án. Hỗ trợ single-repo, mono-repo, multi-repo.

## Bắt Đầu Nhanh

```bash
# 1. Tại thư mục gốc của kit này, copy 4 artifact vào dự án đích
cp -R .claude /path/to/your-project/
cp -R .cursor /path/to/your-project/             # chỉ khi bạn dùng cả Cursor
cp backbone.yml /path/to/your-project/
cp FIRST_TIME_INIT.md /path/to/your-project/

# 2. Xử lý CLAUDE.md tuỳ trạng thái dự án:
#    - Nếu dự án CHƯA có CLAUDE.md:
cp CLAUDE-template.md /path/to/your-project/CLAUDE.md
#    - Nếu dự án ĐÃ có CLAUDE.md:
#      Giữ nguyên. AI sẽ append khối trigger trong lúc init.

# 3. Mở dự án bằng Claude Code (hoặc Cursor)
cd /path/to/your-project
claude                                            # hoặc: cursor .

# 4. Paste prompt trong FIRST_TIME_INIT.md (hoặc yêu cầu agent chạy nó).
#    Agent sẽ đưa diff đề xuất, đợi "yes", rồi đánh dấu init hoàn tất.
```

## Prompt Init Lần Đầu

Prompt chuẩn, danh sách guardrails và logic merge-vs-replace đều ở [FIRST_TIME_INIT.md](FIRST_TIME_INIT.md).

Bản rút gọn để paste:

```text
Read FIRST_TIME_INIT.md and run the init flow. Detect my stack from the working tree,
propose a filled backbone.yml as a diff, and append (do not overwrite) the trigger
block to my existing CLAUDE.md if I already have one. Wait for my approval before writing.
```

## Cấu Trúc Repo

```text
.
├── .claude/
│   ├── Init CLaude.md                       ← hướng dẫn bootstrap (tuỳ chọn)
│   ├── agent/                               ← sub-agent chuyên trách
│   │   ├── code-reviewer.md
│   │   ├── debug-fixer.md
│   │   ├── hypothesis-planner.md
│   │   ├── implementation-hacker.md
│   │   ├── research-coordinator.md
│   │   ├── results-analyst.md
│   │   └── test-runner.md
│   ├── command/
│   │   └── council.md                       ← prompt điều phối đa-agent
│   └── skills/
│       ├── autoresearch-coding/             ← vòng research theo metric
│       ├── clearthought/                    ← 37 phép suy luận có cấu trúc
│       ├── reviewing-4p-priorities/         ← phân loại P0–P4 (mô hình Fibery)
│       └── sequential-thinking/             ← suy luận tuần tự theo bước
├── .cursor/                                 ← bản mirror của .claude/ cho Cursor
│   ├── Init CLaude.md
│   ├── agent/                               (cùng 7 agent)
│   ├── command/council.md
│   └── skills/                              (cùng 4 skill)
├── backbone.yml                ← template manifest dự án
├── CLAUDE-template.md          ← khung CLAUDE.md có trigger init
├── FIRST_TIME_INIT.md          ← prompt init + guardrails
├── LICENSE
├── README.md                   ← bản English
└── README.vi.md                ← bạn đang ở đây
```

## Tham Chiếu Thành Phần

### Templates

| File                                     | Vai trò                                                                                                                    | Khi nào sửa                                                                                          |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| [backbone.yml](backbone.yml)             | Khai báo tên dự án, repo, cấu trúc, convention, lệnh kiểm tra, đường dẫn được/không được sửa. AI đọc mỗi phiên.            | Được điền tự động ở lần init đầu. Sau đó sửa tay khi đổi thư mục, đổi port, hoặc thêm rule/workflow. |
| [CLAUDE-template.md](CLAUDE-template.md) | Trở thành `CLAUDE.md` của dự án. Chứa trigger init lần đầu, rule autoresearch, rule dùng `trash` thay `rm`.                | Chỉ sửa phần _"Project-specific notes"_ ở cuối. Giữ nguyên khối trigger để có thể init lại.          |
| [FIRST_TIME_INIT.md](FIRST_TIME_INIT.md) | Runbook init độc lập: prompt sẵn để paste, quy trình từng bước, guardrails (merge CLAUDE.md, done-marker, chống chạy lại). | Chỉ siết guardrail hoặc thêm phép detection khi thực sự cần.                                         |

### Commands

| Thành phần                                               | Mô tả ngắn                 | Khi nào dùng                                                                 |
| -------------------------------------------------------- | -------------------------- | ---------------------------------------------------------------------------- |
| [.claude/command/council.md](.claude/command/council.md) | Prompt điều phối đa-agent. | Phân tích cấp cao, lập kế hoạch, thay đổi nhiều file. `use /council n=15, …` |

### Skills (`.claude/skills/`)

| Skill                                                               | Vai trò                                                                                     | Khi nào dùng                                                                     |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| [autoresearch-coding/](.claude/skills/autoresearch-coding/)         | Vòng research theo metric: baseline, thử nghiệm, log kết quả.                               | Tinh chỉnh hiệu năng, tìm prompt/model tốt nhất, bất cứ task nào chấm điểm được. |
| [clearthought/](.claude/skills/clearthought/)                       | 37 phép suy luận có cấu trúc (mental model, decision framework, simulation, optimisation…). | Debug phức tạp, trade-off kiến trúc, ra quyết định khi đã rõ option.             |
| [reviewing-4p-priorities/](.claude/skills/reviewing-4p-priorities/) | Phân loại issue/task theo P0–P4 theo mô hình Fibery.                                        | Triage bug, dọn backlog, cần thước đo ưu tiên nhất quán.                         |
| [sequential-thinking/](.claude/skills/sequential-thinking/)         | Suy luận tuần tự có revision và rẽ nhánh.                                                   | Tác vụ dài, logic theo giai đoạn, khám phá khi scope chưa rõ.                    |

### Agents (`.claude/agent/`)

Prompt vai trò sẵn dùng cho công việc được uỷ thác. Gọi bằng `claude --agent <name>` hoặc để council spawn.

| Agent                                                              | Vai trò                                                     |
| ------------------------------------------------------------------ | ----------------------------------------------------------- |
| [code-reviewer.md](.claude/agent/code-reviewer.md)                 | Reviewer độc lập cho diff và PR.                            |
| [debug-fixer.md](.claude/agent/debug-fixer.md)                     | Tái hiện, cô lập, và fix một defect cụ thể.                 |
| [hypothesis-planner.md](.claude/agent/hypothesis-planner.md)       | Sinh hypothesis kiểm chứng được và kế hoạch thí nghiệm.     |
| [implementation-hacker.md](.claude/agent/implementation-hacker.md) | Implementer nhanh-gọn cho spike/prototype.                  |
| [research-coordinator.md](.claude/agent/research-coordinator.md)   | Điều phối toàn bộ vòng autoresearch.                        |
| [results-analyst.md](.claude/agent/results-analyst.md)             | Đọc `results.tsv`, so sánh các lần chạy, đề xuất bước tiếp. |
| [test-runner.md](.claude/agent/test-runner.md)                     | Chạy và triage output test/lint/typecheck.                  |

### Bản mirror cho Cursor

[.cursor/](.cursor/) là bản gương đầy đủ của `.claude/` (`agent/`, `command/`, `skills/`) để người dùng Cursor có hành vi giống hệt. Mọi thay đổi phải đồng bộ giữa hai cây thư mục.

### Prompt Mẫu

#### Tác vụ hằng ngày — chuỗi bước, bước sau dùng kết quả bước trước

Dùng làm prompt mở đầu mặc định. Nó ghim AI vào `CLAUDE.md` + `backbone.yml` (để luôn theo protected paths, command checks, reasoning policy của bạn) và bắt AI lập kế hoạch từng bước, bước sau dùng kết quả của bước trước nhằm nhất quán giữ án.

**Template:**

```text
follow CLAUDE.md and backbone.yml to help me step by step:
- Step 1: Analyze ...
- Step 2: Using Step 1's findings, ...
- Step 3: Using Step 2's findings, ...
```

**Ví dụ — debug một endpoint chậm:**

```text
follow CLAUDE.md and backbone.yml to help me step by step:
- Step 1: Phân tích đường đi của request GET /api/v1/orders và liệt kê mọi layer nó đi qua
  (router → middleware → service → repository → DB query).
- Step 2: Dùng kết quả Step 1, chỉ ra 2 chỗ nhiều khả năng gây latency p95 1.2s
  mà production log đang ghi nhận.
- Step 3: Dùng kết quả Step 2, đề xuất fix với diff nhỏ nhất trước, liệt kê rủi ro,
  và viết đúng command_checks mình nên chạy trước khi merge.
```

**Ví dụ — thêm tính năng:**

```text
follow CLAUDE.md and backbone.yml to help me step by step:
- Step 1: Phân tích chỗ đang sinh notification hiện tại và đường dẫn nào đang được protect
  (không được sửa thầm).
- Step 2: Dùng kết quả Step 1, thiết kế tính năng opt-in email digest tối giản, tái sử dụng
  bảng notification hiện có — không thêm migration trừ khi bắt buộc.
- Step 3: Dùng kết quả Step 2, implement end-to-end và báo cáo file đã đổi, rủi ro, follow-up.
```

#### Biến thể nhiều skill — khi task khó nhằn

Lồng thêm reasoning skill khi scope chưa rõ hoặc trade-off không hiển nhiên:

```text
use /sequential-thinking, /clearthought, and /council with n=20, follow CLAUDE.md and
backbone.yml to help me step by step:
- Step 1: Phân tích ...
- Step 2: Dùng kết quả Step 1 để ...
- Step 3: Dùng kết quả Step 2 để ...
```

| Thành phần                  | Tip                                                     | Ví dụ                                                                           |
| --------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Command `council`           | `n=` để chỉnh số agent.                                 | `use /council n=15, how does authentication work?`                              |
| Skill `sequential-thinking` | Yêu cầu rõ từng bước + checkpoint với tác vụ dài.       | `use /sequential-thinking to debug login timeout step by step with checkpoints` |
| Skill `clearthought`        | Yêu cầu so sánh trade-off và rủi ro khi chọn phương án. | `use /clearthought to compare JWT vs session auth for this codebase`            |

## Best Practice

**Cài đặt ban đầu**

- Commit `backbone.yml` và `CLAUDE.md` vào repo. Đây là config cấp dự án, không phải cấp cá nhân.
- Không để secret trong `backbone.yml`. File chỉ chứa _đường dẫn_ và _lệnh_, không bao giờ giá trị.
- Sau init, đọc lại `backbone.yml` được sinh ra và siết `conventions.editable_paths` / `protected_paths` cho phù hợp đội.

**Hằng ngày**

- Coi `backbone.yml` là nguồn sự thật. Khi đổi tên thư mục hay thêm workflow thì cập nhật manifest trước — AI sẽ tự theo.
- Dùng `sequential-thinking` khi _khám phá_ (scope chưa rõ), dùng `clearthought` khi _ra quyết định_ (đã có option, cần chọn).
- Ưu tiên `council` khi thay đổi đụng quá hai file.

**Khi sửa chính kit này**

- Giữ template gốc trung lập với dự án. Không nhúng tên công ty, port cố định, framework nội bộ.
- Mọi thay đổi phải đồng bộ giữa `.claude/` và `.cursor/`.
- Mỗi command/skill mới phải có một dòng mục đích và một ví dụ.
- Prompt nhỏ, ghép được luôn tốt hơn prompt to một cục.

**An toàn**

- Không phá rule `trash` thay `rm`. Xoá có thể phục hồi sẽ cứu bạn vào cuối tuần.
- Không để AI tự ý sửa lockfile, `.env*`, migration, hay infra. Đưa chúng vào `conventions.protected_paths`.
- Branch thí nghiệm dạng `autoresearch/<YYYY-MM-DD>-<slug>`; chỉ commit khi metric cải thiện.

## Khắc Phục Sự Cố

| Hiện tượng                      | Nguyên nhân thường gặp                                               | Cách xử lý                                                                                                                                            |
| ------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| AI bỏ qua bước init             | Thiếu `CLAUDE.md` hoặc khối trigger đã bị xoá.                       | Copy lại [CLAUDE-template.md](CLAUDE-template.md) hoặc append khối trigger từ [FIRST_TIME_INIT.md](FIRST_TIME_INIT.md) vào `CLAUDE.md` hiện có.       |
| AI hỏi init lại mỗi phiên       | `meta.template_status` vẫn `uninitialized` vì lần trước bị abort.    | Chạy init một lần, duyệt diff, xác nhận `template_status` đã đổi sang `initialized` và `initialized_at` đã được set.                                  |
| AI chạy init 2 lần trong 1 phút | Race giữa hai phiên, hoặc có người revert trạng thái.                | Logic done-marker trong [FIRST_TIME_INIT.md](FIRST_TIME_INIT.md) sẽ chặn — kiểm tra `meta.initialized_at` đã có chưa; nếu chưa thì hoàn tất lần chạy. |
| Phát hiện sai stack             | Lockfile cũ của ngôn ngữ khác còn lại, hoặc detection chưa cập nhật. | Xoá file rác, hoặc bổ sung `detection.stack_fingerprints` / `framework_hints` trong [backbone.yml](backbone.yml).                                     |
| AI sửa đường dẫn nhạy cảm       | Đường dẫn chưa nằm trong `conventions.protected_paths`.              | Thêm vào. Hỗ trợ glob.                                                                                                                                |
| `CLAUDE.md` đã có bị ghi đè     | AI đã bỏ qua guardrail merge.                                        | Restore từ git. Chạy lại init theo [FIRST_TIME_INIT.md § Guardrails](FIRST_TIME_INIT.md#guardrails).                                                  |

---

## Giấy Phép MIT

Dự án này được cấp phép theo MIT License. Xem [LICENSE](LICENSE).

> 🇻🇳 _Nếu bạn yêu mến Việt Nam và con người nơi đây, bạn được toàn quyền sử dụng mọi thứ trong này một cách miễn phí._

### Đóng Góp

**Tác giả**: [GiangBV](https://www.linkedin.com/in/buivangiang1992), [AuPMH](https://www.linkedin.com/in/pham-au-2a1bb1162)
**Powered by**: Caffeine, Determination, AI Collaboration, và những buổi code cuối tuần
