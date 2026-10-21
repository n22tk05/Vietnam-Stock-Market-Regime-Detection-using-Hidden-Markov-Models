# Frontend Integration Notes

## 1. Phạm vi khảo sát

Tài liệu này ghi lại trạng thái thực tế của frontend Astera tại thời điểm khảo sát và cách kết nối frontend với backend `/api/v1`.

Quá trình khảo sát chỉ đọc các file trong `frontend/`. Frontend và repository AI Core không bị chỉnh sửa.

Các nguồn chính:

- Router và application shell: `frontend/src/main.tsx`, `frontend/src/app/App.tsx`.
- Khảo sát hồ sơ đầu tư: `frontend/src/features/assessment/AssessmentModal.tsx`.
- Demo phân bổ: `frontend/src/features/live-demo/LiveDemoPage.tsx`.
- Lịch sử danh mục public: `frontend/src/features/public-portfolio/PublicPortfolioPage.tsx`.
- Mock data: `frontend/public/history.json`, `frontend/public/simulated_users.json`.
- Dashboard marketing: `frontend/src/features/landing/sections/DashboardPreviewSection.tsx` và `frontend/src/features/landing/widgets/HeroGlobeWidget.tsx`.

Thư mục `frontend/src/features/landing/legacy/` không nằm trong runtime path hiện tại và không được xem là nguồn API contract.

## 2. Routes và pages hiện tại

Frontend dùng `BrowserRouter` tại `frontend/src/main.tsx:3-11`. Runtime hiện chỉ khai báo ba route tại `frontend/src/app/App.tsx:17-43`:

| Route | Component | Trạng thái dữ liệu | Hướng tích hợp backend |
|---|---|---|---|
| `/` | Landing page và `AssessmentModal` | Marketing hardcode; assessment chỉ lưu local state | Kết nối register/login, investment profile và recommendation |
| `/live-demo` | `LiveDemoPage` | Dữ liệu giả lập từ file JSON; không gọi backend | Tách public demo khỏi dữ liệu người dùng; với user thật dùng regime, recommendation và portfolio APIs |
| `/portfolio` | `PublicPortfolioPage` | Lịch sử tĩnh từ `history.json` | Đổi thành history/portfolio có xác thực hoặc tạo public-demo contract riêng |

Frontend chưa có route cho:

- Đăng ký, đăng nhập, quên/đặt lại/đổi mật khẩu.
- Dashboard người dùng thật.
- Quản lý tài khoản và preferences.
- Chi tiết recommendation.
- Portfolio version history.
- Notification center.
- Trang lỗi 404 hoặc route guard.

Header trên landing điều hướng tới `/live-demo` và `/portfolio` qua callback tại `frontend/src/app/App.tsx:20-29`. Trên `/portfolio`, callback mở assessment đang là hàm rỗng tại `frontend/src/features/public-portfolio/PublicPortfolioPage.tsx:77-80`.

Nút `Đăng nhập` trên mobile không có handler tại `frontend/src/components/layout/Header.tsx:127-130`. Các CTA `Bắt đầu miễn phí` hiện chỉ mở assessment modal, không tạo tài khoản.

## 3. Data fetching và API assumptions hiện tại

Frontend chưa có API client tập trung. Các request runtime duy nhất là:

- `GET /simulated_users.json` tại `frontend/src/features/live-demo/LiveDemoPage.tsx:209-252`.
- `GET /history.json` tại `frontend/src/features/live-demo/LiveDemoPage.tsx:285-336`.
- `GET /history.json` tại `frontend/src/features/public-portfolio/PublicPortfolioPage.tsx:33-53`.

`frontend/vite.config.ts:7-14` chưa cấu hình API proxy. Project cũng chưa có:

- `VITE_API_URL` hoặc base URL theo environment.
- Wrapper cho `fetch`/HTTP client.
- Bearer authorization header.
- Access-token expiry handling.
- Refresh-token rotation và request retry.
- Parser cho success/error envelope.
- Request ID propagation.
- Chuẩn hóa lỗi API thành UI state.

