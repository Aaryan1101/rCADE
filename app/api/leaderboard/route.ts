import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

// Get leaderboard for a specific game
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const gameId = searchParams.get("gameId")

    if (!gameId) {
      return NextResponse.json({ error: "Game ID is required" }, { status: 400 })
    }

    const { rows } = await sql`
      SELECT l.id, l.score, l.created_at, u.username, u.avatar_url
      FROM leaderboard l
      JOIN users u ON l.user_id = u.id
      WHERE l.game_id = ${gameId}
      ORDER BY l.score DESC
      LIMIT 100
    `

    return NextResponse.json({ leaderboard: rows }, { status: 200 })
  } catch (error) {
    console.error("Error fetching leaderboard:", error)
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 })
  }
}

// Add a new score to the leaderboard
export async function POST(request: NextRequest) {
  try {
    const { gameId, userId, score } = await request.json()

    if (!gameId || !userId || score === undefined) {
      return NextResponse.json({ error: "Game ID, user ID, and score are required" }, { status: 400 })
    }

    const { rows } = await sql`
      INSERT INTO leaderboard (game_id, user_id, score)
      VALUES (${gameId}, ${userId}, ${score})
      RETURNING id, score, created_at
    `

    return NextResponse.json({ entry: rows[0] }, { status: 201 })
  } catch (error) {
    console.error("Error adding leaderboard entry:", error)
    return NextResponse.json({ error: "Failed to add leaderboard entry" }, { status: 500 })
  }
}

