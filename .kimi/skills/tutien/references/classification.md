# Tu Tiên classification and progression

`scripts/classify.mjs` assigns a project's cultivation identity along three **orthogonal** axes, recommends knowledge, and derives seven progression metrics. It is deterministic and evidence-bound; classification comes from explicit declarations plus repo-profile keywords, each with a confidence and a rationale.

Invoke it standalone with `/tutien classify` (or it is appended to a full `analyze` report when a project profile is available).

```
classify [faction=<id>] [affiliation=<id>] [paths=<id,id>] [domains=<kw,kw>] [authorization=<slug>] [language=vi|en]
```

## Policy state — the single fail-closed gate

One `policy.state` governs the whole report, consumed identically by the renderer and the snapshot. **Only `clear` enables realm, score, villains, knowledge recommendations, and positive progression.** Under any other state those are set to **null (absent, not merely hidden)** and only Nghiệp Lực (risk) accrues.

| state | trigger | effect |
|---|---|---|
| `clear` | lawful constructive work | full report |
| `needs-review` | intent-to-harm signals in the description | faction **undetermined** (never Chính Đạo), no gamification, asks for human review |
| `authorization-required` | Ma Đạo with no valid `authorization` slug | withholds gamification until a scope is recorded |
| `declared-stop` | user declared Tà Đạo or the `ta` path | stop notice; no realm/score/knowledge; only Nghiệp Lực |

## The safety rules (non-negotiable)

1. **Tà Đạo and Tà Tu are never auto-assigned.** Intent to harm cannot be judged from keywords, and technical difficulty is not evil. They exist only as an explicit user declaration; `ta` cannot be combined with any other path (fails closed).
2. **Harmful intent is never rewarded.** A harmful description does not become Chính Đạo — it becomes `needs-review` with an undetermined faction and no gamification. This is a refusal to classify, not an automatic Tà label.
3. **A declared Tà Đạo suppresses all gamification.** No realm, score, villains, knowledge, Tu Vi, or Công Đức — only Nghiệp Lực and a stop-and-seek-review notice. Never a progression path.
4. **Affiliation is orthogonal to ethics.** Tán Tu (independent) is an organizational status, not the opposite of Tà Tu. A solo red-teamer is Tán Tu + Ma Đạo.
5. **Security/investigation/crypto/RE is legitimate.** Defensive work is Chính Đạo + Ảnh Tu; authorized adversarial engagement is Ma Đạo. Authorization is a **user-asserted reference slug** (`[A-Za-z0-9][A-Za-z0-9_-]{0,63}`), never verified; secret-shaped, markup, URL, or `key=value` values are rejected and never rendered. The Ảnh Tu / Huyền Cơ Tu paths always print a dual-use note.
6. **Progression is idempotent.** Contributions are per-event with a salted seen-ledger; replaying the same evidence (e.g. `range=all` twice) adds zero Tu Vi/Công Đức/Đạo Hạnh. A window with one new validated event adds only that event's contribution; overlap is reported.

## Axis 1 — Dao faction (project ethics/risk)

| id | Faction | Meaning | Assignment |
|---|---|---|---|
| `chinh-dao` | Chính Đạo | lawful, transparent, constructive | default; no adversarial/experimental signals |
| `bang-mon` | Bàng Môn / Kỳ Đạo | experimental, creative, specialized; not harmful | experimental/creative keywords |
| `ma-dao` | Ma Đạo | high-risk/adversarial; needs authorization | adversarial-engagement keywords; records `authorization` |
| `ta-dao` | Tà Đạo | intentionally harmful | **declaration only**; suppresses gamification |

## Axis 2 — Cultivator affiliation (organizational)

`tong-mon` (team/process) · `tan-tu` (independent) · `khach-khanh` (external/temporary) · `an-tu` (private long-term research). Author identifiers are read **transiently** (mailmap-collapsed `git log --use-mailmap`) and reduced immediately to a distinct **count**; no name or email is retained or emitted. The count is only a **low-confidence hint** (aliases, bots, and external contributors can inflate it) — declare `affiliation=` to set it authoritatively.

## Axis 3 — Cultivation paths (technical, multi-select)

`kiem` implementation · `tran` architecture/DevOps · `phu` prompts/automation · `khi` tools/libraries · `dan` data/optimization · `y` debugging/maintenance · `huyen` UI/UX/visual · `ngu-thu` AI-agent orchestration · `huyen-co` crypto/hard algorithms · `anh` authorized security/forensics/OSINT/RE · `ta` intentionally harmful methods (**declaration only**, never auto-assigned).

## Knowledge taxonomy

Recommended per the **primary path** (the first declared path, else the strongest detected one — never an alphabetical tie-break): **Tâm Pháp** (core mindset), **Công Pháp** (repeatable methods), **Thuật Pháp** (individual techniques — surfaced in the report's per-problem counter-techniques), **Bí Thuật** (rare/advanced), **Thần Thông** (mastered reusable abilities — rendered per path), **Pháp Bảo** (kit capabilities — existing skills *and* commands), **Bí Tịch / Đạo Điển** (playbooks/docs — this repo's `SKILL.md` files and `backbone.yml`).

`classify` is a **metadata-only** action: it reads `backbone.yml` fields plus the transient author count, prints that exact data scope, and derives no progression (progression requires analyzed history via `analyze`). It is not gated behind the `analyze` preview/approval boundary because it reads no history content.

## Progression metrics (deterministic; token-independent)

Derived from analysis evidence plus prior-snapshot accumulators — token usage feeds none of them:

- **Tu Vi** (per-window + lifetime): passes + recoveries + capped commits.
- **Đạo Hạnh**: count of reporting windows (long-term practice).
- **Ngộ Tính** [0–1]: recovery ratio minus avoidable-repeat rate.
- **Độ Thuần Thục** [0–1]: overall mastery (per-path mastery needs path-tagged evidence — a V2 item).
- **Tâm Cảnh** [0–1]: effectiveness under failure (recovery ÷ failure).
- **Công Đức** (per-window + lifetime): verified positive output.
- **Nghiệp Lực** (per-window + lifetime): unresolved failures ×2 + conflicts + loops. Under a suppressed (Tà Đạo) report, only Nghiệp Lực accrues; Tu Vi and Công Đức stay zero.
