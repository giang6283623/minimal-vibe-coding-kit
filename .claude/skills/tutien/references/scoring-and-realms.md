# tutien scoring and realms

Scoring is deterministic (`scripts/score.mjs`): the same analysis JSON always yields the same score. High token usage never raises the score; necessary iteration is not punished; penalties are capped so one hard task cannot erase a long history.

## Coverage gate

A realm is computed only when known-token coverage (reported + estimated turns) is at least **60%**. Below that the report shows `Cảnh giới: Chưa đủ thiên cơ` (not enough evidence) and lists what is missing — it never guesses a realm from thin data.

## Dimensions (weights)

| Dimension | Weight | Signal |
|---|---:|---|
| delivery | 30% | verified completions and recoveries vs failed attempts, plus committed output |
| validation | 25% | presence and density of validation events |
| clarity | 15% | 1 − avoidable-repeat rate (capped) |
| recovery | 15% | recoveries ÷ failures |
| safety | 10% | high baseline, capped penalty per conflict candidate |
| automation | 5% | reusable automation (neutral in V1; refined once commit-subject signals are wired) |

Score = round(Σ dimension × weight × 100).

## Realm ladder (project-authored, humorous)

| Band | Realm | Gloss |
|---|---|---|
| 0–14 | Phàm Nhân Nhập Môn | Mortal Initiate |
| 15–29 | Luyện Khí | Qi Refining |
| 30–44 | Trúc Cơ | Foundation Establishment |
| 45–59 | Kết Đan | Core Formation |
| 60–69 | Nguyên Anh | Nascent Soul |
| 70–79 | Hóa Thần | Spirit Transformation |
| 80–87 | Luyện Hư | Void Refinement |
| 88–93 | Hợp Thể | Body Integration |
| 94–97 | Đại Thừa | Great Vehicle |
| 98–100 | Độ Kiếp / Phi Thăng | Tribulation / Ascension |

The realm names, thresholds, dimension weights, and jokes are an original project design — a creative theme, not a claim that one authentic cultivation ladder exists. See `lore-sources.md`.
