import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

// Get user by ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id

    const { rows } = await sql`
      SELECT id, username, email, avatar_url, created_at
      FROM users
      WHERE id = ${id}
    `

    if (rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ user: rows[0] }, { status: 200 })
  } catch (error) {
    console.error("Error fetching user:", error)
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 })
  }
}

// Update user
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const { username, avatarUrl } = await request.json()

    // In a real app, you would verify the user is updating their own profile

    const updates = []
    const values: any[] = []

    if (username) {
      updates.push(`username = $${updates.length + 1}`)
      values.push(username)
    }

    if (avatarUrl !== undefined) {
      updates.push(`avatar_url = $${updates.length + 1}`)
      values.push(avatarUrl)
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    values.push(id)

    const { rows } = await sql`
      UPDATE users
      SET ${sql.raw(updates.join(", "))}
      WHERE id = ${id}
      RETURNING id, username, email, avatar_url, created_at
    `

    if (rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ user: rows[0] }, { status: 200 })
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}