Frontend hiện giả định response là array/object trực tiếp. Ví dụ, `history.json` được kiểm tra bằng `Array.isArray(data)` tại `frontend/src/features/public-portfolio/PublicPortfolioPage.tsx:39-43` và `frontend/src/features/live-demo/LiveDemoPage.tsx:288-290`.

Backend bắt buộc dùng envelope:

```json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "uuid",
    "timestamp": "ISO-8601"
  }
}
```

Do đó frontend phải đọc `payload.data`, không kiểm tra trực tiếp toàn bộ payload như array. Với error response, frontend cần hiển thị `error.message`, xử lý `error.code`, và giữ `meta.requestId` để hỗ trợ điều tra lỗi.

## 4. Mock và dữ liệu hardcode cần thay thế

### 4.1 `history.json`

`PublicPortfolioPage` và `LiveDemoPage` đều phụ thuộc `frontend/public/history.json`. Fixture hiện chứa 22 mốc từ `30/03/2026` tới `29/04/2026` với shape:

```text
date
capital
used_capital
cash_left
tracking_error
warning_flag
warning_msg
allocations[]
```

Mỗi allocation có:

```text
ma_co_phieu
so_lo
so_co_phieu
gia_hien_tai
so_tien_chi
ty_trong_goc_ppo
ty_trong_thuc_te
```

Các interface tương ứng nằm tại `frontend/src/features/public-portfolio/PublicPortfolioPage.tsx:5-25` và `frontend/src/features/live-demo/LiveDemoPage.tsx:23-42`.

### 4.2 `simulated_users.json`

`LiveDemoPage` dùng bốn tài khoản giả lập: 50M, 100M, 250M và 500M, được định nghĩa tại `frontend/src/features/live-demo/LiveDemoPage.tsx:97-104`.

Mỗi tier trong `frontend/public/simulated_users.json` chứa:

```text
user_tier
initial_capital
current_nav
cash_left
pnl_cash
pnl_pct
holdings[]
history[]
trade_history[]
ai_predictions[]
```

Dữ liệu được nạp vào local state tại `frontend/src/features/live-demo/LiveDemoPage.tsx:186-252`.

Các tier giả lập không đại diện cho user được xác thực. Backend không được nới lỏng ownership hoặc cho client truyền `userId` để duy trì cách demo này.

### 4.3 Live AI bị vô hiệu hóa

Đường gọi live backend hiện bị vô hiệu hóa bằng unconditional `throw` tại `frontend/src/features/live-demo/LiveDemoPage.tsx:277-283`. Vì vậy:

- `isLiveConnected` không bao giờ trở thành `true`.
- UI luôn fallback sang `history.json`.
- Nút chạy AI không gọi API thật.
- UI vẫn hiển thị `AI Brain Engine Active` khi không kết nối tại `frontend/src/features/live-demo/LiveDemoPage.tsx:495-508`.

Frontend còn tạo khoảng 11,5 giây delay giả lập và ghi log về HMM đa tầng/PPO tại `frontend/src/features/live-demo/LiveDemoPage.tsx:268-275`. Các log này không phải telemetry từ backend và phải bị loại bỏ hoặc gắn nhãn rõ là animation demo.

### 4.4 Hardcode trên landing và dashboard preview

Các số sau là presentation data, không phải backend output:

- VN-Index `1,286.45`, thay đổi `+1.32%`: `HeroGlobeWidget.tsx:208-238`.
- Risk level thấp/33%: `HeroGlobeWidget.tsx:241-290`.
- Sector allocation 28/22/18/32: `HeroGlobeWidget.tsx:294-335`.
- Confidence 92%, `Mua VCB`, `Giữ FPT`: `HeroGlobeWidget.tsx:338-377`.
- Tên `Minh Anh`, tổng tài sản 245.6M, lợi nhuận, health score, regime `Bullish`, hiệu suất +18.6%: `DashboardPreviewSection.tsx:55-155`.
- Dashboard sector allocation: `DashboardPreviewSection.tsx:157-184`.
- Social proof 4.9/5 và 10.000+ users: `HeroSection.tsx:78-100`.
- 10K+, 50M+, 92% AI accuracy, 25% growth: `TrustBannerSection.tsx:39-68`.

