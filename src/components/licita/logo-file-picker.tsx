'use client'

import { useState, useRef } from 'react'
import { Upload } from 'lucide-react'
import { toast } from 'sonner'

interface LogoFilePickerProps {
  onSelect: (file: File | null) => void
  label?:   string
}

const TIPOS_ACEITOS = ['image/png', 'image/svg+xml', 'image/jpeg']
const MAX_BYTES     = 2 * 1024 * 1024

export function LogoFilePicker({ onSelect, label }: LogoFilePickerProps) {
  const [preview,  setPreview]  = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    if (!TIPOS_ACEITOS.includes(file.type)) {
      toast.error('Formato invalido. Use PNG, SVG ou JPG.')
      return
    }
    if (file.size > MAX_BYTES) {
      toast.error('Arquivo muito grande. Maximo 2 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)
    setFileName(file.name)
    onSelect(file)
  }

  function handleRemove() {
    setPreview(null)
    setFileName(null)
    onSelect(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
          {label}
        </label>
      )}

      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <div className="flex items-center gap-3">
          <img
            src={preview}
            alt="Preview da logo"
            className="w-14 h-14 object-contain rounded-md border"
            style={{ borderColor: 'var(--hairline)' }}
          />
          <div className="space-y-1">
            <p className="text-xs" style={{ color: 'var(--inkSoft)' }}>{fileName}</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="text-xs underline"
                style={{ color: 'var(--primary)' }}
              >
                Trocar
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="text-xs underline"
                style={{ color: 'var(--muted)' }}
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full flex flex-col items-center gap-2 py-5 rounded-lg border-2 border-dashed transition-colors"
          style={{ borderColor: 'var(--hairline)', background: 'var(--surfaceAlt)' }}
        >
          <Upload className="w-5 h-5" style={{ color: 'var(--muted)' }} />
          <span className="text-xs" style={{ color: 'var(--muted)' }}>
            PNG, SVG ou JPG — max 2 MB
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/svg+xml,image/jpeg"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
        }}
      />
    </div>
  )
}
