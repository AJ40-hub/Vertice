// AdminPrizes.tsx
import { useState, useEffect } from 'react'
import type { Prize } from './supabase'
import toast from 'react-hot-toast'
import { adminApi } from './adminApi'

export default function AdminPrizes() {
  const [prizes, setPrizes] = useState<Prize[]>([])

  useEffect(() => {
    loadPrizes()
    const interval = setInterval(loadPrizes, 10000)
    return () => clearInterval(interval)
  }, [])

  async function loadPrizes() {
    const data = await adminApi<{ prizes: Prize[] }>('prizes')
    setPrizes(data.prizes)
  }

  async function deliverPrize(prize: Prize) {
    try {
      await adminApi<{ prize: Prize }>('deliver-prize', { prize_id: prize.id })
      toast.success('Prémio marcado como entregue a ' + prize.winner_name)
      loadPrizes()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao entregar prémio.')
    }
  }

  const pending = prizes.filter(p => p.status === 'pending')
  const delivered = prizes.filter(p => p.status === 'delivered')

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Prémios</h1>
        <div className="font-mono text-[10px] text-white/20 tracking-widest mt-1">Gestão de prémios por sala</div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-3 mb-8 md:grid-cols-3">
        <div className="border border-amber/20 bg-amber/5 p-4">
          <div className="font-mono text-[9px] text-white/30 mb-2">PENDENTES</div>
          <div className="font-display text-3xl font-black text-amber">{pending.length}</div>
        </div>
        <div className="border border-green/20 bg-green/5 p-4">
          <div className="font-mono text-[9px] text-white/30 mb-2">ENTREGUES</div>
          <div className="font-display text-3xl font-black text-green">{delivered.length}</div>
        </div>
        <div className="border border-red/20 bg-red/5 p-4">
          <div className="font-mono text-[9px] text-white/30 mb-2">CUSTO TOTAL</div>
          <div className="font-display text-3xl font-black text-red">{(prizes.reduce((s, p) => s + (p.status === 'delivered' ? p.amount : 0), 0)).toLocaleString()} Kz</div>
        </div>
      </div>

      {/* Pending prizes */}
      {pending.length > 0 && (
        <div className="admin-panel-pad mb-6">
          <div className="admin-section-title mb-4 text-amber/60">⚡ PRÉMIOS PENDENTES</div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Jogador</th>
                  <th>Género</th>
                  <th>WhatsApp</th>
                  <th className="text-center">Score</th>
                  <th>Valor</th>
                  <th>Criado em</th>
                  <th className="text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((p) => (
                  <tr key={p.id}>
                    <td><span className="font-sans font-bold text-white">{p.winner_name}</span></td>
                    <td className="capitalize text-white/50">{p.winner_gender}</td>
                    <td>
                      <a href={`https://wa.me/${p.winner_whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                        className="font-mono text-blue transition-colors hover:text-blue/70">{p.winner_whatsapp}</a>
                    </td>
                    <td className="text-center font-mono font-bold">{p.winner_score}</td>
                    <td><span className="badge-amber">{p.amount.toLocaleString()} Kz</span></td>
                    <td className="font-mono text-xs text-white/30">{new Date(p.created_at).toLocaleDateString('pt-AO')}</td>
                    <td className="text-right">
                      <button onClick={() => deliverPrize(p)}
                        className="border border-green/30 bg-green/10 px-3 py-1.5 font-mono text-[9px] tracking-widest text-green transition-all hover:bg-green/20">
                        ENTREGUE
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delivered prizes */}
      <div className="admin-panel-pad">
        <div className="admin-section-title mb-4">HISTÓRICO — ENTREGUES</div>
        {delivered.length === 0 ? (
          <div className="admin-empty">Nenhum prémio entregue ainda</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>#</th><th>Jogador</th><th>WhatsApp</th><th className="text-center">Score</th><th>Valor</th><th>Entregue em</th></tr></thead>
              <tbody>
                {delivered.map((p) => (
                  <tr key={p.id}>
                    <td className="font-mono text-white/20">Prémio {p.prize_number}</td>
                    <td className="font-sans font-semibold">{p.winner_name}</td>
                    <td className="font-mono text-white/40">{p.winner_whatsapp}</td>
                    <td className="text-center font-mono">{p.winner_score}</td>
                    <td><span className="badge-green">{p.amount.toLocaleString()} Kz</span></td>
                    <td className="font-mono text-white/30">{p.delivered_at ? new Date(p.delivered_at).toLocaleDateString('pt-AO') : '—'}</td>
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
