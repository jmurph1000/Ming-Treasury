import { logger } from '../utils/logger.js';

interface SessionData {
  userId: string;
  email: string;
  role: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  lastActivity: string;
  expiresAt: number;
}

// In-memory session store
class InMemorySessionStore {
  private sessions: Map<string, SessionData> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private sessionTimeoutMs: number;

  constructor(timeoutMinutes: number = 30) {
    this.sessionTimeoutMs = timeoutMinutes * 60 * 1000;
    this.startCleanupTimer();
    logger.info('In-memory session store initialized', { timeoutMinutes });
  }

  private startCleanupTimer() {
    // Clean up expired sessions every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60000);
  }

  private cleanupExpiredSessions() {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, data] of this.sessions.entries()) {
      if (data.expiresAt < now) {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`Cleaned up ${cleaned} expired sessions`);
    }
  }

  async get(sessionId: string): Promise<SessionData | null> {
    const data = this.sessions.get(sessionId);

    if (!data) {
      return null;
    }

    // Check if expired
    if (data.expiresAt < Date.now()) {
      this.sessions.delete(sessionId);
      return null;
    }

    return data;
  }

  async set(sessionId: string, data: Omit<SessionData, 'expiresAt'>): Promise<void> {
    this.sessions.set(sessionId, {
      ...data,
      expiresAt: Date.now() + this.sessionTimeoutMs,
    });
  }

  async delete(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  async extend(sessionId: string): Promise<boolean> {
    const data = this.sessions.get(sessionId);

    if (!data || data.expiresAt < Date.now()) {
      return false;
    }

    // Extend expiration (sliding window)
    data.expiresAt = Date.now() + this.sessionTimeoutMs;
    data.lastActivity = new Date().toISOString();
    this.sessions.set(sessionId, data);

    return true;
  }

  async deleteAllForUser(userId: string): Promise<number> {
    let deleted = 0;

    for (const [sessionId, data] of this.sessions.entries()) {
      if (data.userId === userId) {
        this.sessions.delete(sessionId);
        deleted++;
      }
    }

    return deleted;
  }

  getStats(): { total: number; active: number } {
    const now = Date.now();
    let active = 0;

    for (const data of this.sessions.values()) {
      if (data.expiresAt >= now) {
        active++;
      }
    }

    return { total: this.sessions.size, active };
  }

  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.sessions.clear();
    logger.info('Session store shut down');
  }
}

// Export singleton instance
const sessionTimeoutMinutes = parseInt(process.env.SESSION_TIMEOUT_MINUTES || '30', 10);
export const sessionStore = new InMemorySessionStore(sessionTimeoutMinutes);

// In-memory rate limit store
const rateLimitStore: Map<string, { count: number; resetAt: number }> = new Map();

// Redis-compatible interface for easy migration later
export const redis = {
  async get(key: string): Promise<string | null> {
    if (key.startsWith('session:')) {
      const sessionId = key.replace('session:', '');
      const data = await sessionStore.get(sessionId);
      return data ? JSON.stringify(data) : null;
    }
    // Rate limit keys
    const rlData = rateLimitStore.get(key);
    if (rlData && rlData.resetAt > Date.now()) {
      return rlData.count.toString();
    }
    return null;
  },

  async set(key: string, value: string, mode?: string, ttl?: number): Promise<void> {
    if (key.startsWith('session:')) {
      const sessionId = key.replace('session:', '');
      const data = JSON.parse(value);
      await sessionStore.set(sessionId, data);
    } else {
      // Rate limit or other keys
      const ttlMs = mode === 'EX' ? (ttl || 60) * 1000 : (ttl || 60000);
      rateLimitStore.set(key, {
        count: parseInt(value, 10) || 0,
        resetAt: Date.now() + ttlMs,
      });
    }
  },

  async del(...keys: string[]): Promise<void> {
    for (const key of keys) {
      if (key.startsWith('session:')) {
        const sessionId = key.replace('session:', '');
        await sessionStore.delete(sessionId);
      } else {
        rateLimitStore.delete(key);
      }
    }
  },

  async pexpire(key: string, ms: number): Promise<void> {
    if (key.startsWith('session:')) {
      const sessionId = key.replace('session:', '');
      await sessionStore.extend(sessionId);
    } else {
      const data = rateLimitStore.get(key);
      if (data) {
        data.resetAt = Date.now() + ms;
      }
    }
  },

  async incr(key: string): Promise<number> {
    const data = rateLimitStore.get(key);
    if (data && data.resetAt > Date.now()) {
      data.count++;
      return data.count;
    }
    // New key - start at 1
    rateLimitStore.set(key, { count: 1, resetAt: Date.now() + 60000 });
    return 1;
  },

  async expire(key: string, seconds: number): Promise<void> {
    const data = rateLimitStore.get(key);
    if (data) {
      data.resetAt = Date.now() + seconds * 1000;
    }
  },

  async ttl(key: string): Promise<number> {
    const data = rateLimitStore.get(key);
    if (data && data.resetAt > Date.now()) {
      return Math.ceil((data.resetAt - Date.now()) / 1000);
    }
    return -1;
  },

  async keys(pattern: string): Promise<string[]> {
    // Simple pattern matching for session keys
    if (pattern.includes('*')) {
      const prefix = pattern.replace('*', '');
      const result: string[] = [];
      // This is a simplified implementation
      return result;
    }
    return [];
  },
};
