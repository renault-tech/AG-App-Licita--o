/* eslint-disable @next/next/no-img-element */
'use client'

import { useState, useRef } from 'react'
import { Loader2, Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface LogoUploadFieldProps {
  currentUrl: string | null
  orgId:      string
  onUpload:   (url: string) => void
  label?:     string
}

const TIPOS_ACEITOS = ['image/png', 'image/svg+xml', 'image/jpeg']
const MAX_BYTES     = 2 * 1024 * 1024

export function LogoUploadField({ currentUrl, orgId, onUpload, label }: LogoUploadFieldProps) {
  const [uploading,  setUploading]  = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!TIPOS_ACEITOS.includes(file.type)) { toast.error('Use PNG, SVG ou JPG.'); return }
    if (file.size > MAX_BYTES)              { toast.error('Maximo 2 MB.'); return }

    setUploading(true)
    const supabase = createClient()
    const ext  = file.name.split('.').pop() ?? 'png'
    const path = `organizacoes/${orgId}/logo.${ext}`

    const { error } = await supabase.storage
      .from('org-logos')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (error) { toast.error('Erro ao enviar logo.'); setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('org-logos').getPublicUrl(path)
    setPreviewUrl(publicUrl)
    onUpload(publicUrl)
    setUploading(false)
    toast.success('Logo atualizada.')
  }

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{label}</label>}

      {previewUrl ? (
        <div className="flex items-center gap-3">
          <img
            src={previewUrl}
            alt="Logo atual"
            className="w-16 h-16 object-contain rounded-md border"
            style={{ borderColor: 'var(--hairline)' }}
          />
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-colors"
              style={{ borderColor: 'var(--hairline)', color: 'var(--inkSoft)' }}
            >
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
              {uploading ? 'Enviando...' : 'Trocar logo'}
            </button>
            <button
              type="button"
              onClick={() => { setPreviewUrl(null); onUpload('') }}
              className="text-xs block"
              style={{ color: 'var(--muted)' }}
            >
              Remover
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full flex flex-col items-center gap-2 py-6 rounded-lg border-2 border-dashed transition-colors"
          style={{ borderColor: 'var(--hairline)', background: 'var(--surfaceAlt)' }}
        >
          {uploading
            ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--muted)' }} />
            : <Upload className="w-5 h-5" style={{ color: 'var(--muted)' }} />
          }
          <span className="text-xs" style={{ color: 'var(--muted)' }}>
            {uploading ? 'Enviando...' : 'Clique para enviar PNG, SVG ou JPG (max 2 MB)'}
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/svg+xml,image/jpeg"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
    </div>
  )
}
