import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  UserPlus, 
  MessageSquare, 
  Activity, 
  Send, 
  Clock, 
  CheckCircle2, 
  ShieldAlert, 
  AlertTriangle,
  Mail,
  UserCheck,
  Trash2
} from 'lucide-react';
import { TeamMember, AuditActivity } from '../types';

interface TeamCollaborationProps {
  members: TeamMember[];
  onInviteMember: (newMember: TeamMember) => void;
  onDeleteMember?: (id: string, email: string) => void;
  activities: AuditActivity[];
  isDarkMode: boolean;
  accentClass: string;
}

interface CommentThread {
  id: string;
  author: string;
  role: string;
  text: string;
  time: string;
}

export default function TeamCollaboration({ members, onInviteMember, onDeleteMember, activities, isDarkMode, accentClass }: TeamCollaborationProps) {
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'Owner' | 'Admin' | 'Editor' | 'Viewer'>('Editor');
  const [successMsg, setSuccessMsg] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Local comments state
  const [comments, setComments] = useState<CommentThread[]>([
    { id: 'c1', author: 'Marcus Vance', role: 'Admin', text: 'Sarah, I noticed row 7 has an extreme transaction outlier of 1.5M. Let\'s verify this with the sales ledger before pushing.', time: '2026-06-23 10:45 AM' },
    { id: 'c2', author: 'Leila Chen', role: 'Editor', text: 'Agreed, I am on hold on that row. I standardized the country abbreviations in row 6 to capital US.', time: '2026-06-23 11:15 AM' }
  ]);
  const [newCommentText, setNewCommentText] = useState('');

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName || !inviteEmail) return;

    onInviteMember({
      id: `usr-${Date.now()}`,
      name: inviteName,
      email: inviteEmail,
      role: inviteRole,
      status: 'invited'
    });

    setInviteName('');
    setInviteEmail('');
    setSuccessMsg(`Successfully dispatched invitation to ${inviteEmail}!`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    setComments([
      ...comments,
      {
        id: `c-${Date.now()}`,
        author: 'Sarah Jenkins',
        role: 'Owner',
        text: newCommentText,
        time: 'Just now'
      }
    ]);
    setNewCommentText('');
  };

  const getRoleBadge = (role: 'Owner' | 'Admin' | 'Editor' | 'Viewer') => {
    switch (role) {
      case 'Owner': return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 uppercase">Owner</span>;
      case 'Admin': return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase">Admin</span>;
      case 'Editor': return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">Editor</span>;
      case 'Viewer': return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-500/10 text-slate-400 border border-slate-700 uppercase">Viewer</span>;
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <span className="text-xs font-mono font-bold text-blue-500 uppercase tracking-widest flex items-center gap-1">
          <Users className="w-3.5 h-3.5" /> Company Tenancy
        </span>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Team Collaboration</h1>
        <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          Assign administrative roles, comment on flagged anomalies, and audit team execution timelines.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left column: Invite and Members list */}
        <div className="lg:col-span-7 space-y-6">
          {/* Invite form */}
          <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'}`}>
            <h3 className="font-bold text-sm uppercase tracking-wider text-slate-400 mb-5 flex items-center gap-2"><UserPlus className="w-4 h-4 text-blue-500" /> Invite Team Member</h3>
            
            {successMsg && (
              <div className="p-3 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleInvite} className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-4">
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest">Name</label>
                <input 
                  type="text" 
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="John Doe" 
                  className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-950'}`}
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest">Email</label>
                <input 
                  type="email" 
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="john@company.com" 
                  className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-950'}`}
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest">Role</label>
                <div className="flex gap-2">
                  <select 
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className={`flex-1 px-3 py-2 text-xs rounded-xl border focus:outline-none ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-950'}`}
                  >
                    <option value="Admin">Admin</option>
                    <option value="Editor">Editor</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                  <button 
                    type="submit"
                    className={`px-3 py-2 text-white font-semibold rounded-xl text-xs hover:scale-102 transition-all cursor-pointer ${accentClass}`}
                  >
                    Invite
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Members list */}
          <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'}`}>
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5"><UserCheck className="w-4 h-4 text-violet-500" /> Active Workspace Members ({members.length})</h3>
            <div className="divide-y divide-slate-800/60 text-xs">
              {members.map((m) => (
                <div key={m.id} className="py-3.5 flex justify-between items-center gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {m.avatar ? (
                      <img src={m.avatar} alt={m.name} className="w-8 h-8 rounded-full object-cover border border-slate-800" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-800 shrink-0 font-bold text-[10px] flex items-center justify-center text-white border border-slate-700">
                        {m.name.split(' ').map(n => n[0]).join('')}
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="font-bold block truncate">{m.name}</span>
                      <span className="text-[10px] text-slate-400 block truncate">{m.email}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {getRoleBadge(m.role)}
                    <span className={`text-[10px] font-bold ${m.status === 'active' ? 'text-emerald-500' : 'text-slate-400 italic'}`}>
                      {m.status === 'active' ? 'Active' : 'Invited'}
                    </span>

                    {m.role !== 'Owner' && onDeleteMember && (
                      <div className="flex items-center ml-2">
                        {deletingId === m.id ? (
                          <div className="flex items-center gap-1.5 animate-fadeIn">
                            <button
                              onClick={() => {
                                onDeleteMember(m.id, m.email);
                                setDeletingId(null);
                              }}
                              className="px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all font-bold text-[9px] uppercase cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              className="px-2 py-1 rounded bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-all font-bold text-[9px] uppercase cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeletingId(m.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer"
                            title={`Remove ${m.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: discussion threads & timeline comments */}
        <div className="lg:col-span-5 space-y-6">
          {/* Discussions board */}
          <div className={`p-6 rounded-2xl border flex flex-col justify-between h-[450px] ${isDarkMode ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="border-b border-dashed border-slate-800/50 pb-4 mb-4 flex items-center gap-2">
              <div className="p-1.5 bg-violet-500/10 text-violet-400 rounded-lg"><MessageSquare className="w-4 h-4" /></div>
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">Cell Annotation Board</h3>
            </div>

            {/* Comments list feed */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              {comments.map((comment) => (
                <div key={comment.id} className="space-y-1 bg-slate-950/20 p-3 rounded-xl border border-slate-850/40 text-left">
                  <div className="flex justify-between items-baseline gap-1 flex-wrap">
                    <span className="font-bold text-blue-400">{comment.author} <span className="text-[8px] bg-slate-800 px-1 py-0.5 rounded text-slate-400 ml-1 uppercase">{comment.role}</span></span>
                    <span className="text-[9px] text-slate-400 font-mono flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" /> {comment.time}</span>
                  </div>
                  <p className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>{comment.text}</p>
                </div>
              ))}
            </div>

            {/* Add Comment input */}
            <form onSubmit={handleAddComment} className="mt-4 pt-4 border-t border-dashed border-slate-800/50 flex gap-2">
              <input 
                type="text" 
                required
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Discuss compliance anomaly or correct cells..."
                className={`flex-1 px-3 py-2 text-xs focus:outline-none border rounded-xl ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-blue-500' : 'bg-white border-slate-200 text-slate-950 focus:border-blue-600'}`}
              />
              <button 
                type="submit"
                className={`p-2 text-white rounded-xl shadow cursor-pointer ${accentClass}`}
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
