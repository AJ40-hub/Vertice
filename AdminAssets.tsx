import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { adminApi, adminStorageApi } from './adminApi'

interface Archive { id: string; title: string; subtitle: string }
interface Asset {
  id: string; archive_id: string; name: string; description: string
  file_type: string; file_name: string; file_url: string; file_size: number
  target_player: string; trigger_minute: number | null; trigger_second: number
  expires_seconds: number | null; is_postgame: boolean; created_at: string
}

const FILE_TYPES = [
  { key: 'pdf',   label: 'PDF',   icon: '📄', accept: '.pdf' },
  { key: 'photo', label: 'Foto',  icon: '📸', accept: 'image/*' },
  { key: 'audio', label: 'Áudio', icon: '🎧', accept: 'audio/*' },
  { key: 'video', label: 'Vídeo', icon: '🎬', accept: 'video/*' },
  { key: 'meme',  label: 'Meme',  icon: '😂', accept: 'image/*' },
]

const PLAYERS = [
  { key: 'all',      label: 'Todos os jogadores' },
  { key: 'A',        label: 'A — Detetive Amador' },
  { key: 'B',        label: 'B — Amigo Próximo' },
  { key: 'C',        label: 'C — Jornalista' },
  { key: 'D',        label: 'D — Especialista / Hacker' },
  { key: 'E',        label: 'E — Inimigo Oculto' },
  { key: 'F',        label: 'F — Testemunha' },
  { key: 'postgame', label: 'Pós-jogo (A, B, C, F)' },
]

const STORAGE_BUCKET = 'vertice-assets'

function storagePathFromAsset(asset: Asset) {
  const raw = asset.file_url || asset.file_name || ''
  const marker = `/${STORAGE_BUCKET}/`
  if (raw.includes(marker)) return decodeURIComponent(raw.split(marker)[1].split('?')[0])
  return raw.startsWith('http') ? '' : raw
}