Backend không được tạo dữ liệu giả để làm cho các widget này trông như dữ liệu live. Frontend phải giữ chúng dưới nhãn `Demo/Minh họa`, hoặc thay bằng dữ liệu thật từ các endpoint tương ứng.

## 5. Assessment form và investment profile mapping

Assessment giữ local state tại `frontend/src/features/assessment/AssessmentModal.tsx:10-16`:

```text
riskTolerance = growth
primaryGoal = freedom
capital = 50k-250k
timeHorizon = 7-15
```

### 5.1 Risk appetite

Frontend có bốn giá trị tại `AssessmentModal.tsx:88-114`, trong khi backend có ba enum:

| Frontend legacy | Backend `RiskAppetite` | Ghi chú |
|---|---|---|
| `conservative` | `LOW` | Mapping trực tiếp hợp lý |
| `balanced` | `MEDIUM` | Mapping trực tiếp hợp lý |
| `growth` | `HIGH` | Mất một mức chi tiết |
| `aggressive` | `HIGH` | Mất một mức chi tiết |

Mapping `growth` và `aggressive` cùng thành `HIGH` là lossy. Phương án ưu tiên là thay UI bằng đúng ba giá trị backend. Nếu frontend vẫn giữ bốn lựa chọn, mapping phải được thực hiện công khai trong frontend adapter và không được backend đoán dựa trên label hiển thị.

### 5.2 Primary goal

Frontend có `retirement`, `freedom`, `house`, `family` tại `AssessmentModal.tsx:119-158`. Database design được yêu cầu hiện không có `primaryGoal`.

Frontend không nên gửi field này rồi kỳ vọng backend lưu trữ. Nếu product quyết định cần field, phải mở rộng domain/migration có chủ đích. Nếu không, field chỉ phục vụ UX và phải được loại khỏi request DTO.

### 5.3 Capital

Frontend dùng bucket USD dạng chuỗi tại `AssessmentModal.tsx:162-201`:

```text
1k-10k
10k-50k
50k-250k
250k+
```

Backend yêu cầu số VND chính xác và `capital >= 1,000,000`. Không có mapping đáng tin cậy từ bucket USD sang VND nếu không định nghĩa tỷ giá và quy tắc chọn giá trị trong khoảng. Frontend phải đổi form sang numeric VND, gửi JSON number/string decimal rõ ràng và hiển thị validation của backend.

### 5.4 Investment horizon

Frontend có bốn giá trị tại `AssessmentModal.tsx:205-244`:

| Frontend legacy | Backend `InvestmentHorizon` |
|---|---|
| `<3` | `SHORT_TERM` |
| `3-7` | `MEDIUM_TERM` |
| `7-15` | `LONG_TERM` |
| `15+` | `LONG_TERM` |

Frontend chưa thu `expectedReturn` hoặc `maximumDrawdown`. Không nên trích hai field này từ text mô tả risk. UI cần thêm input hoặc để backend nhận `null` nếu schema cho phép.

### 5.5 Completion flow hiện tại

`handleNext` chỉ chuyển step rồi đặt `isCompleted=true`; không submit API (`AssessmentModal.tsx:20-35`). Kết quả luôn hardcode:

- Strategy `Astera Dynamic Growth`.
- Sharpe ratio `2.15`.
- Asset-class allocation 50/25/15/10.

Các giá trị nằm tại `AssessmentModal.tsx:283-315` và không thay đổi theo câu trả lời. CTA `Mở tài khoản & Áp dụng danh mục này` chỉ đóng/reset modal tại `AssessmentModal.tsx:329-336`.

