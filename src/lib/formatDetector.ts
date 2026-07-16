import { DetectedFormatMetadata } from '../types';

/**
 * Helper to automatically detect date formats and currency symbol settings
 * in a parsed CSV.
 */
export function detectCSVFormats(
  headers: string[],
  rows: Record<string, string>[]
): DetectedFormatMetadata {
  const dateFormats: Record<string, string> = {};
  const currencySettings: {
    column: string;
    symbol: string;
    decimalSeparator: string;
    thousandSeparator: string;
  }[] = [];

  if (rows.length === 0) {
    return { dateFormats, currencySettings };
  }

  // We scan a representative sample of up to 200 rows for high performance
  const sampleRows = rows.slice(0, 200);

  headers.forEach((header) => {
    const values = sampleRows
      .map((r) => r[header])
      .filter((v) => v !== undefined && v !== null && v.trim() !== '');

    if (values.length === 0) return;

    // --- 1. DETECT DATE FORMATS ---
    const isDateHeader =
      header.toLowerCase().includes('date') ||
      header.toLowerCase().includes('time') ||
      header.toLowerCase().includes('created') ||
      header.toLowerCase().includes('updated') ||
      header.toLowerCase().includes('period');

    // Count regex matches
    let yyyyMmDdCount = 0;
    let yyyyMmDdSlashCount = 0;
    let standardSlashCount = 0; // matching generic x/y/z
    let standardDashCount = 0;  // matching generic x-y-z
    let standardDotCount = 0;   // matching generic x.y.z

    // Part-specific tallies to distinguish MM/DD/YYYY from DD/MM/YYYY
    let firstPartGreater12 = 0;
    let secondPartGreater12 = 0;
    let hasFourDigitYearEnd = 0;
    let hasFourDigitYearStart = 0;

    const yyyyMmDdRegex = /^\d{4}-\d{2}-\d{2}$/;
    const yyyyMmDdSlashRegex = /^\d{4}\/\d{2}\/\d{2}$/;
    const genericSlashRegex = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/;
    const genericDashRegex = /^\d{1,2}-\d{1,2}-\d{2,4}$/;
    const genericDotRegex = /^\d{1,2}\.\d{1,2}\.\d{2,4}$/;

    values.forEach((val) => {
      const cleanVal = val.trim();
      if (yyyyMmDdRegex.test(cleanVal)) {
        yyyyMmDdCount++;
      } else if (yyyyMmDdSlashRegex.test(cleanVal)) {
        yyyyMmDdSlashCount++;
      } else if (genericSlashRegex.test(cleanVal)) {
        standardSlashCount++;
        const parts = cleanVal.split('/');
        if (parts.length === 3) {
          const p1 = parseInt(parts[0]);
          const p2 = parseInt(parts[1]);
          const p3 = parts[2];
          if (p1 > 12 && p1 <= 31) firstPartGreater12++;
          if (p2 > 12 && p2 <= 31) secondPartGreater12++;
          if (p3.length === 4) hasFourDigitYearEnd++;
          if (parts[0].length === 4) hasFourDigitYearStart++;
        }
      } else if (genericDashRegex.test(cleanVal)) {
        standardDashCount++;
        const parts = cleanVal.split('-');
        if (parts.length === 3) {
          const p1 = parseInt(parts[0]);
          const p2 = parseInt(parts[1]);
          const p3 = parts[2];
          if (p1 > 12 && p1 <= 31) firstPartGreater12++;
          if (p2 > 12 && p2 <= 31) secondPartGreater12++;
          if (p3.length === 4) hasFourDigitYearEnd++;
          if (parts[0].length === 4) hasFourDigitYearStart++;
        }
      } else if (genericDotRegex.test(cleanVal)) {
        standardDotCount++;
        const parts = cleanVal.split('.');
        if (parts.length === 3) {
          const p1 = parseInt(parts[0]);
          const p2 = parseInt(parts[1]);
          const p3 = parts[2];
          if (p1 > 12 && p1 <= 31) firstPartGreater12++;
          if (p2 > 12 && p2 <= 31) secondPartGreater12++;
          if (p3.length === 4) hasFourDigitYearEnd++;
          if (parts[0].length === 4) hasFourDigitYearStart++;
        }
      }
    });

    const totalValidCount = values.length;
    const dateMatchThreshold = 0.4; // If at least 40% match any pattern or it's a date header

    const totalDetectedDates = yyyyMmDdCount + yyyyMmDdSlashCount + standardSlashCount + standardDashCount + standardDotCount;
    const isProbablyDate = isDateHeader || (totalDetectedDates / totalValidCount) >= dateMatchThreshold;

    if (isProbablyDate) {
      // Determine the format
      if (yyyyMmDdCount > yyyyMmDdSlashCount && yyyyMmDdCount > standardSlashCount && yyyyMmDdCount > standardDashCount && yyyyMmDdCount > standardDotCount) {
        dateFormats[header] = 'YYYY-MM-DD';
      } else if (yyyyMmDdSlashCount > yyyyMmDdCount && yyyyMmDdSlashCount > standardSlashCount && yyyyMmDdSlashCount > standardDashCount && yyyyMmDdSlashCount > standardDotCount) {
        dateFormats[header] = 'YYYY/MM/DD';
      } else if (standardSlashCount >= standardDashCount && standardSlashCount >= standardDotCount) {
        // Slash format
        if (firstPartGreater12 > 0) {
          dateFormats[header] = hasFourDigitYearEnd > 0 ? 'DD/MM/YYYY' : 'DD/MM/YY';
        } else if (secondPartGreater12 > 0) {
          dateFormats[header] = hasFourDigitYearEnd > 0 ? 'MM/DD/YYYY' : 'MM/DD/YY';
        } else {
          // Default to MM/DD/YYYY unless year is at start
          dateFormats[header] = hasFourDigitYearStart > 0 ? 'YYYY/MM/DD' : 'MM/DD/YYYY';
        }
      } else if (standardDashCount >= standardSlashCount && standardDashCount >= standardDotCount) {
        // Dash format
        if (firstPartGreater12 > 0) {
          dateFormats[header] = hasFourDigitYearEnd > 0 ? 'DD-MM-YYYY' : 'DD-MM-YY';
        } else if (secondPartGreater12 > 0) {
          dateFormats[header] = hasFourDigitYearEnd > 0 ? 'MM-DD-YYYY' : 'MM-DD-YY';
        } else {
          dateFormats[header] = hasFourDigitYearStart > 0 ? 'YYYY-MM-DD' : 'MM-DD-YYYY';
        }
      } else if (standardDotCount > 0) {
        // Dot format (common European e.g., DD.MM.YYYY)
        if (secondPartGreater12 > 0) {
          dateFormats[header] = hasFourDigitYearEnd > 0 ? 'MM.DD.YYYY' : 'MM.DD.YY';
        } else {
          dateFormats[header] = hasFourDigitYearEnd > 0 ? 'DD.MM.YYYY' : 'DD.MM.YY';
        }
      } else {
        // Fallback standard
        dateFormats[header] = 'YYYY-MM-DD';
      }
    }

    // --- 2. DETECT CURRENCY SYMBOL AND SEPARATORS ---
    const isCurrencyHeader =
      header.toLowerCase().includes('amount') ||
      header.toLowerCase().includes('price') ||
      header.toLowerCase().includes('pay') ||
      header.toLowerCase().includes('cost') ||
      header.toLowerCase().includes('revenue') ||
      header.toLowerCase().includes('salary') ||
      header.toLowerCase().includes('fee') ||
      header.toLowerCase().includes('total');

    // Check if values look like currency/numbers
    const currencySymbols = ['$', '€', '£', '¥', '₹', '元', 'CHF', 'kr', 'zł', 'R$', '₱'];
    let symbolHits = 0;
    const symbolTally: Record<string, number> = {};

    let hasComma = 0;
    let hasDot = 0;
    let hasSpace = 0;

    let dotThenCommaCount = 0; // e.g. 1.250,00
    let commaThenDotCount = 0; // e.g. 1,250.00
    let decimalIsCommaCount = 0; // e.g. 1250,50
    let decimalIsDotCount = 0; // e.g. 1250.50

    values.forEach((val) => {
      const cleanVal = val.trim();

      // Look for symbol
      let foundSymbol = '';
      for (const sym of currencySymbols) {
        if (cleanVal.includes(sym)) {
          foundSymbol = sym;
          break;
        }
      }

      if (foundSymbol) {
        symbolHits++;
        symbolTally[foundSymbol] = (symbolTally[foundSymbol] || 0) + 1;
      }

      // Check punctuation
      // Strip out non-numeric, non-punctuation chars
      const numPart = cleanVal.replace(/[^0-9.,\s]/g, '').trim();
      
      const containsComma = numPart.includes(',');
      const containsDot = numPart.includes('.');
      const containsSpace = /\s/.test(numPart);

      if (containsComma) hasComma++;
      if (containsDot) hasDot++;
      if (containsSpace) hasSpace++;

      if (containsComma && containsDot) {
        const commaIndex = numPart.indexOf(',');
        const dotIndex = numPart.indexOf('.');
        if (dotIndex < commaIndex) {
          dotThenCommaCount++;
        } else {
          commaThenDotCount++;
        }
      } else if (containsComma) {
        // Check if followed by exactly 2 digits (typical decimal e.g. 1234,50)
        const parts = numPart.split(',');
        if (parts.length === 2 && parts[1].length === 2) {
          decimalIsCommaCount++;
        }
      } else if (containsDot) {
        // Check if followed by exactly 2 digits (typical decimal e.g. 1234.50)
        const parts = numPart.split('.');
        if (parts.length === 2 && parts[1].length === 2) {
          decimalIsDotCount++;
        }
      }
    });

    const isProbablyCurrency =
      isCurrencyHeader ||
      (symbolHits / totalValidCount) >= 0.2 ||
      ((hasComma + hasDot) / totalValidCount) >= 0.5;

    if (isProbablyCurrency) {
      // Pick top symbol
      let winningSymbol = '';
      let maxHits = 0;
      Object.entries(symbolTally).forEach(([sym, count]) => {
        if (count > maxHits) {
          maxHits = count;
          winningSymbol = sym;
        }
      });

      if (!winningSymbol && isCurrencyHeader) {
        // Try parsing any common currency character from the values if not matches standard
        const regexCurrencyChar = /[^\w\s\d.,\-]/g;
        const fallbackTally: Record<string, number> = {};
        values.forEach((v) => {
          const match = v.match(regexCurrencyChar);
          if (match) {
            match.forEach((char) => {
              fallbackTally[char] = (fallbackTally[char] || 0) + 1;
            });
          }
        });
        
        let winningFallback = '';
        let fallbackMax = 0;
        Object.entries(fallbackTally).forEach(([char, count]) => {
          if (count > fallbackMax) {
            fallbackMax = count;
            winningFallback = char;
          }
        });
        winningSymbol = winningFallback || '$'; // default to $ if still none
      } else if (!winningSymbol) {
        winningSymbol = '$'; // default fallback
      }

      // Determine separators
      let decimalSeparator = '.';
      let thousandSeparator = ',';

      if (dotThenCommaCount > commaThenDotCount) {
        decimalSeparator = ',';
        thousandSeparator = '.';
      } else if (commaThenDotCount > dotThenCommaCount) {
        decimalSeparator = '.';
        thousandSeparator = ',';
      } else if (hasSpace > 0 && hasComma > 0) {
        decimalSeparator = ',';
        thousandSeparator = ' ';
      } else if (hasSpace > 0 && hasDot > 0) {
        decimalSeparator = '.';
        thousandSeparator = ' ';
      } else if (decimalIsCommaCount > decimalIsDotCount) {
        decimalSeparator = ',';
        thousandSeparator = '';
      } else if (decimalIsDotCount > decimalIsCommaCount) {
        decimalSeparator = '.';
        thousandSeparator = '';
      } else {
        // Base logical defaults based on standard currency formats
        if (winningSymbol === '€') {
          decimalSeparator = ',';
          thousandSeparator = '.';
        } else {
          decimalSeparator = '.';
          thousandSeparator = ',';
        }
      }

      currencySettings.push({
        column: header,
        symbol: winningSymbol,
        decimalSeparator,
        thousandSeparator,
      });
    }
  });

  return {
    dateFormats,
    currencySettings,
  };
}
