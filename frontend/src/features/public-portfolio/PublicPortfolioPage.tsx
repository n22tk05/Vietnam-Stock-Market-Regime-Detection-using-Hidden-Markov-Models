import React, { useState, useEffect } from 'react';
import { Layers, Activity, Calendar, PieChart } from 'lucide-react';
import { Header, Footer } from '@/components/layout';

// Define the shape of our historical allocation records
interface AllocationItem {
  ma_co_phieu: string;
  so_lo: number;
  so_co_phieu: number;
  gia_hien_tai: number;
  so_tien_chi: number;
  ty_trong_goc_ppo: number;
  ty_trong_thuc_te: number;
}

interface HistoricalRecord {
  date: string;
  capital: number;
  used_capital: number;
  cash_left: number;
  tracking_error?: number;
  warning_flag?: boolean;
  warning_msg?: string;
  allocations: AllocationItem[];
}

export const PublicPortfolioPage: React.FC = () => {
  const [historyData, setHistoryData] = useState<HistoricalRecord[]>([]);
  const [selectedDateIndex, setSelectedDateIndex] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [capitalInput, setCapitalInput] = useState<number>(1000000000);

  // Fetch the historical records directly from the public history.json
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch('/history.json');
        if (!response.ok) throw new Error('Cannot fetch history');
        const data: HistoricalRecord[] = await response.json();
        
        if (Array.isArray(data) && data.length > 0) {
          setHistoryData(data);
          setSelectedDateIndex(data.length - 1); // Select the latest date by default
        }
      } catch (err) {
        console.error('Error fetching history:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchHistory();
  }, []);

  const selectedRecord = historyData[selectedDateIndex] || null;

  // Tự động tính toán lại số lô, số cổ phiếu, tiền chi dựa trên mức vốn người dùng chọn
  const dynamicAllocations = selectedRecord ? selectedRecord.allocations.map(alloc => {
    const tyTrong = alloc.ty_trong_goc_ppo ?? alloc.ty_trong_thuc_te;
    const targetCash = capitalInput * tyTrong;
    const targetLots = Math.floor(targetCash / (alloc.gia_hien_tai * 100));
    const so_co_phieu = targetLots * 100;
    const so_tien_chi = so_co_phieu * alloc.gia_hien_tai;
    return {
      ...alloc,
      so_co_phieu,
      so_tien_chi,
      ty_trong_thuc_te: so_tien_chi / capitalInput
    };
  }) : [];

  const dynamicUsedCapital = dynamicAllocations.reduce((sum, item) => sum + item.so_tien_chi, 0);
  const dynamicCashLeft = capitalInput - dynamicUsedCapital;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-blue-600 selection:text-white">
      <Header 
        onOpenAssessment={() => {}} 
        onOpenLiveDemo={() => window.location.href = '/live-demo'} 
      />

      <main className="flex-grow flex flex-col items-center py-10 px-4 mt-12">
        <div className="w-full max-w-6xl space-y-6">
          
          {/* Page Title & Intro */}
          <div className="text-center space-y-3 mb-8">
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 flex items-center justify-center gap-3">
              <PieChart className="w-8 h-8 text-blue-600" />
              Phân Bổ Danh Mục AI
            </h1>
            <p className="text-slate-500 font-medium max-w-2xl mx-auto">
              Xem chi tiết cơ cấu danh mục và tỷ trọng phân bổ cổ phiếu do mô hình Trí Tuệ Nhân Tạo tính toán qua từng mốc thời gian thực tế.
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-blue-600 space-y-4">
              <Activity className="w-10 h-10 animate-spin" />
              <p className="font-bold text-slate-500">Đang nạp dữ liệu lịch sử...</p>
            </div>
          ) : !selectedRecord ? (
            <div className="text-center py-20 text-slate-500 font-medium">
              Không có dữ liệu lịch sử để hiển thị.
            </div>
          ) : (
            <>
              {/* Date Selector Timeline (Scrollable) */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
                <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  Chọn Mốc Thời Gian (Phiên Giao Dịch)
                </h3>
                <div className="flex items-center gap-2">
                  <select 
                    className="w-full sm:w-auto text-sm font-bold text-slate-700 bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2 outline-none hover:bg-slate-100 focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
                    value={selectedDateIndex}
                    onChange={(e) => setSelectedDateIndex(Number(e.target.value))}
                  >
                    {historyData.map((record, index) => (
                      <option key={record.date} value={index}>
                        Dữ liệu ngày: {record.date}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Capital Selector */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
                <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  Mô Phỏng Vốn Đầu Tư (VNĐ)
                </h3>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    {[50000000, 100000000, 500000000, 1000000000].map((val) => (
                      <button
                        key={val}
                        onClick={() => setCapitalInput(val)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                          capitalInput === val
                            ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-500'
                            : 'bg-slate-50 text-slate-600 border-2 border-transparent hover:bg-slate-100'
                        }`}
                      >
                        {(val / 1000000).toLocaleString('vi-VN')} Triệu
                      </button>
                    ))}
                  </div>
                  <div className="relative min-w-[200px]">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">VNĐ</span>
                    <input
                      type="text"
                      value={capitalInput ? capitalInput.toLocaleString('vi-VN') : ''}
                      onChange={(e) => {
                        const rawValue = e.target.value.replace(/\D/g, '');
                        setCapitalInput(Number(rawValue));
                      }}
                      className="w-full text-right bg-slate-50 border-2 border-slate-100 rounded-xl py-2 pl-12 pr-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                      placeholder="Nhập số vốn tuỳ ý..."
                    />
                  </div>
                </div>
              </div>

              {/* Portfolio Dashboard */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Header Info */}
                <div className="bg-slate-900 p-6 md:p-8 text-white flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-10 pointer-events-none">
                     {/* Decorative background pattern */}
                     <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                       <defs>
                         <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                           <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
                         </pattern>
                       </defs>
                       <rect width="100%" height="100%" fill="url(#grid)" />
                     </svg>
                  </div>
                  
                  <div className="z-10 text-center md:text-left">
                    <h2 className="text-2xl font-black mb-1">
                      Danh Mục Ngày {selectedRecord.date}
                    </h2>
                    <p className="text-slate-400 text-sm font-medium">
                      Tổng vốn mô phỏng: <span className="text-white font-mono">{capitalInput.toLocaleString('vi-VN')} đ</span>
                    </p>
                  </div>
                  
                  <div className="z-10 flex gap-4 md:gap-8">
                    <div className="bg-white/10 rounded-2xl p-4 text-center backdrop-blur-sm border border-white/10">
                      <p className="text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">Vốn Phân Bổ</p>
                      <p className="text-xl font-black font-mono text-emerald-400">
                        {dynamicUsedCapital.toLocaleString('vi-VN')} đ
                      </p>
                    </div>
                    <div className="bg-white/10 rounded-2xl p-4 text-center backdrop-blur-sm border border-white/10">
                      <p className="text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">Tiền Mặt</p>
                      <p className="text-xl font-black font-mono text-blue-300">
                        {dynamicCashLeft.toLocaleString('vi-VN')} đ
                      </p>
                    </div>
                  </div>
                </div>

                {/* Table View */}
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Layers className="w-5 h-5 text-blue-600" />
                    <h3 className="font-extrabold text-slate-800 text-lg">Chi Tiết Tỷ Trọng Danh Mục</h3>
                  </div>
                  
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-100 text-slate-600 uppercase font-bold text-[11px] tracking-wider">
                        <tr>
                          <th className="py-4 px-5">Mã CP</th>
                          <th className="py-4 px-5 text-right">Số Lượng (Cổ Phiếu)</th>
                          <th className="py-4 px-5 text-right">Giá Cổ Phiếu</th>
                          <th className="py-4 px-5 text-right">Vốn Phân Bổ</th>
                          <th className="py-4 px-5 text-right">Tỷ Trọng Thực Tế</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                        {dynamicAllocations && dynamicAllocations.length > 0 ? (
                          [...dynamicAllocations]
                            .sort((a, b) => b.ty_trong_thuc_te - a.ty_trong_thuc_te)
                            .map((item, idx) => (
                            <tr key={item.ma_co_phieu} className="hover:bg-slate-50 transition-colors">
                              <td className="py-4 px-5 font-black text-blue-600 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center text-[10px]">
                                  {idx + 1}
                                </span>
                                {item.ma_co_phieu}
                              </td>
                              <td className="py-4 px-5 text-right font-extrabold text-slate-700">
                                {item.so_co_phieu.toLocaleString('vi-VN')}
                              </td>
                              <td className="py-4 px-5 text-right font-mono text-slate-500">
                                {item.gia_hien_tai.toLocaleString('vi-VN')} đ
                              </td>
                              <td className="py-4 px-5 text-right font-mono font-bold text-slate-800">
                                {item.so_tien_chi.toLocaleString('vi-VN')} đ
                              </td>
                              <td className="py-4 px-5 text-right">
                                <span className="inline-block px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-black text-xs">
                                  {(item.ty_trong_thuc_te * 100).toFixed(2)}%
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-10 text-center text-slate-400">
                              Danh mục trống hoặc đang nắm giữ 100% tiền mặt.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}

        </div>
      </main>

      <Footer />
      
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
};
