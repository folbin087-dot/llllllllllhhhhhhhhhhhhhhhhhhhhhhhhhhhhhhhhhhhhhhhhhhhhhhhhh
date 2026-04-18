import Link from "next/link"
import { MessageCircle, HelpCircle, Shield } from "lucide-react"

export default function Footer() {
  return (
    <footer className="bg-[#0d1620] border-t border-border py-6 mt-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-[#2ee06e]">PLAID</span>
            <span className="text-xs text-muted-foreground">
              Сервис мгновенных игр
            </span>
          </div>
          <nav className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">
              Игры
            </Link>
            <Link href="/bonus" className="hover:text-foreground transition-colors">
              Бонусы
            </Link>
            <Link href="/referral" className="hover:text-foreground transition-colors">
              Рефералы
            </Link>
            <Link href="/support" className="hover:text-[#2ee06e] transition-colors flex items-center gap-1">
              <HelpCircle className="w-3 h-3" />
              Поддержка
            </Link>
            <a
              href="https://t.me/plaid_support"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#2aabee] transition-colors flex items-center gap-1"
            >
              <MessageCircle className="w-3 h-3" />
              Telegram
            </a>
          </nav>
          <p className="text-xs text-muted-foreground/60">
            &copy; 2026 PLAID. Все права защищены.
          </p>
        </div>
        
        {/* Additional Info */}
        <div className="mt-4 pt-4 border-t border-border/50 flex flex-wrap items-center justify-center gap-4 text-[10px] text-muted-foreground/50">
          <div className="flex items-center gap-1">
            <Shield className="w-3 h-3" />
            <span>Безопасные платежи</span>
          </div>
          <span>18+</span>
          <span>Играйте ответственно</span>
        </div>
      </div>
    </footer>
  )
}
