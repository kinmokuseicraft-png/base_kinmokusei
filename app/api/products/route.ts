import { NextResponse } from "next/server";
import { getBaseProducts } from "@/lib/base_api";

/** LIFF・ダッシュボード用：BASE 商品一覧を JSON で返す */
export async function GET() {
  const products = await getBaseProducts({ limit: 50 });
  return NextResponse.json(products);
}
