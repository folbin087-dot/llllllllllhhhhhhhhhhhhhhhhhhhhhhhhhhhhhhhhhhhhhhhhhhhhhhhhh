"use client"

import Link from "next/link"
import { ArrowLeft, Wallet } from "lucide-react"
import { ReactNode } from "react"
import GameHistory from "./game-history"

interface GameLayoutProps {
  title: string
  children: ReactNode
  balance: number
}

export default function GameLayout({ title, children, balance }: GameLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Game Header */}
      <header className="sticky top-0 z-50 bg-[#0d1620]/95 backdrop-blur-md border-b border-border">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-foreground" />
            </Link>
            <h1 className="text-lg font-bold text-foreground">{title}</h1>
          </div>
          <div className="flex items-center bg-secondary rounded-lg overflow-hidden">
            <div className="flex items-center gap-1.5 px-3 py-2">
              <Wallet className="w-4 h-4 text-[#2ee06e]" />
              <span className="text-sm font-semibold text-foreground">
                {balance.toFixed(2)} ₽
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Game Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-4 flex flex-col gap-4">
        {children}
        
        {/* Global Game History */}
        <GameHistory gameName={title} />
      </main>
    </div>
  )
}
