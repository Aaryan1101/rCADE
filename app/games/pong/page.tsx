"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home, RefreshCcw, Trophy, Users } from "lucide-react"
import { submitScore } from "@/app/api/leaderboard"

export default function PongGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isMultiplayer, setIsMultiplayer] = useState(false)
  const [player1Score, setPlayer1Score] = useState(0)
  const [player2Score, setPlayer2Score] = useState(0)
  const [winner, setWinner] = useState<string | null>(null)
  const [username, setUsername] = useState("")
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [leaderboardData, setLeaderboardData] = useState<{ name: string; score: number }[]>([])

  // Game state refs to avoid closure issues
  const ballRef = useRef({ x: 400, y: 300, dx: 5, dy: 5, radius: 10 })

  const paddle1Ref = useRef({ x: 20, y: 250, width: 10, height: 100, dy: 0 })
  const paddle2Ref = useRef({ x: 770, y: 250, width: 10, height: 100, dy: 0 })
  const scoreRef = useRef(0)
  const player1ScoreRef = useRef(0)
  const player2ScoreRef = useRef(0)
  const gameOverRef = useRef(false)
  const isPausedRef = useRef(false)
  const isMultiplayerRef = useRef(false)

  // Initialize game
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    const updateCanvasSize = () => {
      const container = canvas.parentElement
      if (!container) return

      const maxWidth = Math.min(window.innerWidth - 40, 800)
      canvas.width = maxWidth
      canvas.height = maxWidth * 0.75 // 4:3 aspect ratio

      // Adjust paddle positions based on new canvas size
      paddle1Ref.current.x = 20
      paddle2Ref.current.x = canvas.width - 30

      // Center the ball
      resetBall()
    }

    updateCanvasSize()
    window.addEventListener("resize", updateCanvasSize)

    // Load high score from localStorage
    const savedHighScore = localStorage.getItem("pongHighScore")
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
    }, 16) // ~60fps

    // Keyboard controls
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        paddle1Ref.current.dy = -10
      } else if (e.key === "ArrowDown") {
        paddle1Ref.current.dy = 10
      } else if (e.key === "w" && isMultiplayerRef.current) {
        paddle2Ref.current.dy = -10
      } else if (e.key === "s" && isMultiplayerRef.current) {
        paddle2Ref.current.dy = 10
      } else if (e.key === " ") {
        togglePause()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        paddle1Ref.current.dy = 0
      } else if ((e.key === "w" || e.key === "s") && isMultiplayerRef.current) {
        paddle2Ref.current.dy = 0
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    // Touch controls for mobile
    let touchStartY = 0

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartY) return

      const touchY = e.touches[0].clientY
      const rect = canvas.getBoundingClientRect()
      const relativeY = touchY - rect.top

      // Move paddle to touch position
      paddle1Ref.current.y = Math.max(
        0,
        Math.min(canvas.height - paddle1Ref.current.height, relativeY - paddle1Ref.current.height / 2),
      )
    }

    canvas.addEventListener("touchstart", handleTouchStart)
    canvas.addEventListener("touchmove", handleTouchMove)

    // Initial draw
    drawGame()

    // Cleanup
    return () => {
      clearInterval(gameLoop)
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
      window.removeEventListener("resize", updateCanvasSize)
      canvas.removeEventListener("touchstart", handleTouchStart)
      canvas.removeEventListener("touchmove", handleTouchMove)
    }
  }, [])

  // Update game state refs when state changes
  useEffect(() => {
    scoreRef.current = score
    player1ScoreRef.current = player1Score
    player2ScoreRef.current = player2Score
    gameOverRef.current = gameOver
    isPausedRef.current = isPaused
    isMultiplayerRef.current = isMultiplayer
  }, [score, player1Score, player2Score, gameOver, isPaused, isMultiplayer])

  // Game functions
  const resetGame = () => {
    resetBall()
    paddle1Ref.current = { x: 20, y: 250, width: 10, height: 100, dy: 0 }
    paddle2Ref.current = { x: 770, y: 250, width: 10, height: 100, dy: 0 }
    setScore(0)
    scoreRef.current = 0
    setPlayer1Score(0)
    player1ScoreRef.current = 0
    setPlayer2Score(0)
    player2ScoreRef.current = 0
    setGameOver(false)
    gameOverRef.current = false
    setIsPaused(false)
    isPausedRef.current = false
    setWinner(null)
  }

  const resetBall = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    ballRef.current = {
      x: canvas.width / 2,
      y: canvas.height / 2,
      dx: (Math.random() > 0.5 ? 1 : -1) * 5,
      dy: (Math.random() * 2 - 1) * 5,
      radius: 10,
    }
  }

  const updateGame = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Update paddle positions
    paddle1Ref.current.y += paddle1Ref.current.dy
    paddle1Ref.current.y = Math.max(0, Math.min(canvas.height - paddle1Ref.current.height, paddle1Ref.current.y))

    // Update second paddle
    if (isMultiplayerRef.current) {
      paddle2Ref.current.y += paddle2Ref.current.dy
      paddle2Ref.current.y = Math.max(0, Math.min(canvas.height - paddle2Ref.current.height, paddle2Ref.current.y))
    } else {
      // AI movement - follows the ball with a delay
      const paddleCenter = paddle2Ref.current.y + paddle2Ref.current.height / 2
      const targetY = ballRef.current.y
      const diff = targetY - paddleCenter
      const speed = 5 // AI speed

      if (Math.abs(diff) > speed) {
        paddle2Ref.current.y += diff > 0 ? speed : -speed
      }

      paddle2Ref.current.y = Math.max(0, Math.min(canvas.height - paddle2Ref.current.height, paddle2Ref.current.y))
    }

    // Update ball position
    ballRef.current.x += ballRef.current.dx
    ballRef.current.y += ballRef.current.dy

    // Ball collision with top and bottom walls
    if (ballRef.current.y - ballRef.current.radius < 0 || ballRef.current.y + ballRef.current.radius > canvas.height) {
      ballRef.current.dy = -ballRef.current.dy
    }

    // Ball collision with paddles
    if (
      // Left paddle
      ballRef.current.x - ballRef.current.radius < paddle1Ref.current.x + paddle1Ref.current.width &&
      ballRef.current.y > paddle1Ref.current.y &&
      ballRef.current.y < paddle1Ref.current.y + paddle1Ref.current.height
    ) {
      ballRef.current.dx = -ballRef.current.dx * 1.05 // Increase speed slightly

      // Add some angle based on where the ball hits the paddle
      const hitPosition =
        (ballRef.current.y - (paddle1Ref.current.y + paddle1Ref.current.height / 2)) / (paddle1Ref.current.height / 2)
      ballRef.current.dy = hitPosition * 10

      // Increase score in single player mode
      if (!isMultiplayerRef.current) {
        const newScore = scoreRef.current + 1
        setScore(newScore)
        scoreRef.current = newScore
      }
    } else if (
      // Right paddle
      ballRef.current.x + ballRef.current.radius > paddle2Ref.current.x &&
      ballRef.current.y > paddle2Ref.current.y &&
      ballRef.current.y < paddle2Ref.current.y + paddle2Ref.current.height
    ) {
      ballRef.current.dx = -ballRef.current.dx * 1.05 // Increase speed slightly

      // Add some angle based on where the ball hits the paddle
      const hitPosition =
        (ballRef.current.y - (paddle2Ref.current.y + paddle2Ref.current.height / 2)) / (paddle2Ref.current.height / 2)
      ballRef.current.dy = hitPosition * 10
    }

    // Ball out of bounds
    if (ballRef.current.x < 0) {
      // Right player scores
      if (isMultiplayerRef.current) {
        const newScore = player2ScoreRef.current + 1
        setPlayer2Score(newScore)
        player2ScoreRef.current = newScore

        if (newScore >= 10) {
          setWinner("Player 2")
          handleGameOver()
        } else {
          resetBall()
        }
      } else {
        handleGameOver()
      }
    } else if (ballRef.current.x > canvas.width) {
      // Left player scores
      if (isMultiplayerRef.current) {
        const newScore = player1ScoreRef.current + 1
        setPlayer1Score(newScore)
        player1ScoreRef.current = newScore

        if (newScore >= 10) {
          setWinner("Player 1")
          handleGameOver()
        } else {
          resetBall()
        }
      } else {
        // In single player, this shouldn't happen often
        resetBall()
      }
    }
  }

  const drawGame = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.fillStyle = "#111"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw center line
    ctx.strokeStyle = "#333"
    ctx.setLineDash([10, 10])
    ctx.beginPath()
    ctx.moveTo(canvas.width / 2, 0)
    ctx.lineTo(canvas.width / 2, canvas.height)
    ctx.stroke()
    ctx.setLineDash([])

    // Draw paddles
    ctx.fillStyle = "#0f0"
    ctx.fillRect(paddle1Ref.current.x, paddle1Ref.current.y, paddle1Ref.current.width, paddle1Ref.current.height)

    ctx.fillStyle = isMultiplayerRef.current ? "#f00" : "#fff"
    ctx.fillRect(paddle2Ref.current.x, paddle2Ref.current.y, paddle2Ref.current.width, paddle2Ref.current.height)

    // Draw ball
    ctx.fillStyle = "#fff"
    ctx.beginPath()
    ctx.arc(ballRef.current.x, ballRef.current.y, ballRef.current.radius, 0, Math.PI * 2)
    ctx.fill()

    // Draw score
    ctx.fillStyle = "#fff"
    ctx.font = '24px "Press Start 2P", monospace'
    ctx.textAlign = "center"

    if (isMultiplayerRef.current) {
      ctx.fillText(player1ScoreRef.current.toString(), canvas.width / 4, 50)
      ctx.fillText(player2ScoreRef.current.toString(), (canvas.width / 4) * 3, 50)
    } else {
      ctx.textAlign = "left"
      ctx.fillText(`Score: ${scoreRef.current}`, 20, 30)

      ctx.textAlign = "right"
      ctx.fillText(`High: ${highScore}`, canvas.width - 20, 30)
    }

    // Draw game over message
    if (gameOverRef.current) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.fillStyle = "#f00"
      ctx.font = '40px "Press Start 2P", monospace'
      ctx.textAlign = "center"
      ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 40)

      if (isMultiplayerRef.current && winner) {
        ctx.fillStyle = "#fff"
        ctx.font = '24px "Press Start 2P", monospace'
        ctx.fillText(`${winner} wins!`, canvas.width / 2, canvas.height / 2 + 10)
      } else {
        ctx.fillStyle = "#fff"
        ctx.font = '24px "Press Start 2P", monospace'
        ctx.fillText(`Score: ${scoreRef.current}`, canvas.width / 2, canvas.height / 2 + 10)
      }

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

    // Update high score if needed (single player only)
    if (!isMultiplayerRef.current && scoreRef.current > highScore) {
      setHighScore(scoreRef.current)
      localStorage.setItem("pongHighScore", scoreRef.current.toString())
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

  const toggleMultiplayer = () => {
    setIsMultiplayer(!isMultiplayer)
    isMultiplayerRef.current = !isMultiplayerRef.current
    resetGame()
  }

  const handleSubmitScore = async () => {
    if (!username) return

    try {
      await submitScore("pong", username, score)
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
          { name: "Player1", score: 120 },
          { name: "Player2", score: 100 },
          { name: "Player3", score: 80 },
          { name: "Player4", score: 60 },
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
          <h1 className="text-3xl md:text-4xl font-bold text-green-400">Pong Game</h1>
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
            <div className="flex justify-between items-center w-full mb-4">
              <Button
                variant={isMultiplayer ? "default" : "outline"}
                className={
                  isMultiplayer
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "text-blue-400 border-blue-500 hover:bg-blue-950 hover:text-blue-200"
                }
                onClick={toggleMultiplayer}
                disabled={gameOver || isPaused}
              >
                Single Player
              </Button>

              <Button
                variant={isMultiplayer ? "outline" : "default"}
                className={
                  isMultiplayer
                    ? "text-red-400 border-red-500 hover:bg-red-950 hover:text-red-200"
                    : "bg-red-600 hover:bg-red-700"
                }
                onClick={toggleMultiplayer}
                disabled={gameOver || isPaused}
              >
                <Users className="mr-2 h-4 w-4" /> Multiplayer
              </Button>
            </div>

            <canvas ref={canvasRef} className="border-4 border-gray-800 rounded-lg mb-4" width={800} height={600} />

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
              <h3 className="text-lg font-semibold text-purple-300 mb-1">Player 1</h3>
              <ul className="text-gray-300">
                <li>Arrow Up: Move paddle up</li>
                <li>Arrow Down: Move paddle down</li>
                <li>Space: Pause/Resume</li>
              </ul>
            </div>
            {isMultiplayer && (
              <div>
                <h3 className="text-lg font-semibold text-purple-300 mb-1">Player 2</h3>
                <ul className="text-gray-300">
                  <li>W: Move paddle up</li>
                  <li>S: Move paddle down</li>
                </ul>
              </div>
            )}
            <div className="md:col-span-2">
              <h3 className="text-lg font-semibold text-purple-300 mb-1">Touch</h3>
              <ul className="text-gray-300">
                <li>Drag finger on screen to move paddle</li>
                <li>Tap Pause button to pause/resume</li>
              </ul>
            </div>
          </div>
        </div>

        {gameOver && !isMultiplayer && (
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

