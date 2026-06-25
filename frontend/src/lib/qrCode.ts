/**
 * Minimal QR code placeholder generator.
 * In production, use a proper QR library (qrcode.react or similar).
 * This generates a fake "QR-like" SVG for demo purposes.
 * Replace with: import QRCode from 'qrcode'; QRCode.toDataURL(data)
 */
export function generateQrSvg(data: string, size = 200): string {
  // Simple visual representation — in production use a real QR encoder
  const escaped = data.replace(/[<>&"']/g, '');
  const cells = 21; // QR version 1 is 21x21
  const cellSize = size / cells;

  // Generate a deterministic pattern from the data string
  let seed = 0;
  for (let i = 0; i < data.length; i++) seed = ((seed << 5) - seed + data.charCodeAt(i)) | 0;

  const modules: boolean[][] = [];
  for (let r = 0; r < cells; r++) {
    modules[r] = [];
    for (let c = 0; c < cells; c++) {
      // Finder patterns (top-left, top-right, bottom-left)
      const inFinderTL = r < 7 && c < 7;
      const inFinderTR = r < 7 && c >= cells - 7;
      const inFinderBL = r >= cells - 7 && c < 7;
      if (inFinderTL || inFinderTR || inFinderBL) {
        const fr = inFinderTL ? r : inFinderTR ? r : r - (cells - 7);
        const fc = inFinderTL ? c : inFinderTR ? c - (cells - 7) : c;
        modules[r][c] = (fr === 0 || fr === 6 || fc === 0 || fc === 6) ||
          (fr >= 2 && fr <= 4 && fc >= 2 && fc <= 4);
      } else {
        // Pseudo-random data modules
        seed = (seed * 1664525 + 1013904223) | 0;
        modules[r][c] = (seed >>> 16) % 3 !== 0;
      }
    }
  }

  let rects = '';
  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      if (modules[r][c]) {
        rects += `<rect x="${c * cellSize}" y="${r * cellSize}" width="${cellSize}" height="${cellSize}" />`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="white"/><g fill="black">${rects}</g></svg>`;
}

export function qrToDataUrl(data: string, size = 200): string {
  const svg = generateQrSvg(data, size);
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
