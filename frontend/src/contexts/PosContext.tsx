/**
 * POS Context — Centralized state management for the POS terminal.
 *
 * Eliminates the 35+ prop drilling between POSPage → CartPanel → sub-components.
 * All POS state lives here; components consume via usePosContext().
 *
 * Architecture:
 *   POSPage (orchestrator) → PosProvider wraps the order view
 *   CartPanel, ProductCatalog, PaymentScreen → usePosContext() for shared state
 *
 * This is a FUTURE refactor target. Currently the props are passed directly
 * (which works fine). This context is provided as the foundation for Sprint 2
 * when we decompose the prop chain.
 *
 * Usage:
 *   import { PosProvider, usePosContext } from '../contexts/PosContext';
 *   // In POSPage: <PosProvider value={posState}>...</PosProvider>
 *   // In CartPanel: const { cart, setCart, total } = usePosContext();
 */
import { createContext, useContext } from 'react';
import type { CartLine } from '../pages/pos/CartPanel';

type Channel = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'QR' | 'TALABAT' | 'SNOONU' | 'AGGREGATOR';
type PayMethod = 'CASH' | 'CARD' | 'GIFT_CARD' | 'STORE_CREDIT' | 'LOYALTY' | 'AGGREGATOR' | 'LOYALTY_CARD' | 'TERMINAL' | 'QR' | 'ON_ACCOUNT';

export interface Tender {
  method: PayMethod;
  amount: number;
  giftCardCode?: string;
  loyaltyCode?: string;
  terminalId?: number;
}

export interface PosState {
  // Identity
  branchId: number | undefined;
  mode: 'new' | 'existing';

  // Cart
  cart: CartLine[];
  setCart: React.Dispatch<React.SetStateAction<CartLine[]>>;
  lines: CartLine[];
  comboCart: { comboId: number; name: string; price: number; choiceIds: number[] }[];
  setComboCart: React.Dispatch<React.SetStateAction<{ comboId: number; name: string; price: number; choiceIds: number[] }[]>>;

  // Order context
  channel: Channel;
  setChannel: (c: Channel) => void;
  tableName: string;
  setTableName: (t: string) => void;
  loadedOrderId: number | null;
  setLoadedOrderId: (id: number | null) => void;
  loadedOrder: any;

  // Financials
  subtotal: number;
  total: number;
  tipAmount: number;
  setTipAmount: (t: number) => void;
  tenders: Tender[];
  setTenders: React.Dispatch<React.SetStateAction<Tender[]>>;

  // Customer
  customer: any;
  setCustomer: (c: any) => void;

  // Coupon/Discount
  couponCode: string;
  setCouponCode: (c: string) => void;
  coupon: { code: string; discount: number } | null;
  setCoupon: (c: { code: string; discount: number } | null) => void;
  discountRuleId: number | '';
  setDiscountRuleId: (id: number | '') => void;

  // Session
  posSession: any;
  businessInfo: any;

  // UI state
  showPayment: boolean;
  setShowPayment: (v: boolean) => void;
  lastReceipt: any;
  setLastReceipt: (r: any) => void;

  // Actions
  refetchLoaded: () => void;
  canRefund: boolean;
  shipLater: boolean;
  setShipLater: (v: boolean) => void;
}

const PosContext = createContext<PosState | null>(null);

export function PosProvider({ children, value }: { children: React.ReactNode; value: PosState }) {
  return <PosContext.Provider value={value}>{children}</PosContext.Provider>;
}

export function usePosContext(): PosState {
  const ctx = useContext(PosContext);
  if (!ctx) throw new Error('usePosContext must be used within PosProvider');
  return ctx;
}

export default PosContext;
