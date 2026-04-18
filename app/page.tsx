import Header from "@/components/header"
import BannerCarousel from "@/components/banner-carousel"
import GameCards from "@/components/game-cards"
import FAQSection from "@/components/faq-section"
import Footer from "@/components/footer"

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-4 flex flex-col gap-6">
        <BannerCarousel />
        <GameCards />
        <FAQSection />
      </main>
      <Footer />
    </div>
  )
}
