import { useTranslation } from 'react-i18next';
import ConfigCrud from '../components/ConfigCrud';

export default function CashRoundingsPage() {
  const { t } = useTranslation();
  return (
    <ConfigCrud
      title={t('nav.cashRoundings')}
      subtitle={t('cfg.roundingSubtitle')}
      endpoint="/cash-roundings"
      queryKey="cash-roundings"
      columns={[
        { key: 'name', label: t('cfg.name') },
        { key: 'precision', label: t('cfg.precision'), align: 'end' },
        { key: 'strategy', label: t('cfg.strategy') },
      ]}
      fields={[
        { key: 'name', label: t('cfg.name') },
        { key: 'precision', label: t('cfg.precision'), type: 'number', default: 0.05, step: '0.01' },
        { key: 'strategy', label: t('cfg.strategy'), type: 'select', default: 'ADD_ROUND_LINE', options: [
          { value: 'ADD_ROUND_LINE', label: 'Add rounding line' }, { value: 'BIGGEST_TAX', label: 'Biggest tax' },
        ] },
      ]}
    />
  );
}
