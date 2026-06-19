export async function adminApi<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch('/api/admin/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ action, ...payload }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.error || 'Pedido administrativo recusado.')
  }
  return data as T
}

export async function adminStorageApi<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch('/api/admin/storage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ action, ...payload }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.error || 'Operação de storage recusada.')
  }
  return data as T
}
