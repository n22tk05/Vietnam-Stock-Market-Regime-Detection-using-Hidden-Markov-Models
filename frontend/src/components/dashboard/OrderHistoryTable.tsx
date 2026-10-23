import React from 'react';
import { 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight,
  PlusCircle,
  Receipt
} from 'lucide-react';

export interface OrderHistoryItem {
  id: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  totalValue: number;
  realizedPnl?: number | null;
  status: string;
  orderDate: string;
  notes?: string;
}

interface OrderHistoryTableProps {
  orders: OrderHistoryItem[];
  onOpenOrderModal?: () => void;
}

export const OrderHistoryTable: React.FC<OrderHistoryTableProps> = ({
  orders,
  onOpenOrderModal,
}) => {
  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.round(num)) + ' đ';
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      {/* Table Header */}
      <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <Receipt className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Sổ Lệnh & Nhật Ký Giao Dịch
            </h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {orders.length} Lệnh Đã Khớp
            </span>
          </div>
          <p className="text-xs text-slate-600">
            Lịch sử toàn bộ các giao dịch Mua / Bán thực tế của tài khoản, bao gồm lãi lỗ đã chốt và lưu vết snapshot bất biến.
          </p>
        </div>

        {onOpenOrderModal && (
          <button
            onClick={onOpenOrderModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-500/20 transition-all hover:scale-[1.02] cursor-pointer shrink-0 self-start md:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Ghi Nhận Lệnh Mới</span>
          </button>
        )}
      </div>

      {/* Table Content */}
      {orders.length === 0 ? (
        <div className="py-12 px-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Chưa có giao dịch nào được ghi nhận</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Tài khoản chưa có lệnh Mua hoặc Bán thủ công nào. Hãy bắt đầu ghi nhận lệnh giao dịch đầu tiên để theo dõi tăng trưởng NAV.
          </p>
          {onOpenOrderModal && (
            <button
              onClick={onOpenOrderModal}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Ghi Lệnh Mua Đầu Tiên</span>
            </button>
          )}
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider">
                <th className="px-6 py-4">Thời Gian Khớp</th>
                <th className="px-4 py-4">Mã Cổ Phiếu</th>
                <th className="px-4 py-4">Loại Lệnh</th>
                <th className="px-4 py-4">Khối Lượng</th>
                <th className="px-4 py-4">Giá Khớp</th>
                <th className="px-4 py-4">Tổng Giá Trị</th>
                <th className="px-4 py-4">Lãi / Lỗ Chốt</th>
                <th className="px-4 py-4">Trạng Thái</th>
                <th className="px-6 py-4">Ghi Chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-medium">
              {orders.map((ord) => {
                const isBuy = ord.action === 'BUY';
                const hasPnl = ord.realizedPnl !== undefined && ord.realizedPnl !== null;
                const isPnlPositive = (ord.realizedPnl || 0) >= 0;

                return (
                  <tr key={ord.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Thời gian */}
                    <td className="px-6 py-4 text-xs font-mono text-slate-600">
                      {ord.orderDate}
                    </td>

                    {/* Mã CP */}
                    <td className="px-4 py-4">
                      <span className="font-mono font-black text-slate-900 px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-xs">
                        {ord.symbol}
                      </span>
                    </td>

                    {/* Loại lệnh */}
                    <td className="px-4 py-4">
                      {isBuy ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <TrendingUp className="w-3 h-3 text-emerald-600" />
                          MUA
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                          <TrendingDown className="w-3 h-3 text-rose-600" />
                          BÁN
                        </span>
                      )}
                    </td>

                    {/* Khối lượng */}
                    <td className="px-4 py-4 font-mono font-bold text-slate-900">
                      {ord.quantity.toLocaleString('vi-VN')} CP
                    </td>

                    {/* Giá khớp */}
                    <td className="px-4 py-4 font-mono text-slate-700">
                      {formatVND(ord.price)}
                    </td>

                    {/* Tổng giá trị */}
                    <td className="px-4 py-4 font-mono font-bold text-slate-900">
                      {formatVND(ord.totalValue)}
                    </td>

                    {/* Lãi / Lỗ Chốt */}
                    <td className="px-4 py-4 font-mono text-xs">
                      {hasPnl ? (
                        <span className={`font-bold ${isPnlPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isPnlPositive ? '+' : ''}{formatVND(ord.realizedPnl!)}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Trạng thái */}
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Đã Khớp
                      </span>
                    </td>

                    {/* Ghi chú */}
                    <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate">
                      {ord.notes || 'Khớp lệnh thành công'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default OrderHistoryTable;
