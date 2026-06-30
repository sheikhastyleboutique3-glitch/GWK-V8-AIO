/**
 * Credit Note PDF — generated for refunds (full or partial).
 * Professional document showing refunded items, amounts, and reason.
 */
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { baseStyles as s, colors, money, formatDate } from './styles';

export interface CreditNoteProps {
  order: {
    orderNo: string;
    completedAt?: string | null;
    branch?: { name?: string } | null;
    customer?: { name?: string; phone?: string } | null;
  };
  refundedItems: Array<{
    product?: { name?: string };
    quantity: number;
    unitPrice: number;
    discount: number;
  }>;
  refundTotal: number;
  refundCost: number;
  reason?: string;
  businessName?: string;
  branchName?: string;
  currency?: string;
}

export function CreditNotePdf({ order, refundedItems, refundTotal, reason, businessName, branchName }: CreditNoteProps) {
  return (
    <Document>
      <Page size="A5" style={[s.page, { padding: 24 }]}>
        {/* Header */}
        <View style={[s.header, { alignItems: 'center' }]}>
          <Text style={[s.businessName, { textAlign: 'center' }]}>{businessName || 'GWK Restaurant'}</Text>
          {branchName && <Text style={[s.subtitle, { textAlign: 'center' }]}>{branchName}</Text>}
          <Text style={[s.title, { textAlign: 'center', color: colors.danger }]}>CREDIT NOTE</Text>
        </View>

        {/* Reference */}
        <View style={s.section}>
          <View style={s.row}>
            <Text style={s.label}>Original Order</Text>
            <Text style={s.value}>{order.orderNo}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Date</Text>
            <Text style={s.value}>{formatDate(new Date().toISOString())}</Text>
          </View>
          {order.customer?.name && (
            <View style={s.row}>
              <Text style={s.label}>Customer</Text>
              <Text style={s.value}>{order.customer.name}</Text>
            </View>
          )}
          {reason && (
            <View style={s.row}>
              <Text style={s.label}>Reason</Text>
              <Text style={s.value}>{reason}</Text>
            </View>
          )}
        </View>

        {/* Refunded Items */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Refunded Items</Text>
          <View style={s.tableHeader}>
            <Text style={[s.tableCellHeader, { width: '50%' }]}>Item</Text>
            <Text style={[s.tableCellHeader, { width: '15%', textAlign: 'center' }]}>Qty</Text>
            <Text style={[s.tableCellHeader, { width: '15%', textAlign: 'right' }]}>Price</Text>
            <Text style={[s.tableCellHeader, { width: '20%', textAlign: 'right' }]}>Refund</Text>
          </View>
          {refundedItems.map((it, i) => (
            <View key={i} style={s.tableRow}>
              <Text style={[s.tableCell, { width: '50%' }]}>{it.product?.name ?? 'Item'}</Text>
              <Text style={[s.tableCell, { width: '15%', textAlign: 'center' }]}>{it.quantity}</Text>
              <Text style={[s.tableCell, { width: '15%', textAlign: 'right' }]}>{money(it.unitPrice)}</Text>
              <Text style={[s.tableCell, { width: '20%', textAlign: 'right', color: colors.danger }]}>-{money(it.unitPrice * it.quantity - it.discount)}</Text>
            </View>
          ))}
          <View style={s.totalRow}>
            <Text style={[s.totalLabel, { color: colors.danger }]}>TOTAL REFUND</Text>
            <Text style={[s.totalValue, { color: colors.danger }]}>-{money(refundTotal)}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={{ marginTop: 12, alignItems: 'center' }}>
          <Text style={[s.subtitle, { textAlign: 'center' }]}>This credit note confirms the refund of the above items.</Text>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>Credit Note — {order.orderNo}</Text>
          <Text style={s.footerText}>GWK V8 AIO</Text>
        </View>
      </Page>
    </Document>
  );
}

export default CreditNotePdf;
