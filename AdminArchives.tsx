import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import type { Archive } from './supabase'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

type StorageFile = {
  id: string
  name: string
  updated_at: string
  created_at: string
  metadata: null | Record<string, unknown>
}

export default function AdminArchives() {
  const [archives, setArchives] = useState<Archive[]>([])
  const [editing, setEditing] = useState<Partial<Archive> | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [fileManagerArchive, setFileManagerArchive] = useState<Archive | null>(null)
  const [archiveFiles, setArchiveFiles] = useState<StorageFile[]>([])
  const [currentFolder, setCurrentFolder] = useState<string>('')
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const storageBucket = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET as string | undefined

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
    if (!editing.slug || !editing.title) {
      toast.error('Preencha o slug e o título para associar o arquivo corretamente.')
      return
    }
    if (editing.id) {
      await supabase.from('archives').update(editing).eq('id', editing.id)
      toast.success('Arquivo atualizado')
    } else {
      await supabase.from('archives').insert({ ...editing, is_active: false })
      toast.success('Arquivo criado')
    }
    setEditing(null); setShowForm(false); loadArchives()
  }

  async function openFileManager(archive: Archive) {
    setFileManagerArchive(archive)
    setCurrentFolder('')
    setSelectedFiles(null)
    await loadArchiveFiles(archive, '')
  }

  async function loadArchiveFiles(archive: Archive, folder = '') {
    if (!storageBucket) {
      toast.error('Defina VITE_SUPABASE_STORAGE_BUCKET no .env para gerir ficheiros do bucket.')
      return
    }
    if (!archive.slug) {
      toast.error('O arquivo precisa de um slug para gerir ficheiros.')
      return
    }
    const path = folder ? `${archive.slug}/${folder}` : archive.slug
    const { data, error } = await supabase.storage.from(storageBucket).list(path, {
      limit: 200,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' }
    })
    if (error) {
      toast.error('Não foi possível carregar os ficheiros do bucket.')
      setArchiveFiles([])
      return
    }
    setArchiveFiles(data || [])
  }

  async function handleFileUpload() {
    if (!storageBucket) {
      toast.error('Defina VITE_SUPABASE_STORAGE_BUCKET no .env para gerir ficheiros do bucket.')
      return
    }
    if (!fileManagerArchive || !fileManagerArchive.slug) return
    if (!selectedFiles || selectedFiles.length === 0) {
      toast.error('Escolha um ou mais ficheiros para enviar.')
      return
    }

    setUploadingFiles(true)
    try {
      for (const file of Array.from(selectedFiles)) {
        const folderPath = currentFolder ? `${fileManagerArchive.slug}/${currentFolder}` : fileManagerArchive.slug
        const filePath = `${folderPath}/${file.name}`
        const { error } = await supabase.storage.from(storageBucket).upload(filePath, file, { upsert: true })
        if (error) throw error
      }
      toast.success('Ficheiros enviados com sucesso.')
      await loadArchiveFiles(fileManagerArchive, currentFolder)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setSelectedFiles(null)
    } catch (error) {
      toast.error('Erro ao enviar ficheiros. Verifique o bucket e as permissões.')
    } finally {
      setUploadingFiles(false)
    }
  }

  async function handleDeleteFile(fileName: string) {
    if (!storageBucket) {
      toast.error('Defina VITE_SUPABASE_STORAGE_BUCKET no .env para gerir ficheiros do bucket.')
      return
    }
    if (!fileManagerArchive || !fileManagerArchive.slug) return
    const filePath = currentFolder ? `${fileManagerArchive.slug}/${currentFolder}/${fileName}` : `${fileManagerArchive.slug}/${fileName}`
    const { error } = await supabase.storage.from(storageBucket).remove([filePath])
    if (error) {
      toast.error('Erro ao apagar ficheiro.')
      return
    }
    toast.success('Ficheiro apagado')
    await loadArchiveFiles(fileManagerArchive, currentFolder)
  }

  function getFileUrl(fileName: string) {
    if (!storageBucket) return '#'
    if (!fileManagerArchive || !fileManagerArchive.slug) return '#'
    const filePath = currentFolder ? `${fileManagerArchive.slug}/${currentFolder}/${fileName}` : `${fileManagerArchive.slug}/${fileName}`
    return supabase.storage.from(storageBucket).getPublicUrl(filePath).data.publicUrl
  }

  const currentPathLabel = currentFolder ? currentFolder : fileManagerArchive?.slug || ''
  const folderItems = archiveFiles.reduce((acc, file) => {
    if (!fileManagerArchive?.slug) return acc
    const prefix = currentFolder ? `${fileManagerArchive.slug}/${currentFolder}/` : `${fileManagerArchive.slug}/`
    if (!file.name.startsWith(prefix)) return acc
    const remainder = file.name.slice(prefix.length)
    const nextSegment = remainder.split('/')[0]
    if (remainder.includes('/')) {
      if (!acc.folders.includes(nextSegment)) acc.folders.push(nextSegment)
    } else {
      acc.files.push(file)
    }
    return acc
  }, { folders: [] as string[], files: [] as StorageFile[] })

  return (
    <div className="p-6 max-w-5xl">
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
              <label className="font-mono text-[9px] text-white/30 block mb-2">SLUG (nome da pasta no bucket)</label>
              <input className="input-dark" placeholder="arquivo-01" value={editing.slug || ''} onChange={e => setEditing({ ...editing, slug: e.target.value })} />
              <div className="font-mono text-[8px] text-white/30 mt-1">Use o mesmo nome da pasta no bucket para ligar ficheiros.</div>
            </div>
            <div>
              <label className="font-mono text-[9px] text-white/30 block mb-2">TÍTULO</label>
              <input className="input-dark" placeholder="Arquivo 01" value={editing.title || ''} onChange={e => setEditing({ ...editing, title: e.target.value })} />
            </div>
            <div>
              <label className="font-mono text-[9px] text-white/30 block mb-2">SUBTÍTULO</label>
              <input className="input-dark" placeholder="Última Conexão" value={editing.subtitle || ''} onChange={e => setEditing({ ...editing, subtitle: e.target.value })} />
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
                <div className="font-sans text-sm text-white/40 mb-2">{a.description}</div>
                <div className="font-mono text-[10px] text-white/30 mb-3">Pasta no bucket: <span className="text-white">{a.slug || 'não definido'}</span></div>
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
                <button onClick={() => openFileManager(a)}
                  className="font-mono text-[9px] border border-white/10 px-3 py-1.5 text-white/40 hover:text-white hover:border-white/30 transition-all">
                  GERIR FICHEIROS
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {fileManagerArchive && (
        <div className="mt-10 border border-white/10 bg-surface2 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-mono text-[9px] text-red/60 tracking-widest mb-1">GESTÃO DE FICHEIROS</div>
              <div className="font-display text-xl font-bold">{fileManagerArchive.title}</div>
              <div className="font-mono text-[10px] text-white/40">Bucket: <span className="text-white">{storageBucket}</span> · Pasta: <span className="text-white">{fileManagerArchive.slug}</span></div>
            </div>
            <button onClick={() => setFileManagerArchive(null)} className="btn-ghost text-xs">Fechar</button>
          </div>

          <div className="mb-6 grid gap-4 md:grid-cols-[1fr_auto] items-end">
            <div>
              <label className="font-mono text-[9px] text-white/30 block mb-2">Enviar ficheiros para o arquivo</label>
              <input ref={fileInputRef} type="file" multiple className="w-full text-sm text-white" onChange={e => setSelectedFiles(e.target.files)} />
            </div>
            <button onClick={handleFileUpload} disabled={uploadingFiles}
              className="btn-primary w-full md:w-auto">
              {uploadingFiles ? 'A enviar...' : 'Enviar ficheiros'}
            </button>
          </div>

          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="font-mono text-[10px] text-white/40">{folderItems.folders.length + folderItems.files.length} itens encontrados</div>
            <div className="flex flex-wrap gap-2">
              {currentFolder && (
                <button onClick={() => {
                  const nextPath = currentFolder.split('/').slice(0, -1).join('/')
                  setCurrentFolder(nextPath)
                  loadArchiveFiles(fileManagerArchive!, nextPath)
                }} className="btn-ghost text-xs">
                  Voltar
                </button>
              )}
              <button onClick={() => loadArchiveFiles(fileManagerArchive!, currentFolder)} className="btn-ghost text-xs">Atualizar lista</button>
            </div>
          </div>

          {currentFolder && (
            <div className="mb-4 font-mono text-[10px] text-white/40">Caminho: <span className="text-white">{fileManagerArchive?.slug}/{currentFolder}</span></div>
          )}

          {folderItems.folders.length > 0 && (
            <div className="mb-4 grid gap-2 sm:grid-cols-2">
              {folderItems.folders.map((folder) => (
                <button key={folder} onClick={() => {
                  const nextPath = currentFolder ? `${currentFolder}/${folder}` : folder
                  setCurrentFolder(nextPath)
                  loadArchiveFiles(fileManagerArchive!, nextPath)
                }} className="w-full text-left border border-white/10 bg-surface p-4 text-white transition-all hover:border-white/30">
                  <div className="font-sans text-sm font-bold">{folder}</div>
                  <div className="font-mono text-[10px] text-white/40">Pasta</div>
                </button>
              ))}
            </div>
          )}

          {folderItems.files.length === 0 && folderItems.folders.length === 0 ? (
            <div className="font-mono text-sm text-white/30">Nenhum ficheiro encontrado nesta pasta.</div>
          ) : (
            <div className="space-y-3">
              {folderItems.files.map((file) => (
                <div key={file.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border border-white/10 bg-surface">
                  <div>
                    <div className="font-sans text-sm font-bold text-white">{file.name}</div>
                    <div className="font-mono text-[10px] text-white/40">Atualizado: {new Date(file.updated_at).toLocaleString()}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a href={getFileUrl(file.name)} target="_blank" rel="noreferrer" className="btn-ghost text-xs">Abrir</a>
                    <button onClick={() => handleDeleteFile(file.name)} className="btn-ghost text-xs text-red">Apagar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
