"use client";

import React from "react";
import { WalletBalanceCard } from "@/components/wallet/WalletBalanceCard";
import { WalletBalanceChart } from "@/components/wallet/WalletBalanceChart";
import { TotalHoldersCard } from "@/components/holders/TotalHoldersCard";
import { TotalHoldersChart } from "@/components/holders/TotalHoldersChart";

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
    label: "Bonus Block Fee Granter",
  },
];

const Dashboard = () => {
  return (
    <div className="p-4 bg-gray-900 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-100">
        Xion Network Dashboard
      </h1>

      {/* Current Balances Section */}
      <div className="mt-6">
        <h2 className="text-xl font-semibold text-gray-200 mb-4">
          Current Balances
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MONITORED_WALLETS.map((wallet) => (
            <WalletBalanceCard
              key={wallet.address}
              address={wallet.address}
              label={wallet.label}
            />
          ))}
          <TotalHoldersCard />
        </div>
      </div>

      {/* Historical Charts Section */}
      <div className="mt-10">
        <h2 className="text-xl font-semibold text-gray-200 mb-4">
          Historical Data
        </h2>
        <div className="grid grid-cols-1 gap-4">
          {MONITORED_WALLETS.map((wallet) => (
            <WalletBalanceChart
              key={`chart-${wallet.address}`}
              address={wallet.address}
              label={wallet.label}
            />
          ))}
          <TotalHoldersChart />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
