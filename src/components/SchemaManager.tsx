import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  ShieldCheck, 
  ShieldAlert, 
  Plus, 
  Trash2, 
  Check, 
  AlertTriangle, 
  X, 
  HelpCircle, 
  FileCheck,
  RefreshCw,
  Sliders,
  Settings,
  ArrowRight,
  Database,
  Grid,
  Info,
  Layers,
  Edit2,
  Activity,
  GripVertical,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { CSVFile } from '../types';

export interface SchemaField {
  id: string;
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'email' | 'currency';
  required: boolean;
}

export interface CSVSchema {
  id: string;
  name: string;
  description: string;
  fields: SchemaField[];
}

interface SchemaManagerProps {
  files: CSVFile[];
  activeFile: CSVFile | null;
  onSelectFile: (file: CSVFile) => void;
  onNavigate: (tabId: string) => void;
  isDarkMode: boolean;
  accentClass: string;
}

// Default pre-packaged schemas for common industry use cases
const TEMPLATE_SCHEMAS: CSVSchema[] = [
  {
    id: 'schema-transactions',
    name: 'Financial Ledger Schema',
    description: 'Validates standard accounting records with Transaction IDs, currency amounts, and ISO-date sequences.',
    fields: [
      { id: 'f1', name: 'Transaction ID', type: 'string', required: true },
      { id: 'f2', name: 'Amount', type: 'currency', required: true },
      { id: 'f3', name: 'Transaction Date', type: 'date', required: true },
      { id: 'f4', name: 'Category', type: 'string', required: false },
      { id: 'f5', name: 'Customer Name', type: 'string', required: false },
      { id: 'f6', name: 'Email / Contact', type: 'email', required: false }
    ]
  },
  {
    id: 'schema-contacts',
    name: 'Customer Directory Schema',
    description: 'Enforces contact list integrity requiring clean emails, full names, and active flags.',
    fields: [
      { id: 'c1', name: 'Name', type: 'string', required: true },
      { id: 'c2', name: 'Email', type: 'email', required: true },
      { id: 'c3', name: 'Phone', type: 'string', required: false },
      { id: 'c4', name: 'Created Date', type: 'date', required: false },
      { id: 'c5', name: 'Is Active', type: 'boolean', required: false }
    ]
  },
  {
    id: 'schema-inventory',
    name: 'Inventory & Stock Schema',
    description: 'Ensures retail catalogs have valid numeric stock quantities, prices, and product barcodes.',
    fields: [
      { id: 'i1', name: 'SKU', type: 'string', required: true },
      { id: 'i2', name: 'Product Name', type: 'string', required: true },
      { id: 'i3', name: 'Price', type: 'currency', required: true },
      { id: 'i4', name: 'Stock Quantity', type: 'number', required: true },
      { id: 'i5', name: 'Discontinued', type: 'boolean', required: false }
    ]
  }
];

