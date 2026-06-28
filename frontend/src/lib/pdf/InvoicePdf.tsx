/**
 * Qatar VAT Simplified Tax Invoice PDF.
 *
 * Compliant with Qatar General Tax Authority requirements for simplified
 * invoices (transactions under 10,000 QAR). Includes:
 * - Seller name, address, TRN
 * - Invoice date and sequential number
 * - Line items with quantities, unit prices, and amounts
 * - Total inclusive of VAT
 * - VAT amount separately stated
 */
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { baseStyles as s, colors, money, formatDate } from './styles';

export interface InvoiceOrder {
  id: number;
  orderNo: string;
  channel?: string;
  tableName?: string | null;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  serviceCharge: number;
  total: number;
  createdAt?: string;
  completedAt?: string | null;
  items: Array<{
    quantity: number;
    unitPrice: number;
    discount: number;
    product?: { name?: string; nameAr?: string; sku?: string };
    modifiers?: Array<{ name?: string }> | null;
  }>;
  payments: Array<{ method: string; amount: number }>;
  customer?: { name?: string; phone?: string } | null;
  branch?: { name?: string; nameAr?: string } | null;
}

export interface InvoicePdfProps {
  order: InvoiceOrder;
  businessName?: string;
  businessNameAr?: string;
  branchName?: string;
  address?: string;
  phone?: string;
  taxId?: string; // TRN (Tax Registration Number)
  email?: string;
  invoiceNo?: string; // Sequential invoice number (e.g. INV-2026-00123)
  currency?: string;
}

export default function InvoicePdf({
  order,
  businessName,
  businessNameAr,
  branchName,
  address,
  phone,
  taxId,
  email,
  invoiceNo,
  currency = 'QAR',
}: InvoicePdfProps) {
  const issueDate = order.completedAt || order.createdAt || new Date().toISOString();
  const invNo = invoiceNo || `INV-${order.orderNo.replace('ORD-', '')}`;

  return (
    <Document>
      <Page size="A4" style={{ padding: 40, fontFamily: 'Helvetica', fontSize: 9 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
          <View>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.primary }}>{businessName || 'Business Name'}</Text>
            {businessNameAr && <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>{businessNameAr}</Text>}
            {address && <Text style={{ color: colors.muted, marginTop: 4 }}>{address}</Text>}
            {phone && <Text style={{ color: colors.muted }}>{phone}</Text>}
            {email && <Text style={{ color: colors.muted }}>{email}</Text>}
            {taxId && <Text style={{ marginTop: 4, fontWeight: 'bold' }}>TRN: {taxId}</Text>}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 14, fontWeight: 'bold' }}>SIMPLIFIED TAX INVOICE</Text>
            <Text style={{ fontSize: 9, color: colors.muted }}>فاتورة ضريبية مبسطة</Text>
            <Text style={{ marginTop: 8 }}>Invoice #: {invNo}</Text>
            <Text>Date: {formatDate(issueDate)}</Text>
            <Text>Branch: {branchName || order.branch?.name || '-'}</Text>
            {order.tableName && <Text>Table: {order.tableName}</Text>}
          </View>
        </View>

        {/* Customer (if available) */}
        {order.customer && (
          <View style={{ marginBottom: 12, padding: 8, backgroundColor: '#f9fafb', borderRadius: 4 }}>
            <Text style={{ fontWeight: 'bold', marginBottom: 2 }}>Customer</Text>
            <Text>{order.customer.name} {order.customer.phone ? `· ${order.customer.phone}` : ''}</Text>
          </View>
        )}

        {/* Items Table */}
        <View style={{ marginBottom: 16 }}>
          {/* Header row */}
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingBottom: 4, marginBottom: 4 }}>
            <Text style={{ width: '5%', fontWeight: 'bold' }}>#</Text>
            <Text style={{ width: '40%', fontWeight: 'bold' }}>Item</Text>
            <Text style={{ width: '15%', fontWeight: 'bold', textAlign: 'right' }}>Qty</Text>
            <Text style={{ width: '20%', fontWeight: 'bold', textAlign: 'right' }}>Unit Price</Text>
            <Text style={{ width: '20%', fontWeight: 'bold', textAlign: 'right' }}>Amount</Text>
          </View>
          {/* Item rows */}
          {order.items.map((item, i) => {
            const lineAmount = item.quantity * item.unitPrice - (item.discount || 0);
            return (
              <View key={i} style={{ flexDirection: 'row', paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: '#f3f4f6' }}>
                <Text style={{ width: '5%' }}>{i + 1}</Text>
                <Text style={{ width: '40%' }}>
                  {item.product?.name || 'Item'}
                  {item.modifiers?.length ? ` (${item.modifiers.map(m => m.name).join(', ')})` : ''}
                </Text>
                <Text style={{ width: '15%', textAlign: 'right' }}>{item.quantity}</Text>
                <Text style={{ width: '20%', textAlign: 'right' }}>{money(item.unitPrice, currency)}</Text>
                <Text style={{ width: '20%', textAlign: 'right' }}>{money(lineAmount, currency)}</Text>
              </View>
            );
          })}
        </View>

        {/* Totals */}
        <View style={{ marginLeft: 'auto', width: 200 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
            <Text>Subtotal:</Text>
            <Text>{money(order.subtotal, currency)}</Text>
          </View>
          {order.discountTotal > 0 && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
              <Text>Discount:</Text>
              <Text style={{ color: colors.danger }}>-{money(order.discountTotal, currency)}</Text>
            </View>
          )}
          {order.taxTotal > 0 && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
              <Text style={{ fontWeight: 'bold' }}>VAT:</Text>
              <Text>{money(order.taxTotal, currency)}</Text>
            </View>
          )}
          {order.serviceCharge > 0 && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
              <Text>Service Charge:</Text>
              <Text>{money(order.serviceCharge, currency)}</Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#111', paddingTop: 4, marginTop: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: 'bold' }}>TOTAL ({currency}):</Text>
            <Text style={{ fontSize: 11, fontWeight: 'bold' }}>{money(order.total, currency)}</Text>
          </View>
        </View>

        {/* Payment breakdown */}
        {order.payments?.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Payment</Text>
            {order.payments.map((p, i) => (
              <Text key={i} style={{ color: colors.muted }}>
                {p.method.replace(/_/g, ' ')}: {money(p.amount, currency)}
              </Text>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={{ position: 'absolute', bottom: 30, left: 40, right: 40 }}>
          <View style={{ borderTopWidth: 0.5, borderTopColor: '#e5e7eb', paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 7, color: colors.muted }}>
              Generated by GWK POS · {formatDate(new Date().toISOString())}
            </Text>
            <Text style={{ fontSize: 7, color: colors.muted }}>
              {taxId ? `TRN: ${taxId}` : ''} · Order: {order.orderNo}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
