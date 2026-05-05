'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Section } from '@/components/ui/Section';

type StudioTab = {
  id: string;
  label: string;
  file: string;
};

const tabs: StudioTab[] = [
  { id: 'studio', label: 'Studio', file: 'orb_skin_gen.html' },
  { id: 'gallery', label: 'Gallery', file: 'gallery.html' },
  { id: 'cart', label: 'Cart', file: 'cart.html' },
  { id: 'checkout', label: 'Checkout', file: 'checkout.html' },
  { id: 'upload', label: 'Upload', file: 'upload.html' },
  { id: 'account', label: 'Account', file: 'account.html' },
  { id: 'admin', label: 'Admin', file: 'admin.html' },
  { id: 'pricing', label: 'Pricing', file: 'pricing.html' },
  { id: 'login', label: 'Login', file: 'login.html' },
  { id: 'contact', label: 'Contact', file: 'contact.html' },
];

export default function OrbSkinStudioPage() {
  const [activeTabId, setActiveTabId] = useState<string>('studio');
  const [frameNonce, setFrameNonce] = useState<number>(0);
  const [frameState, setFrameState] = useState<'loading' | 'ready'>('loading');

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) || tabs[0],
    [activeTabId]
  );

  const frameSrc = `/orb-skin-studio/${activeTab.file}`;

  return (
    <>
      <Section className="mx-auto max-w-6xl pt-16 pb-8">
        <h1 className="mb-4 text-5xl font-black leading-tight sm:text-7xl">
          Orb Skin <span className="text-truth">Studio</span>
        </h1>
        <p className="max-w-4xl text-xl text-gray-400">
          Investor demo surface for Orb Skin Studio. This view is embedded directly in spruked.com with tab navigation from creation through checkout.
        </p>
      </Section>

      <Section className="mx-auto max-w-6xl py-4">
        <div className="mb-4 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              onClick={() => {
                setActiveTabId(tab.id);
                setFrameState('loading');
              }}
              variant={activeTabId === tab.id ? 'default' : 'outline'}
              size="sm"
              className="tracking-[0.2em]"
            >
              {tab.label}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="ml-auto tracking-[0.2em]"
            onClick={() => {
              setFrameNonce((v) => v + 1);
              setFrameState('loading');
            }}
          >
            Reload
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="tracking-[0.2em]"
          >
            <a href={frameSrc} target="_blank" rel="noreferrer">
              Open Tab
            </a>
          </Button>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-[#050505] p-2 shadow-[0_0_40px_rgba(255,255,255,0.03)]">
          <iframe
            key={`${activeTab.id}-${frameNonce}`}
            title={`Orb Skin Studio ${activeTab.label}`}
            src={frameSrc}
            onLoad={() => setFrameState('ready')}
            className="h-[75vh] w-full rounded-xl border-0 bg-black"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
          />
        </div>

        <div className="mt-3 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-gray-500">
          <span>Source: /public/orb-skin-studio/{activeTab.file}</span>
          <span className={frameState === 'ready' ? 'text-green-400' : 'text-truth'}>
            Frame: {frameState}
          </span>
        </div>
      </Section>
    </>
  );
}

