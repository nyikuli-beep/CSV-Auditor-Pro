/**
 * Comprehensive Audit Report Generator & Exporter
 * CSV Auditor Pro
 */

import { DataQualityMetrics } from './dataProfiler';

export interface AuditReportData {
  fileName: string;
  timestamp: string;
  executionTimeMs: number;
  initialRows: number;
  finalRows: number;
  initialHeadersCount: number;
  finalHeadersCount: number;
  duplicatesRemoved: number;
  missingValuesFixed: number;
  aiCorrectionsApplied: number;
  outliersDetected: number;
  piiMaskedCount: number;
  encodingRepairedCount: number;
  headersRenamedCount: number;
  initialQualityScore: number;
  finalQualityScore: number;
  metricsBefore: DataQualityMetrics;
  metricsAfter: DataQualityMetrics;
  appliedRoutines: string[];
}

export function generateReportMarkdown(data: AuditReportData): string {
  return `# CSV Auditor Pro - Comprehensive Audit & Quality Report

**File Name:** ${data.fileName}  
**Date Generated:** ${new Date(data.timestamp).toLocaleString()}  
**Execution Speed:** ${data.executionTimeMs} ms  

---

## 1. Quality Improvement Summary
- **Initial Dataset Quality Score:** **${data.initialQualityScore}/100**
- **Post-Cleaning Quality Score:** **${data.finalQualityScore}/100** (+${Math.max(0, data.finalQualityScore - data.initialQualityScore)} points)
- **Rows Processed:** ${data.initialRows} original → ${data.finalRows} cleaned

---

## 2. Quantitative Action Log
| Cleaning Dimension | Count / Metric | Status |
| :--- | :--- | :--- |
| **Duplicates Removed** | ${data.duplicatesRemoved} rows | ✅ Completed |
| **Missing Values Filled / Predicted** | ${data.missingValuesFixed} cells | ✅ Completed |
| **AI Corrections Applied** | ${data.aiCorrectionsApplied} cells | ✅ Completed |
| **Outliers Handled** | ${data.outliersDetected} cells | ✅ Completed |
| **PII Data Protection Applied** | ${data.piiMaskedCount} cells | ✅ Protected |
| **Encoding / Unicode Repaired** | ${data.encodingRepairedCount} cells | ✅ Repaired |
| **Column Headers Standardized** | ${data.headersRenamedCount} headers | ✅ Standardized |

---

## 3. Data Quality Vector Comparison
| Quality Dimension | Before | After | Delta |
| :--- | :---: | :---: | :---: |
| **Completeness** | ${data.metricsBefore.completeness}% | ${data.metricsAfter.completeness}% | +${Math.max(0, data.metricsAfter.completeness - data.metricsBefore.completeness)}% |
| **Consistency** | ${data.metricsBefore.consistency}% | ${data.metricsAfter.consistency}% | +${Math.max(0, data.metricsAfter.consistency - data.metricsBefore.consistency)}% |
| **Accuracy** | ${data.metricsBefore.accuracy}% | ${data.metricsAfter.accuracy}% | +${Math.max(0, data.metricsAfter.accuracy - data.metricsBefore.accuracy)}% |
| **Validity** | ${data.metricsBefore.validity}% | ${data.metricsAfter.validity}% | +${Math.max(0, data.metricsAfter.validity - data.metricsBefore.validity)}% |
| **Uniqueness** | ${data.metricsBefore.uniqueness}% | ${data.metricsAfter.uniqueness}% | +${Math.max(0, data.metricsAfter.uniqueness - data.metricsBefore.uniqueness)}% |

---

## 4. Applied Cleaning Pipeline
${data.appliedRoutines.map((routine, idx) => `${idx + 1}. ${routine}`).join('\n')}

---
*CSV Auditor Pro Enterprise Data Quality Platform*
`;
}

export function downloadReportAsFile(content: string, fileName: string, fileType: 'json' | 'csv' | 'markdown' | 'pdf') {
  if (fileType === 'pdf') {
    // Print dialog fallback for PDF rendering
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${fileName}</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
              h1 { color: #2563eb; font-size: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; }
              h2 { font-size: 18px; margin-top: 24px; color: #0f172a; }
              table { width: 100%; border-collapse: collapse; margin-top: 12px; margin-bottom: 24px; }
              th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; font-size: 13px; }
              th { background-color: #f1f5f9; font-weight: bold; }
            </style>
          </head>
          <body>
            <pre style="white-space: pre-wrap; font-family: inherit;">${content.replace(/#+/g, '')}</pre>
            <script>window.onload = function() { window.print(); }</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
    return;
  }

  const mimeMap = {
    json: 'application/json',
    csv: 'text/csv',
    markdown: 'text/markdown'
  };

  const blob = new Blob([content], { type: mimeMap[fileType] || 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
