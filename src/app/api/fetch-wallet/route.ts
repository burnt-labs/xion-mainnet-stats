import { NextResponse } from "next/server";
import axios from "axios";
import supabase from "@/lib/supabase";
import { notifySubscribers } from "@/lib/bot";

const WALLET_THRESHOLDS = {
  xion12q9q752mta5fvwjj2uevqpuku9y60j33j9rll0: {
    name: "Fee Granter",
    threshold: 100_000_000,
  },
  xion1ry3nup4y70dvj4pne67gn2vhzcy4ncdca8s0tykwga399qqzdfcqtvp30n: {
    name: "BonusBlock Fee Granter",
    threshold: 25_000_000,
  },
} as const;

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

    console.log("fetch wallet test", address, balance_int);

    if (address in WALLET_THRESHOLDS) {
      const walletInfo =
        WALLET_THRESHOLDS[address as keyof typeof WALLET_THRESHOLDS];
      if (balance_int < walletInfo.threshold) {
        const warningMessage = `⚠️ ${walletInfo.name} wallet balance is low: ${
          balance_int / 1_000_000
        } XION (threshold: ${
          walletInfo.threshold / 1_000_000
        } XION)\nhttps://www.mintscan.io/xion/address/${address}`;
        responseMessage += `- ${warningMessage}`;
        await notifySubscribers(warningMessage);
      }
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
