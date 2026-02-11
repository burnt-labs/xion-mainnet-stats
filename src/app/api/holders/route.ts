import { NextResponse } from "next/server";
import supabase from "../../../lib/supabase";
import { TimeInterval } from "@/components/charts/TimeSeriesChart";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const interval = (searchParams.get("interval") || "24h") as TimeInterval;

  try {
    const now = new Date();
    let startTime: Date;

    switch (interval) {
      case "1h":
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case "24h":
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "7d":
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "all":
        startTime = new Date(0);
        break;
      case "current": {
        // Fetch only the most recent snapshot
        const { data: latestData, error: latestError } = await supabase
          .from("Xion Holders")
          .select("total_holders, updated_at")
          .order("updated_at", { ascending: false })
          .limit(1);

        if (latestError) throw latestError;

        if (!latestData || latestData.length === 0) {
          return NextResponse.json(
            { error: "No holder data found" },
            { status: 404 }
          );
        }

        return NextResponse.json({
          snapshots: latestData.map((record) => ({
            timestamp: record.updated_at,
            total_holders: record.total_holders,
          })),
        });
      }
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const query = supabase
      .from("Xion Holders")
      .select("total_holders, updated_at")
      .gte("updated_at", startTime.toISOString())
      .order("updated_at", { ascending: true });

    const { data, error } = await query;

    if (error) throw error;

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "No holder data found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      snapshots: data.map((record) => ({
        timestamp: record.updated_at,
        total_holders: record.total_holders,
      })),
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      },
      { status: 500 }
    );
  }
}
