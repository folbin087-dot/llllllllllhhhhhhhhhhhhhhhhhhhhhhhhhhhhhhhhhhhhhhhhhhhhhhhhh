"use client"

import { useState } from "react"
import { Search, User, Ban, Wallet, X, Check, Shield, Trash2, Edit2, Plus, Minus, DollarSign } from "lucide-react"

// Mock user data - in production this would come from database
const initialUsers = [
  { 
    id: 1,
    telegramId: 123456789, 
    username: "@ivan_crypto", 
    firstName: "Иван",
    balance: 5420.50, 
    totalDeposit: 15000, 
    totalWins: 12500, 
    totalLosses: 8200, 
    status: "active" as const, 
    lastActive: "Онлайн"
  },
  { 
    id: 2,
    telegramId: 987654321, 
    username: "@player_max", 
    firstName: "Максим",
    balance: 1230.00, 
    totalDeposit: 8000, 
    totalWins: 6800, 
    totalLosses: 5500, 
    status: "active" as const,
    lastActive: "15 мин"
  },
  { 
    id: 3,
    telegramId: 555444333, 
    username: "-", 
    firstName: "Алексей",
    balance: 0.00, 
    totalDeposit: 3000, 
    totalWins: 2100, 
    totalLosses: 3000, 
    status: "banned" as const,
    lastActive: "3 дня"
  },
  { 
    id: 4,
    telegramId: 111222333, 
    username: "@lucky_winner", 
    firstName: "Дмитрий",
    balance: 8900.75, 
    totalDeposit: 25000, 
    totalWins: 22000, 
    totalLosses: 15000, 
    status: "vip" as const,
    lastActive: "Онлайн"
  },
  { 
    id: 5,
    telegramId: 444555666, 
    username: "@gambler_pro", 
    firstName: "Анна",
    balance: 340.20, 
    totalDeposit: 5000, 
    totalWins: 3200, 
    totalLosses: 4800, 
    status: "active" as const,
    lastActive: "1 час"
  },
]

type UserStatus = "active" | "banned" | "vip"

