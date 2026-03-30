/**
 * Public Solana address for USDC (SPL) deposits.
 * Set `NEXT_PUBLIC_SOL_USDC_DEPOSIT_ADDRESS` in `.env.local` to your vault.
 * Fallback is a valid base58 pubkey shape for QR/copy demos only.
 */
const FALLBACK_DEMO = "11111111111111111111111111111112";

export function getSolUsdcDepositAddress(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SOL_USDC_DEPOSIT_ADDRESS;
  if (fromEnv && fromEnv.trim().length >= 32) return fromEnv.trim();
  return FALLBACK_DEMO;
}
