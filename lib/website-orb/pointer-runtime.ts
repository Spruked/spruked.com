export type WebsiteOrbAction = 'point' | 'navigate' | 'point_and_confirm_navigate' | 'explain';

export type WebsiteOrbTarget = {
  id: string;
  route: string;
  selector: string;
  label: string;
  description: string;
  directAliases: string[];
  topicAliases?: string[];
  verifyText?: string[];
  allowedActions: WebsiteOrbAction[];
  guideOnly?: boolean;
};

export type WebsiteOrbGuideState = {
  target: WebsiteOrbTarget;
  rect: DOMRect;
  message: string;
  pulseKey: number;
};

export const WEBSITE_ORB_GUIDE_EVENT = 'spruked:website-orb-guide-target';

export const SPRUKED_SITE_WORLD_REFERENCE = {
  site: {
    name: 'Spruked',
    domain: 'spruked.com',
    canonical_url: 'https://spruked.com',
  },
  orb_weaver_reference: {
    repo: '/home/bryan/projects/Orb_Weaver',
    doctrine_docs: [
      '/home/bryan/projects/Orb_Weaver/docs/ORB_POINTER_RUNTIME_MODEL.md',
      '/home/bryan/projects/Orb_Weaver/docs/WEBSITE_ORB_GOLD_MASTER_MIGRATION_SOURCE.md',
      '/home/bryan/projects/Orb_Weaver/docs/ORBS_STAGE_GOVERNOR_CONTRACTS.md',
    ],
    available_compiled_context:
      '/home/bryan/projects/Orb_Weaver/manufacturing/templates/Website_Orb_Final/compiled_orb',
    note:
      'Compiled context currently found in Orb_Weaver is for orbweaver.spruked.com. Spruked.com runtime targets are derived from the live Next app until a domain-specific crawl artifact is present.',
  },
};

export const SPRUKED_POINTER_TARGETS: WebsiteOrbTarget[] = [
  {
    id: 'spruked.nav.home',
    route: '/',
    selector: '[data-orb-target="spruked.nav.home"]',
    label: 'Home',
    description: 'The Spruked home page.',
    directAliases: ['home', 'go home', 'take me home', 'open home'],
    allowedActions: ['point', 'navigate'],
  },
  {
    id: 'spruked.nav.products',
    route: '/products',
    selector: '[data-orb-target="spruked.nav.products"]',
    label: 'Products',
    description: 'The main Spruked product catalog.',
    directAliases: ['products', 'product page', 'catalog', 'show products', 'open products'],
    allowedActions: ['point', 'navigate'],
  },
  {
    id: 'spruked.nav.cart',
    route: '/cart',
    selector: '[data-orb-target="spruked.nav.cart"]',
    label: 'Cart',
    description: 'The cart where selected Spruked offerings are reviewed.',
    directAliases: ['cart', 'shopping cart', 'go to cart', 'open cart', 'take me to cart'],
    allowedActions: ['point', 'navigate'],
  },
  {
    id: 'spruked.nav.checkout',
    route: '/checkout',
    selector: '[data-orb-target="spruked.checkout.form"], [data-orb-target="spruked.nav.checkout"]',
    label: 'Checkout',
    description: 'The checkout workflow for submitting a Spruked order request.',
    directAliases: ['checkout', 'check out', 'go to checkout', 'open checkout', 'take me to checkout', 'finish order'],
    verifyText: ['Secure Checkout', 'Submit Order Request', 'Checkout'],
    allowedActions: ['point', 'navigate'],
  },
  {
    id: 'spruked.home.get-spruked',
    route: '/',
    selector: '[data-orb-target="spruked.home.get-spruked"]',
    label: 'Get Spruked',
    description: 'The primary homepage call-to-action that moves visitors to the waitlist.',
    directAliases: ['get spruked', 'waitlist', 'join waitlist', 'sign up', 'secure my spot'],
    allowedActions: ['point', 'navigate'],
  },
  {
    id: 'spruked.home.contact',
    route: '/',
    selector: '[data-orb-target="spruked.home.contact"]',
    label: 'Contact',
    description: 'The homepage contact action for emailing Spruked.',
    directAliases: ['contact', 'email bryan', 'reach out', 'contact spruked'],
    allowedActions: ['point'],
    guideOnly: true,
  },
  {
    id: 'spruked.home.waitlist-form',
    route: '/',
    selector: '[data-orb-target="spruked.home.waitlist-form"]',
    label: 'Waitlist Form',
    description: 'The private waitlist form.',
    directAliases: ['waitlist form', 'private waitlist', 'secure my spot', 'join the private waitlist'],
    verifyText: ['Secure My Spot', 'waitlist'],
    allowedActions: ['point', 'navigate'],
  },
  {
    id: 'spruked.products.alpha-certsig',
    route: '/products',
    selector: '[data-orb-target="spruked.products.alpha-certsig"]',
    label: 'Alpha CertSig',
    description: 'The Alpha CertSig product entry.',
    directAliases: ['alpha certsig', 'certsig', 'alpha certificate', 'mint engine'],
    allowedActions: ['point', 'navigate'],
  },
  {
    id: 'spruked.products.truemark',
    route: '/products',
    selector: '[data-orb-target="spruked.products.truemark"]',
    label: 'TrueMark Mint',
    description: 'The TrueMark Mint product entry.',
    directAliases: ['truemark', 'true mark', 'truemark mint', 'registry'],
    allowedActions: ['point', 'navigate'],
  },
  {
    id: 'spruked.products.goat',
    route: '/products',
    selector: '[data-orb-target="spruked.products.goat"]',
    label: 'The GOAT',
    description: 'The GOAT legacy preservation product entry.',
    directAliases: ['goat', 'the goat', 'legacy session', 'legacy preservation'],
    allowedActions: ['point', 'navigate'],
  },
  {
    id: 'spruked.cart.summary',
    route: '/cart',
    selector: '[data-orb-target="spruked.cart.summary"]',
    label: 'Cart Summary',
    description: 'The cart summary and proceed-to-checkout area.',
    directAliases: ['cart summary', 'order summary', 'proceed to checkout', 'checkout button'],
    verifyText: ['Summary', 'Proceed to Checkout'],
    allowedActions: ['point', 'navigate'],
  },
  {
    id: 'spruked.checkout.summary',
    route: '/checkout',
    selector: '[data-orb-target="spruked.checkout.summary"]',
    label: 'Order Summary',
    description: 'The checkout order summary.',
    directAliases: ['order summary', 'checkout summary', 'total', 'subtotal'],
    verifyText: ['Order Summary', 'Total'],
    allowedActions: ['point', 'navigate'],
  },
];

