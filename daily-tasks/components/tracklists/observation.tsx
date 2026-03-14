'use client'

import { useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import Placeholder from '@tiptap/extension-placeholder'
import StarterKit from '@tiptap/starter-kit'
import {
  Bold,
  Code,
  Eraser,
  Italic,
  List,
  ListOrdered,
  SquareCode,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

interface ObservationProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function isHtmlContent(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value)
}

function toEditorContent(value: string) {
  if (!value.trim()) return ''
  if (isHtmlContent(value)) return value

  return value
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll('\n', '<br />')}</p>`)
    .join('')
}

function normalizeEditorOutput(html: string, text: string) {
  if (!text.trim()) return ''
  return html.trim()
}

interface ToolbarButtonProps {
  active?: boolean
  disabled?: boolean
  onClick: () => void
  title: string
  icon: React.ComponentType<{ className?: string }>
}

function ToolbarButton({ active = false, disabled = false, onClick, title, icon: Icon }: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      variant={active ? 'secondary' : 'ghost'}
      size="icon-xs"
      onClick={onClick}
      disabled={disabled}
      className="h-7 w-7"
      title={title}
      aria-label={title}
    >
      <Icon className="h-3.5 w-3.5" />
    </Button>
  )
}

export function Observation({ value, onChange, placeholder = 'Observación', disabled = false }: ObservationProps) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: false,
        horizontalRule: false,
        blockquote: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: toEditorContent(value),
    editorProps: {
      attributes: {
        class: cn(
          'min-h-36 w-full px-3 py-2 text-sm outline-none',
          'prose prose-sm prose-invert max-w-none',
          '[&_p.is-editor-empty:first-child::before]:text-muted-foreground',
          '[&_p.is-editor-empty:first-child::before]:pointer-events-none',
          '[&_p.is-editor-empty:first-child::before]:float-left',
          '[&_p.is-editor-empty:first-child::before]:h-0',
          '[&_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]',
          '[&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-zinc-950 [&_pre]:p-3',
          '[&_code]:rounded [&_code]:bg-zinc-800/80 [&_code]:px-1 [&_code]:py-0.5',
          '[&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5'
        ),
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange(normalizeEditorOutput(currentEditor.getHTML(), currentEditor.getText()))
    },
  })

  useEffect(() => {
    if (!editor) return

    editor.setEditable(!disabled)
  }, [disabled, editor])

  useEffect(() => {
    if (!editor) return

    const normalizedValue = toEditorContent(value)
    const currentValue = normalizeEditorOutput(editor.getHTML(), editor.getText())

    if (normalizedValue === currentValue) return

    editor.commands.setContent(normalizedValue || '', { emitUpdate: false })
  }, [editor, value])

  return (
    <div className="overflow-hidden rounded-md border border-input bg-transparent shadow-xs">
      {!disabled ? (
        <>
          <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/40 px-2 py-1.5">
            <ToolbarButton
              title="Negrita"
              icon={Bold}
              active={editor?.isActive('bold')}
              disabled={!editor}
              onClick={() => editor?.chain().focus().toggleBold().run()}
            />
            <ToolbarButton
              title="Cursiva"
              icon={Italic}
              active={editor?.isActive('italic')}
              disabled={!editor}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
            />
            <Separator orientation="vertical" className="mx-1 h-5" />
            <ToolbarButton
              title="Lista"
              icon={List}
              active={editor?.isActive('bulletList')}
              disabled={!editor}
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
            />
            <ToolbarButton
              title="Lista numerada"
              icon={ListOrdered}
              active={editor?.isActive('orderedList')}
              disabled={!editor}
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            />
            <Separator orientation="vertical" className="mx-1 h-5" />
            <ToolbarButton
              title="Código"
              icon={Code}
              active={editor?.isActive('code')}
              disabled={!editor}
              onClick={() => editor?.chain().focus().toggleCode().run()}
            />
            <ToolbarButton
              title="Bloque de código"
              icon={SquareCode}
              active={editor?.isActive('codeBlock')}
              disabled={!editor}
              onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
            />
            <Separator orientation="vertical" className="mx-1 h-5" />
            <ToolbarButton
              title="Limpiar formato"
              icon={Eraser}
              active={false}
              disabled={!editor}
              onClick={() => editor?.chain().focus().clearNodes().unsetAllMarks().run()}
            />
          </div>
          <EditorContent editor={editor} />
        </>
      ) : (
        <div className="min-h-36 px-3 py-2">
          <EditorContent editor={editor} />
        </div>
      )}
    </div>
  )
}
