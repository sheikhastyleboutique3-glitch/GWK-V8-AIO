/**
 * Shared PDF styles and utilities for @react-pdf/renderer documents.
 * Provides a consistent look across all GWK reports.
 */
import { StyleSheet } from '@react-pdf/renderer';

export const colors = {
  primary: '#1a56db',
  dark: '#1f2937',
  gray: '#6b7280',
  muted: '#6b7280',
  lightGray: '#e5e7eb',
  success: '#059669',
  danger: '#dc2626',
  warning: '#d97706',
  white: '#ffffff',
  bg: '#f9fafb',
};

export const baseStyles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    padding: 30,
    color: colors.dark,
    backgroundColor: colors.white,
  },
  header: {
    marginBottom: 20,
    borderBottom: `2px solid ${colors.primary}`,
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    color: colors.gray,
    marginBottom: 2,
  },
  businessName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.dark,
    marginBottom: 2,
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.dark,
    marginBottom: 6,
    paddingBottom: 4,
    borderBottom: `1px solid ${colors.lightGray}`,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  rowBordered: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottom: `0.5px solid ${colors.lightGray}`,
  },
  label: {
    fontSize: 9,
    color: colors.gray,
  },
  value: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.dark,
  },
  valueLg: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.dark,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    marginTop: 4,
    borderTop: `1.5px solid ${colors.dark}`,
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.dark,
  },
  totalValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.primary,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    borderTop: `1px solid ${colors.lightGray}`,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 7,
    color: colors.gray,
  },
  table: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderBottom: `1px solid ${colors.lightGray}`,
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: `0.5px solid ${colors.lightGray}`,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  tableCell: {
    fontSize: 8,
  },
  tableCellHeader: {
    fontSize: 8,
    fontWeight: 'bold',
    color: colors.gray,
    textTransform: 'uppercase',
  },
  badge: {
    fontSize: 7,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
    backgroundColor: colors.bg,
    color: colors.gray,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  statCard: {
    width: '23%',
    backgroundColor: colors.bg,
    borderRadius: 4,
    padding: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 7,
    color: colors.gray,
    textTransform: 'uppercase',
  },
});

/** Currency symbols for common currencies. Falls back to code if unknown. */
const CURRENCY_SYMBOLS: Record<string, string> = {
  QAR: 'QR',
  USD: '$',
  EUR: '€',
  GBP: '£',
  SAR: 'SR',
  AED: 'AED',
  KWD: 'KD',
  BHD: 'BD',
  OMR: 'OMR',
};

/**
 * Format a monetary value with optional currency symbol.
 * Examples: money(10.5, 'QAR') → "QR 10.50", money(10.5) → "10.50"
 */
export const money = (v: unknown, currency?: string): string => {
  const formatted = Number(v ?? 0).toFixed(2);
  if (!currency) return formatted;
  const symbol = CURRENCY_SYMBOLS[currency.toUpperCase()] || currency;
  return `${symbol} ${formatted}`;
};
export const pct = (v: unknown): string => Number(v ?? 0).toFixed(1) + '%';
export const formatDate = (d: string | Date | null | undefined): string => {
  if (!d) return '—';
  return new Date(d).toLocaleString();
};
export const formatDateShort = (d: string | Date | null | undefined): string => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString();
};
