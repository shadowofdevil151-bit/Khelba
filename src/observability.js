import "dotenv/config";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { PinoInstrumentation } from "@opentelemetry/instrumentation-pino";
import { RuntimeNodeInstrumentation } from "@opentelemetry/instrumentation-runtime-node";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";

const sdk = new NodeSDK({
    serviceName: process.env.OTEL_SERVICE_NAME || process.env.PROCESS_TYPE || "khelba",
    logRecordProcessors: [
        new BatchLogRecordProcessor({
            exporter: new OTLPLogExporter()
        })
    ],
    metricReaders: [
        new PeriodicExportingMetricReader({
            exporter: new OTLPMetricExporter(),
            exportIntervalMillis: 10000
        })
    ],
    instrumentations: [
        new HttpInstrumentation(),
        new PinoInstrumentation({ disableLogSending: false }),
        new RuntimeNodeInstrumentation()
    ]
});

sdk.start();

export const shutdownTelemetry = () => sdk.shutdown();
