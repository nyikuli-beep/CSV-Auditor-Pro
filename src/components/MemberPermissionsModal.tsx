import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  Check, 
  X, 
  Sliders, 
  RotateCcw, 
  CheckCheck, 
  Info,
  Layers,
  Sparkles,
  MessageSquare,
  FileSpreadsheet,
  Users,
  Settings,
  Download,
  SearchCheck,
  Wand2
} from 'lucide-react';
import { 
  OrganizationMember, 
  OrganizationRole, 
  OrganizationPermission, 
  PermissionDefinition 
} from '../types';
import { 
  ALL_ORGANIZATION_PERMISSIONS, 
  PERMISSION_DEFINITIONS, 
  DEFAULT_ROLE_PERMISSIONS,
  getMemberPermissions
} from '../lib/teamTenancyService';

interface MemberPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: OrganizationMember | null;
  actorRole: OrganizationRole;
  onSavePermissions: (memberUid: string, permissions: OrganizationPermission[]) => Promise<{ success: boolean; error?: string }>;
  isDarkMode: boolean;
}

export default function MemberPermissionsModal({
  isOpen,
  onClose,
  member,
  actorRole,
  onSavePermissions,
  isDarkMode
}: MemberPermissionsModalProps) {
  if (!isOpen || !member) return null;

  const isOwner = member.role === 'Owner';
  const initialPermissions = getMemberPermissions(member);
  const [selectedPermissions, setSelectedPermissions] = useState<OrganizationPermission[]>(initialPermissions);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const togglePermission = (perm: OrganizationPermission) => {
    if (isOwner) return; // Owner permissions are immutable
    setErrorMessage(null);
    if (selectedPermissions.includes(perm)) {
      setSelectedPermissions(prev => prev.filter(p => p !== perm));
    } else {
      setSelectedPermissions(prev => [...prev, perm]);
    }
  };

  const handleGrantAll = () => {
    if (isOwner) return;
    setSelectedPermissions([...ALL_ORGANIZATION_PERMISSIONS]);
  };

  const handleResetDefaults = () => {
    if (isOwner) return;
    const defaults = DEFAULT_ROLE_PERMISSIONS[member.role] || DEFAULT_ROLE_PERMISSIONS.Member;
    setSelectedPermissions([...defaults]);
  };

  const handleSave = async () => {
    if (isOwner) {
      onClose();
      return;
    }
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const res = await onSavePermissions(member.uid, selectedPermissions);
      if (res.success) {
        onClose();
      } else {
        setErrorMessage(res.error || 'Failed to update permissions.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'data_processing':
        return <FileSpreadsheet className="w-4 h-4 text-blue-500" />;
      case 'collaboration':
        return <MessageSquare className="w-4 h-4 text-emerald-500" />;
      case 'administration':
        return <Settings className="w-4 h-4 text-violet-500" />;
      default:
        return <Layers className="w-4 h-4 text-slate-500" />;
    }
  };

  const getCategoryTitle = (category: string) => {
    switch (category) {
      case 'data_processing':
        return 'Data & Spreadsheet Operations';
      case 'collaboration':
        return 'Team Collaboration & Insights';
      case 'administration':
        return 'Workspace Administration';
      default:
        return category;
    }
  };

  const permissionsByCategory: Record<string, PermissionDefinition[]> = {
    data_processing: [],
    collaboration: [],
    administration: []
  };

  ALL_ORGANIZATION_PERMISSIONS.forEach(id => {
    const def = PERMISSION_DEFINITIONS[id];
    if (def) {
      permissionsByCategory[def.category].push(def);
    }
  });

  return (
    <AnimatePresence>
      <div 
        id="member-permissions-modal-overlay" 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          id="member-permissions-modal-card"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          onClick={e => e.stopPropagation()}
          className={`w-full max-w-2xl rounded-xl border shadow-2xl overflow-hidden my-8 ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Modal Header */}
          <div className={`px-6 py-5 border-b flex items-start justify-between ${
            isDarkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50'
          }`}>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-600">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold tracking-tight flex items-center space-x-2">
                  <span>Granular Member Permissions</span>
                </h3>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Configure resource access policies and operational privileges
                </p>
              </div>
            </div>
            <button
              id="close-permissions-modal-btn"
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors ${
                isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-500'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Target Member Summary Bar */}
          <div className={`px-6 py-3.5 border-b flex items-center justify-between ${
            isDarkMode ? 'border-slate-800/80 bg-slate-900/60' : 'border-slate-100 bg-blue-50/40'
          }`}>
            <div className="flex items-center space-x-3">
              {member.avatar ? (
                <img src={member.avatar} alt={member.displayName} className="w-9 h-9 rounded-full object-cover border border-slate-300 dark:border-slate-700" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-medium flex items-center justify-center text-sm">
                  {member.displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{member.displayName}</span>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                    member.role === 'Owner'
                      ? 'bg-violet-600/10 text-violet-600 border-violet-500/30'
                      : member.role === 'Admin'
                      ? 'bg-blue-600/10 text-blue-600 border-blue-500/30'
                      : 'bg-slate-600/10 text-slate-600 dark:text-slate-300 border-slate-500/30'
                  }`}>
                    {member.role}
                  </span>
                </div>
                <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{member.email}</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                {selectedPermissions.length} / {ALL_ORGANIZATION_PERMISSIONS.length}
              </span>
              <span className={`text-xs block ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                Granted Permissions
              </span>
            </div>
          </div>

          {/* Quick Preset Actions */}
          {!isOwner && (
            <div className={`px-6 py-2.5 border-b flex items-center justify-between text-xs ${
              isDarkMode ? 'border-slate-800 bg-slate-950/20 text-slate-400' : 'border-slate-100 bg-slate-50/50 text-slate-600'
            }`}>
              <span>Quick Configuration Presets:</span>
              <div className="flex items-center space-x-2">
                <button
                  id="grant-all-permissions-btn"
                  type="button"
                  onClick={handleGrantAll}
                  className="px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 hover:bg-blue-100 border border-blue-200 dark:border-blue-800/60 font-medium transition-colors flex items-center space-x-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Grant All</span>
                </button>
                <button
                  id="reset-permissions-defaults-btn"
                  type="button"
                  onClick={handleResetDefaults}
                  className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium transition-colors flex items-center space-x-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to {member.role} Defaults</span>
                </button>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="px-6 pt-4">
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Owner Notice */}
          {isOwner && (
            <div className="px-6 pt-4">
              <div className="p-3.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-700 dark:text-violet-300 text-xs flex items-start space-x-2.5">
                <Lock className="w-4 h-4 flex-shrink-0 mt-0.5 text-violet-600" />
                <div>
                  <p className="font-semibold">Immutable Owner Permissions</p>
                  <p className="mt-0.5 opacity-90">
                    As the primary Organization Owner, all operational, collaboration, and administrative permissions are unconditionally enabled to guarantee workspace continuity.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Permissions Matrix */}
          <div className="px-6 py-4 max-h-[420px] overflow-y-auto space-y-6">
            {Object.entries(permissionsByCategory).map(([category, permissions]) => (
              <div key={category} className="space-y-2.5">
                <div className="flex items-center space-x-2 pb-1 border-b border-slate-200 dark:border-slate-800">
                  {getCategoryIcon(category)}
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    {getCategoryTitle(category)}
                  </h4>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {permissions.map(perm => {
                    const isChecked = selectedPermissions.includes(perm.id) || isOwner;
                    return (
                      <div
                        key={perm.id}
                        onClick={() => togglePermission(perm.id)}
                        className={`p-3 rounded-lg border transition-all flex items-start justify-between cursor-pointer ${
                          isChecked
                            ? isDarkMode
                              ? 'bg-slate-800/80 border-blue-500/40 text-slate-100'
                              : 'bg-blue-50/50 border-blue-300 text-slate-900'
                            : isDarkMode
                            ? 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:border-slate-700'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        } ${isOwner ? 'cursor-default opacity-80' : ''}`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                            isChecked
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : isDarkMode
                              ? 'border-slate-700 bg-slate-900'
                              : 'border-slate-300 bg-white'
                          }`}>
                            {isChecked && <Check className="w-3.5 h-3.5" />}
                          </div>
                          <div>
                            <span className="text-sm font-medium block">
                              {perm.label}
                            </span>
                            <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                              {perm.description}
                            </span>
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ml-3 flex-shrink-0 ${
                          isChecked
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                        }`}>
                          {isChecked ? 'Allowed' : 'Disabled'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Modal Footer */}
          <div className={`px-6 py-4 border-t flex items-center justify-between ${
            isDarkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50'
          }`}>
            <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Changes take effect immediately across all sessions.
            </span>
            <div className="flex items-center space-x-3">
              <button
                id="cancel-permissions-modal-btn"
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                  isDarkMode
                    ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                {isOwner ? 'Close' : 'Cancel'}
              </button>

              {!isOwner && (
                <button
                  id="save-permissions-modal-btn"
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-1.5 shadow-sm"
                >
                  {isSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Apply Permissions</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
