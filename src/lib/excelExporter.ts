import * as XLSX from 'xlsx';
import { CSVFile, AuditIssue } from '../types';

/**
 * Generates and downloads a structured Excel (.xlsx) workbook for a audited/cleaned CSV dataset.
 * Includes multiple tabs:
 * 1. Cleaned & Audited Data (with issue flags)
 * 2. Audit Findings Log (detailed compliance breakdown)
 * 3. Rows with Issues Only
 * 4. Executive Summary & Audit Telemetry
 */
export function exportCleanedAuditToExcel(file: CSVFile): void {
  if (!file) return;

  const workbook = XLSX.utils.book_new();
  const rows = file.cleanedRows || file.rows;
  const issues = file.issues || [];
  const baseName = file.name.replace(/\.[^/.]+$/, "");

  // Map issues by row number (1-indexed, headers are row 1, data starts at row 2)
  const issuesByRowMap = new Map<number, AuditIssue[]>();
  issues.forEach(issue => {
    if (issue.row !== undefined) {
      const list = issuesByRowMap.get(issue.row) || [];
      list.push(issue);
      issuesByRowMap.set(issue.row, list);
    }
  });

  // ==========================================
  // SHEET 1: Cleaned Data with Issue Flag Column
  // ==========================================
  const headers = [...file.headers, 'Audit Quality Status', 'Identified Issue Highlights'];
  
  const sheet1Data: (string | number)[][] = [headers];

  rows.forEach((row, idx) => {
    const humanRowIndex = idx + 2; // Row 1 is header
    const rowIssues = issuesByRowMap.get(humanRowIndex) || [];
    
    let qualityStatus = '[CLEAN] Clean / Compliant';
    if (rowIssues.some(i => i.severity === 'critical')) {
      qualityStatus = '[CRITICAL] CRITICAL ISSUE';
    } else if (rowIssues.some(i => i.severity === 'warning')) {
      qualityStatus = '[WARNING] WARNING';
    } else if (rowIssues.length > 0) {
      qualityStatus = '[NOTICE] NOTICE';
    }

    const issueHighlights = rowIssues.map(i => `[${i.severity.toUpperCase()}] ${i.column}: ${i.description}`).join(' | ');

    const rowArray = file.headers.map(h => row[h] !== undefined ? row[h] : '');
    rowArray.push(qualityStatus, issueHighlights || 'None');
    sheet1Data.push(rowArray);
  });

  const sheet1 = XLSX.utils.aoa_to_sheet(sheet1Data);

  // Apply auto column width calculation
  const sheet1ColWidths = headers.map((header, colIdx) => {
    let maxLen = header.length;
    sheet1Data.forEach(row => {
      const valStr = String(row[colIdx] || '');
      if (valStr.length > maxLen) {
        maxLen = Math.min(valStr.length, 50); // cap max width at 50 for readability
      }
    });
    return { wch: Math.max(maxLen + 3, 12) };
  });
  sheet1['!cols'] = sheet1ColWidths;

  XLSX.utils.book_append_sheet(workbook, sheet1, 'Cleaned Dataset');

  // ==========================================
  // SHEET 2: Audit Findings & Compliance Log
  // ==========================================
  const findingsHeaders = [
    'Issue ID',
    'Severity',
    'Category Type',
    'Target Column',
    'Row #',
    'Current Value',
    'Issue Description',
    'Recommended Fix',
    'Status'
  ];

  const sheet2Data: (string | number)[][] = [findingsHeaders];

  issues.forEach(issue => {
    sheet2Data.push([
      issue.id,
      issue.severity.toUpperCase(),
      issue.type.replace('_', ' ').toUpperCase(),
      issue.column || 'N/A',
      issue.row ? issue.row : 'Global',
      issue.value !== undefined && issue.value !== null ? String(issue.value) : '[EMPTY]',
      issue.description,
      issue.suggestion || 'Review row values',
      issue.status.toUpperCase()
    ]);
  });

  const sheet2 = XLSX.utils.aoa_to_sheet(sheet2Data);
  sheet2['!cols'] = findingsHeaders.map((h, colIdx) => {
    let maxLen = h.length;
    sheet2Data.forEach(r => {
      const valStr = String(r[colIdx] || '');
      if (valStr.length > maxLen) maxLen = Math.min(valStr.length, 60);
    });
    return { wch: Math.max(maxLen + 3, 14) };
  });

  XLSX.utils.book_append_sheet(workbook, sheet2, 'Audit Findings Log');

  // ==========================================
  // SHEET 3: Rows with Issues Only
  // ==========================================
  const rowsWithIssuesData: (string | number)[][] = [headers];

  rows.forEach((row, idx) => {
    const humanRowIndex = idx + 2;
    const rowIssues = issuesByRowMap.get(humanRowIndex) || [];
    if (rowIssues.length > 0) {
      let qualityStatus = '[CRITICAL] CRITICAL';
      if (!rowIssues.some(i => i.severity === 'critical')) {
        qualityStatus = rowIssues.some(i => i.severity === 'warning') ? '[WARNING] WARNING' : '[NOTICE] NOTICE';
      }
      const issueHighlights = rowIssues.map(i => `[${i.type}] ${i.description}`).join('; ');
      const rowArray = file.headers.map(h => row[h] !== undefined ? row[h] : '');
      rowArray.push(qualityStatus, issueHighlights);
      rowsWithIssuesData.push(rowArray);
    }
  });

  const sheet3 = XLSX.utils.aoa_to_sheet(rowsWithIssuesData);
  sheet3['!cols'] = sheet1ColWidths;
  XLSX.utils.book_append_sheet(workbook, sheet3, 'Flagged Rows Only');

  // ==========================================
  // SHEET 4: Executive Compliance Summary
  // ==========================================
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const infoCount = issues.filter(i => i.severity === 'info').length;

  const summaryData: (string | number)[][] = [
    ['CSV AUDITOR PRO - COMPLIANCE EXECUTIVE SUMMARY'],
    ['Generated At', new Date().toLocaleString()],
    ['File Name', file.name],
    ['File Size', file.size || 'N/A'],
    ['Compliance Health Score', `${file.score}%`],
    ['Total Records Analyzed', rows.length],
    ['Total Issues Identified', issues.length],
    ['Critical Severity Flaws', criticalCount],
    ['Warning Alerts', warningCount],
    ['Informational Notices', infoCount],
    ['Cleaning Status', file.cleanedRows ? 'SANITY CLEANED & NORMALIZED' : 'ORIGINAL AUDITED'],
    ['Compliance Standard', 'ISO 27001 / SOC-2 Audit Compliant Data Ingestion']
  ];

  const sheet4 = XLSX.utils.aoa_to_sheet(summaryData);
  sheet4['!cols'] = [{ wch: 32 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(workbook, sheet4, 'Executive Summary');

  // Write and trigger download
  XLSX.writeFile(workbook, `${baseName}_Audited_Report.xlsx`);
}
