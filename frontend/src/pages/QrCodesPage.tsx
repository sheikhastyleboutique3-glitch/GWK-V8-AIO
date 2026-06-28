import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import { generateQrSvg, qrToDataUrl } from '../lib/qrCode';

type QrType = 'menu' | 'table' | 'kiosk';

export default function QrCodesPage() {
  const { t } = useTranslation();
  const { activeBranch } = useAuth();
  const [qrType, setQrType] = useState<QrType>('menu');
  const [tableCount, setTableCount] = useState(10);
  const [selectedConfig, setSelectedConfig] = useState<number | ''>('');

  const baseUrl = window.location.origin;

  const { data: branches, isLoading: branchesLoading } = useQuery({
    queryKey: ['branches-qr'],
    queryFn: () => api.get('/branches').then((r) => r.data.data),
  });

  const { data: selfOrderConfigs } = useQuery({
    queryKey: ['self-order-configs-qr'],
    queryFn: () => api.get('/self-order-configs').then((r) => r.data.data),
  });

  const selectedBranchId = activeBranch?.id || (branches?.[0]?.id ?? null);

  // Generate QR codes based on type
  const qrCodes = useMemo(() => {
    if (!selectedBranchId && qrType !== 'kiosk') return [];

    if (qrType === 'menu') {
      // One QR per branch (or just the active branch)
      const branchList = activeBranch ? [activeBranch] : (branches || []);
      return branchList.map((b: any) => ({
        id: `menu-${b.id}`,
        label: `Menu — ${b.name}`,
        sublabel: `/order/${b.id}`,
        url: `${baseUrl}/order/${b.id}`,
      }));
    }

    if (qrType === 'table') {
      // Generate table QR codes for the active branch
      return Array.from({ length: tableCount }, (_, i) => {
        const num = i + 1;
        return {
          id: `table-${num}`,
          label: `Table ${num}`,
          sublabel: `Branch: ${activeBranch?.name || 'All'}`,
          url: `${baseUrl}/order/${selectedBranchId}?table=${num}`,
        };
      });
    }

    if (qrType === 'kiosk') {
      return (selfOrderConfigs || []).map((c: any) => ({
        id: `kiosk-${c.id}`,
        label: c.name,
        sublabel: `Config #${c.id}`,
        url: `${baseUrl}/kiosk/${c.id}`,
      }));
    }

    return [];
  }, [qrType, selectedBranchId, tableCount, branches, activeBranch, selfOrderConfigs, baseUrl]);

  const downloadQr = (url: string, filename: string) => {
    const svg = generateQrSvg(url, 400);
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.svg`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const printAll = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    const html = `
      <!DOCTYPE html>
      <html><head><title>QR Codes</title>
      <style>
        body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 24px; }
        .card { text-align: center; page-break-inside: avoid; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; }
        .card img { width: 160px; height: 160px; }
        .card h3 { margin: 8px 0 4px; font-size: 14px; }
        .card p { font-size: 11px; color: #6b7280; margin: 0; word-break: break-all; }
        @media print { .no-print { display: none; } }
      </style></head><body>
      <h1 class="no-print" style="margin-bottom:16px">QR Codes — ${qrType === 'menu' ? 'Menu' : qrType === 'table' ? 'Tables' : 'Kiosk'}</h1>
      <button class="no-print" onclick="window.print()" style="margin-bottom:16px;padding:8px 16px;cursor:pointer">🖨 Print</button>
      <div class="grid">
        ${qrCodes.map((qr) => `
          <div class="card">
            <img src="${qrToDataUrl(qr.url, 300)}" alt="${qr.label}" />
            <h3>${qr.label}</h3>
            <p>${qr.url}</p>
          </div>
        `).join('')}
      </div>
      </body></html>
    `;
    win.document.write(html);
    win.document.close();
  };

  if (branchesLoading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="QR Code Generator" subtitle="Generate QR codes for digital menu, tables, and kiosk ordering" />

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-6 items-end">
        {/* Type selector */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">QR Type</label>
          <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {([
              { key: 'menu', label: '🍽️ Menu', icon: '' },
              { key: 'table', label: '🪑 Tables', icon: '' },
              { key: 'kiosk', label: '📱 Kiosk', icon: '' },
            ] as { key: QrType; label: string }[]).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setQrType(opt.key)}
                className={`px-4 py-2 text-sm font-medium transition ${
                  qrType === opt.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table count (only for table QR type) */}
        {qrType === 'table' && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Number of tables</label>
            <input
              type="number"
              min={1}
              max={100}
              value={tableCount}
              onChange={(e) => setTableCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
              className="w-24 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            />
          </div>
        )}

        {/* Kiosk config selector */}
        {qrType === 'kiosk' && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Self-Order Config</label>
            <select
              value={selectedConfig}
              onChange={(e) => setSelectedConfig(e.target.value ? parseInt(e.target.value, 10) : '')}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            >
              <option value="">All configs</option>
              {(selfOrderConfigs || []).map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Actions */}
        <div className="ms-auto flex gap-2">
          <button
            onClick={printAll}
            disabled={!qrCodes.length}
            className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            🖨 Print All
          </button>
        </div>
      </div>

      {/* QR Grid */}
      {!qrCodes.length ? (
        <div className="text-center py-12 text-sm text-gray-400">
          {qrType === 'kiosk' ? 'No self-order configs found. Create one first.' : 'Select a branch to generate QR codes.'}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {qrCodes.map((qr) => (
            <div
              key={qr.id}
              className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 text-center hover:shadow-md transition"
            >
              {/* QR Image */}
              <div
                className="mx-auto mb-3 w-36 h-36"
                dangerouslySetInnerHTML={{ __html: generateQrSvg(qr.url, 144) }}
              />
              {/* Label */}
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{qr.label}</div>
              <div className="text-xs text-gray-400 mt-0.5 truncate">{qr.sublabel}</div>
              {/* Actions */}
              <div className="flex gap-1 mt-3 justify-center">
                <button
                  onClick={() => downloadQr(qr.url, qr.label.replace(/[^a-zA-Z0-9]/g, '-'))}
                  className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs hover:bg-gray-200 dark:hover:bg-gray-700"
                  title="Download SVG"
                >
                  ⬇️ SVG
                </button>
                <button
                  onClick={() => { navigator.clipboard.writeText(qr.url); }}
                  className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs hover:bg-gray-200 dark:hover:bg-gray-700"
                  title="Copy link"
                >
                  📋 Copy
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
