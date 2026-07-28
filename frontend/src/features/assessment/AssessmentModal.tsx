import React, { useState } from 'react';
import { X, ArrowRight, ArrowLeft, Check, Sparkles, ShieldAlert, Award } from 'lucide-react';
import confetti from 'canvas-confetti';

interface AssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AssessmentModal: React.FC<AssessmentModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1);
  const [riskTolerance, setRiskTolerance] = useState('growth');
  const [primaryGoal, setPrimaryGoal] = useState('freedom');
  const [capital, setCapital] = useState('50k-250k');
  const [timeHorizon, setTimeHorizon] = useState('7-15');
  const [isCompleted, setIsCompleted] = useState(false);

  if (!isOpen) return null;

  const handleNext = () => {
    if (step < 4) {
      setStep((prev) => prev + 1);
    } else {
      // Finish Assessment & Trigger Confetti
      setIsCompleted(true);
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

  const resetModal = () => {
    setStep(1);
    setIsCompleted(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[32px] max-w-2xl w-full p-6 md:p-10 shadow-2xl relative border border-outline-variant/40 max-h-[90vh] overflow-y-auto">
        <button
          onClick={resetModal}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-surface-container text-on-surface-variant transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {!isCompleted ? (
          <div>
            {/* Step Progress Bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between text-xs font-bold text-outline uppercase tracking-wider mb-2">
                <span>Step {step} of 4</span>
                <span className="text-secondary">AI Profile Assessment</span>
              </div>
              <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                <div
                  className="h-full bg-secondary transition-all duration-300 rounded-full"
                  style={{ width: `${(step / 4) * 100}%` }}
                />
              </div>
            </div>

            {/* Step 1: Risk Tolerance */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-extrabold text-on-background mb-2">
                    Khẩu vị rủi ro đầu tư của bạn là gì?
                  </h3>
                  <p className="text-on-surface-variant text-sm">
                    AI sẽ thiết lập giới hạn sụt giảm tài sản (Drawdown) phù hợp với tâm lý của bạn.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {[
                    { id: 'conservative', title: 'An toàn (Conservative)', desc: 'Ưu tiên bảo toàn vốn, chấp nhận lợi nhuận 5-8%/năm' },
                    { id: 'balanced', title: 'Cân bằng (Balanced)', desc: 'Tăng trưởng ổn định với rủi ro vừa phải 10-14%/năm' },
                    { id: 'growth', title: 'Tăng trưởng (Growth)', desc: 'Tối ưu hóa lợi nhuận dài hạn 15-22%/năm' },
                    { id: 'aggressive', title: 'Bứt phá (Aggressive)', desc: 'Chấp nhận biến động cao để đạt lợi nhuận bứt phá >25%/năm' },
                  ].map((option) => (
                    <div
                      key={option.id}
                      onClick={() => setRiskTolerance(option.id)}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                        riskTolerance === option.id
                          ? 'border-secondary bg-secondary-fixed/30 text-on-background'
                          : 'border-outline-variant/40 hover:border-secondary/50'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-base mb-0.5">{option.title}</div>
                        <div className="text-xs text-on-surface-variant">{option.desc}</div>
                      </div>
                      {riskTolerance === option.id && (
                        <div className="w-6 h-6 rounded-full bg-secondary text-white flex items-center justify-center shrink-0">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Primary Goal */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-extrabold text-on-background mb-2">
                    Mục tiêu tài chính quan trọng nhất?
                  </h3>
                  <p className="text-on-surface-variant text-sm">
                    Xác định mục đích giúp AI phân bổ tỷ trọng dòng tiền tối ưu.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { id: 'retirement', title: 'Hưu trí an nhàn', desc: 'Xây dựng quỹ thu nhập thụ động' },
                    { id: 'freedom', title: 'Tự do tài chính', desc: 'Độc lập tài chính sớm (FIRE)' },
                    { id: 'house', title: 'Mua bất động sản / Nhà', desc: 'Tích lũy vốn mua tài sản lớn' },
                    { id: 'family', title: 'Tích lũy cho con cái', desc: 'Quỹ giáo dục & di sản gia đình' },
                  ].map((option) => (
                    <div
                      key={option.id}
                      onClick={() => setPrimaryGoal(option.id)}
                      className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                        primaryGoal === option.id
                          ? 'border-secondary bg-secondary-fixed/30 text-on-background'
                          : 'border-outline-variant/40 hover:border-secondary/50'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-base mb-1">{option.title}</div>
                        <div className="text-xs text-on-surface-variant">{option.desc}</div>
                      </div>
                      {primaryGoal === option.id && (
                        <div className="mt-4 w-6 h-6 rounded-full bg-secondary text-white flex items-center justify-center self-end">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Capital size */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-extrabold text-on-background mb-2">
                    Quy mô vốn ban đầu dự kiến?
                  </h3>
                  <p className="text-on-surface-variant text-sm">
                    Giúp AI tư vấn danh mục phù hợp với thanh khoản và phí giao dịch.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {[
                    { id: '1k-10k', title: '$1,000 - $10,000 USD', desc: 'Khởi đầu tích lũy linh hoạt' },
                    { id: '10k-50k', title: '$10,000 - $50,000 USD', desc: 'Danh mục đa dạng hóa cơ bản' },
                    { id: '50k-250k', title: '$50,000 - $250,000 USD', desc: 'Danh mục chuyên nghiệp cao cấp' },
                    { id: '250k+', title: 'Trên $250,000 USD', desc: 'Giải pháp Private Wealth quản trị rủi ro riêng' },
                  ].map((option) => (
                    <div
                      key={option.id}
                      onClick={() => setCapital(option.id)}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                        capital === option.id
                          ? 'border-secondary bg-secondary-fixed/30 text-on-background'
                          : 'border-outline-variant/40 hover:border-secondary/50'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-base mb-0.5">{option.title}</div>
                        <div className="text-xs text-on-surface-variant">{option.desc}</div>
                      </div>
                      {capital === option.id && (
                        <div className="w-6 h-6 rounded-full bg-secondary text-white flex items-center justify-center shrink-0">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: Time horizon */}
            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-extrabold text-on-background mb-2">
                    Thời gian đầu tư dự kiến?
                  </h3>
                  <p className="text-on-surface-variant text-sm">
                    Thời gian đầu tư dài giúp giảm thiểu rủi ro biến động ngắn hạn.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { id: '<3', title: 'Dưới 3 năm', desc: 'Ngắn hạn, ưu tiên tính thanh khoản' },
                    { id: '3-7', title: '3 đến 7 năm', desc: 'Trung hạn, cân bằng tăng trưởng' },
                    { id: '7-15', title: '7 đến 15 năm', desc: 'Dài hạn, tối ưu hóa lãi kép' },
                    { id: '15+', title: 'Trên 15 năm', desc: 'Dài hạn vượt trội, kỳ hạn di sản' },
                  ].map((option) => (
                    <div
                      key={option.id}
                      onClick={() => setTimeHorizon(option.id)}
                      className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                        timeHorizon === option.id
                          ? 'border-secondary bg-secondary-fixed/30 text-on-background'
                          : 'border-outline-variant/40 hover:border-secondary/50'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-base mb-1">{option.title}</div>
                        <div className="text-xs text-on-surface-variant">{option.desc}</div>
                      </div>
                      {timeHorizon === option.id && (
                        <div className="mt-4 w-6 h-6 rounded-full bg-secondary text-white flex items-center justify-center self-end">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Controls */}
            <div className="mt-8 pt-6 border-t border-outline-variant/30 flex items-center justify-between">
              <button
                onClick={handleBack}
                disabled={step === 1}
                className="px-5 py-2.5 rounded-full text-xs font-bold text-on-surface-variant hover:text-on-surface disabled:opacity-30 flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Quay lại</span>
              </button>

              <button
                onClick={handleNext}
                className="btn-primary text-white text-xs font-bold px-8 py-3 rounded-full flex items-center gap-2 shadow-md"
              >
                <span>{step === 4 ? 'Tạo danh mục AI' : 'Tiếp tục'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Assessment Report Result */
          <div className="space-y-6 animate-in zoom-in-95 duration-300">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-tertiary-container text-[#009668] flex items-center justify-center border border-[#009668]/30">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-2xl md:text-3xl font-extrabold text-on-background mb-2">
                Báo cáo Danh mục AI Của Bạn Dã Sẵn Sàng!
              </h3>
              <p className="text-on-surface-variant text-sm">
                Dựa trên phân tích khẩu vị rủi ro và mục tiêu tài chính của bạn.
              </p>
            </div>

            {/* Allocation Strategy Card */}
            <div className="glass-card p-6 rounded-2xl border border-secondary/30 space-y-4 bg-secondary-fixed/20">
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-secondary" />
                  <span className="font-bold text-sm text-on-background">
                    Chiến lược đề xuất: Astera Dynamic Growth
                  </span>
                </div>
                <span className="text-xs font-bold text-[#009668] bg-tertiary-container px-3 py-1 rounded-full">
                  Sharpe Ratio: 2.15
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-white rounded-xl shadow-sm">
                  <div className="text-xs text-outline font-medium">Cổ phiếu Mỹ/Toàn cầu</div>
                  <div className="text-xl font-black text-secondary mt-1">50%</div>
                </div>
                <div className="p-3 bg-white rounded-xl shadow-sm">
                  <div className="text-xs text-outline font-medium">Trái phiếu chính phủ</div>
                  <div className="text-xl font-black text-primary-container mt-1">25%</div>
                </div>
                <div className="p-3 bg-white rounded-xl shadow-sm">
                  <div className="text-xs text-outline font-medium">Hàng hóa & Vàng</div>
                  <div className="text-xl font-black text-amber-600 mt-1">15%</div>
                </div>
                <div className="p-3 bg-white rounded-xl shadow-sm">
                  <div className="text-xs text-outline font-medium">Tiền mặt phòng thủ</div>
                  <div className="text-xl font-black text-[#76777d] mt-1">10%</div>
                </div>
              </div>
            </div>

            {/* AI Action Plan */}
            <div className="p-4 rounded-xl bg-surface-container text-xs text-on-surface-variant space-y-2">
              <div className="font-bold text-on-background flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-secondary" />
                <span>Khuyến nghị quản trị kỷ luật AI:</span>
              </div>
              <p>
                • Hệ thống tự động rebalance danh mục định kỳ mỗi khi tỷ trọng lệch quá ±3%.
                <br />• Kích hoạt quy tắc cắt lỗ chủ động khi thị trường rơi vào vùng rủi ro Bear Market.
              </p>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <button
                onClick={resetModal}
                className="w-full btn-primary text-white py-3.5 rounded-full font-bold text-sm flex items-center justify-center gap-2"
              >
                <span>Mở tài khoản & Áp dụng danh mục này</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
