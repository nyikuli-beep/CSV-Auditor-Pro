import React from 'react';
import { usePersonalization } from '../../context/PersonalizationContext';
import { SystemSettings } from '../../types';
import { Users, RefreshCw, MessageSquare, BellRing, Eye, Shield } from 'lucide-react';

export const CollaborationSettings: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
  const { settings, updateSettings, resetCategory } = usePersonalization();
  const col = settings.collaboration;

  const handleToggle = (key: keyof SystemSettings['collaboration']) => {
    updateSettings({
      collaboration: { ...col, [key]: !(col[key]) },
    });
  };

  const handleSelect = (key: keyof SystemSettings['collaboration'], val: any) => {
    updateSettings({
      collaboration: { ...col, [key]: val },
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            Team Collaboration & Real-Time Presence
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage real-time typing indicators, read receipts, annotation defaults, team member color tags, and chat behavior.
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { key: 'typingIndicators', label: 'Real-time Typing Indicators', desc: 'Display live typing badges when team members are commenting or auditing.' },
          { key: 'readReceipts', label: 'Read Receipts for Chat Messages', desc: 'Notify team members when row annotations or messages have been read.' },
          { key: 'onlinePresence', label: 'Show Online Status Badges', desc: 'Display active green status indicators on team collaborator avatars.' },
          { key: 'mentionNotifications', label: 'Tag & Mention Alerts (@username)', desc: 'Highlight team comments when your username or role is tagged.' },
          { key: 'autoScrollChat', label: 'Auto-scroll Chat Timeline', desc: 'Automatically jump to new incoming team comments and dataset annotations.' },
          { key: 'playNotificationSound', label: 'Collaboration Sound Alerts', desc: 'Play subtle chime when receiving new team comments.' },
          { key: 'teamColorTags', label: 'Team Member Color Tags', desc: 'Assign unique border colors to team members editing cells.' },
          { key: 'muteConversations', label: 'Mute Workspace Chat (Focus Mode)', desc: 'Temporarily silence non-essential chat popups while auditing.' },
        ].map((item) => (
          <div
            key={item.key}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between"
          >
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">{item.label}</span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</p>
            </div>
            <input
              type="checkbox"
              checked={Boolean((col as any)[item.key])}
              onChange={() => handleToggle(item.key as any)}
              className="w-4 h-4 accent-blue-600 cursor-pointer shrink-0"
            />
          </div>
        ))}
      </div>

      {/* Default Annotation Visibility */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
        <label className="text-xs font-bold text-slate-900 dark:text-slate-100 block">Default Annotation Visibility</label>
        <select
          value={col.defaultAnnotationVisibility || 'team'}
          onChange={(e) => handleSelect('defaultAnnotationVisibility', e.target.value)}
          className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-slate-100"
        >
          <option value="public">Public (Visible to All Workspace Members)</option>
          <option value="team">Team Only (Visible to Assigned Team)</option>
          <option value="private">Private (Only Visible to Me)</option>
        </select>
      </div>
    </div>
  );
};
