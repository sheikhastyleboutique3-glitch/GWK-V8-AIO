import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
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
   * Demo mode must be turned on EXPLICITLY (PAYMENT_DEMO_MODE=true). Otherwise
   * this service fails closed: it will never auto-approve a payment, so a
   * production server without a real provider SDK can't mark unpaid orders paid.
   */
  private get demoMode(): boolean {
    return process.env.PAYMENT_DEMO_MODE === 'true';
  }

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
    // PROVIDER INTEGRATION SEAM — replace this block with real SDK calls
    // (Stripe PaymentIntent, Tap Charge, Checkout.qa, ...). See git history.
    // ──────────────────────────────────────────────────────────────────────

    // FAIL CLOSED: no real provider is wired. Only the demo auto-approve path
    // is allowed, and only when explicitly enabled. This prevents a production
    // server from silently approving unpaid online/QR orders.
    if (!this.demoMode) {
      throw new ServiceUnavailableException(
        'Online payments are not configured on this server. Wire a provider SDK, or set PAYMENT_DEMO_MODE=true for demos.',
      );
    }

    this.logger.warn(`[DEMO] Auto-approving payment intent ${id} for ${currency} ${input.amount} — NOT a real charge`);
    const qrData = JSON.stringify({ type: 'payment', id, amount: input.amount, currency, merchant: 'GWK Restaurant', timestamp: Date.now() });

    return {
      id,
      status: 'approved', // Demo only (PAYMENT_DEMO_MODE=true)
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
   * Fails closed: without a real provider (demo mode off) it never reports
   * 'approved'.
   */
  async verifyIntent(intentId: string): Promise<{ status: 'approved' | 'pending' | 'failed'; intentId: string }> {
    // PROVIDER INTEGRATION SEAM: query the real provider and map its status.
    if (!this.demoMode) {
      // Never auto-approve without a real provider verification.
      return { status: 'pending', intentId };
    }
    this.logger.warn(`[DEMO] Payment intent ${intentId} → approved (demo mode)`);
    return { status: 'approved', intentId };
  }
}
