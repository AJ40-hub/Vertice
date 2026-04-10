// AdminPrizes.tsx
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from './supabase'
import type { Prize } from './supabase'
import toast from 'react-hot-toast'

export default function AdminPrizes() {
  const [prizes, setPrizes] = useState<Prize[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadPrizes() }, [])

  useEffect(() => {
    const channel = supabase.channel('prizes_admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prizes' }, () => loadPrizes())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function loadPrizes() {
    const { data } = await supabase.from('prizes').select('*').order('created_at', { ascending: false })
    if (data) setPrizes(data as Prize[])
    setLoading(false)
  }

  async function deliverPrize(prize: Prize) {
    const { error } = await supabase.from('prizes').update({ status: 'delivered', delivered_at: new Date().toISOString() }).eq('id', prize.id)
    if (!error) {
      toast.success(`Prémio marcado como entregue a ${prize.winner_name}`)
      loadPrizes()
    }
  }

  const pending = prizes.filter(p => p.status === 'pending')
  const delivered = prizes.filter(p => p.status === 'delivered')

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Prémios</h1>
        <div className="font-mono text-[10px] text-white/20 tracking-widest mt-1">Gestão de prémios por sala</div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-8">
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
        <div className="border border-border bg-surface2 p-5 mb-6">
          <div className="font-mono text-[10px] text-amber/60 tracking-widest mb-4">⚡ PRÉMIOS PENDENTES</div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Jogador</th><th>Género</th><th>WhatsApp</th><th>Score</th><th>Valor</th><th>Sala</th><th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((p) => (
                <tr key={p.id}>
                  <td><span className="font-sans font-700 text-white">{p.winner_name}</span></td>
                  <td className="capitalize text-white/50">{p.winner_gender}</td>
                  <td>
                    <a href={`https://wa.me/${p.winner_whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                      className="font-mono text-blue hover:text-blue/70 transition-colors">{p.winner_whatsapp}</a>
                  </td>
                  <td className="font-mono font-bold">{p.winner_score}</td>
                  <td><span className="badge-amber">{p.amount.toLocaleString()} Kz</span></td>
                  <td className="font-mono text-white/30 text-xs">{new Date(p.created_at).toLocaleDateString('pt-AO')}</td>
                  <td>
                    <button onClick={() => deliverPrize(p)}
                      className="px-3 py-1.5 bg-green/10 border border-green/30 text-green font-mono text-[9px] tracking-widest hover:bg-green/20 transition-all">
                      ENTREGUE
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delivered prizes */}
      <div className="border border-border bg-surface2 p-5">
        <div className="font-mono text-[10px] text-white/30 tracking-widest mb-4">HISTÓRICO — ENTREGUES</div>
        {delivered.length === 0 ? (
          <div className="font-mono text-xs text-white/15 py-4 text-center">Nenhum prémio entregue ainda</div>
        ) : (
          <table className="admin-table">
            <thead><tr><th>#</th><th>Jogador</th><th>WhatsApp</th><th>Score</th><th>Valor</th><th>Entregue em</th></tr></thead>
            <tbody>
              {delivered.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono text-white/20">Prémio {p.prize_number}</td>
                  <td className="font-sans font-600">{p.winner_name}</td>
                  <td className="font-mono text-white/40">{p.winner_whatsapp}</td>
                  <td className="font-mono">{p.winner_score}</td>
                  <td><span className="badge-green">{p.amount.toLocaleString()} Kz</span></td>
                  <td className="font-mono text-white/30">{p.delivered_at ? new Date(p.delivered_at).toLocaleDateString('pt-AO') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
