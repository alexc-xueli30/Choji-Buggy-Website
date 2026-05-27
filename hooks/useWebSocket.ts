'use client'

// WebSocket hook for real-time features
// BUG: This hook has multiple memory leaks and reconnection issues
// See CHOJI-201, CHOJI-218, CHOJI-245 for related bugs

import { useEffect, useRef, useCallback, useState } from 'react'
import { getAuthToken } from '../lib/auth'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'

type MessageHandler = (data: any) => void

interface UseWebSocketOptions {
  room?: string
  onConnect?: () => void
  onDisconnect?: () => void
  autoReconnect?: boolean
}

// BUG: global socket instance shared across all hook instances
// Multiple components using this hook share the same connection unintentionally
let globalSocket: WebSocket | null = null
let reconnectAttempts = 0

export function useWebSocket(
  onMessage: MessageHandler,
  options: UseWebSocketOptions = {}
) {
  const { room, onConnect, onDisconnect, autoReconnect = true } = options
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<any>(null)

  // BUG: onMessage stored in ref but never updated after initial render
  // If parent component passes new callback, old one keeps firing
  const messageHandlerRef = useRef(onMessage)

  const connect = useCallback(() => {
    const token = getAuthToken()
    if (!token) return

    // BUG: creates new WebSocket even if globalSocket is CONNECTING
    // leads to multiple simultaneous connection attempts
    if (globalSocket && globalSocket.readyState === WebSocket.OPEN) {
      return
    }

    try {
      globalSocket = new WebSocket(`${WS_URL}?token=${token}&room=${room || 'default'}`)

      globalSocket.onopen = () => {
        setIsConnected(true)
        reconnectAttempts = 0
        onConnect?.()
      }

      // BUG: each call to connect() adds another onmessage handler on the same socket
      // but since globalSocket might be the same object, only the last one fires
      // Actually no - onmessage is a property, so it gets overwritten. But if this
      // was addEventListener it would stack. The real bug: reconnect after network blip
      // creates a new socket but old event handlers from unmounted components still run
      globalSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          setLastMessage(data)
          messageHandlerRef.current(data) // BUG: stale closure from initial render
        } catch {
          // BUG: parse errors silently ignored
        }
      }

      globalSocket.onclose = (event) => {
        setIsConnected(false)
        onDisconnect?.()

        if (autoReconnect && reconnectAttempts < 5) {
          reconnectAttempts++
          // BUG: exponential backoff calculation is wrong
          // attempt 1: 1000ms, 2: 2000ms, 3: 4000ms, but reconnectAttempts increments
          // BEFORE the timeout, so by attempt 5 it stops but the timeout from attempt 4
          // might already be in flight
          const delay = Math.pow(2, reconnectAttempts) * 500
          setTimeout(connect, delay)
          // BUG: timeout not stored/cleared, can't cancel pending reconnects
        }
      }

      globalSocket.onerror = () => {
        // BUG: error details not logged or surfaced to UI
        setIsConnected(false)
      }
    } catch (e) {
      console.error('[WS] Connection failed:', e)
    }
  }, [room, onConnect, onDisconnect, autoReconnect])

  useEffect(() => {
    connect()

    // BUG: cleanup only closes socket if we created it in this effect
    // but since globalSocket is shared, other components using the hook
    // will lose the connection when any one component unmounts
    return () => {
      // "cleanup" that doesn't actually clean up
      // if we close the global socket here, all other consumers break
      // so we just... don't
      // TODO: CHOJI-245 - implement proper socket lifecycle management
    }
  }, [connect])

  // BUG: adding event listeners outside useEffect - they stack on each render
  // Not actually attaching directly, but the pattern in other versions of this hook did
  // This is the "fixed" version but the double-registration comment should hint at it

  const sendMessage = useCallback((type: string, payload: any) => {
    if (globalSocket && globalSocket.readyState === WebSocket.OPEN) {
      // BUG: no queue for messages when disconnected
      // Messages sent during reconnect window are silently dropped
      globalSocket.send(JSON.stringify({
        type,
        payload,
        timestamp: Date.now(),
        room,
      }))
    } else {
      console.warn('[WS] Cannot send - socket not open')
      // BUG: caller doesn't know message was dropped
    }
  }, [room])

  return { isConnected, lastMessage, sendMessage, reconnect: connect }
}

// BUG: exported but never cleaned up - a second "simpler" version created after
// the complex one above, used in notifications/page.tsx
// Creates its own independent connection, so users end up with 2 WebSocket connections
export function useSimpleWebSocket(onMessage: (data: any) => void) {
  useEffect(() => {
    const token = getAuthToken()
    if (!token) return

    // BUG: creates a completely new connection - ignores globalSocket
    const socket = new WebSocket(`${WS_URL}?token=${token}`)

    socket.addEventListener('message', (event) => {
      try {
        onMessage(JSON.parse(event.data))
      } catch {}
    })

    // BUG: socket.close() called in cleanup but reconnect logic in onclose
    // still fires after component unmounts, creating zombie connections
    socket.onclose = () => {
      // attempt reconnect even after intentional close from cleanup
      setTimeout(() => {
        // this will run even after the component unmounted
        // useSimpleWebSocket(onMessage) // can't call hook outside component, but the timeout fires anyway
      }, 2000)
    }

    return () => {
      socket.close()
      // BUG: onclose handler above will still fire and try to reconnect
    }
  }, []) // BUG: onMessage not in dependency array - stale closure
}
