'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownTextProps {
    content: string | null | undefined
    className?: string
}

export function MarkdownText({ content, className }: MarkdownTextProps) {
    if (!content) return null

    return (
        <div className={`prose prose-sm prose-invert max-w-none ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    a: ({ node, ...props }) => (
                        <a
                            {...props}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline font-medium"
                        />
                    ),
                    ul: ({ node, ...props }) => (
                        <ul {...props} className="list-disc pl-4 my-2 space-y-1" />
                    ),
                    ol: ({ node, ...props }) => (
                        <ol {...props} className="list-decimal pl-4 my-2 space-y-1" />
                    ),
                    p: ({ node, ...props }) => (
                        <p {...props} className="mb-2 last:mb-0" />
                    ),
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    )
}
