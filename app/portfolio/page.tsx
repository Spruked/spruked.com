import Link from 'next/link';
import { Section } from '@/components/ui/Section';
import { getPortfolioItemsByCategory, portfolioCategories } from '@/data/portfolio';

export const metadata = {
  title: 'Portfolio — Spruked',
  description: "Bryan Spruk's portfolio of systems, software, books, research, architecture, and meaningful work.",
};

export default function PortfolioPage() {
  return (
    <div className="pb-24">
      <Section className="mx-auto max-w-6xl pt-24 pb-12">
        <p className="mb-4 text-sm uppercase tracking-[0.35em] text-truth">Body of work</p>
        <h1 className="mb-6 text-5xl font-black leading-tight sm:text-7xl">
          Bryan Spruk <span className="text-truth">Portfolio</span>
        </h1>
        <p className="max-w-4xl text-xl leading-relaxed text-gray-300">
          A permanent index of the systems, software, books, research, architecture, and other meaningful work I have created or helped build.
        </p>
      </Section>

      {portfolioCategories.map((category) => {
        const items = getPortfolioItemsByCategory(category);
        if (items.length === 0) return null;

        return (
          <Section key={category} className="mx-auto max-w-6xl py-10">
            <div className="mb-8 flex items-end justify-between gap-6 border-b border-gray-800 pb-4">
              <h2 className="text-3xl font-bold text-light sm:text-4xl">{category}</h2>
              <span className="text-xs uppercase tracking-[0.25em] text-gray-600">
                {items.length} {items.length === 1 ? 'entry' : 'entries'}
              </span>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <Link
                  key={item.slug}
                  href={`/portfolio/${item.slug}`}
                  className="group flex min-h-48 flex-col rounded-2xl border border-gray-800 bg-[#050505] p-6 transition hover:border-truth/60"
                >
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-gray-600">
                      {item.category}
                    </span>
                    {item.featured ? (
                      <span className="rounded-full border border-truth/30 bg-truth/5 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-truth">
                        Featured
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mb-3 text-2xl font-bold text-light transition group-hover:text-truth">{item.title}</h3>
                  {item.summary ? <p className="mb-6 text-gray-400">{item.summary}</p> : null}
                  <span className="mt-auto pt-6 text-sm font-semibold uppercase tracking-widest text-truth">
                    View entry →
                  </span>
                </Link>
              ))}
            </div>
          </Section>
        );
      })}
    </div>
  );
}
