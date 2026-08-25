function createOrbBridge() {
  const baseUrl = process.env.SPRUKED_ORB_URL || 'http://127.0.0.1:3001';

  return {
    async status() {
      return {
        adapter: 'electron_dock_adapter',
        cognition_owner: 'cali_skg',
        voice_owner: 'kokoro',
        target: baseUrl,
      };
    },

    async send(payload = {}) {
      const response = await fetch(`${baseUrl}/api/orb`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return response.json();
    },
  };
}

module.exports = { createOrbBridge };

