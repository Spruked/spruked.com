'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Section } from '@/components/ui/Section';

const shelves = [
  {
    title: 'Website ORB Packages',
    description: 'Deployable website ORBs and tier upgrades.',
    tags: 'orbs / tiered / deployable',
  },
  {
    title: 'Dock and Diagnostics',
    description: 'Desktop pairing and runtime verification tools.',
    tags: 'dock / diagnostics / operations',
  },
  {
    title: 'Skins and Behavior Packs',
    description: 'Visual styles, personality packs, and collector assets.',
    tags: 'skins / voice / collectibles',
  },
  {
    title: 'Scan Bundles',
    description: 'Credits for maintenance, verification, and growth scans.',
    tags: 'credits / audit / preflight',
  },
];

const orbFamilies = [
  ['Website ORBs', 'Interactive guides with navigation, voice, pointer guidance, forms, product explanation, and verified browser actions.'],
  ['Desktop ORBs', 'Windows, macOS, and Linux companions for applications, settings, files, workflows, accessibility, and voice.'],
  ['Business ORBs', 'Customer service, sales, HR, training, compliance, inventory, manufacturing, and logistics assistants.'],
  ['Industry ORBs', 'Profession-specific intelligence for medical, legal, agriculture, construction, education, real estate, and more.'],
  ['Home ORBs', 'Personal companions for family, recipes, smart homes, hobbies, pet care, gardening, and finance.'],
  ['Educational ORBs', 'Teaching assistants for mathematics, science, history, programming, languages, music, and engineering.'],
  ['Entertainment ORBs', 'Storytellers, tour guides, museum hosts, characters, historical figures, and children’s companions.'],
  ['Enterprise ORBs', 'Large-scale corporate knowledge, documentation, help-desk, compliance, and multi-site deployments.'],
];

const enhancementPacks = [
  ['Premium Skins', 'Professional, corporate, medical, fantasy, minimal, and seasonal visual systems.'],
  ['Voice Packs', 'Executive, friendly, calm, energetic, and other installable personalities.'],
  ['Motion Packs', 'Explorer, confident, elegant, playful, minimal, and professional movement styles.'],
  ['Knowledge Packs', 'Product catalogs, company documents, technical manuals, and industry references.'],
  ['Language Packs', 'Installable multilingual capability for compatible ORBs.'],
  ['Tool Plugins', 'CRM, calendar, email, inventory, POS, ticketing, ERP, and analytics integrations.'],
];

const skinListings = [
  {
    sku: 'orb-skin-nature-source',
    callNumber: 'ORB-MKT.331.21',
    name: 'Nature Skin Source',
    description: 'Original uploaded ORB skin artwork retained as a separate marketplace skin listing.',
  },
  {
    sku: 'orb-skin-blue-sample',
    callNumber: 'ORB-MKT.331.22',
    name: 'Blue Skin Sample Source',
    description: 'Original uploaded blue ORB skin sample retained as a separate marketplace skin listing.',
  },
  {
    sku: 'orb-skin-example-two',
    callNumber: 'ORB-MKT.331.23',
    name: 'Skin Example 2 Source',
    description: 'Original uploaded ORB skin example artwork retained as a separate marketplace skin listing.',
  },
];

