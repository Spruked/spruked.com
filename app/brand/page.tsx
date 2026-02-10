'use client';

import { useMemo, useState } from 'react';
import { PrimaryLogo } from '@/components/brand/PrimaryLogo';
import { WordmarkLogo } from '@/components/brand/WordmarkLogo';
import { CircularStamp } from '@/components/brand/CircularStamp';
import { FaviconGrid } from '@/components/brand/FaviconGrid';
import { ColorSwatch } from '@/components/brand/ColorSwatch';
import { brand } from '@/lib/constants';

const tabs = [
  { id: 'logo', label: 'Logo' },
  { id: 'stamp', label: 'Stamp' },
  { id: 'icons', label: 'Icons' },
  { id: 'colors', label: 'Colors' },
  { id: 'typography', label: 'Typography' },
  { id: 'usage', label: 'Usage' },
] as const;

type TabId = (typeof tabs)[number]['id'];

export default function BrandPage() {
  const [activeTab, setActiveTab] = useState<TabId>('logo');

  const content = useMemo(() => {
    switch (activeTab) {
      case 'logo':
        return <LogoSection />;
      case 'stamp':
        return <StampSection />;
      case 'icons':
        return <IconsSection />;
      case 'colors':
        return <ColorsSection />;
      case 'typography':
        return <TypographySection />;
      case 'usage':
        return <UsageSection />;
      default:
        return null;
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#0a0a0a] to-gray px-0 pb-20 text-light">
      <div className="mx-auto max-w-6xl px-6">
        <header className="border-b border-gray-900/60 py-10">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-gray-500">Brand System v1.0</p>
              <h1 className="text-4xl font-black tracking-tight md:text-5xl">Spruked Brand Bible</h1>
            </div>
            <WordmarkLogo size="sm" />
          </div>
        </header>

        <div className="flex flex-wrap gap-4 border-b border-gray-900/60 py-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`text-xs uppercase tracking-[0.3em] transition-all ${
                activeTab === tab.id
                  ? 'text-light border-b-2 border-truth pb-2'
                  : 'text-gray-500 pb-2'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="py-16">{content}</div>
      </div>
    </div>
  );
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-12 max-w-3xl space-y-4">
      <h2 className="text-4xl font-black tracking-tight md:text-5xl">{title}</h2>
      <p className="text-lg text-gray-400">{description}</p>
    </div>
  );
}

function LogoSection() {
  return (
    <div className="space-y-16">
      <SectionHeading
        title="Primary Logo"
        description="The U-shaped core anchors pronunciation and lineage. The diagonal strike represents the correction—the moment of truth. Sharp, intentional, minimal."
      />
      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-gray-900 bg-black">
            <PrimaryLogo size={240} />
          </div>
          <p className="mt-4 text-xs uppercase tracking-[0.4em] text-gray-500">On Dark</p>
        </div>
        <div>
          <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-gray-200 bg-light">
            <PrimaryLogo size={240} color={brand.colors.dark} />
          </div>
          <p className="mt-4 text-xs uppercase tracking-[0.4em] text-gray-500">On Light</p>
        </div>
      </div>

      <div>
        <h3 className="mb-8 text-3xl font-bold tracking-tight">Wordmark Lockups</h3>
        <div className="rounded-3xl border border-gray-900 bg-black px-10 py-12">
          <div className="flex flex-col gap-10">
            <WordmarkLogo size="xl" />
            <WordmarkLogo size="lg" />
            <WordmarkLogo size="md" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StampSection() {
  return (
    <div className="space-y-16">
      <SectionHeading
        title="Spruked Stamp"
        description="Circular badge for certifications, social proof, and 'This has been Spruked' moments. Use when authority needs to be stamped, not just stated."
      />
      <div className="grid gap-8 md:grid-cols-3">
        {[
          { label: 'Standard', bg: 'bg-black', border: 'border-gray-900', color: brand.colors.light },
          { label: 'Inverted', bg: 'bg-light', border: 'border-gray-200', color: brand.colors.dark },
          { label: 'Small Scale', bg: 'bg-gray-900', border: 'border-gray-900', color: brand.colors.light },
        ].map((card, index) => (
          <div key={card.label}>
            <div className={`flex min-h-[260px] items-center justify-center rounded-3xl border ${card.border} ${card.bg}`}>
              <CircularStamp size={index === 2 ? 160 : 220} color={card.color} />
            </div>
            <p className="mt-4 text-xs uppercase tracking-[0.4em] text-gray-500">{card.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function IconsSection() {
  return (
    <div className="space-y-16">
      <SectionHeading
        title="Icon Suite"
        description="Favicon, app icons, and social media assets. The mark holds at all sizes—from 16px browser tabs to 1024px store displays."
      />
      <div className="rounded-3xl border border-gray-900 bg-black/80 p-10">
        <p className="text-xs uppercase tracking-[0.4em] text-gray-500">Favicon Sizes</p>
        <div className="mt-6">
          <FaviconGrid />
        </div>
      </div>
      <div className="grid gap-8 md:grid-cols-3">
        {[
          { size: 512, label: 'iOS / Android' },
          { size: 1024, label: 'App Store' },
          { size: 192, label: 'PWA' },
        ].map((icon) => (
          <div key={icon.size}>
            <div className="flex aspect-square items-center justify-center rounded-3xl border border-gray-900 bg-black">
              <PrimaryLogo size={icon.size > 512 ? 200 : 160} />
            </div>
            <p className="mt-4 text-sm text-gray-500">
              {icon.size}×{icon.size} — {icon.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ColorsSection() {
  return (
    <div className="space-y-12">
      <SectionHeading
        title="Color System"
        description="Monochrome authority with a single truth-accent. No gradients. No decoration. Just clarity, contrast, and the red strike of correction."
      />
      <div className="grid gap-6 md:grid-cols-2">
        <ColorSwatch
          name="Truth Red"
          hex={brand.colors.truth}
          description="The strike. The correction. The moment of truth."
        />
        <ColorSwatch
          name="Authority Black"
          hex={brand.colors.dark}
          description="Primary dark. Backgrounds, text on light."
        />
        <ColorSwatch
          name="Clarity White"
          hex={brand.colors.light}
          description="Primary light. Text on dark, clean backgrounds."
          inverted
        />
        <ColorSwatch
          name="Depth Gray"
          hex={brand.colors.gray}
          description="Secondary dark. Subtle depth without softness."
        />
      </div>
    </div>
  );
}

function TypographySection() {
  return (
    <div className="space-y-10">
      <SectionHeading
        title="Typography"
        description="Helvetica Neue for all brand touchpoints. Clean, authoritative, neutral. Let the content and the mark do the talking."
      />
      <div className="space-y-8">
        <div className="rounded-3xl border border-gray-900 bg-black/80 p-10">
          <div className="text-5xl font-black tracking-tight md:text-6xl">You&rsquo;ve been Spruked</div>
          <p className="mt-4 text-xs uppercase tracking-[0.4em] text-gray-500">Helvetica Neue Bold — 72pt</p>
        </div>
        <div className="rounded-3xl border border-gray-900 bg-black/80 p-10">
          <div className="text-3xl font-semibold text-light">Truth with teeth. Not soft. Not mean.</div>
          <p className="mt-4 text-xs uppercase tracking-[0.4em] text-gray-500">Helvetica Neue Medium — 42pt</p>
        </div>
        <div className="rounded-3xl border border-gray-900 bg-black/80 p-10">
          <p className="max-w-3xl text-lg text-gray-300">
            Spruking is the act of delivering correction with precision and authority. It&rsquo;s not criticism. It&rsquo;s the
            moment someone who knows better steps in and says: “Here&rsquo;s what you missed. Here&rsquo;s what&rsquo;s actually true.
            Here&rsquo;s how to fix it.”
          </p>
          <p className="mt-4 text-xs uppercase tracking-[0.4em] text-gray-500">Helvetica Neue Regular — 18pt</p>
        </div>
      </div>
    </div>
  );
}

function UsageSection() {
  const doctrine = [
    {
      title: 'Clear Space',
      desc: 'Maintain minimum clear space equal to the height of the U-core on all sides. Never crowd the mark.',
    },
    {
      title: 'Minimum Size',
      desc: 'Symbol-only: 20px minimum. Wordmark: 100px minimum width. Below this the strike loses impact.',
    },
    {
      title: 'Color Applications',
      desc: 'Use only approved colors. White on dark, black on light, red strike always at 100% opacity.',
    },
    {
      title: 'Background Treatment',
      desc: 'High contrast required. Add a solid knockout box if background complexity interferes.',
    },
    {
      title: 'Do Not',
      desc: 'Rotate, skew, or distort the mark. Change the strike color. Add effects. Place on busy patterns.',
    },
    {
      title: 'When to Use Stamp',
      desc: 'Badge of authority: certifications, endorsements. Deploy when circular form adds gravitas.',
    },
  ];

  return (
    <div className="space-y-12">
      <SectionHeading
        title="Usage Doctrine"
        description="When to Spruke. How to deploy the mark. What it means to officially certify something as truth."
      />
      <div className="grid gap-6 md:grid-cols-2">
        {doctrine.map((item, index) => (
          <div key={item.title} className="flex gap-6 rounded-3xl border border-gray-900 bg-black/70 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-truth text-lg font-bold">
              {index + 1}
            </div>
            <div>
              <h4 className="text-xl font-semibold">{item.title}</h4>
              <p className="mt-2 text-sm text-gray-400">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-8">
        <h3 className="text-3xl font-bold">Real-World Applications</h3>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col justify-between rounded-2xl border border-gray-900 bg-black/80 p-8">
            <PrimaryLogo size={80} />
            <div className="text-sm">
              <p className="font-semibold">John Spruke</p>
              <p className="text-gray-500">Chief Truth Officer</p>
            </div>
          </div>
          <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-light p-8">
            <CircularStamp color={brand.colors.dark} size={160} />
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-gray-900 bg-black/80 p-6">
            <PrimaryLogo size={60} />
            <div className="border-l border-gray-800 pl-4 text-sm leading-relaxed">
              <p className="font-semibold">John Spruke</p>
              <p className="text-gray-400">john@spruked.com</p>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-gray-900 bg-[#111] p-8">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10">
              <PrimaryLogo size={220} />
            </div>
            <div className="relative">
              <WordmarkLogo size="sm" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
