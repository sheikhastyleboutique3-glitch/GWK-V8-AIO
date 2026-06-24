import { useTranslation } from 'react-i18next';
import ConfigCrud from '../components/ConfigCrud';

export default function PaymentTerminalsPage() {
  const { t } = useTranslation();
  return (
    <ConfigCrud
      title={t('nav.paymentTerminals')}
      subtitle={t('cfg.terminalsSubtitle')}
      endpoint="/payment-terminals"
      queryKey="payment-terminals"
      columns={[
        { key: 'name', label: t('cfg.name') },
        { key: 'provider', label: t('cfg.provider') },
        { key: 'identifier', label: t('cfg.identifier') },
      ]}
      fields={[
        { key: 'name', label: t('cfg.name') },
        { key: 'provider', label: t('cfg.provider'), type: 'select', default: 'STRIPE', options: [
          { value: 'ADYEN', label: 'Adyen' }, { value: 'STRIPE', label: 'Stripe' }, { value: 'VIVA', label: 'Viva' },
          { value: 'SIX', label: 'SIX' }, { value: 'WORLDLINE', label: 'Worldline' }, { value: 'RAZORPAY', label: 'Razorpay' }, { value: 'MERCADO_PAGO', label: 'Mercado Pago' },
        ] },
        { key: 'identifier', label: t('cfg.identifier'), placeholder: 'tmr_xxx / serial' },
      ]}
    />
  );
}
