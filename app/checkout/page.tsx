import type { Metadata } from 'next';
import CheckoutPageClient from './page.client';

export const metadata: Metadata = {
  title: 'Checkout - Spruked',
  description: 'Secure checkout for Spruked services.',
};

export default function CheckoutPage() {
  return <CheckoutPageClient />;
}
