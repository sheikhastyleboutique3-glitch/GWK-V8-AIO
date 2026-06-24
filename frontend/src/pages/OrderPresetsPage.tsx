import { useTranslation } from 'react-i18next';
import ConfigCrud from '../components/ConfigCrud';

export default function OrderPresetsPage() {
  const { t } = useTranslation();
  return (
    <ConfigCrud
      title={t('nav.orderPresets')}
      subtitle={t('cfg.presetsSubtitle')}
      endpoint="/order-presets"
      queryKey="order-presets"
      columns={[
        { key: 'name', label: t('cfg.name') },
        { key: 'channel', label: t('cfg.channel') },
        { key: 'color', label: t('cfg.color') },
      ]}
      fields={[
        { key: 'name', label: t('cfg.name') },
        { key: 'nameAr', label: t('cfg.nameAr') },
        { key: 'channel', label: t('cfg.channel'), type: 'select', default: 'DINE_IN', options: [
          { value: 'DINE_IN', label: 'Dine In' }, { value: 'TAKEAWAY', label: 'Takeaway' },
          { value: 'DELIVERY', label: 'Delivery' }, { value: 'QR', label: 'QR' },
        ] },
        { key: 'color', label: t('cfg.color'), placeholder: '#16a34a' },
        { key: 'sortOrder', label: t('cfg.sortOrder'), type: 'number' },
      ]}
    />
  );
}
