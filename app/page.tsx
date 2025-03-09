import Link from "next/link"
import { ArrowRight, Trophy, Users, Gamepad2 } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-12 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 text-green-400 animate-pulse">RETRO ARCADE</h1>
          <p className="text-xl text-purple-300">Classic games with modern twists</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {games.map((game) => (
            <Link key={game.id} href={`/games/${game.id}`} className="group">
              <div className="bg-gray-900 border-2 border-purple-500 rounded-lg overflow-hidden transition-all duration-300 hover:scale-105 hover:border-green-400 hover:shadow-lg hover:shadow-green-400/20">
                <div className="h-48 bg-gray-800 relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <img
                      src={`/placeholder.svg?height=200&width=300&text=${game.name}`}
                      alt={game.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div className="p-4">
                  <h2 className="text-2xl font-bold text-green-400 mb-2">{game.name}</h2>
                  <p className="text-gray-300 mb-4">{game.description}</p>
                  <div className="flex justify-between items-center">
                    <div className="flex space-x-2">
                      {game.multiplayer && <Users className="text-yellow-400" size={20} />}
                      {game.leaderboard && <Trophy className="text-yellow-400" size={20} />}
                      {game.mods && <Gamepad2 className="text-yellow-400" size={20} />}
                    </div>
                    <span className="text-purple-300 group-hover:text-green-400 flex items-center">
                      Play <ArrowRight className="ml-1" size={16} />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-16 bg-gray-900 border-2 border-purple-500 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-green-400 mb-4">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col items-center text-center">
              <Users className="text-yellow-400 mb-2" size={40} />
              <h3 className="text-xl font-bold text-purple-300 mb-2">Multiplayer</h3>
              <p className="text-gray-300">Challenge your friends in real-time multiplayer matches</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <Trophy className="text-yellow-400 mb-2" size={40} />
              <h3 className="text-xl font-bold text-purple-300 mb-2">Global Leaderboards</h3>
              <p className="text-gray-300">Compete for the highest scores and see your ranking</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <Gamepad2 className="text-yellow-400 mb-2" size={40} />
              <h3 className="text-xl font-bold text-purple-300 mb-2">Game Modifications</h3>
              <p className="text-gray-300">Unlock special modes and customize your gaming experience</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const games = [
  {
    id: "snake",
    name: "Snake",
    description: "Navigate the snake to eat food and grow without hitting walls or yourself.",
    multiplayer: true,
    leaderboard: true,
    mods: true,
  },
  {
    id: "pong",
    name: "Pong",
    description: "Classic table tennis game. Prevent the ball from passing your paddle.",
    multiplayer: true,
    leaderboard: true,
    mods: true,
  },
  {
    id: "road-racer",
    name: "Road Racer",
    description: "Race motorcycles, avoid obstacles, and perform stunts to earn points.",
    multiplayer: true,
    leaderboard: true,
    mods: true,
  },
  {
    id: "tetris",
    name: "Tetris",
    description: "Arrange falling blocks to create complete lines and prevent the stack from reaching the top.",
    multiplayer: false,
    leaderboard: true,
    mods: true,
  },
]

