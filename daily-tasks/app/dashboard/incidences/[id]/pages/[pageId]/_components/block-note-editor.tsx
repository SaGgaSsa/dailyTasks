'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useCreateBlockNote } from '@blocknote/react'
import { PartialBlock } from '@blocknote/core'
import { BlockNoteView } from '@blocknote/mantine'
import "@blocknote/core/fonts/inter.css"
import "@blocknote/mantine/style.css"
import { updatePageContent } from '@/app/actions/pages'
import { toast } from 'sonner'
import { Prisma } from '@prisma/client'

interface BlockNoteEditorProps {
    initialContent: object | undefined
    initialTitle: string
    pageId: number
    incidenceId: number
    isEditor?: boolean
    theme?: 'light' | 'dark'
}

function isValidBlockContent(content: unknown): content is PartialBlock[] {
    return Array.isArray(content) && content.length > 0
}

function getTheme(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'dark'
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function BlockNoteEditor({ 
    initialContent, 
    initialTitle,
    pageId, 
    incidenceId,
    isEditor = false,
    theme: propTheme 
}: BlockNoteEditorProps) {
    const [theme, setTheme] = useState<'light' | 'dark'>(propTheme || 'dark')
    const [title, setTitle] = useState(initialTitle)
    
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)
    const titleTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const editorRef = useRef<unknown>(null)
    const pageIdRef = useRef(pageId)
    const isSavingRef = useRef(false)

    useEffect(() => {
        pageIdRef.current = pageId
    }, [pageId])

    useEffect(() => {
        setTitle(initialTitle)
    }, [initialTitle])

    const parsedContent = useMemo(() => {
        if (isValidBlockContent(initialContent)) {
            return initialContent
        }
        return undefined
    }, [initialContent])

    useEffect(() => {
        if (propTheme) {
            setTheme(propTheme)
        } else {
            setTheme(getTheme())
            
            const observer = new MutationObserver(() => {
                setTheme(getTheme())
            })
            observer.observe(document.documentElement, {
                attributes: true,
                attributeFilter: ['class']
            })
            
            return () => observer.disconnect()
        }
    }, [propTheme])

    const editor = useCreateBlockNote({
        initialContent: parsedContent
    })

    useEffect(() => {
        editorRef.current = editor
    }, [editor])

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTitle = e.target.value
        setTitle(newTitle)

        if (titleTimeoutRef.current) {
            clearTimeout(titleTimeoutRef.current)
        }

        titleTimeoutRef.current = setTimeout(async () => {
            const titleToSave = newTitle.trim() || 'Nueva Página'
            
            try {
                const result = await updatePageContent(
                    pageIdRef.current, 
                    (editorRef.current as { document: unknown }).document as unknown as Prisma.InputJsonValue,
                    titleToSave
                )
                
                if (!result.success) {
                    toast.error(result.error || 'Error al guardar título')
                }
            } catch {
                toast.error('Error al guardar título')
            }
        }, 2000)
    }

    useEffect(() => {
        const handleChange = () => {
            if (isSavingRef.current) return

            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }

            timeoutRef.current = setTimeout(async () => {
                if (isSavingRef.current || !editorRef.current) return
                
                isSavingRef.current = true

                try {
                    const content = (editorRef.current as { document: unknown }).document as unknown as Prisma.InputJsonValue
                    const result = await updatePageContent(pageIdRef.current, content)
                    
                    if (result.success) {
                        setTimeout(() => {
                            isSavingRef.current = false
                        }, 2000)
                    } else {
                        isSavingRef.current = false
                        toast.error(result.error || 'Error al guardar')
                    }
                } catch {
                    isSavingRef.current = false
                    toast.error('Error al guardar')
                }
            }, 2000)
        }

        editor.onEditorContentChange(handleChange)

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
        }
    }, [editor])

    if (isEditor) {
        return (
            <div className={`min-h-screen ${theme === 'dark' ? 'dark' : ''}`}>
                <div className="pt-4 px-8 max-w-4xl mx-auto">
                    <input
                        type="text"
                        value={title}
                        onChange={handleTitleChange}
                        placeholder="Nueva Página"
                        className="w-full bg-transparent border-none outline-none text-2xl font-semibold mb-4 pl-[54px] placeholder:text-muted-foreground/50"
                    />
                    <BlockNoteView
                        editor={editor}
                        theme={theme}
                    />
                </div>
            </div>
        )
    }

    return null
}
