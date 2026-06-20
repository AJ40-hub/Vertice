import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { adminApi } from './adminApi'

interface Stats {
  totalRevenue: number; totalRooms: number; totalPlayers: number
  activeSessions: number; pendingPrizes: number; totalPrizeCost: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ totalRevenue: 0, totalRooms: 0, totalPlayers: 0, activeSessions: 0, pendingPrizes: 0, totalPrizeCost: 0 })
  const [revenueData, setRevenueData] = useState<{ date: string; receita: number; jogos: number }[]>([])
  const [weekdayData, setWeekdayData] = useState<{ dia: string; acessos: number }[]>([])
  const [topGames, setTopGames] = useState<{ title: string; plays: number }[]>([])

  useEffect(() => {
    loadDashboard()
    const interval = setInterval(loadDashboard, 30000)
    return () => clearInterval(interval)
  }, [])

  async function loadDashboard() {
    const data = await adminApi<{
      stats: Stats
      revenueData: { date: string; receita: number; jogos: number }[]
      weekdayData: { dia: string; acessos: number }[]
      topGames: { title: string; plays: number }[]
    }>('dashboard')

    setStats(data.stats)
    setRevenueData(data.revenueData)
    setWeekdayData(data.weekdayData)
    setTopGames(data.topGames)
  }

  const kpis = [
    { label: 'Receita Total', value: `${stats.totalRevenue.toLocaleString()} Kz`, color: 'text-green', border: 'border-green/20', bg: 'bg-green/5' },
    { label: 'Sessões Ativas', value: stats.activeSessions, color: 'text-red', border: 'border-red/20', bg: 'bg-red/5', pulse: true },
    { label: 'Salas Criadas', value: stats.totalRooms, color: 'text-blue', border: 'border-blue/20', bg: 'bg-blue/5' },
    { label: 'Total Jogadores', value: stats.totalPlayers, color: 'text-white', border: 'border-white/10', bg: 'bg-surface3' },
    { label: 'Prémios Pendentes', value: stats.pendingPrizes, color: 'text-amber', border: 'border-amber/20', bg: 'bg-amber/5' },
    { label: 'Custo Prémios', value: `${stats.totalPrizeCost.toLocaleString()} Kz`, color: 'text-white/50', border: 'border-white/10', bg: 'bg-surface3' },
  ]

  return (
    <div className="p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Dashboard</h1>
          <div className="font-mono text-[10px] text-white/20 tracking-widest mt-1">
            {new Date().toLocaleDateString('pt-AO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
          <span className="font-mono text-[10px] text-green">TEMPO REAL</span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {kpis.map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`${k.bg} border ${k.border} p-4`}
          >
            <div className="font-mono text-[9px] text-white/30 tracking-widest mb-2 uppercase">{k.label}</div>
            <div className={`font-display text-2xl font-black ${k.color} flex items-center gap-2`}>
              {k.value}
              {k.pulse && k.value > 0 && <div className="w-1.5 h-1.5 rounded-full bg-red animate-pulse" />}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Revenue chart */}
        <div className="lg:col-span-2 border border-border bg-surface2 p-5">
          <div className="font-mono text-[10px] text-white/30 tracking-widest mb-4">RECEITA — ÚLTIMOS 14 DIAS</div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00FF88" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#00FF88" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.2)', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.2)', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#111', border: '1px solid #222', borderRadius: 0, fontFamily: 'JetBrains Mono', fontSize: 11 }} />
              <Area type="monotone" dataKey="receita" stroke="#00FF88" strokeWidth={1.5} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Weekday chart */}
        <div className="border border-border bg-surface2 p-5">
          <div className="font-mono text-[10px] text-white/30 tracking-widest mb-4">ACESSOS POR DIA DA SEMANA</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weekdayData}>
              <XAxis dataKey="dia" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.2)', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.2)', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#111', border: '1px solid #222', borderRadius: 0, fontFamily: 'JetBrains Mono', fontSize: 11 }} />
              <Bar dataKey="acessos" fill="#FF2D2D" opacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top games table */}
      <div className="admin-panel-pad">
        <div className="admin-section-title mb-4">JOGOS MAIS JOGADOS</div>
        {topGames.length === 0 ? (
          <div className="admin-empty">Sem dados ainda</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th><th>Arquivo</th><th className="text-right">Sessões</th>
                </tr>
              </thead>
              <tbody>
                {topGames.map((g, i) => (
                  <tr key={g.title}>
                    <td className="font-mono text-white/20 w-8">{i + 1}</td>
                    <td className="font-sans font-semibold">{g.title}</td>
                    <td className="text-right font-mono">{g.plays}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
