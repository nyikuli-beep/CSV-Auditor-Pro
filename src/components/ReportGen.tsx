import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  Upload,
  Eye,
  Camera,
  Printer,
  Copy,
  X,
  Loader2,
  ShieldCheck,
  Award,
  Mail,
  Send,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { CSVFile, ReportConfig } from '../types';
import { exportCleanedAuditToExcel } from '../lib/excelExporter';
import { 
  generateVisualSnapshotCanvas, 
  downloadVisualSnapshotPNG, 
  getThemeHexColor, 
  formatBytes 
} from '../lib/visualSnapshotGenerator';
import { getGmailAccessToken, getGmailTokenMetadata, signInWithGoogleForGmail, auth } from '../firebase';

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

  // Snapshot modal states
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
  const [snapshotDataUrl, setSnapshotDataUrl] = useState<string | null>(null);
  const [isGeneratingSnapshot, setIsGeneratingSnapshot] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);

  // Email Dispatch Modal state (Gmail Compliance Hub Integration)
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSendStatus, setEmailSendStatus] = useState<{ success: boolean; message: string } | null>(null);

  const handleOpenEmailModal = () => {
    if (!activeFile) return;
    const defaultSubject = `[Audit Report] ${reportConfig.title} - ${activeFile.name}`;
    const defaultBody = `Dear Stakeholders,

Please review the executive compliance audit report summary for spreadsheet: ${activeFile.name}.

=== AUDIT COMPLIANCE SUMMARY ===
Company Name: ${reportConfig.companyName}
Report Title: ${reportConfig.title}
File Name: ${activeFile.name}
File Size: ${formatBytes(activeFile.size)}
Quality Grade: ${activeFile.score}%
Total Rows Evaluated: ${activeFile.rows.length}
Resolved Issues: ${activeFile.issues.filter(i => i.status === 'resolved').length}
Open Flagged Anomalies: ${activeFile.issues.filter(i => i.status !== 'resolved').length}
Report Template: ${reportConfig.templateType.toUpperCase()}
Timestamp: ${new Date().toLocaleString()}

KEY FINDINGS & HEALTH EVALUATION:
- Dataset structural integrity has been audited by CSV Auditor Pro.
- Duplicate detection, missing cell imputation, and ISO date standardization checks were applied.
- Compliance Status: CERTIFIED COMPLIANT

Best regards,
Compliance & Audit Operations Team
${reportConfig.companyName}`;

    setEmailSubject(defaultSubject);
    setEmailBody(defaultBody);
    if (!recipientEmail) {
      setRecipientEmail(auth.currentUser?.email || '');
    }
    setEmailSendStatus(null);
    setIsEmailModalOpen(true);
  };

  const handleSendEmailReport = async () => {
    if (!recipientEmail || !recipientEmail.trim()) {
      alert('Please enter at least one recipient email address.');
      return;
    }

    const confirmed = window.confirm(`Confirm: Send compliance audit report email to ${recipientEmail}?`);
    if (!confirmed) return;

    setIsSendingEmail(true);
    setEmailSendStatus(null);

    try {
      let activeToken = getGmailAccessToken();
      let meta = getGmailTokenMetadata();

      if (meta.isExpired && activeToken && activeToken !== 'persisted_gmail_session_token') {
        try {
          const renewed = await signInWithGoogleForGmail();
          if (renewed?.accessToken) {
            activeToken = renewed.accessToken;
            meta = getGmailTokenMetadata();
          }
        } catch (e) {
          console.warn('Pre-flight token renewal failed:', e);
        }
      }

      const currentUserEmail = auth.currentUser?.email || 'authenticated-user@workspace';

      const sendPayload = {
        to: recipientEmail,
        subject: emailSubject,
        body: emailBody,
        token: activeToken || undefined,
        userEmail: currentUserEmail,
        tokenIssuedAt: meta.issuedAt || undefined,
        fallbackToGateway: true
      };

      const response = await fetch('/api/gmail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sendPayload)
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success) {
        setEmailSendStatus({
          success: true,
          message: data.message || `Audit summary successfully dispatched to ${recipientEmail} via Gmail Compliance Hub!`
        });
      } else {
        setEmailSendStatus({
          success: false,
          message: data.message || 'Failed to dispatch email. Please check recipient address or re-authenticate Gmail.'
        });
      }
    } catch (err: any) {
      console.error('Error sending email report:', err);
      setEmailSendStatus({
        success: false,
        message: err.message || 'An unexpected error occurred while sending the email report.'
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

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

  const handleOpenSnapshotPreview = async () => {
    if (!activeFile) return;
    setIsGeneratingSnapshot(true);
    try {
      const canvas = await generateVisualSnapshotCanvas(activeFile, reportConfig, simulatedLogo);
      const dataUrl = canvas.toDataURL('image/png');
      setSnapshotDataUrl(dataUrl);
      setIsSnapshotModalOpen(true);
    } catch (err) {
      console.error('Error generating visual snapshot:', err);
    } finally {
      setIsGeneratingSnapshot(false);
    }
  };

  const handleDownloadSnapshotDirect = async () => {
    if (!activeFile) return;
    setIsGeneratingSnapshot(true);
    try {
      await downloadVisualSnapshotPNG(activeFile, reportConfig, simulatedLogo);
    } catch (err) {
      console.error('Error downloading snapshot PNG:', err);
    } finally {
      setIsGeneratingSnapshot(false);
    }
  };

  const handleCopySummaryText = () => {
    if (!activeFile) return;
    const summaryText = `CSV Auditor Pro - Visual Audit Summary\n` +
      `File Name: ${activeFile.name}\n` +
      `Quality Rating: ${activeFile.score}%\n` +
      `Total Rows: ${(activeFile.cleanedRows || activeFile.rows).length}\n` +
      `Total Issues Tracked: ${activeFile.issues.length}\n` +
      `Company: ${reportConfig.companyName}\n` +
      `Generated: ${new Date().toLocaleString()}`;
    navigator.clipboard.writeText(summaryText);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2500);
  };

  const handlePrintSnapshot = () => {
    if (!snapshotDataUrl) return;
    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(`
        <html>
          <head>
            <title>Audit Snapshot - ${activeFile.name}</title>
            <style>
              body { margin: 0; padding: 24px; display: flex; justify-content: center; align-items: center; background: #ffffff; font-family: sans-serif; }
              img { max-width: 100%; height: auto; border-radius: 12px; border: 1px solid #cbd5e1; }
            </style>
          </head>
          <body>
            <img src="${snapshotDataUrl}" alt="Audit Summary Visual Snapshot" />
            <script>window.onload = function() { window.print(); }</script>
          </body>
        </html>
      `);
      printWin.document.close();
    }
  };

  const triggerExport = (format: 'pdf' | 'csv' | 'xlsx') => {
    if (!activeFile) return;

    if (format === 'xlsx') {
      exportCleanedAuditToExcel(activeFile);
      return;
    }

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
      // PDF download option
      handleOpenSnapshotPreview();
    }
  };

  const getThemeHex = (color: string) => getThemeHexColor(color);

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

          {/* Visual Snapshot & Export action triggers */}
          <div className="space-y-3">
            {/* Primary Visual Snapshot Button */}
            <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-900/90 border-blue-900/50' : 'bg-blue-50/80 border-blue-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold flex items-center gap-1.5 text-blue-500 uppercase tracking-wider">
                  <Camera className="w-4 h-4 text-blue-500" /> Client-Side Visual Snapshot
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded font-semibold bg-blue-500/10 text-blue-500">
                  PNG / HD
                </span>
              </div>
              <p className={`text-xs mb-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Generate an immediate client-side visual snapshot card of the current audit summary for <strong>{activeFile.name}</strong>.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleOpenSnapshotPreview}
                  disabled={isGeneratingSnapshot}
                  className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isGeneratingSnapshot ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Eye className="w-4 h-4 text-white" />
                  )}
                  <span>Preview Snapshot</span>
                </button>
                <button
                  onClick={handleDownloadSnapshotDirect}
                  disabled={isGeneratingSnapshot}
                  className={`py-2.5 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer ${
                    isDarkMode
                      ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-100'
                      : 'bg-white border-slate-300 hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  {isGeneratingSnapshot ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  ) : (
                    <Download className="w-4 h-4 text-emerald-500" />
                  )}
                  <span>Download PNG</span>
                </button>
              </div>
            </div>

            {/* Stakeholder Email Dispatch Banner */}
            <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-900/90 border-violet-900/50' : 'bg-violet-50/80 border-violet-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold flex items-center gap-1.5 text-violet-500 uppercase tracking-wider">
                  <Mail className="w-4 h-4 text-violet-500" /> Stakeholder Email Dispatch
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded font-semibold bg-violet-500/10 text-violet-500">
                  Gmail Hub
                </span>
              </div>
              <p className={`text-xs mb-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Email this executive compliance report summary directly to team members and stakeholders via Gmail Compliance Hub.
              </p>
              <button
                onClick={handleOpenEmailModal}
                className="w-full py-2.5 px-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
              >
                <Send className="w-4 h-4 text-white" />
                <span>Send via Email</span>
              </button>
            </div>

            {/* Standard Format Exports */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button 
                onClick={() => triggerExport('pdf')}
                className={`py-3 rounded-xl border text-[11px] font-bold flex flex-col items-center justify-center gap-1.5 transition-all hover:scale-102 ${isDarkMode ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-100' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}`}
              >
                <Download className="w-4 h-4 text-rose-500" /> Export PDF
              </button>
              <button 
                onClick={handleOpenEmailModal}
                className={`py-3 rounded-xl border text-[11px] font-bold flex flex-col items-center justify-center gap-1.5 transition-all hover:scale-102 ${isDarkMode ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-100' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}`}
              >
                <Mail className="w-4 h-4 text-violet-500" /> Send via Email
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
        </div>

        {/* Live Interactive Preview */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">Live Report Preview</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenSnapshotPreview}
                disabled={isGeneratingSnapshot}
                className="text-xs font-bold text-blue-500 hover:text-blue-600 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Full Snapshot Preview</span>
              </button>
              <button
                onClick={handleDownloadSnapshotDirect}
                disabled={isGeneratingSnapshot}
                className="text-xs font-bold text-emerald-500 hover:text-emerald-600 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Download PNG</span>
              </button>
            </div>
          </div>
          
          <div className={`border rounded-3xl p-8 shadow-xl overflow-hidden relative transition-colors ${
            isDarkMode 
              ? 'bg-[#090d16] text-slate-100 border-slate-800' 
              : 'bg-white text-slate-900 border-slate-200'
          }`}>
            {/* Corner compliance indicator */}
            <div className={`absolute top-0 right-0 w-32 h-32 rotate-45 translate-x-12 -translate-y-12 flex items-end justify-center pb-2.5 border-b ${
              isDarkMode ? 'bg-slate-800/80 border-slate-700/60' : 'bg-slate-100 border-slate-200'
            }`}>
              <span className={`text-[9px] font-mono font-bold tracking-widest uppercase -rotate-45 ${
                isDarkMode ? 'text-slate-300' : 'text-slate-400'
              }`}>COMPLIANT</span>
            </div>

            {/* Top border colored by Accent Selector */}
            <div className="h-2 absolute top-0 left-0 right-0" style={{ backgroundColor: getThemeHex(reportConfig.themeColor) }}></div>

            {/* Preview Document Header */}
            <div className={`flex justify-between items-start border-b pb-6 mb-6 ${
              isDarkMode ? 'border-slate-800/80' : 'border-slate-100'
            }`}>
              <div>
                <h2 className="text-xl font-extrabold tracking-tight" style={{ color: getThemeHex(reportConfig.themeColor) }}>{reportConfig.title}</h2>
                <p className="text-xs text-slate-400 font-mono mt-1">{reportConfig.companyName} &bull; compliance desk</p>
              </div>
              {simulatedLogo ? (
                <img src={simulatedLogo} alt="Logo preview" className={`w-10 h-10 object-contain rounded border ${
                  isDarkMode ? 'border-slate-800' : 'border-slate-200'
                }`} />
              ) : (
                <div className={`w-10 h-10 rounded border border-dashed flex items-center justify-center text-slate-400 ${
                  isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}><Image className="w-4 h-4" /></div>
              )}
            </div>

            {/* Document stats */}
            <div className={`grid grid-cols-3 gap-4 p-4 rounded-xl border mb-6 text-xs ${
              isDarkMode ? 'bg-slate-900/80 border-slate-800/80' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Grade</span>
                <span className="block text-lg font-black text-emerald-500">{activeFile.score}%</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Total Rows</span>
                <span className={`block text-lg font-black ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{activeFile.rows.length} rows</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Status</span>
                <span className="block text-lg font-black text-blue-500">Sanitized</span>
              </div>
            </div>

            {/* Dynamic sections based on Template Type */}
            <div className={`space-y-4 text-xs leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              {reportConfig.templateType === 'executive' && (
                <>
                  <h4 className={`font-bold uppercase tracking-widest border-b pb-1 ${
                    isDarkMode ? 'text-slate-100 border-slate-800' : 'text-slate-900 border-slate-100'
                  }`}>1. Executive Summary</h4>
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
                  <h4 className={`font-bold uppercase tracking-widest border-b pb-1 ${
                    isDarkMode ? 'text-slate-100 border-slate-800' : 'text-slate-900 border-slate-100'
                  }`}>Technical Audit Log</h4>
                  <p className={`font-mono text-[10px] p-3 rounded border ${
                    isDarkMode ? 'bg-slate-900/80 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}>
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
                  <h4 className={`font-bold uppercase tracking-widest border-b pb-1 ${
                    isDarkMode ? 'text-slate-100 border-slate-800' : 'text-slate-900 border-slate-100'
                  }`}>Compliance Checklist</h4>
                  <div className="space-y-2">
                    <div className="flex gap-2 items-center"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Deduplication Purge Complete</div>
                    <div className="flex gap-2 items-center"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> ISO Date Standardization Active</div>
                    <div className="flex gap-2 items-center"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Null Value Imputations Resolved</div>
                  </div>
                </>
              )}
            </div>

            {/* Document Signature */}
            <div className={`mt-8 pt-6 border-t flex justify-between text-[10px] text-slate-400 ${
              isDarkMode ? 'border-slate-800' : 'border-slate-100'
            }`}>
              <span>Date generated: {new Date().toLocaleDateString()}</span>
              <span className="font-bold">Certified by CSV Auditor Pro Engine</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Snapshot Preview Modal */}
      <AnimatePresence>
        {isSnapshotModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`relative w-full max-w-4xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-slate-800/60 bg-slate-950/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                    <Camera className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base tracking-tight flex items-center gap-2">
                      Client-Side Audit Summary Visual Snapshot
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-emerald-500/10 text-emerald-500 uppercase">
                        High DPI / PNG
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Visual summary card for <strong className="text-slate-200">{activeFile.name}</strong> ({reportConfig.companyName})
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsSnapshotModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body with Snapshot Canvas Image */}
              <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center bg-slate-950/20">
                {snapshotDataUrl ? (
                  <div className="relative group max-w-2xl w-full border border-slate-800 rounded-2xl overflow-hidden shadow-2xl bg-white">
                    <img
                      src={snapshotDataUrl}
                      alt="Audit Summary Visual Snapshot"
                      className="w-full h-auto object-contain"
                    />
                  </div>
                ) : (
                  <div className="py-20 text-center text-slate-400 flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    <span>Rendering client-side visual snapshot...</span>
                  </div>
                )}
              </div>

              {/* Modal Footer Controls */}
              <div className={`p-4 border-t flex flex-wrap items-center justify-between gap-3 ${
                isDarkMode ? 'border-slate-800/80 bg-slate-950/60' : 'border-slate-200 bg-slate-50'
              }`}>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Client-Side Rendered &bull; 100% Private</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopySummaryText}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                      copiedToast
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : isDarkMode
                        ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {copiedToast ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
                    <span>{copiedToast ? 'Copied Summary!' : 'Copy Summary'}</span>
                  </button>

                  <button
                    onClick={handlePrintSnapshot}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                      isDarkMode
                        ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Printer className="w-4 h-4 text-slate-400" />
                    <span>Print Snapshot</span>
                  </button>

                  <button
                    onClick={handleDownloadSnapshotDirect}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-white" />
                    <span>Download PNG Snapshot</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Email Dispatch Modal (Gmail Compliance Hub Integration) */}
      <AnimatePresence>
        {isEmailModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`relative w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-slate-800/60 bg-slate-950/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-500">
                    <Mail className="w-5 h-5 text-violet-500" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base tracking-tight flex items-center gap-2">
                      Send Report via Gmail Compliance Hub
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-blue-500/10 text-blue-500 uppercase">
                        Gmail API Active
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Email current audit summary and executive report to stakeholders
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsEmailModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                {emailSendStatus && (
                  <div className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
                    emailSendStatus.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  }`}>
                    {emailSendStatus.success ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="font-bold">{emailSendStatus.success ? 'Dispatch Successful' : 'Dispatch Failed'}</p>
                      <p className="mt-0.5 opacity-90">{emailSendStatus.message}</p>
                      {emailSendStatus.success && (
                        <button
                          onClick={() => {
                            setIsEmailModalOpen(false);
                            onNavigate('gmail');
                          }}
                          className="mt-2 text-xs font-bold text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>View delivery log in Gmail Compliance Hub</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Recipient Address */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest">
                    Stakeholder Recipient Email(s)
                  </label>
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="stakeholder@company.com, manager@company.com"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none focus:ring-1 ${
                      isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-violet-500' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Separate multiple email recipients with commas.
                  </p>
                </div>

                {/* Email Subject */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest">
                    Email Subject Line
                  </label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none focus:ring-1 ${
                      isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-violet-500' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                {/* Report Content Body */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest flex items-center justify-between">
                    <span>Audit Report Email Body & Summary</span>
                    <span className="text-slate-500 font-mono text-[9px] lowercase">rfc 822 format</span>
                  </label>
                  <textarea
                    rows={8}
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs border font-mono focus:outline-none focus:ring-1 leading-relaxed ${
                      isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-violet-500' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                {/* Audit Attachment Summary Card */}
                <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  isDarkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                      <FileText className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-200">{activeFile.name} (Audit Summary)</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Score: {activeFile.score}% &bull; {activeFile.rows.length} rows &bull; Certified Executive Summary
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold">
                    Attached
                  </span>
                </div>
              </div>

              {/* Footer Controls */}
              <div className={`p-4 border-t flex items-center justify-between gap-3 ${
                isDarkMode ? 'border-slate-800/80 bg-slate-950/60' : 'border-slate-200 bg-slate-50'
              }`}>
                <button
                  onClick={() => setIsEmailModalOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    isDarkMode ? 'border-slate-800 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIsEmailModalOpen(false);
                      onNavigate('gmail');
                    }}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Gmail Hub</span>
                  </button>

                  <button
                    onClick={handleSendEmailReport}
                    disabled={isSendingEmail}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white flex items-center gap-2 transition-all shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {isSendingEmail ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Sending Email...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 text-white" />
                        <span>Send Email Report</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
