'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Section } from '@/components/ui/Section';
import { formatUsd } from '@/lib/commerce';
import { useCart } from '@/components/commerce/useCart';

export default function CheckoutPageClient() {
  const { hydrated, items, totals, clearCart } = useCart();
  const [submitted, setSubmitted] = useState(false);

  return (
    <Section className="mx-auto max-w-6xl pt-16 pb-24">
      <h1 className="mb-4 text-5xl font-black leading-tight sm:text-7xl">
        Secure <span className="text-truth">Checkout</span>
      </h1>
      <p className="mb-10 max-w-3xl text-lg text-gray-400">
        Finalize your request. This demo checkout records your order intent and prepares your onboarding packet.
      </p>

      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div data-orb-transient="checkout-state" className="rounded-2xl border border-gray-800 bg-[#050505] p-6 sm:p-8">
          {!hydrated ? (
            <p className="text-gray-400">Loading checkout...</p>
          ) : items.length === 0 ? (
            <div className="space-y-4">
              <p className="text-gray-300">There are no items in your cart yet.</p>
              <Button asChild>
                <Link href="/cart">Go to Cart</Link>
              </Button>
            </div>
          ) : submitted ? (
            <div className="space-y-4">
              <p className="text-2xl font-bold text-light">Order request received.</p>
              <p className="text-gray-400">
                We captured your checkout details and cart summary for follow-up. This environment is a demo and does not charge cards.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button asChild>
                  <Link href="/products">Back to Products</Link>
                </Button>
                <Button variant="outline" onClick={clearCart}>
                  Clear Cart
                </Button>
              </div>
            </div>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                setSubmitted(true);
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Input placeholder="First name" name="firstName" required />
                <Input placeholder="Last name" name="lastName" required />
              </div>
              <Input type="email" placeholder="Email address" name="email" required />
              <Input placeholder="Company (optional)" name="company" />
              <Input placeholder="Phone number" name="phone" />
              <textarea
                name="notes"
                placeholder="Project notes or delivery details"
                className="min-h-[120px] w-full rounded-3xl border border-gray-700 bg-black/60 px-6 py-4 text-light placeholder:text-gray-500 focus:border-truth focus:outline-none focus:ring-2 focus:ring-truth/40 transition"
              />

              <div className="rounded-xl border border-gray-800 bg-black/40 p-4 text-sm text-gray-400">
                Payment collection is disabled in this build. Checkout is currently configured as an order request workflow.
              </div>

              <Button type="submit" className="w-full justify-center">
                Submit Order Request
              </Button>
            </form>
          )}
        </div>

        <aside className="h-fit rounded-2xl border border-gray-800 bg-black/50 p-6">
          <h2 className="mb-5 text-xl font-bold uppercase tracking-widest text-light">Order Summary</h2>

          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.sku} className="rounded-lg border border-gray-800 bg-black/30 p-3">
                <p className="text-sm font-semibold text-light">{item.name}</p>
                <p className="mt-1 text-xs text-gray-500">{item.sku}</p>
                <p className="mt-2 text-sm text-gray-400">
                  {item.quantity} x {formatUsd(item.unitPrice)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 space-y-2 border-t border-gray-800 pt-4 text-sm text-gray-400">
            <p className="flex items-center justify-between"><span>Items</span><span>{totals.count}</span></p>
            <p className="flex items-center justify-between"><span>Subtotal</span><span>{formatUsd(totals.subtotal)}</span></p>
            <p className="flex items-center justify-between"><span>Platform fee</span><span>{formatUsd(totals.fees)}</span></p>
            <p className="flex items-center justify-between text-base text-light"><span>Total</span><span>{formatUsd(totals.total)}</span></p>
          </div>

          <Button variant="outline" asChild className="mt-6 w-full justify-center">
            <Link href="/cart">Edit Cart</Link>
          </Button>
        </aside>
      </div>
    </Section>
  );
}
