# Duplicate Row Detection & Resolution

## Duplicate Detection Logic
Duplicate records severely distort financial analytics, lead to double-billing, and violate primary key constraints in SQL databases.

## Detection Modes
1. **Full-Row Duplicate Match**: Identifies rows where every single cell value matches another row in the dataset.
2. **Key-Column Duplicate Match**: Identifies duplicate records based on specific key attributes (such as `transaction_id`, `email`, or `account_number`).

## Resolution Strategies
- **Retain First Occurrence**: Keeps the earliest row in spreadsheet order and purges subsequent duplicates.
- **Retain Latest Occurrence**: Keeps the last duplicate entry based on order or timestamp.
- **Flag for Review**: Highlights duplicate rows in yellow inside the Audit Results view and cell annotation board for manual verification before deletion.
