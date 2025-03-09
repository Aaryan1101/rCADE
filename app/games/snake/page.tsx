"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home, RefreshCcw, Trophy } from "lucide-react"
import { submitScore } from "@/app/api/leaderboard"

// Game constants
const GRID_SIZE = 20
const GAME_SPEED = 100
const DIRECTIONS = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
}

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [username, setUsername] = useState("")
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [leaderboardData, setLeaderboardData] = useState<{ name: string; score: number }[]>([])

  // Game state refs to avoid closure issues in event listeners
  const snakeRef = useRef<{ x: number; y: number }[]>([{ x: 10, y: 10 }])
  const foodRef = useRef<{ x: number; y: number }>({ x: 5, y: 5 })
  const directionRef = useRef(DIRECTIONS.RIGHT)
  const nextDirectionRef = useRef(DIRECTIONS.RIGHT)
  const scoreRef = useRef(0)
  const gameOverRef = useRef(false)
  const isPausedRef = useRef(false)

  // Initialize game
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    const updateCanvasSize = () => {
      const size = Math.min(window.innerWidth - 40, 600)
      canvas.width = size
      canvas.height = size
    }

    updateCanvasSize()
    window.addEventListener("resize", updateCanvasSize)

    // Load high score from localStorage
    const savedHighScore = localStorage.getItem("snakeHighScore")
    if (savedHighScore) {
      setHighScore(Number.parseInt(savedHighScore))
    }

    // Initialize game
    resetGame()

    // Game loop
    const gameLoop = setInterval(() => {
      if (gameOverRef.current || isPausedRef.current) return
      updateGame()
      drawGame()
    }, GAME_SPEED)

    // Keyboard controls
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowUp":
          if (directionRef.current !== DIRECTIONS.DOWN) {
            nextDirectionRef.current = DIRECTIONS.UP
          }
          break
        case "ArrowDown":
          if (directionRef.current !== DIRECTIONS.UP) {
            nextDirectionRef.current = DIRECTIONS.DOWN
          }
          break
        case "ArrowLeft":
          if (directionRef.current !== DIRECTIONS.RIGHT) {
            nextDirectionRef.current = DIRECTIONS.LEFT
          }
          break
        case "ArrowRight":
          if (directionRef.current !== DIRECTIONS.LEFT) {
            nextDirectionRef.current = DIRECTIONS.RIGHT
          }
          break
        case " ":
          togglePause()
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    // Touch controls for mobile
    let touchStartX = 0
    let touchStartY = 0

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX
      touchStartY = e.touches[0].clientY
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartX || !touchStartY) return

      const touchEndX = e.touches[0].clientX
      const touchEndY = e.touches[0].clientY

      const diffX = touchStartX - touchEndX
      const diffY = touchStartY - touchEndY

      // Determine swipe direction based on the greatest difference
      if (Math.abs(diffX) > Math.abs(diffY)) {
        // Horizontal swipe
        if (diffX > 0 && directionRef.current !== DIRECTIONS.RIGHT) {
          nextDirectionRef.current = DIRECTIONS.LEFT
        } else if (diffX < 0 && directionRef.current !== DIRECTIONS.LEFT) {
          nextDirectionRef.current = DIRECTIONS.RIGHT
        }
      } else {
        // Vertical swipe
        if (diffY > 0 && directionRef.current !== DIRECTIONS.DOWN) {
          nextDirectionRef.current = DIRECTIONS.UP
        } else if (diffY < 0 && directionRef.current !== DIRECTIONS.UP) {
          nextDirectionRef.current = DIRECTIONS.DOWN
        }
      }

      touchStartX = 0
      touchStartY = 0
    }

    canvas.addEventListener("touchstart", handleTouchStart)
    canvas.addEventListener("touchmove", handleTouchMove)

    // Initial draw
    drawGame()

    // Cleanup
    return () => {
      clearInterval(gameLoop)
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("resize", updateCanvasSize)
      canvas.removeEventListener("touchstart", handleTouchStart)
      canvas.removeEventListener("touchmove", handleTouchMove)
    }
  }, [])

  // Update game state refs when state changes
  useEffect(() => {
    scoreRef.current = score
    gameOverRef.current = gameOver
    isPausedRef.current = isPaused
  }, [score, gameOver, isPaused])

  // Game functions
  const resetGame = () => {
    snakeRef.current = [{ x: 10, y: 10 }]
    generateFood()
    directionRef.current = DIRECTIONS.RIGHT
    nextDirectionRef.current = DIRECTIONS.RIGHT
    setScore(0)
    scoreRef.current = 0
    setGameOver(false)
    gameOverRef.current = false
    setIsPaused(false)
    isPausedRef.current = false
  }

  const generateFood = () => {
    const maxPos = GRID_SIZE - 1
    let newFood

    // Make sure food doesn't spawn on snake
    do {
      newFood = {
        x: Math.floor(Math.random() * maxPos),
        y: Math.floor(Math.random() * maxPos),
      }
    } while (snakeRef.current.some((segment) => segment.x === newFood.x && segment.y === newFood.y))

    foodRef.current = newFood
  }

  const updateGame = () => {
    // Update direction
    directionRef.current = nextDirectionRef.current

    // Get current head position
    const head = { ...snakeRef.current[0] }

    // Calculate new head position
    const newHead = {
      x: head.x + directionRef.current.x,
      y: head.y + directionRef.current.y,
    }

    // Check for collisions
    if (
      // Wall collision
      newHead.x < 0 ||
      newHead.x >= GRID_SIZE ||
      newHead.y < 0 ||
      newHead.y >= GRID_SIZE ||
      // Self collision
      snakeRef.current.some((segment) => segment.x === newHead.x && segment.y === newHead.y)
    ) {
      handleGameOver()
      return
    }

    // Add new head to snake
    snakeRef.current.unshift(newHead)

    // Check if snake ate food
    if (newHead.x === foodRef.current.x && newHead.y === foodRef.current.y) {
      // Increase score
      const newScore = scoreRef.current + 10
      setScore(newScore)
      scoreRef.current = newScore

      // Generate new food
      generateFood()
    } else {
      // Remove tail if no food was eaten
      snakeRef.current.pop()
    }
  }

  const drawGame = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const cellSize = canvas.width / GRID_SIZE

    // Clear canvas
    ctx.fillStyle = "#111"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw grid lines
    ctx.strokeStyle = "#222"
    ctx.lineWidth = 1

    for (let i = 0; i <= GRID_SIZE; i++) {
      const pos = i * cellSize

      // Vertical line
      ctx.beginPath()
      ctx.moveTo(pos, 0)
      ctx.lineTo(pos, canvas.height)
      ctx.stroke()

      // Horizontal line
      ctx.beginPath()
      ctx.moveTo(0, pos)
      ctx.lineTo(canvas.width, pos)
      ctx.stroke()
    }

    // Draw food
    ctx.fillStyle = "#f00"
    ctx.beginPath()
    ctx.arc(
      (foodRef.current.x + 0.5) * cellSize,
      (foodRef.current.y + 0.5) * cellSize,
      (cellSize / 2) * 0.8,
      0,
      Math.PI * 2,
    )
    ctx.fill()

    // Draw snake
    snakeRef.current.forEach((segment, index) => {
      // Head is green, body is gradient from green to blue
      const colorRatio = index / snakeRef.current.length
      const r = Math.floor(0 * (1 - colorRatio) + 0 * colorRatio)
      const g = Math.floor(255 * (1 - colorRatio) + 100 * colorRatio)
      const b = Math.floor(0 * (1 - colorRatio) + 255 * colorRatio)

      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`

      // Draw rounded rectangle for snake segments
      const x = segment.x * cellSize
      const y = segment.y * cellSize
      const radius = cellSize / 5

      ctx.beginPath()
      ctx.moveTo(x + radius, y)
      ctx.arcTo(x + cellSize, y, x + cellSize, y + cellSize, radius)
      ctx.arcTo(x + cellSize, y + cellSize, x, y + cellSize, radius)
      ctx.arcTo(x, y + cellSize, x, y, radius)
      ctx.arcTo(x, y, x + cellSize, y, radius)
      ctx.closePath()
      ctx.fill()

      // Draw eyes for head
      if (index === 0) {
        ctx.fillStyle = "#fff"

        // Position eyes based on direction
        let eyeX1, eyeY1, eyeX2, eyeY2
        const eyeSize = cellSize / 6
        const eyeOffset = cellSize / 4

        if (directionRef.current === DIRECTIONS.RIGHT) {
          eyeX1 = x + cellSize - eyeOffset
          eyeY1 = y + eyeOffset
          eyeX2 = x + cellSize - eyeOffset
          eyeY2 = y + cellSize - eyeOffset
        } else if (directionRef.current === DIRECTIONS.LEFT) {
          eyeX1 = x + eyeOffset
          eyeY1 = y + eyeOffset
          eyeX2 = x + eyeOffset
          eyeY2 = y + cellSize - eyeOffset
        } else if (directionRef.current === DIRECTIONS.UP) {
          eyeX1 = x + eyeOffset
          eyeY1 = y + eyeOffset
          eyeX2 = x + cellSize - eyeOffset
          eyeY2 = y + eyeOffset
        } else {
          eyeX1 = x + eyeOffset
          eyeY1 = y + cellSize - eyeOffset
          eyeX2 = x + cellSize - eyeOffset
          eyeY2 = y + cellSize - eyeOffset
        }

        ctx.beginPath()
        ctx.arc(eyeX1, eyeY1, eyeSize, 0, Math.PI * 2)
        ctx.fill()

        ctx.beginPath()
        ctx.arc(eyeX2, eyeY2, eyeSize, 0, Math.PI * 2)
        ctx.fill()

        // Draw pupils
        ctx.fillStyle = "#000"
        ctx.beginPath()
        ctx.arc(eyeX1, eyeY1, eyeSize / 2, 0, Math.PI * 2)
        ctx.fill()

        ctx.beginPath()
        ctx.arc(eyeX2, eyeY2, eyeSize / 2, 0, Math.PI * 2)
        ctx.fill()
      }
    })

    // Draw score
    ctx.fillStyle = "#fff"
    ctx.font = '20px "Press Start 2P", monospace'
    ctx.textAlign = "left"
    ctx.fillText(`Score: ${scoreRef.current}`, 10, 30)

    // Draw high score
    ctx.textAlign = "right"
    ctx.fillText(`High: ${highScore}`, canvas.width - 10, 30)

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

  const handleGameOver = () => {
    setGameOver(true)
    gameOverRef.current = true

    // Update high score if needed
    if (scoreRef.current > highScore) {
      setHighScore(scoreRef.current)
      localStorage.setItem("snakeHighScore", scoreRef.current.toString())
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
      await submitScore("snake", username, score)
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
          { name: "Player1", score: 200 },
          { name: "Player2", score: 180 },
          { name: "Player3", score: 150 },
          { name: "Player4", score: 120 },
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
          <h1 className="text-3xl md:text-4xl font-bold text-green-400">Snake Game</h1>
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
            <canvas ref={canvasRef} className="border-4 border-gray-800 rounded-lg mb-4" width={600} height={600} />

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
                <li>Arrow Keys: Change direction</li>
                <li>Space: Pause/Resume</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-purple-300 mb-1">Touch</h3>
              <ul className="text-gray-300">
                <li>Swipe: Change direction</li>
                <li>Tap Pause button: Pause/Resume</li>
              </ul>
            </div>
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

