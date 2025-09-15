import { config } from '../config/environment';

interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: any;
  userAgent?: string;
  url?: string;
}

class ErrorLogger {
  private logs: LogEntry[] = [];
  private readonly MAX_LOGS = 1000;
  private readonly STORAGE_KEY = 'fergbutcher_error_logs';

  constructor() {
    this.loadStoredLogs();
  }

  // Log debug message
  debug(message: string, context?: any) {
    if (this.shouldLog('debug')) {
      this.addLog('debug', message, context);
    }
  }

  // Log info message
  info(message: string, context?: any) {
    if (this.shouldLog('info')) {
      this.addLog('info', message, context);
    }
  }

  // Log warning
  warn(message: string, context?: any) {
    if (this.shouldLog('warn')) {
      this.addLog('warn', message, context);
    }
  }

  // Log error
  error(message: string, error?: any, context?: any) {
    if (this.shouldLog('error')) {
      const errorContext = {
        ...context,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : error,
      };
      this.addLog('error', message, errorContext);
    }
  }

  // Add log entry
  private addLog(level: LogEntry['level'], message: string, context?: any) {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    this.logs.unshift(logEntry);

    // Keep only the most recent logs
    if (this.logs.length > this.MAX_LOGS) {
      this.logs = this.logs.slice(0, this.MAX_LOGS);
    }

    // Console output
    this.outputToConsole(logEntry);

    // Store logs
    this.storeLogs();

    // Send to external service if enabled
    if (config.features.errorReporting && level === 'error') {
      this.reportError(logEntry);
    }
  }

  // Check if we should log at this level
  private shouldLog(level: LogEntry['level']): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const configLevel = config.app.logLevel;
    const currentLevelIndex = levels.indexOf(level);
    const configLevelIndex = levels.indexOf(configLevel);
    
    return currentLevelIndex >= configLevelIndex;
  }

  // Output to browser console
  private outputToConsole(logEntry: LogEntry) {
    const timestamp = new Date(logEntry.timestamp).toLocaleTimeString('en-NZ');
    const prefix = `[${timestamp}] [${logEntry.level.toUpperCase()}]`;
    
    switch (logEntry.level) {
      case 'debug':
        console.debug(prefix, logEntry.message, logEntry.context);
        break;
      case 'info':
        console.info(prefix, logEntry.message, logEntry.context);
        break;
      case 'warn':
        console.warn(prefix, logEntry.message, logEntry.context);
        break;
      case 'error':
        console.error(prefix, logEntry.message, logEntry.context);
        break;
    }
  }

  // Store logs in localStorage
  private storeLogs() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.logs));
    } catch (error) {
      console.error('Failed to store logs:', error);
    }
  }

  // Load stored logs
  private loadStoredLogs() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load stored logs:', error);
    }
  }

  // Report error to external service (placeholder)
  private reportError(logEntry: LogEntry) {
    // In a real implementation, you would send this to an error reporting service
    // like Sentry, LogRocket, or a custom endpoint
    console.log('Would report error to external service:', logEntry);
  }

  // Get logs for display
  getLogs(level?: LogEntry['level'], limit?: number): LogEntry[] {
    let filteredLogs = this.logs;
    
    if (level) {
      filteredLogs = this.logs.filter(log => log.level === level);
    }
    
    if (limit) {
      filteredLogs = filteredLogs.slice(0, limit);
    }
    
    return filteredLogs;
  }

  // Clear all logs
  clearLogs() {
    this.logs = [];
    this.storeLogs();
  }

  // Export logs as JSON
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Get log statistics
  getLogStats() {
    const stats = {
      total: this.logs.length,
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
    };

    this.logs.forEach(log => {
      stats[log.level]++;
    });

    return stats;
  }
}

// Global error handler
window.addEventListener('error', (event) => {
  errorLogger.error('Uncaught error', event.error, {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  errorLogger.error('Unhandled promise rejection', event.reason);
});

export const errorLogger = new ErrorLogger();
export default errorLogger;