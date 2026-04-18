"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Gamepad2, Gift, User, Wallet } from "lucide-react"

const navItems = [
  { href: "/", icon: Home, label: "Главная" },
  { href: "/games/aviatrix", icon: Gamepad2, label: "Игры" },
  { href: "/deposit", icon: Wallet, label: "Депозит" },
  { href: "/bonuses", icon: Gift, label: "Бонусы" },
  { href: "/profile", icon: User, label: "Профиль" },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border/50 z-50 safe-area-inset-bottom">
      <div className="max-w-md mx-auto flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== "/" && pathname.startsWith(item.href))
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                isActive 
                  ? "text-[#2ee06e]" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? "drop-shadow-[0_0_6px_rgba(46,224,110,0.5)]" : ""}`} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
