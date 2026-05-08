'use client'

import { useEffect, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import Image from '@tiptap/extension-image'
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
import { uploadTicketImage } from '@/app/actions/tracklists'
import { cn } from '@/lib/utils'

interface ObservationProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  tracklistId?: number
  ticketId?: number
  draftId?: string
  enableImagePaste?: boolean
  onImageUploadStateChange?: (isUploading: boolean) => void
}

const DEFAULT_MAX_BYTES = 2_097_152
const DEFAULT_MAX_DIMENSION = 1600
const DEFAULT_QUALITY = 0.82

function getImageConfig() {
  const maxBytes = Number(process.env.NEXT_PUBLIC_TICKET_IMAGE_MAX_BYTES)
  const maxDimension = Number(process.env.NEXT_PUBLIC_TICKET_IMAGE_MAX_DIMENSION)
  const quality = Number(process.env.NEXT_PUBLIC_TICKET_IMAGE_QUALITY)

  return {
    maxBytes: Number.isFinite(maxBytes) && maxBytes > 0 ? maxBytes : DEFAULT_MAX_BYTES,
    maxDimension: Number.isFinite(maxDimension) && maxDimension > 0 ? maxDimension : DEFAULT_MAX_DIMENSION,
    quality: Number.isFinite(quality) && quality > 0 && quality <= 1 ? quality : DEFAULT_QUALITY,
  }
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
  const trimmedHtml = html.trim()
  if (text.trim() || /<img\b/i.test(trimmedHtml)) return trimmedHtml
  return ''
}

async function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, type, quality)
  })
}

async function compressImage(file: File) {
  const { maxBytes, maxDimension, quality } = getImageConfig()
  const imageUrl = URL.createObjectURL(file)

  try {
    const image = new window.Image()
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('No se pudo leer la imagen'))
      image.src = imageUrl
    })

    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height))
    const width = Math.max(1, Math.round(image.width * scale))
    const height = Math.max(1, Math.round(image.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('No se pudo preparar la imagen')

    context.drawImage(image, 0, 0, width, height)

    const webpProbe = await canvasToBlob(canvas, 'image/webp', quality)
    const outputType = webpProbe?.type === 'image/webp' ? 'image/webp' : 'image/jpeg'

    for (let currentQuality = quality; currentQuality >= 0.5; currentQuality -= 0.08) {
      const blob = await canvasToBlob(canvas, outputType, currentQuality)
      if (blob && blob.size <= maxBytes) {
        return new File([blob], `paste.${outputType === 'image/webp' ? 'webp' : 'jpg'}`, { type: outputType })
      }
    }

    throw new Error(`La imagen supera el tamaño máximo de ${Math.round(maxBytes / 1024 / 1024)} MB.`)
  } finally {
    URL.revokeObjectURL(imageUrl)
  }
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

export function Observation({
  value,
  onChange,
  placeholder = 'Observación',
  disabled = false,
  tracklistId,
  ticketId,
  draftId,
  enableImagePaste = false,
  onImageUploadStateChange,
}: ObservationProps) {
  const [uploadCount, setUploadCount] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)

  useEffect(() => {
    onImageUploadStateChange?.(uploadCount > 0)
  }, [onImageUploadStateChange, uploadCount])

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
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: 'my-2 max-h-80 rounded-md border border-border object-contain',
        },
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
          '[&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5',
          '[&_img]:my-2 [&_img]:max-h-80 [&_img]:rounded-md [&_img]:border [&_img]:border-border [&_img]:object-contain'
        ),
      },
      handlePaste: (view, event) => {
        if (!enableImagePaste || disabled || !tracklistId) return false
        const files = Array.from(event.clipboardData?.files ?? []).filter((file) => file.type.startsWith('image/'))
        if (files.length === 0) return false

        event.preventDefault()
        setUploadError(null)

        for (const file of files) {
          setUploadCount((count) => count + 1)
          void (async () => {
            try {
              const compressed = await compressImage(file)
              const formData = new FormData()
              formData.set('file', compressed)
              formData.set('tracklistId', String(tracklistId))
              if (ticketId) {
                formData.set('ticketId', String(ticketId))
              } else if (draftId) {
                formData.set('draftId', draftId)
              }

              const result = await uploadTicketImage(formData)
              if (!result.success || !result.data) {
                throw new Error(result.error || 'No se pudo subir la imagen')
              }

              view.dispatch(view.state.tr.scrollIntoView())
              editor?.chain().focus().setImage({ src: result.data.url }).run()
            } catch (error) {
              setUploadError(error instanceof Error ? error.message : 'No se pudo subir la imagen')
            } finally {
              setUploadCount((count) => Math.max(0, count - 1))
            }
          })()
        }

        return true
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
          {(uploadCount > 0 || uploadError) && (
            <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
              {uploadCount > 0 ? 'Subiendo imagen...' : uploadError}
            </div>
          )}
        </>
      ) : (
        <div className="min-h-36 px-3 py-2">
          <EditorContent editor={editor} />
        </div>
      )}
    </div>
  )
}