export function getPointerTarget(targetId: string | undefined): WebsiteOrbTarget | null {
  if (!targetId) return null;
  return SPRUKED_POINTER_TARGETS.find((target) => target.id === targetId) || null;
}

export function dispatchWebsiteOrbGuide(targetId: string, message?: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(WEBSITE_ORB_GUIDE_EVENT, {
      detail: { targetId, message },
    }),
  );
}

function normalizeText(value: unknown): string {
  return String(value || '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function metadataTargetId(response: Record<string, any> | null | undefined): string | null {
  const metadata = response?.metadata || {};
  const candidates = [
    response?.target_id,
    response?.semantic_target_id,
    response?.orb_target_id,
    response?.intent?.target_id,
    response?.intent?.semantic_target_id,
    metadata?.target_id,
    metadata?.semantic_target_id,
    metadata?.orb_target_id,
    metadata?.guide_target_id,
  ];
  const found = candidates.find((value) => typeof value === 'string' && getPointerTarget(value));
  return found ? String(found) : null;
}

export function resolvePointerTarget(
  prompt: string,
  response?: Record<string, any> | null,
): WebsiteOrbTarget | null {
  const direct = metadataTargetId(response);
  if (direct) return getPointerTarget(direct);

  const haystack = normalizeText(prompt);
  if (!haystack) return null;

  const ranked = SPRUKED_POINTER_TARGETS
    .map((target) => {
      const aliases = [...target.directAliases, ...(target.topicAliases || [])];
      const score = aliases.reduce((total, alias) => {
        const needle = normalizeText(alias);
        if (!needle) return total;
        if (haystack === needle) return total + 8;
        if (haystack.includes(needle)) return total + (target.directAliases.includes(alias) ? 5 : 2);
        return total;
      }, 0);
      return { target, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.target || null;
}

function isVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) {
    return false;
  }
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

export function findPointerTargetElement(target: WebsiteOrbTarget): HTMLElement | null {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>(target.selector));
  for (const element of candidates) {
    if (!isVisible(element)) continue;
    if (!target.verifyText?.length) return element;
    const text = normalizeText(element.innerText || element.textContent);
    const verified = target.verifyText.some((part) => text.includes(normalizeText(part)));
    if (verified) return element;
  }
  return null;
}

export function scrollPointerTargetIntoView(element: HTMLElement) {
  element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
}

export function buildGuideState(
  target: WebsiteOrbTarget,
  element: HTMLElement,
  message: string | undefined,
  pulseKey: number,
): WebsiteOrbGuideState {
  return {
    target,
    rect: element.getBoundingClientRect(),
    message: message || target.description,
    pulseKey,
  };
}
