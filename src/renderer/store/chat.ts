import { create } from 'zustand'
import type {
  CatalogModel,
  ChatMsg,
  ConversationSummary,
  InstalledModel,
  OllamaEvent,
  OllamaStatus
} from '@shared/ipc-contract'

export type Stage = 'loading' | 'not-installed' | 'setup' | 'chat'

interface PullState {
  requestId: string
  modelId: string
  status: string
  completed: number
  total: number
  error: string | null
}

interface StreamingState {
  requestId: string
  partial: string
  error: string | null
}

interface ChatState {
  stage: Stage
  status: OllamaStatus | null
  catalog: CatalogModel[]
  installed: InstalledModel[]
  activeModel: string | null
  messages: ChatMsg[]
  streaming: StreamingState | null
  pulls: Record<string, PullState> // keyed by modelId
  initialized: boolean
  activeConversationId: string | null
  conversationList: ConversationSummary[]

  init: () => Promise<void>
  refresh: () => Promise<void>
  openModelSetup: () => void
  selectModel: (modelId: string) => void
  startPull: (modelId: string) => Promise<void>
  cancelPull: (modelId: string) => Promise<void>
  removeModel: (modelId: string) => Promise<void>
  sendMessage: (text: string) => Promise<void>
  stopStreaming: () => Promise<void>
  clearConversation: () => void
  reset: () => void
  loadConversationList: () => Promise<void>
  loadConversation: (id: string) => Promise<void>
  deleteConversation: (id: string) => Promise<void>
}

let eventDisposer: (() => void) | null = null

function dispatchEvent(evt: OllamaEvent): void {
  const state = useChatStore.getState()

  // Is this event for a pull?
  const pullEntry = Object.entries(state.pulls).find(
    ([, p]) => p.requestId === evt.requestId
  )
  if (pullEntry) {
    const [modelId, existing] = pullEntry
    handlePullEvent(modelId, existing, evt)
    return
  }

  // Is this event for the current chat stream?
  if (state.streaming && state.streaming.requestId === evt.requestId) {
    handleChatEvent(evt)
    return
  }
}

function handlePullEvent(modelId: string, existing: PullState, evt: OllamaEvent): void {
  if (evt.type === 'pull-progress') {
    useChatStore.setState((s) => ({
      pulls: {
        ...s.pulls,
        [modelId]: {
          ...existing,
          status: evt.status,
          completed: evt.completed ?? existing.completed,
          total: evt.total ?? existing.total
        }
      }
    }))
  } else if (evt.type === 'done') {
    useChatStore.setState((s) => {
      const { [modelId]: _, ...rest } = s.pulls
      return { pulls: rest }
    })
    void useChatStore.getState().refresh()
  } else if (evt.type === 'error') {
    useChatStore.setState((s) => ({
      pulls: { ...s.pulls, [modelId]: { ...existing, error: evt.message } }
    }))
  } else if (evt.type === 'cancelled') {
    useChatStore.setState((s) => {
      const { [modelId]: _, ...rest } = s.pulls
      return { pulls: rest }
    })
  }
}

function handleChatEvent(evt: OllamaEvent): void {
  if (evt.type === 'chat-token') {
    useChatStore.setState((s) => {
      if (!s.streaming) return s
      return {
        streaming: { ...s.streaming, partial: s.streaming.partial + evt.token }
      }
    })
  } else if (evt.type === 'done') {
    const state = useChatStore.getState()
    const finalContent = state.streaming?.partial ?? ''
    const convId = state.activeConversationId
    useChatStore.setState((s) => {
      if (!s.streaming) return s
      const next: ChatMsg[] = finalContent
        ? [...s.messages, { role: 'assistant', content: finalContent }]
        : s.messages
      return { messages: next, streaming: null }
    })
    if (finalContent && convId) {
      void window.api.conversations.appendMessage(convId, 'assistant', finalContent)
    }
  } else if (evt.type === 'error') {
    useChatStore.setState((s) => {
      if (!s.streaming) return s
      return { streaming: { ...s.streaming, error: evt.message } }
    })
  } else if (evt.type === 'cancelled') {
    const state = useChatStore.getState()
    const partial = state.streaming?.partial ?? ''
    const convId = state.activeConversationId
    useChatStore.setState((s) => {
      if (!s.streaming) return s
      const next: ChatMsg[] = partial
        ? [...s.messages, { role: 'assistant', content: partial }]
        : s.messages
      return { messages: next, streaming: null }
    })
    if (partial && convId) {
      void window.api.conversations.appendMessage(convId, 'assistant', partial)
    }
  }
}

function nextStage(
  prevStage: Stage,
  status: OllamaStatus | null,
  activeModel: string | null
): Stage {
  if (!status) return 'loading'
  if (!status.running) return 'not-installed'
  // Preserve explicit user intent: if they navigated to the setup screen,
  // don't bounce them back to chat just because refresh() fired after a pull.
  // But if Ollama stopped running, show the not-installed screen.
  if (prevStage === 'setup' && status.running) return 'setup'
  if (activeModel) return 'chat'
  return 'setup'
}

