import { useTranslation } from 'react-i18next';
import ConfigCrud from '../components/ConfigCrud';

export default function IotDevicesPage() {
  const { t } = useTranslation();
  return (
    <ConfigCrud
      title={t('nav.iotDevices')}
      subtitle={t('cfg.iotSubtitle')}
      endpoint="/iot-devices"
      queryKey="iot-devices"
      columns={[
        { key: 'name', label: t('cfg.name') },
        { key: 'type', label: t('cfg.type') },
        { key: 'connection', label: t('cfg.connection') },
        { key: 'ipAddress', label: t('cfg.ipAddress') },
      ]}
      fields={[
        { key: 'branchId', label: t('cfg.branchId'), type: 'number', default: 1 },
        { key: 'name', label: t('cfg.name') },
        { key: 'type', label: t('cfg.type'), type: 'select', default: 'BARCODE_SCANNER', options: [
          { value: 'IOT_BOX', label: 'IoT Box' }, { value: 'RECEIPT_PRINTER', label: 'Receipt printer' }, { value: 'KITCHEN_PRINTER', label: 'Kitchen printer' },
          { value: 'BARCODE_SCANNER', label: 'Barcode scanner' }, { value: 'SCALE', label: 'Scale' }, { value: 'CUSTOMER_DISPLAY', label: 'Customer display' },
          { value: 'CASH_DRAWER', label: 'Cash drawer' }, { value: 'PAYMENT_TERMINAL', label: 'Payment terminal' },
        ] },
        { key: 'connection', label: t('cfg.connection'), type: 'select', default: 'IP', options: [
          { value: 'IP', label: 'IP' }, { value: 'USB', label: 'USB' }, { value: 'IOT', label: 'IoT' },
        ] },
        { key: 'ipAddress', label: t('cfg.ipAddress'), placeholder: '192.168.1.x' },
        { key: 'identifier', label: t('cfg.identifier') },
      ]}
    />
  );
}
