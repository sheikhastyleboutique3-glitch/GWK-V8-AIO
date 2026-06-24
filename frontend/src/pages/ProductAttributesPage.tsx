import { useTranslation } from 'react-i18next';
import ConfigCrud from '../components/ConfigCrud';

export default function ProductAttributesPage() {
  const { t } = useTranslation();
  return (
    <ConfigCrud
      title={t('nav.productAttributes')}
      subtitle={t('cfg.attributesSubtitle')}
      endpoint="/product-attributes"
      queryKey="product-attributes"
      columns={[
        { key: 'name', label: t('cfg.name') },
        { key: 'displayType', label: t('cfg.displayType') },
        { key: 'values', label: t('cfg.values'), render: (r) => (r.values || []).map((v: any) => v.name).join(', ') || '—' },
      ]}
      fields={[
        { key: 'name', label: t('cfg.name') },
        { key: 'nameAr', label: t('cfg.nameAr') },
        { key: 'displayType', label: t('cfg.displayType'), type: 'select', default: 'SELECT', options: [
          { value: 'RADIO', label: 'Radio' }, { value: 'SELECT', label: 'Select' }, { value: 'COLOR', label: 'Color' }, { value: 'MULTI', label: 'Multi' },
        ] },
      ]}
    />
  );
}
