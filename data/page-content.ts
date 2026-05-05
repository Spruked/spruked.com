export const PAGE_SLUGS = ['true-mark-mint', 'goat'] as const;

export type PageSlug = (typeof PAGE_SLUGS)[number];

export interface Cta {
  label: string;
  href: string;
}

export interface HeroContent {
  eyebrow: string;
  headline: string;
  highlight: string;
  description: string;
  primaryCta: Cta;
  secondaryCta?: Cta;
}

export interface FeatureCard {
  badge: string;
  title: string;
  body: string;
  meta: string;
}

export interface CertificateLayer {
  title: string;
  body: string;
}

export interface ProcessStep {
  title: string;
  body: string;
}

export interface StatLine {
  value: string;
  label: string;
}

export interface LegacyPillar {
  title: string;
  body: string;
  meta: string;
}

export interface TimelineEvent {
  title: string;
  body: string;
}

export interface PromiseCard {
  title: string;
  body: string;
}

export interface TrueMarkMintContent {
  hero: HeroContent;
  encryptionHighlights: FeatureCard[];
  certificateLayers: CertificateLayer[];
  process: ProcessStep[];
  stats: StatLine[];
}

export interface GoatPageContent {
  hero: HeroContent;
  pillars: LegacyPillar[];
  timeline: TimelineEvent[];
  promises: PromiseCard[];
  closingCta: {
    title: string;
    body: string;
    primaryCta: Cta;
    secondaryCta: Cta;
  };
}

export type PageContentMap = {
  'true-mark-mint': TrueMarkMintContent;
  goat: GoatPageContent;
};

