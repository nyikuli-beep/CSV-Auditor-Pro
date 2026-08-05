/**
 * AI Smart Data Correction & AI Missing Value Prediction Engine
 * CSV Auditor Pro
 */

export interface CorrectionItem {
  id: string;
  rowIndex: number;
  columnName: string;
  originalValue: string;
  suggestedValue: string;
  confidence: number; // 0 - 100
  category: 'Spelling' | 'City' | 'Country' | 'Company' | 'Department' | 'Product' | 'Abbreviation' | 'Capitalization';
  reason: string;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface PredictionItem {
  id: string;
  rowIndex: number;
  targetColumn: string;
  predictedValue: string;
  confidence: number; // 0 - 100
  reasoning: string;
  sourceColumnsUsed: string[];
  status: 'pending' | 'accepted' | 'rejected';
}

// Built-in dictionaries for fast local AI corrections
const CITY_CORRECTIONS: Record<string, string> = {
  'naiorbi': 'Nairobi',
  'nairoby': 'Nairobi',
  'mombas': 'Mombasa',
  'newyork': 'New York',
  'new york city': 'New York',
  'londn': 'London',
  'tokyo': 'Tokyo',
  'paris': 'Paris',
  'sydeny': 'Sydney',
  'toronto': 'Toronto',
  'berln': 'Berlin',
  'singapor': 'Singapore'
};

const COUNTRY_CORRECTIONS: Record<string, string> = {
  'kenya': 'Kenya',
  'kenya.': 'Kenya',
  'usa': 'United States',
  'u.s.a.': 'United States',
  'us': 'United States',
  'uk': 'United Kingdom',
  'u.k.': 'United Kingdom',
  'u.a.e.': 'United Arab Emirates',
  'uae': 'United Arab Emirates',
  'germny': 'Germany',
  'frnce': 'France',
  'canad': 'Canada',
  'south africa': 'South Africa',
  'southafrica': 'South Africa'
};

const COMPANY_CORRECTIONS: Record<string, string> = {
  'microsft': 'Microsoft',
  'micosoft': 'Microsoft',
  'msft': 'Microsoft',
  'gogle': 'Google',
  'googl': 'Google',
  'appl': 'Apple',
  'amazn': 'Amazon',
  'meta/fb': 'Meta',
  'ibmm': 'IBM',
  'oracle corp': 'Oracle Corporation'
};

const DEPT_CORRECTIONS: Record<string, string> = {
  'eng': 'Engineering',
  'enginering': 'Engineering',
  'mktg': 'Marketing',
  'markting': 'Marketing',
  'fin': 'Finance',
  'hr': 'Human Resources',
  'h.r.': 'Human Resources',
  'it': 'Information Technology',
  'i.t.': 'Information Technology',
  'dev': 'Software Development',
  'ops': 'Operations',
  'cust supp': 'Customer Support'
};

const ABBREVIATIONS: Record<string, string> = {
  'st': 'Street',
  'st.': 'Street',
  'rd': 'Road',
  'rd.': 'Road',
  'ave': 'Avenue',
  'ave.': 'Avenue',
  'blvd': 'Boulevard',
  'blvd.': 'Boulevard',
  'ste': 'Suite',
  'ste.': 'Suite',
  'apt': 'Apartment',
  'apt.': 'Apartment',
  'dept': 'Department',
  'dept.': 'Department',
  'mgmt': 'Management',
  'corp': 'Corporation',
  'corp.': 'Corporation',
  'inc': 'Incorporated',
  'inc.': 'Incorporated',
  'ltd': 'Limited',
  'ltd.': 'Limited'
};

/**
 * Scans dataset for smart corrections (spelling, city/country/company/dept names, abbreviations, capitalization)
 */
export function scanSmartCorrections(headers: string[], rows: Record<string, string>[]): CorrectionItem[] {
  const items: CorrectionItem[] = [];

  rows.forEach((row, rIdx) => {
    headers.forEach((col) => {
      const val = String(row[col] ?? '').trim();
      if (!val) return;

      const lowerCol = col.toLowerCase();
      const lowerVal = val.toLowerCase();

      // 1. City Check
      if (lowerCol.includes('city') || lowerCol.includes('town')) {
        if (CITY_CORRECTIONS[lowerVal] && CITY_CORRECTIONS[lowerVal] !== val) {
          items.push({
            id: `corr-${rIdx}-${col}`,
            rowIndex: rIdx,
            columnName: col,
            originalValue: val,
            suggestedValue: CITY_CORRECTIONS[lowerVal],
            confidence: 96,
            category: 'City',
            reason: `Recognized typo for city '${CITY_CORRECTIONS[lowerVal]}'`,
            status: 'pending'
          });
          return;
        }
      }

      // 2. Country Check
      if (lowerCol.includes('country') || lowerCol.includes('nation')) {
        if (COUNTRY_CORRECTIONS[lowerVal] && COUNTRY_CORRECTIONS[lowerVal] !== val) {
          items.push({
            id: `corr-${rIdx}-${col}`,
            rowIndex: rIdx,
            columnName: col,
            originalValue: val,
            suggestedValue: COUNTRY_CORRECTIONS[lowerVal],
            confidence: 98,
            category: 'Country',
            reason: `Standardized country name to '${COUNTRY_CORRECTIONS[lowerVal]}'`,
            status: 'pending'
          });
          return;
        }
      }

      // 3. Company / Organization Check
      if (lowerCol.includes('company') || lowerCol.includes('organization') || lowerCol.includes('employer')) {
        if (COMPANY_CORRECTIONS[lowerVal] && COMPANY_CORRECTIONS[lowerVal] !== val) {
          items.push({
            id: `corr-${rIdx}-${col}`,
            rowIndex: rIdx,
            columnName: col,
            originalValue: val,
            suggestedValue: COMPANY_CORRECTIONS[lowerVal],
            confidence: 95,
            category: 'Company',
            reason: `Normalized company brand name to '${COMPANY_CORRECTIONS[lowerVal]}'`,
            status: 'pending'
          });
          return;
        }
      }

      // 4. Department Check
      if (lowerCol.includes('dept') || lowerCol.includes('department')) {
        if (DEPT_CORRECTIONS[lowerVal] && DEPT_CORRECTIONS[lowerVal] !== val) {
          items.push({
            id: `corr-${rIdx}-${col}`,
            rowIndex: rIdx,
            columnName: col,
            originalValue: val,
            suggestedValue: DEPT_CORRECTIONS[lowerVal],
            confidence: 92,
            category: 'Department',
            reason: `Expanded department abbreviation to '${DEPT_CORRECTIONS[lowerVal]}'`,
            status: 'pending'
          });
          return;
        }
      }

      // 5. General Abbreviation Check
      if (ABBREVIATIONS[lowerVal] && ABBREVIATIONS[lowerVal] !== val) {
        items.push({
          id: `corr-${rIdx}-${col}`,
          rowIndex: rIdx,
          columnName: col,
          originalValue: val,
          suggestedValue: ABBREVIATIONS[lowerVal],
          confidence: 90,
          category: 'Abbreviation',
          reason: `Expanded standard abbreviation '${val}' -> '${ABBREVIATIONS[lowerVal]}'`,
          status: 'pending'
        });
        return;
      }

      // 6. Capitalization Inconsistencies (ALL CAPS or all lowercase words)
      if (val.length > 3 && /^[a-z]+$/.test(val)) {
        const titleCase = val.charAt(0).toUpperCase() + val.slice(1);
        items.push({
          id: `corr-${rIdx}-${col}`,
          rowIndex: rIdx,
          columnName: col,
          originalValue: val,
          suggestedValue: titleCase,
          confidence: 88,
          category: 'Capitalization',
          reason: `Converted lowercase string to Title Case '${titleCase}'`,
          status: 'pending'
        });
      }
    });
  });

  return items;
}

/**
 * Predicts missing values using contextual row relations
 */
export function predictMissingValues(headers: string[], rows: Record<string, string>[]): PredictionItem[] {
  const predictions: PredictionItem[] = [];

  rows.forEach((row, rIdx) => {
    headers.forEach((targetCol) => {
      const val = String(row[targetCol] ?? '').trim();
      if (val !== '' && val !== 'NULL' && val !== 'null' && val !== 'N/A') return; // Only process missing cells

      const lowerTarget = targetCol.toLowerCase();

      // Rule 1: Predict Country from City
      if (lowerTarget.includes('country')) {
        const cityCol = headers.find(h => h.toLowerCase().includes('city'));
        if (cityCol && row[cityCol]) {
          const cityVal = row[cityCol].toLowerCase().trim();
          if (['nairobi', 'mombasa', 'kisumu', 'nakuru'].includes(cityVal)) {
            predictions.push({
              id: `pred-${rIdx}-${targetCol}`,
              rowIndex: rIdx,
              targetColumn: targetCol,
              predictedValue: 'Kenya',
              confidence: 98,
              reasoning: `City '${row[cityCol]}' is located in Kenya`,
              sourceColumnsUsed: [cityCol],
              status: 'pending'
            });
            return;
          }
          if (['new york', 'los angeles', 'chicago', 'houston', 'seattle', 'miami'].includes(cityVal)) {
            predictions.push({
              id: `pred-${rIdx}-${targetCol}`,
              rowIndex: rIdx,
              targetColumn: targetCol,
              predictedValue: 'United States',
              confidence: 98,
              reasoning: `City '${row[cityCol]}' is located in United States`,
              sourceColumnsUsed: [cityCol],
              status: 'pending'
            });
            return;
          }
          if (['london', 'manchester', 'birmingham', 'edinburgh'].includes(cityVal)) {
            predictions.push({
              id: `pred-${rIdx}-${targetCol}`,
              rowIndex: rIdx,
              targetColumn: targetCol,
              predictedValue: 'United Kingdom',
              confidence: 97,
              reasoning: `City '${row[cityCol]}' is located in United Kingdom`,
              sourceColumnsUsed: [cityCol],
              status: 'pending'
            });
            return;
          }
        }
      }

      // Rule 2: Predict Currency from Country
      if (lowerTarget.includes('currency')) {
        const countryCol = headers.find(h => h.toLowerCase().includes('country'));
        if (countryCol && row[countryCol]) {
          const countryVal = row[countryCol].toLowerCase().trim();
          let predictedCurrency = '';
          if (countryVal.includes('kenya')) predictedCurrency = 'KES';
          else if (countryVal.includes('united states') || countryVal === 'usa' || countryVal === 'us') predictedCurrency = 'USD';
          else if (countryVal.includes('united kingdom') || countryVal === 'uk') predictedCurrency = 'GBP';
          else if (countryVal.includes('germany') || countryVal.includes('france') || countryVal.includes('spain')) predictedCurrency = 'EUR';

          if (predictedCurrency) {
            predictions.push({
              id: `pred-${rIdx}-${targetCol}`,
              rowIndex: rIdx,
              targetColumn: targetCol,
              predictedValue: predictedCurrency,
              confidence: 99,
              reasoning: `Country '${row[countryCol]}' uses national currency '${predictedCurrency}'`,
              sourceColumnsUsed: [countryCol],
              status: 'pending'
            });
            return;
          }
        }
      }

      // Rule 3: Predict Department from Job Title
      if (lowerTarget.includes('dept') || lowerTarget.includes('department')) {
        const titleCol = headers.find(h => h.toLowerCase().includes('title') || h.toLowerCase().includes('role') || h.toLowerCase().includes('position'));
        if (titleCol && row[titleCol]) {
          const titleVal = row[titleCol].toLowerCase().trim();
          let predictedDept = '';
          if (titleVal.includes('developer') || titleVal.includes('engineer') || titleVal.includes('software') || titleVal.includes('architect')) {
            predictedDept = 'Engineering';
          } else if (titleVal.includes('market') || titleVal.includes('seo') || titleVal.includes('growth') || titleVal.includes('campaign')) {
            predictedDept = 'Marketing';
          } else if (titleVal.includes('accountant') || titleVal.includes('financial') || titleVal.includes('auditor') || titleVal.includes('payroll')) {
            predictedDept = 'Finance';
          } else if (titleVal.includes('recruiter') || titleVal.includes('talent') || titleVal.includes('hr')) {
            predictedDept = 'Human Resources';
          }

          if (predictedDept) {
            predictions.push({
              id: `pred-${rIdx}-${targetCol}`,
              rowIndex: rIdx,
              targetColumn: targetCol,
              predictedValue: predictedDept,
              confidence: 91,
              reasoning: `Job title '${row[titleCol]}' maps to '${predictedDept}' department`,
              sourceColumnsUsed: [titleCol],
              status: 'pending'
            });
            return;
          }
        }
      }

      // Rule 4: Predict Category / Product Type from Product Name
      if (lowerTarget.includes('category') || lowerTarget.includes('product type')) {
        const prodCol = headers.find(h => h.toLowerCase().includes('product') || h.toLowerCase().includes('item'));
        if (prodCol && row[prodCol]) {
          const prodVal = row[prodCol].toLowerCase().trim();
          let predictedCat = '';
          if (prodVal.includes('iphone') || prodVal.includes('macbook') || prodVal.includes('galaxy') || prodVal.includes('laptop')) {
            predictedCat = 'Electronics';
          } else if (prodVal.includes('shirt') || prodVal.includes('pants') || prodVal.includes('shoes') || prodVal.includes('jacket')) {
            predictedCat = 'Apparel';
          } else if (prodVal.includes('desk') || prodVal.includes('chair') || prodVal.includes('table') || prodVal.includes('sofa')) {
            predictedCat = 'Furniture';
          }

          if (predictedCat) {
            predictions.push({
              id: `pred-${rIdx}-${targetCol}`,
              rowIndex: rIdx,
              targetColumn: targetCol,
              predictedValue: predictedCat,
              confidence: 89,
              reasoning: `Product '${row[prodCol]}' belongs to '${predictedCat}' category`,
              sourceColumnsUsed: [prodCol],
              status: 'pending'
            });
            return;
          }
        }
      }

      // Fallback: Mode/Most Frequent Value in column
      const colValues = rows.map(r => String(r[targetCol] || '').trim()).filter(v => v !== '' && v !== 'NULL');
      if (colValues.length > 5) {
        const freqMap: Record<string, number> = {};
        colValues.forEach(v => freqMap[v] = (freqMap[v] || 0) + 1);
        let topVal = '';
        let topCount = 0;
        Object.entries(freqMap).forEach(([k, c]) => {
          if (c > topCount) {
            topCount = c;
            topVal = k;
          }
        });
        const freqRatio = topCount / colValues.length;
        if (freqRatio >= 0.6) {
          predictions.push({
            id: `pred-${rIdx}-${targetCol}`,
            rowIndex: rIdx,
            targetColumn: targetCol,
            predictedValue: topVal,
            confidence: Math.round(freqRatio * 100),
            reasoning: `'${topVal}' accounts for ${Math.round(freqRatio * 100)}% of non-missing values in column '${targetCol}'`,
            sourceColumnsUsed: [targetCol],
            status: 'pending'
          });
        }
      }
    });
  });

  return predictions;
}
