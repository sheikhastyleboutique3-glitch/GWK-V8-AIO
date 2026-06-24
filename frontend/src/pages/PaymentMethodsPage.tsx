import { useTranslation } from 'react-i18next';
import ConfigCrud from '../components/ConfigCrud';

export default function PaymentMethodsPage() {
  const { t } = useTranslation();
  return (
    <ConfigCrud
      title={t('nav.paymentMethods')}
      subtitle={t('cfg.paymentMethodsSubtitle')}
      endpoint="/payment-methods"
      queryKey="payment-methods"
      columns={[
        { key: 'name', label: t('cfg.name') },
        { key: 'type', label: t('cfg.type') },
        { key: 'integration', label: t('cfg.integration') },
      ]}
      fields={[
        { key: 'name', label: t('cfg.name') },
        { key: 'type', label: t('cfg.type'), type: 'select', default: 'CASH', options: [
          { value: 'CASH', label: 'Cash' }, { value: 'BANK', label: 'Bank/Card' }, { value: 'WALLET', label: 'Wallet' },
          { value: 'AGGREGATOR', label: 'Aggregator' }, { value: 'GIFT_CARD', label: 'Gift card' }, { value: 'LOYALTY', label: 'Loyalty' }, { value: 'STORE_CREDIT', label: 'Store credit' },
        ] },
        { key: 'integration', label: t('cfg.integration'), type: 'select', default: 'NONE', options: [
          { value: 'NONE', label: 'None' }, { value: 'TERMINAL', label: 'Terminal' }, { value: 'QR_BANK', label: 'QR bank' },
          { value: 'CASH_MACHINE', label: 'Cash machine' }, { value: 'ONLINE', label: 'Online' }, { value: 'DELIVERY', label: 'Delivery' },
        ] },
        { key: 'isCashCount', label: t('cfg.isCashCount'), type: 'checkbox', default: false },
        { key: 'opensDrawer', label: t('cfg.opensDrawer'), type: 'checkbox', default: false },
        { key: 'sortOrder', label: t('cfg.sortOrder'), type: 'number' },
      ]}
    />
  );
}
