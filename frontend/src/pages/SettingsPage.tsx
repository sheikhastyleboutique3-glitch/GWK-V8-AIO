import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});
  const { data: settings, isLoading } = useQuery({ queryKey: ['settings'], queryFn: () => api.get('/settings').then(r => r.data.data) });
  useEffect(() => { if (settings) { const map: Record<string, string> = {}; settings.forEach((s: any) => { map[s.key] = s.value; }); setLocalSettings(map); } }, [settings]);
  const saveMutation = useMutation({ mutationFn: (data: any) => api.post('/settings/bulk', { settings: data }), onSuccess: () => { toast.success('Settings saved'); qc.invalidateQueries({ queryKey: ['settings'] }); }, onError: (e: any) => toast.error(e.response?.data?.message || 'Failed') });
  const handleSave = () => {
    // Include the correct group for each setting key so backend stores them properly
    const keyToGroup: Record<string, string> = {};
    settingGroups.forEach(g => g.keys.forEach(k => { keyToGroup[k] = g.group; }));
    const data = Object.entries(localSettings).map(([key, value]) => ({ key, value, group: keyToGroup[key] || 'general' }));
    saveMutation.mutate(data);
  };
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const formData = new FormData(); formData.append('logo', file);
    try { const res = await api.post('/settings/upload-logo', formData, { headers: { 'Content-Type': 'multipart/form-data' } }); setLocalSettings(p => ({ ...p, company_logo: res.data.data.url })); toast.success('Logo uploaded'); } catch { toast.error('Upload failed'); }
  };
  if (isLoading) return <LoadingSpinner />;
  const settingGroups = [
    { group: 'branding', label: '\ud83c\udfa8 ' + t('settings.companyInfo'), keys: ['company_logo'] },
    { group: 'general', label: '\ud83c\udfe2 ' + t('settings.companyInfo'), keys: ['company_name', 'company_name_ar', 'company_tax_id', 'company_address', 'company_phone', 'company_email'] },
    { group: 'pos', label: '\ud83d\udecd\ufe0f POS & Sales', keys: ['pos.requireOpenSession', 'pos.allowNegativeStock'] },
    { group: 'finance', label: '\ud83d\udcb0 Finance & Currency', keys: ['default_currency', 'supported_currencies'] },
    { group: 'inventory', label: '\ud83d\udce6 Inventory', keys: ['expiry_warning_days', 'low_stock_alert'] },
    { group: 'localization', label: '\ud83c\udf0d Localization', keys: ['default_language'] },
    { group: 'review', label: '\u2b50 Customer Reviews', keys: ['review_url'] },
    { group: 'staff_perf', label: '\ud83d\udcca Staff Performance', keys: ['staff_performance_enabled'] },
    { group: 'digital_menu', label: '\ud83d\udcf1 Digital Menu (QR)', keys: ['menu_banner_url', 'theme_brand_color', 'menu_enable_ordering', 'menu_show_prices', 'menu_closed_message', 'menu_footer_text', 'menu_3d_effects'] },
  ];
  return (
    <div className="max-w-2xl">
      <PageHeader title={t('nav.settings')} subtitle="System configuration" />
      <div className="space-y-5">
        {settingGroups.map(group => (<div key={group.group} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"><div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50"><h3 className="font-semibold text-gray-900 dark:text-gray-100">{group.label}</h3></div><div className="p-5 space-y-4">
          {group.keys.map(key => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</label>
              {key === 'company_logo' ? (
                <div className="flex items-center gap-4">
                  {localSettings[key] && <img src={localSettings[key]} alt="Logo" className="h-12 w-auto rounded" />}
                  <input type="file" accept="image/png,image/svg+xml,image/jpeg" onChange={handleLogoUpload} className="text-sm" />
                </div>
              ) : key === 'menu_banner_url' ? (
                <div className="space-y-2">
                  {localSettings[key] && <img src={localSettings[key]} alt="Banner" className="w-full h-24 object-cover rounded-xl" />}
                  <div className="flex gap-2">
                    <input value={localSettings[key] || ''} onChange={e => setLocalSettings(p => ({ ...p, [key]: e.target.value }))} placeholder="https://... or upload below" className="flex-1 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm" />
                    <label className="px-3 py-2 bg-primary text-white text-sm rounded-xl cursor-pointer font-medium">
                      Upload
                      <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0]; if (!file) return;
                        const fd = new FormData(); fd.append('file', file);
                        try { const res = await api.post('/uploads', fd, { headers: { 'Content-Type': 'multipart/form-data' } }); setLocalSettings(p => ({ ...p, [key]: res.data.data.url })); toast.success('Banner uploaded'); } catch { toast.error('Upload failed'); }
                      }} />
                    </label>
                  </div>
                  <p className="text-xs text-gray-400">Recommended: 1200×400px landscape image. Shows at the top of your digital menu.</p>
                </div>
              ) : key.includes('color') ? (
                <div className="flex items-center gap-3"><input type="color" value={localSettings[key] || '#2563eb'} onChange={e => setLocalSettings(p => ({ ...p, [key]: e.target.value }))} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer" /><input value={localSettings[key] || ''} onChange={e => setLocalSettings(p => ({ ...p, [key]: e.target.value }))} className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm" /></div>
              ) : key.startsWith('pos.') || key === 'staff_performance_enabled' || key === 'menu_enable_ordering' || key === 'menu_show_prices' || key === 'menu_3d_effects' ? (
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex cursor-pointer">
                    <input type="checkbox" checked={localSettings[key] === 'true'} onChange={e => setLocalSettings(p => ({ ...p, [key]: e.target.checked ? 'true' : 'false' }))} className="sr-only peer" />
                    <div className="w-10 h-5 rounded-full bg-gray-300 dark:bg-gray-600 peer-checked:bg-emerald-500 transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-transform peer-checked:after:translate-x-5" />
                  </label>
                  <span className="text-xs text-gray-500">{localSettings[key] === 'true' ? 'Enabled' : 'Disabled'}</span>
                </div>
              ) : (
                <input value={localSettings[key] || ''} onChange={e => setLocalSettings(p => ({ ...p, [key]: e.target.value }))} placeholder={key === 'review_url' ? 'https://g.page/your-restaurant/review' : key === 'menu_closed_message' ? 'We are currently closed. See you soon!' : key === 'menu_footer_text' ? 'Follow us @yourrestaurant' : ''} className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                {key === 'review_url' && <p className="text-xs text-gray-400 mt-1">Google Maps review link or any review platform URL. Shows as "⭐ Leave a Review" button on your digital menu.</p>}
                {key === 'theme_brand_color' && <p className="text-xs text-gray-400 mt-1">Your restaurant's brand color. Used for buttons, tabs, and accents on the digital menu.</p>}
              )}
            </div>
          ))}
        </div></div>))}
        <button onClick={handleSave} disabled={saveMutation.isPending} className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white font-semibold py-3 rounded-xl">{saveMutation.isPending ? 'Saving...' : t('common.save') + ' Settings'}</button>
      </div>
    </div>
  );
}
