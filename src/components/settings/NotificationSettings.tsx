import React from 'react';
import { usePersonalization } from '../../context/PersonalizationContext';
import { SystemSettings } from '../../types';
import { Bell, RefreshCw, Volume2, Mail, Smartphone, Moon } from 'lucide-react';

export const NotificationSettings: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
  const { settings, updateSettings, resetCategory } = usePersonalization();
  const notif = settings.notifications;

  const handleEmailToggle = (key: keyof SystemSettings['notifications']['emailNotifications']) => {
    updateSettings({
      notifications: {
        ...notif,
        emailNotifications: {
          ...notif.emailNotifications,
          [key]: !notif.emailNotifications[key],
        },
      },
    });
  };

  const handleTopToggle = (key: keyof SystemSettings['notifications']) => {
    updateSettings({
      notifications: {
        ...notif,
        [key]: typeof notif[key] === 'boolean' ? !notif[key] : notif[key],
      },
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-500" />
            Notifications & Event Dispatch Preferences
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure email dispatches, desktop alerts, sound volumes, and quiet hours schedules.
          </p>
        </div>
        <button
          type="button"
          onClick={() => resetCategory('appearance')}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5 text-slate-700 dark:text-slate-300 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Restore Defaults
        </button>
      </div>

      {/* Primary Channels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Push Notifications</span>
          </div>
          <input
            type="checkbox"
            checked={Boolean(notif.pushNotifications)}
            onChange={() => handleTopToggle('pushNotifications')}
            className="w-4 h-4 accent-blue-600 cursor-pointer"
          />
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Desktop Banners</span>
          </div>
          <input
            type="checkbox"
            checked={Boolean(notif.desktopNotifications)}
            onChange={() => handleTopToggle('desktopNotifications')}
            className="w-4 h-4 accent-blue-600 cursor-pointer"
          />
        </div>
      </div>

      {/* Email Category Toggles */}
      <div className="space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
          Email Notification Types
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { key: 'auditCompleted', label: 'CSV Audit & Validation Complete', desc: 'Get notified when automated schema or anomaly checks finish.' },
            { key: 'teamInvites', label: 'Team Invites & Mentions', desc: 'Receive emails when tagged in row annotations.' },
            { key: 'weeklyDigest', label: 'Weekly Quality Digest', desc: 'Summary report of total records cleaned and error rates.' },
            { key: 'securityAlerts', label: 'Security & New Login Alerts', desc: 'Instant email alert on new device or IP login.' },
            { key: 'fileShared', label: 'File Shared With You', desc: 'Get notified when a dataset is shared with your account.' },
          ].map((item) => (
            <div
              key={item.key}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">{item.label}</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.desc}</p>
              </div>
              <input
                type="checkbox"
                checked={Boolean(notif.emailNotifications[item.key as keyof SystemSettings['notifications']['emailNotifications']])}
                onChange={() => handleEmailToggle(item.key as keyof SystemSettings['notifications']['emailNotifications'])}
                className="w-4 h-4 accent-blue-600 cursor-pointer shrink-0"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Sound Volume & Quiet Hours */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* Volume */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
          <label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Volume2 className="w-3.5 h-3.5 text-blue-500" /> Sound Volume</span>
            <span className="text-blue-500 font-mono">{notif.notificationVolume || 80}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={notif.notificationVolume || 80}
            onChange={(e) =>
              updateSettings({
                notifications: { ...notif, notificationVolume: Number(e.target.value) },
              })
            }
            className="w-full accent-blue-600 cursor-pointer"
          />
        </div>

        {/* Quiet Hours */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Moon className="w-3.5 h-3.5 text-purple-500" /> Do Not Disturb Schedule
            </label>
            <input
              type="checkbox"
              checked={Boolean(notif.dndSchedule?.enabled)}
              onChange={(e) =>
                updateSettings({
                  notifications: {
                    ...notif,
                    dndSchedule: { ...notif.dndSchedule, enabled: e.target.checked },
                  },
                })
              }
              className="w-4 h-4 accent-blue-600 cursor-pointer"
            />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <input
              type="time"
              value={notif.dndSchedule?.startTime || '22:00'}
              onChange={(e) =>
                updateSettings({
                  notifications: {
                    ...notif,
                    dndSchedule: { ...notif.dndSchedule, startTime: e.target.value },
                  },
                })
              }
              className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono"
            />
            <span className="text-slate-400">to</span>
            <input
              type="time"
              value={notif.dndSchedule?.endTime || '07:00'}
              onChange={(e) =>
                updateSettings({
                  notifications: {
                    ...notif,
                    dndSchedule: { ...notif.dndSchedule, endTime: e.target.value },
                  },
                })
              }
              className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
