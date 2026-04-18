"use client"

import { useState } from "react"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { ArrowLeft, MessageCircle, Mail, Clock, HelpCircle, FileText, CreditCard, Gamepad2, User, ChevronDown, Send } from "lucide-react"
import Link from "next/link"

const faqItems = [
  {
    category: "Платежи",
    icon: CreditCard,
    questions: [
      {
        q: "Как пополнить баланс?",
        a: "Вы можете пополнить баланс через СБП (Система быстрых платежей) или криптовалюту TON через Tonkeeper. Перейдите в раздел 'Депозит' и выберите удобный способ оплаты."
      },
      {
        q: "Как вывести выигрыш?",
        a: "Для вывода средств перейдите в профиль и нажмите 'Вывод'. Минимальная сумма вывода - 500 рублей. Обработка заявки занимает до 24 часов."
      },
      {
        q: "Почему не зачислился депозит?",
        a: "Обычно средства зачисляются мгновенно. Если прошло более 15 минут, свяжитесь с поддержкой через Telegram с указанием суммы и времени платежа."
      }
    ]
  },
  {
    category: "Игры",
    icon: Gamepad2,
    questions: [
      {
        q: "Как работает Aviatrix?",
        a: "В Aviatrix персонаж взлетает с множителем, который увеличивается со временем. Ваша задача - забрать выигрыш до того, как он улетит. Чем дольше ждете - тем больше множитель, но выше риск."
      },
      {
        q: "Честны ли игры?",
        a: "Да, все игры используют провайдер случайных чисел (RNG). Результаты нельзя предсказать или подделать. Каждый раунд независим от предыдущих."
      },
      {
        q: "Какая минимальная ставка?",
        a: "Минимальная ставка во всех играх - 10 рублей. Максимальная ставка зависит от игры и может достигать 100 000 рублей."
      }
    ]
  },
  {
    category: "Аккаунт",
    icon: User,
    questions: [
      {
        q: "Как изменить данные профиля?",
        a: "Данные профиля привязаны к вашему Telegram аккаунту. Имя и аватар синхронизируются автоматически."
      },
      {
        q: "Забыл пароль / потерял доступ",
        a: "Авторизация происходит через Telegram, поэтому восстановление доступа осуществляется через восстановление аккаунта Telegram."
      },
      {
        q: "Как работает реферальная программа?",
        a: "Приглашайте друзей по вашей реферальной ссылке и получайте 5% от их депозитов. Ваши друзья также получают бонус на первый депозит."
      }
    ]
  }
]

export default function SupportPage() {
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // In production, send to backend
    setSubmitted(true)
    setMessage("")
    setEmail("")
    setTimeout(() => setSubmitted(false), 3000)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-4 flex flex-col gap-6">
        {/* Back */}
        <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Назад
        </Link>

        {/* Title */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Центр поддержки</h1>
          <p className="text-sm text-muted-foreground mt-1">Найдите ответы на вопросы или свяжитесь с нами</p>
        </div>

        {/* Quick Contact */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <a
            href="https://t.me/plaid_support"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#2aabee]/10 border border-[#2aabee]/30 rounded-xl p-4 flex items-center gap-3 hover:bg-[#2aabee]/20 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-[#2aabee] flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Telegram</p>
              <p className="text-xs text-muted-foreground">Быстрый ответ</p>
            </div>
          </a>

          <a
            href="mailto:support@plaid.casino"
            className="bg-[#2ee06e]/10 border border-[#2ee06e]/30 rounded-xl p-4 flex items-center gap-3 hover:bg-[#2ee06e]/20 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-[#2ee06e] flex items-center justify-center">
              <Mail className="w-5 h-5 text-[#0f1923]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Email</p>
              <p className="text-xs text-muted-foreground">support@plaid.casino</p>
            </div>
          </a>

          <div className="bg-[#ffd93d]/10 border border-[#ffd93d]/30 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#ffd93d] flex items-center justify-center">
              <Clock className="w-5 h-5 text-[#0f1923]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">24/7</p>
              <p className="text-xs text-muted-foreground">Круглосуточно</p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
          <div className="px-4 py-3 bg-secondary/30 border-b border-border/50 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-[#2ee06e]" />
            <h2 className="text-sm font-semibold text-foreground">Частые вопросы</h2>
          </div>

          <div className="divide-y divide-border/30">
            {faqItems.map((category) => (
              <div key={category.category} className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <category.icon className="w-4 h-4 text-[#2ee06e]" />
                  <h3 className="text-sm font-semibold text-foreground">{category.category}</h3>
                </div>
                
                <div className="space-y-2">
                  {category.questions.map((item) => {
                    const isExpanded = expandedQuestion === item.q
                    return (
                      <div 
                        key={item.q}
                        className="bg-secondary/30 rounded-lg overflow-hidden"
                      >
                        <button
                          onClick={() => setExpandedQuestion(isExpanded ? null : item.q)}
                          className="w-full flex items-center justify-between px-3 py-2.5 text-left"
                        >
                          <span className="text-sm font-medium text-foreground">{item.q}</span>
                          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </button>
                        {isExpanded && (
                          <div className="px-3 pb-3">
                            <p className="text-xs text-muted-foreground leading-relaxed">{item.a}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
          <div className="px-4 py-3 bg-secondary/30 border-b border-border/50 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#2ee06e]" />
            <h2 className="text-sm font-semibold text-foreground">Написать в поддержку</h2>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Email (необязательно)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full bg-secondary text-sm text-foreground px-3 py-2.5 rounded-lg outline-none border border-border/50 focus:border-[#2ee06e]/50 placeholder:text-muted-foreground/50"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Сообщение</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Опишите вашу проблему или вопрос..."
                rows={4}
                className="w-full bg-secondary text-sm text-foreground px-3 py-2.5 rounded-lg outline-none border border-border/50 focus:border-[#2ee06e]/50 placeholder:text-muted-foreground/50 resize-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={!message.trim()}
              className="w-full flex items-center justify-center gap-2 bg-[#2ee06e] hover:bg-[#25c45c] disabled:bg-secondary disabled:text-muted-foreground text-[#0f1923] font-bold py-3 rounded-xl transition-colors"
            >
              <Send className="w-4 h-4" />
              Отправить
            </button>

            {submitted && (
              <p className="text-center text-xs text-[#2ee06e]">
                Сообщение отправлено! Мы ответим в ближайшее время.
              </p>
            )}
          </form>
        </div>

        {/* Additional Info */}
        <div className="bg-secondary/30 rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground">
            Для срочных вопросов рекомендуем писать в Telegram - там мы отвечаем быстрее всего.
            <br />
            Среднее время ответа: <span className="text-[#2ee06e] font-semibold">5-15 минут</span>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  )
}
