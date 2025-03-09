"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home, RefreshCcw, Trophy, ArrowDown, ArrowLeft, ArrowRight, RotateCw } from "lucide-react"
import { submitScore } from "@/app/api/leaderboard"

// Tetris constants
const GRID_WIDTH = 10
const GRID_HEIGHT = 20
const BLOCK_SIZE = 30

// Tetromino shapes
const SHAPES = [
  // I
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  // J
  [
    [2, 0, 0],
    [2, 2, 2],
    [0, 0, 0],
  ],
  // L
  [
    [0, 0, 3],
    [3, 3, 3],
    [0, 0, 0],
  ],
  // O
  [
    [4, 4],
    [4, 4],
  ],
  // S
  [
    [0, 5, 5],
    [5, 5, 0],
    [0, 0, 0],
  ],
  // T
  [
    [0, 6, 0],
    [6, 6, 6],
    [0, 0, 0],
  ],
  // Z
  [
    [7, 7, 0],
    [0, 7, 7],
    [0, 0, 0],
  ],
]

// Colors for each tetromino
const COLORS = [
  "transparent",
  "#00f0f0", // I - cyan
  "#0000f0", // J - blue
  "#f0a000", // L - orange
  "#f0f000", // O - yellow
  "#00f000", // S - green
  "#a000f0", // T - purple
  "#f00000", // Z - red
]

