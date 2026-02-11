/**
 * Cloudflare Worker for scheduled collection of Xion wallet balances.
 * Runs on a cron schedule and inserts balance snapshots into Supabase.
 */

interface Env {
  SUPABASE_URL: string;
  SUPABASE_KEY: string;
  SLACK_BOT_TOKEN: string;
  SLACK_CHANNEL_ID: string;
}

interface BalanceResponse {
  balance: {
    denom: string;
    amount: string;
  };
}

interface MonitoredWallet {
  address: string;
  label: string;
  threshold: string; // uxion amount — alert when balance drops below this
}

const MONITORED_WALLETS: MonitoredWallet[] = [
  {
    address: "xion1rzh8e2n4p59vdgtcdnjef9rlwp6y950fytheme",
    label: "Airdrop Wallet",
    threshold: "0.20",
  },
  {
    address: "xion12q9q752mta5fvwjj2uevqpuku9y60j33j9rll0",
    label: "Fee Granter",
    threshold: "700.000",
  },
  {
    address: "xion1ry3nup4y70dvj4pne67gn2vhzcy4ncdca8s0tykwga399qqzdfcqtvp30n",
    label: "BonusBlock Fee Granter",
    threshold: "700.000",
  },
];

const XION_API_BASE = "https://api.xion-mainnet-1.burnt.com";
const DENOM_OWNERS_URL = `${XION_API_BASE}/cosmos/bank/v1beta1/denom_owners/uxion`;

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

const ALERT_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

async function sendSlackAlert(
  env: Env,
  wallet: MonitoredWallet,
  currentBalance: string
): Promise<void> {
  const xionBalance = (BigInt(currentBalance) / BigInt(1_000_000)).toString();
  const xionThreshold = (BigInt(wallet.threshold) / BigInt(1_000_000)).toString();

  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.SLACK_BOT_TOKEN}`,
    },
    body: JSON.stringify({
      channel: env.SLACK_CHANNEL_ID,
      text: `⚠️ *Low Balance Alert*\n*${wallet.label}* balance is *${xionBalance} XION* (threshold: ${xionThreshold} XION)\nAddress: \`${wallet.address}\``,
    }),
  });

  if (!response.ok) {
    console.error(`Failed to send Slack alert for ${wallet.label}: ${response.status}`);
    return;
  }

  const data = (await response.json()) as { ok: boolean; error?: string };
  if (!data.ok) {
    console.error(`Slack API error for ${wallet.label}: ${data.error}`);
  }
}

async function getLastAlertTime(env: Env, address: string): Promise<Date | null> {
  const url = `${env.SUPABASE_URL}/rest/v1/balance_alerts?address=eq.${address}&select=alerted_at`;
  const res = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_KEY,
      Authorization: `Bearer ${env.SUPABASE_KEY}`,
    },
  });

  if (!res.ok) {
    console.error(`Failed to query alert state for ${address}: ${res.status}`);
    return null;
  }

  const rows = (await res.json()) as { alerted_at: string }[];
  return rows.length > 0 ? new Date(rows[0].alerted_at) : null;
}

async function upsertAlertTime(env: Env, address: string): Promise<void> {
  const url = `${env.SUPABASE_URL}/rest/v1/balance_alerts`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: env.SUPABASE_KEY,
      Authorization: `Bearer ${env.SUPABASE_KEY}`,
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({ address, alerted_at: new Date().toISOString() }),
  });

  if (!res.ok) {
    console.error(`Failed to upsert alert time for ${address}: ${res.status}`);
  }
}

async function checkAndAlert(env: Env, wallet: MonitoredWallet, balance: string): Promise<void> {
  try {
    if (BigInt(balance) < BigInt(wallet.threshold)) {
      const lastAlert = await getLastAlertTime(env, wallet.address);
      const now = Date.now();
      if (!lastAlert || now - lastAlert.getTime() > ALERT_COOLDOWN_MS) {
        await sendSlackAlert(env, wallet, balance);
        await upsertAlertTime(env, wallet.address);
        console.log(`Slack alert sent for ${wallet.label}`);
      } else {
        console.log(`Slack alert suppressed for ${wallet.label} (cooldown active)`);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Alert check failed for ${wallet.label}: ${message}`);
  }
}

async function collectHolders(env: Env): Promise<void> {
  console.log("Fetching holder count from chain...");

  const response = await fetch(DENOM_OWNERS_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch denom owners: ${response.status}`);
  }

  const data = (await response.json()) as {
    denom_owners: unknown[];
    pagination: { next_key: string | null; total: string };
  };

  const totalHolders = data.pagination.total;

  const insertRes = await fetch(`${env.SUPABASE_URL}/rest/v1/Xion Holders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: env.SUPABASE_KEY,
      Authorization: `Bearer ${env.SUPABASE_KEY}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      total_holders: totalHolders,
      data: data.denom_owners,
    }),
  });

  if (!insertRes.ok) {
    const error = await insertRes.text();
    throw new Error(`Failed to insert holder data: ${error}`);
  }

  console.log(`Holder snapshot saved: ${totalHolders} holders`);
}

async function collectBalance(
  env: Env,
  wallet: MonitoredWallet
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
    console.log(`Cron triggered at ${new Date().toISOString()} (${controller.cron})`);

    // Daily cron: collect holder count
    if (controller.cron === "0 3 * * *") {
      try {
        await collectHolders(env);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error(`Holder collection failed: ${message}`);
      }
      return;
    }

    // Every 5 minutes: collect wallet balances
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

    // Check thresholds and send Slack alerts with cooldown
    await Promise.all(
      successful.map((r) => {
        const wallet = MONITORED_WALLETS.find((w) => w.label === r.label);
        if (wallet && r.balance) {
          return checkAndAlert(env, wallet, r.balance);
        }
      })
    );
  },
};
