import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// In-memory fallback cache for sessions
const layoutCache = new Map<string, any>();

export async function GET(request: Request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId") || "default";

  const cached = layoutCache.get(userId);
  if (cached) {
    return NextResponse.json(cached);
  }

  // Also check if stored in a cookie
  const cookieStore = await cookies();
  const cookieVal = cookieStore.get(`ctrlfarm_dash_${userId}`)?.value;
  if (cookieVal) {
    try {
      const parsed = JSON.parse(decodeURIComponent(cookieVal));
      return NextResponse.json(parsed);
    } catch {
      // ignore
    }
  }

  return NextResponse.json({ layouts: null, cardsConfig: null });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userId = body.userId || "default";

    layoutCache.set(userId, {
      layouts: body.layouts,
      cardsConfig: body.cardsConfig,
      updatedAt: body.updatedAt,
    });

    const response = NextResponse.json({ success: true, timestamp: body.updatedAt });
    
    // Store lightweight version in cookie for persistence across processes
    try {
      response.cookies.set(`ctrlfarm_dash_${userId}`, encodeURIComponent(JSON.stringify({
        layouts: body.layouts,
        cardsConfig: body.cardsConfig,
      })), {
        maxAge: 60 * 60 * 24 * 365, // 1 year
        path: "/",
        sameSite: "lax",
      });
    } catch {
      // cookie write fallback
    }

    return response;
  } catch (error) {
    return NextResponse.json({ error: "Failed to persist layout" }, { status: 500 });
  }
}
