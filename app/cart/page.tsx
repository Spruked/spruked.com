import type { Metadata } from 'next';
import CartPageClient from './page.client';

export const metadata: Metadata = {
  title: 'Cart - Spruked',
  description: 'Review your selected Spruked services before checkout.',
};

export default function CartPage() {
  return <CartPageClient />;
}
