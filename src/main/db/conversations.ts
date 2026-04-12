import type Database from 'better-sqlite3-multiple-ciphers'
import { randomUUID } from 'node:crypto'
import type { ChatMsg, Conversation, ConversationSummary } from '@shared/ipc-contract'

type DB = Database.Database

interface ConversationRow {
  id: string
  title: string
  model_id: string
  created_at: number
  updated_at: number
}

interface ChatMessageRow {
  id: string
  conversation_id: string
  role: string
  content: string
  created_at: number
}

function rowToConversation(row: ConversationRow): Conversation {
  return {
    id: row.id,
    title: row.title,
    modelId: row.model_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function createConversation(db: DB, modelId: string, title: string): Conversation {
  const id = randomUUID()
  const now = Date.now()
  db.prepare(
    `INSERT INTO conversations (id, title, model_id, created_at, updated_at)
     VALUES (@id, @title, @modelId, @createdAt, @updatedAt)`
  ).run({ id, title, modelId, createdAt: now, updatedAt: now })
  return { id, title, modelId, createdAt: now, updatedAt: now }
}

export function listConversations(db: DB): ConversationSummary[] {
  const rows = db
    .prepare(
      `SELECT id, title, model_id, updated_at
       FROM conversations
       ORDER BY updated_at DESC
       LIMIT 50`
    )
    .all() as ConversationRow[]
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    modelId: r.model_id,
    updatedAt: r.updated_at
  }))
}

export function getConversationMessages(db: DB, conversationId: string): ChatMsg[] {
  const rows = db
    .prepare(
      `SELECT role, content FROM chat_messages
       WHERE conversation_id = ?
       ORDER BY created_at ASC`
    )
    .all(conversationId) as ChatMessageRow[]
  return rows.map((r) => ({ role: r.role as ChatMsg['role'], content: r.content }))
}

export function appendMessage(
  db: DB,
  conversationId: string,
  role: string,
  content: string
): void {
  const id = randomUUID()
  const now = Date.now()
  db.prepare(
    `INSERT INTO chat_messages (id, conversation_id, role, content, created_at)
     VALUES (@id, @conversationId, @role, @content, @createdAt)`
  ).run({ id, conversationId, role, content, createdAt: now })
  db.prepare(`UPDATE conversations SET updated_at = ? WHERE id = ?`).run(now, conversationId)
}

export function deleteConversation(db: DB, conversationId: string): void {
  db.prepare('DELETE FROM conversations WHERE id = ?').run(conversationId)
}
