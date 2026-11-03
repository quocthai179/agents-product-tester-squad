# agents-product-tester-squad

Bộ **agent squad cho vị trí Product Tester** dành cho [Claude Code](https://code.claude.com): 11 agent kiểm thử chuyên biệt, 13 lệnh workflow và 5 skill (kèm script Playwright chạy được ngay), làm việc chung trên một workspace `.qa/` với định dạng bàn giao (handoff) thống nhất.

> Plugin name: **`tester-squad`** — dùng chung được với plugin `dev-squad`: tester tìm và báo lỗi, bug đã xác nhận được chuyển cho `dev-squad:debugger` / `dev-squad:developer` để sửa.

## Cài đặt

```bash
/plugin marketplace add quocthai179/agents-product-tester-squad
```

```bash
/plugin install tester-squad@agents-product-tester-squad
```

Trên Claude Code 2.1.275 trở lên có thể cài trong một bước:

```bash
/plugin install tester-squad --marketplace quocthai179/agents-product-tester-squad
```

Chạy cả phiên với Test Lead làm agent chính:

```bash
claude --agent tester-squad:test-lead
```

## Đội hình (11 agent)

| Agent | Vai trò | Đầu ra chính |
|---|---|---|
| `test-lead` | Trưởng nhóm kiểm thử: đánh giá rủi ro, chọn pipeline, giao việc, kiểm tra bằng chứng, kết luận | Kế hoạch điều phối, tổng kết |
| `test-analyst` | Review yêu cầu/PRD (static testing), điều kiện kiểm thử, phân tích rủi ro, test strategy/plan | `.qa/analysis/`, `.qa/plans/` |
| `test-designer` | Thiết kế test case bằng EP, BVA, bảng quyết định, chuyển trạng thái, pairwise; test data; traceability | `.qa/cases/` (+ CSV, `.steps.json`) |
| `exploratory-tester` | Kiểm thử khám phá theo charter, heuristics, tours; chạy sản phẩm thật trên trình duyệt | `.qa/sessions/` |
| `functional-tester` | Thực thi test case, smoke/regression, verify bug fix, chạy suite tự động có sẵn | `.qa/runs/` |
| `api-tester` | Kiểm thử API theo contract: validation, auth/authz (IDOR), status code, idempotency, tương thích | `.qa/runs/…-api-…`, `.qa/api/` |
| `ux-accessibility-tester` | Usability (Nielsen), WCAG 2.2 AA (axe-core + kiểm tra thủ công), nội dung, i18n/l10n tiếng Việt, responsive | `.qa/reports/…-ux-a11y-…` |
| `nonfunctional-tester` | Hiệu năng cảm nhận (LCP/INP/CLS), load smoke, security smoke, độ tin cậy/khôi phục, tương thích | `.qa/reports/…-nfr-…` |
| `automation-engineer` | Tự động hoá regression (Playwright/Cypress/API) trong framework của dự án, khử flaky | Test code + `.qa/reports/…-automation-…` |
| `bug-triager` | Tái hiện, cô lập, chống trùng, phân loại severity/priority, viết bug report, quản lý bug register, tạo ticket (khi được yêu cầu) | `.qa/bugs/`, `.qa/BUGS.md` |
| `test-reporter` | Test summary report, metrics, khuyến nghị GO / GO WITH RISKS / NO-GO, tổng hợp phản hồi UAT/beta | `.qa/reports/…-summary-…` |

## Lệnh workflow

| Lệnh | Việc làm | Pipeline |
|---|---|---|
| `/tester-squad:squad <yêu cầu>` | Giao bất kỳ việc kiểm thử nào; Test Lead tự chọn pipeline | test-lead quyết định |
| `/tester-squad:review-requirements <PRD>` | Soát yêu cầu trước khi code: mơ hồ, thiếu, mâu thuẫn, không test được | analyst |
| `/tester-squad:test-plan <feature>` | Phân tích rủi ro → test plan → test case + traceability | analyst → designer |
| `/tester-squad:test-feature <feature>` | Kiểm thử trọn vẹn một tính năng | analyst → designer → functional ∥ exploratory ∥ api ∥ ux-a11y → triager → reporter |
| `/tester-squad:explore <khu vực>` | 1–3 phiên exploratory song song rồi triage bug | exploratory ×N → triager |
| `/tester-squad:regression <build>` | Smoke + regression (suite tự động + case thủ công) | automation ∥ functional → triager → reporter |
| `/tester-squad:bug-report <mô tả>` | Tái hiện và viết bug report chuẩn (thêm "file it" để tạo ticket) | triager |
| `/tester-squad:verify-fix <bug IDs>` | Retest bug đã sửa + regression lân cận | functional → triager |
| `/tester-squad:a11y-audit <URLs>` | Audit UX, accessibility WCAG 2.2 AA, bản địa hoá, responsive | ux-a11y → triager |
| `/tester-squad:api-test <spec>` | Kiểm thử API theo contract, tạo bộ test chạy lại được | api → triager |
| `/tester-squad:automate <cases>` | Chuyển test case ổn định thành test tự động | (designer) → automation |
| `/tester-squad:release-signoff <version>` | Đánh giá sẵn sàng phát hành, ra khuyến nghị GO/NO-GO | functional ∥ automation ∥ nfr ∥ ux-a11y → triager → reporter |
| `/tester-squad:test-report [summary\|status\|feedback]` | Báo cáo tổng kết / status hằng ngày / tổng hợp phản hồi | reporter |

## Skills

| Skill | Nội dung |
|---|---|
| `tester-playbook` | Đội hình, pipeline, mức độ test theo rủi ro, cách viết brief, cấu trúc `.qa/`, handoff |
| `test-design-techniques` | EP, BVA, decision table, state transition, pairwise, use case, test data, checklist test case + **`pairwise.py`** (sinh bộ tổ hợp all-pairs có ràng buộc; ví dụ: 15 dòng thay cho 288) |
| `exploratory-heuristics` | Charter & session-based testing, SFDPOT, FEW HICCUPPS, tours, cheat sheet dữ liệu tấn công (có tiếng Việt, số điện thoại VN, tiền VND, ngày tháng), ý tưởng test web/mobile |
| `bug-reporting` | Mẫu bug report, công thức tiêu đề, ma trận severity/priority, checklist tái hiện, xử lý cannot-reproduce/regression/lỗ hổng bảo mật |
| `web-testing-toolkit` | **`probe.js`**: screenshot đa viewport/trình duyệt, console error, request lỗi, 4xx/5xx, ảnh hỏng, tràn ngang, TTFB/LCP/CLS, quét axe-core. **`run_steps.js`**: chạy test case khai báo bằng JSON, pass/fail từng bước, screenshot khi fail, secret lấy từ biến môi trường. Kèm snippet Playwright: đăng nhập lưu state, giả lập mạng chậm, mock lỗi backend, emulate thiết bị, trace |

Ví dụ:

```bash
node skills/web-testing-toolkit/scripts/probe.js https://staging.example.com/ --viewports 375x812,1440x900 --axe --runs 3
```

```bash
QA_PASSWORD=*** node skills/web-testing-toolkit/scripts/run_steps.js .qa/cases/login/ --base-url https://staging.example.com
```

```bash
python3 skills/test-design-techniques/scripts/pairwise.py skills/test-design-techniques/scripts/example-params.json
```

## Cách dùng (ví dụ)

```text
/tester-squad:test-feature Tính năng áp mã giảm giá ở giỏ hàng. App chạy ở http://localhost:3000 (npm run dev),
tài khoản test trong biến QA_USER/QA_PASSWORD, yêu cầu ở docs/prd/voucher.md
```

```text
/tester-squad:explore Trang thanh toán trên staging https://staging.shop.vn, 2 charter: dữ liệu nhập & gián đoạn mạng
```

```text
/tester-squad:release-signoff v2.4.0 trên https://staging.shop.vn, changelog ở CHANGELOG.md
```

```text
Dùng tester squad review PRD này giúp tôi: docs/prd/loyalty-points.md
```

## Workspace `.qa/`

```
.qa/
├── analysis/<slug>.md              # test-analyst
├── plans/<slug>.md                 # test-analyst
├── cases/<slug>.md                 # test-designer (+ <slug>/<TC-ID>.steps.json)
├── sessions/<date>-<slug>.md       # exploratory-tester
├── runs/<date>-<slug>.md           # functional-tester, api-tester
├── api/<slug>/                     # api-tester (khi dự án chưa có framework test API)
├── bugs/BUG-<NNN>-<slug>.md        # bug-triager
├── BUGS.md                         # bug register
├── evidence/<date>-<slug>/         # screenshot, probe, log (thường git-ignore)
└── reports/<date>-<type>-<slug>.md # ux-a11y, nfr, automation, summary, status, feedback
```

Mỗi agent kết thúc bằng khối:

```
### Handoff
- Status: done | blocked | needs-input
- Artifacts: <paths>
- Next: <agent> — <task>
- Risks / open questions: <...>
```

## Nguyên tắc an toàn của squad

- **Có bằng chứng mới tính**: mọi kết luận pass/fail phải kèm output lệnh, screenshot hoặc log.
- Chỉ test môi trường được phép (local/dev/staging hoặc mục tiêu người dùng chỉ định). Không chạy load test, fuzzing hay security probe trên production/hệ thống bên thứ ba khi chưa được đồng ý rõ ràng.
- Không dùng dữ liệu cá nhân thật của khách hàng làm test data; secret chỉ đặt trong biến môi trường.
- Tester không sửa code sản phẩm; không tạo ticket, commit, push hay gửi tin nhắn khi người dùng chưa yêu cầu.
- Lỗ hổng bảo mật nghi ngờ được đánh dấu confidential, không đưa lên tracker công khai.
- Agent trả lời bằng ngôn ngữ của người dùng (tiếng Việt), giữ ID/code/tên file bằng tiếng Anh.

## Cấu trúc repo

```
.claude-plugin/        plugin.json, marketplace.json
agents/                11 agent (.md với frontmatter)
commands/              13 lệnh workflow
skills/                5 skill (+ scripts)
tests/                 smoke test + trang demo có lỗi cài sẵn
tools/validate_plugin.py   kiểm tra tính nhất quán của plugin
```

## Phát triển

```bash
python3 tools/validate_plugin.py
```

```bash
bash tests/smoke.sh
```

`tests/smoke.sh` kiểm tra manifest/agent/command/skill, độ phủ của `pairwise.py`, và (nếu có Playwright) chạy `run_steps.js` + `probe.js` trên trang demo có lỗi cài sẵn để chắc chắn công cụ phát hiện đúng. CI chạy cùng script này trong `.github/workflows/validate.yml`.

## License

MIT — xem [LICENSE](LICENSE).
