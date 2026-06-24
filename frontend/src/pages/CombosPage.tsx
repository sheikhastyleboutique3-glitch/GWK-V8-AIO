import { useTranslation } from 'react-i18next';
import ConfigCrud from '../components/ConfigCrud';

export default function CombosPage() {
  const { t } = useTranslation();
  return (
    <ConfigCrud
      title={t('nav.combos')}
      subtitle={t('cfg.combosSubtitle')}
      endpoint="/combos"
      queryKey="combos"
      columns={[
        { key: 'name', label: t('cfg.name') },
        { key: 'basePrice', label: t('cfg.basePrice'), align: 'end' },
        { key: 'lines', label: t('cfg.choices'), render: (r) => (r.lines?.length ?? 0) },
      ]}
      fields={[
        { key: 'name', label: t('cfg.name') },
        { key: 'nameAr', label: t('cfg.nameAr') },
        { key: 'basePrice', label: t('cfg.basePrice'), type: 'number', step: '0.5' },
      ]}
    />
  );
}
