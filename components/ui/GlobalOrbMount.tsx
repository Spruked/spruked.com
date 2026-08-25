'use client';

import dynamic from 'next/dynamic';

const GlobalOrb = dynamic(() => import('@/components/ui/GlobalOrb'), {
  ssr: false,
});

export default function GlobalOrbMount() {
  return <GlobalOrb />;
}
