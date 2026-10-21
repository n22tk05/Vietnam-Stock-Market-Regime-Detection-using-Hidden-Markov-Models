import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { notificationService } from '@/services/notification-service';
import type { NotificationResponse } from '@/types/api';
import { formatDateTime } from '@/utils/formatters';
import { ConfirmActionModal } from '@/components/common/ConfirmActionModal';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { Bell, Check, CheckCheck, Eye, X } from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'UNREAD' | 'PROCESSED'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedNotif, setSelectedNotif] = useState<NotificationResponse | null>(null);
  const [actionType, setActionType] = useState<'APPLY' | 'DISMISS' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { refreshAuthState, refreshNotifications } = useAuth();
  const navigate = useNavigate();

  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await notificationService.list(1, 50);
      setNotifications(res.items || []);
      refreshNotifications();
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'message' in err) {
        setErrorMessage((err as { message: string }).message);
      } else {
        setErrorMessage('Không thể tải danh sách thông báo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await notificationService.markRead(id);
      loadNotifications();
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleConfirmAction = async () => {
    if (!selectedNotif || !actionType) return;
    try {
      setIsSubmitting(true);
      if (actionType === 'APPLY') {
        await notificationService.apply(selectedNotif.id);
        await refreshAuthState();
        setSelectedNotif(null);
        setActionType(null);
        navigate('/app/portfolio');
      } else if (actionType === 'DISMISS') {
        await notificationService.dismiss(selectedNotif.id);
        await refreshAuthState();
        setSelectedNotif(null);
        setActionType(null);
        loadNotifications();
      }
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'message' in err) {
        alert((err as { message: string }).message);
      } else {
        alert('Không thể xử lý hành động.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === 'UNREAD') return item.status === 'UNREAD';
    if (activeTab === 'PROCESSED') return item.status === 'APPLIED' || item.status === 'DISMISSED';
    return true;
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton type="card" count={3} />
      </div>
    );
  }

  if (errorMessage) {
    return <ErrorState title="Lỗi thông báo" message={errorMessage} onRetry={loadNotifications} />;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div>
        <h2 className="text-2xl font-black text-slate-900">Trung tâm Thông báo</h2>
        <p className="text-xs text-slate-500 font-medium">
          Cập nhật các tín hiệu rebalance danh mục và thay đổi thị trường
        </p>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        {[
          { key: 'ALL', label: 'Tất cả' },
          { key: 'UNREAD', label: 'Chưa đọc' },
          { key: 'PROCESSED', label: 'Đã xử lý' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filteredNotifications.length === 0 ? (
        <EmptyState title="Không có thông báo nào" description="Bạn hiện không có thông báo mới trong mục này." />
      ) : (
        <div className="space-y-4">
          {filteredNotifications.map((notif) => {
            const isUnread = notif.status === 'UNREAD';
            const isActionable = notif.status === 'UNREAD' || notif.status === 'READ';

            return (
              <div
                key={notif.id}
                className={`p-6 rounded-3xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isUnread
                    ? 'bg-white border-blue-200 shadow-md ring-2 ring-blue-500/10'
                    : 'bg-white border-slate-200/80 shadow-xs'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                      isUnread
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Bell className="w-5 h-5" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-sm text-slate-900">{notif.title}</h4>
                      {isUnread && (
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                      )}
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 uppercase">
                        {notif.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
                      {notif.summary}
                    </p>

                    <div className="text-[11px] text-slate-400 font-medium">
                      Thời gian: {formatDateTime(notif.createdAt)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  {notif.recommendationId && (
                    <Link
                      to={`/app/recommendations/${notif.recommendationId}`}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Xem đề xuất</span>
                    </Link>
                  )}

                  {isUnread && (
                    <button
                      onClick={() => handleMarkRead(notif.id)}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-bold transition-colors flex items-center gap-1"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Đánh dấu đã đọc</span>
                    </button>
                  )}

                  {isActionable && notif.recommendationId && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedNotif(notif);
                          setActionType('DISMISS');
                        }}
                        className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Bỏ qua</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedNotif(notif);
                          setActionType('APPLY');
                        }}
                        className="btn-primary text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1 shadow-md hover:-translate-y-0.5 transition-all"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Áp dụng Rebalance</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmActionModal
        isOpen={Boolean(selectedNotif && actionType)}
        title={
          actionType === 'APPLY'
            ? 'Áp dụng đề xuất Rebalance danh mục?'
            : 'Bỏ qua đề xuất Rebalance?'
        }
        message={
          actionType === 'APPLY'
            ? 'Danh mục hiện tại sẽ được cập nhật phiên bản mới theo đề xuất tối ưu hóa AI Wealth4ward. Bạn có chắc chắn muốn áp dụng?'
            : 'Bạn có chắc muốn bỏ qua đề xuất này? Danh mục hiện tại sẽ được giữ nguyên.'
        }
        confirmText={actionType === 'APPLY' ? 'Xác nhận áp dụng' : 'Đồng ý bỏ qua'}
        type={actionType === 'APPLY' ? 'primary' : 'warning'}
        isSubmitting={isSubmitting}
        onClose={() => {
          setSelectedNotif(null);
          setActionType(null);
        }}
        onConfirm={handleConfirmAction}
      />
    </div>
  );
};
