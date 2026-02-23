interface GeneralTabProps {
    comment: string | null
}

export function GeneralTab({ comment }: GeneralTabProps) {
    if (!comment) {
        return (
            <p className="text-muted-foreground/60 italic">
                No hay descripción proporcionada.
            </p>
        )
    }

    return (
        <p className="whitespace-pre-wrap text-muted-foreground">
            {comment}
        </p>
    )
}
