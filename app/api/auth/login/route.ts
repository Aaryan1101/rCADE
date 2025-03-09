import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import { compare } from "bcrypt"
import { SignJWT } from "jose"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    // Find the user
    const { rows } = await sql`
      SELECT id, username, email, password_hash, avatar_url
      FROM users
      WHERE email = ${email}
    `

    if (rows.length === 0) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const user = rows[0]

    // Verify password
    const passwordMatch = await compare(password, user.password_hash)

    if (!passwordMatch) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    // Create a JWT token
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key")

    const token = await new SignJWT({
      id: user.id,
      email: user.email,
      username: user.username,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secret)

    // Set the token as a cookie
    cookies().set({
      name: "auth-token",
      value: token,
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    // Return user data (without password)
    const { password_hash, ...userData } = user

    return NextResponse.json({ user: userData }, { status: 200 })
  } catch (error) {
    console.error("Error during login:", error)
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}

