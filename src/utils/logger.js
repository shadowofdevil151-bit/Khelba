import { getContextLogger } from "../config/context.js";

export const AppLogger = {
  info(message, metadata = {}) {
    getContextLogger().info(metadata, message);
  },

  warn(message, metadata = {}) {
    getContextLogger().warn(metadata, message);
  },

  debug(message, metadata = {}) {
    getContextLogger().debug(metadata, message);
  },

  error(message, error, extraMetadata = {}) {
    const logPayload = { ...extraMetadata };
    if (error) logPayload.err = error instanceof Error ? error : new Error(String(error));
    getContextLogger().error(logPayload, message);
  },

  fatal(message, error, extraMetadata = {}) {
    const logPayload = { ...extraMetadata };
    if (error) logPayload.err = error instanceof Error ? error : new Error(String(error));
    getContextLogger().fatal(logPayload, message);
  }
};
