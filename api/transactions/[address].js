const { isValidAddress, applyCors, sendJson, sendError } = require('../_lib/chain');

// GET /api/transactions/:address              -> normal BNB txs
// GET /api/transactions/:address?type=token   -> BEP20 token transfers
// GET /api/transactions/:address?type=internal -> internal txs
//
// Requires a free BscScan API key set as BSCSCAN_API_KEY in your
// Vercel project's Environment Variables. Get one at:
// https://bscscan.com/myapikey
module.exports = async (req, res) => {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return sendError(res, 405, 'Method not allowed. Use GET.');
  }

  const { address } = req.query;
  const { type, page, offset } = req.query;

  if (!isValidAddress(address)) {
    return sendError(res, 400, 'Invalid BSC address');
  }

  const apiKey = process.env.BSCSCAN_API_KEY;
  if (!apiKey) {
    return sendError(
      res,
      500,
      'Server is missing BSCSCAN_API_KEY. Add it in Vercel > Project Settings > Environment Variables (get a free key at https://bscscan.com/myapikey).'
    );
  }

  const actionMap = {
    token: 'tokentx',
    internal: 'txlistinternal',
    normal: 'txlist',
  };
  const action = actionMap[type] || 'txlist';

  const params = new URLSearchParams({
    module: 'account',
    action,
    address,
    startblock: '0',
    endblock: '99999999',
    page: page || '1',
    offset: offset || '25',
    sort: 'desc',
    apikey: apiKey,
  });

  try {
    const url = `https://api.bscscan.com/api?${params.toString()}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== '1' && data.message !== 'No transactions found') {
      return sendError(res, 502, 'BscScan API error', { detail: data.message || data.result });
    }

    sendJson(res, 200, {
      success: true,
      address,
      type: type || 'normal',
      count: Array.isArray(data.result) ? data.result.length : 0,
      transactions: data.result || [],
    });
  } catch (err) {
    sendError(res, 500, 'Failed to fetch transaction history', { detail: err.message });
  }
};
