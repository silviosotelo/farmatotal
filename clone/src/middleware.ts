import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  // Admin routes — session check happens in the page/API, not here.
  // This middleware just ensures the admin section exists.
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
