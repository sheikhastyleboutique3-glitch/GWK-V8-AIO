/**
 * Daily Sales Report PDF — summarizes all completed orders for a given date/range.
 * Includes totals, payment breakdown, top products, and hourly distribution.
 */
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { baseStyles as s, colors, money, pct, formatDateShort } from './styles';

export interface DailySalesOrder {
  id: number;
  orderNo: string;
  channel: string;
  tableName?: string | null;
  total: number;
  foodCost: number;
  grossProfit: number;
  paidTotal: number;
  completedAt?: string | null;
  payments: Array<{ method: string; amount: number }>;
  items: Array<{ productId: number; quantity: number; unitPrice: number; product?: { name?: string } }>;
}

export interface DailySalesProps {
  orders: DailySalesOrder[];
  date: string; // YYYY-MM-DD or "from — to"
  businessName?: string;
  branchName?: string;
}

export function DailySalesPdf({ orders, date, businessName, branchName }: DailySalesProps) {
  const totalSales = orders.reduce((s, o) => s + o.total, 0);
  const totalCost = orders.reduce((s, o) => s + (o.foodCost ?? 0), 0);
  const totalGP = orders.reduce((s, o) => s + (o.grossProfit ?? 0), 0);
  const gpPct = totalSales ? (totalGP / totalSales) * 100 : 0;

  // Payment breakdown
  const byMethod: Record<string, number> = {};
  for (const o of orders) {
    for (const p of o.payments ?? []) {
      byMethod[p.method] = (byMethod[p.method] ?? 0) + p.amount;
    }
  }
  const methods = Object.entries(byMethod).sort((a, b) => b[1] - a[1]);

  // Channel breakdown
  const byChannel: Record<string, { count: number; total: number }> = {};
  for (const o of orders) {
    if (!byChannel[o.channel]) byChannel[o.channel] = { count: 0, total: 0 };
    byChannel[o.channel].count++;
    byChannel[o.channel].total += o.total;
  }
  const channels = Object.entries(byChannel).sort((a, b) => b[1].total - a[1].total);

  // Top products (by quantity)
  const prodMap = new Map<number, { name: string; qty: number; revenue: number }>();
  for (const o of orders) {
    for (const it of o.items ?? []) {
      const existing = prodMap.get(it.productId);
      if (existing) {
        existing.qty += it.quantity;
        existing.revenue += it.quantity * it.unitPrice;
      } else {
        prodMap.set(it.productId, { name: it.product?.name ?? `#${it.productId}`, qty: it.quantity, revenue: it.quantity * it.unitPrice });
      }
    }
  }
  const topProducts = [...prodMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 15);

  // Hourly distribution
  const byHour: Record<number, { count: number; total: number }> = {};
  for (const o of orders) {
    if (o.completedAt) {
      const h = new Date(o.completedAt).getHours();
      if (!byHour[h]) byHour[h] = { count: 0, total: 0 };
      byHour[h].count++;
      byHour[h].total += o.total;
    }
  }
  const hours = Object.entries(byHour).map(([h, v]) => ({ hour: Number(h), ...v })).sort((a, b) => a.hour - b.hour);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.businessName}>{businessName || 'GWK Restaurant'}</Text>
          {branchName && <Text style={s.subtitle}>{branchName}</Text>}
          <Text style={s.title}>Daily Sales Report</Text>
          <Text style={s.subtitle}>{date}</Text>
        </View>

        {/* Key Metrics */}
        <View style={s.statGrid}>
          <View style={s.statCard}>
            <Text style={s.statValue}>{orders.length}</Text>
            <Text style={s.statLabel}>Orders</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statValue}>{money(totalSales)}</Text>
            <Text style={s.statLabel}>Revenue</Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statValue, { color: colors.danger }]}>{money(totalCost)}</Text>
            <Text style={s.statLabel}>COGS</Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statValue, { color: colors.success }]}>{money(totalGP)}</Text>
            <Text style={s.statLabel}>Gross Profit ({pct(gpPct)})</Text>
          </View>
        </View>

        {/* Payments */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Payment Methods</Text>
          {methods.map(([method, amt]) => (
            <View key={method} style={s.rowBordered}>
              <Text style={s.label}>{method.replace(/_/g, ' ')}</Text>
              <Text style={s.value}>{money(amt)}</Text>
            </View>
          ))}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Total Collected</Text>
            <Text style={s.totalValue}>{money(totalSales)}</Text>
          </View>
        </View>

        {/* Channels */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Sales by Channel</Text>
          {channels.map(([ch, v]) => (
            <View key={ch} style={s.rowBordered}>
              <Text style={s.label}>{ch.replace(/_/g, ' ')} ({v.count} orders)</Text>
              <Text style={s.value}>{money(v.total)}</Text>
            </View>
          ))}
        </View>

        {/* Hourly Distribution */}
        {hours.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Hourly Distribution</Text>
            {hours.map((h) => (
              <View key={h.hour} style={s.rowBordered}>
                <Text style={s.label}>{String(h.hour).padStart(2, '0')}:00 – {String(h.hour).padStart(2, '0')}:59 ({h.count} orders)</Text>
                <Text style={s.value}>{money(h.total)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Generated: {new Date().toLocaleString()}</Text>
          <Text style={s.footerText}>Daily Sales — GWK V8 AIO</Text>
        </View>
      </Page>

      {/* Page 2: Top Products */}
      {topProducts.length > 0 && (
        <Page size="A4" style={s.page}>
          <View style={s.section}>
            <Text style={s.sectionTitle}>Top Products (by quantity sold)</Text>
            <View style={s.tableHeader}>
              <Text style={[s.tableCellHeader, { width: '8%' }]}>#</Text>
              <Text style={[s.tableCellHeader, { width: '42%' }]}>Product</Text>
              <Text style={[s.tableCellHeader, { width: '15%', textAlign: 'right' }]}>Qty</Text>
              <Text style={[s.tableCellHeader, { width: '20%', textAlign: 'right' }]}>Revenue</Text>
              <Text style={[s.tableCellHeader, { width: '15%', textAlign: 'right' }]}>Avg Price</Text>
            </View>
            {topProducts.map((p, i) => (
              <View key={i} style={s.tableRow}>
                <Text style={[s.tableCell, { width: '8%' }]}>{i + 1}</Text>
                <Text style={[s.tableCell, { width: '42%' }]}>{p.name}</Text>
                <Text style={[s.tableCell, { width: '15%', textAlign: 'right' }]}>{p.qty}</Text>
                <Text style={[s.tableCell, { width: '20%', textAlign: 'right' }]}>{money(p.revenue)}</Text>
                <Text style={[s.tableCell, { width: '15%', textAlign: 'right' }]}>{money(p.qty ? p.revenue / p.qty : 0)}</Text>
              </View>
            ))}
          </View>

          <View style={s.footer} fixed>
            <Text style={s.footerText}>Generated: {new Date().toLocaleString()}</Text>
            <Text style={s.footerText}>Daily Sales — Top Products — GWK V8 AIO</Text>
          </View>
        </Page>
      )}
    </Document>
  );
}

export default DailySalesPdf;