interface UserType {
  id: number
  telegramId: number
  username: string
  firstName: string
  balance: number
  totalDeposit: number
  totalWins: number
  totalLosses: number
  status: UserStatus
  lastActive: string
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserType[]>(initialUsers)
  const [search, setSearch] = useState("")
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null)
  const [showUserModal, setShowUserModal] = useState(false)
  const [quickBalanceAmount, setQuickBalanceAmount] = useState<Record<number, string>>({})

  const filtered = users.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.firstName.toLowerCase().includes(search.toLowerCase()) ||
      u.telegramId.toString().includes(search)
  )

  const toggleBan = (userId: number) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return { ...u, status: u.status === "banned" ? "active" : "banned" }
      }
      return u
    }))
  }

  const toggleVip = (userId: number) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return { ...u, status: u.status === "vip" ? "active" : "vip" }
      }
      return u
    }))
  }

  const quickAddBalance = (userId: number) => {
    const amount = parseFloat(quickBalanceAmount[userId] || "0")
    if (isNaN(amount) || amount <= 0) return
    
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return { ...u, balance: parseFloat((u.balance + amount).toFixed(2)) }
      }
      return u
    }))
    setQuickBalanceAmount(prev => ({ ...prev, [userId]: "" }))
  }

  const quickSubtractBalance = (userId: number) => {
    const amount = parseFloat(quickBalanceAmount[userId] || "0")
    if (isNaN(amount) || amount <= 0) return
    
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return { ...u, balance: parseFloat(Math.max(0, u.balance - amount).toFixed(2)) }
      }
      return u
    }))
    setQuickBalanceAmount(prev => ({ ...prev, [userId]: "" }))
  }

  const setBalance = (userId: number, amount: number) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return { ...u, balance: parseFloat(amount.toFixed(2)) }
      }
      return u
    }))
  }

  const deleteUser = (userId: number) => {
    if (confirm("Удалить пользователя? Это действие нельзя отменить.")) {
      setUsers(prev => prev.filter(u => u.id !== userId))
    }
  }

  const openUserDetails = (user: UserType) => {
    setSelectedUser(user)
    setShowUserModal(true)
  }

  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case "vip":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#ffd93d]/20 text-[#ffd93d]">VIP</span>
      case "banned":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-destructive/20 text-destructive">БАН</span>
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#2ee06e]/20 text-[#2ee06e]">АКТИВ</span>
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search */}
      <div className="flex items-center bg-secondary rounded-xl px-3">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по ID, username или имени..."
          className="flex-1 bg-transparent text-sm text-foreground px-2 py-3 outline-none"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-card rounded-xl border border-border/50 p-3 text-center">
          <p className="text-xl font-bold text-foreground">{users.length}</p>
          <p className="text-[10px] text-muted-foreground">Всего</p>
        </div>
        <div className="bg-card rounded-xl border border-border/50 p-3 text-center">
          <p className="text-xl font-bold text-[#2ee06e]">{users.filter(u => u.status === "active").length}</p>
          <p className="text-[10px] text-muted-foreground">Активных</p>
        </div>
        <div className="bg-card rounded-xl border border-border/50 p-3 text-center">
          <p className="text-xl font-bold text-[#ffd93d]">{users.filter(u => u.status === "vip").length}</p>
          <p className="text-[10px] text-muted-foreground">VIP</p>
        </div>
        <div className="bg-card rounded-xl border border-border/50 p-3 text-center">
          <p className="text-xl font-bold text-destructive">{users.filter(u => u.status === "banned").length}</p>
          <p className="text-[10px] text-muted-foreground">Забанено</p>
        </div>
      </div>

      {/* Users List - Compact View */}
      <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-secondary/50 text-xs text-muted-foreground">
                <th className="text-left px-4 py-3 font-medium">Пользователь</th>
                <th className="text-center px-2 py-3 font-medium">Баланс</th>
                <th className="text-center px-2 py-3 font-medium">Статус</th>
                <th className="text-center px-2 py-3 font-medium min-w-[180px]">Быстрый баланс</th>
                <th className="text-center px-2 py-3 font-medium">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filtered.map((user) => (
                <tr 
                  key={user.id} 
                  className={`hover:bg-secondary/30 transition-colors ${
                    user.status === "banned" ? "opacity-60" : ""
                  }`}
                >
                  {/* User Info */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        user.status === "vip" ? "bg-[#ffd93d]/20" : "bg-secondary"
                      }`}>
                        <User className={`w-4 h-4 ${user.status === "vip" ? "text-[#ffd93d]" : "text-muted-foreground"}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">{user.firstName}</p>
                        <p className="text-xs text-[#2aabee] truncate">{user.username}</p>
                      </div>
                    </div>
                  </td>

                  {/* Balance */}
                  <td className="px-2 py-3 text-center">
                    <p className="text-sm font-bold text-[#2ee06e]">{user.balance.toFixed(2)} ₽</p>
                  </td>

                  {/* Status */}
                  <td className="px-2 py-3 text-center">
                    {getStatusBadge(user.status)}
                  </td>

                  {/* Quick Balance Control */}
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-1 justify-center">
                      <input
                        type="number"
                        value={quickBalanceAmount[user.id] || ""}
                        onChange={(e) => setQuickBalanceAmount(prev => ({ ...prev, [user.id]: e.target.value }))}
                        placeholder="Сумма"
                        className="w-20 bg-secondary text-xs text-foreground px-2 py-1.5 rounded outline-none border border-border/50 focus:border-[#2ee06e]/50"
                      />
                      <button
                        onClick={() => quickAddBalance(user.id)}
                        className="p-1.5 bg-[#2ee06e]/20 hover:bg-[#2ee06e]/30 text-[#2ee06e] rounded transition-colors"
                        title="Пополнить"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => quickSubtractBalance(user.id)}
                        className="p-1.5 bg-destructive/20 hover:bg-destructive/30 text-destructive rounded transition-colors"
                        title="Списать"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-1 justify-center">
                      <button
                        onClick={() => openUserDetails(user)}
                        className="p-1.5 bg-secondary hover:bg-border text-foreground rounded transition-colors"
                        title="Подробнее"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => toggleVip(user.id)}
                        className={`p-1.5 rounded transition-colors ${
                          user.status === "vip" 
                            ? "bg-[#ffd93d] text-[#0f1923]" 
                            : "bg-secondary hover:bg-[#ffd93d]/20 text-muted-foreground hover:text-[#ffd93d]"
                        }`}
                        title="VIP статус"
                      >
                        <Shield className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => toggleBan(user.id)}
                        className={`p-1.5 rounded transition-colors ${
                          user.status === "banned"
                            ? "bg-[#2ee06e] text-[#0f1923]"
                            : "bg-destructive/20 hover:bg-destructive/30 text-destructive"
                        }`}
                        title={user.status === "banned" ? "Разбанить" : "Забанить"}
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteUser(user.id)}
                        className="p-1.5 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded transition-colors"
                        title="Удалить"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border/50 w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  selectedUser.status === "vip" ? "bg-[#ffd93d]/20" : "bg-secondary"
                }`}>
                  <User className={`w-6 h-6 ${selectedUser.status === "vip" ? "text-[#ffd93d]" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className="font-bold text-foreground">{selectedUser.firstName}</p>
                  <p className="text-sm text-[#2aabee]">{selectedUser.username}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowUserModal(false)}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Telegram ID */}
              <div className="bg-secondary/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Telegram ID</p>
                <p className="font-mono text-sm text-foreground">{selectedUser.telegramId}</p>
              </div>

              {/* Balance Control */}
              <div className="bg-secondary/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-2">Баланс</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center bg-background rounded-lg overflow-hidden border border-border/50">
                    <DollarSign className="w-4 h-4 text-muted-foreground ml-2" />
                    <input
                      type="number"
                      value={selectedUser.balance}
                      onChange={(e) => {
                        const newBalance = parseFloat(e.target.value) || 0
                        setBalance(selectedUser.id, newBalance)
                        setSelectedUser({ ...selectedUser, balance: newBalance })
                      }}
                      className="flex-1 bg-transparent text-foreground font-bold px-2 py-2 outline-none"
                    />
                    <span className="text-muted-foreground text-sm pr-2">₽</span>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {[100, 500, 1000, 5000].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => {
                        const newBalance = selectedUser.balance + amount
                        setBalance(selectedUser.id, newBalance)
                        setSelectedUser({ ...selectedUser, balance: newBalance })
                      }}
                      className="bg-[#2ee06e]/20 hover:bg-[#2ee06e]/30 text-[#2ee06e] text-xs font-bold py-1.5 rounded transition-colors"
                    >
                      +{amount}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-secondary/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Депозиты</p>
                  <p className="text-sm font-bold text-[#00b4d8]">{selectedUser.totalDeposit} ₽</p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Выигрыши</p>
                  <p className="text-sm font-bold text-[#2ee06e]">{selectedUser.totalWins} ₽</p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Проигрыши</p>
                  <p className="text-sm font-bold text-destructive">{selectedUser.totalLosses} ₽</p>
                </div>
              </div>

              {/* Status Controls */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    toggleVip(selectedUser.id)
                    setSelectedUser({ 
                      ...selectedUser, 
                      status: selectedUser.status === "vip" ? "active" : "vip" 
                    })
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold transition-colors ${
                    selectedUser.status === "vip" 
                      ? "bg-[#ffd93d] text-[#0f1923]" 
                      : "bg-secondary hover:bg-[#ffd93d]/20 text-muted-foreground hover:text-[#ffd93d]"
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  {selectedUser.status === "vip" ? "Убрать VIP" : "Дать VIP"}
                </button>
                <button
                  onClick={() => {
                    toggleBan(selectedUser.id)
                    setSelectedUser({ 
                      ...selectedUser, 
                      status: selectedUser.status === "banned" ? "active" : "banned" 
                    })
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold transition-colors ${
                    selectedUser.status === "banned"
                      ? "bg-[#2ee06e] text-[#0f1923]"
                      : "bg-destructive/20 hover:bg-destructive/30 text-destructive"
                  }`}
                >
                  <Ban className="w-4 h-4" />
                  {selectedUser.status === "banned" ? "Разбанить" : "Забанить"}
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border/50">
              <button
                onClick={() => setShowUserModal(false)}
                className="w-full bg-[#2ee06e] hover:bg-[#25c45c] text-[#0f1923] font-bold py-2.5 rounded-lg transition-colors"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
