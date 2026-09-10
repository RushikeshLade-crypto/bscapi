const { isValidAddress, applyCors, sendJson, sendError } = require('../_lib/chain');

// GET /api/transactions/:address              -> normal BNB txs
// GET /api/transactions/:address?type=token   -> BEP20 token transfers
// GET /api/transactions/:address?type=internal -> internal txs
//
// Requires a free Etherscan API key set as BSCSCAN_API_KEY in your
// Vercel project's Environment Variables. Get one at:
// https://etherscan.io/myapikey
// (BscScan's standalone V1 API is deprecated — Etherscan now serves all
// 60+ EVM chains, including BSC, through one unified V2 API selected via
// the `chainid` parameter. An old BscScan-issued key still works here.)
const BSC_CHAIN_ID = 56;

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
      'Server is missing BSCSCAN_API_KEY. Add it in Vercel > Project Settings > Environment Variables (get a free key at https://etherscan.io/myapikey).'
    );
  }

  const actionMap = {
    token: 'tokentx',
    internal: 'txlistinternal',
    normal: 'txlist',
  };
  const action = actionMap[type] || 'txlist';

  const params = new URLSearchParams({
    chainid: String(BSC_CHAIN_ID),
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
    const url = `https://api.etherscan.io/v2/api?${params.toString()}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== '1' && data.message !== 'No transactions found') {
      const hint =
        data.message === 'NOTOK'
          ? 'This usually means BSCSCAN_API_KEY is not a valid Etherscan-issued key. Keys from BscScan/Polygonscan/Arbiscan etc are no longer valid for the V2 API — generate a new key at https://etherscan.io/apidashboard and use that instead. New keys can take a few minutes to activate.'
          : undefined;
      return sendError(res, 502, 'Etherscan API error', { detail: data.result || data.message, hint });
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
