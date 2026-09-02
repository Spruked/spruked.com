'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Section } from '@/components/ui/Section';
import { PRODUCT_CATALOG, formatUsd, type ProductSku } from '@/lib/commerce';
import { useCart } from '@/components/commerce/useCart';

const ADDABLE_SKUS = Object.keys(PRODUCT_CATALOG) as ProductSku[];

export default function CartPageClient() {
  const params = useSearchParams();
  const { hydrated, items, totals, addItem, updateQuantity, removeItem, clearCart } = useCart();

  const selectedSku = useMemo(() => {
    const value = params.get('add');
    if (!value) return null;
    return ADDABLE_SKUS.includes(value as ProductSku) ? (value as ProductSku) : null;
  }, [params]);

  useEffect(() => {
    if (!hydrated || !selectedSku) return;
    addItem(selectedSku, 1);
  }, [hydrated, selectedSku, addItem]);

  return (
    <Section className="mx-auto max-w-6xl pt-16 pb-24">
      <h1 className="mb-4 text-5xl font-black leading-tight sm:text-7xl">
        Your <span className="text-truth">Cart</span>
      </h1>
      <p className="mb-10 max-w-3xl text-lg text-gray-400">
        Confirm the services you want to start. You can adjust quantity, remove items, and continue directly to checkout.
      </p>

      <div className="grid gap-8 lg:grid-cols-[1.7fr_1fr]">
        <div className="rounded-2xl border border-gray-800 bg-[#050505] p-6 sm:p-8">
          {!hydrated ? (
            <p className="text-gray-400">Loading cart...</p>
          ) : items.length === 0 ? (
            <div className="space-y-4">
              <p className="text-gray-300">Your cart is empty.</p>
              <p className="text-gray-500">Start with one of the core offerings below.</p>
              <div className="grid gap-4 pt-3 sm:grid-cols-2">
                {ADDABLE_SKUS.map((sku) => {
                  const product = PRODUCT_CATALOG[sku];
                  return (
                    <button
                      key={sku}
                      type="button"
                      onClick={() => addItem(sku, 1)}
                      className="rounded-xl border border-gray-800 bg-black/50 p-4 text-left transition hover:border-gray-600"
                    >
                      <p className="mb-1 text-sm uppercase tracking-widest text-gray-500">{product.sku}</p>
                      <p className="text-lg font-semibold text-light">{product.name}</p>
                      <p className="mt-2 text-sm text-gray-400">{product.description}</p>
                      <p className="mt-4 text-truth">{formatUsd(product.unitPrice)}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.sku} className="rounded-xl border border-gray-800 bg-black/40 p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="mb-1 text-xs uppercase tracking-widest text-gray-500">{item.sku}</p>
                      <p className="text-xl font-semibold text-light">{item.name}</p>
                      <p className="mt-1 text-sm text-gray-400">Unit price: {formatUsd(item.unitPrice)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.sku, item.quantity - 1)}
                        className="h-9 w-9 rounded-full border border-gray-700 text-gray-300 hover:text-light"
                        aria-label={`Decrease quantity for ${item.name}`}
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-light">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.sku, item.quantity + 1)}
                        className="h-9 w-9 rounded-full border border-gray-700 text-gray-300 hover:text-light"
                        aria-label={`Increase quantity for ${item.name}`}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(item.sku)}
                        className="ml-2 rounded-full border border-gray-700 px-4 py-2 text-xs uppercase tracking-widest text-gray-400 hover:text-light"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="h-fit rounded-2xl border border-gray-800 bg-black/50 p-6" data-orb-target="spruked.cart.summary">
          <h2 className="mb-5 text-xl font-bold uppercase tracking-widest text-light">Summary</h2>
          <div className="space-y-2 text-sm text-gray-400">
            <p className="flex items-center justify-between"><span>Items</span><span>{totals.count}</span></p>
            <p className="flex items-center justify-between"><span>Subtotal</span><span>{formatUsd(totals.subtotal)}</span></p>
            <p className="flex items-center justify-between"><span>Platform fee</span><span>{formatUsd(totals.fees)}</span></p>
            <p className="mt-3 flex items-center justify-between border-t border-gray-800 pt-3 text-base text-light">
              <span>Total</span>
              <span>{formatUsd(totals.total)}</span>
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <Button asChild className="w-full justify-center" disabled={items.length === 0}>
              <Link href="/checkout">Proceed to Checkout</Link>
            </Button>
            <Button variant="outline" className="w-full justify-center" onClick={clearCart} disabled={items.length === 0}>
              Clear Cart
            </Button>
            <Button variant="outline" asChild className="w-full justify-center">
              <Link href="/products">Continue Browsing</Link>
            </Button>
          </div>
        </aside>
      </div>
    </Section>
  );
}
