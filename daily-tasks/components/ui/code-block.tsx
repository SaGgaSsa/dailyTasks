'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { coy, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useTheme } from '@/lib/use-theme'
import { cn } from '@/lib/utils'

type CodeBlockVariant = 'sql' | 'code'

interface CodeBlockProps {
    code: string
    variant: CodeBlockVariant
    header?: ReactNode
    className?: string
    collapsible?: boolean
    collapsedLines?: number
    defaultExpanded?: boolean
}

const CODE_LINE_HEIGHT_REM = 1.5

function sanitizePreTheme(styles: CSSProperties): CSSProperties {
    const nextStyles = { ...styles }
    delete nextStyles.backgroundColor
    delete nextStyles.marginBottom
    delete nextStyles.marginTop
    return nextStyles
}

const darkTheme = {
    ...oneDark,
    'pre[class*="language-"]': {
        ...sanitizePreTheme(oneDark['pre[class*="language-"]']),
        background: 'transparent',
        margin: 0,
        padding: 0,
        fontSize: '0.875rem',
        lineHeight: '1.5',
        fontFamily: 'var(--font-geist-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
    },
    'code[class*="language-"]': {
        ...oneDark['code[class*="language-"]'],
        background: 'transparent',
        fontSize: '0.875rem',
        fontFamily: 'var(--font-geist-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
    },
}

const lightTheme = {
    ...coy,
    'pre[class*="language-"]': {
        ...sanitizePreTheme(coy['pre[class*="language-"]']),
        background: 'transparent',
        margin: 0,
        padding: 0,
        fontSize: '0.875rem',
        lineHeight: '1.5',
        textShadow: 'none',
        fontFamily: 'var(--font-geist-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
    },
    'code[class*="language-"]': {
        ...coy['code[class*="language-"]'],
        background: 'transparent',
        fontSize: '0.875rem',
        textShadow: 'none',
        fontFamily: 'var(--font-geist-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
    },
}

export function CodeBlock({
    code,
    variant,
    header,
    className,
    collapsible = true,
    collapsedLines = 10,
    defaultExpanded = false,
}: CodeBlockProps) {
    const { mounted, resolvedTheme } = useTheme()
    const rootRef = useRef<HTMLDivElement>(null)
    const contentRef = useRef<HTMLDivElement>(null)
    const [isExpanded, setIsExpanded] = useState(defaultExpanded)
    const [hasOverflow, setHasOverflow] = useState(false)
    const language = variant === 'sql' ? 'sql' : 'typescript'
    const isDark = !mounted || resolvedTheme === 'dark'

    const normalizedCode = useMemo(() => code.replace(/\s+$/, ''), [code])
    const collapsedMaxHeight = `${collapsedLines * CODE_LINE_HEIGHT_REM}rem`

    useEffect(() => {
        if (!collapsible || !isExpanded) {
            return
        }

        const handlePointerDown = (event: PointerEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) {
                setIsExpanded(false)
            }
        }

        window.addEventListener('pointerdown', handlePointerDown)
        return () => window.removeEventListener('pointerdown', handlePointerDown)
    }, [collapsible, isExpanded])

    useEffect(() => {
        if (!collapsible || isExpanded) {
            return
        }

        const element = contentRef.current
        if (!element) {
            return
        }

        const updateOverflow = () => {
            setHasOverflow(element.scrollHeight > element.clientHeight + 1)
        }

        const frameId = window.requestAnimationFrame(updateOverflow)
        const observer = new ResizeObserver(updateOverflow)
        observer.observe(element)

        return () => {
            window.cancelAnimationFrame(frameId)
            observer.disconnect()
        }
    }, [collapsible, isExpanded, normalizedCode, collapsedLines, mounted, resolvedTheme])

    return (
        <div
            ref={rootRef}
            className={cn(
                'overflow-hidden rounded-lg border',
                isDark ? 'border-border bg-zinc-950/90' : 'border-zinc-200 bg-zinc-50',
                className
            )}
        >
            {header ? (
                <div
                    className={cn(
                        'border-b px-3 py-2',
                        isDark ? 'border-border/80 bg-zinc-900/90' : 'border-zinc-200 bg-zinc-100'
                    )}
                >
                    {header}
                </div>
            ) : null}
            <div
                ref={contentRef}
                className={cn(
                    'relative overflow-x-auto px-3 py-3',
                    !isExpanded && 'overflow-y-hidden'
                )}
                style={!isExpanded && collapsible ? { maxHeight: collapsedMaxHeight } : undefined}
                onDoubleClick={() => {
                    if (collapsible) {
                        setIsExpanded(true)
                    }
                }}
                title={collapsible && !isExpanded ? 'Doble click para expandir' : undefined}
            >
                <SyntaxHighlighter
                    language={language}
                    style={isDark ? darkTheme : lightTheme}
                    customStyle={{ backgroundColor: 'transparent' }}
                    codeTagProps={{ className: 'font-mono' }}
                    wrapLongLines
                    showLineNumbers={false}
                >
                    {normalizedCode}
                </SyntaxHighlighter>
                {collapsible && !isExpanded && hasOverflow ? (
                    <div
                        className={cn(
                            'pointer-events-none absolute inset-x-0 bottom-0 h-12',
                            isDark
                                ? 'bg-gradient-to-t from-zinc-950/95 via-zinc-950/70 to-transparent'
                                : 'bg-gradient-to-t from-zinc-50 via-zinc-50/80 to-transparent'
                        )}
                    />
                ) : null}
            </div>
        </div>
    )
}
