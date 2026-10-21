import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { useNavigate } from 'react-router-dom';

interface AssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (capital: number) => void;
}

export const AssessmentModal: React.FC<AssessmentModalProps> = ({ isOpen, onClose, onComplete }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState({
    risk: 'conservative',
    goal: 'freedom',
    capital: '100000000',
    horizon: 'short',
  });

  if (!isOpen) return null;

  const handleNext = () => {
    if (step < 4) {
      setStep((prev) => prev + 1);
    } else {
      setStep(5);
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => prev - 1);
    }
  };

  const handleApply = () => {
    localStorage.setItem('aiquantum_capital', answers.capital);
    localStorage.setItem('aiquantum_risk', answers.risk);
    if (onComplete) {
      onComplete(parseInt(answers.capital, 10));
    }
    onClose();
    navigate(`/dashboard?capital=${answers.capital}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-10 shadow-2xl relative border border-slate-200 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center font-bold text-lg cursor-pointer transition-colors"
        >
          &times;
        </button>

        {step <= 4 ? (
          <div>
            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                <span>BƯỚC {step} / 4</span>
                <span className="text-blue-600">KHẢO SÁT HỒ SƠ RỦI RO AI</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                  style={{ width: `${(step / 4) * 100}%` }}
                />
              </div>
            </div>

            {/* Step 1 */}
            {step === 1 && (
              <div>
                <h3 className="text-2xl font-extrabold text-slate-900 mb-2">
                  Khẩu vị rủi ro đầu tư của bạn là gì?
                </h3>
                <p className="text-sm text-slate-600 mb-6">
                  Mô hình AI sẽ tự động thiết lập giới hạn mức sụt giảm tối đa (Max Drawdown) phù hợp với tâm lý của bạn.
                </p>

                <div className="space-y-3">
                  {[
                    { id: 'conservative', title: 'An toàn (Conservative)', desc: 'Ưu tiên bảo toàn vốn tuyệt đối, chấp nhận mức sinh lời ổn định 6-9%/năm.' },
                    { id: 'balanced', title: 'Cân bằng (Balanced)', desc: 'Tăng trưởng ổn định với mức biến động vừa phải, kỳ vọng 12-16%/năm.' },
                    { id: 'growth', title: 'Tăng trưởng (Growth)', desc: 'Tối ưu hóa lợi nhuận dài hạn, chịu được rung lắc ngắn hạn 18-25%/năm.' },
                    { id: 'aggressive', title: 'Bứt phá (Aggressive)', desc: 'Chấp nhận biên độ biến động cao để tối đa hóa hiệu suất Alpha >25%/năm.' },
                  ].map((opt) => (
                    <div
                      key={opt.id}
                      onClick={() => setAnswers({ ...answers, risk: opt.id })}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                        answers.risk === opt.id
                          ? 'border-blue-600 bg-blue-50/50 text-slate-900'
                          : 'border-slate-200 hover:border-blue-300 bg-white'
                      }`}
                    >
                      <div>
                        <div className="font-extrabold text-sm text-slate-900">{opt.title}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{opt.desc}</div>
                      </div>
                      {answers.risk === opt.id && (
                        <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                          &#10003;
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div>
                <h3 className="text-2xl font-extrabold text-slate-900 mb-2">
                  Mục tiêu tài chính quan trọng nhất?
                </h3>
                <p className="text-sm text-slate-600 mb-6">
                  Xác định mục đích giúp thuật toán phân bổ tỷ trọng dòng tiền và độ kiên nhẫn nắm giữ danh mục.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { id: 'freedom', title: 'Tự do tài chính (FIRE)', desc: 'Độc lập tài chính sớm với dòng tiền bền vững.' },
                    { id: 'retirement', title: 'Hưu trí an nhàn', desc: 'Tích lũy tài sản dài hạn bảo vệ sức mua.' },
                    { id: 'house', title: 'Tích lũy mua BĐS / Nhà', desc: 'Gia tăng giá trị vốn nhanh để mua tài sản lớn.' },
                    { id: 'family', title: 'Di sản & Cho con cái', desc: 'Quỹ giáo dục chất lượng cao và chuyển giao tài sản.' },
                  ].map((opt) => (
                    <div
                      key={opt.id}
                      onClick={() => setAnswers({ ...answers, goal: opt.id })}
                      className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                        answers.goal === opt.id
                          ? 'border-blue-600 bg-blue-50/50 text-slate-900'
                          : 'border-slate-200 hover:border-blue-300 bg-white'
                      }`}
                    >
                      <div>
                        <div className="font-extrabold text-sm text-slate-900 mb-1">{opt.title}</div>
                        <div className="text-xs text-slate-500">{opt.desc}</div>
                      </div>
                      {answers.goal === opt.id && (
                        <div className="mt-3 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold self-end">
                          &#10003;
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <div>
                <h3 className="text-2xl font-extrabold text-slate-900 mb-2">
                  Quy mô vốn bạn dự kiến đồng hành cùng AI?
                </h3>
                <p className="text-sm text-slate-600 mb-6">
                  Giúp hệ thống gợi ý bài toán phân bổ lệnh theo quy định lô 100 cổ phiếu và tối ưu phí giao dịch.
                </p>

                <div className="space-y-3">
                  {[
                    { id: '50000000', title: '50,000,000 đ (50 Triệu)', desc: 'Khởi đầu kỷ luật, tập trung 2-3 mã cổ phiếu dẫn dắt VN30.' },
                    { id: '100000000', title: '100,000,000 đ (100 Triệu)', desc: 'Hạn mức tiêu chuẩn vàng: Đa dạng hóa 4-5 mã, tối ưu quản trị rủi ro.' },
                    { id: '250000000', title: '250,000,000 đ (250 Triệu)', desc: 'Quy mô chuyên sâu: Phân bổ cân đối nhóm Tăng trưởng và Phòng thủ.' },
                    { id: '500000000', title: '500,000,000 đ+ (Trên 500 Triệu)', desc: 'Private Wealth: Tỷ trọng bảo toàn vốn nghiêm ngặt theo chu kỳ HMM.' },
                  ].map((opt) => (
                    <div
                      key={opt.id}
                      onClick={() => setAnswers({ ...answers, capital: opt.id })}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                        answers.capital === opt.id
                          ? 'border-blue-600 bg-blue-50/50 text-slate-900'
                          : 'border-slate-200 hover:border-blue-300 bg-white'
                      }`}
                    >
                      <div>
                        <div className="font-extrabold text-sm text-slate-900">{opt.title}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{opt.desc}</div>
                      </div>
                      {answers.capital === opt.id && (
                        <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                          &#10003;
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4 */}
            {step === 4 && (
              <div>
                <h3 className="text-2xl font-extrabold text-slate-900 mb-2">
                  Kỳ hạn đầu tư bạn mong muốn?
                </h3>
                <p className="text-sm text-slate-600 mb-6">
                  Kỳ hạn càng dài, sức mạnh lãi kép và độ tin cậy của mô hình học tăng cường PPO càng phát huy hiệu quả.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { id: 'short', title: 'Dưới 1 năm', desc: 'Ngắn hạn, bám sát các nhịp sóng Bull Market của VN-Index.' },
                    { id: 'medium', title: '1 đến 3 năm', desc: 'Trung hạn, tối ưu hóa lợi nhuận theo từng chu kỳ kinh tế.' },
                    { id: 'long', title: '3 đến 5 năm', desc: 'Dài hạn, đón đầu chu kỳ nâng hạng thị trường chứng khoán.' },
                    { id: 'ultra', title: 'Trên 5 năm', desc: 'Tích lũy tài sản thế hệ, tận dụng lãi kép bùng nổ.' },
                  ].map((opt) => (
                    <div
                      key={opt.id}
                      onClick={() => setAnswers({ ...answers, horizon: opt.id })}
                      className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                        answers.horizon === opt.id
                          ? 'border-blue-600 bg-blue-50/50 text-slate-900'
                          : 'border-slate-200 hover:border-blue-300 bg-white'
                      }`}
                    >
                      <div>
                        <div className="font-extrabold text-sm text-slate-900 mb-1">{opt.title}</div>
                        <div className="text-xs text-slate-500">{opt.desc}</div>
                      </div>
                      {answers.horizon === opt.id && (
                        <div className="mt-3 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold self-end">
                          &#10003;
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={handleBack}
                disabled={step === 1}
                className="px-5 py-2.5 rounded-full text-xs font-bold text-slate-600 hover:text-slate-900 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              >
                &larr; Quay lại
              </button>
              <button
                onClick={handleNext}
                className="px-7 py-3 rounded-full text-xs font-extrabold bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20 cursor-pointer transition-colors"
              >
                {step === 4 ? 'Tạo Danh Mục AI' : 'Tiếp Tục →'}
              </button>
            </div>
          </div>
        ) : (
          /* Step 5: Result View */
          <div>
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl font-bold mx-auto mb-3">
                &#10003;
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900 mb-1">
                Hồ Sơ Danh Mục AI Của Bạn Đã Sẵn Sàng!
              </h3>
              <p className="text-xs text-slate-500">
                Mô hình lượng tử đã tính toán phương án phân bổ tối ưu theo hồ sơ của bạn.
              </p>
            </div>

            <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-between border-b border-blue-200 pb-3 mb-4">
                <div>
                  <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider block">Chiến Lược Đề Xuất</span>
                  <div className="text-base font-extrabold text-slate-900">
                    {answers.risk === 'conservative'
                      ? 'AI Quantum Bảo Toàn Vốn (Conservative)'
                      : answers.risk === 'balanced'
                      ? 'AI Quantum Cân Bằng (Balanced)'
                      : answers.risk === 'growth'
                      ? 'AI Quantum Tăng Trưởng (Growth)'
                      : 'AI Quantum Bứt Phá (Aggressive Alpha)'}
                  </div>
                </div>
                <span className="text-xs font-extrabold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">
                  Sharpe: 2.15
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-white p-3 rounded-xl shadow-xs">
                  <div className="text-[10px] text-slate-400 font-bold">Cổ phiếu VN30</div>
                  <div className="text-lg font-black text-blue-600 mt-0.5">
                    {answers.risk === 'conservative' ? '50%' : answers.risk === 'balanced' ? '65%' : answers.risk === 'growth' ? '75%' : '85%'}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-xl shadow-xs">
                  <div className="text-[10px] text-slate-400 font-bold">Tiền mặt phòng thủ</div>
                  <div className="text-lg font-black text-blue-600 mt-0.5">
                    {answers.risk === 'conservative' ? '25%' : answers.risk === 'balanced' ? '15%' : '15%'}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-xl shadow-xs">
                  <div className="text-[10px] text-slate-400 font-bold">Nhóm Dẫn Dắt</div>
                  <div className="text-lg font-black text-purple-600 mt-0.5">FPT, MWG</div>
                </div>
                <div className="bg-white p-3 rounded-xl shadow-xs">
                  <div className="text-[10px] text-slate-400 font-bold">Chặn lỗ an toàn</div>
                  <div className="text-lg font-black text-rose-600 mt-0.5">
                    {answers.risk === 'conservative' ? '-3.0%' : answers.risk === 'balanced' ? '-4.5%' : '-6.0%'}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-1 mb-6">
              <strong className="text-slate-900 block font-bold">Quy tắc quản trị kỷ luật AI độc quyền:</strong>
              <div>&bull; Tự động kích hoạt đề xuất tái cơ cấu mỗi khi tỷ trọng một cổ phiếu lệch quá &plusmn;3.0% mục tiêu.</div>
              <div>&bull; Cố định ngưỡng cắt lỗ tự động từng mã cổ phiếu, không giữ cổ phiếu lỗ quá hạn mức.</div>
            </div>

            <button
              onClick={handleApply}
              className="w-full py-3.5 rounded-full font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20 cursor-pointer transition-colors"
            >
              Áp Dụng Chiến Lược & Xem Dashboard Ngay &rarr;
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
