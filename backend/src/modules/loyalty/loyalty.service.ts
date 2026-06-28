import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class LoyaltyService {
  constructor(private prisma: PrismaService) {}

  // ---- Programs ----
  findAll() {
    return this.prisma.loyaltyProgram.findMany({
      where: { isActive: true },
      include: { rules: true, rewards: true },
      orderBy: { id: 'asc' },
    });
  }
  create(dto: any) {
    const { rules, rewards, ...rest } = dto || {};
    return this.prisma.loyaltyProgram.create({
      data: {
        ...rest,
        ...(Array.isArray(rules) ? { rules: { create: rules } } : {}),
        ...(Array.isArray(rewards) ? { rewards: { create: rewards } } : {}),
      },
      include: { rules: true, rewards: true },
    });
  }
  update(id: number, dto: any) {
    const { rules, rewards, ...rest } = dto || {};
    return this.prisma.loyaltyProgram.update({ where: { id }, data: rest, include: { rules: true, rewards: true } });
  }
  remove(id: number) { return this.prisma.loyaltyProgram.update({ where: { id }, data: { isActive: false } }); }

  // ---- Cards (loyalty card / eWallet / gift card) ----
  cards(programId?: number, customerId?: number) {
    return this.prisma.loyaltyCard.findMany({
      where: { ...(programId ? { programId } : {}), ...(customerId ? { customerId } : {}) },
      orderBy: { id: 'desc' },
    });
  }
  issueCard(dto: any) { return this.prisma.loyaltyCard.create({ data: dto }); }

  /** Add points / top-up wallet balance on a card. */
  async earn(code: string, points = 0, amount = 0) {
    const card = await this.prisma.loyaltyCard.findUnique({ where: { code } });
    if (!card || !card.isActive) throw new NotFoundException('Loyalty card not found or inactive.');
    return this.prisma.loyaltyCard.update({
      where: { code },
      data: { points: { increment: points }, balance: { increment: amount } },
    });
  }

  /** Redeem points or draw down wallet balance. Rejects insufficient funds. */
  async redeem(code: string, points = 0, amount = 0) {
    const card = await this.prisma.loyaltyCard.findUnique({ where: { code } });
    if (!card || !card.isActive) throw new NotFoundException('Loyalty card not found or inactive.');
    if (card.expiresAt && card.expiresAt < new Date()) throw new BadRequestException('Card has expired.');
    if (points > card.points + 1e-9) throw new BadRequestException(`Insufficient points: have ${card.points}, need ${points}.`);
    if (amount > card.balance + 1e-9) throw new BadRequestException(`Insufficient balance: have ${card.balance}, need ${amount}.`);
    return this.prisma.loyaltyCard.update({
      where: { code },
      data: { points: { decrement: points }, balance: { decrement: amount } },
    });
  }

  /** Lookup a loyalty card by barcode/NFC code — returns card info + customer. */
  async lookupCard(code: string) {
    const card = await this.prisma.loyaltyCard.findUnique({
      where: { code },
      include: {
        program: { select: { id: true, name: true, type: true, currency: true } },
        customer: { select: { id: true, name: true, phone: true, email: true, loyaltyPoints: true } },
      },
    });
    if (!card) throw new NotFoundException(`Card with code "${code}" not found.`);
    return {
      card: {
        code: card.code,
        points: card.points,
        balance: card.balance,
        isActive: card.isActive,
        expiresAt: card.expiresAt,
        isExpired: card.expiresAt ? card.expiresAt < new Date() : false,
      },
      program: card.program,
      customer: card.customer,
    };
  }
}
