import { useTranslation } from 'react-i18next';
import ConfigCrud from '../components/ConfigCrud';

export default function SelfOrderConfigsPage() {
  const { t } = useTranslation();
  return (
    <ConfigCrud
      title={t('nav.selfOrder')}
      subtitle={t('cfg.selfOrderSubtitle')}
      endpoint="/self-order-configs"
      queryKey="self-order-configs"
      columns={[
        { key: 'name', label: t('cfg.name') },
        { key: 'mode', label: t('cfg.mode') },
        { key: 'requireTable', label: t('cfg.requireTable'), render: (r) => (r.requireTable ? '✓' : '—') },
      ]}
      fields={[
        { key: 'branchId', label: t('cfg.branchId'), type: 'number', default: 1 },
        { key: 'name', label: t('cfg.name') },
        { key: 'mode', label: t('cfg.mode'), type: 'select', default: 'QR_TABLE', options: [
          { value: 'KIOSK', label: 'Kiosk' }, { value: 'QR_TABLE', label: 'QR at table' }, { value: 'MOBILE', label: 'Mobile' },
        ] },
        { key: 'payOnline', label: t('cfg.payOnline'), type: 'checkbox', default: false },
        { key: 'requireTable', label: t('cfg.requireTable'), type: 'checkbox', default: true },
      ]}
    />
  );
}
