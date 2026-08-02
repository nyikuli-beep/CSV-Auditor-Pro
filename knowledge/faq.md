# Frequently Asked Questions (FAQ)

### What is CSV Auditor Pro?
CSV Auditor Pro is an intelligent spreadsheet audit and data cleaning platform designed to detect, explain, and repair data compliance issues in CSV, TSV, and Excel files before database ingestion.

### Is my dataset uploaded or saved on public servers?
No. Spreadsheet parsing and data transformations occur locally in your browser session. When using AI features, dataset summaries and schema metadata are transmitted securely via server-side encrypted API routes to Google Gemini and never stored for LLM training.

### How does the Conversational Auditor AI work?
The Conversational Auditor uses Retrieval-Augmented Generation (RAG) to ground its responses in your active uploaded dataset, current cleaning history, team workspace context, and product documentation.

### How do I clean duplicate rows?
Navigate to the **Cleaning Center**, select the **Deduplication** tab, choose whether to match across all columns or specific key columns (e.g. `transaction_id`), and click **Apply Deduplication**.

### Can I share audit reports with my team?
Yes! You can export reports as PDF, download cleaned Excel files, or dispatch an email report directly using the **Gmail Center** tab or **Report Generation** modal.

### What file formats are supported?
CSV Auditor Pro supports `.csv` (comma-separated), `.tsv` (tab-separated), `.txt` (delimiter separated), and `.xlsx` (Excel workbook) files.
