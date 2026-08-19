import React from 'react';
import { Eye, Sparkles, Play, CheckCircle2, AlertTriangle, ShieldCheck, Database, Table } from 'lucide-react';
import { TypographySettings, TypographyFontFamily } from '../../types';
import { FONTS_REGISTRY, FONT_SIZE_OPTIONS, FONT_WEIGHT_OPTIONS } from '../../lib/typographyEngine';

interface TypographyPreviewProps {
  typography: TypographySettings;
  isDarkMode: boolean;
}

export default function TypographyPreview({
  typography,
  isDarkMode
}: TypographyPreviewProps) {
  const fontDetails = FONTS_REGISTRY[typography.fontFamily as TypographyFontFamily] || FONTS_REGISTRY['system-default'];
  const sizeOption = FONT_SIZE_OPTIONS.find(s => s.id === typography.fontSize) || FONT_SIZE_OPTIONS[1];
  const weightOption = FONT_WEIGHT_OPTIONS.find(w => w.id === typography.fontWeight) || FONT_WEIGHT_OPTIONS[0];

  const previewStyle: React.CSSProperties = {
    fontFamily: fontDetails.fontStack,
    fontWeight: weightOption.weight,
  };

  return (
    <div className="space-y-4" id="typography-live-preview-container">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <h4 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
              Live Typography Sandbox Preview
            </h4>
            <p className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Real-time rendering across headings, copy, tables, buttons, and AI message cards
            </p>
          </div>
        </div>

        {/* Current Active Specs Pill */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
            {fontDetails.name} • {sizeOption.label} ({sizeOption.px}) • {weightOption.label}
          </span>
        </div>
      </div>

      {/* Interactive Preview Canvas */}
      <div
        id="typography-preview-canvas"
        className={`p-6 rounded-2xl border-2 transition-all space-y-6 ${
          isDarkMode
            ? 'bg-slate-950 border-slate-800 shadow-md text-slate-100'
            : 'bg-white border-slate-200 shadow-sm text-slate-900'
        }`}
        style={previewStyle}
      >
        {/* 1. Heading & Body Text */}
        <div className="space-y-2 border-b pb-5 border-slate-800/20">
          <div className="flex items-center gap-2 text-blue-500 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" /> Enterprise Data Governance
          </div>
          <h1
            className="text-2xl sm:text-3xl font-extrabold tracking-tight"
            style={{ fontFamily: fontDetails.fontStack }}
          >
            CSV Auditor Pro
          </h1>
          <p
            className={`text-sm leading-relaxed max-w-2xl ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}
            style={{ fontSize: sizeOption.px, fontWeight: weightOption.weight }}
          >
            Analyze, clean, audit and understand your CSV data with powerful AI-driven tools.
          </p>
        </div>

        {/* 2. Sample Data Table Example */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold flex items-center gap-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              <Table className="w-3.5 h-3.5 text-blue-400" /> Data Table Preview
            </span>
            <span className="text-[10px] font-mono text-slate-500">3 Sample Rows</span>
          </div>

          <div className={`overflow-hidden rounded-xl border ${isDarkMode ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-slate-50'}`}>
            <table className="w-full text-left border-collapse" style={{ fontSize: sizeOption.px }}>
              <thead>
                <tr className={`border-b ${isDarkMode ? 'border-slate-800 bg-slate-950 text-slate-300' : 'border-slate-200 bg-slate-100 text-slate-700'}`}>
                  <th className="px-4 py-2.5 font-bold text-xs uppercase tracking-wider">Customer Name</th>
                  <th className="px-4 py-2.5 font-bold text-xs uppercase tracking-wider">Email</th>
                  <th className="px-4 py-2.5 font-bold text-xs uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                <tr className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-100/60'}>
                  <td className="px-4 py-2.5 font-medium">Acme Corp Logistics</td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-slate-400">audits@acme-corp.com</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" /> Validated
                    </span>
                  </td>
                </tr>
                <tr className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-100/60'}>
                  <td className="px-4 py-2.5 font-medium">Global Health Nexus</td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-slate-400">compliance@globalhealth.org</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <AlertTriangle className="w-3 h-3" /> 2 Duplicates
                    </span>
                  </td>
                </tr>
                <tr className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-100/60'}>
                  <td className="px-4 py-2.5 font-medium">Fintech Solutions Ltd</td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-slate-400">security@fintechsolutions.io</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" /> Validated
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. AI Assistant Response Card Example */}
        <div className={`p-4 rounded-xl border flex items-start gap-3 ${
          isDarkMode ? 'bg-blue-950/20 border-blue-900/40 text-blue-200' : 'bg-blue-50 border-blue-200 text-blue-900'
        }`}>
          <div className="p-2 rounded-lg bg-blue-600 text-white shrink-0 shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h5 className="text-xs font-extrabold uppercase tracking-wider text-blue-400">
                AI Data Intelligence Engine
              </h5>
              <span className="text-[10px] font-mono text-slate-400">Confidence 99.4%</span>
            </div>
            <p className="text-sm leading-relaxed" style={{ fontSize: sizeOption.px }}>
              Your dataset contains 2,450 records and 37 duplicate entries.
            </p>
          </div>
        </div>

        {/* 4. Action Buttons Example */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            id="preview-btn-run-audit"
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-transform hover:scale-102 cursor-pointer"
            style={{ fontSize: sizeOption.px }}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Run Audit</span>
          </button>

          <button
            type="button"
            id="preview-btn-secondary"
            className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
              isDarkMode
                ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
                : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
            }`}
            style={{ fontSize: sizeOption.px }}
          >
            Export Findings
          </button>
        </div>
      </div>
    </div>
  );
}