export const useChatStore = create<ChatState>((set, get) => ({
  stage: 'loading',
  status: null,
  catalog: [],
  installed: [],
  activeModel: null,
  messages: [],
  streaming: null,
  pulls: {},
  initialized: false,
  activeConversationId: null,
  conversationList: [],

  init: async () => {
    if (!get().initialized) {
      eventDisposer?.()
      eventDisposer = window.api.ollama.onEvent(dispatchEvent)
      set({ initialized: true })
    }
    await get().refresh()
  },

  refresh: async () => {
    try {
      const status = await window.api.ollama.status()
      if (!status.running) {
        set({
          status,
          catalog: [],
          installed: [],
          stage: 'not-installed'
        })
        return
      }
      const [catalog, installed] = await Promise.all([
        window.api.ollama.catalog(),
        window.api.ollama.listInstalled()
      ])
      const { activeModel, stage: prevStage } = get()
      // If the active model got uninstalled out from under us, clear it.
      // If no model is active but models are installed, auto-select the first one.
      const activeStillValid =
        activeModel && installed.some((m) => m.id === activeModel) ? activeModel : null
      const effectiveModel = activeStillValid ?? (installed.length > 0 ? installed[0].id : null)
      set({
        status,
        catalog,
        installed,
        activeModel: effectiveModel,
        stage: nextStage(prevStage, status, effectiveModel)
      })
    } catch {
      const fallbackHardware = get().status?.hardware ?? {
        totalRamGB: 0,
        arch: 'other' as const,
        cpuModel: 'Unknown'
      }
      set({
        stage: 'not-installed',
        status: { running: false, version: null, hardware: fallbackHardware }
      })
    }
  },

  openModelSetup: () => {
    set({ stage: 'setup' })
  },

  selectModel: (modelId) => {
    set({
      activeModel: modelId,
      messages: [],
      streaming: null,
      activeConversationId: null,
      stage: 'chat'
    })
  },

  startPull: async (modelId) => {
    const requestId = await window.api.ollama.pull(modelId)
    set((s) => ({
      pulls: {
        ...s.pulls,
        [modelId]: {
          requestId,
          modelId,
          status: 'starting',
          completed: 0,
          total: 0,
          error: null
        }
      }
    }))
  },

  cancelPull: async (modelId) => {
    const pull = get().pulls[modelId]
    if (!pull) return
    await window.api.ollama.cancel(pull.requestId)
  },

  removeModel: async (modelId) => {
    const res = await window.api.ollama.remove(modelId)
    if (res.ok) {
      await get().refresh()
    }
  },

  sendMessage: async (text) => {
    const { activeModel, messages, streaming } = get()
    if (!activeModel || streaming) return
    const trimmed = text.trim()
    if (!trimmed) return

    const userMsg: ChatMsg = { role: 'user', content: trimmed }
    const nextMessages = [...messages, userMsg]
    set({ messages: nextMessages })

    // Persist: create conversation if needed, then save user message
    let convId = get().activeConversationId
    try {
      if (!convId) {
        const title = trimmed.length > 60 ? trimmed.slice(0, 57) + '...' : trimmed
        const conv = await window.api.conversations.create(activeModel, title)
        convId = conv.id
        set({ activeConversationId: convId })
      }
      await window.api.conversations.appendMessage(convId, 'user', trimmed)
    } catch {
      // persistence failure shouldn't block chat
    }

    try {
      const requestId = await window.api.ollama.chat(activeModel, nextMessages)
      set({
        streaming: { requestId, partial: '', error: null }
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      set({ streaming: { requestId: 'failed', partial: '', error: message } })
    }
  },

  stopStreaming: async () => {
    const { streaming } = get()
    if (!streaming) return
    await window.api.ollama.cancel(streaming.requestId)
  },

  clearConversation: () => {
    set({ messages: [], streaming: null, activeConversationId: null })
    void get().loadConversationList()
  },

  reset: () => {
    eventDisposer?.()
    eventDisposer = null
    set({
      stage: 'loading',
      status: null,
      catalog: [],
      installed: [],
      activeModel: null,
      messages: [],
      streaming: null,
      pulls: {},
      initialized: false,
      activeConversationId: null,
      conversationList: []
    })
  },

  loadConversationList: async () => {
    try {
      const list = await window.api.conversations.list()
      set({ conversationList: list })
    } catch {
      // ignore
    }
  },

  loadConversation: async (id) => {
    try {
      const messages = await window.api.conversations.messages(id)
      set({ messages, activeConversationId: id, streaming: null })
    } catch {
      // ignore
    }
  },

  deleteConversation: async (id) => {
    try {
      await window.api.conversations.delete(id)
      const { activeConversationId } = get()
      if (activeConversationId === id) {
        set({ messages: [], streaming: null, activeConversationId: null })
      }
      await get().loadConversationList()
    } catch {
      // ignore
    }
  }
}))
