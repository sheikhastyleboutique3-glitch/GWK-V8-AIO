/**
 * WhatsApp Integration Service
 *
 * Sends order confirmations, receipts, and promotions via WhatsApp Business API.
 * Supports: Twilio WhatsApp, WhatsApp Cloud API (Meta), and WATI.
 *
 * Configuration (env):
 *   WHATSAPP_PROVIDER=twilio|meta|wati
 *   WHATSAPP_API_KEY=your-api-key
 *   WHATSAPP_PHONE_ID=phone-number-id (Meta)
 *   WHATSAPP_FROM=+974XXXXXXXX (Twilio)
 *
 * Usage:
 *   this.whatsapp.sendReceipt(order, customerPhone);
 *   this.whatsapp.sendOrderStatus(order, 'READY', customerPhone);
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface WhatsAppMessage {
  to: string; // phone number with country code (+974XXXXXXXX)
  text?: string;
  templateName?: string;
  templateParams?: string[];
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly provider: string;
  private readonly apiKey: string;
  private readonly phoneId: string;
  private readonly fromPhone: string;

  constructor(private config: ConfigService) {
    this.provider = config.get('WHATSAPP_PROVIDER', '');
    this.apiKey = config.get('WHATSAPP_API_KEY', '');
    this.phoneId = config.get('WHATSAPP_PHONE_ID', '');
    this.fromPhone = config.get('WHATSAPP_FROM', '');
  }

  isConfigured(): boolean {
    return !!(this.provider && this.apiKey);
  }

  /**
   * Send a receipt summary to a customer via WhatsApp.
   */
  async sendReceipt(order: any, phone: string): Promise<boolean> {
    if (!this.isConfigured() || !phone) return false;
    const text = this.formatReceipt(order);
    return this.send({ to: this.normalizePhone(phone), text });
  }

  /**
   * Send order status update (Preparing → Ready → Out for Delivery).
   */
  async sendOrderStatus(order: any, status: string, phone: string): Promise<boolean> {
    if (!this.isConfigured() || !phone) return false;
    const statusMessages: Record<string, string> = {
      'PREPARING': `Your order ${order.orderNo} is being prepared! 👨‍🍳`,
      'READY': `Your order ${order.orderNo} is ready! 🎉 Please pick up.`,
      'OUT_FOR_DELIVERY': `Your order ${order.orderNo} is on the way! 🚗`,
      'DELIVERED': `Your order ${order.orderNo} has been delivered. Enjoy! 😊`,
    };
    const text = statusMessages[status] || `Order ${order.orderNo}: ${status}`;
    return this.send({ to: this.normalizePhone(phone), text });
  }

  /**
   * Send a promotional message.
   */
  async sendPromotion(phone: string, message: string): Promise<boolean> {
    if (!this.isConfigured()) return false;
    return this.send({ to: this.normalizePhone(phone), text: message });
  }

  private formatReceipt(order: any): string {
    const items = (order.items || [])
      .map((it: any) => `  ${it.quantity}x ${it.product?.name || 'Item'} — ${it.unitPrice * it.quantity}`)
      .join('\n');
    return [
      `🧾 *Order ${order.orderNo}*`,
      `━━━━━━━━━━━━━━━━━━`,
      items,
      `━━━━━━━━━━━━━━━━━━`,
      `*Total: QAR ${Number(order.total).toFixed(2)}*`,
      ``,
      `Thank you! 🙏`,
    ].join('\n');
  }

  private normalizePhone(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    if (!cleaned.startsWith('+')) {
      // Assume Qatar if no country code
      if (cleaned.length === 8) cleaned = '974' + cleaned;
      cleaned = '+' + cleaned;
    }
    return cleaned;
  }

  private async send(msg: WhatsAppMessage): Promise<boolean> {
    try {
      switch (this.provider.toLowerCase()) {
        case 'twilio':
          return this.sendViaTwilio(msg);
        case 'meta':
          return this.sendViaMeta(msg);
        case 'wati':
          return this.sendViaWati(msg);
        default:
          this.logger.warn(`Unknown WhatsApp provider: ${this.provider}`);
          return false;
      }
    } catch (e) {
      this.logger.error(`WhatsApp send failed: ${e.message}`);
      return false;
    }
  }

  private async sendViaTwilio(msg: WhatsAppMessage): Promise<boolean> {
    const [accountSid, authToken] = this.apiKey.split(':');
    const body = new URLSearchParams({
      From: `whatsapp:${this.fromPhone}`,
      To: `whatsapp:${msg.to}`,
      Body: msg.text || '',
    });
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    return res.ok;
  }

  private async sendViaMeta(msg: WhatsAppMessage): Promise<boolean> {
    const res = await fetch(`https://graph.facebook.com/v18.0/${this.phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: msg.to.replace('+', ''),
        type: 'text',
        text: { body: msg.text },
      }),
    });
    return res.ok;
  }

  private async sendViaWati(msg: WhatsAppMessage): Promise<boolean> {
    const res = await fetch(`https://live-server-1.wati.io/api/v1/sendSessionMessage/${msg.to.replace('+', '')}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageText: msg.text }),
    });
    return res.ok;
  }
}
