/**
 * Z-Report / X-Report PDF document using @react-pdf/renderer.
 * Renders a professional session summary (same data as thermal print but PDF).
 */
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { baseStyles as s, colors, money, pct, formatDate } from './styles';

export interface SessionReportData {
  session: {
    sessionNo?: string;
    status?: string;
    openedAt?: string;
    closedAt?: string;
    openingFloat?: number;
    closingCounted?: number;
  };
  orderCount: number;
  salesTotal: number;
  foodCost: number;
  grossProfit: number;
  paymentsByMethod: Record<string, number>;
  cashIn: number;
  cashOut: number;
  cashSales: number;
  expectedCash: number;
  closingCounted?: number | null;
  cashDifference?: number | null;
}

export interface SessionReportProps {
  data: SessionReportData;
  businessName?: string;
  branchName?: string;
}

export function SessionReportPdf({ data, businessName, branchName }: SessionReportProps) {
  const rep = data;
  const sess = rep.session ?? {};
  const isClosed = sess.status === 'CLOSED';
  const reportType = isClosed ? 'Z-REPORT' : 'X-REPORT';
  const methods = Object.entries(rep.paymentsByMethod ?? {});
  const foodCostPct = rep.salesTotal ? (rep.foodCost / rep.salesTotal) * 100 : 0;
  const gpPct = rep.salesTotal ? (rep.grossProfit / rep.salesTotal) * 100 : 0;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.businessName}>{businessName || 'GWK Restaurant'}</Text>
          {branchName && <Text style={s.subtitle}>{branchName}</Text>}
          <Text style={s.title}>{reportType} — Session {sess.sessionNo ?? ''}</Text>
          <Text style={s.subtitle}>
            {formatDate(sess.openedAt)}{isClosed && sess.closedAt ? ` to ${formatDate(sess.closedAt)}` : ' (in progress)'}
          </Text>
        </View>

        {/* Key Metrics */}
        <View style={s.statGrid}>
          <View style={s.statCard}>
            <Text style={s.statValue}>{rep.orderCount}</Text>
            <Text style={s.statLabel}>Orders</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statValue}>{money(rep.salesTotal)}</Text>
            <Text style={s.statLabel}>Sales Total</Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statValue, { color: colors.danger }]}>{money(rep.foodCost)}</Text>
            <Text style={s.statLabel}>Food Cost</Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statValue, { color: colors.success }]}>{money(rep.grossProfit)}</Text>
            <Text style={s.statLabel}>Gross Profit</Text>
          </View>
        </View>

        {/* Profitability */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Profitability</Text>
          <View style={s.row}>
            <Text style={s.label}>Food Cost %</Text>
            <Text style={s.value}>{pct(foodCostPct)}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Gross Profit Margin</Text>
            <Text style={[s.value, { color: colors.success }]}>{pct(gpPct)}</Text>
          </View>
        </View>

        {/* Payments by Method */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Payments by Method</Text>
          {methods.length > 0 ? methods.map(([method, amt]) => (
            <View key={method} style={s.rowBordered}>
              <Text style={s.label}>{method.replace(/_/g, ' ')}</Text>
              <Text style={s.value}>{money(amt)}</Text>
            </View>
          )) : (
            <Text style={s.label}>No payments recorded</Text>
          )}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Total Collected</Text>
            <Text style={s.totalValue}>{money(rep.salesTotal)}</Text>
          </View>
        </View>

        {/* Cash Drawer Reconciliation */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Cash Drawer Reconciliation</Text>
          <View style={s.rowBordered}>
            <Text style={s.label}>Opening Float</Text>
            <Text style={s.value}>{money(sess.openingFloat)}</Text>
          </View>
          <View style={s.rowBordered}>
            <Text style={s.label}>Cash Sales</Text>
            <Text style={s.value}>{money(rep.cashSales)}</Text>
          </View>
          <View style={s.rowBordered}>
            <Text style={s.label}>Cash In (deposits)</Text>
            <Text style={s.value}>{money(rep.cashIn)}</Text>
          </View>
          <View style={s.rowBordered}>
            <Text style={s.label}>Cash Out (withdrawals)</Text>
            <Text style={[s.value, { color: colors.danger }]}>-{money(rep.cashOut)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Expected Cash in Drawer</Text>
            <Text style={s.totalValue}>{money(rep.expectedCash)}</Text>
          </View>
          {rep.closingCounted != null && (
            <>
              <View style={s.row}>
                <Text style={s.label}>Counted Cash</Text>
                <Text style={s.value}>{money(rep.closingCounted)}</Text>
              </View>
              <View style={s.row}>
                <Text style={s.label}>Difference (over/short)</Text>
                <Text style={[s.value, { color: (rep.cashDifference ?? 0) < 0 ? colors.danger : (rep.cashDifference ?? 0) > 0 ? colors.success : colors.dark }]}>
                  {money(rep.cashDifference)}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Generated: {new Date().toLocaleString()}</Text>
          <Text style={s.footerText}>{reportType} — {sess.sessionNo} — GWK V8 AIO</Text>
        </View>
      </Page>
    </Document>
  );
}

export default SessionReportPdf;
