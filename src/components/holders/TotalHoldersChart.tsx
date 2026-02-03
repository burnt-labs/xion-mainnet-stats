import { useQuery } from "@tanstack/react-query";
import { HoldersData } from "@/types/holders";
import { TimeSeriesChartWrapper } from "../charts/TimeSeriesChartWrapper";
import { TimeInterval } from "../charts/TimeSeriesChart";
import { useState } from "react";
import { APIError } from "@/utils/error-handling";

export const TotalHoldersChart = () => {
  const [timeInterval, setTimeInterval] = useState<TimeInterval>("24h");

  const {
    data: holdersData,
    isLoading,
    error,
  } = useQuery<HoldersData>({
    queryKey: ["holders", timeInterval],
    queryFn: async () => {
      const response = await fetch(
        `/api/holders?snapshot=true&interval=${timeInterval}`
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new APIError(
          errorData.error || "Failed to fetch holders data",
          response.status
        );
      }
      return response.json();
    },
  });

  const timeSeriesData =
    holdersData?.snapshots.map((snapshot) => ({
      timestamp: snapshot.timestamp,
      value: parseInt(snapshot.total_holders),
    })) || [];

  return (
    <TimeSeriesChartWrapper
      data={timeSeriesData}
      title="Total Holders - Historical Data"
      isLoading={isLoading}
      error={error}
      refetchWithInterval={setTimeInterval}
    />
  );
};
