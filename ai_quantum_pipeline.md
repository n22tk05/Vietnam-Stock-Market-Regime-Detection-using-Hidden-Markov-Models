# Phân Tích Chuyên Sâu: Luồng Dữ Liệu & Hoạt Động Của Hệ Thống AI QUANTUM

Tài liệu này giải thích một cách cặn kẽ cách hệ thống giao dịch tự động AI QUANTUM của bạn vận hành, dòng chảy của dữ liệu qua từng thư mục, sự biến đổi của dữ liệu, và cách các thuật toán AI (HMM và PPO) phối hợp với nhau để ra quyết định giao dịch.

---

## 1. Sơ Đồ Kiến Trúc Luồng Dữ Liệu (Data Flow Architecture)

Hệ thống của bạn được chia thành 4 phân hệ chính, hoạt động nối tiếp nhau theo kiểu **Pipeline** (Đầu ra của bước trước là Đầu vào của bước sau).

> [!NOTE]
> **Data Pipeline Flow:** 
> `Crawl` -> `Data Processing` -> `HMM Model (Nhận diện trạng thái đa tầng)` -> `PPO Model (Học Tăng Cường & Phân Bổ Vốn)`

---

## 2. Chi Tiết Từng Phân Hệ & Sự Biến Đổi Dữ Liệu

### 🟢 Bước 1: Thu Thập Dữ Liệu Chuyên Sâu (Data Crawling)
**Đường dẫn:** `c:\Users\ADMIN\Desktop\AIQUANTUM\crawl`

Dựa trên mã nguồn thực tế của hệ thống, luồng Crawl được chia thành 3 file chuyên trách. Hệ thống xử lý dữ liệu cổ phiếu cực kỳ thông minh khi tích hợp cả hai cơ chế **Initial Load (Tải lần đầu)** và **Incremental Update (Cập nhật hằng ngày)** vào cùng một file duy nhất giúp tiết kiệm tài nguyên.

#### 2.1. File `crawl_stock.py` (Khởi tạo & Cập nhật Dữ liệu Cổ phiếu Toàn Diện)
*   **Mục đích:** File trung tâm lo toàn bộ việc tải OHLCV cho các cổ phiếu, vừa làm nhiệm vụ cào lịch sử dài hạn, vừa cập nhật nối tiếp hằng ngày.
*   **Cách hoạt động (Tự động nhận diện ngữ cảnh):**
    *   **Nếu chạy lần đầu:** Tự động tải danh sách 100 mã cổ phiếu lớn nhất (`VN100`), cào dữ liệu từ `2016-11-10`. Loại bỏ mã không đủ `2300` phiên và tạo `success_tickers.txt`.
    *   **Nếu chạy các ngày tiếp theo:** Đọc `success_tickers.txt`, quét ngày cuối cùng của từng CSV và gọi API để lấy phần còn thiếu nối vào (Incremental).

#### 2.2. File `crawl_marco.py` (Dữ liệu Vĩ mô & Liên thị trường khổng lồ)
*   **Dữ liệu thu thập:** YFinance (VIX, S&P500, Tỷ giá, Dầu, Vàng, DXY, US10Y); FRED & GSO (Lãi suất, EPU, CPI, FDI).
*   **Dữ liệu mô phỏng (Fallback):** Dùng Random Noise/Sine Wave để giả lập (mock) các biến thiếu API (PMI, M2, Tăng trưởng tín dụng) chống lỗi rỗng (NaN).

#### 2.3. File `crawl_industry.py` (Ánh xạ Nhóm Ngành)
*   **Đầu ra:** File `industries.csv` lưu bản đồ ngành (Sector mapping) cho toàn bộ thị trường.

---

### 🟡 Bước 2: Tiền Xử Lý Phức Hợp (Data Processing Pipeline)
**Đường dẫn:** `c:\Users\ADMIN\Desktop\AIQUANTUM\data_processing\pipeline.py`

File `pipeline.py` đóng vai trò "Nhà máy tinh luyện dữ liệu" qua 3 giai đoạn và 8 tiến trình con:

