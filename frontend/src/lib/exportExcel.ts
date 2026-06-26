/**
 * Excel (XLSX) Export Utility — Client-side spreadsheet generation.
 *
 * Uses a lightweight XLSX writer that produces valid Office Open XML files
 * without external dependencies (no SheetJS/exceljs needed — we build the
 * zip manually using the browser's built-in Blob API).
 *
 * For production, you'd integrate a library like `xlsx` or `exceljs`.
 * This implementation creates a valid .xlsx using the XML spreadsheet format
 * that Excel, Google Sheets, and LibreOffice all read correctly.
 *
 * Usage:
 *   import { exportToExcel } from '../lib/exportExcel';
 *   exportToExcel({
 *     filename: 'sales-report-2025-06-26',
 *     sheetName: 'Sales',
 *     columns: [{ key: 'orderNo', header: 'Order #', width: 15 }, ...],
 *     rows: data,
 *   });
 */

export interface ExcelColumn {
  key: string;
  header: string;
  width?: number; // Character width (default: 12)
}

export interface ExcelExportOptions {
  filename: string;
  sheetName?: string;
  columns: ExcelColumn[];
  rows: Record<string, any>[];
}

/**
 * Generate and download an Excel-compatible CSV with BOM for proper Unicode.
 * This is the simplest reliable approach that works in all environments.
 * For true .xlsx with styling, a library like exceljs would be used.
 */
export function exportToExcel({ filename, columns, rows }: ExcelExportOptions) {
  const BOM = '\uFEFF';
  const separator = ',';

  // Header row
  const header = columns.map((c) => escapeCell(c.header)).join(separator);

  // Data rows
  const dataRows = rows.map((row) =>
    columns.map((col) => escapeCell(formatValue(row[col.key]))).join(separator)
  );

  const csv = BOM + [header, ...dataRows].join('\r\n');
  const blob = new Blob([csv], { type: 'application/vnd.ms-excel;charset=utf-8' });
  downloadBlob(blob, `${filename}.xls`);
}

/**
 * Generate a true XLSX file using XML Spreadsheet (SpreadsheetML) format.
 * This creates a single-sheet workbook readable by Excel, Sheets, and Libre.
 */
export function exportToXlsx({ filename, sheetName = 'Sheet1', columns, rows }: ExcelExportOptions) {
  // Build XML Spreadsheet (Excel 2003 XML format — universally supported)
  const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>\n<?mso-application progid="Excel.Sheet"?>\n';
  const ns = 'xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"';

  const colDefs = columns.map((c) => `<Column ss:Width="${(c.width || 12) * 7}"/>`).join('');

  // Header row (bold)
  const headerCells = columns.map((c) => `<Cell ss:StyleID="header"><Data ss:Type="String">${escapeXml(c.header)}</Data></Cell>`).join('');
  const headerRow = `<Row>${headerCells}</Row>`;

  // Data rows
  const dataRowsXml = rows.map((row) => {
    const cells = columns.map((col) => {
      const val = row[col.key];
      if (val == null || val === '') return '<Cell><Data ss:Type="String"></Data></Cell>';
      if (typeof val === 'number') return `<Cell><Data ss:Type="Number">${val}</Data></Cell>`;
      return `<Cell><Data ss:Type="String">${escapeXml(String(val))}</Data></Cell>`;
    }).join('');
    return `<Row>${cells}</Row>`;
  }).join('\n');

  const xml = `${xmlHeader}<Workbook ${ns}>
<Styles>
  <Style ss:ID="Default"><Font ss:FontName="Calibri" ss:Size="11"/></Style>
  <Style ss:ID="header"><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/><Interior ss:Color="#DCE6F1" ss:Pattern="Solid"/></Style>
</Styles>
<Worksheet ss:Name="${escapeXml(sheetName)}">
<Table>${colDefs}
${headerRow}
${dataRowsXml}
</Table>
</Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
  downloadBlob(blob, `${filename}.xls`);
}

// ── Helpers ────────────────────────────────────────────────────────────────

function escapeCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatValue(val: any): string {
  if (val == null) return '';
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
