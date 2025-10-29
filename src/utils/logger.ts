/**
 * Logging utility for ModelKombat
 *
 * In development: logs to console
 * In production: can be configured to send to error tracking service
 */

interface LogContext {
  [key: string]: unknown
}

class Logger {
  private isDevelopment = import.meta.env.DEV

  /**
   * Log debug information (only in development)
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.debug(`[DEBUG] ${message}`, context || '')
    }
  }

  /**
   * Log informational messages
   */
  info(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.info(`[INFO] ${message}`, context || '')
    }
    // In production, send to analytics/monitoring service
    // this.sendToMonitoring('info', message, context)
  }

  /**
   * Log warnings
   */
  warn(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.warn(`[WARN] ${message}`, context || '')
    } else {
      // In production, send to error tracking
      // this.sendToErrorTracking('warn', message, context)
    }
  }

  /**
   * Log errors
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorInfo = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : error

    if (this.isDevelopment) {
      console.error(`[ERROR] ${message}`, errorInfo, context || '')
    } else {
      // In production, send to error tracking (e.g., Sentry)
      // if (window.Sentry) {
      //   window.Sentry.captureException(error, {
      //     tags: { ...context },
      //     extra: { message },
      //   })
      // }
    }
  }

  /**
   * Log API calls (useful for debugging)
   */
  apiCall(method: string, endpoint: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.log(`[API] ${method} ${endpoint}`, context || '')
    }
  }

  /**
   * Log authentication events
   */
  auth(event: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.log(`[AUTH] ${event}`, context || '')
    }
    // In production, send to analytics
  }

  /**
   * Performance timing logs
   */
  performance(label: string, duration: number): void {
    if (this.isDevelopment) {
      console.log(`[PERF] ${label}: ${duration}ms`)
    }
  }

  /**
   * Group logs together (development only)
   */
  group(label: string, callback: () => void): void {
    if (this.isDevelopment) {
      console.group(label)
      callback()
      console.groupEnd()
    }
  }

  // Helper to send to external monitoring service
  // private sendToMonitoring(level: LogLevel, message: string, context?: LogContext): void {
  //   // Implement integration with your monitoring service
  //   // Examples: Datadog, LogRocket, etc.
  // }

  // private sendToErrorTracking(level: LogLevel, message: string, context?: LogContext): void {
  //   // Implement integration with error tracking
  //   // Example: Sentry, Rollbar, etc.
  // }
}

// Export singleton instance
export const logger = new Logger()

// Export type for use in other files
export type { LogContext }
