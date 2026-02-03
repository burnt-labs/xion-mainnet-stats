import { NextResponse } from "next/server";
import supabase from "../../../lib/supabase";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("feegrant_balance")
      .select("*")
      .eq("address", address)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) throw error;

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "No balance data found for this address" },
        { status: 404 }
      );
    }

    return NextResponse.json(data[0]);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      },
      { status: 500 }
    );
  }
}
