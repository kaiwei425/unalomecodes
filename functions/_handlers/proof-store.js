function createProofStoreUtils(deps){
  const {
    extractProofKeyFromUrl
  } = deps;

  async function getProofFromStore(env, rawKey) {
    const k = String(rawKey || '');
    if (!k) return null;

    // 1. Try exact or decoded key from R2 bucket
    const tryKeys = [k];
    try { tryKeys.push(decodeURIComponent(k)); } catch {}
    for (const key of tryKeys) {
      try {
        const obj = await env.R2_BUCKET.get(key);
        if (obj) {
          const bin = await obj.arrayBuffer();
          const contentType = (obj.httpMetadata && obj.httpMetadata.contentType) || 'image/jpeg';
          return { source: 'r2', key, bin, metadata: { contentType } };
        }
      } catch (e) {
        console.log('R2 get failed for', key, e);
      }
    }

    // 2. Fallback: try KV (RECEIPTS)
    try {
      const res = env.RECEIPTS.getWithMetadata
        ? await env.RECEIPTS.getWithMetadata(k)
        : { value: await env.RECEIPTS.get(k, { type: 'arrayBuffer' }), metadata: {} };
      const bin = res && res.value;
      if (bin instanceof ArrayBuffer || (bin && typeof bin.byteLength === 'number')) {
        return { source: 'kv', key: k, bin, metadata: res.metadata || {} };
      }
    } catch (e) {
      console.log('KV get failed for', k, e);
    }

    return null;
  }

  return { getProofFromStore };
}

export { createProofStoreUtils };
