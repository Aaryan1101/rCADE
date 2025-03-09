import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@vercel/postgres"

// Create a new multiplayer session
export async function POST(request: NextRequest) {
  try {
    const { gameId, hostId, maxPlayers, isPrivate, password } = await request.json()

    if (!gameId || !hostId) {
      return NextResponse.json({ error: "Game ID and host ID are required" }, { status: 400 })
    }

    // Generate a unique room code
    const roomCode = generateRoomCode()

    const { rows } = await sql`
      INSERT INTO multiplayer_sessions (
        game_id, host_id, room_code, max_players, 
        is_private, password_hash, status
      )
      VALUES (
        ${gameId}, ${hostId}, ${roomCode}, 
        ${maxPlayers || 4}, ${isPrivate || false}, 
        ${password ? password : null}, 'waiting'
      )
      RETURNING id, room_code, max_players, is_private, status, created_at
    `

    return NextResponse.json({ session: rows[0] }, { status: 201 })
  } catch (error) {
    console.error("Error creating multiplayer session:", error)
    return NextResponse.json({ error: "Failed to create multiplayer session" }, { status: 500 })
  }
}

// Get active multiplayer sessions
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const gameId = searchParams.get("gameId")

    let query = `
      SELECT 
        ms.id, ms.room_code, ms.max_players, ms.is_private, 
        ms.status, ms.created_at,
        g.name as game_name,
        u.username as host_name,
        COUNT(mp.user_id) as current_players
      FROM multiplayer_sessions ms
      JOIN games g ON ms.game_id = g.id
      JOIN users u ON ms.host_id = u.id
      LEFT JOIN multiplayer_participants mp ON ms.id = mp.session_id
      WHERE ms.status IN ('waiting', 'in_progress')
    `

    const params: any[] = []

    if (gameId) {
      query += ` AND ms.game_id = $1`
      params.push(gameId)
    }

    query += `
      GROUP BY ms.id, g.name, u.username
      ORDER BY ms.created_at DESC
    `

    const { rows } = await sql.query(query, params)

    return NextResponse.json({ sessions: rows }, { status: 200 })
  } catch (error) {
    console.error("Error fetching multiplayer sessions:", error)
    return NextResponse.json({ error: "Failed to fetch multiplayer sessions" }, { status: 500 })
  }
}

// Helper function to generate a random room code
function generateRoomCode() {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let result = ""
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}

