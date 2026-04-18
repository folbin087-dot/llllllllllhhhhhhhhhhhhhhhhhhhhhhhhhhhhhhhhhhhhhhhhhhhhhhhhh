"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"

const banners = [
  {
    id: 1,
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/banner1-j7f3AfSufQcBw0Fn7wEKUZR7hQOQs0.png",
    alt: "Проверка игры",
    link: "#fairness",
  },
  {
    id: 2,
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/banner2-lvWU76nZkt76swkiABInsnpYBS1WXY.png",
    alt: "Промо-коды",
    link: "#promo",
  },
  {
    id: 3,
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/banner3-g18z9pdzkYioTRmV0FAQsPZmWLZkMi.png",
    alt: "Партнерство",
    link: "/referral",
  },
]

export default function BannerCarousel() {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  const prev = () => setCurrent((c) => (c === 0 ? banners.length - 1 : c - 1))
  const next = () => setCurrent((c) => (c + 1) % banners.length)

  return (
    <div className="relative w-full overflow-hidden rounded-xl">
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {banners.map((banner) => (
          <a
            key={banner.id}
            href={banner.link}
            className="w-full flex-shrink-0"
          >
            <div className="relative w-full aspect-[2.5/1] md:aspect-[3.5/1]">
              <Image
                src={banner.src}
                alt={banner.alt}
                fill
                className="object-cover rounded-xl"
                priority
              />
            </div>
          </a>
        ))}
      </div>

      {/* Controls */}
      <button
        onClick={prev}
        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#0f1923]/70 hover:bg-[#0f1923]/90 flex items-center justify-center transition-colors"
        aria-label="Previous banner"
      >
        <ChevronLeft className="w-4 h-4 text-foreground" />
      </button>
      <button
        onClick={next}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#0f1923]/70 hover:bg-[#0f1923]/90 flex items-center justify-center transition-colors"
        aria-label="Next banner"
      >
        <ChevronRight className="w-4 h-4 text-foreground" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
        {banners.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-2 h-2 rounded-full transition-all ${
              i === current ? "bg-[#2ee06e] w-5" : "bg-foreground/30"
            }`}
            aria-label={`Go to banner ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
