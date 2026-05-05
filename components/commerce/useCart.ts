'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CART_STORAGE_KEY, PRODUCT_CATALOG, type CartItem, type ProductSku } from '@/lib/commerce';

function readCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ({
        sku: item?.sku,
        name: String(item?.name || ''),
        unitPrice: Number(item?.unitPrice || 0),
        quantity: Math.max(1, Number(item?.quantity || 1)),
      }))
      .filter((item) => typeof item.sku === 'string' && item.name && item.unitPrice > 0);
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(readCart());
    setHydrated(true);
  }, []);

  const save = useCallback((nextItems: CartItem[]) => {
    setItems(nextItems);
    writeCart(nextItems);
  }, []);

  const addItem = useCallback(
    (sku: ProductSku, quantity = 1) => {
      const product = PRODUCT_CATALOG[sku];
      if (!product) return;
      const qty = Math.max(1, Math.floor(quantity));
      const existing = items.find((item) => item.sku === sku);
      if (existing) {
        save(
          items.map((item) =>
            item.sku === sku ? { ...item, quantity: item.quantity + qty } : item,
          ),
        );
        return;
      }
      save([...items, { sku, name: product.name, unitPrice: product.unitPrice, quantity: qty }]);
    },
    [items, save],
  );

  const updateQuantity = useCallback(
    (sku: ProductSku, quantity: number) => {
      const qty = Math.max(1, Math.floor(quantity));
      save(items.map((item) => (item.sku === sku ? { ...item, quantity: qty } : item)));
    },
    [items, save],
  );

  const removeItem = useCallback(
    (sku: ProductSku) => {
      save(items.filter((item) => item.sku !== sku));
    },
    [items, save],
  );

  const clearCart = useCallback(() => {
    save([]);
  }, [save]);

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const fees = Math.round(subtotal * 0.03);
    const total = subtotal + fees;
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    return { subtotal, fees, total, count };
  }, [items]);

  return {
    hydrated,
    items,
    totals,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
  };
}
