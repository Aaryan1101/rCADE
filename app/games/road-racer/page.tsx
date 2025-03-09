"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home, RefreshCcw, Trophy, Gauge } from "lucide-react"
import { submitScore } from "@/app/api/leaderboard"

// Game constants
const ROAD_WIDTH = 600
const ROAD_HEIGHT = 800
const PLAYER_WIDTH = 60
const PLAYER_HEIGHT = 100
const OBSTACLE_WIDTH = 60
const OBSTACLE_HEIGHT = 100
const LANE_COUNT = 3
const LANE_WIDTH = ROAD_WIDTH / LANE_COUNT

export default function RoadRacerGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [speed, setSpeed] = useState(5)
  const [username, setUsername] = useState("")
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [leaderboardData, setLeaderboardData] = useState<{ name: string; score: number }[]>([])

  // Game state refs to avoid closure issues
  const playerRef = useRef({
    x: ROAD_WIDTH / 2 - PLAYER_WIDTH / 2,
    y: ROAD_HEIGHT - PLAYER_HEIGHT - 20,
    lane: 1, // 0, 1, 2 (left, center, right)
    speed: 0,
  })

  const obstaclesRef = useRef<{ x: number; y: number; lane: number; type: string }[]>([])
  const roadMarkingsRef = useRef<{ y: number }[]>([])
  const scoreRef = useRef(0)
  const speedRef = useRef(5)
  const gameOverRef = useRef(false)
  const isPausedRef = useRef(false)
  const animationFrameRef = useRef<number | null>(null)
  const lastObstacleTimeRef = useRef(0)
  const lastSpeedIncreaseRef = useRef(0)

  // Initialize game
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    canvas.width = ROAD_WIDTH
    canvas.height = ROAD_HEIGHT

    // Load high score from localStorage
    const savedHighScore = localStorage.getItem("roadRacerHighScore")
    if (savedHighScore) {
      setHighScore(Number.parseInt(savedHighScore))
    }

    // Initialize game
    resetGame()

    // Keyboard controls
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOverRef.current) {
        if (e.key === " ") {
          resetGame()
        }
        return
      }

      if (isPausedRef.current) {
        if (e.key === " ") {
          togglePause()
        }
        return
      }

      if (e.key === "ArrowLeft") {
        movePlayer(-1)
      } else if (e.key === "ArrowRight") {
        movePlayer(1)
      } else if (e.key === " ") {
        togglePause()
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    // Touch controls for mobile
    let touchStartX = 0

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartX) return

      const touchEndX = e.touches[0].clientX
      const diffX = touchStartX - touchEndX

      // Determine swipe direction
      if (Math.abs(diffX) > 30) {
        // Minimum swipe distance
        if (diffX > 0) {
          movePlayer(1) // Swipe left to right
        } else {
          movePlayer(-1) // Swipe right to left
        }
        touchStartX = touchEndX // Update for continuous swipes
      }
    }

    canvas.addEventListener("touchstart", handleTouchStart)
    canvas.addEventListener("touchmove", handleTouchMove)

    // Start game loop
    startGameLoop()

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      window.removeEventListener("keydown", handleKeyDown)
      canvas.removeEventListener("touchstart", handleTouchStart)
      canvas.removeEventListener("touchmove", handleTouchMove)
    }
  }, [])

  // Update game state refs when state changes
  useEffect(() => {
    scoreRef.current = score
    speedRef.current = speed
    gameOverRef.current = gameOver
    isPausedRef.current = isPaused
  }, [score, speed, gameOver, isPaused])

  // Game functions
  const resetGame = () => {
    // Reset player
    playerRef.current = {
      x: ROAD_WIDTH / 2 - PLAYER_WIDTH / 2,
      y: ROAD_HEIGHT - PLAYER_HEIGHT - 20,
      lane: 1,
      speed: 0,
    }

    // Clear obstacles
    obstaclesRef.current = []

    // Initialize road markings
    roadMarkingsRef.current = []
    for (let i = 0; i < 10; i++) {
      roadMarkingsRef.current.push({
        y: i * 100,
      })
    }

    // Reset score and speed
    setScore(0)
    scoreRef.current = 0
    setSpeed(5)
    speedRef.current = 5

    // Reset game state
    setGameOver(false)
    gameOverRef.current = false
    setIsPaused(false)
    isPausedRef.current = false

    // Reset timers
    lastObstacleTimeRef.current = 0
    lastSpeedIncreaseRef.current = 0

    // Start game loop if not already running
    if (!animationFrameRef.current) {
      startGameLoop()
    }
  }

  const startGameLoop = () => {
    let lastTime = 0

    const gameLoop = (timestamp: number) => {
      // Calculate delta time
      const deltaTime = timestamp - lastTime
      lastTime = timestamp

      // Skip if game is paused or over
      if (!isPausedRef.current && !gameOverRef.current) {
        update(deltaTime, timestamp)
      }

      // Draw the game
      draw()

      // Continue the loop
      animationFrameRef.current = requestAnimationFrame(gameLoop)
    }

    // Start the loop
    animationFrameRef.current = requestAnimationFrame(gameLoop)
  }

  const update = (deltaTime: number, timestamp: number) => {
    // Update score
    const newScore = scoreRef.current + Math.floor(deltaTime * 0.01)
    setScore(newScore)
    scoreRef.current = newScore

    // Increase speed over time
    if (timestamp - lastSpeedIncreaseRef.current > 5000) {
      // Every 5 seconds
      const newSpeed = Math.min(speedRef.current + 0.5, 15) // Max speed cap
      setSpeed(newSpeed)
      speedRef.current = newSpeed
      lastSpeedIncreaseRef.current = timestamp
    }

    // Update road markings
    roadMarkingsRef.current.forEach((marking, index) => {
      marking.y += speedRef.current

      // Reset marking when it goes off screen
      if (marking.y > ROAD_HEIGHT) {
        marking.y = -100
      }
    })

    // Generate new obstacles
    if (timestamp - lastObstacleTimeRef.current > 1500 - speedRef.current * 50) {
      // Generate a random lane
      const lane = Math.floor(Math.random() * LANE_COUNT)

      // Generate a random obstacle type
      const types = ["car", "truck", "oil"]
      const type = types[Math.floor(Math.random() * types.length)]

      // Calculate x position based on lane
      const x = lane * LANE_WIDTH + (LANE_WIDTH - OBSTACLE_WIDTH) / 2

      // Add the obstacle
      obstaclesRef.current.push({
        x,
        y: -OBSTACLE_HEIGHT,
        lane,
        type,
      })

      lastObstacleTimeRef.current = timestamp
    }

    // Update obstacles
    obstaclesRef.current.forEach((obstacle, index) => {
      obstacle.y += speedRef.current

      // Remove obstacle when it goes off screen
      if (obstacle.y > ROAD_HEIGHT) {
        obstaclesRef.current.splice(index, 1)
      }

      // Check for collision with player
      if (
        obstacle.y + OBSTACLE_HEIGHT > playerRef.current.y &&
        obstacle.y < playerRef.current.y + PLAYER_HEIGHT &&
        obstacle.lane === playerRef.current.lane
      ) {
        handleGameOver()
      }
    })
  }

  const draw = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.fillStyle = "#333" // Road color
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw lane dividers
    ctx.strokeStyle = "#fff"
    ctx.lineWidth = 2

    for (let i = 1; i < LANE_COUNT; i++) {
      const x = i * LANE_WIDTH
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
      ctx.stroke()
    }

    // Draw road markings
    ctx.strokeStyle = "#fff"
    ctx.lineWidth = 10
    ctx.setLineDash([40, 40]) // Dashed line

    roadMarkingsRef.current.forEach((marking) => {
      for (let i = 0; i < LANE_COUNT; i++) {
        const x = i * LANE_WIDTH + LANE_WIDTH / 2

        ctx.beginPath()
        ctx.moveTo(x, marking.y)
        ctx.lineTo(x, marking.y + 40)
        ctx.stroke()
      }
    })

    ctx.setLineDash([]) // Reset dash

    // Draw obstacles
    obstaclesRef.current.forEach((obstacle) => {
      if (obstacle.type === "car") {
        // Draw car
        ctx.fillStyle = "#f00" // Red car
        ctx.fillRect(obstacle.x, obstacle.y, OBSTACLE_WIDTH, OBSTACLE_HEIGHT)

        // Car details
        ctx.fillStyle = "#000" // Windows
        ctx.fillRect(obstacle.x + 5, obstacle.y + 10, OBSTACLE_WIDTH - 10, 20)
        ctx.fillRect(obstacle.x + 5, obstacle.y + OBSTACLE_HEIGHT - 30, OBSTACLE_WIDTH - 10, 20)

        // Wheels
        ctx.fillStyle = "#000"
        ctx.fillRect(obstacle.x - 5, obstacle.y + 15, 5, 20)
        ctx.fillRect(obstacle.x - 5, obstacle.y + OBSTACLE_HEIGHT - 35, 5, 20)
        ctx.fillRect(obstacle.x + OBSTACLE_WIDTH, obstacle.y + 15, 5, 20)
        ctx.fillRect(obstacle.x + OBSTACLE_WIDTH, obstacle.y + OBSTACLE_HEIGHT - 35, 5, 20)
      } else if (obstacle.type === "truck") {
        // Draw truck
        ctx.fillStyle = "#00f" // Blue truck
        ctx.fillRect(obstacle.x - 10, obstacle.y, OBSTACLE_WIDTH + 20, OBSTACLE_HEIGHT)

        // Truck details
        ctx.fillStyle = "#000" // Windows
        ctx.fillRect(obstacle.x, obstacle.y + 10, OBSTACLE_WIDTH, 20)

        // Wheels
        ctx.fillStyle = "#000"
        ctx.fillRect(obstacle.x - 15, obstacle.y + 15, 5, 20)
        ctx.fillRect(obstacle.x - 15, obstacle.y + OBSTACLE_HEIGHT - 35, 5, 20)
        ctx.fillRect(obstacle.x + OBSTACLE_WIDTH + 10, obstacle.y + 15, 5, 20)
        ctx.fillRect(obstacle.x + OBSTACLE_WIDTH + 10, obstacle.y + OBSTACLE_HEIGHT - 35, 5, 20)
      } else if (obstacle.type === "oil") {
        // Draw oil slick
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
        ctx.beginPath()
        ctx.ellipse(
          obstacle.x + OBSTACLE_WIDTH / 2,
          obstacle.y + OBSTACLE_HEIGHT / 2,
          OBSTACLE_WIDTH / 2,
          OBSTACLE_HEIGHT / 3,
          0,
          0,
          Math.PI * 2,
        )
        ctx.fill()
      }
    })

    // Draw player
    ctx.fillStyle = "#0f0" // Green player car
    ctx.fillRect(playerRef.current.x, playerRef.current.y, PLAYER_WIDTH, PLAYER_HEIGHT)

    // Player car details
    ctx.fillStyle = "#000" // Windows
    ctx.fillRect(playerRef.current.x + 5, playerRef.current.y + 10, PLAYER_WIDTH - 10, 20)
    ctx.fillRect(playerRef.current.x + 5, playerRef.current.y + PLAYER_HEIGHT - 30, PLAYER_WIDTH - 10, 20)

    // Wheels
    ctx.fillStyle = "#000"
    ctx.fillRect(playerRef.current.x - 5, playerRef.current.y + 15, 5, 20)
    ctx.fillRect(playerRef.current.x - 5, playerRef.current.y + PLAYER_HEIGHT - 35, 5, 20)
    ctx.fillRect(playerRef.current.x + PLAYER_WIDTH, playerRef.current.y + 15, 5, 20)
    ctx.fillRect(playerRef.current.x + PLAYER_WIDTH, playerRef.current.y + PLAYER_HEIGHT - 35, 5, 20)

    // Draw score and speed
    ctx.fillStyle = "#fff"
    ctx.font = "20px Arial"
    ctx.textAlign = "left"
    ctx.fillText(`Score: ${scoreRef.current}`, 20, 30)

    ctx.textAlign = "right"
    ctx.fillText(`Speed: ${Math.floor(speedRef.current)}`, canvas.width - 20, 30)

    // Draw game over message
    if (gameOverRef.current) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.fillStyle = "#f00"
      ctx.font = '40px "Press Start 2P", monospace'
      ctx.textAlign = "center"
      ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 40)

      ctx.fillStyle = "#fff"
      ctx.font = '20px "Press Start 2P", monospace'
      ctx.fillText(`Score: ${scoreRef.current}`, canvas.width / 2, canvas.height / 2 + 10)

      ctx.font = '16px "Press Start 2P", monospace'
      ctx.fillText("Press SPACE to restart", canvas.width / 2, canvas.height / 2 + 50)
    }

    // Draw pause message
    if (isPausedRef.current && !gameOverRef.current) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.fillStyle = "#fff"
      ctx.font = '40px "Press Start 2P", monospace'
      ctx.textAlign = "center"
      ctx.fillText("PAUSED", canvas.width / 2, canvas.height / 2)

      ctx.font = '16px "Press Start 2P", monospace'
      ctx.fillText("Press SPACE to resume", canvas.width / 2, canvas.height / 2 + 40)
    }
  }

  const movePlayer = (direction: number) => {
    if (gameOverRef.current || isPausedRef.current) return

    // Calculate new lane
    const newLane = Math.max(0, Math.min(LANE_COUNT - 1, playerRef.current.lane + direction))

    // Only update if lane changed
    if (newLane !== playerRef.current.lane) {
      playerRef.current.lane = newLane

      // Calculate new x position
      playerRef.current.x = newLane * LANE_WIDTH + (LANE_WIDTH - PLAYER_WIDTH) / 2
    }
  }

  const handleGameOver = () => {
    setGameOver(true)
    gameOverRef.current = true

    // Update high score if needed
    if (scoreRef.current > highScore) {
      setHighScore(scoreRef.current)
      localStorage.setItem("roadRacerHighScore", scoreRef.current.toString())
    }
  }

  const togglePause = () => {
    if (gameOverRef.current) {
      resetGame()
    } else {
      setIsPaused(!isPaused)
      isPausedRef.current = !isPausedRef.current
    }
  }

  const handleSubmitScore = async () => {
    if (!username) return

    try {
      await submitScore("road-racer", username, score)
      fetchLeaderboard()
      setShowLeaderboard(true)
    } catch (error) {
      console.error("Error submitting score:", error)
    }
  }

  const fetchLeaderboard = async () => {
    try {
      // This would be a real API call in production
      // For now, we'll simulate a leaderboard
      setLeaderboardData(
        [
          { name: username, score: score },
          { name: "Player1", score: 3000 },
          { name: "Player2", score: 2500 },
          { name: "Player3", score: 2000 },
          { name: "Player4", score: 1500 },
        ].sort((a, b) => b.score - a.score),
      )
    } catch (error) {
      console.error("Error fetching leaderboard:", error)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <Link href="/">
            <Button
              variant="outline"
              className="text-purple-300 border-purple-500 hover:bg-purple-950 hover:text-purple-200"
            >
              <Home className="mr-2 h-4 w-4" /> Home
            </Button>
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-green-400">Road Racer</h1>
          <Button
            variant="outline"
            className="text-yellow-400 border-yellow-500 hover:bg-yellow-950 hover:text-yellow-200"
            onClick={() => setShowLeaderboard(true)}
          >
            <Trophy className="mr-2 h-4 w-4" /> Leaderboard
          </Button>
        </div>

        <div className="bg-gray-900 border-2 border-purple-500 rounded-lg p-4 mb-6">
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-between w-full mb-4">
              <div className="flex items-center">
                <Trophy className="text-yellow-400 mr-2" size={20} />
                <span className="text-gray-300">High Score: {highScore}</span>
              </div>
              <div className="flex items-center">
                <Gauge className="text-red-400 mr-2" size={20} />
                <span className="text-gray-300">Speed: {Math.floor(speed)}</span>
              </div>
            </div>

            <canvas
              ref={canvasRef}
              className="border-4 border-gray-800 rounded-lg mb-4"
              width={ROAD_WIDTH}
              height={ROAD_HEIGHT}
            />

            <div className="flex flex-wrap justify-center gap-2 mt-2">
              <Button
                variant="outline"
                className="text-green-400 border-green-500 hover:bg-green-950 hover:text-green-200"
                onClick={togglePause}
              >
                {isPaused ? "Resume" : gameOver ? "Restart" : "Pause"}
              </Button>

              <Button
                variant="outline"
                className="text-red-400 border-red-500 hover:bg-red-950 hover:text-red-200"
                onClick={resetGame}
              >
                <RefreshCcw className="mr-2 h-4 w-4" /> Reset
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border-2 border-purple-500 rounded-lg p-4 mb-6">
          <h2 className="text-xl font-bold text-green-400 mb-2">Controls</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-semibold text-purple-300 mb-1">Keyboard</h3>
              <ul className="text-gray-300">
                <li>Left Arrow: Move left</li>
                <li>Right Arrow: Move right</li>
                <li>Space: Pause/Resume</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-purple-300 mb-1">Touch</h3>
              <ul className="text-gray-300">
                <li>Swipe Left: Move left</li>
                <li>Swipe Right: Move right</li>
                <li>Tap Pause button: Pause/Resume</li>
              </ul>
            </div>
          </div>

          <div className="mt-4 flex justify-center gap-4">
            <Button
              variant="outline"
              className="text-blue-400 border-blue-500 hover:bg-blue-950 hover:text-blue-200"
              onClick={() => movePlayer(-1)}
              disabled={gameOver || isPaused}
            >
              ← Left
            </Button>

            <Button
              variant="outline"
              className="text-blue-400 border-blue-500 hover:bg-blue-950 hover:text-blue-200"
              onClick={() => movePlayer(1)}
              disabled={gameOver || isPaused}
            >
              Right →
            </Button>
          </div>
        </div>

        {gameOver && (
          <div className="bg-gray-900 border-2 border-red-500 rounded-lg p-4 animate-pulse">
            <h2 className="text-xl font-bold text-red-400 mb-2">Game Over!</h2>
            <p className="text-gray-300 mb-4">Your score: {score}</p>

            {!showLeaderboard && (
              <div className="flex flex-col space-y-2">
                <input
                  type="text"
                  placeholder="Enter your name"
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                <Button
                  onClick={handleSubmitScore}
                  disabled={!username}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  <Trophy className="mr-2 h-4 w-4" /> Submit Score
                </Button>
              </div>
            )}
          </div>
        )}

        {showLeaderboard && (
          <div className="bg-gray-900 border-2 border-yellow-500 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-yellow-400">Leaderboard</h2>
              <Button
                variant="outline"
                className="text-gray-400 border-gray-500 hover:bg-gray-800"
                onClick={() => setShowLeaderboard(false)}
              >
                Close
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="px-4 py-2 text-left text-purple-300">Rank</th>
                    <th className="px-4 py-2 text-left text-purple-300">Player</th>
                    <th className="px-4 py-2 text-right text-purple-300">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboardData.map((entry, index) => (
                    <tr
                      key={index}
                      className={`border-b border-gray-800 ${entry.name === username ? "bg-purple-900 bg-opacity-30" : ""}`}
                    >
                      <td className="px-4 py-2 text-gray-300">{index + 1}</td>
                      <td className="px-4 py-2 text-gray-300">{entry.name}</td>
                      <td className="px-4 py-2 text-right text-gray-300">{entry.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

