import React from 'react';
import { usePersonalization } from '../../context/PersonalizationContext';
import { SystemSettings } from '../../types';
import { User, RefreshCw, Mail, Building, Briefcase, Camera, Check } from 'lucide-react';

export const ProfileSettings: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
  const { settings, updateSettings, resetCategory } = usePersonalization();
  const prof = settings.profile;

  const handleTextChange = (key: keyof SystemSettings['profile'], val: string) => {
    updateSettings({
      profile: { ...prof, [key]: val },
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <User className="w-5 h-5 text-blue-500" />
            User Profile & Account Personalization
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Update your display name, organization role, job title, avatar photo, and default workspace landing screen.
          </p>
        </div>
      </div>

      {/* Avatar & Display Name */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-center gap-4">
        <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-blue-500 shrink-0">
          <img
            src={prof.avatarUrl || '/macbook_code.jpg'}
            alt="User Avatar"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
            <Camera className="w-5 h-5" />
          </div>
        </div>

        <div className="flex-1 space-y-1 text-center sm:text-left">
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">{prof.displayName || 'Nyikuli Bramwel'}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">{prof.jobTitle || 'Lead Data Auditor & Operations Owner'}</p>
          <span className="inline-block px-2 py-0.5 text-[10px] font-mono font-bold uppercase bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded">
            Primary Owner Account
          </span>
        </div>
      </div>

      {/* Profile Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Display Name</label>
          <input
            type="text"
            value={prof.displayName || ''}
            onChange={(e) => handleTextChange('displayName', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 font-semibold"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Job Title / Role</label>
          <input
            type="text"
            value={prof.jobTitle || ''}
            onChange={(e) => handleTextChange('jobTitle', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 font-semibold"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Organization / Enterprise</label>
          <input
            type="text"
            value={prof.organization || ''}
            onChange={(e) => handleTextChange('organization', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 font-semibold"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Department</label>
          <input
            type="text"
            value={prof.department || ''}
            onChange={(e) => handleTextChange('department', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 font-semibold"
          />
        </div>

        <div className="md:col-span-2 space-y-1">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Professional Bio</label>
          <textarea
            rows={2}
            value={prof.bio || ''}
            onChange={(e) => handleTextChange('bio', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 font-medium"
          />
        </div>
      </div>
    </div>
  );
};
