# System Limits & Technical Constraints

## Guidelines & Limits
- **File Size**: Drag-and-drop file upload limit is 50MB per file for browser-based interactive cleaning.
- **Row Count**: Optimized for fast browser performance up to 250,000 rows. Larger files are handled smoothly via web workers and chunked processing.
- **Supported Encodings**: Auto-detects UTF-8, UTF-16, ISO-8859-1 (Latin-1), and ASCII CSV formats.
- **AI Token Window**: Conversational Auditor uses context window optimization and chunked retrieval (RAG) to process large spreadsheet schemas without exceeding LLM context limits.
