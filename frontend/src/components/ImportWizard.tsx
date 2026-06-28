/**
 * #8 — Import/Export Wizard (Odoo-style CSV import with column mapping)
 *
 * Usage:
 *   <ImportWizard
 *     entityType="products"
 *     expectedColumns={['name', 'sku', 'costPrice', 'salePrice', 'categoryId']}
 *     onImport={(rows) => api.post('/products/bulk-import', { products: rows })}
 *     onClose={() => setShowImport(false)}
 *   />
 */
import { useState, useRef } from 'react';
import toast from 'react-hot-toast';

interface Props {
  entityType: string;
  expectedColumns: string[];
  onImport: (rows: Record<string, any>[]) => Promise<any>;
  onClose: () => void;
}

export default function ImportWizard({ entityType, expectedColumns, onImport, onClose }: Props) {
  const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'done'>('upload');
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<number, string>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) { toast.error('File must have at least a header + 1 data row'); return; }
      const parseRow = (line: string): string[] => {
        // Simple CSV parse (handles quoted fields)
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        for (const char of line) {
          if (char === '"') { inQuotes = !inQuotes; }
          else if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
          else { current += char; }
        }
        result.push(current.trim());
        return result;
      };
      const hdrs = parseRow(lines[0]);
      const rows = lines.slice(1).map(parseRow);
      setHeaders(hdrs);
      setRawRows(rows);
      // Auto-map by header name matching
      const autoMap: Record<number, string> = {};
      hdrs.forEach((h, i) => {
        const lower = h.toLowerCase().replace(/[^a-z0-9]/g, '');
        const match = expectedColumns.find(c => c.toLowerCase().replace(/[^a-z0-9]/g, '') === lower);
        if (match) autoMap[i] = match;
      });
      setMapping(autoMap);
      setStep('map');
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const rows = rawRows.map(row => {
        const obj: Record<string, any> = {};
        Object.entries(mapping).forEach(([colIdx, field]) => {
          const val = row[parseInt(colIdx)];
          if (val !== undefined && val !== '') {
            // Try to parse numbers
            if (['costPrice', 'salePrice', 'quantity', 'minStockLevel', 'reorderPoint'].includes(field)) {
              obj[field] = parseFloat(val) || 0;
            } else if (['categoryId', 'supplierId', 'branchId'].includes(field)) {
              obj[field] = parseInt(val) || undefined;
            } else {
              obj[field] = val;
            }
          }
        });
        return obj;
      }).filter(obj => Object.keys(obj).length > 0);

      const res = await onImport(rows);
      const count = res?.data?.data?.length || res?.data?.count || rows.length;
      setResult({ success: count, errors: 0 });
      setStep('done');
      toast.success(`Imported ${count} ${entityType}`);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Import failed');
      setResult({ success: 0, errors: rawRows.length });
      setStep('done');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 dark:text-gray-100">
            📥 Import {entityType.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {step === 'upload' && (
            <div className="text-center py-10">
              <div className="text-4xl mb-4">📄</div>
              <p className="text-sm text-gray-500 mb-4">Upload a CSV file with your {entityType} data</p>
              <p className="text-xs text-gray-400 mb-6">Expected columns: {expectedColumns.join(', ')}</p>
              <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} className="hidden" />
              <button
                onClick={() => fileRef.current?.click()}
                className="px-6 py-3 rounded-xl bg-primary text-white font-medium"
              >
                Choose CSV File
              </button>
            </div>
          )}

          {step === 'map' && (
            <div>
              <p className="text-sm text-gray-500 mb-4">Map CSV columns to {entityType} fields:</p>
              <div className="space-y-2 mb-6">
                {headers.map((h, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-40 text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{h}</span>
                    <span className="text-gray-400">→</span>
                    <select
                      value={mapping[i] || ''}
                      onChange={(e) => setMapping(m => ({ ...m, [i]: e.target.value }))}
                      className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm"
                    >
                      <option value="">— Skip —</option>
                      {expectedColumns.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mb-2">Preview ({Math.min(5, rawRows.length)} of {rawRows.length} rows):</p>
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="text-xs w-full">
                  <thead><tr className="bg-gray-50 dark:bg-gray-800">
                    {Object.values(mapping).filter(Boolean).map((f, i) => <th key={i} className="px-2 py-1 text-left">{f}</th>)}
                  </tr></thead>
                  <tbody>
                    {rawRows.slice(0, 5).map((row, ri) => (
                      <tr key={ri} className="border-t border-gray-100 dark:border-gray-800">
                        {Object.entries(mapping).filter(([_, v]) => v).map(([colIdx], ci) => (
                          <td key={ci} className="px-2 py-1">{row[parseInt(colIdx)] || ''}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 'done' && result && (
            <div className="text-center py-10">
              <div className="text-4xl mb-4">{result.errors === 0 ? '✅' : '⚠️'}</div>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                {result.errors === 0 ? 'Import Complete!' : 'Import Finished with Errors'}
              </p>
              <p className="text-sm text-gray-500">
                {result.success} {entityType} imported successfully
                {result.errors > 0 && ` · ${result.errors} failed`}
              </p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm">
            {step === 'done' ? 'Close' : 'Cancel'}
          </button>
          {step === 'map' && (
            <button
              onClick={handleImport}
              disabled={importing || Object.values(mapping).filter(Boolean).length === 0}
              className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-50"
            >
              {importing ? 'Importing...' : `Import ${rawRows.length} Rows`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
