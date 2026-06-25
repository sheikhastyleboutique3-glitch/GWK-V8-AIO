import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Online Payment Gateway — integration seam for Stripe / Tap / Checkout.qa.
 *
 * This service creates "payment intents" and verifies them. Without a real
 * provider SDK, it auto-approves for development/demo. Replace the marked
 * blocks with the real provider SDK on-site.
 *
 * Used by:
 *   - Self-order kiosk (guest pays before placing)
 *   - QR bank payment at POS (cashier shows QR, customer scans & pays)
 */
export interface CreateIntentInput {
  amount: number;
  currency?: string;
  orderId?: number;
  description?: string;
  provider?: string; // 'stripe' | 'tap' | 'checkout_qa'
  metadata?: Record<string, any>;
}

export interface PaymentIntent {
  id: string;
  status: 'pending' | 'approved' | 'failed';
  amount: number;
  currency: string;
  provider: string;
  /** QR data or checkout URL for the customer to complete payment */
  qrData?: string;
  checkoutUrl?: string;
  createdAt: Date;
}

@Injectable()
export class OnlinePaymentService {
  private readonly logger = new Logger('OnlinePayment');

  constructor(private prisma: PrismaService) {}

  /**
   * Create a payment intent. In production, this calls the provider API
   * (Stripe PaymentIntent, Tap Charge, etc.) and returns a client secret
   * or checkout URL. For demo, it auto-generates a mock.
   */
  async createIntent(input: CreateIntentInput): Promise<PaymentIntent> {
    if (!(input.amount > 0)) throw new BadRequestException('Amount must be positive');
    const currency = input.currency || 'QAR';
    const provider = input.provider || 'demo';
    const id = `pi_${provider}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

    // ──────────────────────────────────────────────────────────────────────
    // PROVIDER INTEGRATION SEAM — replace this block with real SDK calls:
    //
    // if (provider === 'stripe') {
    //   const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    //   const intent = await stripe.paymentIntents.create({
    //     amount: Math.round(input.amount * 100),
    //     currency: currency.toLowerCase(),
    //     metadata: input.metadata,
    //   });
    //   return { id: intent.id, status: 'pending', amount: input.amount, currency, provider, checkoutUrl: intent.client_secret, createdAt: new Date() };
    // }
    //
    // if (provider === 'tap') {
    //   const tap = require('@tap-payments/tap-nodejs');
    //   const charge = await tap.charges.create({ amount: input.amount, currency, ...});
    //   return { id: charge.id, status: 'pending', ...};
    // }
    // ──────────────────────────────────────────────────────────────────────

    // Demo mode: auto-approve after a short delay (simulates gateway)
    this.logger.log(`[DEMO] Payment intent created: ${id} for ${currency} ${input.amount}`);

    // Generate a mock QR payload (in production this would be the bank's QR standard)
    const qrData = JSON.stringify({
      type: 'payment',
      id,
      amount: input.amount,
      currency,
      merchant: 'GWK Restaurant',
      timestamp: Date.now(),
    });

    return {
      id,
      status: 'approved', // Demo: auto-approve
      amount: input.amount,
      currency,
      provider,
      qrData,
      checkoutUrl: `/payment/complete?intentId=${id}`,
      createdAt: new Date(),
    };
  }

  /**
   * Verify a payment intent status. In production, checks with the provider.
   * Returns 'approved' if payment was successful.
   */
  async verifyIntent(intentId: string): Promise<{ status: 'approved' | 'pending' | 'failed'; intentId: string }> {
    // ──────────────────────────────────────────────────────────────────────
    // PROVIDER INTEGRATION SEAM:
    // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    // const intent = await stripe.paymentIntents.retrieve(intentId);
    // return { status: intent.status === 'succeeded' ? 'approved' : 'pending', intentId };
    // ──────────────────────────────────────────────────────────────────────

    // Demo: always approved
    this.logger.log(`[DEMO] Payment intent verified: ${intentId} → approved`);
    return { status: 'approved', intentId };
  }
}
