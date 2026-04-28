import { NextResponse } from "next/server";
import { fetchRandomQuote } from "@/lib/quotes";

export const dynamic = "force-dynamic";

export async function GET() {
  const quote = await fetchRandomQuote();
  return NextResponse.json(quote);
}
