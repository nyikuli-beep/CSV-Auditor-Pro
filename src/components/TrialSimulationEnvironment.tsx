import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  SlidersHorizontal, 
  Clock, 
  Users, 
  FileText, 
  Sparkles, 
  ShieldCheck, 
  RotateCcw, 
  FastForward, 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  Lock, 
  Unlock, 
  Building2, 
  Share2, 
  Wand2, 
  Cpu, 
  Layers, 
  ArrowRight,
  Terminal,
  Calendar,
  RefreshCw,
  Eye,
  Check,
  Shield
} from 'lucide-react';
import { useBilling } from '../context/BillingContext';

interface TrialSimulationEnvironmentProps {
  isDarkMode: boolean;
  accentClass: string;
  onNavigateTab?: (tab: string) => void;
}

interface SimulationLogEntry {
  id: string;
  timestamp: string;
  type: 'activate' | 'shift' | 'rollback' | 'entitlement';
  message: string;
}

export default function TrialSimulationEnvironment({
  isDarkMode,
  accentClass,
  onNavigateTab
}: TrialSimulationEnvironmentProps) {
  const { 
    plan, 
    subscriptionStatus, 
    entitlements, 
    trialEndsAt, 
    trialStartedAt, 
    isTrialActive, 
    trialDaysRemaining,
    startTrialSimulation,
    rollbackTrialSimulation,
    fastForwardTrialSimulation,
    refreshBilling
  } = useBilling();

  const [selectedDays, setSelectedDays] = useState<number>(14);
  const [customDaysInput, setCustomDaysInput] = useState<string>('14');
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  
  // Realtime countdown ticker
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    totalMs: number;
    isExpired: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, isExpired: true });

  // Simulation audit telemetry log
  const [simulationLogs, setSimulationLogs] = useState<SimulationLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem('app_trial_simulation_logs');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        id: 'initial_0',
        timestamp: new Date().toLocaleTimeString(),
        type: 'entitlement',
        message: 'Simulation Environment Ready. Configure trial duration to test restricted capabilities.'
      }
    ];
  });

  const appendLog = (type: SimulationLogEntry['type'], message: string) => {
    const newEntry: SimulationLogEntry = {
      id: `sim_log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString(),
      type,
      message
    };
    setSimulationLogs(prev => {
      const updated = [newEntry, ...prev.slice(0, 19)];
      try {
        localStorage.setItem('app_trial_simulation_logs', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // Update countdown clock every second
  useEffect(() => {
    const updateCountdown = () => {
      if (!trialEndsAt || plan !== 'pro_trial') {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, isExpired: true });
        return;
      }

      const target = new Date(trialEndsAt).getTime();
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, isExpired: true });
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds, totalMs: diff, isExpired: false });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [trialEndsAt, plan]);

  // Handle Starting the Trial Simulation
  const handleStartSimulation = async (daysToRun: number) => {
    setActionLoading(true);
    setStatusMessage(null);
    try {
      const res = await startTrialSimulation(daysToRun);
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `Trial Simulation activated for ${daysToRun} day(s). Team Tenancy, Branded Reports & Restricted Cleaning Actions are now unlocked!`
        });
        appendLog('activate', `Activated ${daysToRun}-day trial simulation. Unlocked Team Tenancy, Branded Reports, Restricted Cleaning.`);
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'Failed to start trial simulation.'
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Simulation initialization failed.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Fast Forwarding Simulated Time
  const handleFastForward = async (daysToShift: number) => {
    setActionLoading(true);
    setStatusMessage(null);
    try {
      const res = await fastForwardTrialSimulation(daysToShift);
      if (res.success) {
        setStatusMessage({
          type: 'info',
          text: `Simulated clock advanced by ${daysToShift} day(s). Check expiration alerts and entitlement status.`
        });
        appendLog('shift', `Advanced simulated time by ${daysToShift} day(s).`);
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'Failed to advance simulation time.'
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Time shift failed.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Immediate Rollback to Free Plan
  const handleRollback = async () => {
    setActionLoading(true);
    setStatusMessage(null);
    try {
      const res = await rollbackTrialSimulation();
      if (res.success) {
        setStatusMessage({
          type: 'info',
          text: 'Simulation completed. Account rolled back to Free plan. Restricted features are now locked.'
        });
        appendLog('rollback', 'Trial expired / rolled back. Reset account to Free Plan tier.');
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'Failed to roll back trial.'
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Rollback execution failed.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const presetDays = [
    { label: '1 Day', days: 1, desc: 'Quick 24h Expiry Test' },
    { label: '3 Days', days: 3, desc: 'Warning Threshold Test' },
    { label: '7 Days', days: 7, desc: 'Mid-Trial Assessment' },
    { label: '14 Days', days: 14, desc: 'Standard Full Trial' },
    { label: '30 Days', days: 30, desc: 'Extended Enterprise POC' },
  ];

  const isTrialRunning = plan === 'pro_trial' && !timeLeft.isExpired;

  return (
    <div className={`p-6 rounded-2xl border transition-all ${isDarkMode ? 'bg-[#0F172A] border-[#1E293B] text-[#F8FAFC]' : 'bg-[#FFFFFF] border-[#E2E8F0] text-[#0F172A] shadow-sm'}`} id="trial-simulation-environment-root">
      {/* Card Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#334155]/40">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 rounded-lg bg-[#2563EB]/10 text-[#3B82F6]">
              <SlidersHorizontal className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#3B82F6]">
              Simulation Testing Environment
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">Free Trial & Feature Access Testing</h2>
          <p className={`text-xs mt-1 max-w-2xl ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>
            Simulate the multi-day trial lifecycle to test <strong className="text-[#3B82F6]">Team Tenancy</strong>, <strong className="text-[#10B981]">Branded Reports</strong>, and <strong className="text-[#8B5CF6]">Restricted Cleaning Actions</strong> for your chosen number of days. Once the trial duration finishes, privileges automatically roll back to the Free plan.
          </p>
        </div>

        {/* Live Plan & Status Badge */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 shrink-0">
          <div className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-2 ${
            isTrialRunning 
              ? 'bg-[#1E3A8A]/30 border-[#2563EB] text-[#60A5FA]' 
              : 'bg-[#1E293B] border-[#334155] text-[#94A3B8]'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isTrialRunning ? 'bg-[#3B82F6] animate-ping' : 'bg-[#64748B]'}`} />
            <span>{isTrialRunning ? 'PRO TRIAL (SIMULATED)' : 'FREE PLAN (STANDARD)'}</span>
          </div>

          <button
            type="button"
            onClick={() => refreshBilling()}
            disabled={actionLoading}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              isDarkMode ? 'border-[#334155] bg-[#1E293B] hover:bg-[#334155] text-[#94A3B8]' : 'border-[#CBD5E1] bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#475569]'
            }`}
            title="Refresh live billing state"
            aria-label="Refresh live billing state"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Live Feedback Alert Toast */}
      {statusMessage && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-4 p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
            statusMessage.type === 'success' 
              ? 'bg-[#064E3B]/30 border-[#059669] text-[#6EE7B7]' 
              : statusMessage.type === 'error'
              ? 'bg-[#881337]/30 border-[#E11D48] text-[#FDA4AF]'
              : 'bg-[#1E3A8A]/30 border-[#2563EB] text-[#93C5FD]'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
          ) : statusMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-[#F43F5E] shrink-0 mt-0.5" />
          ) : (
            <Zap className="w-4 h-4 text-[#3B82F6] shrink-0 mt-0.5" />
          )}
          <div className="flex-1 font-medium">{statusMessage.text}</div>
        </motion.div>
      )}

      {/* Real-Time Countdown & Expiration Banner (Active Trial) */}
      {isTrialRunning && (
        <div className={`mt-5 p-4 rounded-xl border ${isDarkMode ? 'bg-[#091E42]/40 border-[#1D4ED8]/60' : 'bg-[#EFF6FF] border-[#BFDBFE]'}`}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#3B82F6]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#3B82F6]">Simulated Trial Live Countdown</span>
              </div>
              <p className={`text-xs ${isDarkMode ? 'text-[#CBD5E1]' : 'text-[#334155]'}`}>
                Trial period will expire on <strong className="font-semibold">{new Date(trialEndsAt || '').toLocaleString()}</strong>, automatically rolling back to the Free plan.
              </p>
            </div>

            {/* Countdown Grid (Solid Strict Colors, No Gradients) */}
            <div className="grid grid-cols-4 gap-2 text-center shrink-0">
              <div className={`px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-[#0F172A] border-[#1E293B]' : 'bg-[#FFFFFF] border-[#CBD5E1]'}`}>
                <span className="text-base font-extrabold font-mono text-[#3B82F6] block leading-tight">{timeLeft.days}</span>
                <span className={`text-[9px] uppercase font-bold tracking-wider ${isDarkMode ? 'text-[#64748B]' : 'text-[#94A3B8]'}`}>Days</span>
              </div>
              <div className={`px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-[#0F172A] border-[#1E293B]' : 'bg-[#FFFFFF] border-[#CBD5E1]'}`}>
                <span className="text-base font-extrabold font-mono text-[#3B82F6] block leading-tight">{String(timeLeft.hours).padStart(2, '0')}</span>
                <span className={`text-[9px] uppercase font-bold tracking-wider ${isDarkMode ? 'text-[#64748B]' : 'text-[#94A3B8]'}`}>Hours</span>
              </div>
              <div className={`px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-[#0F172A] border-[#1E293B]' : 'bg-[#FFFFFF] border-[#CBD5E1]'}`}>
                <span className="text-base font-extrabold font-mono text-[#3B82F6] block leading-tight">{String(timeLeft.minutes).padStart(2, '0')}</span>
                <span className={`text-[9px] uppercase font-bold tracking-wider ${isDarkMode ? 'text-[#64748B]' : 'text-[#94A3B8]'}`}>Mins</span>
              </div>
              <div className={`px-3 py-2 rounded-lg border ${isDarkMode ? 'bg-[#0F172A] border-[#1E293B]' : 'bg-[#FFFFFF] border-[#CBD5E1]'}`}>
                <span className="text-base font-extrabold font-mono text-[#3B82F6] block leading-tight">{String(timeLeft.seconds).padStart(2, '0')}</span>
                <span className={`text-[9px] uppercase font-bold tracking-wider ${isDarkMode ? 'text-[#64748B]' : 'text-[#94A3B8]'}`}>Secs</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Simulation Configuration Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        
        {/* Left Column: Duration Selector & Activation Controls */}
        <div className="lg:col-span-7 space-y-5">
          <div>
            <label className={`block text-xs font-bold uppercase tracking-wider mb-2.5 ${isDarkMode ? 'text-[#CBD5E1]' : 'text-[#334155]'}`}>
              1. Select Trial Duration Days for Simulation
            </label>

            {/* Presets Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {presetDays.map(preset => {
                const isSelected = !isCustomMode && selectedDays === preset.days;
                return (
                  <button
                    key={preset.days}
                    type="button"
                    onClick={() => {
                      setIsCustomMode(false);
                      setSelectedDays(preset.days);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#2563EB] border-[#2563EB] text-white shadow-sm'
                        : isDarkMode
                        ? 'bg-[#1E293B] border-[#334155] text-[#CBD5E1] hover:border-[#475569]'
                        : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#334155] hover:border-[#CBD5E1]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{preset.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <span className={`text-[10px] block mt-1 ${isSelected ? 'text-[#DBEAFE]' : isDarkMode ? 'text-[#64748B]' : 'text-[#94A3B8]'}`}>
                      {preset.desc}
                    </span>
                  </button>
                );
              })}

              {/* Custom Days Button / Input */}
              <div className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                isCustomMode
                  ? 'bg-[#1E293B] border-[#3B82F6]'
                  : isDarkMode
                  ? 'bg-[#1E293B] border-[#334155]'
                  : 'bg-[#F8FAFC] border-[#E2E8F0]'
              }`}>
                <span className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>
                  Custom Days
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={customDaysInput}
                    onChange={(e) => {
                      setIsCustomMode(true);
                      const val = e.target.value;
                      setCustomDaysInput(val);
                      const parsed = parseInt(val, 10);
                      if (!isNaN(parsed) && parsed > 0) {
                        setSelectedDays(parsed);
                      }
                    }}
                    onFocus={() => setIsCustomMode(true)}
                    placeholder="Days"
                    className={`w-full px-2 py-1 rounded-lg text-xs font-bold border focus:outline-none focus:ring-1 focus:ring-[#3B82F6] ${
                      isDarkMode ? 'bg-[#0F172A] border-[#334155] text-white' : 'bg-white border-[#CBD5E1] text-[#0F172A]'
                    }`}
                  />
                  <span className="text-[11px] font-bold text-[#64748B]">days</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Trigger Buttons */}
          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={() => handleStartSimulation(selectedDays)}
              disabled={actionLoading}
              className="w-full py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              <span>{isTrialRunning ? `Re-Initialize Trial for ${selectedDays} Day(s)` : `Activate Trial Simulation (${selectedDays} Days)`}</span>
            </button>

            {/* Time Warp / Fast Forward / Rollback Controls */}
            {isTrialRunning && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleFastForward(1)}
                  disabled={actionLoading}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                    isDarkMode ? 'bg-[#1E293B] border-[#334155] text-[#CBD5E1] hover:bg-[#334155]' : 'bg-[#F1F5F9] border-[#CBD5E1] text-[#334155] hover:bg-[#E2E8F0]'
                  }`}
                  title="Advance simulated clock forward by 24 hours"
                >
                  <FastForward className="w-3.5 h-3.5 text-[#3B82F6]" />
                  <span>Advance +1 Day</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleFastForward(3)}
                  disabled={actionLoading}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                    isDarkMode ? 'bg-[#1E293B] border-[#334155] text-[#CBD5E1] hover:bg-[#334155]' : 'bg-[#F1F5F9] border-[#CBD5E1] text-[#334155] hover:bg-[#E2E8F0]'
                  }`}
                  title="Advance simulated clock forward by 3 days"
                >
                  <FastForward className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span>Advance +3 Days</span>
                </button>

                <button
                  type="button"
                  onClick={handleRollback}
                  disabled={actionLoading}
                  className="py-2 px-3 rounded-xl bg-[#BE123C] hover:bg-[#9F1239] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
                  title="Simulate immediate expiration and rollback to Free plan"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Roll Back to Free</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Simulation Telemetry & Event Log */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <label className={`block text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-[#CBD5E1]' : 'text-[#334155]'}`}>
              Simulation Telemetry Log
            </label>
            <span className="text-[10px] font-mono text-[#64748B]">Live Events</span>
          </div>

          <div className={`p-3 rounded-xl border h-[178px] overflow-y-auto font-mono text-[11px] space-y-2 ${
            isDarkMode ? 'bg-[#020617] border-[#1E293B] text-[#94A3B8]' : 'bg-[#0F172A] border-[#334155] text-[#94A3B8]'
          }`}>
            {simulationLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                <span className="text-[#64748B] shrink-0">[{log.timestamp}]</span>
                <span className={
                  log.type === 'activate' 
                    ? 'text-[#60A5FA]' 
                    : log.type === 'rollback'
                    ? 'text-[#F87171]'
                    : log.type === 'shift'
                    ? 'text-[#FBBF24]'
                    : 'text-[#34D399]'
                }>
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Feature Access Matrix (Team Tenancy, Branded Reports & Restricted Cleaning Actions) */}
      <div className="mt-8 pt-6 border-t border-[#334155]/40 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold tracking-tight uppercase">
              Trial Entitlements & Restricted Features Status
            </h3>
            <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>
              Verify live access across the 3 core premium capability modules during simulation.
            </p>
          </div>
          <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg border w-fit ${
            isTrialRunning 
              ? 'bg-[#065F46]/30 border-[#059669] text-[#34D399]' 
              : 'bg-[#1E293B] border-[#334155] text-[#94A3B8]'
          }`}>
            {isTrialRunning ? 'ALL 3 MODULES UNLOCKED' : 'FEATURES RESTRICTED (FREE PLAN)'}
          </span>
        </div>

        {/* The 3 Feature Capability Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* 1. Team Tenancy Card */}
          <div className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
            isTrialRunning 
              ? isDarkMode ? 'bg-[#0F172A] border-[#2563EB]/40' : 'bg-[#EFF6FF] border-[#BFDBFE]' 
              : isDarkMode ? 'bg-[#0F172A]/50 border-[#1E293B]' : 'bg-[#F8FAFC] border-[#E2E8F0]'
          }`}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-[#2563EB]/10 text-[#3B82F6]">
                  <Users className="w-4 h-4" />
                </div>
                <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                  isTrialRunning 
                    ? 'bg-[#065F46]/30 border-[#059669] text-[#34D399]' 
                    : 'bg-[#1E293B] border-[#334155] text-[#94A3B8]'
                }`}>
                  {isTrialRunning ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  <span>{isTrialRunning ? 'Active in Trial' : 'Locked (Free)'}</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-xs tracking-tight">Team Tenancy & Collaboration</h4>
                <p className={`text-[11px] mt-1 leading-relaxed ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>
                  Multi-tenant workspace organization, team member invites, RBAC roles (Owner/Admin/Analyst/Auditor), granular access security policies, real-time presence & cell annotations.
                </p>
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-2 text-[10px]">
                  <CheckCircle2 className={`w-3 h-3 ${isTrialRunning ? 'text-[#10B981]' : 'text-[#64748B]'}`} />
                  <span className={isTrialRunning ? 'text-inherit' : 'text-[#64748B]'}>Multi-tenant workspace isolation</span>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <CheckCircle2 className={`w-3 h-3 ${isTrialRunning ? 'text-[#10B981]' : 'text-[#64748B]'}`} />
                  <span className={isTrialRunning ? 'text-inherit' : 'text-[#64748B]'}>Member invitations & role allocation</span>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <CheckCircle2 className={`w-3 h-3 ${isTrialRunning ? 'text-[#10B981]' : 'text-[#64748B]'}`} />
                  <span className={isTrialRunning ? 'text-inherit' : 'text-[#64748B]'}>Cell annotations & team audit trail</span>
                </div>
              </div>
            </div>

            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('team')}
                className={`mt-4 w-full py-2 px-3 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  isTrialRunning
                    ? 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-transparent shadow-xs'
                    : isDarkMode
                    ? 'bg-[#1E293B] border-[#334155] text-[#94A3B8] hover:text-white'
                    : 'bg-[#F1F5F9] border-[#CBD5E1] text-[#475569] hover:text-[#0F172A]'
                }`}
              >
                <span>Test Team Tenancy</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 2. Branded Reports Card */}
          <div className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
            isTrialRunning 
              ? isDarkMode ? 'bg-[#0F172A] border-[#059669]/40' : 'bg-[#ECFDF5] border-[#A7F3D0]' 
              : isDarkMode ? 'bg-[#0F172A]/50 border-[#1E293B]' : 'bg-[#F8FAFC] border-[#E2E8F0]'
          }`}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-[#059669]/10 text-[#10B981]">
                  <FileText className="w-4 h-4" />
                </div>
                <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                  isTrialRunning 
                    ? 'bg-[#065F46]/30 border-[#059669] text-[#34D399]' 
                    : 'bg-[#1E293B] border-[#334155] text-[#94A3B8]'
                }`}>
                  {isTrialRunning ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  <span>{isTrialRunning ? 'Active in Trial' : 'Locked (Free)'}</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-xs tracking-tight">Branded Executive Reports</h4>
                <p className={`text-[11px] mt-1 leading-relaxed ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>
                  Custom corporate branding, uploadable company logos, executive PDF compliance audit reports, formal compliance certificates, sign-off attestations & automated email dispatches.
                </p>
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-2 text-[10px]">
                  <CheckCircle2 className={`w-3 h-3 ${isTrialRunning ? 'text-[#10B981]' : 'text-[#64748B]'}`} />
                  <span className={isTrialRunning ? 'text-inherit' : 'text-[#64748B]'}>Custom corporate logo & white-labeling</span>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <CheckCircle2 className={`w-3 h-3 ${isTrialRunning ? 'text-[#10B981]' : 'text-[#64748B]'}`} />
                  <span className={isTrialRunning ? 'text-inherit' : 'text-[#64748B]'}>Executive PDF compliance generator</span>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <CheckCircle2 className={`w-3 h-3 ${isTrialRunning ? 'text-[#10B981]' : 'text-[#64748B]'}`} />
                  <span className={isTrialRunning ? 'text-inherit' : 'text-[#64748B]'}>Formal auditor sign-off attestations</span>
                </div>
              </div>
            </div>

            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('reports')}
                className={`mt-4 w-full py-2 px-3 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  isTrialRunning
                    ? 'bg-[#059669] hover:bg-[#047857] text-white border-transparent shadow-xs'
                    : isDarkMode
                    ? 'bg-[#1E293B] border-[#334155] text-[#94A3B8] hover:text-white'
                    : 'bg-[#F1F5F9] border-[#CBD5E1] text-[#475569] hover:text-[#0F172A]'
                }`}
              >
                <span>Test Branded Reports</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 3. Restricted Cleaning Actions Card */}
          <div className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
            isTrialRunning 
              ? isDarkMode ? 'bg-[#0F172A] border-[#8B5CF6]/40' : 'bg-[#F5F3FF] border-[#DDD6FE]' 
              : isDarkMode ? 'bg-[#0F172A]/50 border-[#1E293B]' : 'bg-[#F8FAFC] border-[#E2E8F0]'
          }`}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-[#8B5CF6]/10 text-[#8B5CF6]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                  isTrialRunning 
                    ? 'bg-[#065F46]/30 border-[#059669] text-[#34D399]' 
                    : 'bg-[#1E293B] border-[#334155] text-[#94A3B8]'
                }`}>
                  {isTrialRunning ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  <span>{isTrialRunning ? 'Active in Trial' : 'Locked (Free)'}</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-xs tracking-tight">Restricted Automated Actions (Cleaning)</h4>
                <p className={`text-[11px] mt-1 leading-relaxed ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>
                  Smart AI data corrections, AI Missing value prediction, Fuzzy duplicate merging, Data Profiler, Custom Regex Builder, Conditional Splitter, Column Merger, Formula Sanitizer & Batch Engine.
                </p>
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-2 text-[10px]">
                  <CheckCircle2 className={`w-3 h-3 ${isTrialRunning ? 'text-[#10B981]' : 'text-[#64748B]'}`} />
                  <span className={isTrialRunning ? 'text-inherit' : 'text-[#64748B]'}>Smart AI autocorrect & prediction</span>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <CheckCircle2 className={`w-3 h-3 ${isTrialRunning ? 'text-[#10B981]' : 'text-[#64748B]'}`} />
                  <span className={isTrialRunning ? 'text-inherit' : 'text-[#64748B]'}>Fuzzy duplicate matching & merging</span>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <CheckCircle2 className={`w-3 h-3 ${isTrialRunning ? 'text-[#10B981]' : 'text-[#64748B]'}`} />
                  <span className={isTrialRunning ? 'text-inherit' : 'text-[#64748B]'}>Advanced regex & batch sanitization</span>
                </div>
              </div>
            </div>

            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('clean')}
                className={`mt-4 w-full py-2 px-3 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  isTrialRunning
                    ? 'bg-[#7C3AED] hover:bg-[#6D28D9] text-white border-transparent shadow-xs'
                    : isDarkMode
                    ? 'bg-[#1E293B] border-[#334155] text-[#94A3B8] hover:text-white'
                    : 'bg-[#F1F5F9] border-[#CBD5E1] text-[#475569] hover:text-[#0F172A]'
                }`}
              >
                <span>Test Cleaning Actions</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
