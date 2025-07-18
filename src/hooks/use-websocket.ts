import { useEffect, useRef, useState, useCallback } from 'react'

export interface WebSocketMessage {
  type: string
  id?: string
  data?: any
  timestamp: string
  subscriptionId?: string
  error?: string
}

export interface Subscription {
  id: string
  type: 'security_events' | 'query_results' | 'health_status' | 'metrics'
  filters?: any
  interval?: number
}

export interface UseWebSocketOptions {
  url?: string
  reconnectAttempts?: number
  reconnectInterval?: number
  onMessage?: (message: WebSocketMessage) => void
  onError?: (error: Event) => void
  onConnect?: () => void
  onDisconnect?: () => void
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    url = 'ws://localhost:8080/api/ws',
    reconnectAttempts = 5,
    reconnectInterval = 3000,
    onMessage,
    onError,
    onConnect,
    onDisconnect
  } = options

  const [isConnected, setIsConnected] = useState(false)
  const [connectionId, setConnectionId] = useState<string | null>(null)
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  const [subscriptions, setSubscriptions] = useState<Set<string>>(new Set())
  
  const ws = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectCountRef = useRef(0)
  const messageHandlers = useRef<Map<string, (message: WebSocketMessage) => void>>(new Map())

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      return
    }

    try {
      ws.current = new WebSocket(url)

      ws.current.onopen = () => {
        setIsConnected(true)
        reconnectCountRef.current = 0
        onConnect?.()
      }

      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          setLastMessage(message)
          
          // Handle specific message types
          switch (message.type) {
            case 'connected':
              setConnectionId(message.data?.connectionId || null)
              break
            
            case 'error':
              console.error('WebSocket error:', message.error)
              break
            
            case 'ping':
              // Respond to ping
              if (ws.current?.readyState === WebSocket.OPEN) {
                ws.current.send(JSON.stringify({ type: 'pong' }))
              }
              break
          }
          
          // Call registered message handlers
          if (message.subscriptionId && messageHandlers.current.has(message.subscriptionId)) {
            messageHandlers.current.get(message.subscriptionId)?.(message)
          }
          
          onMessage?.(message)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error)
        onError?.(error)
      }

      ws.current.onclose = () => {
        setIsConnected(false)
        setConnectionId(null)
        onDisconnect?.()
        
        // Attempt to reconnect
        if (reconnectCountRef.current < reconnectAttempts) {
          reconnectCountRef.current++
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, reconnectInterval)
        }
      }
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
    }
  }, [url, reconnectAttempts, reconnectInterval, onConnect, onDisconnect, onMessage, onError])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    if (ws.current) {
      ws.current.close()
      ws.current = null
    }
  }, [])

  const send = useCallback((message: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message))
      return true
    }
    return false
  }, [])

  const subscribe = useCallback((subscription: Subscription, onUpdate?: (message: WebSocketMessage) => void) => {
    if (!isConnected) {
      console.warn('Cannot subscribe: WebSocket not connected')
      return false
    }

    const success = send({
      type: 'subscribe',
      data: subscription
    })

    if (success) {
      setSubscriptions(prev => new Set([...prev, subscription.id]))
      
      if (onUpdate) {
        messageHandlers.current.set(subscription.id, onUpdate)
      }
    }

    return success
  }, [isConnected, send])

  const unsubscribe = useCallback((subscriptionId: string) => {
    if (!isConnected) {
      return false
    }

    const success = send({
      type: 'unsubscribe',
      data: subscriptionId
    })

    if (success) {
      setSubscriptions(prev => {
        const newSet = new Set(prev)
        newSet.delete(subscriptionId)
        return newSet
      })
      
      messageHandlers.current.delete(subscriptionId)
    }

    return success
  }, [isConnected, send])

  const query = useCallback((queryData: any, onResult?: (result: WebSocketMessage) => void) => {
    if (!isConnected) {
      return false
    }

    const queryId = Math.random().toString(36).substr(2, 9)
    
    if (onResult) {
      const handleResult = (message: WebSocketMessage) => {
        if (message.id === queryId) {
          onResult(message)
          messageHandlers.current.delete(queryId)
        }
      }
      messageHandlers.current.set(queryId, handleResult)
    }

    return send({
      type: 'query',
      id: queryId,
      data: queryData
    })
  }, [isConnected, send])

  // Connect on mount
  useEffect(() => {
    connect()
    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  // Cleanup on unmount
  useEffect(() => {
    const handlersRef = messageHandlers.current
    return () => {
      handlersRef.clear()
    }
  }, [])

  return {
    isConnected,
    connectionId,
    lastMessage,
    subscriptions: Array.from(subscriptions),
    connect,
    disconnect,
    send,
    subscribe,
    unsubscribe,
    query
  }
}

// Hook for security events subscription
export function useSecurityEventsSubscription(options: {
  interval?: number
  filters?: any
  onUpdate?: (events: any[]) => void
} = {}) {
  const { interval = 30000, filters, onUpdate } = options
  const [events, setEvents] = useState<any[]>([])
  const [isSubscribed, setIsSubscribed] = useState(false)
  
  const { isConnected, subscribe, unsubscribe } = useWebSocket({
    onMessage: (message) => {
      if (message.type === 'security_events_update') {
        const newEvents = message.data?.events || []
        setEvents(newEvents)
        onUpdate?.(newEvents)
      }
    }
  })

  useEffect(() => {
    if (isConnected && !isSubscribed) {
      const subscription: Subscription = {
        id: 'security-events-' + Date.now(),
        type: 'security_events',
        interval,
        filters
      }
      
      const success = subscribe(subscription)
      setIsSubscribed(success)
      
      return () => {
        if (success) {
          unsubscribe(subscription.id)
          setIsSubscribed(false)
        }
      }
    }
  }, [isConnected, isSubscribed, interval, filters, subscribe, unsubscribe])

  return {
    events,
    isSubscribed,
    isConnected
  }
}

// Hook for health status subscription
export function useHealthStatusSubscription(options: {
  interval?: number
  onUpdate?: (health: any) => void
} = {}) {
  const { interval = 10000, onUpdate } = options
  const [healthStatus, setHealthStatus] = useState<any>(null)
  const [isSubscribed, setIsSubscribed] = useState(false)
  
  const { isConnected, subscribe, unsubscribe } = useWebSocket({
    onMessage: (message) => {
      if (message.type === 'health_status_update') {
        setHealthStatus(message.data)
        onUpdate?.(message.data)
      }
    }
  })

  useEffect(() => {
    if (isConnected && !isSubscribed) {
      const subscription: Subscription = {
        id: 'health-status-' + Date.now(),
        type: 'health_status',
        interval
      }
      
      const success = subscribe(subscription)
      setIsSubscribed(success)
      
      return () => {
        if (success) {
          unsubscribe(subscription.id)
          setIsSubscribed(false)
        }
      }
    }
  }, [isConnected, isSubscribed, interval, subscribe, unsubscribe])

  return {
    healthStatus,
    isSubscribed,
    isConnected
  }
}

// Hook for real-time query results
export function useQuerySubscription(options: {
  query: string
  interval?: number
  timePeriodMinutes?: number
  onUpdate?: (results: any) => void
} = { query: '*' }) {
  const { query, interval = 60000, timePeriodMinutes = 60, onUpdate } = options
  const [results, setResults] = useState<any>(null)
  const [isSubscribed, setIsSubscribed] = useState(false)
  
  const { isConnected, subscribe, unsubscribe } = useWebSocket({
    onMessage: (message) => {
      if (message.type === 'query_results_update') {
        setResults(message.data)
        onUpdate?.(message.data)
      }
    }
  })

  useEffect(() => {
    if (isConnected && !isSubscribed && query) {
      const subscription: Subscription = {
        id: 'query-results-' + Date.now(),
        type: 'query_results',
        interval,
        filters: {
          query,
          timePeriodMinutes
        }
      }
      
      const success = subscribe(subscription)
      setIsSubscribed(success)
      
      return () => {
        if (success) {
          unsubscribe(subscription.id)
          setIsSubscribed(false)
        }
      }
    }
  }, [isConnected, isSubscribed, query, interval, timePeriodMinutes, subscribe, unsubscribe])

  return {
    results,
    isSubscribed,
    isConnected
  }
}