import { type NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"

export async function middleware(request: NextRequest) {
  // Paths that don't require authentication
  const publicPaths = ["/", "/login", "/register", "/api/auth/login", "/api/auth/register", "/api/games"]

  // Check if the path is public
  const path = request.nextUrl.pathname
  if (publicPaths.some((p) => path === p || path.startsWith(p + "/"))) {
    return NextResponse.next()
  }

  // Get the token from the cookies
  const token = request.cookies.get("auth-token")?.value

  // If there's no token, redirect to login
  if (!token) {
    const url = new URL("/login", request.url)
    url.searchParams.set("from", request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  try {
    // Verify the token
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key")

    await jwtVerify(token, secret)

    // If the token is valid, continue
    return NextResponse.next()
  } catch (error) {
    // If the token is invalid, redirect to login
    console.error("Invalid token:", error)
    const url = new URL("/login", request.url)
    url.searchParams.set("from", request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }
}

// Configure which paths should trigger this middleware
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/games/:path*/play",
    "/api/users/:path*",
    "/api/leaderboard/:path*",
    "/api/multiplayer/:path*",
  ],
}

