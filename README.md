<div align="center">

**Language:** [English](#english) | [Tiếng Việt](#tiếng-việt)

# Minimal Vibe Coding Kit

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Claude](https://img.shields.io/badge/Claude-Command%20%26%20Skills-111111)
![Cursor](https://img.shields.io/badge/Cursor-Command%20%26%20Skills-1f6feb)
![Markdown](https://img.shields.io/badge/Format-Markdown-000000?logo=markdown&logoColor=white)
![Focus](https://img.shields.io/badge/Focus-Minimal%20%26%20Reusable-2ea44f)

**Minimal setup for reusable vibe coding workflows across projects.**

A practical base for **Claude** and **Cursor** with shared commands and skills you can copy per project.

</div>

---

A lightweight, reusable kit of shared **rules**, **skills**, and **agent/command prompts** for AI-assisted coding across projects.

Bộ công cụ tối giản, dùng lại được, tổng hợp **rules**, **skills** và **agent/command prompts** để vibe coding nhất quán cho nhiều dự án.

## Table of Contents

- [English](#english)
- [Tiếng Việt](#tiếng-việt)
- [MIT License](#mit-license)

---

## English

### What This Repo Is

This repository is a curated hub of reusable vibe coding techniques (rules, skills, and command/agent prompts), so you can copy exactly what you need into each project.

It is intentionally minimal:

- No heavy framework
- No forced structure
- Easy to copy, adapt, and maintain

### Goals

- Reuse one baseline across many projects
- Keep AI behavior consistent
- Reduce setup duplication
- Stay clean and simple

### Current Structure

```text
.
├── .claude/
│   ├── command/
│   │   └── council.md
│   └── skills/
│       ├── clearthought/
│       └── sequential-thinking/
├── .cursor/
│   ├── command/
│   │   └── council.md
│   └── skills/
│       ├── clearthought/
│       └── sequential-thinking/
└── README.md
```

### Quick Start

1. Pick your target tool (`Claude` or `Cursor`).
2. Copy the needed folder(s) from this repo into your project.
3. Keep only what your project actually uses.
4. Update command/rule text to match project context.

Example:

```bash
# Copy Claude setup into another project
cp -R .claude /path/to/your-project/

# Copy Cursor setup into another project
cp -R .cursor /path/to/your-project/
```

### Usage Summary

#### Claude

| Component                             | Short Description                                                    | When to Use                                                                     | Example                                                             |
| ------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `.claude/command/council.md`          | Shared high-level command/coordination prompt for Claude workflows.  | When you want a default command template for analysis/planning/execution style. | “Run council flow before implementing a multi-file change.”         |
| `.claude/skills/clearthought/`        | Structured reasoning skill for deeper analysis and decision quality. | Complex debugging, architecture trade-offs, unclear requirements.               | “Use clearthought to compare Option A vs B with risks.”             |
| `.claude/skills/sequential-thinking/` | Step-by-step reasoning skill for iterative problem solving.          | Tasks that need staged logic, revisions, or branch exploration.                 | “Break a bug investigation into sequential steps with checkpoints.” |

#### Cursor

| Component                             | Short Description                                       | When to Use                                             | Example                                                               |
| ------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------- |
| `.cursor/command/council.md`          | Cursor version of shared command/agent behavior prompt. | You want consistent behavior in Cursor across projects. | “Apply council command as the default instruction in Cursor project.” |
| `.cursor/skills/clearthought/`        | Cursor-ready clearthought skill package.                | Need consistent deep-reasoning workflow in Cursor.      | “Invoke clearthought before major refactor decisions.”                |
| `.cursor/skills/sequential-thinking/` | Cursor-ready sequential-thinking skill package.         | Need procedural reasoning for long tasks in Cursor.     | “Use sequential-thinking to plan migration step-by-step.”             |

### Command And Skill Prompt Examples

Use these as practical starter prompts.

| Item                        | Tip                                                   | Example                                                                         |
| --------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------- |
| `council` command           | Use params like `n=10` to control agent count.        | `use /council n=15, how does authentication work?`                              |
| `sequential-thinking` skill | Ask for explicit steps/checkpoints when task is long. | `use /sequential-thinking to debug login timeout step by step with checkpoints` |
| `clearthought` skill        | Ask to compare options with trade-offs and risks.     | `use /clearthought to compare JWT vs session auth for this codebase`            |

### How to Keep This Kit Maintainable

- Prefer small, reusable prompt/skill modules.
- Avoid project-specific details in base templates.
- Document every new command/skill with a short purpose and one example.
- Update both `.claude` and `.cursor` versions if they should stay aligned.

---

## Tiếng Việt

### Repo Này Dùng Để Làm Gì

Đây là nơi tập trung chắt lọc các kỹ thuật vibe coding có thể tái sử dụng (rules, skills, command/agent prompts), để bạn copy đúng phần cần dùng vào từng dự án.

Triết lý tối giản:

- Không ép theo framework nặng
- Không ép cấu trúc phức tạp
- Dễ copy, dễ chỉnh, dễ bảo trì

### Mục Tiêu

- Dùng chung một nền tảng cho nhiều dự án
- Giữ hành vi AI nhất quán
- Giảm lặp lại khi setup
- Gọn, rõ, dễ mở rộng

### Cấu Trúc Hiện Tại

```text
.
├── .claude/
│   ├── command/
│   │   └── council.md
│   └── skills/
│       ├── clearthought/
│       └── sequential-thinking/
├── .cursor/
│   ├── command/
│   │   └── council.md
│   └── skills/
│       ├── clearthought/
│       └── sequential-thinking/
└── README.md
```

### Cách Dùng Nhanh

1. Chọn tool bạn dùng (`Claude` hoặc `Cursor`).
2. Copy thư mục cần thiết từ repo này sang dự án.
3. Chỉ giữ những phần dự án thực sự cần.
4. Tùy chỉnh nội dung command/rule cho đúng bối cảnh dự án.

Ví dụ:

```bash
# Copy bộ Claude sang dự án khác
cp -R .claude /path/to/your-project/

# Copy bộ Cursor sang dự án khác
cp -R .cursor /path/to/your-project/
```

### Bảng Tóm Tắt Sử Dụng

#### Claude

| Thành phần                            | Mô tả ngắn                                                       | Khi nào dùng                                                        | Ví dụ                                                        |
| ------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------ |
| `.claude/command/council.md`          | Prompt command/điều phối dùng chung cho workflow Claude.         | Khi cần template command chuẩn cho phân tích/lập kế hoạch/thực thi. | “Chạy council flow trước khi sửa nhiều file.”                |
| `.claude/skills/clearthought/`        | Skill tư duy có cấu trúc để phân tích sâu và quyết định tốt hơn. | Debug phức tạp, cân nhắc kiến trúc, yêu cầu chưa rõ.                | “Dùng clearthought để so sánh phương án A/B và rủi ro.”      |
| `.claude/skills/sequential-thinking/` | Skill tư duy tuần tự để giải bài toán theo từng bước.            | Bài toán dài cần chia bước, chỉnh sửa, rẽ nhánh.                    | “Tách quá trình điều tra bug thành từng bước có checkpoint.” |

#### Cursor

| Thành phần                            | Mô tả ngắn                                   | Khi nào dùng                                                | Ví dụ                                                            |
| ------------------------------------- | -------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------- |
| `.cursor/command/council.md`          | Phiên bản command/agent behavior cho Cursor. | Khi muốn giữ hành vi nhất quán giữa các dự án trong Cursor. | “Đặt council command làm instruction mặc định cho dự án Cursor.” |
| `.cursor/skills/clearthought/`        | Gói clearthought dành cho Cursor.            | Cần quy trình phân tích sâu nhất quán trên Cursor.          | “Gọi clearthought trước khi quyết định refactor lớn.”            |
| `.cursor/skills/sequential-thinking/` | Gói sequential-thinking dành cho Cursor.     | Cần tư duy theo quy trình cho tác vụ dài trên Cursor.       | “Dùng sequential-thinking để lên kế hoạch migration từng bước.”  |

### Ví Dụ Prompt Cho Command Và Skill

Dùng các mẫu dưới đây để bắt đầu nhanh.
Cho các tác vụ thường ngày, bạn có thể sử dụng kết hợp kiểu:

```text
Use /sequential-thinking, /clearthought, and /council with n=20 to help me:
- Step 1: Analyze ...
- Step 2: After Step 1 is done, use the results and information from Step 1 to ...
- Step 3: After Step 2 is done, use the results and information from Step 2 to ...
```

| Thành phần                  | Tip                                                   | Ví dụ                                                                           |
| --------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------- |
| `council` command           | Dùng tham số như `n=10` để điều chỉnh số lượng agent. | `use /council n=15, how does authentication work?`                              |
| `sequential-thinking` skill | Với tác vụ dài, yêu cầu rõ từng bước và checkpoint.   | `use /sequential-thinking to debug login timeout step by step with checkpoints` |
| `clearthought` skill        | Yêu cầu so sánh phương án kèm trade-off và rủi ro.    | `use /clearthought to compare JWT vs session auth for this codebase`            |

### Nguyên Tắc Bảo Trì

- Chia nhỏ prompt/skill thành module tái sử dụng.
- Tránh nhúng chi tiết đặc thù dự án vào bộ nền.
- Mỗi command/skill mới nên có mô tả ngắn + 1 ví dụ.
- Nếu cần đồng bộ, cập nhật cả `.claude` và `.cursor`.

---

## MIT License

This project is licensed under the MIT License.

Dự án này được cấp phép theo MIT License.

If you have not added a `LICENSE` file yet, create one with the standard MIT text.

Nếu bạn chưa có file `LICENSE`, hãy thêm file này với nội dung chuẩn của MIT.

### Contributing

**Created by**: [GiangBV](https://www.linkedin.com/in/buivangiang1992), [AuPMH](https://www.linkedin.com/in/pham-au-2a1bb1162)  
**Powered by**: Caffeine, Determination, AI Collaboration, and Weekend Coding Sessions
