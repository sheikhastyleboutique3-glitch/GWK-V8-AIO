/**
 * PDF export utilities for GWK V8 AIO.
 * Uses @react-pdf/renderer to generate professional PDFs client-side.
 */
import { pdf } from '@react-pdf/renderer';
import { createElement } from 'react';
import SessionReportPdf, { SessionReportProps } from './SessionReportPdf';
import DailySalesPdf, { DailySalesProps } from './DailySalesPdf';
import ReceiptPdf, { ReceiptPdfProps } from './ReceiptPdf';

export { SessionReportPdf } from './SessionReportPdf';
export { DailySalesPdf } from './DailySalesPdf';
export { ReceiptPdf } from './ReceiptPdf';
export type { SessionReportData, SessionReportProps } from './SessionReportPdf';
export type { DailySalesOrder, DailySalesProps } from './DailySalesPdf';
export type { ReceiptOrder, ReceiptPdfProps } from './ReceiptPdf';

/**
 * Generate a PDF blob from a React element and trigger browser download.
 */
async function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * Download a Z-Report / X-Report PDF.
 */
export async function downloadSessionReportPdf(props: SessionReportProps) {
  const doc = createElement(SessionReportPdf, props);
  const blob = await pdf(doc).toBlob();
  const sess = props.data.session;
  const type = sess?.status === 'CLOSED' ? 'Z-Report' : 'X-Report';
  const filename = `${type}_${sess?.sessionNo ?? 'session'}.pdf`;
  await downloadBlob(blob, filename);
}

/**
 * Download a Daily Sales Report PDF.
 */
export async function downloadDailySalesPdf(props: DailySalesProps) {
  const doc = createElement(DailySalesPdf, props);
  const blob = await pdf(doc).toBlob();
  const filename = `Daily-Sales_${props.date.replace(/\s/g, '_')}.pdf`;
  await downloadBlob(blob, filename);
}

/**
 * Download an Order Receipt PDF.
 */
export async function downloadReceiptPdf(props: ReceiptPdfProps) {
  const doc = createElement(ReceiptPdf, props);
  const blob = await pdf(doc).toBlob();
  const filename = `Receipt_${props.order.orderNo}.pdf`;
  await downloadBlob(blob, filename);
}
