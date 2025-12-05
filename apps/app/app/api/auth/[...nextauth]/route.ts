import { handlers } from "@repo/auth";
import { NextRequest } from "next/server";

// Re-export with proper Next.js 16 types
export async function GET(request: NextRequest, context: { params: Promise<{ nextauth: string[] }> }) {
  return handlers.GET(request as any);
}

export async function POST(request: NextRequest, context: { params: Promise<{ nextauth: string[] }> }) {
  return handlers.POST(request as any);
}
