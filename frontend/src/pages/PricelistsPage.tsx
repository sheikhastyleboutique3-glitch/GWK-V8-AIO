import { useTranslation } from 'react-i18next';
import ConfigCrud from '../components/ConfigCrud';

export default function PricelistsPage() {
  const { t } = useTranslation();
  return (
    <ConfigCrud
      title={t('nav.pricelists')}
      subtitle={t('cfg.pricelistsSubtitle')}
      endpoint="/pricelists"
      queryKey="pricelists"
      columns={[
        { key: 'name', label: t('cfg.name') },
        { key: 'type', label: t('cfg.type') },
        { key: 'currency', label: t('cfg.currency') },
        { key: 'items', label: t('cfg.rules'), render: (r) => (r.items?.length ?? 0) },
      ]}
      fields={[
        { key: 'name', label: t('cfg.name') },
        { key: 'type', label: t('cfg.type'), type: 'select', default: 'BASE', options: [
          { value: 'BASE', label: 'Base' }, { value: 'CUSTOMER_GROUP', label: 'Customer group' }, { value: 'TIME_WINDOW', label: 'Time window' },
        ] },
        { key: 'currency', label: t('cfg.currency'), default: 'QAR' },
        { key: 'group', label: t('cfg.group') },
      ]}
    />
  );
}
