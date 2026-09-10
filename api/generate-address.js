const { ethers } = require('ethers');
const { applyCors, sendJson, sendError } = require('./_lib/chain');

// GET /api/generate-address
//
// Creates a brand new BNB Smart Chain (BEP20) wallet.
// The SAME address/private key works for BNB and every BEP20 token
// (USDT, USDC, BUSD, etc) since they all live on the same EVM chain.
//
// IMPORTANT: The private key is returned to the caller ONCE and is not
// stored anywhere by this API. Save it immediately and securely.
// Anyone who obtains this private key has full control of the wallet.
module.exports = async (req, res) => {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return sendError(res, 405, 'Method not allowed. Use GET.');
  }

  try {
    const wallet = ethers.Wallet.createRandom();

    sendJson(res, 200, {
      success: true,
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: wallet.mnemonic ? wallet.mnemonic.phrase : null,
      warning:
        'Store this private key securely offline. It is not saved by this API and cannot be recovered if lost. Never share it or send it to any untrusted service.',
    });
  } catch (err) {
    sendError(res, 500, 'Failed to generate address', { detail: err.message });
  }
};
