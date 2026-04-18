"use client"

import { useState } from "react"
import Image from "next/image"
import { Plus, Trash2, Link as LinkIcon, ImageIcon } from "lucide-react"

interface Banner {
  id: number
  imageUrl: string
  linkUrl: string
  active: boolean
}

const initialBanners: Banner[] = [
  {
    id: 1,
    imageUrl: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/banner1-j7f3AfSufQcBw0Fn7wEKUZR7hQOQs0.png",
    linkUrl: "#fairness",
    active: true,
  },
  {
    id: 2,
    imageUrl: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/banner2-lvWU76nZkt76swkiABInsnpYBS1WXY.png",
    linkUrl: "#promo",
    active: true,
  },
  {
    id: 3,
    imageUrl: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/banner3-g18z9pdzkYioTRmV0FAQsPZmWLZkMi.png",
    linkUrl: "/referral",
    active: true,
  },
]

export default function AdminBanners() {
  const [banners, setBanners] = useState<Banner[]>(initialBanners)
  const [showAdd, setShowAdd] = useState(false)
  const [newImageUrl, setNewImageUrl] = useState("")
  const [newLinkUrl, setNewLinkUrl] = useState("")

  const addBanner = () => {
    if (!newImageUrl) return
    setBanners((prev) => [
      ...prev,
      {
        id: Date.now(),
        imageUrl: newImageUrl,
        linkUrl: newLinkUrl,
        active: true,
      },
    ])
    setNewImageUrl("")
    setNewLinkUrl("")
    setShowAdd(false)
  }

  const removeBanner = (id: number) => {
    setBanners((prev) => prev.filter((b) => b.id !== id))
  }

  const toggleBanner = (id: number) => {
    setBanners((prev) =>
      prev.map((b) => (b.id === id ? { ...b, active: !b.active } : b))
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Управление баннерами на главной странице. Рекомендуемый размер: 800x250px
        </p>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 bg-[#2ee06e] hover:bg-[#25c45c] text-[#0f1923] font-semibold text-sm px-3 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Добавить
        </button>
      </div>

      {/* Add Banner Form */}
      {showAdd && (
        <div className="bg-card rounded-xl border border-[#2ee06e]/30 p-4 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-foreground">Новый баннер</h3>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">URL изображения</label>
            <div className="flex items-center bg-secondary rounded-lg px-3">
              <ImageIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="https://example.com/banner.png"
                className="flex-1 bg-transparent text-sm text-foreground px-2 py-2.5 outline-none placeholder:text-muted-foreground/50"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Ссылка при клике (необязательно)</label>
            <div className="flex items-center bg-secondary rounded-lg px-3">
              <LinkIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
                placeholder="https://example.com или /page"
                className="flex-1 bg-transparent text-sm text-foreground px-2 py-2.5 outline-none placeholder:text-muted-foreground/50"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={addBanner}
              className="bg-[#2ee06e] hover:bg-[#25c45c] text-[#0f1923] font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
            >
              Сохранить
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="bg-secondary hover:bg-border text-foreground font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Banners List */}
      <div className="flex flex-col gap-3">
        {banners.map((banner) => (
          <div
            key={banner.id}
            className={`bg-card rounded-xl border ${
              banner.active ? "border-border/50" : "border-destructive/30 opacity-60"
            } p-3 flex items-center gap-4`}
          >
            <div className="relative w-[160px] h-[60px] rounded-lg overflow-hidden flex-shrink-0">
              <Image
                src={banner.imageUrl}
                alt="Banner"
                fill
                className="object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground truncate">{banner.imageUrl}</p>
              {banner.linkUrl && (
                <p className="text-xs text-[#00b4d8] truncate flex items-center gap-1 mt-0.5">
                  <LinkIcon className="w-3 h-3" />
                  {banner.linkUrl}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => toggleBanner(banner.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  banner.active
                    ? "bg-[#2ee06e]/20 text-[#2ee06e]"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {banner.active ? "Активен" : "Выкл"}
              </button>
              <button
                onClick={() => removeBanner(banner.id)}
                className="p-1.5 rounded-lg bg-destructive/20 hover:bg-destructive/30 text-destructive transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
