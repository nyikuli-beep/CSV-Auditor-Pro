import React, { useState, useMemo } from 'react';
import { 
  History, 
  ShieldCheck, 
  ShieldAlert, 
  UserPlus, 
  UserCheck, 
  UserX, 
  KeyRound, 
  Sliders, 
  Building2, 
  FileSpreadsheet, 
  Download, 
  Search, 
  Filter, 
  Clock, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  Info, 
  FileText, 
  Lock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { OrganizationAuditLog, OrganizationRole } from '../types';
import { isOrganizationAdmin } from '../lib/teamTenancyService';

interface OrganizationAuditLogsTabProps {
  logs: OrganizationAuditLog[];
  isLoading: boolean;
  actorRole: OrganizationRole;
  isDarkMode: boolean;
  onRefresh: () => void;
}

export default function OrganizationAuditLogsTab({
  logs,
  isLoading,
  actorRole,
  isDarkMode,
  onRefresh
}: OrganizationAuditLogsTabProps) {
  const canView = isOrganizationAdmin(actorRole);

  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<'all' | 'members' | 'roles_permissions' | 'settings' | 'data'>('all');
  const [selectedLogForDetails, setSelectedLogForDetails] = useState<OrganizationAuditLog | null>(null);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // 1. Action category filter
      if (actionFilter === 'members') {
        const isMemberAction = log.action.startsWith('member.invited') || 
                               log.action.startsWith('member.accepted') || 
                               log.action.startsWith('member.cancelled') || 
                               log.action.startsWith('member.resent') || 
                               log.action.startsWith('member.removed');
        if (!isMemberAction) return false;
      } else if (actionFilter === 'roles_permissions') {
        const isRoleOrPerm = log.action.startsWith('member.role_changed') || 
                             log.action.startsWith('member.permissions_updated');
        if (!isRoleOrPerm) return false;
      } else if (actionFilter === 'settings') {
        const isSettings = log.action.startsWith('organization.') || log.action.startsWith('owner.');
        if (!isSettings) return false;
      } else if (actionFilter === 'data') {
        const isData = log.action.startsWith('csv.') || log.action.startsWith('report.');
        if (!isData) return false;
      }

      // 2. Search query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchActor = (log.actor.email || '').toLowerCase().includes(q) || 
                         (log.actor.displayName || '').toLowerCase().includes(q) ||
                         (log.actor.uid || '').toLowerCase().includes(q);
      const matchTarget = (log.target?.email || '').toLowerCase().includes(q) || 
                          (log.target?.name || '').toLowerCase().includes(q) ||
                          (log.target?.id || '').toLowerCase().includes(q);
      const matchAction = log.action.toLowerCase().includes(q);
      return matchActor || matchTarget || matchAction;
    });
  }, [logs, actionFilter, searchQuery]);

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'member.invited':
        return {
          icon: <UserPlus className="w-3.5 h-3.5" />,
          label: 'Member Invited',
          color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
        };
      case 'member.accepted':
        return {
          icon: <UserCheck className="w-3.5 h-3.5" />,
          label: 'Invite Accepted',
          color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
        };
      case 'member.cancelled':
        return {
          icon: <UserX className="w-3.5 h-3.5" />,
          label: 'Invite Cancelled',
          color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
        };
      case 'member.resent':
        return {
          icon: <RefreshCw className="w-3.5 h-3.5" />,
          label: 'Invite Resent',
          color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20'
        };
      case 'member.removed':
        return {
          icon: <UserX className="w-3.5 h-3.5" />,
          label: 'Member Removed',
          color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
        };
      case 'member.role_changed':
        return {
          icon: <KeyRound className="w-3.5 h-3.5" />,
          label: 'Role Changed',
          color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20'
        };
      case 'member.permissions_updated':
        return {
          icon: <Sliders className="w-3.5 h-3.5" />,
          label: 'Permissions Updated',
          color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
        };
      case 'organization.updated':
        return {
          icon: <Building2 className="w-3.5 h-3.5" />,
          label: 'Settings Updated',
          color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
        };
      case 'csv.audited':
      case 'csv.uploaded':
      case 'csv.cleaned':
        return {
          icon: <FileSpreadsheet className="w-3.5 h-3.5" />,
          label: action.replace('.', ' ').toUpperCase(),
          color: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20'
        };
      default:
        return {
          icon: <History className="w-3.5 h-3.5" />,
          label: action.replace('.', ' ').toUpperCase(),
          color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
        };
    }
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `organization-audit-logs-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'Log ID', 'Action', 'Actor UID', 'Actor Email', 'Actor Role', 'Target Email', 'Metadata'];
    const rows = filteredLogs.map(l => [
      l.timestamp,
      l.id,
      l.action,
      l.actor.uid,
      l.actor.email,
      l.actor.role,
      l.target?.email || '',
      JSON.stringify(l.metadata || {})
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `organization-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (!canView) {
    return (
      <div className={`p-8 rounded-xl border text-center ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 mx-auto flex items-center justify-center mb-4">
          <Lock className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold">Restricted Access: Audit Logs</h3>
        <p className={`text-xs mt-1.5 max-w-md mx-auto ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          The immutable organization audit ledger is restricted to Organization Owners and Administrators to preserve compliance and governance privacy.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls & Filter Bar */}
      <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        {/* Search */}
        <div className="relative flex-1">
          <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${
            isDarkMode ? 'text-slate-500' : 'text-slate-400'
          }`} />
          <input
            type="text"
            id="audit-log-search-input"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by actor, target email, or action keyword..."
            className={`w-full pl-9 pr-4 py-2 text-xs rounded-lg border outline-none transition-colors ${
              isDarkMode
                ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600 focus:border-blue-500'
                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500'
            }`}
          />
        </div>

        {/* Category Filters */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setActionFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              actionFilter === 'all'
                ? 'bg-blue-600 text-white'
                : isDarkMode
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Logs
          </button>
          <button
            type="button"
            onClick={() => setActionFilter('members')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              actionFilter === 'members'
                ? 'bg-blue-600 text-white'
                : isDarkMode
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Invitations & Members
          </button>
          <button
            type="button"
            onClick={() => setActionFilter('roles_permissions')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              actionFilter === 'roles_permissions'
                ? 'bg-blue-600 text-white'
                : isDarkMode
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Roles & Permissions
          </button>
          <button
            type="button"
            onClick={() => setActionFilter('settings')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              actionFilter === 'settings'
                ? 'bg-blue-600 text-white'
                : isDarkMode
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Org Settings
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            id="refresh-audit-logs-btn"
            type="button"
            onClick={onRefresh}
            title="Refresh logs"
            className={`p-2 rounded-lg border transition-colors ${
              isDarkMode
                ? 'border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800'
                : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            id="export-audit-csv-btn"
            type="button"
            onClick={handleExportCSV}
            title="Export CSV"
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center space-x-1.5 transition-colors ${
              isDarkMode
                ? 'border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800'
                : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Download className="w-3.5 h-3.5 text-blue-500" />
            <span>Export CSV</span>
          </button>

          <button
            id="export-audit-json-btn"
            type="button"
            onClick={handleExportJSON}
            title="Export JSON"
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center space-x-1.5 transition-colors ${
              isDarkMode
                ? 'border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800'
                : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-violet-500" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* Logs Table / List */}
      <div className={`rounded-xl border overflow-hidden ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isDarkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50'
        }`}>
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-semibold">Immutable Organization Audit Trail</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${
              isDarkMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-200 text-slate-700 border-slate-300'
            }`}>
              {filteredLogs.length} events
            </span>
          </div>
          <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Tamper-proof append-only ledger
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Loading audit events...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center">
            <History className={`w-10 h-10 mx-auto mb-3 ${isDarkMode ? 'text-slate-700' : 'text-slate-300'}`} />
            <h4 className="text-sm font-semibold">No audit records found</h4>
            <p className={`text-xs mt-1 max-w-sm mx-auto ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {searchQuery ? 'No audit records match your search criteria.' : 'Events will be automatically recorded as actions take place within your team workspace.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredLogs.map(log => {
              const badge = getActionBadge(log.action);
              const formattedDate = new Date(log.timestamp).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              });

              return (
                <div
                  key={log.id}
                  className={`p-4 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                    isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50/80'
                  }`}
                >
                  {/* Left Column: Action badge & Actor details */}
                  <div className="flex items-start space-x-3">
                    <div className={`mt-0.5 px-2.5 py-1 rounded-md border text-[11px] font-bold uppercase flex items-center space-x-1.5 flex-shrink-0 ${badge.color}`}>
                      {badge.icon}
                      <span>{badge.label}</span>
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold">{log.actor.displayName || log.actor.email}</span>
                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.2 rounded border ${
                          log.actor.role === 'Owner'
                            ? 'bg-violet-500/10 text-violet-600 border-violet-500/20'
                            : log.actor.role === 'Admin'
                            ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                            : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
                        }`}>
                          {log.actor.role}
                        </span>
                      </div>

                      {log.target && (
                        <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          Target: <span className="font-medium">{log.target.name || log.target.email || log.target.id}</span>
                          {log.target.type && <span className="text-[10px] text-slate-500 ml-1">({log.target.type})</span>}
                        </p>
                      )}

                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {Object.entries(log.metadata).map(([k, v]) => (
                            <span
                              key={k}
                              className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${
                                isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                              }`}
                            >
                              {k}: {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Timestamp & Inspector */}
                  <div className="flex items-center justify-between md:justify-end space-x-3 text-right">
                    <div className="text-right">
                      <span className={`text-xs font-mono block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {formattedDate}
                      </span>
                      <span className={`text-[10px] font-mono block ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>
                        {log.id}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedLogForDetails(log)}
                      title="Inspect metadata"
                      className={`p-1.5 rounded-lg border transition-colors ${
                        isDarkMode
                          ? 'border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-400'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Metadata Inspector Modal */}
      {selectedLogForDetails && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
          onClick={() => setSelectedLogForDetails(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className={`w-full max-w-lg rounded-xl border shadow-2xl overflow-hidden p-6 ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-semibold">Audit Record Inspector</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLogForDetails(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                &times;
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div>
                <span className="font-semibold text-slate-400 block mb-1">Event ID & Timestamp:</span>
                <p className="font-mono">{selectedLogForDetails.id} • {selectedLogForDetails.timestamp}</p>
              </div>

              <div>
                <span className="font-semibold text-slate-400 block mb-1">Action:</span>
                <p className="font-bold text-blue-600 dark:text-blue-400">{selectedLogForDetails.action}</p>
              </div>

              <div>
                <span className="font-semibold text-slate-400 block mb-1">Actor Information:</span>
                <div className={`p-2.5 rounded-lg border font-mono text-[11px] ${
                  isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <p>Email: {selectedLogForDetails.actor.email}</p>
                  <p>Name: {selectedLogForDetails.actor.displayName || 'N/A'}</p>
                  <p>Role: {selectedLogForDetails.actor.role}</p>
                </div>
              </div>

              {selectedLogForDetails.target && (
                <div>
                  <span className="font-semibold text-slate-400 block mb-1">Target Information:</span>
                  <div className={`p-2.5 rounded-lg border font-mono text-[11px] ${
                    isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    {selectedLogForDetails.target.name && <p>Name: {selectedLogForDetails.target.name}</p>}
                    {selectedLogForDetails.target.email && <p>Email: {selectedLogForDetails.target.email}</p>}
                    {selectedLogForDetails.target.type && <p>Type: {selectedLogForDetails.target.type}</p>}
                    {selectedLogForDetails.target.id && <p>Reference: {selectedLogForDetails.target.id}</p>}
                  </div>
                </div>
              )}

              <div>
                <span className="font-semibold text-slate-400 block mb-1">Payload Metadata:</span>
                <pre className={`p-3 rounded-lg border font-mono text-[11px] overflow-x-auto ${
                  isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}>
                  {JSON.stringify(selectedLogForDetails.metadata || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-right">
              <button
                type="button"
                onClick={() => setSelectedLogForDetails(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
