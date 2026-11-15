import { ZodError } from "zod";

import { ApiResponse } from "../utils/ApiResponse.js";
import { AppLogger } from "../utils/logger.js";

import { serverConfig } from "../config/env.js";

export const globalErrorHandler = async (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  let statusCode = error?.statusCode || error?.status || 500;
  let message = error?.message || "Internal Server Error";
  let structuredErrors;

  const errorName = error?.name;
  const errorCode = error?.code;
  const errorMessage = error?.message;
  const isRedisUnavailable =
    errorCode === "ECONNREFUSED" ||
    errorCode === "ETIMEDOUT" ||
    errorCode === "NR_CLOSED" ||
    /stream isn't writeable|redis.*connection.*closed|max retries per request/i.test(
      errorMessage || ""
    );

  if (isRedisUnavailable) {
    statusCode = 503;
    message = "A required service is temporarily unavailable. Please try again.";
  }

  else if (errorName === "VersionError") {
    statusCode = 409;
    message =
      "Resource state conflict encountered. The data was modified by a parallel process.";
  }

  else if (
    errorMessage === "Open" ||
    errorCode === "E_CIRCUIT_OPEN"
  ) {
    statusCode = 503;
    message =
      "Database resources are currently overloaded. Fast-failing via Circuit Breaker.";
  }

  else if (error instanceof ZodError) {
    statusCode = 400;
    message = "Validation Error";

    structuredErrors = {};

    for (const issue of error.issues) {
      structuredErrors[issue.path.join(".")] = issue.message;
    }
  }

  else if (errorCode === 11000) {
    statusCode = 400;

    const field =
      Object.keys(error.keyValue || {})[0] || "field";

    message = `An account/document with this ${field} already exists.`;

    structuredErrors = {
      [field]: `This ${field} is already in use.`
    };
  }

  else if (errorName === "CastError") {
    statusCode = 400;
    message = `Invalid format for resource identifier: ${error.value}`;
  }

  else if (
    error instanceof SyntaxError &&
    error.status === 400 &&
    "body" in error
  ) {
    statusCode = 400;
    message = "Malformed JSON payload format.";
  }

  else if (errorMessage?.toLowerCase().includes("jose")) {
    statusCode = 401;

    message = errorMessage.includes("expired")
      ? "Session expired. Please log in again."
      : "Invalid access token credentials.";
  }

  if (
    typeof statusCode !== "number" ||
    statusCode < 100 ||
    statusCode > 599
  ) {
    statusCode = 500;
  }

  const telemetryContext = {
    statusCode,
    path: req.path.replace(/\/(reset-password|verify-email)\/[^/]+/g, "/$1/[REDACTED]"),
    method: req.method,
    clientIp:
      req.ip || req.socket.remoteAddress,
    userId: req.user?._id,
    validationFields: structuredErrors
  };

  if (
    Array.isArray(error?.errors) &&
    error.errors.length > 0
  ) {
    telemetryContext.subErrors = error.errors.map(
      (err) => ({
        message: err.message,
        path: err.path
      })
    );
  }

  const severity = String(
    error?.severity ||
    (statusCode >= 500 ? "error" : "info")
  ).toLowerCase();

  switch (severity) {
    case "fatal":
      AppLogger.fatal(
        "Catastrophic system block triggered.",
        error,
        telemetryContext
      );
      break;

    case "error":
      AppLogger.error(
        "Unhandled server execution failure.",
        error,
        telemetryContext
      );
      break;

    case "warn":
      AppLogger.warn(
        "Operational warning encountered.",
        telemetryContext
      );
      break;

    default:
      AppLogger.info(
        "Operational request rejected.",
        telemetryContext
      );
  }

  return res.status(statusCode).json(
    new ApiResponse(
      statusCode,
      {
        success: false,
        status: statusCode,
        message,
        errors:
          structuredErrors ||
          (error?.errors?.length
            ? error.errors
            : undefined),
        stack:
          serverConfig.env === "development"
            ? error.stack
            : undefined
      },
      message
    )
  );
};