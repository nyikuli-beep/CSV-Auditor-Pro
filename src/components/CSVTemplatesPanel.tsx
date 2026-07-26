import React, { useState } from 'react';
import { Download, FileSpreadsheet, Check, Sparkles, FileCode, Layers, Info } from 'lucide-react';

export interface CSVTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  filename: string;
  headers: string[];
  sampleRow: string[];
}

export const STANDARD_CSV_TEMPLATES: CSVTemplate[] = [
  {
    id: 'transactions',
    name: 'Transactions & Sales Ledger',
    category: 'Finance',
    description: 'Standard schema for tracking revenue, orders, and sales transactions across channels.',
    filename: 'Standard_Transactions_Template.csv',
    headers: ['Transaction_ID', 'Date', 'Customer_Name', 'Amount', 'Category', 'Currency', 'Country', 'Status'],
    sampleRow: ['TXN-1001', '2026-07-01', 'Acme Corporation', '1250.00', 'Software', 'USD', 'United States', 'Completed']
  },
  {
    id: 'customers',
    name: 'Customer List & CRM Directory',
    category: 'Sales & Marketing',
    description: 'Consistent schema for user accounts, contact emails, companies, and registration dates.',
    filename: 'Standard_Customer_List_Template.csv',
    headers: ['Customer_ID', 'Full_Name', 'Email', 'Phone', 'Company', 'City', 'Country', 'Registration_Date'],
    sampleRow: ['CUST-5001', 'Jane Smith', 'jane.smith@example.com', '+1-555-0192', 'Global Tech Solutions', 'New York', 'United States', '2026-01-15']
  },
  {
    id: 'inventory',
    name: 'Inventory & Product Catalog',
    category: 'Operations',
    description: 'Standard layout for SKUs, pricing, stock levels, categories, and supplier details.',
    filename: 'Standard_Inventory_Catalog_Template.csv',
    headers: ['SKU', 'Product_Name', 'Category', 'Unit_Price', 'Stock_Quantity', 'Supplier_Name', 'Reorder_Level'],
    sampleRow: ['SKU-8821', 'Enterprise Cloud Server Node', 'Hardware', '2499.99', '45', 'TechSupplies Co', '10']
  },
  {
    id: 'employees',
    name: 'Employee Roster & HR Directory',
    category: 'Human Resources',
    description: 'Structured layout for employee IDs, departments, emails, job titles, and hire dates.',
    filename: 'Standard_Employee_Roster_Template.csv',
    headers: ['Employee_ID', 'First_Name', 'Last_Name', 'Email', 'Department', 'Job_Title', 'Salary', 'Hire_Date', 'Status'],
    sampleRow: ['EMP-042', 'Bramwel', 'Nyikuli', 'nyikuli@company.com', 'Engineering', 'Lead Architect', '125000', '2024-03-01', 'Active']
  },
  {
    id: 'invoices',
    name: 'Vendor Invoices & AP Ledger',
    category: 'Finance',
    description: 'Standard accounts payable template for vendor invoices, dates, subtotals, and status.',
    filename: 'Standard_Vendor_Invoices_Template.csv',
    headers: ['Invoice_Number', 'Vendor_Name', 'Invoice_Date', 'Due_Date', 'Subtotal', 'Tax_Amount', 'Total_Amount', 'Payment_Status'],
    sampleRow: ['INV-2026-001', 'Cloud Infrastructure Inc', '2026-06-30', '2026-07-30', '4500.00', '450.00', '4950.00', 'Unpaid']
  }
];

interface CSVTemplatesPanelProps {
  isDarkMode: boolean;
  accentClass: string;
}

export default function CSVTemplatesPanel({ isDarkMode, accentClass }: CSVTemplatesPanelProps) {
  const [includeSampleRow, setIncludeSampleRow] = useState<boolean>(true);
  const [downloadedTemplateId, setDownloadedTemplateId] = useState<string | null>(null);

  const downloadTemplate = (template: CSVTemplate) => {
    let csvContent = template.headers.join(',');
    if (includeSampleRow) {
      csvContent += '\n' + template.sampleRow.map(cell => cell.includes(',') ? `"${cell}"` : cell).join(',');
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", template.filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadedTemplateId(template.id);
    setTimeout(() => {
      setDownloadedTemplateId(null);
    }, 2500);
  };

  return (
    <div className={`p-6 rounded-2xl border space-y-5 ${
      isDarkMode ? 'bg-[#131b2e] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
    }`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 border-slate-800/40">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <FileSpreadsheet className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm sm:text-base flex items-center gap-2">
              <span>Standard CSV Templates</span>
              <span className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Schema Control
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Download pre-formatted empty CSV headers to enforce uniform data structures across teams.
            </p>
          </div>
        </div>

        {/* Options toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <label className="text-[11px] font-medium text-slate-400 flex items-center gap-2 cursor-pointer select-none">
            <input 
              type="checkbox"
              checked={includeSampleRow}
              onChange={(e) => setIncludeSampleRow(e.target.checked)}
              className="rounded text-blue-600 bg-slate-950 border-slate-800 cursor-pointer w-3.5 h-3.5 focus:ring-0 focus:ring-offset-0"
            />
            <span>Include 1 sample row for guidance</span>
          </label>
        </div>
      </div>

      {/* Grid of Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {STANDARD_CSV_TEMPLATES.map((tmpl) => {
          const isDownloaded = downloadedTemplateId === tmpl.id;
          return (
            <div 
              key={tmpl.id}
              className={`p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all duration-200 ${
                isDarkMode 
                  ? 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/80' 
                  : 'bg-slate-50/70 border-slate-200/80 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[9px] font-bold font-mono uppercase rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {tmpl.category}
                    </span>
                    <h4 className={`font-bold text-xs ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                      {tmpl.name}
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 shrink-0">
                    {tmpl.headers.length} cols
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {tmpl.description}
                </p>

                {/* Headers preview chips */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {tmpl.headers.slice(0, 5).map((h, idx) => (
                    <span 
                      key={idx}
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                        isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      {h}
                    </span>
                  ))}
                  {tmpl.headers.length > 5 && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 text-slate-500">
                      +{tmpl.headers.length - 5} more
                    </span>
                  )}
                </div>
              </div>

              {/* Download button */}
              <button
                type="button"
                onClick={() => downloadTemplate(tmpl)}
                className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                  isDownloaded
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : isDarkMode
                    ? 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800 hover:border-blue-500/40 hover:text-blue-400'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-600 shadow-sm'
                }`}
              >
                {isDownloaded ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Template Downloaded!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5 text-blue-500" />
                    <span>Download {tmpl.name.split(' ')[0]} CSV Template</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
