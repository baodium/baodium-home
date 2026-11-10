import asyncio
import json
from datetime import datetime, timezone
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.resources import Resource
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.trace import SpanKind, Status, StatusCode
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator
import os

provider = TracerProvider(resource=Resource.create({"service.name": "baodium-payment"}))
provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter(endpoint=os.getenv("OTEL_EXPORTER_OTLP_TRACES_ENDPOINT", "http://jaeger:4318/v1/traces")), schedule_delay_millis=500))
trace.set_tracer_provider(provider)
tracer = trace.get_tracer("baodium-payment")
app = FastAPI(telemetry={"tracing": False})
class Configuration(BaseModel):
    delayMs: int = Field(default=40, ge=0, le=3000)
    failEvery: int = Field(default=0, ge=0, le=20)
config = Configuration()
sequence = 0
@app.get("/health")
def health():
    return {"status": "ready", "service": "baodium-payment"}
@app.get("/config")
def configuration():
    return config.model_dump()
@app.post("/config")
def configure(value: Configuration):
    global config
    config = value
    print(json.dumps({"service":"payment", "event":"configuration.changed", **config.model_dump()}), flush=True)
    return config.model_dump()
@app.post("/charge")
async def charge(request: Request):
    global sequence
    sequence += 1
    request_number = sequence
    settings = config.model_copy()
    parent = TraceContextTextMapPropagator().extract(dict(request.headers))
    with tracer.start_as_current_span("POST /charge", context=parent, kind=SpanKind.SERVER) as span:
        await asyncio.sleep(settings.delayMs / 1000)
        status = 500 if settings.failEvery and request_number % settings.failEvery == 0 else 200
        span.set_attribute("http.response.status_code", status)
        if status >= 500:
            span.set_status(Status(StatusCode.ERROR, "Injected payment failure"))
        ctx = span.get_span_context()
        print(json.dumps({"time":datetime.now(timezone.utc).isoformat(),"service":"payment","event":"charge.finished","status":status,"delay_ms":settings.delayMs,"trace_id":format(ctx.trace_id,"032x"),"span_id":format(ctx.span_id,"016x")}), flush=True)
        return JSONResponse({"status":"charged" if status == 200 else "injected_failure"}, status_code=status)