1.  **Giai đoạn 1 (Tính toán Cơ sở):** Tính Log Return, Đạo hàm (Diff), Volatility cho cổ phiếu và vĩ mô thông qua `m1.py` và `derived_variable.py`.
2.  **Giai đoạn 2 (Căn chỉnh & Khớp an toàn):** `process_pipeline.py` ghép dữ liệu tháng (CPI, PMI) vào dữ liệu ngày bằng lệnh `pd.merge_asof(direction="backward")` để chống Look-ahead Bias. Xử lý nhiễu bằng Winsorization và chuẩn hóa Z-Score.
3.  **Giai đoạn 3 (Phân rã & NQT):** `market_variable.py` tính toán sức mạnh thị trường chung (Market Proxy) và áp dụng chuẩn hóa Normal Quantile Transform (NQT) ép dữ liệu về phân phối Gaussian. Ra file `final_model_data.csv`.

---

### 🟠 Bước 3: Mô Hình Nhận Diện Trạng Thái (HMM Đa Tầng)
**Đường dẫn:** `c:\Users\ADMIN\Desktop\AIQUANTUM\model\HMM\a.py`

Phân hệ này giải quyết bài toán phân mảnh thị trường từ vĩ mô xuống tận cổ phiếu đơn lẻ thông qua kiến trúc **Multi-Layer Hidden Markov Model**.

Đầu vào là `final_model_data.csv`. Kịch bản thực hiện gán nhãn chế độ thị trường theo cấu trúc thác nước (Waterfall):
1.  **Lọc Đặc Trưng (Feature Selection):** Kiểm tra tính dừng (Stationarity). Tính điểm SHAP và Mutual Information (MI), sau đó loại bỏ đa cộng tuyến bằng VIF.
2.  **Tầng 1 - Macro HMM (Vĩ mô):** Huấn luyện HMM trên dữ liệu Vĩ mô (Theo tháng). Kỹ thuật đặc biệt: Xác suất vĩ mô được *Shift lùi 1 tháng* để giả lập độ trễ báo cáo (Publication Lag).
3.  **Tầng 2 - Market HMM (Thị trường chung):** Dùng dữ liệu thị trường ngày + Xác suất Macro (Tầng 1) để huấn luyện. Thuật toán tự tìm ra K (Số trạng thái) tối ưu bằng BIC/OOS Score và gán nhãn tự động (Bull/Bear/Sideways).
4.  **Tầng 3 - Sector HMM (Nhóm Ngành):** Tự động Grid Search K tốt nhất cho từng nhóm ngành.
5.  **Tầng 4 - Ticker HMM (Cổ phiếu):** Gom TẤT CẢ xác suất từ Vĩ Mô + Thị Trường + Ngành ghép với chỉ báo riêng của cổ phiếu để train ra Trạng thái ẩn của chính cổ phiếu đó.
*   **Dữ liệu Đầu ra (Input cho PPO):** File `master_ticker_hmm_results.csv` chứa ma trận xác suất và các trạng thái thị trường (Market Regime) để cung cấp cho mô hình Học Tăng Cường (PPO).

---

### 🔴 Bước 4: Trí Tuệ Nhân Tạo Học Tăng Cường (PPO & Neural Network)
**Đường dẫn:** `c:\Users\ADMIN\Desktop\AIQUANTUM\model\PPO\ppo.py`

Đây là "Trái tim" của hệ thống giao dịch, nơi AI học cách ra quyết định mua/bán dựa trên dữ liệu lịch sử và các chế độ thị trường (Regime) từ Bước 3. Khác với các thuật toán ML truyền thống, PPO (Proximal Policy Optimization) ở đây được tinh chỉnh cực kỳ sâu sát với luật chơi thực tế của chứng khoán Việt Nam.

#### 4.1. Kiến trúc Não bộ AI (Advanced Ticker Extractor)
AI không đọc dữ liệu một cách rời rạc, mà sử dụng cơ chế mạng nơ-ron tiên tiến:
*   **Tầng Local (Mổ xẻ cá nhân):** Đọc các chỉ số riêng của từng cổ phiếu (HMM Probabilities, MACD, RSI, Price).
*   **Tầng Cross-Ticker Attention (Giao tiếp nhóm):** Các cổ phiếu được đưa qua lớp *MultiheadAttention*, cho phép AI "nhìn" toàn bộ rổ VN100 cùng lúc để nhận diện cổ phiếu nào đang là **Leader (Cổ phiếu dẫn dắt)** và cổ phiếu nào đang là Laggard, từ đó rút vốn từ mã yếu sang mã mạnh.

