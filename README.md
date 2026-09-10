# BEP20 / BNB Smart Chain Wallet API

A small serverless API for BNB Smart Chain: generate wallets, check BNB and
BEP20 token balances (USDT, USDC, BUSD by default — easy to add more),
send BNB or tokens, and pull transaction history. Built for Vercel's free
tier using Node.js serverless functions and `ethers.js`.

## ⚠️ Read this before deploying publicly

The `/api/send` endpoint accepts a **private key** in the request body so it
can sign transactions. That is unavoidable if you want a "send" API at all —
but it means:

- **Never** put the private key in a URL (query string or path). This repo
  deliberately only accepts it in a POST JSON body, to keep it out of
  server access logs, browser history, and `Referer` headers.
- Even in a POST body, if you deploy this **publicly with no auth**, anyone
  who obtains the URL and a valid private key can move funds. That's true
  of any hosted signer, not just this one.
- **Before going public**, add your own authentication — an API key check,
  a JWT, or an IP allowlist — in front of `/api/send` at minimum. A simple
  starting point is in `api/send.js` (see the `API_AUTH_TOKEN` comment).
- Consider rate limiting (Vercel Edge Config, Upstash Redis, etc.) to stop
  brute-force / abuse.
- This API does not log or persist private keys anywhere in its own code,
  but Vercel's platform-level request logging, and any error-tracking
  integration you add, could still capture request bodies. Review your
  own logging setup.
- **The safest pattern** is still to sign transactions client-side (in the
  browser or your own backend you control) using a library like `ethers.js`
  or a wallet like MetaMask, and only ever send the API a *signed*
  transaction to broadcast — not a raw private key. This repo's `/send`
  accepts a raw key for simplicity/parity with the original request; swap
  it for client-side signing when you're ready for production use with
  real funds.

If you're just experimenting or testing with throwaway wallets / testnet
funds, the current design is fine as-is.

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/generate-address` | Create a new wallet (address + private key) |
| GET | `/api/balance/:address` | Native BNB balance |
| GET | `/api/balance/:address?token=USDT` | Balance of a specific BEP20 token |
| GET | `/api/balance/:address?all=true` | BNB + all known token balances |
| POST | `/api/send` | Send BNB or a BEP20 token (see body below) |
| GET | `/api/transactions/:address` | Normal BNB transaction history |
| GET | `/api/transactions/:address?type=token` | BEP20 token transfer history |
| GET | `/api/transactions/:address?type=internal` | Internal transaction history |

### `POST /api/send` body

```json
{
  "privateKey": "0xabc123...",
  "to": "0xRecipientAddress",
  "amount": "0.5",
  "token": "USDT"
}
```

Omit `token` (or set it to `"BNB"`) to send native BNB instead of a token.

## Setup

1. **Install dependencies** (optional locally — Vercel installs them on deploy):
   ```bash
   npm install
   ```

2. **Push to GitHub**, then import the repo in [Vercel](https://vercel.com/new).

3. **Set environment variables** in Vercel → Project → Settings →
   Environment Variables:
   - `BSC_RPC_URL` (optional but recommended) — a dedicated BSC RPC URL.
     The public default (`bsc-dataseed.binance.org`) is rate-limited.
     Free options: [Ankr](https://www.ankr.com/rpc/bsc/),
     [NodeReal](https://nodereal.io), [GetBlock](https://getblock.io).
   - `BSCSCAN_API_KEY` (required for `/api/transactions`) — free key from
     [bscscan.com/myapikey](https://bscscan.com/myapikey).

4. **Deploy.** Vercel will pick up everything in `/api` automatically as
   serverless functions.

## Adding more tokens

Edit `api/_lib/chain.js` and add an entry to the `TOKENS` object with the
token's symbol and BSC contract address:

```javascript
const TOKENS = {
  USDT: { symbol: 'USDT', address: '0x55d398326f99059fF775485246999027B3197955' },
  // add more here
  CAKE: { symbol: 'CAKE', address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82' },
};
```

## Local testing

```bash
npm install -g vercel
vercel dev
```

Then hit `http://localhost:3000/api/generate-address`, etc.

## License

Use freely, no warranty. You are responsible for securing any real funds
you route through this.
