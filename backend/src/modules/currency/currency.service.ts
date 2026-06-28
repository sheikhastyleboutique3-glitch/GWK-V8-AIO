import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * CurrencyService — Exchange rate management and conversion.
 *
 * Base currency is QAR (Qatari Riyal). All internal amounts are stored in QAR.
 * When accepting foreign-currency payments, the amount is converted to QAR
 * using the stored rate before recording.
 *
 * Rates are stored as "how many QAR = 1 unit of foreign currency":
 *   - USD rateToBase = 3.64 means 1 USD = 3.64 QAR
 *   - EUR rateToBase = 3.98 means 1 EUR = 3.98 QAR
 */
@Injectable()
export class CurrencyService {
  constructor(private prisma: PrismaService) {}

  /** List all active currencies with their current rates. */
  findAll(includeInactive = false) {
    return this.prisma.currencyRate.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { code: 'asc' },
    });
  }

  /** Get a single currency by code. */
  async findByCode(code: string) {
    const rate = await this.prisma.currencyRate.findUnique({ where: { code: code.toUpperCase() } });
    if (!rate) throw new NotFoundException(`Currency ${code} not found`);
    return rate;
  }

  /** Convert an amount FROM a foreign currency TO the base currency (QAR). */
  async toBase(amount: number, fromCurrency: string): Promise<{ baseAmount: number; rate: number }> {
    if (fromCurrency.toUpperCase() === 'QAR') return { baseAmount: amount, rate: 1 };
    const curr = await this.findByCode(fromCurrency);
    const baseAmount = Math.round(amount * curr.rateToBase * 100) / 100;
    return { baseAmount, rate: curr.rateToBase };
  }

  /** Convert an amount FROM the base currency (QAR) TO a foreign currency. */
  async fromBase(amount: number, toCurrency: string): Promise<{ foreignAmount: number; rate: number }> {
    if (toCurrency.toUpperCase() === 'QAR') return { foreignAmount: amount, rate: 1 };
    const curr = await this.findByCode(toCurrency);
    const foreignAmount = Math.round((amount / curr.rateToBase) * 100) / 100;
    return { foreignAmount, rate: curr.rateToBase };
  }

  /** Create or update a currency rate. */
  upsert(data: { code: string; name: string; nameAr?: string; symbol: string; rateToBase: number; isActive?: boolean }) {
    return this.prisma.currencyRate.upsert({
      where: { code: data.code.toUpperCase() },
      update: { name: data.name, nameAr: data.nameAr, symbol: data.symbol, rateToBase: data.rateToBase, isActive: data.isActive ?? true },
      create: { code: data.code.toUpperCase(), name: data.name, nameAr: data.nameAr, symbol: data.symbol, rateToBase: data.rateToBase, isActive: data.isActive ?? true },
    });
  }

  /** Remove (deactivate) a currency. */
  deactivate(code: string) {
    return this.prisma.currencyRate.update({
      where: { code: code.toUpperCase() },
      data: { isActive: false },
    });
  }
}
