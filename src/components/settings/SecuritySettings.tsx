import React, { useState } from 'react';
import { usePersonalization } from '../../context/PersonalizationContext';
import { SystemSettings } from '../../types';
import { Lock, ShieldCheck, Key, ShieldAlert, Monitor, CheckCircle2, QrCode, RefreshCw } from 'lucide-react';

export const SecuritySettings: React.FC<{ isDarkMode: boolean; isOwner?: boolean }> = ({ isDarkMode, isOwner = true }) => {
  const { settings, updateSettings, resetCategory } = usePersonalization();
  const sec = settings.security;

  const [show2FAQR, setShow2FAQR] = useState(false);
  const [showBackupCodesModal, setShowBackupCodesModal] = useState(false);
  const [passForm, setPassForm] = useState({ current: '', next: '', confirm: '' });
  const [passMsg, setPassMsg] = useState('');

  const sessions = sec.sessionManagement || [
    { id: 'sess-1', device: 'Chrome on MacOS (This Device)', ip: '192.168.1.45', location: 'London, UK', lastActive: 'Active now', isCurrent: true },
    { id: 'sess-2', device: 'Safari on iPhone 15 Pro', ip: '82.132.210.12', location: 'London, UK', lastActive: '2 hours ago', isCurrent: false },
  ];

  const revokeSession = (id: string) => {
    const updated = sessions.filter((s) => s.id !== id);
    updateSettings({
      security: { ...sec, sessionManagement: updated },
    });
  };

  const handlePassChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (passForm.next !== passForm.confirm) {
      setPassMsg('Error: New password and confirmation do not match');
      return;
    }
    if (passForm.next.length < 8) {
      setPassMsg('Error: Password must be at least 8 characters long');
      return;
    }
    setPassMsg('Success: Password updated securely');
    setPassForm({ current: '', next: '', confirm: '' });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-500" />
            Security, Authentication & Active Sessions
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage two-factor authentication (2FA), active session revocation, login alerts, and password credentials.
          </p>
        </div>
        {!isOwner && (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" /> Owner Restricted
          </span>
        )}
      </div>

      {/* 2FA & Biometric */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 2FA */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Two-Factor Authentication (2FA)</span>
            </div>
            <input
              type="checkbox"
              checked={Boolean(sec.twoFactorAuth)}
              onChange={(e) => {
                const next = e.target.checked;
                updateSettings({ security: { ...sec, twoFactorAuth: next } });
                if (next) setShow2FAQR(true);
              }}
              className="w-4 h-4 accent-blue-600 cursor-pointer"
            />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Require TOTP authenticator app token (Google Authenticator, 1Password) during login.
          </p>

          {sec.twoFactorAuth && (
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShow2FAQR(true)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5" /> View QR Setup
              </button>
              <button
                type="button"
                onClick={() => setShowBackupCodesModal(true)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Backup Emergency Codes
              </button>
            </div>
          )}
        </div>

        {/* Biometric */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Biometric Passkey (WebAuthn / TouchID)</span>
            </div>
            <input
              type="checkbox"
              checked={Boolean(sec.biometricAuth)}
              onChange={(e) => updateSettings({ security: { ...sec, biometricAuth: e.target.checked } })}
              className="w-4 h-4 accent-blue-600 cursor-pointer"
            />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Allow instant hardware passkey sign-in using TouchID, FaceID, or YubiKey.
          </p>
        </div>
      </div>

      {/* Active Session Management */}
      <div className="space-y-3 pt-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block flex items-center gap-1.5">
          <Monitor className="w-3.5 h-3.5 text-blue-500" /> Active Devices & Sessions ({sessions.length})
        </label>
        <div className="space-y-2">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{s.device}</span>
                  {s.isCurrent && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded">
                      This Device
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  IP: {s.ip} • Location: {s.location} • Last Active: {s.lastActive}
                </div>
              </div>

              {!s.isCurrent && (
                <button
                  type="button"
                  onClick={() => revokeSession(s.id)}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 cursor-pointer"
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Change Password Form */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Update Password</h4>
        {passMsg && (
          <div className={`p-2 rounded-lg text-xs font-bold ${passMsg.startsWith('Success') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
            {passMsg}
          </div>
        )}
        <form onSubmit={handlePassChange} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="password"
            placeholder="Current Password"
            value={passForm.current}
            onChange={(e) => setPassForm({ ...passForm, current: e.target.value })}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100"
          />
          <input
            type="password"
            placeholder="New Password"
            value={passForm.next}
            onChange={(e) => setPassForm({ ...passForm, next: e.target.value })}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100"
          />
          <input
            type="password"
            placeholder="Confirm New Password"
            value={passForm.confirm}
            onChange={(e) => setPassForm({ ...passForm, confirm: e.target.value })}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100"
          />
          <button
            type="submit"
            className="sm:col-span-3 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer transition-all"
          >
            Update Password
          </button>
        </form>
      </div>

      {/* 2FA QR Modal */}
      {show2FAQR && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl max-w-sm w-full space-y-4 text-center">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Scan 2FA QR Code</h3>
            <div className="w-48 h-48 mx-auto bg-slate-100 dark:bg-slate-950 rounded-xl p-4 flex items-center justify-center border">
              <QrCode className="w-36 h-36 text-slate-800 dark:text-slate-200" />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Secret Key: <strong className="font-mono text-blue-500">K7X2-9PMB-4LQZ-8W1N</strong>
            </p>
            <button
              type="button"
              onClick={() => setShow2FAQR(false)}
              className="w-full py-2 text-xs font-bold bg-blue-600 text-white rounded-xl cursor-pointer"
            >
              Done & Verify
            </button>
          </div>
        </div>
      )}

      {/* Backup Codes Modal */}
      {showBackupCodesModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl max-w-sm w-full space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 text-center">Emergency Backup Codes</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center">Save these 8-digit codes in a secure location.</p>
            <div className="grid grid-cols-2 gap-2 font-mono text-xs bg-slate-100 dark:bg-slate-950 p-3 rounded-xl border">
              {['8492-1049', '3910-4821', '9401-2940', '1930-4910', '5810-3912', '7492-0193'].map((code, idx) => (
                <div key={idx} className="p-1 text-center bg-white dark:bg-slate-900 rounded border">
                  {code}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowBackupCodesModal(false)}
              className="w-full py-2 text-xs font-bold bg-blue-600 text-white rounded-xl cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
