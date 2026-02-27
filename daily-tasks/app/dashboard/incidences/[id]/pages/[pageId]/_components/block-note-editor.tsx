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
    pageId: number
    incidenceId: number
    isEditor?: boolean
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
    pageId, 
    incidenceId,
    isEditor = false 
}: BlockNoteEditorProps) {
    const [theme, setTheme] = useState<'light' | 'dark'>('dark')
    
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)
    const editorRef = useRef<unknown>(null)
    const pageIdRef = useRef(pageId)
    const isSavingRef = useRef(false)

    useEffect(() => {
        pageIdRef.current = pageId
    }, [pageId])

    const parsedContent = useMemo(() => {
        if (isValidBlockContent(initialContent)) {
            return initialContent
        }
        return undefined
    }, [initialContent])

    useEffect(() => {
        setTheme(getTheme())
        
        const observer = new MutationObserver(() => {
            setTheme(getTheme())
        })
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        })
        
        return () => observer.disconnect()
    }, [])

    const editor = useCreateBlockNote({
        initialContent: parsedContent
    })

    useEffect(() => {
        editorRef.current = editor
    }, [editor])

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
            <BlockNoteView
                editor={editor}
                theme={theme}
            />
        )
    }

    return null
}
