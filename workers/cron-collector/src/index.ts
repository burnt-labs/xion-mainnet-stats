/**
 * Cloudflare Worker for scheduled collection of Xion wallet balances.
 * Runs on a cron schedule and inserts balance snapshots into Supabase.
 */

interface Env {
  SUPABASE_URL: string;
  SUPABASE_KEY: string;
}

interface BalanceResponse {
  balance: {
    denom: string;
    amount: string;
  };
}

const MONITORED_WALLETS = [
  {
    address: "xion1rzh8e2n4p59vdgtcdnjef9rlwp6y950fytheme",
    label: "Airdrop Wallet",
  },
  {
    address: "xion12q9q752mta5fvwjj2uevqpuku9y60j33j9rll0",
    label: "Fee Granter",
  },
  {
    address: "xion1ry3nup4y70dvj4pne67gn2vhzcy4ncdca8s0tykwga399qqzdfcqtvp30n",
    label: "BonusBlock Fee Granter",
  },
];

const XION_API_BASE = "https://api.xion-mainnet-1.burnt.com";

async function fetchBalance(address: string): Promise<BalanceResponse> {
  const url = `${XION_API_BASE}/cosmos/bank/v1beta1/balances/${address}/by_denom?denom=uxion`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch balance for ${address}: ${response.status}`);
  }

  return response.json();
}

async function insertBalance(
  env: Env,
  address: string,
  balance: string,
  data: BalanceResponse
): Promise<void> {
  const url = `${env.SUPABASE_URL}/rest/v1/feegrant_balance`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: env.SUPABASE_KEY,
      Authorization: `Bearer ${env.SUPABASE_KEY}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      address,
      balance,
      data,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to insert balance for ${address}: ${error}`);
  }
}

async function collectBalance(
  env: Env,
  wallet: { address: string; label: string }
): Promise<{ success: boolean; label: string; balance?: string; error?: string }> {
  try {
    const data = await fetchBalance(wallet.address);
    const balance = data.balance?.amount || "0";

    await insertBalance(env, wallet.address, balance, data);

    return { success: true, label: wallet.label, balance };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, label: wallet.label, error: message };
  }
}

export default {
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    console.log(`Cron triggered at ${new Date().toISOString()}`);

    const results = await Promise.all(
      MONITORED_WALLETS.map((wallet) => collectBalance(env, wallet))
    );

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    console.log(`Collection complete: ${successful.length} success, ${failed.length} failed`);

    if (failed.length > 0) {
      console.error("Failed collections:", failed);
    }

    successful.forEach((r) => {
      console.log(`  ${r.label}: ${r.balance} uxion`);
    });
  },
};
