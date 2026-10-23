import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Wallet, 
  Cpu, 
  Clock,
  Briefcase,
  Receipt,
  PlusCircle,
  LogOut
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { MetricsGrid } from '@/components/dashboard/MetricsGrid';
import { UserPortfolioHoldingsTable } from '@/components/dashboard/UserPortfolioHoldingsTable';
import { OrderHistoryTable, OrderHistoryItem } from '@/components/dashboard/OrderHistoryTable';
import { OrderEntryModal, OrderSubmitPayload } from '@/components/dashboard/OrderEntryModal';
import { PersonalAIAdvisor } from '@/components/dashboard/PersonalAIAdvisor';
import { PersonalEquityChart } from '@/components/dashboard/PersonalEquityChart';
import { ForecastTable } from '@/components/dashboard/ForecastTable';
import { StockDetailModal } from '@/components/common/StockDetailModal';
import { 
  StockItem, 
  MetricCardData, 
  INITIAL_TOP_STOCKS, 
  SIMULATED_USER_10M,
  USER_PORTFOLIO_STOCK_ITEMS,
  SimulatedUserPortfolio
} from '@/types/dashboard';

export const DashboardPage: React.FC = () => {
  const { user, isAuthenticated, isLoading: isAuthLoading, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthLoading, isAuthenticated, navigate]);

  // Xác định mốc vốn và thông tin tài khoản độc lập dựa trên User đã đăng nhập
  const userEmail = user?.email?.toLowerCase() || '';
  const currentTierInfo = useMemo(() => {
    if (userEmail.includes('100m')) {
      return {
        capital: 100000000,
        tier: '100M',
        tierSlug: '100m',
        name: user?.fullName || 'Lê Thu Trang',
        shortName: 'TT',
        email: user?.email || 'user100m@aiquantum.vn',
        accountNo: 'AQ-100M',
        color: 'from-purple-600 to-pink-600',
      };
    }
    if (userEmail.includes('20m')) {
      return {
        capital: 20000000,
        tier: '20M',
        tierSlug: '20m',
        name: user?.fullName || 'Nguyễn Hoàng Long',
        shortName: 'HL',
        email: user?.email || 'user20m@aiquantum.vn',
        accountNo: 'AQ-20M',
        color: 'from-emerald-600 to-teal-600',
      };
    }
    return {
      capital: 10000000,
      tier: '10M',
      tierSlug: '10m',
      name: user?.fullName || 'Trần Minh Quang',
      shortName: 'TQ',
      email: user?.email || 'user10m@aiquantum.vn',
      accountNo: 'AQ-10M',
      color: 'from-blue-600 to-indigo-600',
    };
  }, [user, userEmail]);

  const capital = currentTierInfo.capital;
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Dynamic Portfolio State
  const [portfolio, setPortfolio] = useState<SimulatedUserPortfolio>(() => {
    return JSON.parse(JSON.stringify(SIMULATED_USER_10M));
  });

  // Tải dữ liệu tương ứng với tài khoản người dùng đang đăng nhập
  useEffect(() => {
    const tierSlug = currentTierInfo.tierSlug;
    setIsLoading(true);

    fetch(`/simulated_user_${tierSlug}.json`)
      .then((res) => {
        if (!res.ok) throw new Error('Không thể tải tệp JSON mô phỏng');
        return res.json();
      })
      .then((data) => {
        if (data && data.holdings) {
          setPortfolio({
            user_tier: data.user_tier || currentTierInfo.tier,
            initial_capital: data.initial_capital || capital,
            current_nav: data.current_nav,
            cash_left: data.cash_left,
            pnl_cash: data.pnl_cash,
            pnl_pct: data.pnl_pct,
            holdings: data.holdings.map((h: any) => ({
              ma_co_phieu: h.ma_co_phieu,
              name: h.name || `Cổ phiếu ${h.ma_co_phieu}`,
              so_co_phieu: h.so_co_phieu,
              gia_von: h.gia_von,
              gia_hien_tai: h.gia_hien_tai,
              status: h.status,
              shares_unlocked: h.shares_unlocked,
              shares_t1: h.shares_t1,
              shares_t2: h.shares_t2,
            })),
            history: data.history || [],
          });

          // Cập nhật Sổ lệnh giao dịch tương ứng với tài khoản này
          if (data.trade_history && Array.isArray(data.trade_history)) {
            const mappedOrders: OrderHistoryItem[] = data.trade_history
              .slice(-25)
              .reverse()
              .map((t: any, idx: number) => ({
                id: `ord-sim-${tierSlug}-${idx}`,
                symbol: t.ticker,
                action: t.action,
                quantity: t.shares,
                price: t.price,
                totalValue: Math.abs(t.total_cost || t.shares * t.price),
                realizedPnl: null,
                status: 'COMPLETED',
                orderDate: t.date || 'Hôm nay',
                notes: `Khớp lệnh`,
              }));
            setOrders(mappedOrders);
          }
        }
      })
      .catch((err) => {
        console.warn('Lỗi tải dữ liệu JSON mô phỏng user:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [currentTierInfo.tierSlug, capital]);

  // Orders History State
  const [orders, setOrders] = useState<OrderHistoryItem[]>([
    {
      id: 'ord-hist-001',
      symbol: 'DPM',
      action: 'BUY',
      quantity: 100,
      price: 22150,
      totalValue: 2215000,
      realizedPnl: null,
      status: 'COMPLETED',
      orderDate: '09/10/2026 14:45',
      notes: 'Khớp lệnh cơ cấu theo tín hiệu HMM',
    },
    {
      id: 'ord-hist-002',
      symbol: 'GEX',
      action: 'BUY',
      quantity: 100,
      price: 21800,
      totalValue: 2180000,
      realizedPnl: null,
      status: 'COMPLETED',
      orderDate: '09/10/2026 14:45',
      notes: 'Khớp lệnh cơ cấu theo tín hiệu HMM',
    },
    {
      id: 'ord-hist-003',
      symbol: 'HT1',
      action: 'BUY',
      quantity: 100,
      price: 12300,
      totalValue: 1230000,
      realizedPnl: null,
      status: 'COMPLETED',
      orderDate: '09/10/2026 14:45',
      notes: 'Khớp lệnh cơ cấu theo tín hiệu HMM',
    },
  ]);

  // Tab View: Holdings vs Order History
  const [dashboardTab, setDashboardTab] = useState<'holdings' | 'orders'>('holdings');

  // Modal State for Order Entry
  const [isOrderModalOpen, setIsOrderModalOpen] = useState<boolean>(false);
  const [orderModalAction, setOrderModalAction] = useState<'BUY' | 'SELL'>('BUY');
  const [orderModalSymbol, setOrderModalSymbol] = useState<string>('');

  const handleOpenOrderModal = (action: 'BUY' | 'SELL', ticker?: string) => {
    setOrderModalAction(action);
    setOrderModalSymbol(ticker || '');
    setIsOrderModalOpen(true);
  };

  // Selected Stock for Detail Modal
  const [selectedStock, setSelectedStock] = useState<StockItem | null>(null);

  const handleSelectHoldingStock = (ticker: string) => {
    const customItem = USER_PORTFOLIO_STOCK_ITEMS[ticker];
    if (customItem) {
      setSelectedStock(customItem);
    } else {
      const found = stocks.find((s) => s.ticker === ticker);
      if (found) setSelectedStock(found);
    }
  };

  // Stocks state
  const [stocks] = useState<StockItem[]>(INITIAL_TOP_STOCKS);

  // Xử lý khi User ghi nhận lệnh Mua / Bán mới
  const handleExecuteOrder = (payload: OrderSubmitPayload): boolean => {
    const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' Hôm nay';

    if (payload.action === 'BUY') {
      const totalCost = payload.quantity * payload.price;
      if (portfolio.cash_left < totalCost) {
        throw new Error('Số dư tiền mặt không đủ để thực hiện lệnh mua.');
      }

      const updatedHoldings = [...portfolio.holdings];
      const existingIdx = updatedHoldings.findIndex((h) => h.ma_co_phieu === payload.symbol);

      if (existingIdx >= 0) {
        const oldH = updatedHoldings[existingIdx];
        const newQty = oldH.so_co_phieu + payload.quantity;
        const newCost = (oldH.so_co_phieu * oldH.gia_von + totalCost) / newQty;

        updatedHoldings[existingIdx] = {
          ...oldH,
          so_co_phieu: newQty,
          gia_von: Math.round(newCost),
          shares_t2: oldH.shares_t2 + payload.quantity,
          status: oldH.shares_unlocked > 0 ? oldH.status : 'LOCKED_T2',
        };
      } else {
        updatedHoldings.push({
          ma_co_phieu: payload.symbol,
          name: `Cổ phiếu ${payload.symbol}`,
          so_co_phieu: payload.quantity,
          gia_von: payload.price,
          gia_hien_tai: payload.price,
          status: 'LOCKED_T2',
          shares_unlocked: 0,
          shares_t1: 0,
          shares_t2: payload.quantity,
        });
      }

      const newCash = portfolio.cash_left - totalCost;
      const totalStockVal = updatedHoldings.reduce((sum, h) => sum + h.so_co_phieu * h.gia_hien_tai, 0);
      const newNav = newCash + totalStockVal;

      setPortfolio({
        ...portfolio,
        cash_left: newCash,
        current_nav: newNav,
        holdings: updatedHoldings,
      });

      // Ghi Sổ lệnh
      const newOrder: OrderHistoryItem = {
        id: `ord-${Date.now()}`,
        symbol: payload.symbol,
        action: 'BUY',
        quantity: payload.quantity,
        price: payload.price,
        totalValue: totalCost,
        realizedPnl: null,
        status: 'COMPLETED',
        orderDate: nowStr,
        notes: payload.notes || 'Mua thủ công từ Dashboard',
      };
      setOrders((prev) => [newOrder, ...prev]);

      return true;
    } else {
      // SELL Action
      const updatedHoldings = [...portfolio.holdings];
      const existingIdx = updatedHoldings.findIndex((h) => h.ma_co_phieu === payload.symbol);

      if (existingIdx < 0) {
        throw new Error(`Bạn không nắm giữ mã ${payload.symbol} để bán.`);
      }

      const targetH = updatedHoldings[existingIdx];
      if (targetH.shares_unlocked < payload.quantity) {
        throw new Error(`Không đủ cổ phiếu khả dụng để bán (chỉ có ${targetH.shares_unlocked} cp khả dụng).`);
      }

      const revenue = payload.quantity * payload.price;
      const costSold = payload.quantity * targetH.gia_von;
      const pnl = revenue - costSold;

      const remainingUnlocked = targetH.shares_unlocked - payload.quantity;
      const remainingTotal = targetH.so_co_phieu - payload.quantity;

      if (remainingTotal <= 0) {
        updatedHoldings.splice(existingIdx, 1);
      } else {
        updatedHoldings[existingIdx] = {
          ...targetH,
          so_co_phieu: remainingTotal,
          shares_unlocked: remainingUnlocked,
        };
      }

      const newCash = portfolio.cash_left + revenue;
      const totalStockVal = updatedHoldings.reduce((sum, h) => sum + h.so_co_phieu * h.gia_hien_tai, 0);
      const newNav = newCash + totalStockVal;

      setPortfolio({
        ...portfolio,
        cash_left: newCash,
        current_nav: newNav,
        holdings: updatedHoldings,
      });

      // Ghi Sổ lệnh
      const newOrder: OrderHistoryItem = {
        id: `ord-${Date.now()}`,
        symbol: payload.symbol,
        action: 'SELL',
        quantity: payload.quantity,
        price: payload.price,
        totalValue: revenue,
        realizedPnl: pnl,
        status: 'COMPLETED',
        orderDate: nowStr,
        notes: payload.notes || 'Bán chốt lời/cắt lỗ thủ công',
      };
      setOrders((prev) => [newOrder, ...prev]);

      return true;
    }
  };

  // Calculate Metrics dynamically
  const totalStockValue = portfolio.holdings.reduce((sum, h) => sum + h.so_co_phieu * h.gia_hien_tai, 0);
  const cashRatioPct = Math.round((portfolio.cash_left / portfolio.current_nav) * 100);

  const metrics: MetricCardData = {
    nav: portfolio.current_nav,
    navProfitPct: +(((portfolio.current_nav - capital) / capital) * 100).toFixed(2),
    totalAllocated: totalStockValue,
    availableCash: portfolio.cash_left,
    cashRatioPct,
    marketRegime: 'Bullish Continuation (Tăng trưởng ổn định)',
    winRate: 74.2,
    sharpeRatio: 2.18,
    maxDrawdown: -4.8,
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Đang tải thông tin tài khoản...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 py-3.5 shadow-xs">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between">
          {/* Brand & Market Status */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <span className="font-black text-lg text-slate-900 tracking-tight">Wealth4ward</span>
                <span className="text-[10px] block font-mono font-bold text-blue-600 uppercase tracking-widest -mt-1">
                  Terminal v7.0
                </span>
              </div>
            </Link>

            {/* Market Regime Badge */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <span>Thị trường: {metrics.marketRegime}</span>
            </div>
          </div>

          {/* Action Tools - Private Single Investor Identity */}
          <div className="flex items-center gap-3">
            {/* Market Time Indicator */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>HOSE: Khớp Lệnh Liên Tục</span>
            </div>

            {/* Quick Order Button in Header */}
            <button
              onClick={() => handleOpenOrderModal('BUY')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Ghi Lệnh Mua/Bán</span>
            </button>

            {/* Private Investor Badge */}
            <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${currentTierInfo.color} text-white flex items-center justify-center font-bold text-xs shadow-xs`}>
                {currentTierInfo.shortName}
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-900 leading-tight flex items-center gap-1.5">
                  <span>{currentTierInfo.name}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </div>
                <div className="text-[10px] font-mono text-slate-500 leading-none mt-0.5">
                  TK: #{currentTierInfo.accountNo} • Vốn {currentTierInfo.tier}
                </div>
              </div>
            </div>

            {/* Logout Action Button */}
            <button
              onClick={handleLogout}
              title="Đăng xuất khỏi tài khoản"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Capital Controls Header Banner */}
        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Không Gian Quản Lý Tài Sản Cá Nhân
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                {currentTierInfo.name} ({currentTierInfo.tier})
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Tài khoản: <span className="font-semibold text-slate-800">{currentTierInfo.email}</span>. Giám sát danh mục đầu tư thực tế, ghi nhận lệnh Mua / Bán thủ công, kiểm soát chu kỳ T+ và khuyến nghị AI.
            </p>
          </div>

          {/* Initial Capital Display */}
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/90 px-5 py-3 rounded-2xl shrink-0">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Vốn Ban Đầu
              </span>
              <span className="text-xl font-mono font-black text-slate-900">
                {new Intl.NumberFormat('vi-VN').format(capital)} đ
              </span>
            </div>
          </div>
        </div>

        {/* 3 Core Asset Cards */}
        <MetricsGrid 
          metrics={metrics} 
          isLoading={isLoading} 
          userPortfolio={portfolio} 
        />

        {/* Navigation Tabs between Holdings and Order Book */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDashboardTab('holdings')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                dashboardTab === 'holdings'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Danh Mục Nắm Giữ ({portfolio.holdings.length} Mã)</span>
            </button>

            <button
              onClick={() => setDashboardTab('orders')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                dashboardTab === 'orders'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Sổ Lệnh & Lịch Sử Giao Dịch ({orders.length})</span>
            </button>
          </div>

          <button
            onClick={() => handleOpenOrderModal('BUY')}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-emerald-600" />
            <span>Đặt Lệnh Mua Mới</span>
          </button>
        </div>

        {/* Active Tab Content */}
        {dashboardTab === 'holdings' ? (
          <UserPortfolioHoldingsTable 
            portfolio={portfolio} 
            onSelectStock={handleSelectHoldingStock}
            onOpenOrderModal={handleOpenOrderModal}
          />
        ) : (
          <OrderHistoryTable
            orders={orders}
            onOpenOrderModal={() => handleOpenOrderModal('BUY')}
          />
        )}

        {/* Personal AI Action Advisor */}
        <PersonalAIAdvisor 
          portfolio={portfolio} 
          onSelectStock={(stk) => setSelectedStock(stk)} 
        />

        {/* Personal Real NAV Equity Curve Chart */}
        <PersonalEquityChart 
          portfolio={portfolio}
          initialCapital={capital} 
          currentNav={portfolio.current_nav} 
        />

        {/* Market Expansion & Watchlist */}
        <ForecastTable
          stocks={stocks}
          capital={capital}
          isLoading={isLoading}
          onSelectStock={(stk) => setSelectedStock(stk)}
        />
      </main>

      {/* Manual Order Entry Modal */}
      <OrderEntryModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        defaultAction={orderModalAction}
        defaultSymbol={orderModalSymbol}
        cashAvailable={portfolio.cash_left}
        holdings={portfolio.holdings}
        availableStocks={stocks}
        onSubmitOrder={handleExecuteOrder}
      />

      {/* Stock Detail Modal */}
      <StockDetailModal
        stock={selectedStock}
        capital={capital}
        onClose={() => setSelectedStock(null)}
      />
    </div>
  );
};

export default DashboardPage;