export default function TetrisGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [lines, setLines] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [username, setUsername] = useState("")
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [leaderboardData, setLeaderboardData] = useState<{ name: string; score: number }[]>([])
  const [nextShape, setNextShape] = useState<number[][]>([])

  // Game state refs to avoid closure issues
  const boardRef = useRef<number[][]>(
    Array(GRID_HEIGHT)
      .fill(0)
      .map(() => Array(GRID_WIDTH).fill(0)),
  )
  const currentShapeRef = useRef<number[][]>([])
  const currentPosRef = useRef({ x: 0, y: 0 })
  const scoreRef = useRef(0)
  const levelRef = useRef(1)
  const linesRef = useRef(0)
  const gameOverRef = useRef(false)
  const isPausedRef = useRef(false)
  const nextShapeRef = useRef<number[][]>([])
  const gameSpeedRef = useRef(1000)
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize game
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    canvas.width = GRID_WIDTH * BLOCK_SIZE
    canvas.height = GRID_HEIGHT * BLOCK_SIZE

    // Load high score from localStorage
    const savedHighScore = localStorage.getItem("tetrisHighScore")
    if (savedHighScore) {
      setHighScore(Number.parseInt(savedHighScore))
    }

    // Initialize game
    resetGame()

    // Keyboard controls
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOverRef.current) return

      if (e.key === "ArrowLeft") {
        moveShape(-1, 0)
      } else if (e.key === "ArrowRight") {
        moveShape(1, 0)
      } else if (e.key === "ArrowDown") {
        moveShape(0, 1)
      } else if (e.key === "ArrowUp") {
        rotateShape()
      } else if (e.key === " ") {
        if (gameOverRef.current) {
          resetGame()
        } else {
          togglePause()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    // Initial draw
    drawGame()

    // Cleanup
    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current)
      }
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  // Update game state refs when state changes
  useEffect(() => {
    scoreRef.current = score
    levelRef.current = level
    linesRef.current = lines
    gameOverRef.current = gameOver
    isPausedRef.current = isPaused
    nextShapeRef.current = nextShape
  }, [score, level, lines, gameOver, isPaused, nextShape])

  // Game functions
  const resetGame = () => {
    // Clear the board
    boardRef.current = Array(GRID_HEIGHT)
      .fill(0)
      .map(() => Array(GRID_WIDTH).fill(0))

    // Reset score and level
    setScore(0)
    scoreRef.current = 0
    setLevel(1)
    levelRef.current = 1
    setLines(0)
    linesRef.current = 0

    // Reset game state
    setGameOver(false)
    gameOverRef.current = false
    setIsPaused(false)
    isPausedRef.current = false

    // Generate random shapes
    const newNextShape = SHAPES[Math.floor(Math.random() * SHAPES.length)]
    setNextShape(newNextShape)
    nextShapeRef.current = newNextShape

    // Create new current shape
    spawnNewShape()

    // Set game speed based on level
    gameSpeedRef.current = 1000 - (levelRef.current - 1) * 100

    // Start game loop
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current)
    }

    gameLoopRef.current = setInterval(() => {
      if (gameOverRef.current || isPausedRef.current) return
      gameLoop()
    }, gameSpeedRef.current)
  }

  const spawnNewShape = () => {
    // Use the next shape as current shape
    if (nextShapeRef.current.length > 0) {
      currentShapeRef.current = JSON.parse(JSON.stringify(nextShapeRef.current))
    } else {
      // First shape of the game
      currentShapeRef.current = JSON.parse(JSON.stringify(SHAPES[Math.floor(Math.random() * SHAPES.length)]))
    }

    // Generate new next shape
    const newNextShape = SHAPES[Math.floor(Math.random() * SHAPES.length)]
    setNextShape(newNextShape)
    nextShapeRef.current = newNextShape

    // Set starting position (centered at top)
    currentPosRef.current = {
      x: Math.floor((GRID_WIDTH - currentShapeRef.current[0].length) / 2),
      y: 0,
    }

    // Check if game is over (can't place new shape)
    if (!isValidMove(0, 0)) {
      handleGameOver()
    }
  }

  const gameLoop = () => {
    // Move shape down
    if (!moveShape(0, 1)) {
      // If can't move down, place the shape and spawn a new one
      placeShape()
      clearLines()
      spawnNewShape()
    }

    // Draw the updated game state
    drawGame()
  }

  const moveShape = (dx: number, dy: number) => {
    if (gameOverRef.current || isPausedRef.current) return false

    // Check if the move is valid
    if (isValidMove(dx, dy)) {
      currentPosRef.current.x += dx
      currentPosRef.current.y += dy
      drawGame()
      return true
    }

    return false
  }

  const rotateShape = () => {
    if (gameOverRef.current || isPausedRef.current) return

    // Create a copy of the current shape
    const shape = JSON.parse(JSON.stringify(currentShapeRef.current))

    // Rotate the shape (90 degrees clockwise)
    const rotated: number[][] = []
    for (let i = 0; i < shape[0].length; i++) {
      rotated.push([])
      for (let j = shape.length - 1; j >= 0; j--) {
        rotated[i].push(shape[j][i])
      }
    }

    // Save the current shape to restore if rotation is not valid
    const originalShape = currentShapeRef.current
    currentShapeRef.current = rotated

    // Check if the rotation is valid
    if (!isValidMove(0, 0)) {
      // If not valid, try wall kicks (move left/right to make it fit)
      let valid = false

      // Try moving right
      for (let i = 1; i <= 2; i++) {
        if (isValidMove(i, 0)) {
          currentPosRef.current.x += i
          valid = true
          break
        }
      }

      // Try moving left
      if (!valid) {
        for (let i = 1; i <= 2; i++) {
          if (isValidMove(-i, 0)) {
            currentPosRef.current.x -= i
            valid = true
            break
          }
        }
      }

      // If still not valid, restore original shape
      if (!valid) {
        currentShapeRef.current = originalShape
      }
    }

    drawGame()
  }

  const isValidMove = (dx: number, dy: number) => {
    const shape = currentShapeRef.current
    const newX = currentPosRef.current.x + dx
    const newY = currentPosRef.current.y + dy

    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x] === 0) continue // Skip empty cells

        const boardX = newX + x
        const boardY = newY + y

        // Check if out of bounds
        if (boardX < 0 || boardX >= GRID_WIDTH || boardY >= GRID_HEIGHT) {
          return false
        }

        // Check if overlapping with placed blocks
        if (boardY >= 0 && boardRef.current[boardY][boardX] !== 0) {
          return false
        }
      }
    }

    return true
  }

  const placeShape = () => {
    const shape = currentShapeRef.current
    const { x, y } = currentPosRef.current

    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col] !== 0) {
          const boardY = y + row
          const boardX = x + col

          // Only place if within bounds
          if (boardY >= 0 && boardY < GRID_HEIGHT && boardX >= 0 && boardX < GRID_WIDTH) {
            boardRef.current[boardY][boardX] = shape[row][col]
          }
        }
      }
    }

    // Add points for placing a shape
    const newScore = scoreRef.current + 10
    setScore(newScore)
    scoreRef.current = newScore
  }

  const clearLines = () => {
    let linesCleared = 0

    // Check each row from bottom to top
    for (let y = GRID_HEIGHT - 1; y >= 0; y--) {
      // Check if row is full
      const isRowFull = boardRef.current[y].every((cell) => cell !== 0)

      if (isRowFull) {
        linesCleared++

        // Remove the row and add a new empty row at the top
        boardRef.current.splice(y, 1)
        boardRef.current.unshift(Array(GRID_WIDTH).fill(0))

        // Check the same row again (since we moved rows down)
        y++
      }
    }

    // Update score based on lines cleared
    if (linesCleared > 0) {
      // Calculate score (more points for clearing multiple lines at once)
      const linePoints = [0, 40, 100, 300, 1200] // 0, 1, 2, 3, 4 lines
      const pointsEarned = linePoints[linesCleared] * levelRef.current

      const newScore = scoreRef.current + pointsEarned
      setScore(newScore)
      scoreRef.current = newScore

      // Update lines cleared
      const newLines = linesRef.current + linesCleared
      setLines(newLines)
      linesRef.current = newLines

      // Check for level up (every 10 lines)
      const newLevel = Math.floor(newLines / 10) + 1
      if (newLevel > levelRef.current) {
        setLevel(newLevel)
        levelRef.current = newLevel

        // Increase game speed
        gameSpeedRef.current = Math.max(100, 1000 - (newLevel - 1) * 100)

        // Update game loop interval
        if (gameLoopRef.current) {
          clearInterval(gameLoopRef.current)
          gameLoopRef.current = setInterval(() => {
            if (gameOverRef.current || isPausedRef.current) return
            gameLoop()
          }, gameSpeedRef.current)
        }
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

    // Draw grid lines
    ctx.strokeStyle = "#222"
    ctx.lineWidth = 1

    for (let x = 0; x <= GRID_WIDTH; x++) {
      ctx.beginPath()
      ctx.moveTo(x * BLOCK_SIZE, 0)
      ctx.lineTo(x * BLOCK_SIZE, canvas.height)
      ctx.stroke()
    }

    for (let y = 0; y <= GRID_HEIGHT; y++) {
      ctx.beginPath()
      ctx.moveTo(0, y * BLOCK_SIZE)
      ctx.lineTo(canvas.width, y * BLOCK_SIZE)
      ctx.stroke()
    }

    // Draw placed blocks
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const blockValue = boardRef.current[y][x]
        if (blockValue !== 0) {
          drawBlock(ctx, x, y, blockValue)
        }
      }
    }

    // Draw current shape
    const shape = currentShapeRef.current
    const { x: shapeX, y: shapeY } = currentPosRef.current

    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        const blockValue = shape[y][x]
        if (blockValue !== 0) {
          drawBlock(ctx, shapeX + x, shapeY + y, blockValue)
        }
      }
    }

    // Draw ghost piece (preview of where the piece will land)
    drawGhostPiece(ctx)

    // Draw game over message
    if (gameOverRef.current) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.fillStyle = "#f00"
      ctx.font = '30px "Press Start 2P", monospace'
      ctx.textAlign = "center"
      ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 30)

      ctx.fillStyle = "#fff"
      ctx.font = '16px "Press Start 2P", monospace'
      ctx.fillText(`Score: ${scoreRef.current}`, canvas.width / 2, canvas.height / 2 + 10)
      ctx.fillText(`Level: ${levelRef.current}`, canvas.width / 2, canvas.height / 2 + 40)

      ctx.font = '12px "Press Start 2P", monospace'
      ctx.fillText("Press SPACE to restart", canvas.width / 2, canvas.height / 2 + 80)
    }

    // Draw pause message
    if (isPausedRef.current && !gameOverRef.current) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.fillStyle = "#fff"
      ctx.font = '30px "Press Start 2P", monospace'
      ctx.textAlign = "center"
      ctx.fillText("PAUSED", canvas.width / 2, canvas.height / 2)

      ctx.font = '12px "Press Start 2P", monospace'
      ctx.fillText("Press SPACE to resume", canvas.width / 2, canvas.height / 2 + 40)
    }
  }

  const drawBlock = (ctx: CanvasRenderingContext2D, x: number, y: number, blockValue: number) => {
    const color = COLORS[blockValue]

    // Draw block
    ctx.fillStyle = color
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE)

    // Draw highlight (3D effect)
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)"
    ctx.beginPath()
    ctx.moveTo(x * BLOCK_SIZE, y * BLOCK_SIZE)
    ctx.lineTo((x + 1) * BLOCK_SIZE, y * BLOCK_SIZE)
    ctx.lineTo(x * BLOCK_SIZE, (y + 1) * BLOCK_SIZE)
    ctx.fill()

    // Draw shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)"
    ctx.beginPath()
    ctx.moveTo((x + 1) * BLOCK_SIZE, y * BLOCK_SIZE)
    ctx.lineTo((x + 1) * BLOCK_SIZE, (y + 1) * BLOCK_SIZE)
    ctx.lineTo(x * BLOCK_SIZE, (y + 1) * BLOCK_SIZE)
    ctx.fill()

    // Draw border
    ctx.strokeStyle = "#000"
    ctx.lineWidth = 1
    ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE)
  }

  const drawGhostPiece = (ctx: CanvasRenderingContext2D) => {
    const shape = currentShapeRef.current
    const { x: originalX, y: originalY } = currentPosRef.current

    // Find how far the piece can drop
    let dropDistance = 0
    while (isValidMove(0, dropDistance + 1)) {
      dropDistance++
    }

    // Draw ghost piece
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        const blockValue = shape[y][x]
        if (blockValue !== 0) {
          const ghostX = originalX + x
          const ghostY = originalY + y + dropDistance

          // Draw ghost block (transparent version of the original)
          ctx.fillStyle = `${COLORS[blockValue]}40` // 40 is hex for 25% opacity
          ctx.fillRect(ghostX * BLOCK_SIZE, ghostY * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE)
          ctx.strokeStyle = `${COLORS[blockValue]}80` // 80 is hex for 50% opacity
          ctx.strokeRect(ghostX * BLOCK_SIZE, ghostY * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE)
        }
      }
    }
  }

  const drawNextShape = (ctx: CanvasRenderingContext2D, shape: number[][]) => {
    // Clear the preview area
    ctx.fillStyle = "#111"
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)

    // Draw border
    ctx.strokeStyle = "#444"
    ctx.lineWidth = 2
    ctx.strokeRect(0, 0, ctx.canvas.width, ctx.canvas.height)

    // Calculate center position
    const blockSize = 20 // Smaller blocks for preview
    const offsetX = (ctx.canvas.width - shape[0].length * blockSize) / 2
    const offsetY = (ctx.canvas.height - shape.length * blockSize) / 2

    // Draw shape
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        const blockValue = shape[y][x]
        if (blockValue !== 0) {
          // Draw block
          ctx.fillStyle = COLORS[blockValue]
          ctx.fillRect(offsetX + x * blockSize, offsetY + y * blockSize, blockSize, blockSize)

          // Draw highlight
          ctx.fillStyle = "rgba(255, 255, 255, 0.3)"
          ctx.beginPath()
          ctx.moveTo(offsetX + x * blockSize, offsetY + y * blockSize)
          ctx.lineTo(offsetX + (x + 1) * blockSize, offsetY + y * blockSize)
          ctx.lineTo(offsetX + x * blockSize, offsetY + (y + 1) * blockSize)
          ctx.fill()

          // Draw shadow
          ctx.fillStyle = "rgba(0, 0, 0, 0.3)"
          ctx.beginPath()
          ctx.moveTo(offsetX + (x + 1) * blockSize, offsetY + y * blockSize)
          ctx.lineTo(offsetX + (x + 1) * blockSize, offsetY + (y + 1) * blockSize)
          ctx.lineTo(offsetX + x * blockSize, offsetY + (y + 1) * blockSize)
          ctx.fill()

          // Draw border
          ctx.strokeStyle = "#000"
          ctx.lineWidth = 1
          ctx.strokeRect(offsetX + x * blockSize, offsetY + y * blockSize, blockSize, blockSize)
        }
      }
    }
  }

  const handleGameOver = () => {
    setGameOver(true)
    gameOverRef.current = true

    // Clear game loop
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current)
      gameLoopRef.current = null
    }

    // Update high score if needed
    if (scoreRef.current > highScore) {
      setHighScore(scoreRef.current)
      localStorage.setItem("tetrisHighScore", scoreRef.current.toString())
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

  const hardDrop = () => {
    if (gameOverRef.current || isPausedRef.current) return

    // Drop the piece as far as it can go
    let dropDistance = 0
    while (moveShape(0, 1)) {
      dropDistance++
    }

    // Add points for hard drop
    if (dropDistance > 0) {
      const newScore = scoreRef.current + dropDistance * 2
      setScore(newScore)
      scoreRef.current = newScore
    }

    // Place the shape and continue
    placeShape()
    clearLines()
    spawnNewShape()
    drawGame()
  }

  const handleSubmitScore = async () => {
    if (!username) return

    try {
      await submitScore("tetris", username, score)
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
          { name: "Player1", score: 5000 },
          { name: "Player2", score: 4200 },
          { name: "Player3", score: 3800 },
          { name: "Player4", score: 2500 },
        ].sort((a, b) => b.score - a.score),
      )
    } catch (error) {
      console.error("Error fetching leaderboard:", error)
    }
  }

  // Next shape canvas ref
  const nextShapeCanvasRef = useRef<HTMLCanvasElement>(null)

  // Draw next shape when it changes
  useEffect(() => {
    const canvas = nextShapeCanvasRef.current
    if (!canvas || nextShape.length === 0) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    drawNextShape(ctx, nextShape)
  }, [nextShape])

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
          <h1 className="text-3xl md:text-4xl font-bold text-green-400">Tetris</h1>
          <Button
            variant="outline"
            className="text-yellow-400 border-yellow-500 hover:bg-yellow-950 hover:text-yellow-200"
            onClick={() => setShowLeaderboard(true)}
          >
            <Trophy className="mr-2 h-4 w-4" /> Leaderboard
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-gray-900 border-2 border-purple-500 rounded-lg p-4">
            <div className="flex flex-col items-center">
              <canvas ref={canvasRef} className="border-4 border-gray-800 rounded-lg mb-4" />

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

          <div className="flex flex-col gap-6">
            <div className="bg-gray-900 border-2 border-purple-500 rounded-lg p-4">
              <h2 className="text-xl font-bold text-green-400 mb-4">Next Shape</h2>
              <div className="flex justify-center">
                <canvas
                  ref={nextShapeCanvasRef}
                  width={100}
                  height={100}
                  className="border-2 border-gray-800 rounded-lg"
                />
              </div>
            </div>

            <div className="bg-gray-900 border-2 border-purple-500 rounded-lg p-4">
              <h2 className="text-xl font-bold text-green-400 mb-4">Stats</h2>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-purple-300">Score:</div>
                <div className="text-right text-white">{score}</div>

                <div className="text-purple-300">Level:</div>
                <div className="text-right text-white">{level}</div>

                <div className="text-purple-300">Lines:</div>
                <div className="text-right text-white">{lines}</div>

                <div className="text-purple-300">High Score:</div>
                <div className="text-right text-white">{highScore}</div>
              </div>
            </div>

            <div className="bg-gray-900 border-2 border-purple-500 rounded-lg p-4">
              <h2 className="text-xl font-bold text-green-400 mb-4">Controls</h2>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center">
                  <ArrowLeft className="text-yellow-400 mr-2" size={16} />
                  <span className="text-gray-300">Left</span>
                </div>
                <div className="flex items-center">
                  <ArrowRight className="text-yellow-400 mr-2" size={16} />
                  <span className="text-gray-300">Right</span>
                </div>

                <div className="flex items-center">
                  <ArrowDown className="text-yellow-400 mr-2" size={16} />
                  <span className="text-gray-300">Soft Drop</span>
                </div>
                <div className="flex items-center">
                  <RotateCw className="text-yellow-400 mr-2" size={16} />
                  <span className="text-gray-300">Rotate</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="text-blue-400 border-blue-500 hover:bg-blue-950 hover:text-blue-200"
                  onClick={() => moveShape(0, 1)}
                  disabled={gameOver || isPaused}
                >
                  <ArrowDown className="mr-2 h-4 w-4" /> Down
                </Button>

                <Button
                  variant="outline"
                  className="text-blue-400 border-blue-500 hover:bg-blue-950 hover:text-blue-200"
                  onClick={hardDrop}
                  disabled={gameOver || isPaused}
                >
                  <ArrowDown className="mr-1 h-4 w-4" />
                  <ArrowDown className="h-4 w-4" /> Drop
                </Button>

                <Button
                  variant="outline"
                  className="text-blue-400 border-blue-500 hover:bg-blue-950 hover:text-blue-200"
                  onClick={() => moveShape(-1, 0)}
                  disabled={gameOver || isPaused}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Left
                </Button>

                <Button
                  variant="outline"
                  className="text-blue-400 border-blue-500 hover:bg-blue-950 hover:text-blue-200"
                  onClick={() => moveShape(1, 0)}
                  disabled={gameOver || isPaused}
                >
                  <ArrowRight className="mr-2 h-4 w-4" /> Right
                </Button>

                <Button
                  variant="outline"
                  className="col-span-2 text-blue-400 border-blue-500 hover:bg-blue-950 hover:text-blue-200"
                  onClick={rotateShape}
                  disabled={gameOver || isPaused}
                >
                  <RotateCw className="mr-2 h-4 w-4" /> Rotate
                </Button>
              </div>
            </div>
          </div>
        </div>

        {gameOver && (
          <div className="mt-6 bg-gray-900 border-2 border-red-500 rounded-lg p-4 animate-pulse">
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
          <div className="mt-6 bg-gray-900 border-2 border-yellow-500 rounded-lg p-4">
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

