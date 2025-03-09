import { sql } from "@vercel/postgres"

export async function createTables() {
  try {
    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(100) NOT NULL,
        avatar_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create games table
    await sql`
      CREATE TABLE IF NOT EXISTS games (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        image_url TEXT,
        enabled BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create user_game_progress table
    await sql`
      CREATE TABLE IF NOT EXISTS user_game_progress (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
        level INTEGER DEFAULT 1,
        unlocked_features JSONB DEFAULT '{}',
        last_played TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, game_id)
      )
    `

    // Create leaderboard table
    await sql`
      CREATE TABLE IF NOT EXISTS leaderboard (
        id SERIAL PRIMARY KEY,
        game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        score BIGINT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create multiplayer_sessions table
    await sql`
      CREATE TABLE IF NOT EXISTS multiplayer_sessions (
        id SERIAL PRIMARY KEY,
        game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
        host_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        room_code VARCHAR(10) UNIQUE NOT NULL,
        max_players INTEGER DEFAULT 4,
        is_private BOOLEAN DEFAULT FALSE,
        password_hash VARCHAR(100),
        status VARCHAR(20) DEFAULT 'waiting',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create multiplayer_participants table
    await sql`
      CREATE TABLE IF NOT EXISTS multiplayer_participants (
        id SERIAL PRIMARY KEY,
        session_id INTEGER REFERENCES multiplayer_sessions(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(session_id, user_id)
      )
    `

    console.log("Database tables created successfully")
    return { success: true }
  } catch (error) {
    console.error("Error creating database tables:", error)
    return { success: false, error }
  }
}

export async function seedInitialData() {
  try {
    // Seed initial games
    await sql`
      INSERT INTO games (name, description, image_url, enabled)
      VALUES 
        ('Snake', 'Classic snake game where you grow longer as you eat food', '/games/snake.png', TRUE),
        ('Pong', 'Two-player table tennis game with simple controls', '/games/pong.png', TRUE),
        ('Tetris', 'Arrange falling blocks to create complete lines', '/games/tetris.png', TRUE),
        ('Road Rash', 'Motorcycle racing game with combat elements', '/games/road-rash.png', TRUE)
      ON CONFLICT (name) DO NOTHING
    `

    console.log("Initial data seeded successfully")
    return { success: true }
  } catch (error) {
    console.error("Error seeding initial data:", error)
    return { success: false, error }
  }
}

