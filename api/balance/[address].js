const { ethers } = require('ethers');
const {
  getProvider,
  TOKENS,
  ERC20_ABI,
  isValidAddress,
  applyCors,
  sendJson,
  sendError,
} = require('../_lib/chain');

// GET /api/balance/:address
// GET /api/balance/:address?token=USDT   -> single token balance
// GET /api/balance/:address?all=true     -> BNB + all known tokens
//
// Default (no query params): returns native BNB balance only.
module.exports = async (req, res) => {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return sendError(res, 405, 'Method not allowed. Use GET.');
  }

  const { address } = req.query;
  const { token, all } = req.query;

  if (!isValidAddress(address)) {
    return sendError(res, 400, 'Invalid BSC address');
  }

  try {
    const provider = getProvider();

    // Single token balance
    if (token) {
      const tokenInfo = TOKENS[String(token).toUpperCase()];
      if (!tokenInfo) {
        return sendError(res, 400, `Unknown token "${token}"`, {
          knownTokens: Object.keys(TOKENS),
        });
      }
      const contract = new ethers.Contract(tokenInfo.address, ERC20_ABI, provider);
      const [raw, decimals] = await Promise.all([
        contract.balanceOf(address),
        contract.decimals(),
      ]);
      return sendJson(res, 200, {
        success: true,
        address,
        token: tokenInfo.symbol,
        contract: tokenInfo.address,
        balance: ethers.formatUnits(raw, decimals),
      });
    }

    // BNB + every known token
    if (all === 'true') {
      const bnbWei = await provider.getBalance(address);
      const tokenBalances = await Promise.all(
        Object.values(TOKENS).map(async (t) => {
          try {
            const contract = new ethers.Contract(t.address, ERC20_ABI, provider);
            const [raw, decimals] = await Promise.all([
              contract.balanceOf(address),
              contract.decimals(),
            ]);
            return { token: t.symbol, contract: t.address, balance: ethers.formatUnits(raw, decimals) };
          } catch {
            return { token: t.symbol, contract: t.address, balance: null, error: 'lookup failed' };
          }
        })
      );
      return sendJson(res, 200, {
        success: true,
        address,
        bnb: ethers.formatEther(bnbWei),
        tokens: tokenBalances,
      });
    }

    // Default: native BNB only
    const balanceWei = await provider.getBalance(address);
    sendJson(res, 200, {
      success: true,
      address,
      bnb: ethers.formatEther(balanceWei),
    });
  } catch (err) {
    sendError(res, 500, 'Failed to fetch balance', { detail: err.message });
  }
};
