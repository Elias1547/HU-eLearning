import crypto from 'crypto'
import jwt from 'jsonwebtoken'

export interface StreamCredentials {
  streamId: string
  streamKey: string
  chatSecret: string
  rtmpUrl?: string
  hlsUrl?: string
  webRtcUrl?: string
  dashUrl?: string
}

export interface JWTPayload {
  streamId: string
  userId: string
  role: 'teacher' | 'student' | 'admin'
  permissions: string[]
  sessionId: string
  deviceId?: string
  ipAddress?: string
  userAgent?: string
  iat?: number
  exp?: number
  nbf?: number
}

export interface StreamAnalytics {
  streamId: string
  viewerCount: number
  peakViewers: number
  averageWatchTime: number
  chatMessages: number
  qualitySwitches: number
  bufferingEvents: number
  errors: number
  startedAt: Date
  endedAt?: Date
  bandwidth: {
    incoming: number
    outgoing: number
  }
  regions: Record<string, number>
  devices: Record<string, number>
}

export interface StreamQuality {
  label: string
  value: string
  bitrate: number
  resolution: string
  framerate: number
  codec: string
}

export interface StreamConfig {
  maxViewers: number
  recordingEnabled: boolean
  chatEnabled: boolean
  qualityOptions: StreamQuality[]
  adaptiveBitrate: boolean
  lowLatency: boolean
  backupStream: boolean
  geoBlocking?: string[]
  contentFiltering?: boolean
  moderationEnabled?: boolean
  transcoding?: {
    enabled: boolean
    qualities: string[]
    watermark?: {
      enabled: boolean
      text?: string
      image?: string
      position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
    }
  }
}

export interface ConnectionHealth {
  streamId: string
  status: 'excellent' | 'good' | 'poor' | 'critical'
  latency: number
  bandwidth: number
  packetLoss: number
  jitter: number
  bufferHealth: number
  qualityScore: number
  lastUpdated: Date
}

export class ZenStreamService {
  private static instance: ZenStreamService
  private analytics: Map<string, StreamAnalytics> = new Map()
  private rateLimitCache: Map<string, { count: number; resetTime: number }> = new Map()
  private activeSessions: Map<string, Set<string>> = new Map()
  private connectionHealth: Map<string, ConnectionHealth> = new Map()
  private retryAttempts: Map<string, number> = new Map()
  private circuitBreaker: Map<string, { failures: number; lastFailure: number; state: 'closed' | 'open' | 'half-open' }> = new Map()

  private constructor() {
    // Cleanup old entries every hour
    setInterval(() => {
      this.cleanup()
    }, 3600000)
  }

  static getInstance(): ZenStreamService {
    if (!ZenStreamService.instance) {
      ZenStreamService.instance = new ZenStreamService()
    }
    return ZenStreamService.instance
  }

  private cleanup(): void {
    const now = Date.now()
    const oneHour = 3600000

    // Cleanup rate limit cache
    for (const [key, data] of this.rateLimitCache.entries()) {
      if (now > data.resetTime) {
        this.rateLimitCache.delete(key)
      }
    }

    // Cleanup circuit breaker
    for (const [key, breaker] of this.circuitBreaker.entries()) {
      if (now - breaker.lastFailure > oneHour) {
        this.circuitBreaker.delete(key)
      }
    }
  }