export default function OrbMarketplacePage() {
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();
  const listings = useMemo(
    () => skinListings.filter((listing) => (
      !normalizedQuery
      || `${listing.name} ${listing.callNumber} ${listing.description} skins basic png`
        .toLowerCase()
        .includes(normalizedQuery)
    )),
    [normalizedQuery],
  );

  return (
    <>
      <Section className="mx-auto max-w-6xl pt-16 pb-8">
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-gray-500">ORB Marketplace Library</p>
        <h1 className="mb-5 text-5xl font-black leading-tight sm:text-7xl">
          ORB Marketplace <span className="text-truth">Library</span>
        </h1>
        <p className="max-w-4xl text-xl text-gray-400">
          Browse ORBs, skins, docks, diagnostics, scan bundles, and future collector assets.
        </p>
        <nav className="mt-8 flex flex-wrap gap-5 text-xs font-bold uppercase tracking-[0.2em] text-gray-400" aria-label="Marketplace sections">
          <Link href="/">Home</Link>
          <a href="#collections">Collections</a>
          <a href="#search">Search</a>
          <a href="#index">Index</a>
        </nav>
      </Section>

      <Section className="mx-auto max-w-6xl py-6">
        <div id="basic-visitor-orb" className="rounded-2xl border border-truth/30 bg-truth/5 p-7 sm:p-9">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-truth">Featured Offer</p>
          <h2 className="mb-3 text-3xl font-black text-light">Basic Visitor ORB</h2>
          <p className="max-w-3xl text-lg text-gray-300">
            One-time website ORB install powered by Orb Weaver scan intelligence. No monthly SaaS fee.
          </p>
          <Button asChild className="mt-6">
            <a href="#basic-visitor-orb">View Product Page</a>
          </Button>
        </div>
      </Section>

      <Section id="search" className="mx-auto max-w-6xl py-8">
        <div className="rounded-2xl border border-gray-800 bg-[#050505] p-6 sm:p-8">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-gray-500">Index Search</p>
          <label htmlFor="marketplace-search" className="mb-4 block text-2xl font-bold text-light">
            Search call number, product, or chapter
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              id="marketplace-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search catalog"
              className="flex-1"
            />
            <Button type="button" onClick={() => setQuery(query.trim())}>Search Catalog</Button>
          </div>
          <div className="mt-5 flex flex-wrap gap-2" aria-label="Featured collection filters">
            {['skins', 'orbs', 'dock', 'diagnostics', 'credits'].map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setQuery(filter)}
                className="rounded-full border border-gray-700 px-4 py-2 text-xs uppercase tracking-widest text-gray-300 hover:border-gray-500 hover:text-light"
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section id="collections" className="mx-auto max-w-6xl py-8">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-gray-500">Featured collection</p>
        <div className="grid gap-5 md:grid-cols-2">
          {shelves.map((shelf) => (
            <article key={shelf.title} className="rounded-2xl border border-gray-800 bg-[#050505] p-6">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-truth">Shelf</p>
              <h2 className="mb-3 text-2xl font-bold text-light">{shelf.title}</h2>
              <p className="mb-5 text-gray-400">{shelf.description}</p>
              <p className="text-xs uppercase tracking-[0.18em] text-gray-600">{shelf.tags}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section className="mx-auto max-w-6xl py-8">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-gray-500">ORB Catalog</p>
        <h2 className="mb-8 text-3xl font-black text-light sm:text-4xl">Intelligent ORBs for every surface.</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {orbFamilies.map(([title, description]) => (
            <article key={title} className="rounded-2xl border border-gray-800 bg-[#050505] p-5">
              <h3 className="mb-3 text-xl font-bold text-light">{title}</h3>
              <p className="text-sm leading-relaxed text-gray-400">{description}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section className="mx-auto max-w-6xl py-8">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-gray-500">Enhancements</p>
        <h2 className="mb-8 text-3xl font-black text-light sm:text-4xl">Expand an ORB after installation.</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {enhancementPacks.map(([title, description]) => (
            <article key={title} className="rounded-2xl border border-gray-800 bg-black/40 p-6">
              <h3 className="mb-3 text-xl font-bold text-truth">{title}</h3>
              <p className="text-gray-400">{description}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section id="index" className="mx-auto max-w-6xl pt-8 pb-24">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-gray-500">Featured Shelf</p>
        <h2 className="mb-8 text-3xl font-black text-light">Curated picks from the market index.</h2>
        {listings.length ? (
          <div className="grid gap-6 lg:grid-cols-3">
            {listings.map((listing) => (
              <article id={listing.sku} key={listing.sku} className="flex flex-col rounded-2xl border border-gray-800 bg-[#050505] p-6">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-truth">skins</span>
                  <span className="text-xl font-black text-light">$1.88</span>
                </div>
                <h3 className="mb-2 text-2xl font-bold text-light">{listing.name}</h3>
                <p className="mb-4 text-xs uppercase tracking-[0.18em] text-gray-600">{listing.callNumber}</p>
                <p className="mb-5 flex-1 text-gray-400">{listing.description}</p>
                <ul className="mb-6 space-y-2 text-sm text-gray-300">
                  <li>PNG source asset</li>
                  <li>Marketplace library listing</li>
                  <li>Tier: basic</li>
                  <li>License: standard</li>
                </ul>
                <div className="flex flex-wrap gap-3">
                  <Button asChild><Link href={`/cart?add=${listing.sku}`}>Add to Cart</Link></Button>
                  <Button asChild variant="outline"><a href={`#${listing.sku}`}>View Product Page</a></Button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-gray-800 bg-[#050505] p-8 text-gray-400">
            No marketplace listings match “{query}”.
          </p>
        )}
      </Section>

      <Section className="mx-auto max-w-6xl pb-24">
        <div className="grid gap-6 lg:grid-cols-3">
          <article className="rounded-2xl border border-gray-800 bg-[#050505] p-6">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-truth">Creator Marketplace</p>
            <h2 className="mb-3 text-2xl font-bold text-light">Publish on the shared runtime.</h2>
            <p className="text-gray-400">Creator listings include demos, supported platforms, runtime requirements, version history, reviews, and security verification.</p>
          </article>
          <article className="rounded-2xl border border-gray-800 bg-[#050505] p-6">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-truth">Delivery</p>
            <h2 className="mb-3 text-2xl font-bold text-light">Install, update, and restore.</h2>
            <p className="text-gray-400">Compatible purchases support download, one-click installation, automatic updates, version restoration, license transfer, and device synchronization.</p>
          </article>
          <article className="rounded-2xl border border-gray-800 bg-[#050505] p-6">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-truth">Platform Vision</p>
            <h2 className="mb-3 text-2xl font-bold text-light">One ecosystem, many ORBs.</h2>
            <p className="text-gray-400">Website, desktop, business, home, industry, education, entertainment, and enterprise ORBs share a consistent runtime while retaining their own capabilities.</p>
          </article>
        </div>
      </Section>
    </>
  );
}
