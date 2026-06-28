/**
 * Product change events — emitted by ProductsService when products are
 * created, updated, toggled (86), archived, or restored. The RealtimeGateway
 * picks these up and broadcasts to connected POS / Menu / KDS clients so they
 * update instantly instead of waiting for the next poll cycle.
 */

export const PRODUCT_CHANGED = 'product.changed';

export interface ProductChangedEvent {
  productId: number;
  action: 'availability' | 'update' | 'create' | 'archive' | 'restore' | 'delete';
  branchId?: number;
  /** Subset of changed fields for quick client-side decisions */
  data?: {
    isAvailable?: boolean;
    name?: string;
    salePrice?: number;
    categoryId?: number;
    imageUrl?: string;
  };
}
