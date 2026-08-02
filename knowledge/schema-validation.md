# Schema Validation & Drift Detection

## Schema Management
CSV Auditor Pro allows teams to enforce rigid structural schema specifications on uploaded spreadsheet files to guarantee database compatibility.

## Key Capabilities
- **Column Type Enforcement**: Specify strict data types per column:
  - `String` (text values)
  - `Number` / `Integer` / `Float` (numeric values)
  - `Date` (ISO calendar dates)
  - `Email` (valid RFC 5322 email syntax)
  - `Regex` (custom pattern matching, e.g. Phone Numbers, Postal Codes)
- **Required / NOT NULL Constraints**: Flag missing values in required primary key or mandatory fields.
- **Unique Constraints**: Ensure values in primary key columns do not contain duplicates.
- **Schema Drift Detection**: When a new version of a spreadsheet or pipeline upload contains missing expected columns, unexpected extra columns, or modified data types, the audit engine triggers a **Schema Drift Alert**.
- **PostgreSQL DDL Generation**: Automatically export target SQL `CREATE TABLE` statements based on active schema definitions.
