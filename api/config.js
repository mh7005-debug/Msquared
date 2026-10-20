// GET /api/config -> public, non-secret flags the browser needs.
import { handler, sendJson } from '../lib/http.js';
import { getStore } from '../lib/store.js';

export default handler(['GET'], async (req, res) => {
  const store = await getStore();
  return sendJson(res, 200, {
    aiEnabled: Boolean(process.env.ANTHROPIC_API_KEY),
    clinicallyReviewed: process.env.CLINICAL_REVIEW_COMPLETE === 'true',
    storageReady: Boolean(store),
  });
});
