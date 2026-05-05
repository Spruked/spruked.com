export type ProductSku = 'alpha-certsig-license' | 'truemark-mint-object' | 'goat-legacy-session';

export interface CatalogItem {
  sku: ProductSku;
  name: string;
  description: string;
  unitPrice: number;
}

export interface CartItem {
  sku: ProductSku;
  name: string;
  unitPrice: number;
  quantity: number;
}

export const PRODUCT_CATALOG: Record<ProductSku, CatalogItem> = {
  'alpha-certsig-license': {
    sku: 'alpha-certsig-license',
    name: 'Alpha CertSig License',
    description: 'Self-hosted license package for sovereign mint infrastructure.',
    unitPrice: 249900,
  },
  'truemark-mint-object': {
    sku: 'truemark-mint-object',
    name: 'TrueMark Object Mint',
    description: 'Structured minting flow for one verified knowledge object.',
    unitPrice: 29900,
  },
  'goat-legacy-session': {
    sku: 'goat-legacy-session',
    name: 'GOAT Legacy Session',
    description: 'Intake and strategy session for a legacy preservation project.',
    unitPrice: 99000,
  },
};

export const CART_STORAGE_KEY = 'spruked_cart_v1';

export function formatUsd(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
