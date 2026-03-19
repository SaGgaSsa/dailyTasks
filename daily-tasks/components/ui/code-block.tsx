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
    const [animatedMaxHeight, setAnimatedMaxHeight] = useState<string | undefined>(undefined)
    const language = variant === 'sql' ? 'sql' : 'typescript'
    const isDark = !mounted || resolvedTheme === 'dark'

    const normalizedCode = useMemo(() => code.replace(/\s+$/, ''), [code])
    const collapsedMaxHeight = `${collapsedLines * CODE_LINE_HEIGHT_REM}rem`

    const measureExpandedHeight = () => {
        const element = contentRef.current
        if (!element) {
            return null
        }

        return `${element.scrollHeight}px`
    }

    const getCollapsedHeightPx = () => {
        const rootFontSize = Number.parseFloat(
            window.getComputedStyle(document.documentElement).fontSize
        )

        return collapsedLines * CODE_LINE_HEIGHT_REM * rootFontSize
    }

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
        if (!collapsible) {
            setAnimatedMaxHeight(undefined)
            return
        }

        const element = contentRef.current
        if (!element) {
            return
        }

        const updateMeasurements = () => {
            const collapsedHeightPx = getCollapsedHeightPx()
            setHasOverflow(element.scrollHeight > collapsedHeightPx + 1)

            if (isExpanded) {
                setAnimatedMaxHeight(`${element.scrollHeight}px`)
            }
        }

        const frameId = window.requestAnimationFrame(() => {
            setAnimatedMaxHeight(isExpanded ? `${element.scrollHeight}px` : collapsedMaxHeight)
            updateMeasurements()
        })
        const observer = new ResizeObserver(updateMeasurements)
        observer.observe(element)

        return () => {
            window.cancelAnimationFrame(frameId)
            observer.disconnect()
        }
    }, [collapsible, isExpanded, normalizedCode, collapsedLines, collapsedMaxHeight, mounted, resolvedTheme])

    useEffect(() => {
        if (!collapsible) {
            return
        }

        const element = contentRef.current
        if (!element) {
            return
        }

        if (isExpanded) {
            const nextHeight = measureExpandedHeight()
            if (nextHeight) {
                setAnimatedMaxHeight(nextHeight)
            }
            return
        }

        const currentHeight = measureExpandedHeight()
        if (!currentHeight) {
            setAnimatedMaxHeight(collapsedMaxHeight)
            return
        }

        setAnimatedMaxHeight(currentHeight)

        const frameId = window.requestAnimationFrame(() => {
            setAnimatedMaxHeight(collapsedMaxHeight)
        })

        return () => window.cancelAnimationFrame(frameId)
    }, [collapsible, collapsedMaxHeight, isExpanded])

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
                    'relative overflow-x-auto overflow-y-hidden px-3 py-3 motion-reduce:transition-none',
                    'transition-[max-height] duration-200 ease-out'
                )}
                style={collapsible ? { maxHeight: animatedMaxHeight } : undefined}
                onDoubleClick={() => {
                    if (collapsible) {
                        setIsExpanded((current) => !current)
                    }
                }}
                title={collapsible ? (isExpanded ? 'Click afuera para contraer' : 'Doble click para expandir') : undefined}
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
                {collapsible && hasOverflow ? (
                    <div
                        className={cn(
                            'pointer-events-none absolute inset-x-0 bottom-0 h-12 transition-opacity duration-200 ease-out motion-reduce:transition-none',
                            isExpanded ? 'opacity-0' : 'opacity-100',
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
