# Tối ưu hóa Danh mục Đầu tư bằng Thuật toán Học tăng cường PPO

## PHẦN 1: TỔNG QUAN VỀ PPO TRONG DỰ ÁN

PPO Proximal Policy Optimization. PPO là một thuật toán học tăng cường sâu, dùng để cải thiện hiệu suất học của mô hình thông qua học tăng cường. Đối với PPO chúng ta sẽ có: 
Agent, Enviroment, Action, Reward. 

Chính sách là một chiến lược hoặc tập hợp các quy tắc mà agent tuân theo để dựa chọn một hành động tối ưu cụ thể dựa trên môi trường hiện tại của nó (state).

Vậy làm thế nào mà PPO nó học được (cải thiện mô hình). PPO sẽ học chính sách (Policy learning). Có 2 cách học được:

**1. Value-base method (Phương pháp dựa trên giá trị)**
PPO sẽ đánh giá môi trường và xác định hành động tốt nhất tại state đó dựa trên phần thường nhận được mong muốn. Tất cả mọi hành động khả thi được đánh giá và agent sẽ lựa chọn hành động với phần thường được nhận về cao nhất. Vậy để xác định hành động nào là tốt nhất thì agent tập trung vào việc học hàm giá trị là hàm được dùng để đo lường tính toán phần thường mong muốn nhận về với mỗi môi trường hoặc các cặp môi trường. Chính sách nó gián tiếp vận chuyển bằng việc lựa chọn hành động mà tối ưu giá trị đo lường dựa trên một giá trị. 

**2. Policy-base method (Phương pháp dựa trên chính sách)**
Như tôi đã nói chính sách là chiến lược hoặc tập hợp các quy tắc luật lệ mà agent tuân thủ để lựa chọn một hành động cụ thể nào đó. Chính sách nó sẽ cung cấp một phương pháp ánh xạ trạng thái của môi trường với các hành động khả thi mà agent nên sử dụng. Chính sách nó có thể đơn giản, với các hành động được cụ thể tạo mỗi state của môi trường, cũng có thể phức tạp với các chính sách là sự kết hợp giữa đo lường lợi ích và tính toán để lấy và học cơ chế để xác định hành động tối ưu. Mục tiêu chính là để tìm ra chính xác tối ưu tính toán phần thưởng nhận được của agent qua mỗi lần.

Với việc học dựa trên chính sách cũng sẽ chia làm 2 phương pháp cơ bản:
*   **Cách phương pháp theo chính sách (On-policy):** Chính sách đó chỉ dẫn cho các hành động của agent với các môi trường bao gồm trong đó bao gồm qua trình đưa ra quyết định trong lúc học. Agent sẽ đánh giá đầu ra dựa trên hành động hiện tại và hoàn thiện chiến lược từng bước. 
*   **Các phương pháp ngoài chính sách (Off-policy):** Phương pháp này sẽ học này sẽ cho phép agent họ từ việc quan sát chính sách tối ưu mà không cần phải theo nó.

**Policy Gradien (Chính sách hội tụ)**
Là học theo chính sách cho phép tạo ra các mà nó sẽ trực tiếp tối ưu chính sách của bản thân nó bằng việc theo dõi việc hội tự của giá trị trả về mong muốn với sự kỳ vọng của điều khoản chính sách. Nó khá giống SGD. Hội tụ chích sách còn được gọi là phương pháp diễn viên và nhà phê bình (Actor-Critic). Diễn viên (Actor) sẽ là mạng lưới chính sách, nó sẽ lựa chọn các hành động và nhà phê bình (Critic) sẽ đánh giá chính sách đó sẽ khớp với hành động ở trạng thái đó với một phần thưởng cụ thể tốt như thế nào.

**Clipped surrogate objective funciton**
Là việc ràng buộc việc nâng cấp cáng chính sách với hàm mục tiêu bị cắt xé, nó sẽ ràng buộc chính sách và thay đổi phạm vi cụ thể. Nó sẽ làm cho các thay đổi nhỏ và tính toán hiệu quả hơn, chống lại việc mô hình bị sụp đổ do biến động nhiễu.

**Đối với trong dự án PPO:**
*   **Agent:** Mô hình PPO (Bộ não AI).
*   **Action:** Danh sách các mã đầu tư phân bổ (Tỷ trọng danh mục).
*   **State:** Tất cả thông tin trong một ngày đó (Biểu đồ, chỉ báo kỹ thuật).
*   **Reward:** Các hàm đã được thiết kế (Tính toán lợi nhuận và phạt rủi ro).

---

## PHẦN 2: TRIỂN KHAI VÀ WORKFLOW THỰC TẾ TRONG DỰ ÁN

