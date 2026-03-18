'use client'

import { useMemo } from 'react'
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
}

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

export function CodeBlock({ code, variant, header, className }: CodeBlockProps) {
    const { mounted, resolvedTheme } = useTheme()
    const language = variant === 'sql' ? 'sql' : 'typescript'
    const isDark = !mounted || resolvedTheme === 'dark'

    const normalizedCode = useMemo(() => code.replace(/\s+$/, ''), [code])

    return (
        <div
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
            <div className="overflow-x-auto px-3 py-3">
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
            </div>
        </div>
    )
}
