import { redis } from "../config/redis.js";
import { AppLogger } from "../utils/logger.js";

export const CacheService = {
  async get(key) {
    try {
      const data = await redis.get(key);
      if (!data) return null;
      return data;
    } catch (error) {
      AppLogger.error(`Cache read operation failed for key: ${key}`, error);
      throw error;
    }
  },

  async getDel(key) {
    try {
      return await redis.getdel(key);
    } catch (error) {
      AppLogger.error(`Cache read-and-delete operation failed for key: ${key}`, error);
      throw error;
    }
  },

  async set(key, value, ttlInSeconds) {
    if (!Number.isSafeInteger(ttlInSeconds) || ttlInSeconds <= 0) {
      const error = new Error(`Cache injection rejected: Valid positive TTL duration is required. Found: ${ttlInSeconds}`);
      AppLogger.error("Cache argument boundary violation detected", error, { key });
      throw error;
    }
    try {
      const stringifiedValue = typeof value === "object" ? JSON.stringify(value) : String(value);
      await redis.set(key, stringifiedValue, "EX", ttlInSeconds);
      return true;
    } catch (error) {
      AppLogger.error(`Cache write operation failed for key: ${key}`, error);
      throw error;
    }
  },

  async setIfAbsent(key, value, ttlInSeconds) {
    if (!Number.isSafeInteger(ttlInSeconds) || ttlInSeconds <= 0) {
      throw new Error(`Cache injection rejected: Valid positive TTL duration is required. Found: ${ttlInSeconds}`);
    }
    try {
      const stringifiedValue = typeof value === "object" ? JSON.stringify(value) : String(value);
      return (await redis.set(key, stringifiedValue, "EX", ttlInSeconds, "NX")) === "OK";
    } catch (error) {
      AppLogger.error(`Conditional cache write failed for key: ${key}`, error);
      throw error;
    }
  },

  async del(key) {
    try {
      const result = await redis.del(key);
      return result > 0;
    } catch (error) {
      AppLogger.error(`Cache eviction failed for key: ${key}`, error);
      throw error;
    }
  },

  async exists(key) {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      AppLogger.error(`Cache existence check failed for key: ${key}`, error);
      throw error;
    }
  },

  async increment(key) {
    try {
      return await redis.incr(key);
    } catch (error) {
      AppLogger.error(`Cache atomic increment execution failed for key: ${key}`, error);
      throw error;
    }
  },

  async getTTL(key) {
    try {
      const ttl = await redis.ttl(key);

      if (ttl === -2 || ttl === -1) {
        return null;
      }

      return ttl; 
    } catch (error) {
      AppLogger.error(`Cache TTL extraction failed for key: ${key}`, error);
      throw error;
    }
  }
};
