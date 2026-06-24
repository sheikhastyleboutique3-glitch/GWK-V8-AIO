import { useTranslation } from 'react-i18next';
import ConfigCrud from '../components/ConfigCrud';

export default function FiscalPositionsPage() {
  const { t } = useTranslation();
  return (
    <ConfigCrud
      title={t('nav.fiscalPositions')}
      subtitle={t('cfg.fiscalSubtitle')}
      endpoint="/fiscal-positions"
      queryKey="fiscal-positions"
      columns={[
        { key: 'name', label: t('cfg.name') },
        { key: 'isTakeout', label: t('cfg.isTakeout'), render: (r) => (r.isTakeout ? '✓' : '—') },
      ]}
      fields={[
        { key: 'name', label: t('cfg.name') },
        { key: 'nameAr', label: t('cfg.nameAr') },
        { key: 'isTakeout', label: t('cfg.isTakeout'), type: 'checkbox', default: false },
      ]}
    />
  );
}
