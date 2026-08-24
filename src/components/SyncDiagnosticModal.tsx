import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity,
  X,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Wifi,
  WifiOff,
  Server,
  Layers,
  ShieldCheck,
  Users,
  FileSpreadsheet,
  Mail,
  Copy,
  Check,
  Terminal
} from 'lucide-react';
import { useTeamTenancy } from '../context/TeamTenancyContext';

interface SyncDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SyncDiagnosticModal: React.FC<SyncDiagnosticModalProps> = ({ isOpen, onClose }) => {
  const {
    uid,
    sessionId,
    deviceId,
    userEmail,
    isOnline,
    isFromCache,
    isReconciling,
    synchronizationStatus,
    lastSyncTimestamp,
    sessionVersion,
    membershipVersion,
    workspaceVersion,
    notificationVersion,
    activeWorkspaceId,
    activeOrganization,
    workspaces,
    members,
    currentRole,
    permissions,
    incomingInvitations,
    activeOrgInvitations,
    workspaceFiles,
    reconcileSession
  } = useTeamTenancy();

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleForceReconcile = async () => {
    setIsRefreshing(true);
    try {
      await reconcileSession('manual_diagnostic_button');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.15 }}
          className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-[#0f172a] text-slate-100 rounded-xl border border-slate-700 shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#1e293b]">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white tracking-wide">
                  Cross-Device Session & Tenancy Diagnostics
                </h3>
                <p className="text-xs text-slate-400">
                  Real-time synchronization state, versioning vector, and membership telemetry
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleForceReconcile}
                disabled={isReconciling || isRefreshing}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-blue-400 bg-blue-950/60 hover:bg-blue-900/60 border border-blue-700/50 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isReconciling || isRefreshing ? 'animate-spin' : ''}`} />
                <span>Reconcile Server State</span>
              </button>

              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5 text-sm">
            {/* Status Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Sync Status */}
              <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700/60">
                <span className="text-xs text-slate-400 block mb-1">Sync Pipeline</span>
                <div className="flex items-center space-x-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      synchronizationStatus === 'synced'
                        ? 'bg-emerald-500'
                        : synchronizationStatus === 'syncing'
                        ? 'bg-blue-500 animate-pulse'
                        : synchronizationStatus === 'reconnecting'
                        ? 'bg-amber-500 animate-pulse'
                        : 'bg-red-500'
                    }`}
                  />
                  <span className="font-medium text-white capitalize">{synchronizationStatus}</span>
                </div>
              </div>

              {/* Network */}
              <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700/60">
                <span className="text-xs text-slate-400 block mb-1">Network Connectivity</span>
                <div className="flex items-center space-x-2">
                  {isOnline ? (
                    <Wifi className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-red-400" />
                  )}
                  <span className="font-medium text-white">{isOnline ? 'Online (Connected)' : 'Offline (Cached)'}</span>
                </div>
              </div>

              {/* Data Origin */}
              <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700/60">
                <span className="text-xs text-slate-400 block mb-1">Data Source</span>
                <div className="flex items-center space-x-2">
                  <Server className="w-4 h-4 text-blue-400" />
                  <span className="font-medium text-white">
                    {isFromCache ? 'Local Cache' : 'Authoritative Cloud'}
                  </span>
                </div>
              </div>

              {/* Last Sync */}
              <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700/60">
                <span className="text-xs text-slate-400 block mb-1">Last Reconciliation</span>
                <span className="font-medium text-white text-xs truncate block">
                  {new Date(lastSyncTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            </div>

            {/* Versioning Vector */}
            <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Cross-Device Version Vector (users/{uid || 'anon'}/sync/state)
                  </h4>
                </div>
                <span className="text-[11px] text-slate-400">Server-Authoritative Clock</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800 text-center">
                  <span className="text-[11px] text-slate-400 block">Session Version</span>
                  <span className="text-lg font-bold text-blue-400">v{sessionVersion}</span>
                </div>
                <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800 text-center">
                  <span className="text-[11px] text-slate-400 block">Membership Version</span>
                  <span className="text-lg font-bold text-emerald-400">v{membershipVersion}</span>
                </div>
                <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800 text-center">
                  <span className="text-[11px] text-slate-400 block">Workspace Version</span>
                  <span className="text-lg font-bold text-amber-400">v{workspaceVersion}</span>
                </div>
                <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800 text-center">
                  <span className="text-[11px] text-slate-400 block">Notification Version</span>
                  <span className="text-lg font-bold text-indigo-400">v{notificationVersion}</span>
                </div>
              </div>
            </div>

            {/* Identifiers & Tenancy State */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Session Identifiers */}
              <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/80 space-y-3">
                <div className="flex items-center space-x-2 text-slate-300">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider">Device & Session Identity</h4>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 block">Authenticated User UID:</span>
                    <div className="flex items-center justify-between p-2 bg-slate-900 rounded border border-slate-800 font-mono text-slate-200">
                      <span className="truncate mr-2">{uid || 'Not Authenticated'}</span>
                      {uid && (
                        <button onClick={() => copyToClipboard(uid, 'uid')} className="text-slate-400 hover:text-white">
                          {copiedField === 'uid' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block">Email Identity:</span>
                    <div className="p-2 bg-slate-900 rounded border border-slate-800 text-slate-200">
                      {userEmail || 'Anonymous'}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block">Active Session ID:</span>
                    <div className="flex items-center justify-between p-2 bg-slate-900 rounded border border-slate-800 font-mono text-slate-200">
                      <span className="truncate mr-2">{sessionId}</span>
                      <button onClick={() => copyToClipboard(sessionId, 'sess')} className="text-slate-400 hover:text-white">
                        {copiedField === 'sess' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block">Persistent Device ID:</span>
                    <div className="flex items-center justify-between p-2 bg-slate-900 rounded border border-slate-800 font-mono text-slate-200">
                      <span className="truncate mr-2">{deviceId}</span>
                      <button onClick={() => copyToClipboard(deviceId, 'dev')} className="text-slate-400 hover:text-white">
                        {copiedField === 'dev' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tenancy & Authoritative Workspace */}
              <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/80 space-y-3">
                <div className="flex items-center space-x-2 text-slate-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider">Authoritative Workspace & Role</h4>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 block">Active Workspace ID:</span>
                    <div className="p-2 bg-slate-900 rounded border border-slate-800 font-mono text-emerald-400">
                      {activeWorkspaceId}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block">Workspace Organization:</span>
                    <div className="p-2 bg-slate-900 rounded border border-slate-800 text-slate-200">
                      {activeOrganization?.name || 'Enterprise Data Workspace'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 block">Assigned Role:</span>
                      <div className="p-2 bg-slate-900 rounded border border-slate-800 font-semibold text-blue-400">
                        {currentRole}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 block">Authorized Workspaces:</span>
                      <div className="p-2 bg-slate-900 rounded border border-slate-800 text-slate-200">
                        {workspaces.length} workspace(s)
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block">Active Permissions ({permissions.length}):</span>
                    <div className="flex flex-wrap gap-1 p-2 bg-slate-900 rounded border border-slate-800 max-h-16 overflow-y-auto">
                      {permissions.map((p) => (
                        <span key={p} className="px-1.5 py-0.5 bg-slate-800 text-slate-300 text-[10px] rounded">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cross-Device Telemetry Summary */}
            <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/80">
              <div className="flex items-center space-x-2 text-slate-300 mb-3">
                <Users className="w-4 h-4 text-blue-400" />
                <h4 className="text-xs font-semibold uppercase tracking-wider">Scoped Workspace Telemetry</h4>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block mb-1">Active Members</span>
                  <span className="text-base font-bold text-white">{members.length}</span>
                </div>

                <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block mb-1">Authoritative Datasets</span>
                  <span className="text-base font-bold text-emerald-400">{workspaceFiles.length}</span>
                </div>

                <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block mb-1">Pending Inbound Invites</span>
                  <span className="text-base font-bold text-amber-400">{incomingInvitations.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-[#1e293b] text-xs text-slate-400">
            <span>CSV Auditor Pro • Central Session Synchronization Layer</span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
