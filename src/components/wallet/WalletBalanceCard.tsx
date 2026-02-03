import { useQuery } from "@tanstack/react-query";
import { WalletBalance } from "@/types/wallet";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { APIError, isNotFoundError } from "@/utils/error-handling";

interface WalletBalanceCardProps {
  address: string;
  label: string;
}

export const WalletBalanceCard = ({
  address,
  label,
}: WalletBalanceCardProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data, isLoading, error, refetch } = useQuery<WalletBalance>({
    queryKey: ["wallet-balance", address],
    queryFn: async () => {
      const response = await fetch(`/api/wallet-balance?address=${address}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new APIError(
          errorData.error || "Failed to fetch wallet data",
          response.status
        );
      }
      return response.json();
    },
    refetchInterval: 5 * 60 * 1000,
    refetchIntervalInBackground: false,
  });

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      const response = await fetch(`/api/fetch-wallet?address=${address}`);
      if (!response.ok) throw new Error("Failed to fetch wallet data");

      await refetch();
    } catch (error) {
      console.error("Error refreshing wallet:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (error) {
    if (isNotFoundError(error)) {
      return (
        <div className="p-4 border border-gray-700 rounded-lg shadow-lg bg-gray-800 overflow-hidden">
          <h3 className="font-bold text-lg text-gray-100">{label}</h3>
          <p className="text-sm text-gray-400 break-all">{address}</p>
          <p className="mt-2 text-gray-400">No balance data available</p>
        </div>
      );
    }
    return <div className="text-red-400">Error loading balance</div>;
  }
  if (isLoading) return <div className="text-gray-400">Loading...</div>;

  const balance = data?.balance ? parseInt(data.balance) / 1000000 : 0;

  return (
    <div className="p-4 border border-gray-700 rounded-lg shadow-lg bg-gray-800 overflow-hidden">
      <h3 className="font-bold text-lg text-gray-100">{label}</h3>
      <p className="text-sm text-gray-400 break-all">{address}</p>
      <p className="mt-2 text-gray-200">
        Balance: {balance.toLocaleString()} XION
      </p>
      <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
        <span className="break-words">
          Last updated:{" "}
          {data?.created_at
            ? new Date(data.created_at).toLocaleString()
            : "N/A"}
        </span>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-1 hover:bg-gray-700 rounded-full transition-colors disabled:opacity-50 flex-shrink-0"
          title="Refresh balance"
        >
          <ArrowPathIcon
            className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`}
          />
        </button>
      </div>
    </div>
  );
};
