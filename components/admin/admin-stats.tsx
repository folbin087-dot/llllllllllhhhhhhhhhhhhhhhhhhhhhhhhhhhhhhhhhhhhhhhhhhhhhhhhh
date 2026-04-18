"use client"

import { Users, DollarSign, TrendingUp, TrendingDown } from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

const chartData = [
  { date: "01.02", users: 45, deposits: 12000, wins: 8500, losses: 6200 },
  { date: "02.02", users: 52, deposits: 15000, wins: 11200, losses: 7800 },
  { date: "03.02", users: 48, deposits: 13500, wins: 9800, losses: 8100 },
  { date: "04.02", users: 61, deposits: 18000, wins: 13500, losses: 9200 },
  { date: "05.02", users: 55, deposits: 16200, wins: 12000, losses: 8700 },
  { date: "06.02", users: 72, deposits: 22000, wins: 16800, losses: 10500 },
  { date: "07.02", users: 68, deposits: 19500, wins: 14200, losses: 11000 },
  { date: "08.02", users: 78, deposits: 24000, wins: 18500, losses: 12300 },
  { date: "09.02", users: 85, deposits: 28000, wins: 21000, losses: 13800 },
  { date: "10.02", users: 92, deposits: 32000, wins: 24500, losses: 15200 },
  { date: "11.02", users: 88, deposits: 29000, wins: 22000, losses: 14500 },
  { date: "12.02", users: 95, deposits: 35000, wins: 26800, losses: 16100 },
  { date: "13.02", users: 102, deposits: 38000, wins: 29000, losses: 17500 },
  { date: "14.02", users: 110, deposits: 42000, wins: 32000, losses: 19000 },
]

const summaryStats = [
  {
    label: "Пользователи",
    value: "1,247",
    change: "+12%",
    icon: Users,
    color: "#00b4d8",
  },
  {
    label: "Депозиты",
    value: "324,500 ₽",
    change: "+18%",
    icon: DollarSign,
    color: "#2ee06e",
  },
  {
    label: "Выигрыши",
    value: "259,600 ₽",
    change: "+15%",
    icon: TrendingUp,
    color: "#ffd93d",
  },
  {
    label: "Проигрыши",
    value: "178,900 ₽",
    change: "+9%",
    icon: TrendingDown,
    color: "#ff4757",
  },
]

export default function AdminStats() {
  return (
    <div className="flex flex-col gap-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summaryStats.map((stat, i) => (
          <div key={i} className="bg-card rounded-xl border border-border/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
              <span className="text-xs font-semibold text-[#2ee06e]">{stat.change}</span>
            </div>
            <p className="text-lg font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Users Chart */}
      <div className="bg-card rounded-xl border border-border/50 p-4">
        <h3 className="text-sm font-semibold text-foreground mb-4">Активность пользователей</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2ee06e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2ee06e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorDeposits" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00b4d8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00b4d8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a3f4e" />
              <XAxis dataKey="date" stroke="#7b8fa3" fontSize={11} />
              <YAxis stroke="#7b8fa3" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a2c38",
                  border: "1px solid #2a3f4e",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#e8edf2",
                }}
              />
              <Area
                type="monotone"
                dataKey="users"
                stroke="#2ee06e"
                fillOpacity={1}
                fill="url(#colorUsers)"
                name="Пользователи"
              />
              <Area
                type="monotone"
                dataKey="deposits"
                stroke="#00b4d8"
                fillOpacity={1}
                fill="url(#colorDeposits)"
                name="Депозиты ₽"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Wins/Losses Chart */}
      <div className="bg-card rounded-xl border border-border/50 p-4">
        <h3 className="text-sm font-semibold text-foreground mb-4">Выигрыши / Проигрыши</h3>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorWins" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ffd93d" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ffd93d" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorLosses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff4757" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ff4757" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a3f4e" />
              <XAxis dataKey="date" stroke="#7b8fa3" fontSize={11} />
              <YAxis stroke="#7b8fa3" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a2c38",
                  border: "1px solid #2a3f4e",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#e8edf2",
                }}
              />
              <Area
                type="monotone"
                dataKey="wins"
                stroke="#ffd93d"
                fillOpacity={1}
                fill="url(#colorWins)"
                name="Выигрыши ₽"
              />
              <Area
                type="monotone"
                dataKey="losses"
                stroke="#ff4757"
                fillOpacity={1}
                fill="url(#colorLosses)"
                name="Проигрыши ₽"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
