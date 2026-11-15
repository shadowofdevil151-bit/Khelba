import { AsyncLocalStorage } from "async_hooks";
import { logger as rootLogger } from "./logger.js";
import { serverConfig } from "./env.js";

export const asyncLogStore = new AsyncLocalStorage();

const fallbackContextId = `system_${serverConfig.processType}`;

export const getContextLogger = () => {
    return asyncLogStore.getStore()?.logger || rootLogger;
};

export const getContextReqId = () => {
    return asyncLogStore.getStore()?.reqId || fallbackContextId;
};
