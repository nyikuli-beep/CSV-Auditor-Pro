import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Lock, 
  Activity, 
  TrendingUp, 
  ToggleLeft, 
  ToggleRight, 
  Users, 
  HelpCircle, 
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Database,
  CloudLightning,
  Coins
} from 'lucide-react';

interface AdminPanelProps {
  isDarkMode: boolean;
  accentClass: string;
}

export default function AdminPanel({ isDarkMode, accentClass }: AdminPanelProps) {
  // Feature flags toggles state
  const [flags, setFlags] = useState({
    geminiFlash: true,
    whiteLabel: true,
    highCapacityIngest: false,
    publicRestApi: true
  });

  const toggleFlag = (key: keyof typeof flags) => {
    setFlags(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const supportTickets = [
    { id: 't-201', user: 'dave@waynecorp.com', issue: 'Large 80MB CSV upload keeps timing out during parsing', time: '1 hour ago', status: 'open', priority: 'high' },
    { id: 't-202', user: 'julian@globalhope.org', issue: 'Incorrect character encoding when importing Spanish accented letters', time: '5 hours ago', status: 'resolved', priority: 'medium' },
  ];

  const adminLogs = [
    { id: 'l-1', admin: 'Marcus Vance', action: 'Modified subscription status for stark@corp.com to Enterprise', time: '2 hours ago' },
    { id: 'l-2', admin: 'Sarah Jenkins', action: 'Toggled feature flag: highCapacityIngest on Sandbox-Cluster-3', time: '4 hours ago' }
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <span className="text-xs font-mono font-bold text-rose-500 uppercase tracking-widest flex items-center gap-1">
          <Lock className="w-3.5 h-3.5" /> Administrative Gateway
        </span>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Admin Oversight Panel</h1>
        <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          System analytics, billing metrics, active feature flags, customer assistance queues, and secure operations logs.
        </p>
      </div>

      {/* Health status & MRR Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* System Health Status (Online tickers) */}
        <div className={`md:col-span-5 p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'}`}>
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-6 flex items-center gap-1.5"><Activity className="w-4 h-4 text-emerald-500" /> Infrastructure Status</h3>
          
          <div className="space-y-4">
            {[
              { label: 'Gemini Inference API', host: 'cluster-west2', status: 'ONLINE' },
              { label: 'Background Pipeline Queue', host: 'redis-pubsub-01', status: 'ONLINE' },
              { label: 'SaaS Ingestion Database', host: 'postgres-replica-3', status: 'ONLINE' },
              { label: 'Object File Storage cluster', host: 's3-bucket-eu', status: 'ONLINE' }
            ].map((node, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold block">{node.label}</span>
                  <span className="text-[9px] text-slate-400 font-mono">{node.host}</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping"></span> {node.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Analytics MRR Growth */}
        <div className={`md:col-span-7 p-6 rounded-2xl border flex flex-col justify-between ${isDarkMode ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5"><Coins className="w-4 h-4 text-amber-500" /> Revenue Telemetry</h3>
                <span className="text-2xl font-black">$48,250.00 <span className="text-xs font-mono font-bold text-emerald-400">MRR</span></span>
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold">+18.5% MoM</span>
            </div>

            {/* Growth chart SVG */}
            <div className="h-28 w-full">
              <svg viewBox="0 0 400 100" className="w-full h-full overflow-visible">
                <path 
                  d="M 10 90 L 80 80 L 150 75 L 220 50 L 290 35 L 390 15" 
                  fill="none" 
                  stroke="#10B981" 
                  strokeWidth="3" 
                  strokeLinecap="round" 
                />
                <circle cx="390" cy="15" r="4" fill="#10B981" />
                <text x="10" y="100" fill="#94a3b8" fontSize="8" fontFamily="monospace">JAN</text>
                <text x="80" y="100" fill="#94a3b8" fontSize="8" fontFamily="monospace">FEB</text>
                <text x="150" y="100" fill="#94a3b8" fontSize="8" fontFamily="monospace">MAR</text>
                <text x="220" y="100" fill="#94a3b8" fontSize="8" fontFamily="monospace">APR</text>
                <text x="290" y="100" fill="#94a3b8" fontSize="8" fontFamily="monospace">MAY</text>
                <text x="365" y="100" fill="#94a3b8" fontSize="8" fontFamily="monospace">JUN (Active)</text>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Flags & Customer Assistance tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Feature Flags */}
        <div className="lg:col-span-6 space-y-6">
          <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'}`}>
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-5 flex items-center gap-1.5"><CloudLightning className="w-4 h-4 text-blue-500" /> Active Feature Toggles</h3>
            
            <div className="divide-y divide-slate-800/50">
              {[
                { key: 'geminiFlash', label: 'Inference model: Gemini 3.5 Flash', desc: 'Default to Gemini-3.5-flash for real-time audits.' },
                { key: 'whiteLabel', label: 'White-Label Branding export', desc: 'Allows Pro and Enterprise customers to write custom titles/logos.' },
                { key: 'highCapacityIngest', label: 'Gigabyte CSV chunk pipeline', desc: 'Experimental feature using distributed worker loops.' },
                { key: 'publicRestApi', label: 'Developer REST API Gateway', desc: 'Exposes API keys to third-party endpoints.' }
              ].map((flag) => (
                <div key={flag.key} className="py-4 flex justify-between items-center gap-4">
                  <div className="text-xs">
                    <span className="font-bold block">{flag.label}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{flag.desc}</span>
                  </div>
                  <button 
                    onClick={() => toggleFlag(flag.key as any)}
                    className="text-blue-500 hover:scale-110 transition-transform"
                  >
                    {flags[flag.key as keyof typeof flags] ? (
                      <ToggleRight className="w-9 h-9" />
                    ) : (
                      <ToggleLeft className="w-9 h-9 text-slate-600" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Customer support assistance tickets */}
        <div className="lg:col-span-6 space-y-6">
          <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'}`}>
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5"><MessageSquare className="w-4 h-4 text-violet-500" /> Assistance Queue ({supportTickets.length})</h3>
            <div className="space-y-4">
              {supportTickets.map((ticket) => (
                <div key={ticket.id} className="p-4 rounded-xl bg-slate-950/20 border border-slate-850/40 text-xs text-left">
                  <div className="flex justify-between items-baseline gap-1 flex-wrap mb-1.5">
                    <span className="font-bold font-mono text-blue-400">{ticket.id} &bull; {ticket.user}</span>
                    <span className="text-[9px] text-slate-400 font-mono flex items-center gap-0.5"><Clock className="w-3 h-3" /> {ticket.time}</span>
                  </div>
                  <p className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>{ticket.issue}</p>
                  <div className="mt-3 flex gap-2">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${ticket.status === 'open' ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                      {ticket.status}
                    </span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${ticket.priority === 'high' ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-700 text-slate-400'}`}>
                      {ticket.priority} priority
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