#### 4.2. Môi trường Giao dịch Mô phỏng (Advanced Portfolio Env)
Môi trường (Gym) ép AI phải tuân thủ nghiêm ngặt các quy luật khắc nghiệt nhất của thị trường:
*   **Khóa T+2.5 (Settlement Lock):** Sử dụng hàng đợi FIFO (First In, First Out). Khi AI mua một cổ phiếu, số hàng đó sẽ bị "nhốt" lại (T+2.5). Dù thị trường có sập mạnh vào ngày T+1 hay T+2, AI cũng *tuyệt đối không thể bán cắt lỗ*, ép buộc mô hình phải học cách dự báo tầm xa thay vì lướt sóng T+0 ảo tưởng.
*   **Chống Lookahead Bias tuyệt đối:** Phần thưởng (Reward) của AI được tính bằng biến động giá của ngày T+3 so với ngày mua, đảm bảo không có rò rỉ giá tương lai.

#### 4.3. Hệ thống Thưởng - Phạt Kỷ luật thép (Reward Function)
*   **Phạt Phí Giao Dịch (Turnover Penalty):** AI bị trừ điểm mạnh nếu mua bán quá nhiều (Churning), ép AI phải giữ lệnh dài hơn nếu xu hướng vẫn còn.
*   **Trừng phạt Sụt giảm (Drawdown Penalty):** Nếu tài sản đỉnh (Peak NAV) bị sụt giảm quá mạnh, AI sẽ bị phạt điểm lũy tiến. Nếu lỗ quá 30%, môi trường sẽ đánh lệnh **GAME OVER**, lập tức tiêu diệt vòng huấn luyện đó để AI sợ hãi và tự học cách bảo vệ vốn.

#### 4.4. Module Cố Vấn Tự Động (Robo-Advisor Execution Logic)
Hệ thống không dừng lại ở mức lý thuyết học thuật (ví dụ: xuất ra quyết định mua 13.52% mã A). Thay vào đó, nó được trang bị một bộ quy đổi thực chiến chuyên nghiệp:
*   **Xử lý bài toán số nguyên (Lot Sizing):** Hệ thống lấy số vốn thực tế của người dùng, làm tròn xuống để tính ra **chính xác số lượng lô chẵn 100 cổ phiếu** có thể mua, tuân thủ tuyệt đối quy định của Sàn giao dịch.
*   **Tối ưu hóa dòng tiền (Greedy Refill):** Số tiền lẻ còn dư sau khi làm tròn lô sẽ được thuật toán tự động phân bổ nốt vào các mã có độ ưu tiên cao nhưng thị giá rẻ, đảm bảo vòng quay vốn đạt hiệu suất tối đa (giảm thiểu Cash Drag).
*   **Quản trị rủi ro quy mô:** Hệ thống tự động theo dõi và cảnh báo mức độ sai lệch danh mục (Tracking Error) trong trường hợp tổng vốn của người dùng quá nhỏ, không đủ để tái tạo danh mục đa dạng như AI mong muốn.

---

## 3. Prompt Đề Xuất (Sơ đồ Kiến trúc AI)


> A comprehensive, professional corporate fintech infographic diagram on a pure crisp white background, visualizing a 5-layer hierarchical AI Robo-Advisor architecture for VN100 stock trading. Clear top-to-bottom structured flow with interconnected modular blocks and bold text headers: Layer 1: DATA INGESTION (three input nodes labeled "VN100 OHLCV Prices", "YFinance Global Macro", and "FRED/GSO Economics" merging into a purple box labeled "Incremental Data Warehouse"). Layer 2: PROCESSING & NORMALIZATION (two connected orange boxes labeled "Backward Time-Alignment Merger" and "Normal Quantile Transform (NQT)", outputting a "Z-Score Feature Matrix"). Layer 3: MULTI-LAYER HMM REGIME DETECTION (a central brown box labeled "Stacked Hidden Markov Model" splitting into "Macro/Market/Sector Probabilities" and "Ticker-Specific Regimes"). Layer 4: PPO RL CORE (two blue feeding nodes labeled "Cross-Ticker Attention Neural Network" and "Reward: T+3 Settlement & Drawdown Penalty" flowing into a deep blue central core labeled "PPO Agent"). Layer 5: ROBO-ADVISOR EXECUTION (a green box labeled "Target Allocation Weights w_t" flowing into "Lot Sizing & Greedy Refill Algorithm", outputting to "Automated Order Execution" and "Client Dashboard"). A continuous feedback loop arrow labeled "Daily Walk-Forward Rebalancing Loop" connects Step 5 back to Step 2. Sleek modern 2D flat design with subtle 3D depth, blue, purple, orange, and emerald green corporate color palette, sharp vector art, ultra-precise architectural diagram, 8k resolution --ar 16:9 --v 6.0