### 1. Khởi tạo Dữ liệu và Môi trường Ảo (gym.Env)
Hệ thống tải dữ liệu bối cảnh thị trường vào Môi trường Ảo (`AdvancedPortfolioEnv`) thông qua các biến cấu hình đầu vào: 
*   `return_df` (để tính lãi/lỗ dựa trên log return)
*   `ai_feature_df` (các chỉ báo kỹ thuật dành cho AI học)
*   `strategies_feature_df` (dữ liệu dự báo chỉ số kịch bản)
*   Danh sách mã cổ phiếu (`ticker`, `weights_dim`) và trục thời gian (`dates`). 

Sau đó, môi trường `AdvancedPortfolioEnv` này được "Vector hóa" (Vectorized Environment) cho phép xử lý đồng bộ và chạy song song nhiều thị trường giả lập cùng lúc để AI học nhanh hơn.

### 2. "Cặp mắt" của AI: Mạng Nơ-ron Tùy chỉnh `AdvancedTickerExtractor`
Trước khi đưa dữ liệu vào thuật toán PPO, chúng ta không dùng mạng nơ-ron thô sơ mặc định mà thiết kế riêng lớp **`AdvancedTickerExtractor`**. Nó đóng vai trò tiền xử lý dữ liệu vô cùng tinh vi qua 3 tầng kiến trúc:
*   **Tầng 1 (Local):** Phân tích độc lập biểu đồ, chỉ báo của *từng mã cổ phiếu* để xem mã nào khỏe, mã nào yếu.
*   **Tầng 1.5 (Cross-Ticker Attention):** Sử dụng cơ chế Attention (Multihead Attention), cho phép các cổ phiếu "giao tiếp" và so sánh chéo sức mạnh với nhau để tìm ra con *Dẫn sóng (Leader)* đang hút tiền nhất trên thị trường.
*   **Tầng 2 (Global):** Nén tất cả các góc nhìn trên thành một bức tranh cục diện thị trường tổng thể (global features), sau đó mới truyền sang cho PPO Actor & Critic để ra quyết định.

### 3. Quy trình Xử lý Lệnh (Hàm `step` trong Môi trường ảo)
Tại Bước khởi tạo huấn luyện, chúng ta thiết lập PPO với các tham số cốt lõi (tốc độ học `learning_rate`, số bước `n_steps`, hệ số khám phá `ent_coef`...). Sau đó, AI bắt đầu vòng lặp giao dịch (Hàm `step`) chạy qua 5 chốt chặn thực tế:

1.  **AI gửi Action (Tỷ trọng mục tiêu):** AI nạp vào mảng tỷ trọng (VD: 30% HPG, 20% FPT). Nếu tổng lớn hơn 1.0 (100%), hệ thống tự động chuẩn hóa.
2.  **Ràng buộc Luật T+3 (Cơ chế FIFO):** Code áp dụng hàng đợi FIFO mô phỏng luật chứng khoán Việt Nam. Cổ phiếu vừa mua sẽ bị khóa lại chờ hàng về (`locked_weights`). AI chỉ được phép bán tối đa bằng với số cổ phiếu đã mở khóa (`weight_unlocked`). Lệnh vượt quá giới hạn sẽ bị ép giảm xuống.
3.  **Thanh toán Phí giao dịch (Turnover Cost):** Sàn đo lường tổng khối lượng cổ phiếu thay đổi trong ngày (Turnover) và trừ thẳng Phí giao dịch + Thuế (`cost_rate`) vào tài khoản để tránh giao dịch lướt sóng quá đà.
4.  **Tính Lợi nhuận (Daily Return):** Hệ thống chốt tỷ suất sinh lời bằng cách lấy tỷ trọng hiện tại nhân với giá thị trường ở ngày tương lai (T+3) nhằm khắc phục lỗi Lookahead Bias, sau đó cập nhật số dư tài khoản (NAV).
5.  **Phân xử Thưởng/Phạt (Reward Function):** 
    *   *Thưởng cơ bản:* Lợi nhuận nhân 100.
    *   *Phạt lỗ:* Nếu lợi nhuận ròng âm, điểm phạt nhân đôi (`* 2.0`) nhằm rèn tính an toàn.
    *   *Phạt Drawdown:* Đo lường sụt giảm tài sản so với đỉnh (Peak NAV). Nếu tài sản tiếp tục tụt, trừ điểm cực nặng (`dd_increase * 1000`).
    *   *Game Over:* Nếu Drawdown quá mức 30%, kết thúc ngay phiên giao dịch kèm án phạt -100 điểm.

Cuối cùng, hệ thống gom **Điểm Reward** và **Dữ liệu biểu đồ của ngày hôm sau (State mới)** gửi ngược lại cho mạng PPO. Chu trình này lặp lại liên tục cho đến khi AI tối ưu hóa được phần thưởng và hoàn thiện chiến lược.
