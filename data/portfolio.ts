export const portfolioCategories = [
  'AI & Intelligent Systems',
  'Software & Platforms',
  'Books & Writing',
  'Research & Architecture',
  'Archive / Earlier Work',
  'Brand & Identity',
] as const;

export type PortfolioCategory = (typeof portfolioCategories)[number];

export const portfolioStatuses = [
  'Active',
  'Production',
  'Beta',
  'Prototype',
  'Research',
  'Archived',
  'Retired',
  'Superseded',
  'Published',
  'Draft',
  'Unclassified',
] as const;

export type PortfolioStatus = (typeof portfolioStatuses)[number];

export type PortfolioItem = {
  slug: string;
  title: string;
  category: PortfolioCategory;
  status: PortfolioStatus;
  summary?: string;
  externalUrl?: string;
  repositoryUrl?: string;
  featured?: boolean;
};

// IMPORTANT:
// Status is intentionally left Unclassified unless Bryan has explicitly confirmed it.
// Do not strengthen a status based on repository contents, marketing copy, or inference.
export const portfolioItems: PortfolioItem[] = [
  { slug: 'pro-prime-series-ai', title: 'Pro Prime Series AI', category: 'AI & Intelligent Systems', status: 'Unclassified', featured: true },
  { slug: 'aims', title: 'A.I.M.S.', category: 'AI & Intelligent Systems', status: 'Unclassified', featured: true },
  { slug: 'cali', title: 'CALI', category: 'AI & Intelligent Systems', status: 'Unclassified', featured: true },
  { slug: 'orbs', title: 'ORBs', category: 'AI & Intelligent Systems', status: 'Unclassified' },
  { slug: 'website-orb', title: 'Website ORB', category: 'AI & Intelligent Systems', status: 'Unclassified', featured: true },
  { slug: 'desktop-orb', title: 'Desktop ORB', category: 'AI & Intelligent Systems', status: 'Unclassified' },
  { slug: 'cali-x-one', title: 'Cali X One', category: 'AI & Intelligent Systems', status: 'Unclassified' },
  { slug: 'kay-gee-1', title: 'Kay Gee 1.0', category: 'AI & Intelligent Systems', status: 'Unclassified' },
  { slug: 'core-4-tribunal', title: 'Core 4 Tribunal', category: 'AI & Intelligent Systems', status: 'Unclassified' },
  { slug: 'correspondence-engine-v1', title: 'Correspondence Engine v1', category: 'AI & Intelligent Systems', status: 'Unclassified' },
  { slug: 'context-crystal', title: 'Context Crystal', category: 'AI & Intelligent Systems', status: 'Unclassified' },
  { slug: 'epistemic-gravity-field', title: 'EGF — Epistemic Gravity Field', category: 'AI & Intelligent Systems', status: 'Unclassified' },
  { slug: 'high-level-space-field', title: 'High Level Space Field', category: 'AI & Intelligent Systems', status: 'Unclassified' },
  { slug: 'triple-predicate-cubed', title: 'TPC — Triple Predicate Cubed', category: 'AI & Intelligent Systems', status: 'Unclassified' },
  { slug: 'doctrine-v1', title: 'Doctrine v1', category: 'AI & Intelligent Systems', status: 'Unclassified' },

  { slug: 'orb-weaver', title: 'Orb Weaver', category: 'Software & Platforms', status: 'Unclassified', featured: true },
  { slug: 'web-weaver', title: 'Web Weaver', category: 'Software & Platforms', status: 'Unclassified' },
  { slug: 'code-weaver', title: 'Code Weaver', category: 'Software & Platforms', status: 'Unclassified' },
  { slug: 'pops', title: 'POPS', category: 'Software & Platforms', status: 'Unclassified', featured: true },
  { slug: 'goat', title: 'GOAT', category: 'Software & Platforms', status: 'Unclassified' },
  { slug: 'truemark-mint', title: 'TrueMark Mint', category: 'Software & Platforms', status: 'Unclassified' },
  { slug: 'alpha-certsig', title: 'Alpha CertSig', category: 'Software & Platforms', status: 'Unclassified' },
  { slug: 'certsig', title: 'CertSig', category: 'Software & Platforms', status: 'Unclassified' },
  { slug: 'pro-prime-global-registry', title: 'Pro Prime Global Registry', category: 'Software & Platforms', status: 'Unclassified' },
  { slug: 'proof-of-presence', title: 'Proof of Presence', category: 'Software & Platforms', status: 'Unclassified' },

  { slug: 'spruked-biography', title: 'Spruked — Biography', category: 'Books & Writing', status: 'Unclassified' },
  { slug: 'spruked-fiction', title: 'Spruked — Fictional Telling', category: 'Books & Writing', status: 'Unclassified' },
  { slug: 'don-quixotes-horse', title: "Don Quixote's Horse", category: 'Books & Writing', status: 'Unclassified' },
  { slug: 'happy-toes', title: 'Happy Toes', category: 'Books & Writing', status: 'Unclassified' },

  { slug: 'development-methodology', title: "Bryan Spruk's Development Methodology", category: 'Research & Architecture', status: 'Unclassified' },
  { slug: 'deterministic-governance', title: 'Deterministic Governance', category: 'Research & Architecture', status: 'Unclassified' },
  { slug: 'bounded-agents', title: 'Bounded Agents', category: 'Research & Architecture', status: 'Unclassified' },
  { slug: 'memory-architecture', title: 'Memory Architecture', category: 'Research & Architecture', status: 'Unclassified' },
  { slug: 'nine-of-clubs', title: 'Nine-of-Clubs / Governor', category: 'Research & Architecture', status: 'Unclassified' },
  { slug: 'legacy-intelligence', title: 'Legacy Intelligence', category: 'Research & Architecture', status: 'Unclassified' },

  { slug: 'spruked-u', title: 'The SPRUKED U', category: 'Brand & Identity', status: 'Unclassified', featured: true },
];

export function getPortfolioItemsByCategory(category: PortfolioCategory) {
  return portfolioItems.filter((item) => item.category === category);
}

export function getPortfolioItem(slug: string) {
  return portfolioItems.find((item) => item.slug === slug);
}
