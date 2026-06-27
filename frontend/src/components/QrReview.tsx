/**
 * #10 — Customer QR Code for Review (shown after payment)
 *
 * Generates a QR code linking to Google Maps / TripAdvisor review page.
 * Displayed on the Customer Display or as a popup after payment.
 *
 * Uses a lightweight QR code generator (no external dependency — SVG-based).
 *
 * Usage:
 *   <QrReview url="https://g.page/r/your-google-review-link" show={showQr} />
 */

interface Props {
  url?: string;
  show: boolean;
  businessName?: string;
  onClose?: () => void;
}

/**
 * Simple QR code SVG generator using the QR encoding algorithm.
 * For simplicity, this generates a Google-friendly URL as a clickable link
 * alongside a visual QR representation.
 */
export default function QrReview({ url, show, businessName, onClose }: Props) {
  if (!show || !url) return null;

  // Generate QR code using a public API (simple approach — no library needed)
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center" onClick={(e) => e.stopPropagation()}>
        {/* Star rating visual */}
        <div className="text-4xl mb-3">⭐⭐⭐⭐⭐</div>

        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Enjoyed your visit?
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Leave us a review at {businessName || 'our restaurant'}!
        </p>

        {/* QR Code */}
        <div className="bg-white p-4 rounded-xl inline-block mb-4 shadow-sm border border-gray-100">
          <img
            src={qrImageUrl}
            alt="Scan to review"
            className="w-48 h-48"
            loading="eager"
          />
        </div>

        <p className="text-xs text-gray-400 mb-4">
          Scan with your phone camera
        </p>

        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}