Flow mục tiêu:

```text
Register/Login
  -> POST hoặc PATCH /api/v1/investment-profile
  -> POST /api/v1/recommendations
  -> Render recommendation thật
  -> POST /api/v1/recommendations/{id}/confirm
  -> GET /api/v1/portfolios/current
```

## 6. Legacy field mapping sang API camelCase

Backend API dùng camelCase. Frontend nên có DTO adapter riêng và không tiếp tục đưa Vietnamese snake_case vào public API contract.

### 6.1 Recommendation/allocation

| Legacy frontend | Backend/API field | Ghi chú |
|---|---|---|
| `ma_co_phieu` | `symbol` hoặc `stock.symbol` | Không dùng tên tiếng Việt trong API |
| `so_lo` | Không có field lõi | Có thể derive từ `quantityEstimated`; chỉ là presentation rule lô 100 |
| `so_co_phieu` | `quantityEstimated` | Đây là số lượng ước tính, không phải holding thực |
| `gia_hien_tai` | `referencePrice` | Giá tham chiếu tại lúc sinh recommendation |
| `so_tien_chi` | `amount` | Decimal money |
| `ty_trong_goc_ppo` | `weight` | Chỉ map nếu nguồn thực sự là recommendation engine hiện hành; không gọi là PPO trong MVP rule-based |
| `ty_trong_thuc_te` | `weight` hoặc field rounded-allocation riêng | Phải định nghĩa một nguồn weight canonical |
| `used_capital` | `allocatedAmount` hoặc giá trị derive | Không nhất thiết cần persistence field riêng |
| `cash_left` | `cashAmount`/cash allocation | Nên biểu diễn rõ cash là một phần allocation |
| `tracking_error` | `metadata.trackingError` | Không phải core field trong schema hiện tại |
| `warning_flag` | Derive từ warning/explanation | Không tin dữ liệu do client gửi |
| `warning_msg` | `explanation` hoặc `metadata.warning` | Backend tạo, frontend chỉ render |
| `date` | `dataDate` hoặc `generatedAt` | Tùy context; dùng ISO-8601 |

### 6.2 Portfolio và performance

| Legacy frontend | Backend/API field | Ghi chú |
|---|---|---|
| `current_nav` / `nav` | `currentValue` / `totalValue` | Decimal money |
| `initial_capital` | `initialCapital` | Decimal money |
| `pnl_cash` / `delta_from_start` | `profitLoss` | Có thể derive từ snapshot |
| `pnl_pct` / `delta_pct_from_start` | `pnlPercent` | Decimal percentage |
| `cash` | `cashValue` nếu API performance expose | Hiện DB snapshot không có field riêng |
| `stock_value` | `investedValue` nếu API performance expose | Có thể derive |
| `daily_change` | `dailyProfitLoss` | Derive giữa snapshots |
| `daily_change_pct` | `dailyPnlPercent` | Derive giữa snapshots |
| `gia_von` | `entryPrice` | Giá ước tính của portfolio version |
| `gia_hien_tai` trong holding | `referencePrice` hoặc latest stock close | Không gọi là execution price |

### 6.3 Legacy trade/prediction fields

Các field dưới đây không có domain tương ứng trong backend MVP:

- `action: BUY|SELL`.
- `shares`, `price`, `total_cost` như một executed trade.
- Settlement status `UNLOCKED|LOCKED_T1|LOCKED_T2`.
- `buy_factor_pct`.
- `ret_t1`, `ret_t3`, `top_tickers`.

Không thêm trade execution model chỉ để giữ nguyên demo. Tab lịch sử nên chuyển sang recommendation history, portfolio versions và portfolio snapshots.

## 7. Screen/action sang endpoint mapping

### 7.1 Authentication và tài khoản

