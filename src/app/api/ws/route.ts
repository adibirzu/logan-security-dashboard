import { NextRequest } from 'next/server'
import { WebSocketServer } from 'ws'
import { IncomingMessage } from 'http'

// Global WebSocket server instance
let wsServer: WebSocketServer | null = null

// Connection management
const connections = new Map<string, any>()
const subscriptions = new Map<string, Set<string>>() // connectionId -> Set of subscriptions

// Message types
interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'query' | 'ping' | 'error'
  id?: string
  data?: any
}

interface Subscription {
  id: string
  type: 'security_events' | 'query_results' | 'health_status' | 'metrics'
  filters?: any
  interval?: number
  intervalId?: NodeJS.Timeout
}

// Initialize WebSocket server
function initializeWebSocket() {
  if (wsServer) return wsServer

  wsServer = new WebSocketServer({ 
    port: 8080,
    path: '/api/ws'
  })

  wsServer.on('connection', (ws, req: IncomingMessage) => {
    const connectionId = generateConnectionId()
    connections.set(connectionId, ws)
    subscriptions.set(connectionId, new Set())

    console.log(`WebSocket connection established: ${connectionId}`)

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      connectionId,
      timestamp: new Date().toISOString()
    }))

    ws.on('message', async (message) => {
      try {
        const data: WebSocketMessage = JSON.parse(message.toString())
        await handleMessage(connectionId, data)
      } catch (error) {
        ws.send(JSON.stringify({
          type: 'error',
          error: 'Invalid message format',
          timestamp: new Date().toISOString()
        }))
      }
    })

    ws.on('close', () => {
      console.log(`WebSocket connection closed: ${connectionId}`)
      connections.delete(connectionId)
      subscriptions.delete(connectionId)
    })

    ws.on('error', (error) => {
      console.error(`WebSocket error for ${connectionId}:`, error)
    })

    // Send periodic ping
    const pingInterval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'ping',
          timestamp: new Date().toISOString()
        }))
      } else {
        clearInterval(pingInterval)
      }
    }, 30000) // Every 30 seconds
  })

  return wsServer
}

async function handleMessage(connectionId: string, message: WebSocketMessage) {
  const ws = connections.get(connectionId)
  if (!ws) return

  switch (message.type) {
    case 'subscribe':
      await handleSubscribe(connectionId, message.data)
      break
    
    case 'unsubscribe':
      await handleUnsubscribe(connectionId, message.data)
      break
    
    case 'query':
      await handleQuery(connectionId, message)
      break
    
    case 'ping':
      ws.send(JSON.stringify({
        type: 'pong',
        timestamp: new Date().toISOString()
      }))
      break
    
    default:
      ws.send(JSON.stringify({
        type: 'error',
        error: `Unknown message type: ${message.type}`,
        timestamp: new Date().toISOString()
      }))
  }
}

async function handleSubscribe(connectionId: string, subscription: Subscription) {
  const ws = connections.get(connectionId)
  if (!ws) return

  const userSubscriptions = subscriptions.get(connectionId)
  if (userSubscriptions) {
    userSubscriptions.add(subscription.id)
  }

  // Start the subscription
  switch (subscription.type) {
    case 'security_events':
      startSecurityEventsSubscription(connectionId, subscription)
      break
    
    case 'query_results':
      startQueryResultsSubscription(connectionId, subscription)
      break
    
    case 'health_status':
      startHealthStatusSubscription(connectionId, subscription)
      break
    
    case 'metrics':
      startMetricsSubscription(connectionId, subscription)
      break
  }

  ws.send(JSON.stringify({
    type: 'subscribed',
    subscriptionId: subscription.id,
    subscriptionType: subscription.type,
    timestamp: new Date().toISOString()
  }))
}

async function handleUnsubscribe(connectionId: string, subscriptionId: string) {
  const ws = connections.get(connectionId)
  if (!ws) return

  const userSubscriptions = subscriptions.get(connectionId)
  if (userSubscriptions) {
    userSubscriptions.delete(subscriptionId)
  }

  // Stop the subscription (implementation depends on subscription type)
  stopSubscription(connectionId, subscriptionId)

  ws.send(JSON.stringify({
    type: 'unsubscribed',
    subscriptionId,
    timestamp: new Date().toISOString()
  }))
}

async function handleQuery(connectionId: string, message: WebSocketMessage) {
  const ws = connections.get(connectionId)
  if (!ws) return

  try {
    // Execute query using MCP client
    const { MCPClient } = await import('@/lib/mcp-client/mcp-client')
    const client = new MCPClient()
    
    const result = await client.searchLogs(
      message.data.query,
      {
        timePeriodMinutes: message.data.timePeriodMinutes || 60,
        compartmentId: message.data.compartmentId
      }
    )

    ws.send(JSON.stringify({
      type: 'query_result',
      id: message.id,
      data: result,
      timestamp: new Date().toISOString()
    }))

  } catch (error) {
    ws.send(JSON.stringify({
      type: 'error',
      id: message.id,
      error: error instanceof Error ? error.message : 'Query failed',
      timestamp: new Date().toISOString()
    }))
  }
}

