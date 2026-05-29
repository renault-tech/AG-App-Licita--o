'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import UnderlineExt from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect } from 'react'
import {
  Bold, Italic, Underline, AlignLeft, AlignCenter,
  AlignRight, AlignJustify, List, ListOrdered,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  readOnly?: boolean
  className?: string
  minHeight?: number
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick() }}
      disabled={disabled}
      title={title}
      className={cn(
        'p-1 rounded transition-colors',
        active
          ? 'bg-violet-100 text-violet-700'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700',
        disabled && 'opacity-40 cursor-not-allowed pointer-events-none'
      )}
    >
      {children}
    </button>
  )
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  disabled,
  readOnly,
  className,
  minHeight = 96,
}: RichTextEditorProps) {
  const isReadonly = disabled || readOnly

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, code: false, codeBlock: false }),
      UnderlineExt,
      TextAlign.configure({ types: ['paragraph'] }),
      Placeholder.configure({ placeholder: placeholder ?? '' }),
    ],
    content: value || '',
    editable: !isReadonly,
    onUpdate({ editor }) {
      onChange(editor.getHTML())
    },
  })

  // Sync external value changes (e.g. IA setting content)
  useEffect(() => {
    if (!editor) return
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value || '')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  // Sync editable state
  useEffect(() => {
    if (!editor) return
    editor.setEditable(!isReadonly)
  }, [editor, isReadonly])

  if (!editor) return null

  return (
    <div
      className={cn(
        'rounded-md border border-input bg-background text-sm transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0',
        isReadonly && 'bg-gray-50 cursor-default',
        className,
      )}
    >
      {!isReadonly && (
        <div className="flex items-center gap-0.5 px-2 py-1 border-b border-input bg-slate-50/60 rounded-t-md flex-wrap">
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Negrito (Ctrl+B)">
            <Bold className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Itálico (Ctrl+I)">
            <Italic className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Sublinhado (Ctrl+U)">
            <Underline className="w-3.5 h-3.5" />
          </ToolbarButton>

          <span className="w-px h-4 bg-slate-200 mx-1" />

          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Alinhar à esquerda">
            <AlignLeft className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Centralizar">
            <AlignCenter className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Alinhar à direita">
            <AlignRight className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} title="Justificar">
            <AlignJustify className="w-3.5 h-3.5" />
          </ToolbarButton>

          <span className="w-px h-4 bg-slate-200 mx-1" />

          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Lista com marcadores">
            <List className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Lista numerada">
            <ListOrdered className="w-3.5 h-3.5" />
          </ToolbarButton>
        </div>
      )}
      <EditorContent
        editor={editor}
        className={cn(
          'px-3 py-2 focus-visible:outline-none prose prose-sm max-w-none',
          '[&_.tiptap]:outline-none [&_.tiptap]:min-h-[var(--min-h)]',
          '[&_.tiptap_p]:my-1 [&_.tiptap_ul]:my-1 [&_.tiptap_ol]:my-1',
          '[&_.tiptap_.is-editor-empty:before]:content-[attr(data-placeholder)]',
          '[&_.tiptap_.is-editor-empty:before]:text-slate-400 [&_.tiptap_.is-editor-empty:before]:float-left',
          '[&_.tiptap_.is-editor-empty:before]:pointer-events-none [&_.tiptap_.is-editor-empty:before]:h-0',
        )}
        style={{ '--min-h': `${minHeight}px` } as React.CSSProperties}
      />
    </div>
  )
}
