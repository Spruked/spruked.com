import path from 'node:path';

/**
 * Website-owned source of truth for non-protected CALI/ORB data.
 *
 * Orb_Assistant/CALI_System is intentionally not resolved through this helper;
 * that protected vault remains in place and is owned by the Orb Assistant.
 */
export function sprukedVaultRoot(): string {
  return process.env.SPRUKED_VAULT_ROOT?.trim()
    || path.join(process.cwd(), 'spruked_Vault');
}

export function sprukedVaultPath(...segments: string[]): string {
  return path.join(sprukedVaultRoot(), ...segments);
}

export function sprukedVaultPaths() {
  const root = sprukedVaultRoot();
  return {
    root,
    adminVault: path.join(root, 'state', 'admin-vault.json'),
    runtime: path.join(root, 'state', 'runtime'),
    orbState: path.join(root, 'state', 'orb'),
    mesh: path.join(root, 'telemetry', 'orb-mesh'),
    glyphTraces: path.join(root, 'telemetry', 'traces', 'glyphs'),
    audit: path.join(root, 'telemetry', 'audit'),
    websiteKnowledge: path.join(root, 'knowledge', 'website'),
    skg: path.join(root, 'knowledge', 'skg'),
  };
}
