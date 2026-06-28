/**
 * #4 — Email Template Editor
 *
 * Simple rich-text editor for email templates (EOD report, order confirmation,
 * customer notifications). Stores templates in the Settings table.
 *
 * Templates support variables like {{orderNo}}, {{total}}, {{customerName}}.
 *
 * Usage:
 *   <EmailTemplateEditor
 *     templateKey="eod_report_template"
 *     variables={['date', 'totalRevenue', 'orderCount', 'topProducts']}
 *   />
 */
import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';

interface Props {
  templateKey: string;
  title?: string;
  variables?: string[];
}

const DEFAULT_TEMPLATES: Record<string, string> = {
  eod_report_template: `<h2>End of Day Report — {{date}}</h2>
<p>Dear Manager,</p>
<p>Here is today's summary:</p>
<ul>
  <li><strong>Total Revenue:</strong> {{currency}} {{totalRevenue}}</li>
  <li><strong>Orders:</strong> {{orderCount}}</li>
  <li><strong>Average Ticket:</strong> {{currency}} {{avgTicket}}</li>
  <li><strong>Gross Profit:</strong> {{currency}} {{grossProfit}} ({{gpPercent}}%)</li>
</ul>
<h3>Top Products</h3>
{{topProducts}}
<p>Best regards,<br/>GWK System</p>`,
  order_confirmation_template: `<h2>Order Confirmed!</h2>
<p>Hi {{customerName}},</p>
<p>Your order <strong>{{orderNo}}</strong> has been confirmed.</p>
<p><strong>Total:</strong> {{currency}} {{total}}</p>
<p>Thank you for your order!</p>`,
  low_stock_alert_template: `<h2>⚠️ Low Stock Alert</h2>
<p>The following items are below minimum stock level:</p>
{{items}}
<p>Please review and reorder.</p>`,
};

export default function EmailTemplateEditor({ templateKey, title, variables = [] }: Props) {
  const qc = useQueryClient();
  const [content, setContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // Load template from settings
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then(r => r.data.data),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (settings) {
      const found = settings.find((s: any) => s.key === templateKey);
      setContent(found?.value || DEFAULT_TEMPLATES[templateKey] || '');
    }
  }, [settings, templateKey]);

  const saveMut = useMutation({
    mutationFn: () => api.post('/settings/bulk', { settings: [{ key: templateKey, value: content }] }),
    onSuccess: () => { toast.success('Template saved'); qc.invalidateQueries({ queryKey: ['settings'] }); },
    onError: () => toast.error('Failed to save'),
  });

  // Generate preview with sample data
  const preview = content
    .replace(/\{\{date\}\}/g, new Date().toLocaleDateString())
    .replace(/\{\{currency\}\}/g, 'QAR')
    .replace(/\{\{totalRevenue\}\}/g, '4,520.00')
    .replace(/\{\{orderCount\}\}/g, '47')
    .replace(/\{\{avgTicket\}\}/g, '96.17')
    .replace(/\{\{grossProfit\}\}/g, '2,890.00')
    .replace(/\{\{gpPercent\}\}/g, '63.9')
    .replace(/\{\{customerName\}\}/g, 'Ahmed Ali')
    .replace(/\{\{orderNo\}\}/g, 'ORD-20260627-B2-00047')
    .replace(/\{\{total\}\}/g, '145.50')
    .replace(/\{\{topProducts\}\}/g, '<ol><li>Cappuccino (23)</li><li>Croissant (18)</li><li>Grilled Chicken (15)</li></ol>')
    .replace(/\{\{items\}\}/g, '<ul><li>Milk (2L) — 3 left (min: 10)</li><li>Coffee Beans — 1kg left (min: 5kg)</li></ul>');

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          📧 {title || 'Email Template'}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="px-3 py-1 rounded-lg text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            {showPreview ? '✏️ Edit' : '👁 Preview'}
          </button>
          <button
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending}
            className="px-3 py-1 rounded-lg text-xs bg-primary text-white disabled:opacity-50"
          >
            {saveMut.isPending ? '...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Available variables */}
      {variables.length > 0 && !showPreview && (
        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-800">
          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">Available variables: </span>
          {variables.map(v => (
            <button
              key={v}
              onClick={() => setContent(c => c + `{{${v}}}`)}
              className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 mx-0.5 hover:bg-blue-200 font-mono"
            >
              {`{{${v}}}`}
            </button>
          ))}
        </div>
      )}

      {/* Editor / Preview */}
      {showPreview ? (
        <div className="p-4 prose prose-sm dark:prose-invert max-w-none min-h-[200px]" dangerouslySetInnerHTML={{ __html: preview }} />
      ) : (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={12}
          className="w-full p-4 text-sm font-mono bg-white dark:bg-gray-900 border-0 focus:outline-none resize-y min-h-[200px]"
          placeholder="Enter HTML template..."
        />
      )}
    </div>
  );
}
