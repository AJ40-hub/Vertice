import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import type { Payment } from './supabase'
import { motion } from 'framer-motion'

export function AdminPayments() {
  const [payments, setPayments] = useState<Payment[]>([])

  useEffect(() => { loadPayments() }, [])

  useEffect(() => {
    const channel = supabase.channel('payments_admin_live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'payments' }, () => loadPayments())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function loadPayments() {
    const { data } = await supabase.from('payments').select('*').order('created_at', { ascending: false })
    if (data) setPayments(data as Payment[])
  }

  const total = payments.filter(p => p.status === 'confirmed').reduce((s, p) => s + p.amount, 0)

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Pagamentos</h1>
          <div className="font-mono text-[10px] text-white/20 mt-1">{payments.length} transações</div>
        </div>
        <div className="border border-green/20 bg-green/5 px-6 py-3">
          <div className="font-mono text-[9px] text-white/30 mb-1">TOTAL CONFIRMADO</div>
          <div className="font-display text-2xl font-black text-green">{total.toLocaleString()} Kz</div>
        </div>
      </div>

      <div className="border border-border bg-surface2 overflow-hidden">
        <table className="admin-table">
          <thead>
            <tr className="border-b border-border">
              <th className="px-5 pb-3 pt-4">Data</th><th>Pagador</th><th>WhatsApp</th>
              <th>Arquivo</th><th>Jogadores</th><th>Modo</th><th>Referência</th><th className="text-right pr-5">Valor</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr><td colSpan={9} className="text-center font-mono text-[10px] text-white/15 py-12 px-5">Nenhum pagamento ainda</td></tr>
            ) : payments.map((p, i) => (
              <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                <td className="px-5 font-mono text-[10px]">{new Date(p.created_at).toLocaleDateString('pt-AO')}</td>
                <td className="font-sans font-semibold">{p.payer_name}</td>
                <td className="font-mono text-[10px] text-white/50">{p.payer_whatsapp}</td>
                <td className="text-xs text-white/60 max-w-[120px] truncate">{p.archive_title}</td>
                <td className="font-mono text-center">{p.num_players}</td>
                <td className="font-mono text-[10px] text-white/40 capitalize">{p.payment_mode === 'host' ? 'Host' : 'Individual'}</td>
                <td className="font-mono text-[10px] text-white/30">{p.reference || '—'}</td>
                <td className="text-right pr-5 font-mono font-bold">{p.amount.toLocaleString()} Kz</td>
                <td><span className={p.status === 'confirmed' ? 'badge-green' : 'badge-amber'}>{p.status === 'confirmed' ? 'Confirmado' : 'Pendente'}</span></td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AdminPayments
