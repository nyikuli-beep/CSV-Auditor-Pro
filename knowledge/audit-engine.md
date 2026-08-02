# Automated Audit Engine & Quality Scoring

## Compliance Audit Score (0–100 Scale)
Every uploaded spreadsheet receives a real-time Audit Score calculated by the automated compliance engine:

- **100 - 90 (Green / Excellent)**: Clean dataset ready for production ingestion. Minor warnings only.
- **89 - 70 (Yellow / Moderate Risk)**: Contains minor issues (untrimmed spaces, casing mismatches, occasional blank cells).
- **69 - 0 (Red / High Risk)**: Fatal compliance errors detected (duplicate primary keys, invalid date formats, extreme numerical outliers, schema violations).

## Error Taxonomy
1. **Duplicates**: Duplicate rows violating key uniqueness.
2. **Missing Values**: Empty or null cells in dataset columns.
3. **Format Errors**: Non-ISO dates, malformed emails, unparseable numbers.
4. **Casing & Trim**: Inconsistent letter casing or trailing whitespace.
5. **Outliers**: Extreme numerical values exceeding 3 standard deviations from column mean.
6. **Schema Violations**: Unrecognized headers or data type mismatches against active schema specifications.
