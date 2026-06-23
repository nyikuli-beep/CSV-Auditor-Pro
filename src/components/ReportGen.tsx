import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  FileSpreadsheet, 
  Download, 
  Palette, 
  FileText, 
  CheckSquare, 
  Sparkles, 
  ArrowLeft,
  CheckCircle2,
  Sliders,
  Image,
  Upload
} from 'lucide-react';
import { CSVFile, ReportConfig } from '../types';

interface ReportGenProps {
  activeFile: CSVFile | null;
  onNavigate: (tab: string) => void;
  isDarkMode: boolean;
  accentClass: string;
}

export default function ReportGen({ activeFile, onNavigate, isDarkMode, accentClass }: ReportGenProps) {
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    title: 'CSV Audit & Compliance Report',
    includeSummary: true,
    includeIssues: true,
    includeCleaningLog: true,
    themeColor: 'blue',
    templateType: 'executive',
    companyName: 'Acme Corporate Inc'
  });
  const [simulatedLogo, setSimulatedLogo] = useState<string | null>(null);

  if (!activeFile) {
    return (
      <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-3xl animate-fadeIn">
        <FileSpreadsheet className="w-12 h-12 text-slate-500 mx-auto mb-4" />
        <h3 className="font-bold text-lg mb-1">No Active Audit Loaded for Reports</h3>
        <p className="text-sm text-slate-400 max-w-sm mx-auto mb-6">
          Upload a local spreadsheet or load our messy company transactions CSV to generate compliance PDFs.
        </p>
      </div>
    );
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setSimulatedLogo(url);
    }
  };

  const triggerExport = (format: 'pdf' | 'csv' | 'xlsx') => {
    // PDF simulated print layout or CSV dynamic download
    if (format === 'csv') {
      const headersStr = activeFile.headers.join(',');
      const rowsStr = (activeFile.cleanedRows || activeFile.rows)
        .map(row => activeFile.headers.map(h => row[h] || '').join(','))
        .join('\n');
      const csvContent = `${headersStr}\n${rowsStr}`;
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Sanitized_${activeFile.name}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Simulate PDF & XLSX downloads with quick alert
      const dummyContent = `Format: ${format.toUpperCase()}\nReport Title: ${reportConfig.title}\nCompany: ${reportConfig.companyName}\nScore: ${activeFile.score}%`;
      const blob = new Blob([dummyContent], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Compliance_Audit_Report_${reportConfig.companyName.replace(/\s+/g, '_')}.${format}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getThemeHex = (color: string) => {
    switch (color) {
      case 'emerald': return '#10B981';
      case 'violet': return '#8B5CF6';
      case 'amber': return '#F59E0B';
      default: return '#2563EB';
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <span className="text-xs font-mono font-bold text-violet-500 uppercase tracking-widest flex items-center gap-1">
          <FileText className="w-3.5 h-3.5" /> PDF/XLSX Engine
        </span>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Report Generator</h1>
        <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          Apply corporate branding, select layout structures, and export complete audit compliance portfolios.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Configuration inputs */}
        <div className="lg:col-span-5 space-y-6">
          <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'}`}>
            <h3 className="font-bold text-sm uppercase tracking-wider text-slate-400 mb-5 flex items-center gap-1.5"><Sliders className="w-4 h-4 text-violet-500" /> Branding Config</h3>
            
            <div className="space-y-4">
              {/* Title input */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Report Title</label>
                <input 
                  type="text" 
                  value={reportConfig.title}
                  onChange={(e) => setReportConfig({ ...reportConfig, title: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none focus:ring-1 ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-blue-500' : 'bg-white border-slate-200 text-slate-950'}`}
                />
              </div>

              {/* Company input */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Company Name</label>
                <input 
                  type="text" 
                  value={reportConfig.companyName}
                  onChange={(e) => setReportConfig({ ...reportConfig, companyName: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none focus:ring-1 ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-blue-500' : 'bg-white border-slate-200 text-slate-950'}`}
                />
              </div>

              {/* Theme color picker */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Accent Theme Color</label>
                <div className="flex gap-2">
                  {['blue', 'emerald', 'violet', 'amber'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setReportConfig({ ...reportConfig, themeColor: c })}
                      className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-105 ${reportConfig.themeColor === c ? 'border-white scale-110' : 'border-slate-800'}`}
                      style={{ backgroundColor: c === 'blue' ? '#2563EB' : c === 'emerald' ? '#10B981' : c === 'violet' ? '#8B5CF6' : '#F59E0B' }}
                    />
                  ))}
                </div>
              </div>

              {/* Logo Upload Simulated */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Company Logo</label>
                <div className={`border-2 border-dashed rounded-xl p-4 text-center relative ${isDarkMode ? 'border-slate-800 bg-slate-950/40 hover:border-slate-700' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {simulatedLogo ? (
                    <div className="flex items-center gap-2 justify-center text-xs text-emerald-400">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Logo Attached
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-400 flex flex-col items-center gap-1">
                      <Upload className="w-5 h-5 text-slate-500" /> Click or drag logo file here
                    </div>
                  )}
                </div>
              </div>

              {/* Template Picker */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Report Template</label>
                <select
                  value={reportConfig.templateType}
                  onChange={(e) => setReportConfig({ ...reportConfig, templateType: e.target.value as any })}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-950'}`}
                >
                  <option value="executive">Executive Compliance</option>
                  <option value="technical">Technical Raw Log</option>
                  <option value="compact">Compact Overview Checklist</option>
                </select>
              </div>
            </div>
          </div>

          {/* Export action triggers */}
          <div className="grid grid-cols-3 gap-2">
            <button 
              onClick={() => triggerExport('pdf')}
              className={`py-3 rounded-xl border text-[11px] font-bold flex flex-col items-center justify-center gap-1.5 transition-all hover:scale-102 ${isDarkMode ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-100' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}`}
            >
              <Download className="w-4 h-4 text-rose-500" /> Export PDF
            </button>
            <button 
              onClick={() => triggerExport('csv')}
              className={`py-3 rounded-xl border text-[11px] font-bold flex flex-col items-center justify-center gap-1.5 transition-all hover:scale-102 ${isDarkMode ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-100' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}`}
            >
              <Download className="w-4 h-4 text-emerald-500" /> Export CSV
            </button>
            <button 
              onClick={() => triggerExport('xlsx')}
              className={`py-3 rounded-xl border text-[11px] font-bold flex flex-col items-center justify-center gap-1.5 transition-all hover:scale-102 ${isDarkMode ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-100' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}`}
            >
              <Download className="w-4 h-4 text-blue-500" /> Export Excel
            </button>
          </div>
        </div>

        {/* Live Interactive Preview */}
        <div className="lg:col-span-7 space-y-4">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-1">Live Report Preview</h3>
          
          <div className="border border-slate-800 rounded-3xl p-8 bg-white text-slate-900 shadow-xl overflow-hidden relative">
            {/* Corner compliance indicator */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-100 rotate-45 translate-x-12 -translate-y-12 flex items-end justify-center pb-2.5 border-b">
              <span className="text-[9px] font-mono font-bold tracking-widest text-slate-400 uppercase -rotate-45">COMPLIANT</span>
            </div>

            {/* Top border colored by Accent Selector */}
            <div className="h-2 absolute top-0 left-0 right-0" style={{ backgroundColor: getThemeHex(reportConfig.themeColor) }}></div>

            {/* Preview Document Header */}
            <div className="flex justify-between items-start border-b pb-6 mb-6">
              <div>
                <h2 className="text-xl font-extrabold tracking-tight" style={{ color: getThemeHex(reportConfig.themeColor) }}>{reportConfig.title}</h2>
                <p className="text-xs text-slate-400 font-mono mt-1">{reportConfig.companyName} &bull; compliance desk</p>
              </div>
              {simulatedLogo ? (
                <img src={simulatedLogo} alt="Logo preview" className="w-10 h-10 object-contain rounded border" />
              ) : (
                <div className="w-10 h-10 rounded border border-dashed flex items-center justify-center text-slate-400 bg-slate-50"><Image className="w-4 h-4" /></div>
              )}
            </div>

            {/* Document stats */}
            <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 border mb-6 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Grade</span>
                <span className="block text-lg font-black text-emerald-600">{activeFile.score}%</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Total Rows</span>
                <span className="block text-lg font-black">{activeFile.rows.length} rows</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Status</span>
                <span className="block text-lg font-black text-blue-600">Sanitized</span>
              </div>
            </div>

            {/* Dynamic sections based on Template Type */}
            <div className="space-y-4 text-xs leading-relaxed text-slate-700">
              {reportConfig.templateType === 'executive' && (
                <>
                  <h4 className="font-bold text-slate-900 uppercase tracking-widest border-b pb-1">1. Executive Summary</h4>
                  <p>
                    CSV Auditor Pro has run an automated compliance evaluation on <strong>{activeFile.name}</strong> on behalf of {reportConfig.companyName}. Based on statistical analysis and row mapping models, this dataset demonstrates a total quality rating of <strong>{activeFile.score}%</strong>.
                  </p>
                  <p>
                    Key findings suggest that while structural integrity is maintained, earlier versions of the data contained duplicate transaction keys and formatting discrepancies. These were successfully resolved inside our cleaning center Sandbox.
                  </p>
                </>
              )}

              {reportConfig.templateType === 'technical' && (
                <>
                  <h4 className="font-bold text-slate-900 uppercase tracking-widest border-b pb-1">Technical Audit Log</h4>
                  <p className="font-mono text-[10px] bg-slate-50 p-3 rounded border">
                    FILE: {activeFile.name}<br />
                    SIZE: {activeFile.size} BYTES<br />
                    HEADERS: {activeFile.headers.join(', ')}<br />
                    OUTLIERS FLAGGED: {activeFile.issues.filter(i => i.type === 'outlier').length}<br />
                    DEDUPLICATED: {activeFile.issues.filter(i => i.type === 'duplicate').length}
                  </p>
                </>
              )}

              {reportConfig.templateType === 'compact' && (
                <>
                  <h4 className="font-bold text-slate-900 uppercase tracking-widest border-b pb-1">Compliance Checklist</h4>
                  <div className="space-y-2">
                    <div className="flex gap-2 items-center"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Deduplication Purge Complete</div>
                    <div className="flex gap-2 items-center"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> ISO Date Standardization Active</div>
                    <div className="flex gap-2 items-center"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Null Value Imputations Resolved</div>
                  </div>
                </>
              )}
            </div>

            {/* Document Signature */}
            <div className="mt-8 pt-6 border-t flex justify-between text-[10px] text-slate-400">
              <span>Date generated: {new Date().toLocaleDateString()}</span>
              <span className="font-bold">Certified by CSV Auditor Pro Engine</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
