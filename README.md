# 🚀 AI QUANTUM TRADING
**End-to-End Deep Reinforcement Learning System for VN100 Stock Market**

![AI QUANTUM](https://img.shields.io/badge/AI-QUANTUM-blue.svg?style=for-the-badge&logo=quantopian) ![Python 3.10+](https://img.shields.io/badge/Python-3.10+-yellow.svg?style=for-the-badge&logo=python) ![Stable Baselines 3](https://img.shields.io/badge/RL-Stable_Baselines3-red.svg?style=for-the-badge) ![LightGBM](https://img.shields.io/badge/Model-LightGBM-green.svg?style=for-the-badge) 

AI QUANTUM là một hệ thống Giao dịch Định lượng (Quantitative Trading) hoàn chỉnh, được thiết kế chuyên biệt cho thị trường chứng khoán Việt Nam (VNINDEX / VN100). Hệ thống kết hợp giữa Mô hình học không giám sát (**Hidden Markov Model**) để phân tích rủi ro thị trường và Học tăng cường sâu (**Proximal Policy Optimization - PPO**) để tối ưu hóa quyết định phân bổ vốn.

> **Trạng thái hiện tại:** Đang trong giai đoạn nâng cấp lên phiên bản **V9**. Nâng cấp không gian quan sát từ 44 lên 50 Features (Bổ sung các biến số vĩ mô lõi: CPI, M2, PMI). Toàn bộ kiến trúc thuật toán và các luật giao dịch khắt khe đã được tài liệu hóa chi tiết tại `ai_quantum_pipeline.md`.

---

## 🌟 TÍNH NĂNG NỔI BẬT ĐỘC QUYỀN

Khác biệt với các dự án nghiên cứu học thuật thông thường, AI QUANTUM được thiết kế với **Tư duy Thực chiến (Real-world Practicality)**, giải quyết triệt để các bài toán hóc búa nhất của chứng khoán Việt Nam:

1. **🔒 T+2.5 Settlement Lock (Khóa Hàng):** Môi trường huấn luyện (Gym Environment) ép AI tuân thủ nghiêm ngặt luật T+2.5. Hàng mua xong bị nhốt 3 ngày, AI tuyệt đối không thể lướt sóng T+0 và bắt buộc phải học cách dự báo xu hướng dài hạn.
2. **🎯 Chiến lược Tập trung (Top 5 Stock Picking):** Thay vì dàn trải vốn, ở chế độ thực chiến (Simulation/Live), hệ thống tự động lọc ra 5 mã cổ phiếu mạnh nhất mà AI dự phóng và dồn 100% vốn vào 5 mã này. Điều này giúp tối đa hóa tỷ suất sinh lời (Alpha vượt trội) và tận dụng triệt để sức mạnh phân tích của mô hình PPO.
3. **🧠 Cross-Ticker Attention Network:** Lõi thần kinh PPO được trang bị cơ chế Attention, cho phép AI "nhìn" toàn cảnh rổ VN100 cùng lúc để tự động phát hiện Cổ phiếu dẫn dắt (Leader) và rút vốn khỏi Cổ phiếu yếu kém (Laggard).
4. **📊 Lọc Nhiễu Chống Rò Rỉ (No Look-ahead Bias):** Kỹ thuật `merge_asof(direction="backward")` trong xử lý dữ liệu và lùi thời gian vĩ mô (Publication Lag 1 tháng) đảm bảo AI không ăn gian bằng cách nhìn trộm tương lai.
5. **⚠️ Kỷ Luật Rủi Ro (Drawdown Penalty):** Phạt AI cực nặng (Game Over) nếu để sụt giảm tài khoản (Drawdown) vượt ngưỡng 30% trong quá trình học. Ở chế độ kiểm thử, hệ thống tích hợp Stop-Loss để bảo vệ vốn.
6. **🧮 Trình Đi Lệnh Lô Chẵn & Ghi Log Trực Quan:** Module *Robo-Advisor Execution* tính toán chính xác số lượng mua/bán theo lô 100 cổ phiếu. Toàn bộ lịch sử giao dịch (Mã, Số lượng, Giá, Lãi/Lỗ, Phí GD) được lưu tự động ra file CSV để dễ dàng đối soát bằng Excel.

---

## 🏗️ KIẾN TRÚC HỆ THỐNG (4 PHÂN HỆ)

Hệ thống vận hành liền mạch qua 4 bước khép kín (End-to-End):

*   🟢 **Phase 1: Data Crawling (Incremental)**
    *   Tự động tải dữ liệu VN100, Vĩ mô (YFinance, FRED, GSO). Tối ưu hóa băng thông bằng cơ chế tải nối tiếp (Incremental Update).
*   🟡 **Phase 2: Data Processing & Normalization**
    *   Sát nhập dữ liệu ngày/tháng, khử nhiễu (Winsorization) và ép phân phối (Normal Quantile Transform - NQT).
*   🟠 **Phase 3: Multi-Layer HMM (Nhận diện Trạng thái)**
    *   Train HMM xếp chồng 4 tầng: `Macro -> Market -> Sector -> Ticker`. AI sẽ nhận diện được thị trường đang ở chu kỳ Bò (Bull), Gấu (Bear) hay Đi ngang (Sideway).
*   🔴 **Phase 4: PPO Reinforcement Learning**
    *   Mô hình AI học cách đi tiền, tối ưu hóa phần thưởng (Sharpe Ratio) và tránh Drawdown thông qua thuật toán PPO tiên tiến.
*   🟣 **Phase 5: Evaluation & Simulation**
    *   **`evaluate.py`**: Chạy Backtest diện rộng trên toàn bộ các Seed Models để lọc ra cấu hình tạo mức sinh lời cao nhất.
    *   **`analyze_seed.py`**: Đi sâu bóc tách hành vi của 1 mô hình cụ thể (Tốc độ xoay vòng vốn, % Tiền mặt, Alpha/Beta) và kết xuất tệp `detailed_transaction_log.csv`.

*Chi tiết thuật toán vui lòng xem tại: [ai_quantum_pipeline.md](./ai_quantum_pipeline.md)*

---

## 🚀 HƯỚNG DẪN SỬ DỤNG

Hệ thống được điều phối hoàn toàn tự động bởi "Nhạc trưởng" `run_pipeline.py`. 
Bạn chỉ cần chạy 1 lệnh duy nhất mỗi ngày sau giờ giao dịch:

```bash
python run_pipeline.py
```

Luồng chạy tự động bao gồm:
1. `CRAWL_INDUSTRY`, `CRAWL_MACRO`, `CRAWL_STOCK` (Chỉ cập nhật dữ liệu mới của ngày hôm nay).
2. `DATA_PROCESSING` (Cập nhật và Normalize Z-Score).
3. `HMM_CORE` (Dự phóng trạng thái rủi ro cho ngày mai).
4. `PPO_RL_TRAINING` (Huấn luyện bổ sung và xuất lệnh Mua/Bán/Nắm giữ lô chẵn cho ngày mai).

---
*Developed for Quantitative Trading on Vietnam Stock Market.*