function startSecurityEventsSubscription(connectionId: string, subscription: Subscription) {
  const interval = subscription.interval || 30000 // Default 30 seconds
  
  const intervalId = setInterval(async () => {
    const ws = connections.get(connectionId)
    if (!ws || ws.readyState !== ws.OPEN) {
      clearInterval(intervalId)
      return
    }

    try {
      // Get security events
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/mcp/security-events?severity=all&timeRange=30`)
      const events = await response.json()

      ws.send(JSON.stringify({
        type: 'security_events_update',
        subscriptionId: subscription.id,
        data: events,
        timestamp: new Date().toISOString()
      }))
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'subscription_error',
        subscriptionId: subscription.id,
        error: 'Failed to fetch security events',
        timestamp: new Date().toISOString()
      }))
    }
  }, interval)

  // Store interval ID for cleanup
  subscription.intervalId = intervalId
}

function startQueryResultsSubscription(connectionId: string, subscription: Subscription) {
  const interval = subscription.interval || 60000 // Default 60 seconds
  
  const intervalId = setInterval(async () => {
    const ws = connections.get(connectionId)
    if (!ws || ws.readyState !== ws.OPEN) {
      clearInterval(intervalId)
      return
    }

    try {
      // Execute the subscribed query
      const { MCPClient } = await import('@/lib/mcp-client/mcp-client')
      const client = new MCPClient()
      
      const result = await client.searchLogs(
        subscription.filters?.query || '*',
        {
          timePeriodMinutes: subscription.filters?.timePeriodMinutes || 60,
          compartmentId: subscription.filters?.compartmentId
        }
      )

      ws.send(JSON.stringify({
        type: 'query_results_update',
        subscriptionId: subscription.id,
        data: result,
        timestamp: new Date().toISOString()
      }))
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'subscription_error',
        subscriptionId: subscription.id,
        error: 'Failed to execute query',
        timestamp: new Date().toISOString()
      }))
    }
  }, interval)

  subscription.intervalId = intervalId
}

function startHealthStatusSubscription(connectionId: string, subscription: Subscription) {
  const interval = subscription.interval || 10000 // Default 10 seconds
  
  const intervalId = setInterval(async () => {
    const ws = connections.get(connectionId)
    if (!ws || ws.readyState !== ws.OPEN) {
      clearInterval(intervalId)
      return
    }

    try {
      // Get health status
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/mcp/health`)
      const health = await response.json()

      ws.send(JSON.stringify({
        type: 'health_status_update',
        subscriptionId: subscription.id,
        data: health,
        timestamp: new Date().toISOString()
      }))
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'subscription_error',
        subscriptionId: subscription.id,
        error: 'Failed to fetch health status',
        timestamp: new Date().toISOString()
      }))
    }
  }, interval)

  subscription.intervalId = intervalId
}

function startMetricsSubscription(connectionId: string, subscription: Subscription) {
  const interval = subscription.interval || 15000 // Default 15 seconds
  
  const intervalId = setInterval(async () => {
    const ws = connections.get(connectionId)
    if (!ws || ws.readyState !== ws.OPEN) {
      clearInterval(intervalId)
      return
    }

    try {
      // Get metrics from MCP server
      const { MCPClient } = await import('@/lib/mcp-client/mcp-client')
      const client = new MCPClient()
      
      // This would need to be implemented in the MCP client
      // const metrics = await client.getMetrics()

      ws.send(JSON.stringify({
        type: 'metrics_update',
        subscriptionId: subscription.id,
        data: {
          timestamp: new Date().toISOString(),
          message: 'Metrics subscription active'
        },
        timestamp: new Date().toISOString()
      }))
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'subscription_error',
        subscriptionId: subscription.id,
        error: 'Failed to fetch metrics',
        timestamp: new Date().toISOString()
      }))
    }
  }, interval)

  subscription.intervalId = intervalId
}

function stopSubscription(connectionId: string, subscriptionId: string) {
  // Implementation to stop specific subscription
  // This would need to track and clear intervals
}

function generateConnectionId(): string {
  return Math.random().toString(36).substr(2, 9)
}

// Broadcast to all connections
function broadcastToAll(message: any) {
  connections.forEach((ws, connectionId) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(message))
    }
  })
}

// Broadcast to specific subscriptions
function broadcastToSubscription(subscriptionType: string, message: any) {
  subscriptions.forEach((userSubs, connectionId) => {
    userSubs.forEach(subId => {
      // This would need subscription type tracking
      const ws = connections.get(connectionId)
      if (ws && ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          ...message,
          subscriptionId: subId
        }))
      }
    })
  })
}

// Initialize WebSocket server
export function GET(request: NextRequest) {
  try {
    initializeWebSocket()
    
    return new Response(JSON.stringify({
      message: 'WebSocket server running on port 8080',
      endpoint: 'ws://localhost:8080/api/ws',
      status: 'active'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to initialize WebSocket server',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
}