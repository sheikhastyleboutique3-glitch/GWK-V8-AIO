import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SalesService } from '../sales/sales.service';
import { PaymentMethod } from '@prisma/client';

@Injectable()
export class PaymentTerminalsService {
  constructor(private prisma: PrismaService, private sales: SalesService) {}

  findAll() {
    return this.prisma.paymentTerminal.findMany({ orderBy: { name: 'asc' } });
  }
  create(dto: any) {
    return this.prisma.paymentTerminal.create({ data: dto });
  }
  update(id: number, dto: any) {
    return this.prisma.paymentTerminal.update({ where: { id }, data: dto });
  }
  remove(id: number) {
    return this.prisma.paymentTerminal.update({ where: { id }, data: { isActive: false } });
  }

  /**
   * Capture a card payment on a terminal and record it against the order.
   *
   * The actual card-network handshake is provider-specific (Adyen / Stripe /
   * Viva / SIX / Worldline). This method is the integration seam: it validates
   * the terminal, performs the (provider) capture, and on approval records the
   * payment. Without a vendor SDK present on-site it auto-approves so the flow
   * is usable end-to-end; swap the marked block for the real provider call.
   */
  async capture(terminalId: number, orderId: number, amount: number, userId?: number) {
    const terminal = await this.prisma.paymentTerminal.findUnique({ where: { id: terminalId } });
    if (!terminal || !terminal.isActive) throw new NotFoundException('Terminal not found or inactive');
    if (!(amount > 0)) throw new BadRequestException('Amount must be positive');

    // --- provider handshake (replace with Adyen/Stripe/etc. SDK on-site) ----
    const result = { approved: true, authCode: `AUTH-${Date.now().toString(36).toUpperCase()}` };
    // ------------------------------------------------------------------------

    if (!result.approved) throw new BadRequestException('Card declined by terminal');

    await this.sales.addPayment(
      orderId,
      { method: PaymentMethod.CARD, amount, reference: `${terminal.provider}:${terminal.id}:${result.authCode}` },
      userId,
    );
    return { approved: true, authCode: result.authCode, terminal: terminal.name, provider: terminal.provider };
  }
}
