# CSV Data Cleaning Routines

## Cleaning Center Overview
The Cleaning Center provides non-destructive, batch data transformation routines to fix messy spreadsheet records before database migration.

## Available Routines

### 1. Deduplication
- **Exact Match**: Scans every column across rows and retains only the first unique instance.
- **Key-Column Match**: Allows selecting primary key columns (e.g., `transaction_id`, `email`, `user_id`) to remove secondary duplicate rows while preserving the first record.

### 2. Missing Value Imputation
- **Fill with Custom String**: Replaces empty/null/NaN cells with a user-defined default (e.g. "Uncategorized", "N/A", "Unknown").
- **Statistical Imputation**: For numeric columns, fills missing values with column Mean or Median.
- **Categorical Imputation**: Fills missing values with the Mode (most frequent value).
- **Row Removal**: Drops rows containing blank values in critical required columns.

### 3. Text & String Normalization
- **Trim Whitespace**: Removes leading, trailing, and duplicate inner spaces from text cells.
- **Letter Case Standardizer**: Converts text to UPPERCASE, lowercase, Title Case, or Sentence case.

### 4. ISO Date Standardization
- Converts non-standard or localized date strings (e.g., `12/31/2025`, `31-12-2025`, `Dec 31 2025`) into standard ISO-8601 strings (`YYYY-MM-DD`).

### 5. Numeric & Currency Formatting
- Strips non-numeric characters (like `$`, `€`, `£`, `,`) from numeric series and formats numbers to fixed decimal points.
