/**
 * ZATCA Phase 2 QR Code — TLV (Tag-Length-Value) encoder.
 *
 * Generates a Base64-encoded TLV string compliant with ZATCA e-invoicing
 * requirements for Saudi Arabia expansion. The QR contains:
 *   Tag 1: Seller Name
 *   Tag 2: VAT Registration Number
 *   Tag 3: Invoice Timestamp (ISO 8601)
 *   Tag 4: Invoice Total (with VAT)
 *   Tag 5: VAT Amount
 *
 * Reference: ZATCA E-Invoicing XML Implementation Standard v2.0
 */

function toTlv(tag: number, value: string): Buffer {
  const valueBytes = Buffer.from(value, 'utf-8');
  const header = Buffer.alloc(2);
  header.writeUInt8(tag, 0);
  header.writeUInt8(valueBytes.length, 1);
  return Buffer.concat([header, valueBytes]);
}

export interface ZatcaQrInput {
  sellerName: string;
  vatNumber: string;
  timestamp: string; // ISO 8601, e.g. "2026-06-28T12:00:00Z"
  totalWithVat: number;
  vatAmount: number;
}

/**
 * Encode ZATCA-compliant TLV data and return as a Base64 string.
 * This string can be rendered as a QR code on the invoice PDF.
 */
export function generateZatcaQrBase64(input: ZatcaQrInput): string {
  const tlvParts = [
    toTlv(1, input.sellerName),
    toTlv(2, input.vatNumber),
    toTlv(3, input.timestamp),
    toTlv(4, input.totalWithVat.toFixed(2)),
    toTlv(5, input.vatAmount.toFixed(2)),
  ];
  const combined = Buffer.concat(tlvParts);
  return combined.toString('base64');
}

/**
 * Validate that required ZATCA fields are present for QR generation.
 */
export function canGenerateZatcaQr(input: Partial<ZatcaQrInput>): boolean {
  return !!(
    input.sellerName?.trim() &&
    input.vatNumber?.trim() &&
    input.timestamp &&
    input.totalWithVat != null &&
    input.totalWithVat > 0 &&
    input.vatAmount != null
  );
}
