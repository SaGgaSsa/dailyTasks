'use client'

import { useMemo, useState, useEffect } from 'react'
import { useCreateBlockNote } from '@blocknote/react'
import { PartialBlock } from '@blocknote/core'
import { BlockNoteView } from '@blocknote/mantine'
import "@blocknote/core/fonts/inter.css"
import "@blocknote/mantine/style.css"

interface ReadonlyBlockNoteProps {
    initialContent: object | undefined
}

function isValidBlockContent(content: unknown): content is PartialBlock[] {
    return Array.isArray(content) && content.length > 0
}

function getTheme(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'dark'
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function ReadonlyBlockNote({ initialContent }: ReadonlyBlockNoteProps) {
    const [theme, setTheme] = useState<'light' | 'dark'>('dark')

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

    const parsedContent = useMemo(() => {
        if (isValidBlockContent(initialContent)) {
            return initialContent
        }
        return undefined
    }, [initialContent])

    const editor = useCreateBlockNote({
        initialContent: parsedContent
    })

    return (
        <div className="w-full">
            <BlockNoteView 
                editor={editor} 
                editable={false} 
                theme={theme} 
            />
        </div>
    )
}
