/**
 * Order Receipt PDF — professional A5/A4 invoice-style receipt.
 * Used for email attachment or customer download of their bill.
 */
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { baseStyles as s, colors, money, formatDate } from './styles';

export interface ReceiptOrder {
  id: number;
  orderNo: string;
  channel?: string;
  tableName?: string | null;
  notes?: string | null;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  serviceCharge: number;
  tip: number;
  couponCode?: string | null;
  couponDiscount?: number;
  total: number;
  paidTotal: number;
  createdAt?: string;
  completedAt?: string | null;
  items: Array<{
    quantity: number;
    unitPrice: number;
    discount: number;
    product?: { name?: string; nameAr?: string };
    modifiers?: Array<{ name?: string }> | null;
    notes?: string | null;
  }>;
  payments: Array<{ method: string; amount: number; reference?: string | null }>;
  customer?: { name?: string; phone?: string } | null;
  branch?: { name?: string; nameAr?: string } | null;
}

export interface ReceiptPdfProps {
  order: ReceiptOrder;
  businessName?: string;
  branchName?: string;
  address?: string;
  phone?: string;
  taxId?: string;
}

export function ReceiptPdf({ order, businessName, branchName, address, phone, taxId }: ReceiptPdfProps) {
  const change = Math.max(0, +(order.paidTotal - order.total).toFixed(2));

  return (
    <Document>
      <Page size="A5" style={[s.page, { padding: 24 }]}>
        {/* Business Header */}
        <View style={[s.header, { alignItems: 'center', textAlign: 'center' }]}>
          <Text style={[s.businessName, { textAlign: 'center' }]}>{businessName || 'GWK Restaurant'}</Text>
          {branchName && <Text style={[s.subtitle, { textAlign: 'center' }]}>{branchName}</Text>}
          {address && <Text style={[s.footerText, { textAlign: 'center' }]}>{address}</Text>}
          {phone && <Text style={[s.footerText, { textAlign: 'center' }]}>Tel: {phone}</Text>}
          {taxId && <Text style={[s.footerText, { textAlign: 'center' }]}>Tax ID: {taxId}</Text>}
        </View>

        {/* Order Info */}
        <View style={s.section}>
          <View style={s.row}>
            <Text style={s.label}>Order #</Text>
            <Text style={s.value}>{order.orderNo}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Date</Text>
            <Text style={s.value}>{formatDate(order.completedAt || order.createdAt)}</Text>
          </View>
          {order.tableName && (
            <View style={s.row}>
              <Text style={s.label}>Table</Text>
              <Text style={s.value}>{order.tableName}</Text>
            </View>
          )}
          {order.channel && (
            <View style={s.row}>
              <Text style={s.label}>Type</Text>
              <Text style={s.value}>{order.channel.replace(/_/g, ' ')}</Text>
            </View>
          )}
          {order.customer?.name && (
            <View style={s.row}>
              <Text style={s.label}>Customer</Text>
              <Text style={s.value}>{order.customer.name}</Text>
            </View>
          )}
        </View>

        {/* Line Items */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Items</Text>
          <View style={s.tableHeader}>
            <Text style={[s.tableCellHeader, { width: '45%' }]}>Item</Text>
            <Text style={[s.tableCellHeader, { width: '10%', textAlign: 'center' }]}>Qty</Text>
            <Text style={[s.tableCellHeader, { width: '20%', textAlign: 'right' }]}>Price</Text>
            <Text style={[s.tableCellHeader, { width: '25%', textAlign: 'right' }]}>Total</Text>
          </View>
          {(order.items || []).map((it, i) => {
            const mods = Array.isArray(it.modifiers) ? it.modifiers.filter((m: any) => m?.name) : [];
            return (
              <View key={i}>
                <View style={s.tableRow}>
                  <Text style={[s.tableCell, { width: '45%' }]}>
                    {it.product?.name ?? 'Item'}
                  </Text>
                  <Text style={[s.tableCell, { width: '10%', textAlign: 'center' }]}>{it.quantity}</Text>
                  <Text style={[s.tableCell, { width: '20%', textAlign: 'right' }]}>{money(it.unitPrice)}</Text>
                  <Text style={[s.tableCell, { width: '25%', textAlign: 'right', fontWeight: 'bold' }]}>{money(it.quantity * it.unitPrice)}</Text>
                </View>
                {mods.length > 0 && (
                  <View style={{ paddingLeft: 8, paddingBottom: 2 }}>
                    <Text style={[s.tableCell, { color: colors.gray, fontSize: 7 }]}>
                      + {mods.map((m: any) => m.name).join(', ')}
                    </Text>
                  </View>
                )}
                {it.notes && (
                  <View style={{ paddingLeft: 8, paddingBottom: 2 }}>
                    <Text style={[s.tableCell, { color: colors.warning, fontSize: 7 }]}>
                      Note: {it.notes}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Totals */}
        <View style={s.section}>
          <View style={s.row}>
            <Text style={s.label}>Subtotal</Text>
            <Text style={s.value}>{money(order.subtotal)}</Text>
          </View>
          {order.discountTotal > 0 && (
            <View style={s.row}>
              <Text style={s.label}>Discount{order.couponCode ? ` (${order.couponCode})` : ''}</Text>
              <Text style={[s.value, { color: colors.danger }]}>-{money(order.discountTotal)}</Text>
            </View>
          )}
          {order.taxTotal > 0 && (
            <View style={s.row}>
              <Text style={s.label}>Tax</Text>
              <Text style={s.value}>{money(order.taxTotal)}</Text>
            </View>
          )}
          {order.serviceCharge > 0 && (
            <View style={s.row}>
              <Text style={s.label}>Service Charge</Text>
              <Text style={s.value}>{money(order.serviceCharge)}</Text>
            </View>
          )}
          {order.tip > 0 && (
            <View style={s.row}>
              <Text style={s.label}>Tip</Text>
              <Text style={s.value}>{money(order.tip)}</Text>
            </View>
          )}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>TOTAL</Text>
            <Text style={s.totalValue}>{money(order.total)}</Text>
          </View>
        </View>

        {/* Payments */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Payment</Text>
          {(order.payments || []).map((p, i) => (
            <View key={i} style={s.row}>
              <Text style={s.label}>{p.method.replace(/_/g, ' ')}</Text>
              <Text style={s.value}>{money(p.amount)}</Text>
            </View>
          ))}
          {change > 0 && (
            <View style={s.row}>
              <Text style={s.label}>Change</Text>
              <Text style={s.value}>{money(change)}</Text>
            </View>
          )}
        </View>

        {/* Thank You */}
        <View style={{ marginTop: 12, alignItems: 'center' }}>
          <Text style={[s.subtitle, { textAlign: 'center' }]}>Thank you for dining with us!</Text>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>{order.orderNo}</Text>
          <Text style={s.footerText}>GWK V8 AIO</Text>
        </View>
      </Page>
    </Document>
  );
}

export default ReceiptPdf;
