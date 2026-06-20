import { useState, useEffect } from 'react'
import type { Payment, Prize } from './supabase'
import { adminApi } from './adminApi'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { format, subDays } from 'date-fns'

export default function AdminFinancials() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [prizes, setPrizes] = useState<Prize[]>([])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 10000)
    return () => clearInterval(interval)
  }, [])

  async function loadData() {
    const data = await adminApi<{ payments: Payment[]; prizes: Prize[] }>('financials')
    setPayments(data.payments)
    setPrizes(data.prizes)
  }

  const totalRevenue = payments.reduce((s, p) => s + p.amount, 0)
  const totalCost = prizes.reduce((s, p) => s + p.amount, 0)
  const netIncome = totalRevenue - totalCost
  const margin = totalRevenue > 0 ? ((netIncome / totalRevenue) * 100).toFixed(1) : '0.0'

  // Chart data last 30 days
  const chartData = Array.from({ length: 30 }, (_, i) => {
    const d = format(subDays(new Date(), 29 - i), 'dd/MM')
    const full = format(subDays(new Date(), 29 - i), 'yyyy-MM-dd')
    const rev = payments.filter(p => p.created_at.startsWith(full)).reduce((s, p) => s + p.amount, 0)
    const cost = prizes.filter(p => (p.delivered_at || p.created_at).startsWith(full)).reduce((s, p) => s + p.amount, 0)
    return { date: d, receita: rev, custo: cost, lucro: rev - cost }
  })

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Financeiro</h1>
        <div className="font-mono text-[10px] text-white/20 tracking-widest mt-1">Resultados e gestão financeira</div>
      </div>

      {/* P&L Summary */}
      <div className="grid grid-cols-1 gap-3 mb-8 sm:grid-cols-2 xl:grid-cols-4">
        <div className="border border-green/20 bg-green/5 p-5">
          <div className="font-mono text-[9px] text-white/30 tracking-widest mb-2">RECEITA TOTAL</div>
          <div className="font-display text-3xl font-black text-green">{totalRevenue.toLocaleString()}</div>
          <div className="font-mono text-[9px] text-white/20 mt-1">Kz</div>
        </div>
        <div className="border border-red/20 bg-red/5 p-5">
          <div className="font-mono text-[9px] text-white/30 tracking-widest mb-2">CUSTO PRÉMIOS</div>
          <div className="font-display text-3xl font-black text-red">{totalCost.toLocaleString()}</div>
          <div className="font-mono text-[9px] text-white/20 mt-1">Kz</div>
        </div>
        <div className={`border p-5 ${netIncome >= 0 ? 'border-blue/20 bg-blue/5' : 'border-red/30 bg-red/10'}`}>
          <div className="font-mono text-[9px] text-white/30 tracking-widest mb-2">RESULTADO LÍQUIDO</div>
          <div className={`font-display text-3xl font-black ${netIncome >= 0 ? 'text-blue' : 'text-red'}`}>
            {netIncome >= 0 ? '+' : ''}{netIncome.toLocaleString()}
          </div>
          <div className="font-mono text-[9px] text-white/20 mt-1">Kz</div>
        </div>
        <div className="border border-white/10 bg-surface3 p-5">
          <div className="font-mono text-[9px] text-white/30 tracking-widest mb-2">MARGEM</div>
          <div className="font-display text-3xl font-black text-white">{margin}%</div>
          <div className="font-mono text-[9px] text-white/20 mt-1">Resultado / Receita</div>
        </div>
      </div>

      {/* Chart */}
      <div className="admin-panel-pad mb-6">
        <div className="font-mono text-[10px] text-white/30 tracking-widest mb-4">EVOLUÇÃO FINANCEIRA — 30 DIAS</div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="revG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00FF88" stopOpacity={0.15} /><stop offset="95%" stopColor="#00FF88" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="costG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF2D2D" stopOpacity={0.15} /><stop offset="95%" stopColor="#FF2D2D" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.2)', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} interval={4} />
            <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.2)', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: '#111', border: '1px solid #222', borderRadius: 0, fontFamily: 'JetBrains Mono', fontSize: 11 }} />
            <Area type="monotone" dataKey="receita" stroke="#00FF88" strokeWidth={1.5} fill="url(#revG)" name="Receita" />
            <Area type="monotone" dataKey="custo" stroke="#FF2D2D" strokeWidth={1.5} fill="url(#costG)" name="Custos" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Payments table */}
        <div className="admin-panel-pad">
          <div className="admin-section-title mb-4 text-green/60">RECEITAS</div>
          <div className="max-h-80 overflow-auto">
            <table className="admin-table">
              <thead><tr><th>Data</th><th>Arquivo</th><th>Jogadores</th><th className="text-right">Valor</th></tr></thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr><td colSpan={4} className="admin-empty">Sem receitas ainda</td></tr>
                ) : payments.map((p) => (
                  <tr key={p.id}>
                    <td className="font-mono text-[10px]">{new Date(p.created_at).toLocaleDateString('pt-AO')}</td>
                    <td className="text-xs truncate max-w-[120px]">{p.archive_title}</td>
                    <td className="font-mono text-center">{p.num_players}</td>
                    <td className="text-right"><span className="badge-green">{p.amount.toLocaleString()} Kz</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Prizes costs table */}
        <div className="admin-panel-pad">
          <div className="admin-section-title mb-4 text-red/60">CUSTOS COM PRÉMIOS</div>
          <div className="max-h-80 overflow-auto">
            <table className="admin-table">
              <thead><tr><th>Prémio</th><th>Valor</th><th>Data</th></tr></thead>
              <tbody>
                {prizes.length === 0 ? (
                  <tr><td colSpan={3} className="admin-empty">Sem custos ainda</td></tr>
                ) : prizes.map((p) => (
                  <tr key={p.id}>
                    <td className="font-mono text-white/50">Prémio {p.prize_number}</td>
                    <td><span className="badge-red">{p.amount.toLocaleString()} Kz</span></td>
                    <td className="font-mono text-[10px]">{new Date(p.created_at).toLocaleDateString('pt-AO')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {prizes.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border flex justify-between">
              <span className="font-mono text-xs text-white/30">Total Custos</span>
              <span className="font-mono text-sm font-bold text-red">{totalCost.toLocaleString()} Kz</span>
            </div>
          )}
        </div>
      </div>

      {/* Net summary */}
      <div className="admin-panel-pad mt-4">
        <div className="font-mono text-[10px] text-white/30 tracking-widest mb-4">DEMONSTRAÇÃO DE RESULTADOS</div>
        <div className="space-y-2">
          <div className="flex justify-between py-2 border-b border-border">
            <span className="font-mono text-sm text-white/50">(+) Receita Bruta</span>
            <span className="font-mono text-sm text-green">+ {totalRevenue.toLocaleString()} Kz</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <span className="font-mono text-sm text-white/50">(−) Custos com Prémios</span>
            <span className="font-mono text-sm text-red">− {totalCost.toLocaleString()} Kz</span>
          </div>
          <div className="flex justify-between py-3">
            <span className="font-sans font-bold text-white">RESULTADO LÍQUIDO</span>
            <span className={`font-display text-xl font-black ${netIncome >= 0 ? 'text-blue' : 'text-red'}`}>
              {netIncome >= 0 ? '+' : ''}{netIncome.toLocaleString()} Kz
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
