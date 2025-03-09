"use server"

// This is a mock implementation of a leaderboard API
// In a real application, this would connect to a database

// Mock leaderboard data
const leaderboards: Record<string, { name: string; score: number }[]> = {
  snake: [
    { name: "Player1", score: 200 },
    { name: "Player2", score: 180 },
    { name: "Player3", score: 150 },
    { name: "Player4", score: 120 },
  ],
  pong: [
    { name: "Player1", score: 120 },
    { name: "Player2", score: 100 },
    { name: "Player3", score: 80 },
    { name: "Player4", score: 60 },
  ],
  tetris: [
    { name: "Player1", score: 5000 },
    { name: "Player2", score: 4200 },
    { name: "Player3", score: 3800 },
    { name: "Player4", score: 2500 },
  ],
  "road-racer": [
    { name: "Player1", score: 3000 },
    { name: "Player2", score: 2500 },
    { name: "Player3", score: 2000 },
    { name: "Player4", score: 1500 },
  ],
}

export async function submitScore(game: string, name: string, score: number) {
  // In a real application, this would save to a database
  if (!leaderboards[game]) {
    leaderboards[game] = []
  }

  // Add the new score
  leaderboards[game].push({ name, score })

  // Sort by score (highest first)
  leaderboards[game].sort((a, b) => b.score - a.score)

  // Keep only top 10 scores
  if (leaderboards[game].length > 10) {
    leaderboards[game] = leaderboards[game].slice(0, 10)
  }

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  return { success: true }
}

export async function getLeaderboard(game: string) {
  // In a real application, this would fetch from a database

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  return leaderboards[game] || []
}

