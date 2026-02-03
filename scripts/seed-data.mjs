#!/usr/bin/env node

/**
 * Seed script to populate the database with initial data from Xion mainnet.
 * 
 * Usage:
 *   npm run seed
 *   npm run seed -- --base-url=https://your-deployed-url.com
 * 
 * Requires the app to be running (npm run dev) or specify a deployed URL.
 */

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

const DEFAULT_BASE_URL = "http://localhost:3000";

async function getBaseUrl() {
  const args = process.argv.slice(2);
  const baseUrlArg = args.find((arg) => arg.startsWith("--base-url="));
  if (baseUrlArg) {
    return baseUrlArg.split("=")[1];
  }
  return DEFAULT_BASE_URL;
}

async function fetchWithRetry(url, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      const data = await response.json();
      return { ok: response.ok, status: response.status, data };
    } catch (error) {
      if (i === retries - 1) throw error;
      console.log(`  Retry ${i + 1}/${retries}...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

async function seedWalletBalances(baseUrl) {
  console.log("\n📊 Seeding wallet balances...\n");

  for (const wallet of MONITORED_WALLETS) {
    console.log(`  Fetching ${wallet.label}...`);
    try {
      const result = await fetchWithRetry(
        `${baseUrl}/api/fetch-wallet?address=${wallet.address}`
      );

      if (result.ok) {
        const balance = parseInt(result.data.balance) / 1_000_000;
        console.log(`  ✓ ${wallet.label}: ${balance.toLocaleString()} XION`);
      } else {
        console.log(`  ✗ ${wallet.label}: ${result.data.error || "Failed"}`);
      }
    } catch (error) {
      console.log(`  ✗ ${wallet.label}: ${error.message}`);
    }
  }
}

async function seedHolders(baseUrl) {
  console.log("\n👥 Seeding holders data...\n");

  try {
    console.log("  Fetching total holders...");
    const result = await fetchWithRetry(`${baseUrl}/api/fetch-holders`);

    if (result.ok) {
      console.log(
        `  ✓ Total holders: ${parseInt(result.data.total).toLocaleString()}`
      );
    } else {
      console.log(`  ✗ Failed: ${result.data.error || "Unknown error"}`);
    }
  } catch (error) {
    console.log(`  ✗ Failed: ${error.message}`);
  }
}

async function main() {
  const baseUrl = await getBaseUrl();

  console.log("🌱 Xion Mainnet Stats - Database Seeder");
  console.log("=======================================");
  console.log(`Base URL: ${baseUrl}`);

  // Check if server is reachable
  try {
    await fetch(baseUrl);
  } catch (error) {
    console.error(`\n❌ Cannot reach ${baseUrl}`);
    console.error("   Make sure the app is running (npm run dev)");
    process.exit(1);
  }

  await seedWalletBalances(baseUrl);
  await seedHolders(baseUrl);

  console.log("\n✅ Seeding complete!\n");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