| Frontend action | Endpoint | Auth |
|---|---|---|
| Register | `POST /api/v1/auth/register` | Public |
| Login | `POST /api/v1/auth/login` | Public |
| Refresh session | `POST /api/v1/auth/refresh` | Refresh token |
| Logout | `POST /api/v1/auth/logout` | Refresh/access context |
| Forgot password | `POST /api/v1/auth/forgot-password` | Public, rate limited |
| Reset password | `POST /api/v1/auth/reset-password` | Reset token |
| Change password | `POST /api/v1/auth/change-password` | Bearer access token |
| Current session | `GET /api/v1/auth/me` | Bearer access token |
| User settings | `GET/PATCH /api/v1/users/me` | Bearer access token |
| Preferences | `GET/PATCH /api/v1/users/me/preferences` | Bearer access token |

### 7.2 Assessment và recommendation

| Frontend action | Endpoint |
|---|---|
| Load active profile | `GET /api/v1/investment-profile` |
| First profile submission | `POST /api/v1/investment-profile` |
| Update answers | `PATCH /api/v1/investment-profile` |
| Generate recommendation | `POST /api/v1/recommendations` |
| Recommendation list | `GET /api/v1/recommendations` |
| Recommendation details | `GET /api/v1/recommendations/{id}` |
| Confirm simulated allocation | `POST /api/v1/recommendations/{id}/confirm` |
| Dismiss recommendation | `POST /api/v1/recommendations/{id}/dismiss` |

Frontend không được gửi `userId`; backend xác định owner từ access token.

### 7.3 Market và AI Core

| Frontend action | Endpoint | Ghi chú |
|---|---|---|
| Current market badge | `GET /api/v1/market/regime/current` | Normalize thành `BULL`, `BEAR`, `SIDEWAY`, `UNKNOWN` |
| Regime timeline | `GET /api/v1/market/regimes` | Dùng pagination/filter contract |
| AI availability | `GET /api/v1/health/ai-core` | Hiển thị degraded/unavailable minh bạch |
| Trigger detect | `POST /api/v1/market/regime/detect` | Chỉ admin/internal; không đặt trên UI user thường |

`Sideways` trong copy frontend phải được chuẩn hóa thành `SIDEWAY` trong API. UI có thể dịch thành `Đi ngang` khi render.

### 7.4 Portfolio/dashboard

| Frontend view/action | Endpoint |
|---|---|
| Current simulated portfolio | `GET /api/v1/portfolios/current` |
| Performance cards/chart | `GET /api/v1/portfolios/current/performance` |
| Version history | `GET /api/v1/portfolios/current/versions` |
| Request recalculation | `POST /api/v1/portfolios/current/recalculate` |
| Generate rebalance proposal | `POST /api/v1/portfolios/current/rebalance` |
| Recommendation/history feed | `GET /api/v1/history` |
| History details | `GET /api/v1/history/{id}` |

Client không nên tự scale allocations hoặc tự tạo action plan như tại `PublicPortfolioPage.tsx:57-73` và `LiveDemoPage.tsx:401-465`. Backend phải trả recommendation đã validate, weight tổng bằng 1 và quantities ước tính phù hợp với capital/reference price.

### 7.5 Stocks

| Frontend view/action | Endpoint |
|---|---|
| Stock search/list | `GET /api/v1/stocks` |
| Stock details | `GET /api/v1/stocks/{symbol}` |
| Price chart | `GET /api/v1/stocks/{symbol}/history` |

History query cần dùng `range`, `interval`, `startDate`, `endDate` theo API contract. Search trong action table vẫn có thể làm client-side khi dataset nhỏ.

### 7.6 Notifications

Frontend hiện không có notification state, route, badge, list hoặc action. UI mới cần map:

| Frontend action | Endpoint |
|---|---|
| Notification list | `GET /api/v1/notifications` |
| Notification details | `GET /api/v1/notifications/{id}` |
| Mark read | `PATCH /api/v1/notifications/{id}/read` |
| Apply rebalance proposal | `POST /api/v1/notifications/{id}/apply` |
| Dismiss proposal | `POST /api/v1/notifications/{id}/dismiss` |