export default function AdminAssets() {
  const [archives, setArchives] = useState<Archive[]>([])
  const [selectedArchive, setSelectedArchive] = useState<string>('')
  const [assets, setAssets] = useState<Asset[]>([])
  const [filterType, setFilterType] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    name: '', description: '', file_type: 'pdf',
    target_player: 'all', trigger_minute: '', trigger_second: '0',
    expires_seconds: '', is_postgame: false,
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  useEffect(() => {
    adminApi<{ archives: Archive[] }>('asset-bootstrap')
      .then((data) => {
        setArchives(data.archives)
        if (data.archives.length > 0) setSelectedArchive(data.archives[0].id)
      })
      .catch(() => setArchives([]))
  }, [])

  useEffect(() => {
    if (selectedArchive) loadAssets()
  }, [selectedArchive])

  async function loadAssets() {
    const data = await adminApi<{ assets: Asset[] }>('assets', { archive_id: selectedArchive })
    setAssets(data.assets)
  }

  function formatSize(bytes: number) {
    if (!bytes) return '—'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  async function handleUpload() {
    if (!selectedFile || !form.name || !selectedArchive) {
      toast.error('Preenche o nome e selecciona um ficheiro.')
      return
    }
    setUploading(true)
    setUploadProgress(20)

    const ext = selectedFile.name.split('.').pop()
    const fileName = `${selectedArchive}/${form.file_type}/${Date.now()}_${form.name.replace(/\s+/g, '_')}.${ext}`

    const signed = await adminStorageApi<{ path: string; token: string }>('signed-upload', { bucket: STORAGE_BUCKET, path: fileName })
    const { error: upErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .uploadToSignedUrl(signed.path || fileName, signed.token, selectedFile)

    if (upErr) {
      toast.error('Erro no upload: ' + upErr.message)
      setUploading(false)
      setUploadProgress(0)
      return
    }

    setUploadProgress(70)

    try {
      await adminApi('create-asset', {
        asset: {
          archive_id: selectedArchive,
          name: form.name,
          description: form.description || null,
          file_type: form.file_type,
          file_name: selectedFile.name,
          file_url: fileName,
          file_size: selectedFile.size,
          target_player: form.target_player,
          trigger_minute: form.trigger_minute ? parseInt(form.trigger_minute) : null,
          trigger_second: parseInt(form.trigger_second) || 0,
          expires_seconds: form.expires_seconds ? parseInt(form.expires_seconds) : null,
          is_postgame: form.is_postgame,
        }
      })
      setUploadProgress(100)
      toast.success('Asset adicionado com sucesso!')
      setShowForm(false)
      setSelectedFile(null)
      setForm({ name: '', description: '', file_type: 'pdf', target_player: 'all', trigger_minute: '', trigger_second: '0', expires_seconds: '', is_postgame: false })
      loadAssets()
    } catch (error) {
      toast.error('Erro ao guardar: ' + (error instanceof Error ? error.message : 'pedido recusado'))
    }

    setUploading(false)
    setTimeout(() => setUploadProgress(0), 1000)
  }

  async function deleteAsset(asset: Asset) {
    const path = storagePathFromAsset(asset)
    if (path) {
      await adminStorageApi('remove', { bucket: STORAGE_BUCKET, path })
    }
    await adminApi('delete-asset', { asset_id: asset.id })
    toast.success('Asset eliminado.')
    setDeleteId(null)
    loadAssets()
  }

  async function openAsset(asset: Asset) {
    const path = storagePathFromAsset(asset)
    if (!path) {
      toast.error('Não foi possível localizar o ficheiro no storage.')
      return
    }
    try {
      const data = await adminStorageApi<{ signedUrl: string }>('signed-url', {
        bucket: STORAGE_BUCKET,
        path,
        expires_in: 300,
      })
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } catch {
      toast.error('Não foi possível abrir o ficheiro.')
    }
  }

  const filtered = filterType === 'all' ? assets : assets.filter(a => a.file_type === filterType)
  const archive = archives.find(a => a.id === selectedArchive)

  const typeIcon: Record<string, string> = { pdf: '📄', photo: '📸', audio: '🎧', video: '🎬', meme: '😂' }
  const typeColor: Record<string, string> = { pdf: 'badge-red', photo: 'badge-blue', audio: 'badge-amber', video: 'badge-green', meme: 'badge-amber' }

  return (
    <div className="p-6 max-w-6xl">

      {/* Modal eliminação */}
      <AnimatePresence>
        {deleteId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-surface2 border border-border p-8 max-w-sm w-full mx-4">
              <div className="font-mono text-[9px] text-red/60 tracking-widest mb-3">CONFIRMAR ELIMINAÇÃO</div>
              <h3 className="font-display text-xl font-bold mb-2">Eliminar asset?</h3>
              <p className="font-mono text-xs text-white/40 leading-relaxed mb-6">
                Remove o ficheiro do storage e da base de dados. Não pode ser desfeito.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)}
                  className="flex-1 py-3 border border-white/10 font-mono text-xs text-white/40 hover:text-white transition-all">
                  Cancelar
                </button>
                <button onClick={() => { const a = assets.find(x => x.id === deleteId); if (a) deleteAsset(a) }}
                  className="flex-1 py-3 bg-red font-mono text-xs text-white font-bold tracking-widest hover:opacity-90 transition-all">
                  ELIMINAR
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Assets</h1>
          <div className="font-mono text-[10px] text-white/20 mt-1">
            PDFs · Fotos · Áudios · Vídeos · Memes — associados a eventos do jogo
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-xs tracking-widest">
          {showForm ? '✕ Cancelar' : '+ Novo Asset'}
        </button>
      </div>

      {/* Selector de arquivo */}
      <div className="flex gap-2 flex-wrap mb-6">
        {archives.map(a => (
          <button key={a.id} onClick={() => setSelectedArchive(a.id)}
            className={`font-mono text-[10px] tracking-widest px-4 py-2 border transition-all ${selectedArchive === a.id ? 'border-red bg-red/10 text-white' : 'border-white/10 text-white/30 hover:border-white/30'}`}>
            {a.title}: {a.subtitle}
          </button>
        ))}
      </div>

      {/* Formulário */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="border border-red/20 bg-red/5 p-6 mb-6">
            <div className="font-mono text-[9px] text-red/60 tracking-widest mb-5">
              NOVO ASSET — {archive?.title}: {archive?.subtitle}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <div>
                <label className="font-mono text-[9px] text-white/20 tracking-widest block mb-2">NOME DO ASSET</label>
                <input className="input-dark" placeholder="Ex: Conversa Truncada de Kairo"
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>

              <div>
                <label className="font-mono text-[9px] text-white/20 tracking-widest block mb-2">TIPO DE FICHEIRO</label>
                <div className="flex gap-2 flex-wrap">
                  {FILE_TYPES.map(t => (
                    <button key={t.key} onClick={() => setForm({ ...form, file_type: t.key })}
                      className={`px-3 py-2 border text-xs font-mono transition-all ${form.file_type === t.key ? 'border-red bg-red/10 text-white' : 'border-white/10 text-white/30 hover:border-white/20'}`}>
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-mono text-[9px] text-white/20 tracking-widest block mb-2">DESTINATÁRIO</label>
                <select className="input-dark" value={form.target_player}
                  onChange={e => setForm({ ...form, target_player: e.target.value })}>
                  {PLAYERS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                </select>
              </div>

              <div>
                <label className="font-mono text-[9px] text-white/20 tracking-widest block mb-2">MINUTO : SEGUNDO DE ENVIO</label>
                <div className="flex gap-2">
                  <input className="input-dark flex-1" type="number" min="0" max="120" placeholder="Minuto (ex: 5)"
                    value={form.trigger_minute} onChange={e => setForm({ ...form, trigger_minute: e.target.value })} />
                  <input className="input-dark w-24" type="number" min="0" max="59" placeholder="Seg"
                    value={form.trigger_second} onChange={e => setForm({ ...form, trigger_second: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="font-mono text-[9px] text-white/20 tracking-widest block mb-2">EXPIRA APÓS (segundos)</label>
                <input className="input-dark" type="number" placeholder="210 = 3min30s — vazio = não expira"
                  value={form.expires_seconds} onChange={e => setForm({ ...form, expires_seconds: e.target.value })} />
              </div>

              <div>
                <label className="font-mono text-[9px] text-white/20 tracking-widest block mb-2">DESCRIÇÃO INTERNA</label>
                <input className="input-dark" placeholder="Nota sobre este asset (uso interno)"
                  value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>

            {/* Toggle pós-jogo */}
            <div className="flex items-center gap-3 mb-5">
              <button onClick={() => setForm({ ...form, is_postgame: !form.is_postgame })}
                className={`w-10 h-5 rounded-full transition-all relative flex-shrink-0 ${form.is_postgame ? 'bg-red' : 'bg-white/10'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${form.is_postgame ? 'left-5' : 'left-0.5'}`} />
              </button>
              <span className="font-mono text-xs text-white/40">Asset de pós-jogo exclusivo</span>
            </div>

            {/* Área de upload */}
            <div className="mb-5">
              <label className="font-mono text-[9px] text-white/20 tracking-widest block mb-2">FICHEIRO</label>
              <div onClick={() => fileRef.current?.click()}
                className="border border-dashed border-white/20 hover:border-red/40 p-8 text-center cursor-pointer transition-all">
                {selectedFile ? (
                  <div>
                    <div className="text-3xl mb-2">{FILE_TYPES.find(t => t.key === form.file_type)?.icon}</div>
                    <div className="font-sans text-sm font-600 text-white">{selectedFile.name}</div>
                    <div className="font-mono text-xs text-white/30 mt-1">{formatSize(selectedFile.size)}</div>
                    <div className="font-mono text-[9px] text-red/40 mt-2">Clica para trocar</div>
                  </div>
                ) : (
                  <div>
                    <div className="text-4xl mb-3 opacity-30">↑</div>
                    <div className="font-mono text-xs text-white/30">Clica para seleccionar ficheiro</div>
                    <div className="font-mono text-[9px] text-white/15 mt-1">PDF · JPG · PNG · MP3 · MP4</div>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file"
                accept={FILE_TYPES.find(t => t.key === form.file_type)?.accept}
                className="hidden"
                onChange={e => { if (e.target.files?.[0]) setSelectedFile(e.target.files[0]) }} />
            </div>

            {/* Progress */}
            {uploading && (
              <div className="mb-4">
                <div className="h-0.5 bg-white/10 overflow-hidden mb-1">
                  <motion.div className="h-full bg-red" animate={{ width: `${uploadProgress}%` }} transition={{ duration: 0.3 }} />
                </div>
                <div className="font-mono text-[9px] text-white/30">{uploadProgress}% — A fazer upload...</div>
              </div>
            )}

            <button onClick={handleUpload} disabled={uploading || !selectedFile || !form.name}
              className="btn-primary disabled:opacity-30">
              {uploading ? 'A guardar...' : 'Guardar Asset →'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap mb-4">
        {[{ key: 'all', label: `Todos (${assets.length})`, icon: '◈' }, ...FILE_TYPES.map(t => ({
          key: t.key, label: `${t.icon} ${t.label} (${assets.filter(a => a.file_type === t.key).length})`, icon: t.icon
        }))].map(f => (
          <button key={f.key} onClick={() => setFilterType(f.key)}
            className={`font-mono text-[9px] tracking-widest px-3 py-1.5 border transition-all ${filterType === f.key ? 'border-red bg-red/10 text-white' : 'border-white/10 text-white/20 hover:border-white/30'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Tabela */}
      <div className="border border-border bg-surface2 overflow-hidden mb-8">
        <table className="admin-table">
          <thead>
            <tr className="border-b border-border">
              <th className="px-5 pb-3 pt-4">Asset</th>
              <th>Tipo</th>
              <th>Destinatário</th>
              <th>Envio</th>
              <th>Expira</th>
              <th>Tamanho</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center font-mono text-[10px] text-white/15 py-12 px-5">
                  Nenhum asset — clica em "+ Novo Asset" para começar
                </td>
              </tr>
            ) : filtered.map((a, i) => (
              <motion.tr key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                <td className="px-5">
                  <div className="font-sans font-600 text-sm">{a.name}</div>
                  {a.description && <div className="font-mono text-[9px] text-white/30 mt-0.5">{a.description}</div>}
                  <div className="font-mono text-[9px] text-white/15 mt-0.5 truncate max-w-[180px]">{a.file_name}</div>
                </td>
                <td>
                  <span className={typeColor[a.file_type] || 'badge-blue'}>
                    {typeIcon[a.file_type]} {a.file_type.toUpperCase()}
                  </span>
                </td>
                <td className="font-mono text-[10px] text-white/50">
                  {PLAYERS.find(p => p.key === a.target_player)?.label || a.target_player}
                  {a.is_postgame && <div className="text-amber/50 mt-0.5">pós-jogo</div>}
                </td>
                <td className="font-mono text-xs">
                  {a.trigger_minute !== null
                    ? <span className="text-red">{String(a.trigger_minute).padStart(2, '0')}:{String(a.trigger_second || 0).padStart(2, '0')}</span>
                    : <span className="text-white/20">—</span>}
                </td>
                <td className="font-mono text-xs text-white/40">
                  {a.expires_seconds
                    ? `${Math.floor(a.expires_seconds / 60)}m${a.expires_seconds % 60 > 0 ? a.expires_seconds % 60 + 's' : ''}`
                    : <span className="text-white/20">—</span>}
                </td>
                <td className="font-mono text-xs text-white/40">{formatSize(a.file_size)}</td>
                <td>
                  <div className="flex gap-2">
                    <button onClick={() => openAsset(a)}
                      className="font-mono text-[9px] text-blue/60 hover:text-blue border border-blue/20 px-2 py-1 transition-all">
                      VER
                    </button>
                    <button onClick={() => setDeleteId(a.id)}
                      className="font-mono text-[9px] text-red/60 hover:text-red border border-red/20 px-2 py-1 transition-all">
                      ✕
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Linha do tempo */}
      {assets.filter(a => a.trigger_minute !== null).length > 0 && (
        <div>
          <div className="font-mono text-[9px] text-white/20 tracking-widest mb-4">LINHA DO TEMPO — ENVIO AUTOMÁTICO</div>
          <div className="relative pl-6">
            <div className="absolute left-0 top-0 bottom-0 w-px bg-white/10" />
            {assets
              .filter(a => a.trigger_minute !== null)
              .sort((a, b) => (a.trigger_minute || 0) * 60 + (a.trigger_second || 0) - ((b.trigger_minute || 0) * 60 + (b.trigger_second || 0)))
              .map((a) => (
                <div key={a.id} className="relative pb-3">
                  <div className="absolute -left-6 top-2 w-2 h-2 rounded-full bg-red" />
                  <div className="border border-white/5 bg-surface p-3 hover:border-red/20 transition-all">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono text-xs text-red font-bold flex-shrink-0">
                        {String(a.trigger_minute).padStart(2, '0')}:{String(a.trigger_second || 0).padStart(2, '0')}
                      </span>
                      <span className="text-sm">{typeIcon[a.file_type]}</span>
                      <span className="font-sans text-xs font-600 text-white flex-1">{a.name}</span>
                      <span className="font-mono text-[9px] text-white/30">
                        {PLAYERS.find(p => p.key === a.target_player)?.label}
                      </span>
                      {a.expires_seconds && (
                        <span className="font-mono text-[9px] text-amber/60 border border-amber/20 px-1.5 py-0.5">
                          expira {Math.floor(a.expires_seconds / 60)}m{a.expires_seconds % 60 > 0 ? a.expires_seconds % 60 + 's' : ''}
                        </span>
                      )}
                      {a.is_postgame && (
                        <span className="font-mono text-[9px] text-amber/60 border border-amber/20 px-1.5 py-0.5">pós-jogo</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
