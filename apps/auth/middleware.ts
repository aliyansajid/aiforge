import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@repo/auth";

// Define public routes that don't require authentication
const publicRoutes = [
  "/login",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
];

// Middleware function to check authentication
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes without authentication
  if (publicRoutes.some((route) => pathname === route)) {
    return NextResponse.next();
  }

  // Check for session using NextAuth.js
  const session = await auth();

  // If no session and the route is not public, redirect to /login
  if (!session?.user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname); // Preserve the original URL for redirect after login
    return NextResponse.redirect(loginUrl);
  }

  // Allow authenticated users to proceed
  return NextResponse.next();
}

// Apply middleware to specific routes
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)", // Apply to all routes except API, static, image, and favicon
  ],
};
