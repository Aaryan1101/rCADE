import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

// Get all games
export async function GET() {
  try {
    const { rows } = await sql`
      SELECT * FROM games
      ORDER BY name ASC
    `

    return NextResponse.json({ games: rows }, { status: 200 })
  } catch (error) {
    console.error("Error fetching games:", error)
    return NextResponse.json({ error: "Failed to fetch games" }, { status: 500 })
  }
}

// Add a new game
export async function POST(request: NextRequest) {
  try {
    const { name, description, imageUrl, enabled } = await request.json()

    if (!name || !description) {
      return NextResponse.json({ error: "Name and description are required" }, { status: 400 })
    }

    const { rows } = await sql`
      INSERT INTO games (name, description, image_url, enabled)
      VALUES (${name}, ${description}, ${imageUrl || null}, ${enabled || true})
      RETURNING *
    `

    return NextResponse.json({ game: rows[0] }, { status: 201 })
  } catch (error) {
    console.error("Error creating game:", error)
    return NextResponse.json({ error: "Failed to create game" }, { status: 500 })
  }
}

