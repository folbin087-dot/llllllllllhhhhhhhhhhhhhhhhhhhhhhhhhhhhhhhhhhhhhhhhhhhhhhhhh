"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const faqItems = [
  {
    q: "Что такое PLAID?",
    a: "PLAID - это сервис мгновенных игр, где вы можете играть в различные игры: Dice, Mines, Wheel, Plinko, BlackJack, Roulette и другие. Все игры работают на основе проверяемой честности.",
  },
  {
    q: "Как пополнить баланс?",
    a: "Вы можете пополнить баланс через СБП (Систему быстрых платежей) или криптовалюту TON через Tonkeeper. Минимальная сумма пополнения - 100 рублей.",
  },
  {
    q: "Как вывести выигрыш?",
    a: "Для вывода средств перейдите в профиль, выберите способ вывода и укажите сумму. Выплаты производятся в течение 24 часов на любую платежную систему.",
  },
  {
    q: "Как проверить честность игры?",
    a: "Каждую ставку вы можете проверить на честность, используя хэш вашей игры. Перейдите в раздел 'Проверка игры' для верификации результатов.",
  },
  {
    q: "Что такое промо-коды?",
    a: "Промо-коды дают бонусы: процент к депозиту или деньги на баланс. Получить промо-коды можно в нашем Telegram канале или через реферальную программу.",
  },
  {
    q: "Как работает реферальная система?",
    a: "Приглашайте друзей по вашей реферальной ссылке и получайте 5% от их проигрышей. Партнерская ссылка и подробная аналитика доступны в разделе 'Партнерка'.",
  },
]

export default function FAQSection() {
  return (
    <section>
      <h2 className="text-lg font-bold text-foreground mb-4">FAQ</h2>
      <div className="bg-card rounded-xl border border-border/50 p-4">
        <Accordion type="single" collapsible className="w-full">
          {faqItems.map((item, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="border-border/50">
              <AccordionTrigger className="text-sm font-medium text-foreground/90 hover:text-foreground hover:no-underline py-3">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
