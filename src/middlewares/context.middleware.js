import crypto from "crypto";
import pinoHttp from "pino-http";
import { asyncLogStore } from "../config/context.js";
import { logger as rootLogger } from "../config/logger.js";

const httpLogger = pinoHttp({
  logger: rootLogger,
  genReqId: (req) => req.headers["x-request-id"] || crypto.randomUUID(),

  customProps: (req) => ({
    http: {
      method: req.method,
      url: req.url,
      ip: req.ip || req.socket.remoteAddress
    }
  }),

  customSuccessMessage: (req, res, responseTime) => `HTTP ${req.method} ${req.url} completed`,
  customErrorMessage: (req, res, error) => `HTTP ${req.method} ${req.url} failed`,

  serializers: {
    req: pinoHttp.stdSerializers.req,
    res: pinoHttp.stdSerializers.res,
    err: pinoHttp.stdSerializers.err,
  }
});

export const contextMiddleware = (req, res, next) => {
  httpLogger(req, res, () => {
    res.setHeader("X-Request-ID", req.id);

    const storeContext = {
      reqId: req.id,
      logger: req.log
    };

    asyncLogStore.run(storeContext, next);
  });
};