`apply` phải là hành động rõ ràng của user. Frontend không được tự apply khi polling thấy regime thay đổi.

## 8. Authentication integration requirements

Frontend cần triển khai tối thiểu:

1. Auth context/store chứa current user và access-token lifecycle.
2. Route guard cho profile, recommendations, portfolios, history và notifications.
3. Bearer token trên protected requests.
4. Một refresh request tại một thời điểm để tránh refresh stampede.
5. Retry request gốc tối đa một lần sau refresh thành công.
6. Logout local state khi refresh token hết hạn hoặc bị revoke.
7. Không log access token, refresh token, reset token hoặc password.
8. Không cho user chọn/truyền `userId` trong URL/body.

Refresh token nên ưu tiên cookie `HttpOnly`, `Secure`, `SameSite` phù hợp nếu backend contract hỗ trợ. Nếu token được trả trong response body, frontend phải xác định rõ storage/risk model; không tự mặc định lưu refresh token dài hạn trong `localStorage`.

## 9. Date, timezone và Decimal

### Dates

Mock hiện dùng `DD/MM/YYYY`. Helper `addDaysToDateStr` tại `frontend/src/features/live-demo/LiveDemoPage.tsx:106-124` cộng ngày calendar và coi ngày tiếp theo là ngày giao dịch tại `LiveDemoPage.tsx:397-400`.

Frontend tích hợp phải:

- Nhận date dạng `YYYY-MM-DD`.
- Nhận timestamp dạng ISO-8601 có timezone, ưu tiên UTC từ backend.
- Format sang `vi-VN` chỉ ở presentation layer.
- Không tự tính T+1 bằng cộng một calendar day; cần backend/market calendar nếu tính ngày giao dịch.

### Decimal and money

Backend dùng `Decimal`/`NUMERIC`; JavaScript `number` không đảm bảo chính xác cho mọi phép tính tiền và tỷ trọng.

Frontend cần:

- Chấp nhận decimal có thể được serialize dưới dạng string.
- Parse bằng thư viện decimal hoặc giữ string đến presentation layer với các phép tính quan trọng.
- Không dùng client-side floating-point để xác nhận tổng weight hay quyết định allocation.
- Xem backend là nguồn canonical cho `amount`, `weight`, `referencePrice`, `quantityEstimated`, `currentValue`, `profitLoss`.

## 10. Disclaimer và wording gây hiểu nhầm

Backend MVP là công cụ mô phỏng/hỗ trợ quyết định, không thực thi giao dịch. `LiveDemoPage` hiện dùng các cụm từ không phù hợp:

- `AI QUANTUM Live Trading Advisor`: `LiveDemoPage.tsx:491-494`.
- `Kế hoạch Đi lệnh`: `LiveDemoPage.tsx:586-598`.
- `MUA MỚI`, `MUA THÊM`, `BÁN BỚT`, `CHỐT LỜI HẾT`: `LiveDemoPage.tsx:820-850`.
- `Lịch sử giao dịch AI`: `LiveDemoPage.tsx:1043-1079`.
- `Xác nhận Đi lệnh` và alert `Đã gửi lệnh giao dịch`: `LiveDemoPage.tsx:1169-1181`.

Các cụm từ cần đổi thành:

- `AI Investment Simulation Advisor` hoặc `Trợ lý mô phỏng phân bổ`.
- `Đề xuất phân bổ`.
- `Tăng/Giảm tỷ trọng ước tính`.
- `Lịch sử đề xuất` hoặc `Lịch sử phiên bản danh mục`.
- `Xác nhận danh mục mô phỏng`.
- `Áp dụng đề xuất tái phân bổ vào danh mục mô phỏng`.

Frontend phải hiển thị disclaimer rõ ràng gần CTA confirm/apply:

> Astera MVP cung cấp mô phỏng và hỗ trợ quyết định, không đặt lệnh, không thực hiện giao dịch và không đại diện cho tài sản nắm giữ thực tế.

