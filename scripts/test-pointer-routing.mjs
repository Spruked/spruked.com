const baseUrl = process.env.ORB_TEST_BASE_URL || 'http://127.0.0.1:3400';

const checkoutControl = {
  tag: 'a',
  label: 'Checkout',
  anchor_id: 'orb-live:/:6',
  semantic_locator: '[data-orb-anchor="orb-live:/:6"]',
  target_type: 'link',
};

async function query(prompt, controls = [checkoutControl]) {
  const response = await fetch(`${baseUrl}/api/orb`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      action: 'query',
      prompt,
      context: { currentPath: '/', browserContext: { controls } },
    }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(`${prompt}: HTTP ${response.status}`);
  return payload;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const named = await query('Cali, point to the checkout button.');
assert(named.tool_request?.name === 'point_to', 'Named control must use point_to');
assert(named.tool_request?.pointer_target?.source === 'live_browser_context', 'Named control must use live DOM context');
assert(named.tool_request?.pointer_target?.semantic_locator === checkoutControl.semantic_locator, 'Named control must preserve its live anchor');

const generic = await query('Cali, point to a button.');
assert(!generic.tool_request, 'Generic button request must not guess a target');
assert(generic.metadata?.guidance === 'ambiguous_live_target', 'Generic button request must ask for clarification');

const navigation = await query('Cali, take me to checkout.');
assert(navigation.tool_request?.name === 'navigate', 'Navigation verb must outrank pointer resolution');
assert(navigation.tool_request?.arguments?.route === '/checkout', 'Checkout must resolve to its canonical route');

const shortCheckout = await query('Cali, show me checkout.');
assert(shortCheckout.tool_request?.name === 'navigate', 'Bare show-me page wording must navigate when it matches a canonical route');
assert(shortCheckout.tool_request?.arguments?.route === '/checkout', 'Bare checkout wording must resolve to /checkout');

const promptPro = await query('Cali, show me the Prompt Pro page.');
assert(promptPro.tool_request?.name === 'navigate', 'Prompt Pro must be treated as a page navigation request');
assert(promptPro.tool_request?.arguments?.route === '/products/prompt-like-a-pro', 'Prompt Pro must resolve to its canonical product route');

const showCheckoutButton = await query('Cali, show me the Checkout button.');
assert(showCheckoutButton.tool_request?.name === 'point_to', 'A named button request must stay in the live pointer lane');

const missing = await query('Cali, point to the imaginary button.');
assert(!missing.tool_request, 'Missing target must fail closed');
assert(missing.metadata?.guidance === 'live_target_verification_pending', 'Missing target must report verification pending');

const waitlistEmail = await query('Cali, point to the waitlist email field.', []);
assert(waitlistEmail.tool_request?.name === 'point_to', 'A verified significant form field must resolve from the persistent map');
assert(waitlistEmail.tool_request?.pointer_target?.semantic_locator === '#waitlist-email', 'Email must not falsely resolve to the shorter Mail navigation label');

for (const targetId of ['target_b888495780f3', 'target_fe52618f499e']) {
  const proof = await fetch(`${baseUrl}/api/orb/pointer-proof?target_id=${targetId}`);
  assert(proof.status === 404, `Quarantined target ${targetId} must not receive pointer proof`);
}

console.log('Pointer routing acceptance tests passed.');
