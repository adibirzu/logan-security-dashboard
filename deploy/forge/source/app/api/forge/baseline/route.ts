import { NextResponse } from "next/server"
import { baselineCatalog } from "@/lib/baseline-catalog"
export const dynamic = "force-dynamic"
export async function GET() {
  const data = await baselineCatalog()
  return NextResponse.json(data, {status: data.available ? 200 : 503, headers: {"Cache-Control": "no-store"}})
}