  async generateStreamCredentials(
    userId?: string, 
    config?: Partial<StreamConfig>
  ): Promise<StreamCredentials> {
    const timestamp = Date.now()
    const randomId = crypto.randomBytes(16).toString('hex')
    const streamId = `${process.env.ZENSTREAM_STREAM_ID || 'edulearn'}-${timestamp}-${randomId}`
    
    // Generate cryptographically secure credentials
    const streamKey = this.generateSecureKey(48)
    const chatSecret = this.generateSecureKey(64)
    
    const baseUrl = process.env.ZENSTREAM_BASE_URL || 'https://stream.edulearn.com'
    const rtmpUrl = `${process.env.ZENSTREAM_RTMP_URL || 'rtmp://ingest.edulearn.com/live'}/${streamKey}`
    const hlsUrl = `${baseUrl}/hls/${streamId}/playlist.m3u8`
    const webRtcUrl = `${process.env.ZENSTREAM_WEBRTC_URL || 'wss://webrtc.edulearn.com'}/${streamId}`
    const dashUrl = `${baseUrl}/dash/${streamId}/manifest.mpd`

    const credentials: StreamCredentials = {
      streamId,
      streamKey,
      chatSecret,
      rtmpUrl,
      hlsUrl,
      webRtcUrl,
      dashUrl
    }

    // Initialize analytics
    await this.initializeStreamAnalytics(streamId, config)
    
    // Initialize connection health monitoring
    this.initializeConnectionHealth(streamId)

    return credentials
  }

  private generateSecureKey(length: number): string {
    return crypto.randomBytes(length).toString('base64url')
  }

  private async initializeStreamAnalytics(streamId: string, config?: Partial<StreamConfig>): Promise<void> {
    this.analytics.set(streamId, {
      streamId,
      viewerCount: 0,
      peakViewers: 0,
      averageWatchTime: 0,
      chatMessages: 0,
      qualitySwitches: 0,
      bufferingEvents: 0,
      errors: 0,
      startedAt: new Date(),
      bandwidth: {
        incoming: 0,
        outgoing: 0
      },
      regions: {},
      devices: {}
    })
  }

  private initializeConnectionHealth(streamId: string): void {
    this.connectionHealth.set(streamId, {
      streamId,
      status: 'good',
      latency: 0,
      bandwidth: 0,
      packetLoss: 0,
      jitter: 0,
      bufferHealth: 100,
      qualityScore: 80,
      lastUpdated: new Date()
    })
  }

  async generateJWT(
    streamId: string, 
    userId: string, 
    role: 'teacher' | 'student' | 'admin',
    permissions: string[] = [],
    options?: {
      expiresIn?: string
      deviceId?: string
      ipAddress?: string
      userAgent?: string
    }
  ): Promise<string> {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required')
    }

    // Check rate limiting
    const rateLimitKey = `${userId}-${streamId}`
    if (!this.checkRateLimit(rateLimitKey)) {
      throw new Error('Rate limit exceeded. Please try again later.')
    }

    // Check circuit breaker
    if (!this.checkCircuitBreaker(streamId)) {
      throw new Error('Service temporarily unavailable. Please try again later.')
    }

    const sessionId = crypto.randomUUID()
    const now = Math.floor(Date.now() / 1000)

    const payload: JWTPayload = {
      streamId,
      userId,
      role,
      permissions,
      sessionId,
      deviceId: options?.deviceId,
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
      iat: now,
      nbf: now,
      exp: now + this.getTokenExpiration(options?.expiresIn || '1h')
    }

