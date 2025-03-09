import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import { hash } from "bcrypt"

// Get all users (admin only)
export async function GET(request: NextRequest) {
  try {
    // In a real app, you would check for admin permissions here
    const { rows } = await sql`
      SELECT id, username, email, avatar_url, created_at
      FROM users
      ORDER BY username ASC
    `

    return NextResponse.json({ users: rows }, { status: 200 })
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}

// Create a new user
export async function POST(request: NextRequest) {
  try {
    const { username, email, password, avatarUrl } = await request.json()

    if (!username || !email || !password) {
      return NextResponse.json({ error: "Username, email, and password are required" }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await sql`
      SELECT id FROM users WHERE email = ${email} OR username = ${username}
    `

    if (existingUser.rowCount > 0) {
      return NextResponse.json({ error: "User with this email or username already exists" }, { status: 409 })
    }

    // Hash the password
    const hashedPassword = await hash(password, 10)

    // Create the user
    const { rows } = await sql`
      INSERT INTO users (username, email, password_hash, avatar_url)
      VALUES (${username}, ${email}, ${hashedPassword}, ${avatarUrl || null})
      RETURNING id, username, email, avatar_url, created_at
    `

    return NextResponse.json({ user: rows[0] }, { status: 201 })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}

