const { applyCors, sendJson } = require('./_lib/chain');

module.exports = async (req, res) => {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  sendJson(res, 200, {
    name: 'BEP20 / BNB Smart Chain Wallet API',
    endpoints: {
      generateAddress: 'GET /api/generate-address',
      balance: 'GET /api/balance/:address  (optional ?token=USDT or ?all=true)',
      send: 'POST /api/send  (JSON body: privateKey, to, amount, token)',
      transactions: 'GET /api/transactions/:address  (optional ?type=token|internal)',
    },
    notes: [
      'Private keys are only ever accepted in POST body, never in URLs.',
      'Set BSC_RPC_URL and BSCSCAN_API_KEY in your Vercel environment variables.',
      'This API does not store or log private keys.',
    ],
  });
};
