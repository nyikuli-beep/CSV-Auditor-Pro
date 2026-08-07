/**
 * Client-Side Visual Snapshot Generator
 * Renders a high-definition visual snapshot card of the active file's audit summary
 * directly to HTML5 Canvas for instant client-side preview and PNG download.
 */

import { CSVFile, ReportConfig } from '../types';

export function getThemeHexColor(themeColor: string): string {
  switch (themeColor) {
    case 'emerald': return '#10B981';
    case 'violet': return '#8B5CF6';
    case 'amber': return '#F59E0B';
    default: return '#2563EB'; // blue
  }
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  fillColor?: string,
  strokeColor?: string,
  lineWidth: number = 1
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

/**
 * Generates a high-DPI HTML5 Canvas snapshot of the current audit summary
 */
export async function generateVisualSnapshotCanvas(
  file: CSVFile,
  config: ReportConfig,
  logoUrl: string | null
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  const width = 1200;
  const height = 1500;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not initialize 2D canvas context');

  const themeHex = getThemeHexColor(config.themeColor);
  const duplicatesCount = file.issues.filter(i => i.type === 'duplicate').length;
  const missingCount = file.issues.filter(i => i.type === 'missing_value').length;
  const formatCount = file.issues.filter(i => i.type === 'invalid_format').length;
  const outlierCount = file.issues.filter(i => i.type === 'outlier').length;
  const totalIssues = file.issues.length;

  // 1. Background Canvas Card
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Outer border & shadow effect
  drawRoundedRect(ctx, 20, 20, width - 40, height - 40, 24, '#FFFFFF', '#CBD5E1', 3);

  // Top Accent Theme Banner
  drawRoundedRect(ctx, 20, 20, width - 40, 24, 12, themeHex);
  ctx.fillRect(20, 32, width - 40, 12); // Fill lower half of top banner

  let currentY = 80;

  // 2. Header Section
  // Title & Company
  ctx.fillStyle = themeHex;
  ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(config.title.toUpperCase(), 60, currentY);

  currentY += 34;
  ctx.fillStyle = '#64748B';
  ctx.font = '600 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`${config.companyName}  |  Compliance & Audit Desk`, 60, currentY);

  // Verification Badge Pill on Right
  drawRoundedRect(ctx, width - 360, 60, 300, 48, 24, '#F1F5F9', '#CBD5E1', 2);
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('VERIFIED SNAPSHOT', width - 325, 90);

  // If Logo provided, draw image or logo box
  if (logoUrl) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = logoUrl;
      });
      ctx.drawImage(img, width - 130, 120, 70, 70);
    } catch {
      // Fallback logo placeholder
      drawRoundedRect(ctx, width - 130, 120, 70, 70, 12, '#F8FAFC', '#E2E8F0', 2);
      ctx.fillStyle = '#94A3B8';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('LOGO', width - 115, 160);
    }
  }

  currentY += 50;

  // Divider Line
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(60, currentY);
  ctx.lineTo(width - 60, currentY);
  ctx.stroke();

  currentY += 40;

  // 3. Active File Metadata Box
  drawRoundedRect(ctx, 60, currentY, width - 120, 130, 18, '#F8FAFC', '#E2E8F0', 2);

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`Active File: ${file.name}`, 90, currentY + 42);

  ctx.fillStyle = '#475569';
  ctx.font = '500 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const rowCount = file.cleanedRows ? file.cleanedRows.length : file.rows.length;
  ctx.fillText(`Size: ${formatBytes(file.size)}   |   Total Rows: ${rowCount.toLocaleString()}   |   Columns: ${file.headers.length}   |   Uploaded: ${new Date(file.uploadedAt || Date.now()).toLocaleDateString()}`, 90, currentY + 82);

  currentY += 170;

  // 4. Quality Rating & Health Score Big Card
  drawRoundedRect(ctx, 60, currentY, width - 120, 180, 20, '#F1F5F9', themeHex, 3);

  // Score Number
  const score = file.score || 100;
  ctx.fillStyle = score >= 85 ? '#16A34A' : score >= 70 ? '#D97706' : '#DC2626';
  ctx.font = 'black 72px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`${score}%`, 100, currentY + 110);

  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('OVERALL AUDIT GRADE', 100, currentY + 145);

  // Health Status Badge
  const gradeLetter = score >= 90 ? 'Grade A+' : score >= 80 ? 'Grade A' : score >= 70 ? 'Grade B' : score >= 60 ? 'Grade C' : 'Grade D';
  const statusLabel = score >= 80 ? 'SANITIZED & COMPLIANT' : 'ATTENTION REQUIRED';

  drawRoundedRect(ctx, width - 420, currentY + 40, 320, 50, 14, score >= 80 ? '#DCFCE7' : '#FEF3C7', score >= 80 ? '#16A34A' : '#D97706', 2);
  ctx.fillStyle = score >= 80 ? '#15803D' : '#B45309';
  ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(statusLabel, width - 395, currentY + 72);

  drawRoundedRect(ctx, width - 420, currentY + 105, 320, 45, 14, '#FFFFFF', '#CBD5E1', 1);
  ctx.fillStyle = '#1E293B';
  ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`${gradeLetter}  |  ${totalIssues} Issues Tracked`, width - 395, currentY + 134);

  currentY += 220;

  // 5. 4-Grid Audit Health Metrics
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('AUDIT METRICS & ANOMALY BREAKDOWN', 60, currentY);

  currentY += 20;

  const boxWidth = (width - 120 - 3 * 20) / 4;
  const gridY = currentY;

  const metrics = [
    { label: 'Duplicate Rows', value: duplicatesCount, color: '#2563EB', bg: '#EFF6FF' },
    { label: 'Blank / Null Cells', value: missingCount, color: '#10B981', bg: '#ECFDF5' },
    { label: 'Format Errors', value: formatCount, color: '#8B5CF6', bg: '#F5F3FF' },
    { label: 'Outliers Flagged', value: outlierCount, color: '#F59E0B', bg: '#FFFBEB' },
  ];

  metrics.forEach((m, idx) => {
    const boxX = 60 + idx * (boxWidth + 20);
    drawRoundedRect(ctx, boxX, gridY, boxWidth, 120, 16, m.bg, m.color, 2);

    ctx.fillStyle = m.color;
    ctx.font = 'black 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(m.value.toString(), boxX + 24, gridY + 54);

    ctx.fillStyle = '#334155';
    ctx.font = '600 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(m.label, boxX + 24, gridY + 92);
  });

  currentY += 160;

  // 6. Detailed Issue Summary Table / List
  drawRoundedRect(ctx, 60, currentY, width - 120, 310, 18, '#FFFFFF', '#E2E8F0', 2);

  // Table Header
  drawRoundedRect(ctx, 60, currentY, width - 120, 48, 18, '#F1F5F9');
  ctx.fillStyle = '#475569';
  ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('ISSUE CATEGORY', 90, currentY + 30);
  ctx.fillText('SEVERITY', 400, currentY + 30);
  ctx.fillText('AFFECTED COLUMNS & DESCRIPTION', 600, currentY + 30);

  let rowY = currentY + 70;
  const displayIssues = file.issues.slice(0, 4);

  if (displayIssues.length === 0) {
    ctx.fillStyle = '#16A34A';
    ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('No critical data anomalies or quality violations detected in active file.', 90, rowY + 30);
  } else {
    displayIssues.forEach((issue) => {
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const cleanType = issue.type.replace('_', ' ').toUpperCase();
      ctx.fillText(cleanType, 90, rowY + 20);

      // Severity Tag
      const sevColor = issue.severity === 'critical' ? '#DC2626' : issue.severity === 'warning' ? '#D97706' : '#2563EB';
      const sevBg = issue.severity === 'critical' ? '#FEE2E2' : issue.severity === 'warning' ? '#FEF3C7' : '#DBEAFE';
      drawRoundedRect(ctx, 400, rowY, 110, 30, 8, sevBg, sevColor, 1);
      ctx.fillStyle = sevColor;
      ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(issue.severity.toUpperCase(), 415, rowY + 20);

      // Column & Description
      ctx.fillStyle = '#334155';
      ctx.font = '500 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const descText = issue.description.length > 55 ? issue.description.substring(0, 52) + '...' : issue.description;
      ctx.fillText(`[${issue.column}] ${descText}`, 600, rowY + 20);

      rowY += 55;
    });
  }

  currentY += 340;

  // 7. Security & Compliance Verification Box
  drawRoundedRect(ctx, 60, currentY, width - 120, 110, 16, '#F8FAFC', '#CBD5E1', 2);

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('SECURITY & COMPLIANCE CERTIFICATION', 90, currentY + 38);

  ctx.fillStyle = '#475569';
  ctx.font = '500 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const formulasSanitized = file.securityScanSummary?.formulasSanitized ?? 0;
  ctx.fillText(`Formulas Sanitized: ${formulasSanitized}   |   Client-Side Browser Execution: 100% Private   |   No External Server Storage`, 90, currentY + 75);

  currentY += 130;

  // 8. Footer & Stamp
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, currentY);
  ctx.lineTo(width - 60, currentY);
  ctx.stroke();

  currentY += 30;

  ctx.fillStyle = '#94A3B8';
  ctx.font = '500 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`Generated by CSV Auditor Pro Engine   |   Date: ${new Date().toLocaleString()}`, 60, currentY);

  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`CONFIDENTIAL & PROPRIETARY`, width - 300, currentY);

  return canvas;
}

/**
 * Downloads the visual snapshot as a crisp PNG file directly on the client side
 */
export async function downloadVisualSnapshotPNG(
  file: CSVFile,
  config: ReportConfig,
  logoUrl: string | null
): Promise<void> {
  const canvas = await generateVisualSnapshotCanvas(file, config, logoUrl);
  const dataUrl = canvas.toDataURL('image/png');

  const safeFileName = file.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeCompany = config.companyName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const downloadName = `Audit_Snapshot_${safeFileName}_${safeCompany}.png`;

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = downloadName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
