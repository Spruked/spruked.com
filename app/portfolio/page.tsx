import type { Metadata } from 'next';
import { PortfolioFilters } from '@/components/portfolio/PortfolioFilters';
import { PortfolioIntro } from '@/components/portfolio/PortfolioIntro';

export const metadata: Metadata = { title: 'Portfolio — Spruked', description: 'Explore Bryan Spruk’s systems, software, writing, research, and identity work.' };

export default function PortfolioPage() {
  return <><PortfolioIntro /><section className="mx-auto max-w-7xl px-6 pb-24 md:px-12"><PortfolioFilters /></section></>;
}
