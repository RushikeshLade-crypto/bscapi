const { ethers } = require('ethers');
const {
  getProvider,
  TOKENS,
  ERC20_ABI,
  isValidAddress,
  isValidPrivateKey,
  applyCors,
  sendJson,
  sendError,
} = require('./_lib/chain');

// POST /api/send
// Content-Type: application/json
// Body:
// {
//   "privateKey": "0x...",
//   "to": "0xRecipientAddress",
//   "amount": "0.5",
//   "token": "USDT"        // omit or set "BNB" to send native BNB
// }
//
// SECURITY NOTES:
// - The private key is deliberately accepted only in a POST body, never
//   in the URL, so it does not end up in server access logs, browser
//   history, or Referer headers.
// - This API does not log, store, or persist the private key anywhere.
// - Signing happens locally in this function using ethers.Wallet; the
//   raw key is only ever used in memory for the duration of the request.
// - Even so: running this on a public serverless endpoint means anyone
//   who calls it with a valid key can move funds from that wallet.
//   Put this behind your own authentication (API key / JWT / IP allowlist)
//   before exposing it publicly, and consider rate limiting.
module.exports = async (req, res) => {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return sendError(res, 405, 'Method not allowed. Use POST with a JSON body.');
  }

  const { privateKey, to, amount, token } = req.body || {};

  if (!privateKey || !isValidPrivateKey(privateKey)) {
    return sendError(res, 400, 'Missing or invalid privateKey');
  }
  if (!to || !isValidAddress(to)) {
    return sendError(res, 400, 'Missing or invalid "to" address');
  }
  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    return sendError(res, 400, 'Missing or invalid amount');
  }

  try {
    const provider = getProvider();
    const normalizedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    const signer = new ethers.Wallet(normalizedKey, provider);
    const from = signer.address;

    // Native BNB transfer
    if (!token || String(token).toUpperCase() === 'BNB') {
      const tx = await signer.sendTransaction({
        to,
        value: ethers.parseEther(String(amount)),
      });
      const receipt = await tx.wait();

      return sendJson(res, 200, {
        success: true,
        type: 'BNB',
        from,
        to,
        amount: String(amount),
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        explorerUrl: `https://bscscan.com/tx/${receipt.hash}`,
      });
    }

    // BEP20 token transfer
    const tokenInfo = TOKENS[String(token).toUpperCase()];
    if (!tokenInfo) {
      return sendError(res, 400, `Unknown token "${token}"`, {
        knownTokens: Object.keys(TOKENS),
      });
    }

    const contract = new ethers.Contract(tokenInfo.address, ERC20_ABI, signer);
    const decimals = await contract.decimals();
    const amountUnits = ethers.parseUnits(String(amount), decimals);

    const tx = await contract.transfer(to, amountUnits);
    const receipt = await tx.wait();

    sendJson(res, 200, {
      success: true,
      type: tokenInfo.symbol,
      contract: tokenInfo.address,
      from,
      to,
      amount: String(amount),
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      explorerUrl: `https://bscscan.com/tx/${receipt.hash}`,
    });
  } catch (err) {
    // Never echo back the private key or full request body in error responses
    sendError(res, 500, 'Transaction failed', { detail: err.reason || err.message });
  }
};
