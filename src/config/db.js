import mongoose from "mongoose";
import { AppLogger } from "../utils/logger.js";
import { dbConfig, serverConfig } from "./env.js";



export const connectDB = async () => {
  const uri = dbConfig.mongo.uri;
  if (!uri) {
    AppLogger.fatal("Application boot blocked: MONGODB_URI is missing from environment variables.", new Error("MONGODB_URI missing from env"), { component: "MongoDB" });
    process.exit(1);
  }

  const processType = serverConfig.processType;

  let poolOptions = {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 30000,
    maxIdleTimeMS: 30000,
  }
  if (processType === "api_server") {
    poolOptions.minPoolSize = 5;
    poolOptions.maxPoolSize = 50;
  } else if (processType.includes("worker") || processType.includes("sync")) {
    poolOptions.minPoolSize = 3;
    poolOptions.maxPoolSize = 10;
  } else {
    poolOptions.minPoolSize = 1;
    poolOptions.maxPoolSize = 5;
  }

  try {
    await mongoose.connect(uri, poolOptions);
  } catch (error) {
    AppLogger.fatal("Application boot failed: Database cluster connection handshakes refused", error, { component: "MongoDB" });
    process.exit(1);
  }
};

mongoose.connection.on("error", (error) => {
  AppLogger.error("Live database runtime engine encountered a connection pool execution fault", error, { component: "MongoDB" });
});

mongoose.connection.on("disconnected", () => {
  AppLogger.warn("Database connection socket channel dropped state. State: DISCONNECTED", { component: "MongoDB" });
});

mongoose.connection.on("connected", () => {
  AppLogger.info("Database connection socket channel established. State: CONNECTED", { component: "MongoDB" });
});

export const closeDB = async () => {
  AppLogger.info("Initiating clean disconnection sequence on database cluster connection pool layers", { component: "MongoDB" });
  await mongoose.connection.close();
};
