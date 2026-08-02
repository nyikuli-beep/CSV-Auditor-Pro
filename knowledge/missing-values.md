# Missing Values & Blank Cell Handling

## Missing Value Impact
Empty cells (`NULL`, blank strings, `#N/A`, `undefined`) break database `NOT NULL` constraints, trigger runtime exceptions in data pipelines, and distort statistical aggregations (averages, totals).

## Detection Mechanics
The audit scanner evaluates every cell in the spreadsheet against null patterns:
- Empty strings `""`
- Whitespace-only strings `" "`
- Null tokens (`"null"`, `"NULL"`, `"N/A"`, `"nan"`, `"None"`, `"#N/A"`)

## Imputation & Fixing Strategies
1. **Constant String Replacement**: Supply standard fallbacks like `"Uncategorized"`, `"Pending"`, or `"N/A"`.
2. **Mean Imputation**: Fills missing numbers with the column arithmetic average (best for normally distributed data).
3. **Median Imputation**: Fills missing numbers with the column median (best for skewed data with outliers).
4. **Mode Imputation**: Fills missing categorical values with the most frequently occurring value in the column.
5. **Row Deletion**: Purges entire rows containing blank cells when mandatory primary key fields are empty.
