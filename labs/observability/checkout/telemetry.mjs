import { NodeSDK } from '@opentelemetry/sdk-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
process.env.OTEL_BSP_SCHEDULE_DELAY ??= '500';
export const sdk = new NodeSDK({
  resource: resourceFromAttributes({ 'service.name':'baodium-checkout' }),
  traceExporter: new OTLPTraceExporter({url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ?? 'http://jaeger:4318/v1/traces'}),
});
sdk.start();