export default function SchemaManager({
  files,
  activeFile,
  onSelectFile,
  onNavigate,
  isDarkMode,
  accentClass
}: SchemaManagerProps) {
  // Load schemas from localStorage or fallback to default templates
  const [schemas, setSchemas] = useState<CSVSchema[]>(() => {
    const saved = localStorage.getItem('csv_schemas');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    return TEMPLATE_SCHEMAS;
  });

  // Save schemas to localStorage when they change
  useEffect(() => {
    localStorage.setItem('csv_schemas', JSON.stringify(schemas));
  }, [schemas]);

  const [selectedSchemaId, setSelectedSchemaId] = useState<string>(schemas[0]?.id || '');
  const [selectedFileId, setSelectedFileId] = useState<string>(activeFile?.id || files[0]?.id || '');
  
  // Create / Edit Schema States
  const [isCreatingSchema, setIsCreatingSchema] = useState(false);
  const [newSchemaName, setNewSchemaName] = useState('');
  const [newSchemaDesc, setNewSchemaDesc] = useState('');
  const [editingSchemaId, setEditingSchemaId] = useState<string | null>(null);

  // Field Edit States
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<SchemaField['type']>('string');
  const [newFieldRequired, setNewFieldRequired] = useState(false);

  // Drag and Drop States for fields reordering
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    setSchemas(prev => prev.map(schema => {
      if (schema.id !== selectedSchemaId) return schema;

      const fieldsCopy = [...schema.fields];
      const [draggedField] = fieldsCopy.splice(draggedIndex, 1);
      fieldsCopy.splice(targetIndex, 0, draggedField);

      return {
        ...schema,
        fields: fieldsCopy
      };
    }));

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (!currentSchema || targetIndex < 0 || targetIndex >= currentSchema.fields.length) return;

    setSchemas(prev => prev.map(schema => {
      if (schema.id !== selectedSchemaId) return schema;

      const fieldsCopy = [...schema.fields];
      const temp = fieldsCopy[index];
      fieldsCopy[index] = fieldsCopy[targetIndex];
      fieldsCopy[targetIndex] = temp;

      return {
        ...schema,
        fields: fieldsCopy
      };
    }));
  };

  // Selected file for verification
  const currentFile = useMemo(() => {
    return files.find(f => f.id === selectedFileId) || activeFile || null;
  }, [files, selectedFileId, activeFile]);

  // Selected schema object
  const currentSchema = useMemo(() => {
    return schemas.find(s => s.id === selectedSchemaId) || null;
  }, [schemas, selectedSchemaId]);

  // Track if activeFile selection in App needs to stay in sync
  useEffect(() => {
    if (activeFile && activeFile.id !== selectedFileId) {
      setSelectedFileId(activeFile.id);
    }
  }, [activeFile]);

  // Validation Engine Output
  const validationResults = useMemo(() => {
    if (!currentFile || !currentSchema) return { 
      errors: [], 
      errorCount: 0, 
      missingColumns: [], 
      typeErrors: [],
      score: 100, 
      totalChecked: 0 
    };

    const fileHeaders = currentFile.headers || [];
    const fileRows = currentFile.rows || [];
    const fields = currentSchema.fields;

    const errors: {
      id: string;
      row?: number; // 1-indexed (header is row 1, so row data starts at 2)
      column: string;
      type: 'missing_column' | 'missing_required_val' | 'type_mismatch';
      severity: 'critical' | 'warning';
      expected: string;
      found: string;
      description: string;
      suggestion: string;
    }[] = [];

    // 1. Check Missing Columns
    const missingColumns: string[] = [];
    fields.forEach(field => {
      const match = fileHeaders.find(h => h.toLowerCase() === field.name.toLowerCase());
      if (!match) {
        missingColumns.push(field.name);
        if (field.required) {
          errors.push({
            id: `err-col-missing-${field.id}`,
            column: field.name,
            type: 'missing_column',
            severity: 'critical',
            expected: `Column containing "${field.name}" [Type: ${field.type}]`,
            found: 'Not found',
            description: `Required schema column "${field.name}" is completely missing in the dataset headers.`,
            suggestion: `Map one of your existing headers to "${field.name}" or append a new empty column to conform with schema constraints.`
          });
        }
      }
    });

    const typeErrors: any[] = [];
    let totalCheckedCells = 0;

    // 2. Row level validation
    fileRows.forEach((row, rowIndex) => {
      const humanRow = rowIndex + 2; // Rows are 1-indexed, header is row 1

      fields.forEach(field => {
        // Find header in row case-insensitively
        const actualHeader = fileHeaders.find(h => h.toLowerCase() === field.name.toLowerCase());
        
        if (!actualHeader) return; // Already handled by column check

        totalCheckedCells++;
        const cellValue = row[actualHeader];
        const isEmpty = cellValue === undefined || cellValue === null || cellValue.trim() === '';

        if (isEmpty) {
          if (field.required) {
            const err = {
              id: `err-val-req-${rowIndex}-${field.id}`,
              row: humanRow,
              column: actualHeader,
              type: 'missing_required_val' as const,
              severity: 'critical' as const,
              expected: `Non-empty value of type ${field.type}`,
              found: 'Empty Cell',
              description: `Required field "${actualHeader}" has a blank cell at row ${humanRow}.`,
              suggestion: `Input a valid fallback value or impute it during the Hygiene Workspace clean loop.`
            };
            errors.push(err);
            typeErrors.push(err);
          }
          return;
        }

        // Clean cell value for type checks
        const cleanVal = cellValue.trim();
        let isValid = true;
        let details = '';

        switch (field.type) {
          case 'number': {
            // Remove currency symbol, commas, and trailing percentages
            const numVal = Number(cleanVal.replace(/[^0-9.-]/g, ''));
            isValid = !isNaN(numVal) && cleanVal.replace(/[^a-zA-Z]/g, '').length < 3; // ensure it doesn't contain heavy alphabetical characters
            details = 'Expected numeric format (e.g., 42, -1.5, 1,000.5)';
            break;
          }
          case 'currency': {
            const numVal = Number(cleanVal.replace(/[^0-9.-]/g, ''));
            isValid = !isNaN(numVal);
            details = 'Expected financial currency number format (e.g., $100.00, 2,500)';
            break;
          }
          case 'date': {
            // Checks for YYYY-MM-DD or standard parsable dates
            const dateParsed = Date.parse(cleanVal);
            isValid = !isNaN(dateParsed);
            // Additionally let's enforce some structural integrity for standard dash/slash separation
            if (isValid) {
              const hasDateSeps = cleanVal.includes('-') || cleanVal.includes('/') || cleanVal.includes('.');
              const hasLetters = /[a-zA-Z]/.test(cleanVal);
              // if it's long letters e.g. "Completed", Date.parse might say invalid or valid depending on browsers, we guard it
              if (cleanVal.length > 25 && hasLetters) {
                isValid = false;
              }
            }
            details = 'Expected date format (e.g., YYYY-MM-DD, MM/DD/YYYY, or ISO timestamp)';
            break;
          }
          case 'boolean': {
            const lower = cleanVal.toLowerCase();
            isValid = ['true', 'false', '1', '0', 'yes', 'no', 'y', 'n', 'active', 'inactive'].includes(lower);
            details = 'Expected boolean flag (e.g., true, false, yes, no, 1, 0)';
            break;
          }
          case 'email': {
            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            isValid = emailRegex.test(cleanVal);
            details = 'Expected standard email address structure (e.g., user@example.com)';
            break;
          }
          case 'string':
          default:
            isValid = true;
            break;
        }

        if (!isValid) {
          const err = {
            id: `err-type-${rowIndex}-${field.id}`,
            row: humanRow,
            column: actualHeader,
            type: 'type_mismatch' as const,
            severity: 'warning' as const,
            expected: field.type.toUpperCase(),
            found: cellValue,
            description: `Type mismatch in column "${actualHeader}". Found "${cellValue}" which is not a valid ${field.type}.`,
            suggestion: `${details}. Standardize format using mapping rules or bulk edits.`
          };
          errors.push(err);
          typeErrors.push(err);
        }
      });
    });

    const totalCells = totalCheckedCells || 1;
    const score = Math.max(0, Math.min(100, Math.round(100 - (errors.length / totalCells) * 100)));

    return {
      errors,
      errorCount: errors.length,
      missingColumns,
      typeErrors,
      score,
      totalChecked: totalCheckedCells
    };
  }, [currentFile, currentSchema]);

  // Compute stats per column for the validation heatmap
  const columnStats = useMemo(() => {
    if (!currentFile || !currentSchema) return [];

    const fileHeaders = currentFile.headers || [];
    const fileRows = currentFile.rows || [];
    const fields = currentSchema.fields;

    return fields.map(field => {
      const actualHeader = fileHeaders.find(h => h.toLowerCase() === field.name.toLowerCase());
      
      if (!actualHeader) {
        return {
          field,
          headerName: field.name,
          isMissing: true,
          totalRows: fileRows.length,
          validRows: 0,
          invalidRows: fileRows.length,
          passRate: 0,
          errorTypes: { missing_column: 1 }
        };
      }

      let validCount = 0;
      let invalidCount = 0;
      const errorDetails: { [key: string]: number } = {};

      fileRows.forEach((row) => {
        const cellValue = row[actualHeader];
        const isEmpty = cellValue === undefined || cellValue === null || cellValue.trim() === '';

        if (isEmpty) {
          if (field.required) {
            invalidCount++;
            errorDetails['missing_required'] = (errorDetails['missing_required'] || 0) + 1;
          } else {
            // Empty but optional is valid
            validCount++;
          }
          return;
        }

        const cleanVal = cellValue.trim();
        let isValid = true;

        switch (field.type) {
          case 'number': {
            const numVal = Number(cleanVal.replace(/[^0-9.-]/g, ''));
            isValid = !isNaN(numVal) && cleanVal.replace(/[^a-zA-Z]/g, '').length < 3;
            break;
          }
          case 'currency': {
            const numVal = Number(cleanVal.replace(/[^0-9.-]/g, ''));
            isValid = !isNaN(numVal);
            break;
          }
          case 'date': {
            const dateParsed = Date.parse(cleanVal);
            isValid = !isNaN(dateParsed);
            if (isValid) {
              const hasLetters = /[a-zA-Z]/.test(cleanVal);
              if (cleanVal.length > 25 && hasLetters) {
                isValid = false;
              }
            }
            break;
          }
          case 'boolean': {
            const lower = cleanVal.toLowerCase();
            isValid = ['true', 'false', '1', '0', 'yes', 'no', 'y', 'n', 'active', 'inactive'].includes(lower);
            break;
          }
          case 'email': {
            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            isValid = emailRegex.test(cleanVal);
            break;
          }
          case 'string':
          default:
            isValid = true;
            break;
        }

        if (isValid) {
          validCount++;
        } else {
          invalidCount++;
          errorDetails['type_mismatch'] = (errorDetails['type_mismatch'] || 0) + 1;
        }
      });

      const total = fileRows.length || 1;
      const passRate = Math.round((validCount / total) * 100);

      return {
        field,
        headerName: actualHeader,
        isMissing: false,
        totalRows: fileRows.length,
        validRows: validCount,
        invalidRows: invalidCount,
        passRate,
        errorTypes: errorDetails
      };
    });
  }, [currentFile, currentSchema]);

  // Create Schema function
  const handleCreateSchema = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchemaName.trim()) return;

    const newSchema: CSVSchema = {
      id: `schema-${Date.now()}`,
      name: newSchemaName,
      description: newSchemaDesc || 'Custom defined compliance schema layout.',
      fields: []
    };

    setSchemas(prev => [...prev, newSchema]);
    setSelectedSchemaId(newSchema.id);
    setIsCreatingSchema(false);
    setNewSchemaName('');
    setNewSchemaDesc('');
  };

  // Add Field to Schema
  const handleAddField = () => {
    if (!newFieldName.trim() || !selectedSchemaId) return;

    setSchemas(prev => prev.map(schema => {
      if (schema.id !== selectedSchemaId) return schema;

      // Check if field already exists (case-insensitive)
      if (schema.fields.some(f => f.name.toLowerCase() === newFieldName.toLowerCase())) {
        return schema;
      }

      return {
        ...schema,
        fields: [
          ...schema.fields,
          {
            id: `field-${Date.now()}`,
            name: newFieldName.trim(),
            type: newFieldType,
            required: newFieldRequired
          }
        ]
      };
    }));

    setNewFieldName('');
    setNewFieldRequired(false);
  };

  // Delete Field from Schema
  const handleDeleteField = (fieldId: string) => {
    setSchemas(prev => prev.map(schema => {
      if (schema.id !== selectedSchemaId) return schema;
      return {
        ...schema,
        fields: schema.fields.filter(f => f.id !== fieldId)
      };
    }));
  };

  // Toggle Field Required status
  const handleToggleRequired = (fieldId: string) => {
    setSchemas(prev => prev.map(schema => {
      if (schema.id !== selectedSchemaId) return schema;
      return {
        ...schema,
        fields: schema.fields.map(f => f.id === fieldId ? { ...f, required: !f.required } : f)
      };
    }));
  };

  // Delete Entire Schema
  const handleDeleteSchema = (schemaId: string) => {
    if (confirm('Are you sure you want to delete this validation schema?')) {
      const remaining = schemas.filter(s => s.id !== schemaId);
      setSchemas(remaining);
      if (remaining.length > 0) {
        setSelectedSchemaId(remaining[0].id);
      }
    }
  };

  // Check if a cell fails validation (for highlighted table)
  const getCellValidationError = (rowIndex: number, columnName: string) => {
    const humanRow = rowIndex + 2;
    return validationResults.errors.find(err => err.row === humanRow && err.column.toLowerCase() === columnName.toLowerCase());
  };

  return (
    <div className="space-y-8 animate-fadeIn" id="schema-validator-root">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-500/10">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-6.5 h-6.5 text-blue-500" />
            SaaS Compliance Schema Validator
          </h1>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Configure schemas to declare expected headers and strict cell data-types. Perform instant cross-validation checks over active files.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigate('upload')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 border ${
              isDarkMode 
                ? 'border-slate-800 text-slate-300 hover:bg-slate-900/30' 
                : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
            }`}
          >
            Upload More CSVs &rarr;
          </button>
        </div>
      </div>

      {/* Main Grid: Selector Rail on Left, Validation Matrix on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Schema Definition Panel & Selectors */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Section 1: Settings / Selectors */}
          <div className={`p-5 rounded-xl border ${
            isDarkMode ? 'bg-[#131b2e] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          } space-y-4`}>
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-blue-500" /> Configure Target Space
            </h2>

            {/* Choose File */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                1. Select CSV File to Validate
              </label>
              {files.length === 0 ? (
                <div className="p-3 text-xs text-center border border-dashed border-slate-500/20 rounded-lg bg-slate-500/5 space-y-2">
                  <p className="text-slate-400">No active files found in workspace.</p>
                  <button
                    onClick={() => onNavigate('upload')}
                    className="text-[10px] bg-blue-600 text-white px-2.5 py-1 font-bold rounded-lg hover:bg-blue-700"
                  >
                    Go to Ingest Center
                  </button>
                </div>
              ) : (
                <select
                  value={selectedFileId}
                  onChange={(e) => {
                    setSelectedFileId(e.target.value);
                    const file = files.find(f => f.id === e.target.value);
                    if (file) onSelectFile(file);
                  }}
                  className={`w-full px-3 py-2 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700 border'
                  }`}
                >
                  {files.map(file => (
                    <option key={file.id} value={file.id}>
                      📊 {file.name} ({file.rows.length} rows, {file.headers.length} cols)
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Choose Schema */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  2. Select Validation Schema
                </label>
                {!isCreatingSchema && (
                  <button 
                    onClick={() => setIsCreatingSchema(true)}
                    className="text-[10px] text-blue-500 font-bold flex items-center gap-0.5 hover:underline"
                  >
                    <Plus className="w-3 h-3" /> Create New
                  </button>
                )}
              </div>

              {isCreatingSchema ? (
                <form onSubmit={handleCreateSchema} className={`p-3.5 rounded-lg border space-y-3 ${
                  isDarkMode ? 'bg-slate-950 border-slate-850' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="space-y-1">
                    <input 
                      type="text" 
                      required
                      placeholder="Schema Name (e.g. Orders Log)" 
                      value={newSchemaName}
                      onChange={(e) => setNewSchemaName(e.target.value)}
                      className={`w-full px-2.5 py-1.5 text-xs rounded border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                      }`}
                    />
                  </div>
                  <div className="space-y-1">
                    <input 
                      type="text" 
                      placeholder="Brief description of data validation constraints..." 
                      value={newSchemaDesc}
                      onChange={(e) => setNewSchemaDesc(e.target.value)}
                      className={`w-full px-2.5 py-1.5 text-xs rounded border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                      }`}
                    />
                  </div>
                  <div className="flex justify-end gap-1.5">
                    <button 
                      type="button" 
                      onClick={() => setIsCreatingSchema(false)}
                      className="px-2.5 py-1 text-[10px] font-bold text-slate-400 hover:text-slate-200"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className={`px-3 py-1 text-[10px] font-bold text-white rounded cursor-pointer ${accentClass}`}
                    >
                      Save Schema
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex gap-2">
                  <select
                    value={selectedSchemaId}
                    onChange={(e) => setSelectedSchemaId(e.target.value)}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700 border'
                    }`}
                  >
                    {schemas.map(schema => (
                      <option key={schema.id} value={schema.id}>
                        🛡️ {schema.name} ({schema.fields.length} constraints)
                      </option>
                    ))}
                  </select>
                  {schemas.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteSchema(selectedSchemaId)}
                      className={`p-2 rounded-lg border text-rose-500 hover:bg-rose-500/10 transition-colors ${
                        isDarkMode ? 'border-slate-800' : 'border-slate-200 bg-white'
                      }`}
                      title="Delete Schema"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
              {currentSchema && (
                <p className="text-[10px] text-slate-400 italic leading-relaxed mt-1">
                  &ldquo;{currentSchema.description}&rdquo;
                </p>
              )}
            </div>
          </div>

          {/* Section 2: Schema Field Editor */}
          {currentSchema && (
            <div className={`p-5 rounded-xl border ${
              isDarkMode ? 'bg-[#131b2e] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            } space-y-4`}>
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Settings className="w-4 h-4 text-blue-500" /> Constraint Declarations
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.25 bg-blue-500/15 text-blue-500 font-bold rounded-full">
                  {currentSchema.fields.length} Columns
                </span>
              </div>

              {/* Add New Field form directly embedded */}
              <div className={`p-3 rounded-lg border space-y-2.5 ${
                isDarkMode ? 'bg-slate-950/40 border-slate-850' : 'bg-slate-50/50 border-slate-150'
              }`}>
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Add Column Restriction</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input 
                    type="text" 
                    placeholder="Exact Column Header" 
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    className={`px-2 py-1.5 text-xs rounded border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  />
                  <select
                    value={newFieldType}
                    onChange={(e) => setNewFieldType(e.target.value as any)}
                    className={`px-2 py-1.5 text-xs rounded border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  >
                    <option value="string">String (Text)</option>
                    <option value="number">Number (Integer/Decimal)</option>
                    <option value="date">Date (ISO/YMD/US)</option>
                    <option value="boolean">Boolean (Yes/No, 1/0)</option>
                    <option value="email">Email address</option>
                    <option value="currency">Currency Metric</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={newFieldRequired}
                      onChange={(e) => setNewFieldRequired(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    Required column (strict validation)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddField}
                    className={`px-3 py-1 text-[10px] font-bold text-white rounded flex items-center gap-1 cursor-pointer ${accentClass}`}
                  >
                    <Plus className="w-3.5 h-3.5" /> Append Rule
                  </button>
                </div>
              </div>

              {/* Constraint List */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {currentSchema.fields.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-slate-500/10 rounded-lg">
                    <p className="text-xs text-slate-500 font-bold">No column constraints defined.</p>
                    <p className="text-[10px] text-slate-400 max-w-xs mx-auto leading-normal mt-0.5">
                      Define at least one expected column schema constraint above to perform real-time verification checks.
                    </p>
                  </div>
                ) : (
                  currentSchema.fields.map((field, index) => {
                    const isMissing = currentFile && !currentFile.headers.find(h => h.toLowerCase() === field.name.toLowerCase());
                    const isBeingDragged = draggedIndex === index;
                    const isDragOver = dragOverIndex === index;
                    
                    return (
                      <div 
                        key={field.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        onDrop={(e) => handleDrop(e, index)}
                        className={`p-2.5 rounded-lg border flex items-center justify-between gap-2.5 transition-all cursor-move select-none ${
                          isBeingDragged 
                            ? 'opacity-40 bg-blue-500/5 border-dashed border-blue-500/30' 
                            : isDragOver
                              ? 'border-blue-500 bg-blue-500/10 scale-[1.01]'
                              : isDarkMode 
                                ? 'bg-slate-900/40 border-slate-850 hover:bg-slate-900/75 hover:border-slate-700/60' 
                                : 'bg-slate-50 border-slate-100 hover:bg-slate-100/50 hover:border-slate-300'
                        }`}
                      >
                        {/* Drag Handle & Manual Reordering Arrows */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="text-slate-500 cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-slate-500/10" title="Drag to reorder column layout">
                            <GripVertical className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex flex-col -space-y-0.5">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveField(index, 'up');
                              }}
                              className="p-0.5 rounded text-slate-500 hover:text-blue-500 disabled:opacity-20 transition-colors"
                              title="Move Up"
                            >
                              <ArrowUp className="w-2.5 h-2.5" />
                            </button>
                            <button
                              type="button"
                              disabled={index === currentSchema.fields.length - 1}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveField(index, 'down');
                              }}
                              className="p-0.5 rounded text-slate-500 hover:text-blue-500 disabled:opacity-20 transition-colors"
                              title="Move Down"
                            >
                              <ArrowDown className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs truncate max-w-[120px]" title={field.name}>{field.name}</span>
                            <span className="text-[9px] px-1.5 py-0.2 bg-indigo-500/10 text-indigo-400 font-mono font-bold rounded">
                              {field.type}
                            </span>
                            {field.required ? (
                              <span className="text-[8px] font-black px-1.5 py-0.2 bg-rose-500/15 text-rose-500 border border-rose-500/10 rounded uppercase">
                                Required
                              </span>
                            ) : (
                              <span className="text-[8px] font-semibold px-1.5 py-0.2 bg-slate-500/10 text-slate-400 rounded uppercase">
                                Optional
                              </span>
                            )}
                          </div>
                          {isMissing && (
                            <span className="text-[9px] text-rose-500 font-bold block mt-0.5 animate-pulse">
                              &times; Header is missing from this CSV
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleRequired(field.id);
                            }}
                            className={`p-1 text-[9px] font-bold rounded border ${
                              field.required 
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                                : 'bg-slate-500/10 text-slate-400 border-transparent hover:border-slate-700'
                            }`}
                            title="Toggle Required Flag"
                          >
                            Req
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteField(field.id);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Remove Constraint"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Validation Score, Metric Matrix, Error Log, Spreadsheet Visualizer */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Section 1: Dynamic Verification Scoreboards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Real-time Validation Error Count Card */}
            <div className={`p-4 rounded-xl border relative overflow-hidden flex flex-col justify-between ${
              validationResults.errorCount > 0
                ? isDarkMode ? 'bg-rose-950/20 border-rose-500/40' : 'bg-rose-50/70 border-rose-200'
                : isDarkMode ? 'bg-emerald-950/20 border-emerald-500/40' : 'bg-emerald-50/70 border-emerald-200'
            }`}>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Validation Error Count
                </span>
                <span className={`text-4xl font-black tracking-tight block ${
                  validationResults.errorCount > 0 ? 'text-rose-500' : 'text-emerald-500'
                }`}>
                  {validationResults.errorCount}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium mt-3 flex items-center gap-1">
                {validationResults.errorCount > 0 ? (
                  <>
                    <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>Real-time violations detected</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Schema fully satisfied</span>
                  </>
                )}
              </div>
              <div className={`absolute bottom-0 left-0 right-0 h-1.5 ${
                validationResults.errorCount > 0 ? 'bg-rose-500' : 'bg-emerald-500'
              }`} />
            </div>

            {/* Schema Conformity Score */}
            <div className={`p-4 rounded-xl border relative overflow-hidden flex flex-col justify-between ${
              isDarkMode ? 'bg-[#131b2e] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Schema Conformity Score
                </span>
                <span className={`text-4xl font-black tracking-tight block ${
                  validationResults.score > 90 
                    ? 'text-emerald-500' 
                    : validationResults.score > 60 ? 'text-amber-500' : 'text-rose-500'
                }`}>
                  {validationResults.score}%
                </span>
              </div>
              <div className="w-full bg-slate-700/20 h-1 rounded-full overflow-hidden mt-3">
                <div 
                  className={`h-full rounded-full ${
                    validationResults.score > 90 
                      ? 'bg-emerald-500' 
                      : validationResults.score > 60 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${validationResults.score}%` }}
                />
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500/30" />
            </div>

            {/* Validation Density */}
            <div className={`p-4 rounded-xl border relative overflow-hidden flex flex-col justify-between ${
              isDarkMode ? 'bg-[#131b2e] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Validated Matrix Space
                </span>
                <span className={`text-3xl font-black tracking-tight block ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                  {validationResults.totalChecked.toLocaleString()}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium mt-3">
                Data points verified instantly
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-violet-500/30" />
            </div>
          </div>

          {/* Validation Heatmap Section */}
          {currentFile && currentSchema && (
            <div className={`p-5 rounded-xl border ${
              isDarkMode ? 'bg-[#131b2e] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            } space-y-4`}>
              <div className="flex justify-between items-center pb-2 border-b border-slate-500/10">
                <h3 className="font-extrabold text-sm flex items-center gap-2">
                  <Activity className="w-4.5 h-4.5 text-blue-500" /> Column Validation Heatmap
                </h3>
                <span className="text-[10px] text-slate-400 font-bold">
                  Compliance density
                </span>
              </div>

              <div className="space-y-4">
                {columnStats.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-slate-500/10 rounded-lg">
                    <p className="text-xs text-slate-500 font-bold">No column constraints defined.</p>
                    <p className="text-[10px] text-slate-400 max-w-xs mx-auto leading-normal mt-0.5">
                      Define expected columns in the schema editor to track visual integrity density here.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {columnStats.map((stat, idx) => {
                      let barColor = 'bg-rose-500';
                      let textColor = 'text-rose-500';
                      let bgColor = 'bg-rose-500/10';
                      let textRating = 'Failing Integrity';

                      if (stat.isMissing) {
                        barColor = 'bg-rose-600';
                        textColor = 'text-rose-600';
                        bgColor = 'bg-rose-600/10';
                        textRating = 'Missing Header';
                      } else if (stat.passRate === 100) {
                        barColor = 'bg-emerald-500';
                        textColor = 'text-emerald-500';
                        bgColor = 'bg-emerald-500/10';
                        textRating = '100% Valid';
                      } else if (stat.passRate >= 80) {
                        barColor = 'bg-emerald-400';
                        textColor = 'text-emerald-400';
                        bgColor = 'bg-emerald-400/10';
                        textRating = 'High Match';
                      } else if (stat.passRate >= 50) {
                        barColor = 'bg-amber-500';
                        textColor = 'text-amber-500';
                        bgColor = 'bg-amber-500/10';
                        textRating = 'Moderate Errors';
                      } else {
                        barColor = 'bg-rose-500';
                        textColor = 'text-rose-500';
                        bgColor = 'bg-rose-500/10';
                        textRating = 'Failing Integrity';
                      }

                      return (
                        <div 
                          key={idx}
                          className={`p-3 rounded-lg border transition-all hover:scale-[1.01] ${
                            isDarkMode ? 'bg-slate-900/40 border-slate-850 hover:bg-slate-900/70' : 'bg-slate-50 border-slate-100 hover:bg-slate-100/50'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-1.5 mb-1.5">
                            <div className="min-w-0">
                              <span className="font-extrabold text-[11px] block truncate" title={stat.field.name}>
                                {stat.field.name}
                              </span>
                              <span className="text-[9px] text-slate-400 font-mono">
                                {stat.field.type.toUpperCase()} • {stat.field.required ? 'Required' : 'Optional'}
                              </span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className={`text-[11px] font-black block ${textColor}`}>
                                {stat.isMissing ? '0%' : `${stat.passRate}%`}
                              </span>
                              <span className="text-[8px] uppercase tracking-wider text-slate-500 font-bold block">
                                {textRating}
                              </span>
                            </div>
                          </div>

                          {/* Color-coded Bar */}
                          <div className="relative w-full h-2 bg-slate-700/10 rounded-full overflow-hidden mb-1.5">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                              style={{ width: `${stat.isMissing ? 0 : stat.passRate}%` }}
                            />
                          </div>

                          <div className="flex justify-between items-center text-[9px] text-slate-400 font-medium">
                            <span>
                              {stat.isMissing ? (
                                <span className="text-rose-500 font-bold">Header not matched</span>
                              ) : (
                                <>
                                  <span className="text-emerald-500 font-bold">{stat.validRows}</span> / {stat.totalRows} passed
                                </>
                              )}
                            </span>
                            {stat.invalidRows > 0 && !stat.isMissing && (
                              <span className="text-rose-400">
                                {stat.invalidRows} failure{stat.invalidRows > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section 2: Real-Time ValidationError Log */}
          <div className={`p-5 rounded-xl border ${
            isDarkMode ? 'bg-[#131b2e] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          } space-y-4`}>
            <div className="flex justify-between items-center pb-2 border-b border-slate-500/10">
              <h3 className="font-extrabold text-sm flex items-center gap-2">
                <Database className="w-4.5 h-4.5 text-blue-500" /> Compliance Deviation Log
              </h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                validationResults.errorCount > 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
              }`}>
                {validationResults.errorCount} Issues
              </span>
            </div>

            {validationResults.errorCount === 0 ? (
              <div className="text-center py-12 space-y-3">
                <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-6.5 h-6.5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Perfect Compliance Rating!</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-normal mt-0.5">
                    This file satisfies all specified column headers and data type limits declared in the compliance schema.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[250px] overflow-y-auto pr-1">
                {validationResults.errors.map((err) => (
                  <div 
                    key={err.id}
                    className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 transition-colors ${
                      err.severity === 'critical'
                        ? isDarkMode ? 'bg-rose-950/15 border-rose-950/65 hover:bg-rose-950/25' : 'bg-rose-50/50 border-rose-150'
                        : isDarkMode ? 'bg-amber-950/10 border-amber-950/50 hover:bg-amber-950/20' : 'bg-amber-50/30 border-amber-150'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg mt-0.5 shrink-0 ${
                      err.severity === 'critical' 
                        ? 'bg-rose-500/10 text-rose-500' 
                        : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex justify-between items-center gap-2 flex-wrap">
                        <span className="font-black text-xs">
                          {err.row ? `Row ${err.row} ` : ''}Column &ldquo;{err.column}&rdquo;
                        </span>
                        <span className={`px-2 py-0.25 text-[9px] rounded font-bold uppercase ${
                          err.severity === 'critical' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'
                        }`}>
                          {err.severity}
                        </span>
                      </div>
                      <p className={`text-slate-400 leading-normal text-[11px]`}>{err.description}</p>
                      
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 pt-1">
                        <span className="font-bold">Expected:</span> <code className="bg-slate-950/30 px-1 rounded">{err.expected}</code>
                        <span className="font-bold">Found:</span> <code className="bg-rose-500/10 text-rose-400 px-1 rounded max-w-[120px] truncate">{err.found || 'Blank'}</code>
                      </div>

                      <div className="text-[11px] text-blue-500 font-semibold pt-1 border-t border-slate-500/5 mt-1.5">
                        💡 Suggestion: {err.suggestion}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: High-contrast Cell-Highlight Spreadsheet Preview */}
          {currentFile && (
            <div className={`p-5 rounded-xl border ${
              isDarkMode ? 'bg-[#131b2e] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            } space-y-4`}>
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Grid className="w-4.5 h-4.5 text-blue-500" /> Interactive Spreadsheet Validator Matrix
                </h3>
                <span className="text-[10px] text-slate-400 font-bold">
                  Showing first 8 parsed records
                </span>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-500/10">
                <table className="w-full text-left text-[11px] min-w-[500px]">
                  <thead>
                    <tr className={`border-b ${isDarkMode ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-slate-50'} text-slate-400 font-bold`}>
                      <th className="py-2.5 pl-3 w-16 text-center">ROW</th>
                      {currentFile.headers.map((h, i) => {
                        const isFieldInSchema = currentSchema?.fields.some(f => f.name.toLowerCase() === h.toLowerCase());
                        const schemaField = currentSchema?.fields.find(f => f.name.toLowerCase() === h.toLowerCase());
                        
                        return (
                          <th key={i} className="py-2.5 px-3 min-w-[100px]">
                            <div className="flex flex-col">
                              <span className="truncate max-w-[150px]">{h}</span>
                              {schemaField && (
                                <span className="text-[8px] font-mono font-black text-blue-500 leading-none mt-0.5 uppercase">
                                  {schemaField.type} {schemaField.required && '*'}
                                </span>
                              )}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/10">
                    {currentFile.rows.slice(0, 8).map((row, rowIndex) => {
                      const humanRow = rowIndex + 2;

                      return (
                        <tr 
                          key={rowIndex} 
                          className={`hover:bg-slate-500/5 transition-colors`}
                        >
                          <td className="py-2 px-1 font-mono font-bold text-center text-slate-500 border-r border-slate-500/10">
                            {humanRow}
                          </td>
                          {currentFile.headers.map((h, cellIndex) => {
                            const cellValue = row[h];
                            const err = getCellValidationError(rowIndex, h);
                            
                            return (
                              <td 
                                key={cellIndex} 
                                className={`py-2 px-3 max-w-[180px] truncate relative group/cell transition-colors ${
                                  err 
                                    ? err.severity === 'critical'
                                      ? 'bg-rose-500/15 text-rose-500 font-bold'
                                      : 'bg-amber-500/15 text-amber-600 font-bold'
                                    : ''
                                }`}
                              >
                                {cellValue || <span className="text-slate-500 italic">Empty</span>}
                                
                                {/* Absolute Cell Tooltip for Validation Failures */}
                                {err && (
                                  <div className="absolute hidden group-hover/cell:block bottom-full left-1/2 -translate-x-1/2 mb-1 p-2 bg-slate-950 text-white text-[10px] font-medium rounded shadow-xl border border-slate-800 min-w-[180px] max-w-[240px] z-50 whitespace-normal leading-relaxed">
                                    <div className="font-extrabold flex items-center gap-1 text-rose-400 mb-0.5">
                                      <AlertTriangle className="w-3 h-3" /> Type Mismatch
                                    </div>
                                    <p className="text-slate-300">{err.description}</p>
                                    <p className="text-[9px] text-blue-400 font-bold mt-1">Expected: {err.expected}</p>
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center text-[11px] pt-1 text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-rose-500/20 inline-block border border-rose-500/20" /> Critical violations (Required / Blank)
                  <span className="w-2.5 h-2.5 rounded bg-amber-500/20 inline-block border border-amber-500/20 ml-3" /> Warnings (Type mismatches)
                </span>
                <button
                  onClick={() => onNavigate('clean')}
                  className="text-blue-500 font-bold hover:underline"
                >
                  Go to Hygiene Workspace to Fix &rarr;
                </button>
              </div>

            </div>
          )}

        </div>
        
      </div>
      
    </div>
  );
}
