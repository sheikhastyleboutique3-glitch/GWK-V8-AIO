import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

/** A single KOT ticket destined for one printer / station. */
export interface KotTicket {
  station: string;
  printer: {
    id: number;
    name: string;
    connection: string;
    ipAddress: string | null;
    port: number | null;
    usbPort: string | null;
    widthMm: number;
  } | null;
  lines: Array<{ quantity: number; name: string; notes?: string | null; modifiers?: string[] }>;
  /** Plain-text body the on-prem ESC/POS agent can render / push to hardware. */
  text: string;
}

@Injectable()
export class PrintersService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.printer.findMany({ orderBy: { name: 'asc' } });
  }

  create(dto: any) {
    return this.prisma.printer.create({ data: dto });
  }

  update(id: number, dto: any) {
    return this.prisma.printer.update({ where: { id }, data: dto });
  }

  remove(id: number) {
    return this.prisma.printer.update({ where: { id }, data: { isActive: false } });
  }

  /** Fallback station name from a category when no explicit station is set. */
  private stationFromCategory(name?: string | null): string {
    const c = (name || '').toLowerCase();
    if (/pastry|bakery|dessert|cake|sweet|croissant|معجن|حلو|مخبوز|كيك/.test(c)) return 'PASTRY';
    if (/coffee|drink|beverage|juice|bar|tea|espresso|latte|cappuccino|mocha|macchiato|قهوة|مشروب|عصير|شاي/.test(c)) return 'BARISTA';
    return 'HOT KITCHEN';
  }

  /**
   * Build station-grouped kitchen tickets for an order. Each line is routed by
   * its category's printer (preferred) or station string. Returns one ticket
   * per destination with a ready-to-print text body. The actual byte push to
   * hardware is performed by an on-prem ESC/POS agent that consumes this output
   * (kept out of the API so cloud deployments never block on local printers).
   */
  async buildKot(orderId: number): Promise<{ orderNo: string; tickets: KotTicket[] }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                category: {
                  select: {
                    name: true,
                    station: true,
                    printer: {
                      select: { id: true, name: true, connection: true, ipAddress: true, port: true, usbPort: true, widthMm: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);

    // Group lines by a routing key (printer id if present, else station name).
    const groups = new Map<string, KotTicket>();
    for (const it of order.items) {
      const cat = it.product?.category;
      const printer = cat?.printer ?? null;
      const station = (cat?.station && cat.station.trim()) || this.stationFromCategory(cat?.name);
      const key = printer ? `p${printer.id}` : `s${station}`;

      if (!groups.has(key)) {
        groups.set(key, { station, printer, lines: [], text: '' });
      }
      const mods = Array.isArray(it.modifiers) ? (it.modifiers as any[]) : [];
      groups.get(key)!.lines.push({
        quantity: it.quantity,
        name: it.product?.name ?? `#${it.productId}`,
        notes: it.notes,
        modifiers: mods.map((m) => m?.name || m?.nameAr).filter(Boolean),
      });
    }

    const when = new Date(order.createdAt).toLocaleString();
    const tickets = [...groups.values()].map((tk) => {
      const header = [
        `*** ${tk.station} ***`,
        `Order: ${order.orderNo}`,
        order.tableName ? `Table: ${order.tableName}` : `Channel: ${order.channel}`,
        when,
        '--------------------------------',
      ];
      const body = tk.lines.map((l) => {
        const base = `${l.quantity} x ${l.name}`;
        const extra = l.modifiers?.length ? `\n    + ${l.modifiers.join(', ')}` : '';
        const note = l.notes ? `\n    * ${l.notes}` : '';
        return base + extra + note;
      });
      tk.text = [...header, ...body, '--------------------------------'].join('\n');
      return tk;
    });

    return { orderNo: order.orderNo, tickets };
  }

  /** Build a plain-text receipt for a completed order (ESC/POS friendly). */
  async buildReceipt(orderId: number): Promise<{ orderNo: string; text: string; printer: any }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: { select: { name: true, nameAr: true } } } },
        payments: true,
        customer: { select: { name: true, phone: true } },
        branch: { select: { name: true, nameAr: true } },
      },
    });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);

    // Find receipt printer (first printer without a category assignment = receipt printer)
    const allPrinters = await this.prisma.printer.findMany({ where: { isActive: true } });
    const categoryPrinterIds = new Set(
      (await this.prisma.category.findMany({ where: { printerId: { not: null } }, select: { printerId: true } }))
        .map(c => c.printerId)
    );
    // Receipt printer = any active printer NOT assigned to a category (or first one if all are assigned)
    const receiptPrinter = allPrinters.find(p => p.ipAddress && !categoryPrinterIds.has(p.id)) || allPrinters.find(p => p.ipAddress);

    const settings = await this.prisma.setting.findMany({ where: { key: { in: ['company_name', 'company_phone', 'company_address', 'company_tax_id', 'default_currency'] } } });
    const s: Record<string, string> = {};
    settings.forEach(st => { s[st.key] = st.value; });
    const currency = s.default_currency || 'QAR';

    const lines: string[] = [];
    lines.push(s.company_name || 'GWK Restaurant');
    lines.push(order.branch?.name || '');
    if (s.company_address) lines.push(s.company_address);
    if (s.company_phone) lines.push(s.company_phone);
    if (s.company_tax_id) lines.push(`Tax ID: ${s.company_tax_id}`);
    lines.push(new Date(order.completedAt || order.createdAt).toLocaleString());
    lines.push('================================');
    lines.push(`Order: ${order.orderNo}`);
    if (order.tableName) lines.push(`Table: ${order.tableName}`);
    lines.push(`Type: ${order.channel?.replace('_', ' ')}`);
    if (order.customer) lines.push(`Customer: ${order.customer.name}`);
    lines.push('--------------------------------');

    for (const it of order.items) {
      const lineTotal = it.unitPrice * it.quantity;
      const disc = it.discount ?? 0;
      lines.push(`${it.quantity} x ${it.product?.name || '#' + it.productId}  ${currency} ${lineTotal.toFixed(2)}`);
      if (disc > 0) lines.push(`   Disc: -${currency} ${disc.toFixed(2)}`);
    }

    lines.push('--------------------------------');
    lines.push(`Subtotal:       ${currency} ${order.subtotal.toFixed(2)}`);
    if (order.discountTotal > 0) lines.push(`Discount:      -${currency} ${order.discountTotal.toFixed(2)}`);
    if (order.taxTotal > 0) lines.push(`Tax:            ${currency} ${order.taxTotal.toFixed(2)}`);
    if (order.serviceCharge > 0) lines.push(`Service:        ${currency} ${order.serviceCharge.toFixed(2)}`);
    if (order.tip > 0) lines.push(`Tip:            ${currency} ${order.tip.toFixed(2)}`);
    lines.push('================================');
    lines.push(`TOTAL:          ${currency} ${order.total.toFixed(2)}`);
    lines.push('================================');

    for (const p of (order.payments || []).filter((p: any) => !p.isReversed)) {
      lines.push(`${p.method.replace('_', ' ')}:  ${currency} ${p.amount.toFixed(2)}`);
    }
    const paid = (order.payments || []).filter((p: any) => !p.isReversed).reduce((sum: number, p: any) => sum + p.amount, 0);
    const change = Math.max(0, paid - order.total);
    if (change > 0) lines.push(`Change:         ${currency} ${change.toFixed(2)}`);

    lines.push('');
    lines.push('    Thank you & see you again!');

    return {
      orderNo: order.orderNo,
      text: lines.join('\n'),
      printer: receiptPrinter ? { ipAddress: receiptPrinter.ipAddress, port: receiptPrinter.port || 9100, widthMm: receiptPrinter.widthMm } : null,
    };
  }
}
