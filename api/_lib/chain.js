const { ethers } = require('ethers');

// ---- RPC provider -----------------------------------------------------
// Public free RPC by default. For production, set BSC_RPC_URL in Vercel
// env vars to a dedicated provider (e.g. a free-tier key from
// getblock.io, nodereal.io, ankr.com, or your own bsc-dataseed mirror).
// Public endpoints are rate-limited and not guaranteed to stay online.
const RPC_URL = process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org';

function getProvider() {
  return new ethers.JsonRpcProvider(RPC_URL);
}

// ---- Known BEP20 tokens ------------------------------------------------
// Add more tokens here as needed. Contract addresses are BSC mainnet.
const TOKENS = {
  USDT: {
    symbol: 'USDT',
    address: '0x55d398326f99059fF775485246999027B3197955',
  },
  USDC: {
    symbol: 'USDC',
    address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
  },
  BUSD: {
    symbol: 'BUSD',
    address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
  },
};

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function transfer(address to, uint256 amount) returns (bool)',
];

function getTokenBySymbol(symbol) {
  if (!symbol) return null;
  const key = String(symbol).toUpperCase();
  return TOKENS[key] || null;
}

function isValidAddress(address) {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
}

function isValidPrivateKey(key) {
  try {
    if (typeof key !== 'string') return false;
    const normalized = key.startsWith('0x') ? key : `0x${key}`;
    if (normalized.length !== 66) return false;
    new ethers.Wallet(normalized);
    return true;
  } catch {
    return false;
  }
}

// ---- Response helpers ---------------------------------------------------
function sendJson(res, status, payload) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(payload, null, 2));
}

function sendError(res, status, message, extra = {}) {
  sendJson(res, status, { success: false, error: message, ...extra });
}

// Basic CORS + method guard used by every route
function applyCors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = {
  getProvider,
  TOKENS,
  ERC20_ABI,
  getTokenBySymbol,
  isValidAddress,
  isValidPrivateKey,
  sendJson,
  sendError,
  applyCors,
};