Backend không cung cấp buy/sell/executed-trade endpoint trong phạm vi MVP.

## 11. Model naming và AI transparency

Landing nói `HMM + PPO` tại `frontend/src/features/landing/sections/HowItWorksSection.tsx:25-28`. Live demo tiếp tục mô tả `PPO Agent` tại `LiveDemoPage.tsx:271-275`. Các field fixture cũng dùng tên `ty_trong_goc_ppo`.

Frontend chỉ được dùng tên PPO nếu có model PPO thật, artifact thật và backend adapter thật. Khi backend đang dùng `RuleBasedPortfolioRecommendationEngine`:

- Gọi HMM là market-regime detector.
- Gọi portfolio engine là rule-based MVP.
- Không gọi rule-based engine là PPO.
- Không hiển thị accuracy/confidence do frontend tự tạo.
- Nếu AI Core unavailable, hiển thị trạng thái degraded/unavailable từ health endpoint; không fallback im lặng rồi báo engine active.

## 12. Public demo và authenticated product boundary

API spec không định nghĩa public portfolio-history endpoint. Có hai hướng an toàn:

1. Giữ `/live-demo` và `/portfolio` là static demo, nhưng gắn nhãn rõ `Dữ liệu mô phỏng`, tuyệt đối không dùng token/user data và không báo kết nối AI live.
2. Chuyển các trang sang authenticated product flow và dùng `/recommendations`, `/portfolios/current`, `/portfolios/current/performance`, `/portfolios/current/versions`, `/history`.

Không nên tái sử dụng protected endpoints như public endpoint hoặc thêm query `userId/tier` để truy cập portfolio người khác.

## 13. Frontend changes required

### P0 — cần thiết để kết nối backend

- Thêm `VITE_API_URL` và API client tập trung.
- Implement success/error envelope parsing.
- Implement login/register/refresh/logout và route guards.
- Đổi assessment capital sang numeric VND và map enums chính xác.
- Submit investment profile và generate recommendation thật.
- Render recommendation từ backend; bỏ hardcoded result.
- Confirm recommendation bằng endpoint, không dùng alert.
- Thay static current portfolio/performance/history bằng protected APIs.
- Hiển thị AI Core unavailable minh bạch.
- Loại wording giao dịch thật và thêm disclaimer.

### P1 — hoàn thiện product flow

- Thêm account/preferences pages.
- Thêm notification badge/list/detail/apply/dismiss flow.
- Thêm recommendation list/detail/dismiss.
- Thêm portfolio version và snapshot history.
- Thêm global loading, empty, error, 401/403/404 states.
- Hiển thị `requestId` trong error support details.

### P2 — dữ liệu presentation

- Gắn nhãn hoặc thay toàn bộ hardcoded landing metrics.
- Thay fake AI thinking logs bằng trạng thái job/API thật hoặc animation được ghi rõ là demo.
- Chuẩn hóa thuật ngữ `SIDEWAY` ↔ `Đi ngang` ở presentation layer.
- Loại các claim PPO/accuracy không có bằng chứng từ model thực.

## 14. Backend compatibility principles

Backend nên ưu tiên domain model và security contract đã định nghĩa, không tái tạo các bất cập của mock frontend:

- Không thêm mock regime hoặc hardcode confidence.
- Không trả raw arrays ngoài response envelope.
- Không nhận Vietnamese legacy fields trong public contract nếu không có compatibility layer được ghi rõ.
- Không nhận `userId` để bypass ownership.
- Không tạo trade execution semantics.
- Không gọi rule-based recommendation là PPO.
- Không cho user thường trigger AI detection job nặng.
- Không biến static demo tiers thành user accounts.

Frontend adapter là nơi phù hợp để chuyển legacy display fields sang camelCase trong giai đoạn migration. Sau khi migration hoàn tất, các interface legacy và static JSON không nên còn nằm trên production data path.
