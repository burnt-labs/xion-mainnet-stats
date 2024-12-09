import { NextResponse } from "next/server";
import axios from "axios";
import supabase from "@/lib/supabase";
import { notifySubscribers } from "@/lib/bot";

const balance_threshold = 100_000_000;

const BASE_API_URL =
  "https://api.xion-mainnet-1.burnt.com/cosmos/bank/v1beta1/balances/";

interface UxionBalance {
  balance: {
    denom: string;
    amount: string;
  };
}

export async function GET(request: Request) {
  let responseMessage = "Wallet data successfully stored in Supabase";

  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    const response = await axios.get<UxionBalance>(
      `${BASE_API_URL}${address}/by_denom?denom=uxion`
    );

    const balance = response.data.balance.amount;

    // Store in database
    const { error } = await supabase.from("feegrant_balance").insert({
      balance: balance,
      data: response.data,
      address: address,
    });

    if (error) throw error;

    const balance_int = parseInt(balance);

    if (
      address === "xion12q9q752mta5fvwjj2uevqpuku9y60j33j9rll0" &&
      balance_int < balance_threshold
    ) {
      responseMessage += `- ⚠️ Wallet balance is low: ${address} has a balance of ${
        balance_int / 1_000_000
      } uxion`;
      await notifySubscribers(
        `⚠️ Wallet balance is low: ${address} has a balance of ${
          balance_int / 1_000_000
        } uxion`
      );
    }

    return NextResponse.json({
      success: true,
      address: address,
      balance: balance,
      message: responseMessage,
    });
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
