"use client"

import Image from "next/image"
import Link from "next/link"

const games = [
  {
    id: "dice",
    name: "Dice",
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/dice-qFQt4xWUFriYwcBPcACdCfCbnhMhip.png",
    href: "/games/dice",
  },
  {
    id: "mines",
    name: "Mines",
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/mines-y4G9et0StLbUBiJcdrIaKjvQl8r56t.png",
    href: "/games/mines",
  },
  {
    id: "wheel",
    name: "Wheel",
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/wheel-zv2wGzNRi1YqMxMil2Q2EMzwndfG1L.png",
    href: "/games/wheel",
  },
  {
    id: "plinko",
    name: "Plinko",
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/plinko-qMqH6hcjnd7jBSfgoDSteolb7CKUX0.png",
    href: "/games/plinko",
  },
  {
    id: "blackjack",
    name: "BlackJack",
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/blackjack-rn2oamgs9CiIhfBDHed1OrSwNGlSXJ.jpg",
    href: "/games/blackjack",
  },
  {
    id: "roulette",
    name: "Roulette",
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/roulette-5pHXoPJ3yCD4JEG9m7Gb8BvmzIE3lB.jpg",
    href: "/games/roulette",
  },

  {
    id: "aviatrix",
    name: "Aviatrix",
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/aviatrix-meR1A54xdc8dl9PjJ5qxSrBJEuqJsg.jpg",
    href: "/games/aviatrix",
  },
]

export default function GameCards() {
  return (
    <section>
      <h2 className="text-lg font-bold text-foreground mb-4">Игры</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {games.map((game) => (
          <Link
            key={game.id}
            href={game.href}
            className="game-card group relative rounded-xl overflow-hidden bg-card border border-border/50"
          >
            <div className="relative aspect-[3/4]">
              <Image
                src={game.image}
                alt={game.name}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-[#0f1923]/0 group-hover:bg-[#0f1923]/50 transition-colors flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-[#2ee06e] text-[#0f1923] font-bold text-sm px-5 py-2 rounded-lg">
                  Играть
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
