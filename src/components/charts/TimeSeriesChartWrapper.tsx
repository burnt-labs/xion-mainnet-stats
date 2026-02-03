import { TimeInterval } from "./TimeSeriesChart";
import { TimeSeriesChart } from "./TimeSeriesChart";
import { TimeIntervalSelector } from "./TimeIntervalSelector";
import { useState } from "react";
import { isNotFoundError } from "@/utils/error-handling";

interface TimeSeriesChartWrapperProps {
  data: Array<{ timestamp: string; value: number }>;
  title: string;
  isLoading?: boolean;
  error?: unknown;
  refetchWithInterval?: (interval: TimeInterval) => void;
}

export const TimeSeriesChartWrapper = ({
  data,
  title,
  isLoading,
  error,
  refetchWithInterval,
}: TimeSeriesChartWrapperProps) => {
  const [timeInterval, setTimeInterval] = useState<TimeInterval>("24h");

  const handleIntervalChange = (interval: TimeInterval) => {
    setTimeInterval(interval);
    refetchWithInterval?.(interval);
  };

  return (
    <div className="p-4 border border-gray-700 rounded-lg shadow-lg bg-gray-800">
      <div className="flex flex-wrap gap-2 justify-between items-center mb-4">
        <h3 className="font-bold text-lg text-gray-100">{title}</h3>
        <TimeIntervalSelector
          value={timeInterval}
          onChange={handleIntervalChange}
        />
      </div>

      {Boolean(error) && (
        <div className={isNotFoundError(error) ? "text-gray-400" : "text-red-400"}>
          {isNotFoundError(error) ? "No data available" : "Error loading data"}
        </div>
      )}
      {isLoading && <div className="text-gray-400">Loading...</div>}
      {!error && !isLoading && data.length > 0 && (
        <TimeSeriesChart data={data} interval={timeInterval} />
      )}
      {!error && !isLoading && data.length === 0 && (
        <div className="text-gray-400">No data available</div>
      )}
    </div>
  );
};
