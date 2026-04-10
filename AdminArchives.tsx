import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import type { Archive } from '../../lib/supabase'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

export default function AdminArchives() {
  const [archives, setArchives] = useState<Archive[]>([])
  const [editing, setEditing] = useState<Partial<Archive> | null>(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => { loadArchives() }, [])

  async function loadArchives() {
    const { data } = await supabase.from('archives').select('*').order('created_at')
    if (data) setArchives(data as Archive[])
  }

  async function toggleActive(archive: Archive) {
    await supabase.from('archives').update({ is_active: !archive.is_active }).eq('id', archive.id)
    toast.success(`Arquivo ${archive.is_active ? 'desativado' : 'ativado'}`)
    loadArchives()
  }

  async function saveArchive() {
    if (!editing) return
    if (editing.id) {
      await supabase.from('archives').update(editing).eq('id', editing.id)
      toast.success('Arquivo atualizado')
    } else {
      await supabase.from('archives').insert({ ...editing, is_active: false })
      toast.success('Arquivo criado')
    }
    setEditing(null); setShowForm(false); loadArchives()
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Arquivos</h1>
          <div className="font-mono text-[10px] text-white/20 mt-1">Gestão de jogos disponíveis</div>
        </div>
        <button onClick={() => { setEditing({}); setShowForm(true) }} className="btn-primary text-xs">
          + Novo Arquivo
        </button>
      </div>

      {/* Form */}
      {showForm && editing && (
        <div className="border border-red/20 bg-red/5 p-6 mb-6">
          <div className="font-mono text-[10px] text-red/60 tracking-widest mb-4">{editing.id ? 'EDITAR ARQUIVO' : 'NOVO ARQUIVO'}</div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="font-mono text-[9px] text-white/30 block mb-2">TÍTULO</label>
              <input className="input-dark" placeholder="Arquivo 02" value={editing.title || ''} onChange={e => setEditing({ ...editing, title: e.target.value })} />
            </div>
            <div>
              <label className="font-mono text-[9px] text-white/30 block mb-2">SUBTÍTULO</label>
              <input className="input-dark" placeholder="Nome do caso" value={editing.subtitle || ''} onChange={e => setEditing({ ...editing, subtitle: e.target.value })} />
            </div>
            <div>
              <label className="font-mono text-[9px] text-white/30 block mb-2">PREÇO POR JOGADOR (Kz)</label>
              <input className="input-dark" type="number" placeholder="500" value={editing.price_per_player || 500} onChange={e => setEditing({ ...editing, price_per_player: parseInt(e.target.value) })} />
            </div>
            <div>
              <label className="font-mono text-[9px] text-white/30 block mb-2">DURAÇÃO (min)</label>
              <input className="input-dark" type="number" placeholder="90" value={editing.duration_minutes || 90} onChange={e => setEditing({ ...editing, duration_minutes: parseInt(e.target.value) })} />
            </div>
            <div>
              <label className="font-mono text-[9px] text-white/30 block mb-2">MÍN. JOGADORES</label>
              <input className="input-dark" type="number" placeholder="5" value={editing.min_players || 5} onChange={e => setEditing({ ...editing, min_players: parseInt(e.target.value) })} />
            </div>
            <div>
              <label className="font-mono text-[9px] text-white/30 block mb-2">MÁX. JOGADORES</label>
              <input className="input-dark" type="number" placeholder="8" value={editing.max_players || 8} onChange={e => setEditing({ ...editing, max_players: parseInt(e.target.value) })} />
            </div>
            <div className="col-span-2">
              <label className="font-mono text-[9px] text-white/30 block mb-2">DESCRIÇÃO</label>
              <textarea className="input-dark min-h-[80px]" placeholder="Descrição do caso..." value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="font-mono text-[9px] text-white/30 block mb-2">MODO DE PAGAMENTO</label>
              <div className="flex gap-3">
                {(['host', 'individual'] as const).map(m => (
                  <button key={m} onClick={() => setEditing({ ...editing, payment_mode: m })}
                    className={`px-4 py-2 border text-sm font-mono transition-all ${editing.payment_mode === m ? 'border-red bg-red/10' : 'border-white/10 text-white/40'}`}>
                    {m === 'host' ? 'Host paga tudo' : 'Individual'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setEditing(null); setShowForm(false) }} className="btn-ghost flex-1">Cancelar</button>
            <button onClick={saveArchive} className="btn-primary flex-1">Guardar</button>
          </div>
        </div>
      )}

      {/* Archives list */}
      <div className="space-y-3">
        {archives.map((a, i) => (
          <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={`border p-5 ${a.is_active ? 'border-white/10 bg-surface2' : 'border-white/5 bg-surface opacity-60'}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <div className="font-mono text-[9px] text-red/60 tracking-widest">{a.title}</div>
                  <span className={a.is_active ? 'badge-green' : 'badge-red'}>{a.is_active ? 'Ativo' : 'Inativo'}</span>
                </div>
                <div className="font-display text-xl font-bold mb-2">{a.subtitle}</div>
                <div className="font-sans text-sm text-white/40 mb-3">{a.description}</div>
                <div className="flex gap-4 font-mono text-[10px] text-white/30">
                  <span>{a.min_players}–{a.max_players} jogadores</span>
                  <span>{a.duration_minutes} min</span>
                  <span>{a.price_per_player} Kz/jogador</span>
                  <span>{a.payment_mode === 'host' ? 'Host paga' : 'Individual'}</span>
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <button onClick={() => { setEditing(a); setShowForm(true) }}
                  className="font-mono text-[9px] border border-white/10 px-3 py-1.5 text-white/40 hover:text-white hover:border-white/30 transition-all">
                  EDITAR
                </button>
                <button onClick={() => toggleActive(a)}
                  className={`font-mono text-[9px] border px-3 py-1.5 transition-all ${a.is_active ? 'border-red/20 text-red/60 hover:bg-red/10' : 'border-green/20 text-green/60 hover:bg-green/10'}`}>
                  {a.is_active ? 'DESATIVAR' : 'ATIVAR'}
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
