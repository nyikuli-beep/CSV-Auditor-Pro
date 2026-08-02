# CSV Auditor Pro Features

## Core Feature Matrix
1. **Instant CSV & Excel Upload**: Drag-and-drop support for CSV, TSV, and XLSX files up to 50MB with instant parsing, encoding detection (UTF-8, ISO-8859-1), and auto-header extraction.
2. **Automated Audit Engine & Health Score**: Real-time evaluation of datasets giving a 0–100 quality score based on duplicate rows, blank cells, invalid date formats, casing mismatches, and numerical outliers.
3. **Automated Cleaning Center**:
   - **Deduplication**: One-click removal of duplicate rows based on exact match or custom key columns.
   - **Missing Value Imputation**: Fill blank cells using mean, median, mode, or custom placeholder strings ("N/A", "Uncategorized").
   - **Text Standardization**: Trim leading/trailing whitespace, fix mixed letter casing (UPPERCASE, lowercase, Title Case, Sentence case).
   - **ISO Date Formatting**: Convert messy dates (`08/02/2026`, `2-8-26`, `Aug 2, 2026`) into standard ISO-8601 (`YYYY-MM-DD`).
   - **Numeric & Currency Formatting**: Standardize currency symbols, remove extraneous commas, and enforce fixed decimal places.
4. **Schema Manager & Drift Detection**: Define custom column schemas (data type, required flags, regex patterns) and detect schema drift when incoming files violate expected structural rules.
5. **Conversational Auditor (AI Assistant)**: Natural language dataset Q&A powered by RAG, Gemini 3.6 Flash, and grounding in active dataset metrics, audit history, and product documentation.
6. **Cell Annotation Board**: Collaborative row-level and cell-level comments, audit flags, resolution status tags, and team discussion threads.
7. **Team Collaboration & Role-Based Access**: Multi-user workspaces with Owner, Admin, Editor, and Viewer roles, invite management, and audit trail logging.
8. **Compliance Reporting & Gmail Dispatch**: Export full audit reports to PDF, formatted XLSX, or email executive summaries directly via integrated Google Gmail API.
9. **Regex Builder & Custom Validation**: Visual regex pattern generator for custom field checks (SSN, Phone, SKU, IP Address).
10. **Custom CSV Templates**: Pre-configured compliance templates for Financial Transactions, User Rosters, E-commerce Inventories, and Healthcare Records.