export const pageContentDefaults: PageContentMap = {
  'true-mark-mint': {
    hero: {
      eyebrow: 'Cryptographic Asset Verification',
      headline: 'Mint with certainty. Verify with cryptography.',
      highlight: 'truth-stamped',
      description:
        'ChaCha20-Poly1305 authenticated encryption before permanent storage. Ten-layer certificate of authenticity. Zero-trust verification. Your asset is truth-stamped before it touches the blockchain.',
      primaryCta: {
        label: 'Begin Minting',
        href: '#mint',
      },
      secondaryCta: {
        label: 'Explore Security',
        href: '#encryption',
      },
    },
    encryptionHighlights: [
      {
        badge: '[01]',
        title: 'ChaCha20-Poly1305 AEAD',
        body: 'Authenticated Encryption with Associated Data. 256-bit keys. 128-bit tags. Any tampering—down to a single bit—is detected immediately.',
        meta: '256-BIT KEY • 96-BIT NONCE • RFC 7539',
      },
      {
        badge: '[02]',
        title: 'Pre-upload encryption',
        body: 'Client-side encryption before transmission. Storage layers receive only ciphertext and authentication metadata.',
        meta: 'CLIENT-SIDE • ZERO-KNOWLEDGE • TAMPER-EVIDENT',
      },
      {
        badge: '[03]',
        title: 'Permanent storage',
        body: 'Encrypted assets committed to Arweave with IPFS indexing. Dual redundancy eradicates single points of failure.',
        meta: 'ARWEAVE PERMANENCE • IPFS DISTRIBUTION',
      },
      {
        badge: '[04]',
        title: 'Deterministic verification',
        body: 'Each mint generates proof anyone can independently verify. Mathematics provides the guarantee, not institutions.',
        meta: 'ZERO-TRUST • MATHEMATICALLY VERIFIABLE',
      },
    ],
    certificateLayers: [
      { title: 'Cryptographic hash (SHA-256)', body: 'Immutable fingerprint of the original asset. Any modification produces a new hash.' },
      { title: 'Creator digital signature', body: 'Elliptic curve signature proving creator authorization. Wallet-bound. Timestamped.' },
      { title: 'Timestamp authority', body: 'Multi-chain proof-of-existence anchored to redundant timestamp services.' },
      { title: 'Storage location proof', body: 'Arweave transaction ID and IPFS CID linking the encrypted asset to its permanent home.' },
      { title: 'Encryption metadata', body: 'Complete record of ChaCha20-Poly1305 parameters: nonce, auth tag, key derivation path.' },
      { title: 'Visual fingerprint', body: 'Perceptual hash catches manipulations that escape raw binary comparison.' },
      { title: 'Provenance chain', body: 'Complete lineage from creation through transfers—every hop cryptographically bound.' },
      { title: 'Metadata integrity', body: 'Separate authentication of NFT metadata ensures text and media remain aligned.' },
      { title: 'Smart contract binding', body: 'Cryptographic commitment to the precise smart contract + token standard.' },
      { title: 'Certificate signature', body: 'Master signature sealing all previous layers into a single verifiable document.' },
    ],
    process: [
      { title: 'Upload', body: 'Asset ingested. Client-side processing starts instantly.' },
      { title: 'Encrypt', body: 'ChaCha20-Poly1305 encryption applied. Authentication tag generated.' },
      { title: 'Certify', body: 'Ten-layer certificate assembled and signed.' },
      { title: 'Store', body: 'Ciphertext stored on Arweave. IPFS indexing enabled.' },
    ],
    stats: [
      { value: '256-bit', label: 'Encryption keys' },
      { value: '10-layer', label: 'Certificate' },
      { value: 'Permanent', label: 'Storage' },
      { value: 'Zero-trust', label: 'Verification' },
    ],
  },
  goat: {
    hero: {
      eyebrow: 'Legacy Preservation Engine',
      headline: 'Stop the second death. Build a GOAT-grade archive.',
      highlight: 'GOAT',
      description:
        'The GOAT transforms memories into narrated films, AI-personalized letters, and living archives. Every artifact is authenticated, contextualized, and preserved so legacies never vanish.',
      primaryCta: {
        label: 'Book a Legacy Session',
        href: '#book',
      },
      secondaryCta: {
        label: 'Watch a Demo',
        href: '#demo',
      },
    },
    pillars: [
      {
        title: 'Capture raw memories',
        body: 'High-definition interview capture plus timeline ingestion. We collect the receipts before they fade.',
        meta: '4K / Spatial audio / Multi-camera',
      },
      {
        title: 'Train the voice',
        body: 'AI models fine-tuned on authentic speech + writing patterns. Output sounds like you because it is sourced from you.',
        meta: 'Custom narration • Controlled prompts',
      },
      {
        title: 'Premiere the film',
        body: 'Cinematic edits, letter drops, and vault delivery. The family receives an interactive vault—never a dusty drive.',
        meta: 'Secure vault • Shareable links',
      },
    ],
    timeline: [
      { title: '01. Intake', body: 'White-glove onboarding. We map the story, surface gaps, and schedule capture.' },
      { title: '02. Capture', body: 'Studio-grade capture kit shipped or crew on-site. Memories, artifacts, and context collected.' },
      { title: '03. Training', body: 'Audio + text models trained. Narration and letters generated, reviewed, and truth-checked.' },
      { title: '04. Premiere', body: 'Final film plus vault delivered. Optional livestream premiere with private Q&A.' },
    ],
    promises: [
      { title: 'Truth-first storytelling', body: 'Every claim footnoted. Source docs live beside the film so fact and sentiment never separate.' },
      { title: 'Private by default', body: 'End-to-end encrypted vault. You decide who sees what, and when.' },
      { title: 'Living archive', body: 'Schedule future drops: letters on birthdays, narrated advice, AI-guided tours of the archive.' },
    ],
    closingCta: {
      title: 'Ready to build the GOAT version of your story? ',
      body: 'Secure a limited production slot. Each project receives a dedicated producer, researcher, and AI wrangler.',
      primaryCta: {
        label: 'Reserve a Slot',
        href: '#book',
      },
      secondaryCta: {
        label: 'Download The Dossier',
        href: '#dossier',
      },
    },
  },
};
