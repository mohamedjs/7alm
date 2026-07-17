import { NextRequest } from "next/server";
import { POST as createOrder } from "@/app/api/orders/route";
import { requireN8nAccess } from "@/lib/n8n-auth";

export async function POST(request: NextRequest) {
  const unauthorizedResponse = requireN8nAccess(request);
  if (unauthorizedResponse) return unauthorizedResponse;

  return createOrder(request);
}