    try {
      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        algorithm: 'HS256',
        issuer: 'edulearn-streaming',
        audience: 'edulearn-client'
      })

      // Track active session
      if (!this.activeSessions.has(streamId)) {
        this.activeSessions.set(streamId, new Set())
      }
      this.activeSessions.get(streamId)!.add(sessionId)

      return token
    } catch (error) {
      this.recordFailure(streamId)
      throw new Error('Failed to generate authentication token')
    }
  }

  private checkRateLimit(key: string, limit: number = 10, windowMs: number = 60000): boolean {
    const now = Date.now()
    const entry = this.rateLimitCache.get(key)

    if (!entry || now > entry.resetTime) {
      this.rateLimitCache.set(key, {
        count: 1,
        resetTime: now + windowMs
      })
      return true
    }

    if (entry.count >= limit) {
      return false
    }

    entry.count++
    return true
  }

  private checkCircuitBreaker(streamId: string): boolean {
    const breaker = this.circuitBreaker.get(streamId)
    
    if (!breaker) {
      return true
    }

    const now = Date.now()
    const timeout = 60000 // 1 minute

    switch (breaker.state) {
      case 'closed':
        return true
      case 'open':
        if (now - breaker.lastFailure > timeout) {
          breaker.state = 'half-open'
          return true
        }
        return false
      case 'half-open':
        return true
      default:
        return true
    }
  }

  private recordFailure(streamId: string): void {
    const breaker = this.circuitBreaker.get(streamId) || {
      failures: 0,
      lastFailure: 0,
      state: 'closed' as const
    }

    breaker.failures++
    breaker.lastFailure = Date.now()

    if (breaker.failures >= 5) {
      breaker.state = 'open'
    }

    this.circuitBreaker.set(streamId, breaker)
  }

  private getTokenExpiration(expiresIn: string): number {
    const unit = expiresIn.slice(-1)
    const value = parseInt(expiresIn.slice(0, -1))

    switch (unit) {
      case 's': return value
      case 'm': return value * 60
      case 'h': return value * 3600
      case 'd': return value * 86400
      default: return 3600 // 1 hour default
    }
  }

  async validateJWT(token: string): Promise<JWTPayload | null> {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required')
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET, {
        algorithms: ['HS256'],
        issuer: 'edulearn-streaming',
        audience: 'edulearn-client'
      }) as JWTPayload

      // Check if session is still active
      const streamSessions = this.activeSessions.get(decoded.streamId)
      if (!streamSessions?.has(decoded.sessionId)) {
        return null
      }

      return decoded
    } catch (error) {
      console.error('JWT validation failed:', error)
      return null
    }
  }

  async updateConnectionHealth(
    streamId: string, 
    metrics: Partial<Omit<ConnectionHealth, 'streamId' | 'lastUpdated'>>
  ): Promise<void> {
    const health = this.connectionHealth.get(streamId)
    if (!health) return

    Object.assign(health, metrics, { lastUpdated: new Date() })

    // Calculate overall status
    health.status = this.calculateConnectionStatus(health)

    this.connectionHealth.set(streamId, health)
  }

  private calculateConnectionStatus(health: ConnectionHealth): 'excellent' | 'good' | 'poor' | 'critical' {
    let score = 100

    // Deduct points based on metrics
    if (health.latency > 200) score -= 20
    else if (health.latency > 100) score -= 10

    if (health.packetLoss > 5) score -= 30
    else if (health.packetLoss > 2) score -= 15

    if (health.jitter > 50) score -= 20
    else if (health.jitter > 20) score -= 10

    if (health.bufferHealth < 50) score -= 25
    else if (health.bufferHealth < 75) score -= 10

    if (score >= 80) return 'excellent'
    if (score >= 60) return 'good'
    if (score >= 40) return 'poor'
    return 'critical'
  }

  async updateStreamAnalytics(
    streamId: string, 
    updates: Partial<StreamAnalytics>
  ): Promise<void> {
    const analytics = this.analytics.get(streamId)
    if (!analytics) return

    // Apply updates
    Object.assign(analytics, updates)

    // Update peak viewers if current is higher
    if (updates.viewerCount && updates.viewerCount > analytics.peakViewers) {
      analytics.peakViewers = updates.viewerCount
    }

    this.analytics.set(streamId, analytics)
  }

  getStreamAnalytics(streamId: string): StreamAnalytics | null {
    return this.analytics.get(streamId) || null
  }

  getConnectionHealth(streamId: string): ConnectionHealth | null {
    return this.connectionHealth.get(streamId) || null
  }

  async endStream(streamId: string): Promise<void> {
    // End analytics tracking
    const analytics = this.analytics.get(streamId)
    if (analytics) {
      analytics.endedAt = new Date()
      this.analytics.set(streamId, analytics)
    }

    // Clean up active sessions
    this.activeSessions.delete(streamId)

    // Clean up connection health
    this.connectionHealth.delete(streamId)

    // Reset retry attempts
    this.retryAttempts.delete(streamId)
  }

  async getDefaultStreamQualities(): Promise<StreamQuality[]> {
    return [
      {
        label: '360p',
        value: '360p',
        bitrate: 800000,
        resolution: '640x360',
        framerate: 30,
        codec: 'h264'
      },
      {
        label: '480p',
        value: '480p',
        bitrate: 1200000,
        resolution: '854x480',
        framerate: 30,
        codec: 'h264'
      },
      {
        label: '720p',
        value: '720p',
        bitrate: 2500000,
        resolution: '1280x720',
        framerate: 30,
        codec: 'h264'
      },
      {
        label: '1080p',
        value: '1080p',
        bitrate: 5000000,
        resolution: '1920x1080',
        framerate: 30,
        codec: 'h264'
      }
    ]
  }

  async retryOperation<T>(
    streamId: string,
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation()
        
        // Reset retry count on success
        this.retryAttempts.delete(streamId)
        
        return result
      } catch (error) {
        lastError = error as Error
        
        if (attempt === maxRetries) {
          this.recordFailure(streamId)
          break
        }

        // Exponential backoff
        const backoffDelay = delay * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, backoffDelay))
      }
    }

    throw lastError!
  }

  // Health check method
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    activeStreams: number
    activeSessions: number
    circuitBreakers: number
    uptime: number
  }> {
    const startTime = process.uptime() * 1000
    const activeStreams = this.analytics.size
    const activeSessions = Array.from(this.activeSessions.values())
      .reduce((total, sessions) => total + sessions.size, 0)
    const openCircuitBreakers = Array.from(this.circuitBreaker.values())
      .filter(cb => cb.state === 'open').length

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    
    if (openCircuitBreakers > activeStreams * 0.5) {
      status = 'unhealthy'
    } else if (openCircuitBreakers > 0) {
      status = 'degraded'
    }

    return {
      status,
      activeStreams,
      activeSessions,
      circuitBreakers: openCircuitBreakers,
      uptime: startTime
    }
  }

  // Additional utility methods
  generateStreamUrls(streamId: string, token: string) {
    const baseUrl = process.env.NEXT_PUBLIC_ZENSTREAM_BASE_URL || 'https://stream.edulearn.com'
    
    return {
      playerUrl: `${baseUrl}/player?liveId=${streamId}&token=${token}`,
      chatUrl: `${baseUrl}/chat?liveId=${streamId}&token=${token}`,
      webRtcUrl: `${baseUrl}/webrtc?liveId=${streamId}&token=${token}`,
      recordingUrl: `${baseUrl}/recording?liveId=${streamId}&token=${token}`,
      analyticsUrl: `${baseUrl}/analytics?liveId=${streamId}&token=${token}`
    }
  }

  incrementViewerCount(streamId: string): void {
    const analytics = this.analytics.get(streamId)
    if (analytics) {
      analytics.viewerCount++
      if (analytics.viewerCount > analytics.peakViewers) {
        analytics.peakViewers = analytics.viewerCount
      }
      this.analytics.set(streamId, analytics)
    }
  }

  decrementViewerCount(streamId: string): void {
    const analytics = this.analytics.get(streamId)
    if (analytics && analytics.viewerCount > 0) {
      analytics.viewerCount--
      this.analytics.set(streamId, analytics)
    }
  }

  getActiveSessionsCount(streamId: string): number {
    return this.activeSessions.get(streamId)?.size || 0
  }

  // Static methods for convenience
  static async createStream(userId?: string, config?: Partial<StreamConfig>): Promise<StreamCredentials> {
    return ZenStreamService.getInstance().generateStreamCredentials(userId, config)
  }

  static async generateToken(
    streamId: string,
    userId: string,
    role: 'teacher' | 'student' | 'admin',
    permissions: string[] = []
  ): Promise<string> {
    return ZenStreamService.getInstance().generateJWT(streamId, userId, role, permissions)
  }

  static async validateToken(token: string): Promise<JWTPayload | null> {
    return ZenStreamService.getInstance().validateJWT(token)
  }

  static getAnalytics(streamId: string): StreamAnalytics | null {
    return ZenStreamService.getInstance().getStreamAnalytics(streamId)
  }

  static async getHealthStatus() {
    return ZenStreamService.getInstance().healthCheck()
  }
}

// Export singleton instance
export const zenStreamService = ZenStreamService.getInstance()
