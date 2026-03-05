export enum TaskStatus {
    BACKLOG = "BACKLOG",
    TODO = "TODO",
    IN_PROGRESS = "IN_PROGRESS",
    REVIEW = "REVIEW",
    DONE = "DONE",
}

export enum TaskType {
    I_MODAPL = "I_MODAPL",
    I_CASO = "I_CASO",
    I_CONS = "I_CONS",
}

export enum Priority {
    LOW = "LOW",
    MEDIUM = "MEDIUM",
    HIGH = "HIGH",
    BLOQUEANTE = "BLOQUEANTE",
}

export enum UserRole {
    ADMIN = "ADMIN",
    DEV = "DEV",
    QA = "QA",
}

export enum WorkspaceRole {
    OWNER = "OWNER",
    ADMIN = "ADMIN",
    MEMBER = "MEMBER",
}

export enum AttachmentType {
    FILE = "FILE",
    LINK = "LINK",
}
