import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Simple rate limiting implementation
interface RateLimitOptions {
  interval: number
  uniqueTokenPerInterval: number
}

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: Date
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export function rateLimit(options: RateLimitOptions) {
  return {
    check: (identifier: string): RateLimitResult => {
      const now = Date.now()
      const key = identifier
      const windowStart = Math.floor(now / options.interval) * options.interval
      const resetTime = windowStart + options.interval

      const current = rateLimitStore.get(key)
      
      if (!current || current.resetTime <= now) {
        rateLimitStore.set(key, { count: 1, resetTime })
        return {
          success: true,
          limit: options.uniqueTokenPerInterval,
          remaining: options.uniqueTokenPerInterval - 1,
          reset: new Date(resetTime)
        }
      }

      if (current.count >= options.uniqueTokenPerInterval) {
        return {
          success: false,
          limit: options.uniqueTokenPerInterval,
          remaining: 0,
          reset: new Date(resetTime)
        }
      }

      current.count++
      rateLimitStore.set(key, current)

      return {
        success: true,
        limit: options.uniqueTokenPerInterval,
        remaining: options.uniqueTokenPerInterval - current.count,
        reset: new Date(resetTime)
      }
    }
  }
}
