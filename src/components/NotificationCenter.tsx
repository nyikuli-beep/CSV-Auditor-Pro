import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  Mail,
  CreditCard,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Clock,
  UserPlus,
  ExternalLink,
  CheckCheck,
  Trash2,
  X,
  Sparkles,
  Layers,
  Activity,
  FileSpreadsheet,
  ChevronRight,
  Info,
  KeyRound,
  Shield,
  Zap
} from 'lucide-react';
import { AppNotification, NotificationCategory, NotificationPriority } from '../types';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  unreadCount: number;
  isDarkMode: boolean;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDismissNotification: (id: string) => void;
  onClearAll: () => void;
  onActionClick: (notification: AppNotification) => void;
  onOpenAcceptInviteModal?: (prefilledToken?: string) => void;
  isOwner?: boolean;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  isDarkMode,
  onMarkAsRead,
  onMarkAllAsRead,
  onDismissNotification,
  onClearAll,
  onActionClick,
  onOpenAcceptInviteModal,
  isOwner = false
}) => {
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategory>('all');

  if (!isOpen) return null;

  const filteredNotifications = notifications.filter(notif => {
    if (selectedCategory === 'all') return true;
    return notif.category === selectedCategory;
  });

  const getPriorityBadge = (priority: NotificationPriority) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 shrink-0">
            URGENT
          </span>
        );
      case 'warning':
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 shrink-0">
            WARNING
          </span>
        );
      case 'success':
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 shrink-0">
            SUCCESS
          </span>
        );
      case 'info':
      default:
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 shrink-0">
            INFO
          </span>
        );
    }
  };

  const getNotificationIcon = (notif: AppNotification) => {
    switch (notif.type) {
      case 'team_invite':
        return (
          <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-400 shrink-0">
            <Mail className="w-4 h-4" />
          </div>
        );
      case 'subscription_deplete':
      case 'quota_deplete':
        return (
          <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-400 shrink-0">
            <CreditCard className="w-4 h-4" />
          </div>
        );
      case 'security_alert':
        return (
          <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-900/30 dark:border-rose-700 dark:text-rose-400 shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
        );
      case 'retention_warning':
        return (
          <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-400 shrink-0">
            <Clock className="w-4 h-4" />
          </div>
        );
      case 'slot_request_status':
        return (
          <div className="p-2 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 dark:bg-purple-900/30 dark:border-purple-700 dark:text-purple-400 shrink-0">
            <UserPlus className="w-4 h-4" />
          </div>
        );
      case 'audit_completed':
        return (
          <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-400 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="p-2 rounded-xl bg-slate-100 border border-slate-300 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 shrink-0">
            <Info className="w-4 h-4" />
          </div>
        );
    }
  };

  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 2) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      transition={{ duration: 0.15 }}
      className={`absolute right-0 top-full mt-2 w-80 sm:w-[420px] max-w-[calc(100vw-1.5rem)] rounded-2xl border shadow-2xl z-50 flex flex-col max-h-[85vh] overflow-hidden ${
        isDarkMode ? 'bg-[#0F172A] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}
    >
      {/* Header */}
      <div className={`p-4 border-b flex items-center justify-between gap-3 shrink-0 ${
        isDarkMode ? 'border-slate-800 bg-[#1E293B]/60' : 'border-slate-200 bg-slate-50'
      }`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-400 shrink-0">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-slate-100">
                Workspace Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-blue-600 text-white">
                  {unreadCount} new
                </span>
              )}
            </div>
            <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
              {isOwner ? 'Workspace Administrator Feed' : 'Collaborator & Member Updates'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllAsRead}
              className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Mark all as read"
            >
              <CheckCheck className="w-4 h-4" />
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={onClearAll}
              className="p-1.5 rounded-lg text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Clear all notifications"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ml-1"
            aria-label="Close notification panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className={`px-4 py-2 border-b flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 ${
        isDarkMode ? 'border-slate-800 bg-[#0F172A]' : 'border-slate-200 bg-white'
      }`}>
        {(['all', 'team', 'subscription', 'security'] as NotificationCategory[]).map(cat => {
          const count = notifications.filter(n => cat === 'all' || n.category === cat).length;
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : isDarkMode 
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>{cat}</span>
              {count > 0 && (
                <span className={`px-1 py-0.2 rounded text-[9px] font-mono ${
                  isActive ? 'bg-blue-700 text-white' : isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-700'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 max-h-[55vh] divide-y divide-slate-100 dark:divide-slate-800/40">
        {filteredNotifications.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-2.5">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/50 text-slate-400 mx-auto flex items-center justify-center">
              <Bell className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">
              No Notifications in this View
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
              {selectedCategory === 'all'
                ? 'All caught up! Important workspace invites, subscription alerts, and security updates will appear here.'
                : `No active ${selectedCategory} alerts right now.`}
            </p>
          </div>
        ) : (
          filteredNotifications.map(notif => {
            const isUnread = !notif.read;
            return (
              <div
                key={notif.id}
                onClick={() => onMarkAsRead(notif.id)}
                className={`pt-2.5 first:pt-0 pb-1 rounded-xl p-3 transition-all text-left relative group ${
                  isUnread
                    ? isDarkMode 
                      ? 'bg-slate-900/80 border border-blue-500/30 shadow-xs' 
                      : 'bg-blue-50/50 border border-blue-200 shadow-xs'
                    : isDarkMode 
                      ? 'bg-slate-900/30 hover:bg-slate-900/60 border border-transparent' 
                      : 'bg-white hover:bg-slate-50 border border-slate-100'
                }`}
              >
                <div className="flex items-start gap-3">
                  {getNotificationIcon(notif)}

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                        )}
                        <h5 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                          {notif.title}
                        </h5>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {getPriorityBadge(notif.priority)}
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                          {formatTimestamp(notif.timestamp)}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {notif.message}
                    </p>

                    {/* Special Callout for Team Collaboration Invites */}
                    {notif.type === 'team_invite' && notif.actionPayload?.inviteToken && (
                      <div className={`mt-2 p-2 rounded-lg border text-[11px] font-mono flex items-center justify-between gap-2 ${
                        isDarkMode ? 'bg-[#0F172A] border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                      }`}>
                        <div className="flex items-center gap-1.5 min-w-0 truncate">
                          <KeyRound className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                          <span className="truncate">Token: {notif.actionPayload.inviteToken}</span>
                        </div>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 shrink-0">
                          {notif.actionPayload.role}
                        </span>
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="pt-2 flex items-center justify-between gap-2">
                      <div>
                        {notif.actionLabel && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onMarkAsRead(notif.id);
                              onActionClick(notif);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                              notif.priority === 'urgent'
                                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                                : notif.type === 'team_invite'
                                  ? 'bg-blue-600 hover:bg-blue-500 text-white'
                                  : 'bg-slate-800 hover:bg-slate-700 text-white dark:bg-slate-700 dark:hover:bg-slate-600'
                            }`}
                          >
                            <span>{notif.actionLabel}</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDismissNotification(notif.id);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                          title="Dismiss notification"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className={`p-3 border-t text-center text-[10px] font-mono shrink-0 flex items-center justify-between ${
        isDarkMode ? 'border-slate-800 bg-[#1E293B]/40 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'
      }`}>
        <div className="flex items-center gap-1.5">
          <Shield className="w-3 h-3 text-blue-600 dark:text-blue-400" />
          <span>Real-time Tenancy Stream</span>
        </div>
        <span>{filteredNotifications.length} items</span>
      </div>
    </motion.div>
  );
};
