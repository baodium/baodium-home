import type { SreLabKey } from "@/lib/sre/catalog";

/** Display names for the shared request engine. Internal timings stay the same. */
export type ServiceStory = {
  product: string;
  service: string;
  dependency: string;
  client: string;
  clientDetail: string;
  handlerSpan: string;
  dependencySpan: string;
  requestLog: string;
  dependencyLog: string;
  noun: string;
  plural: string;
  run: string;
  runFailures: string;
  handlerButton: string;
  dependencyButton: string;
  path: string;
};

export const SERVICE_STORIES: Record<SreLabKey, ServiceStory> = {
  instrument: {
    product: "Streaming",
    service: "Playback",
    dependency: "Manifest",
    client: "Player",
    clientDetail: "Starts playback",
    handlerSpan: "playback POST /play",
    dependencySpan: "manifest fetch",
    requestLog: "play_ms",
    dependencyLog: "manifest_ms",
    noun: "play start",
    plural: "play starts",
    run: "Run a play start",
    runFailures: "Run failed play starts",
    handlerButton: "Playback handler",
    dependencyButton: "Manifest fetch",
    path: "POST /play",
  },
  slo: {
    product: "Messaging",
    service: "Send",
    dependency: "Fanout",
    client: "App",
    clientDetail: "Sends a message",
    handlerSpan: "send POST /messages",
    dependencySpan: "fanout write",
    requestLog: "send_ms",
    dependencyLog: "fanout_ms",
    noun: "send",
    plural: "sends",
    run: "Run sends",
    runFailures: "Run failed sends",
    handlerButton: "Send handler",
    dependencyButton: "Fanout write",
    path: "POST /messages",
  },
  alert: {
    product: "Search",
    service: "Query",
    dependency: "Index",
    client: "Searcher",
    clientDetail: "Submits a query",
    handlerSpan: "query GET /search",
    dependencySpan: "index read",
    requestLog: "query_ms",
    dependencyLog: "index_ms",
    noun: "query",
    plural: "queries",
    run: "Run queries",
    runFailures: "Run failed queries",
    handlerButton: "Query handler",
    dependencyButton: "Index read",
    path: "GET /search",
  },
  api: {
    product: "API platform",
    service: "Gateway",
    dependency: "Docs service",
    client: "Integrator",
    clientDetail: "Calls a documented endpoint",
    handlerSpan: "gateway GET /v1/resource",
    dependencySpan: "docs upstream",
    requestLog: "api_ms",
    dependencyLog: "docs_ms",
    noun: "API call",
    plural: "API calls",
    run: "Run API calls",
    runFailures: "Run failed API calls",
    handlerButton: "Gateway handler",
    dependencyButton: "Docs upstream",
    path: "GET /v1/resource",
  },
  analytics: {
    product: "Analytics",
    service: "Ingest",
    dependency: "Warehouse",
    client: "Pipeline",
    clientDetail: "Submits an ingest batch",
    handlerSpan: "ingest POST /events",
    dependencySpan: "warehouse write",
    requestLog: "ingest_ms",
    dependencyLog: "warehouse_ms",
    noun: "ingest batch",
    plural: "ingest batches",
    run: "Run ingest batches",
    runFailures: "Run failed ingest batches",
    handlerButton: "Ingest handler",
    dependencyButton: "Warehouse write",
    path: "POST /events",
  },
  cascade: {
    product: "Payments",
    service: "Charge",
    dependency: "Card provider",
    client: "Buyer",
    clientDetail: "Starts a charge",
    handlerSpan: "checkout POST /checkout",
    dependencySpan: "payment charge",
    requestLog: "checkout_ms",
    dependencyLog: "payment_ms",
    noun: "charge",
    plural: "charges",
    run: "Run a charge",
    runFailures: "Run failed charges",
    handlerButton: "Charge handler",
    dependencyButton: "Card provider",
    path: "POST /checkout",
  },
  capacity: {
    product: "Edge / CDN",
    service: "Edge",
    dependency: "Origin",
    client: "Viewer",
    clientDetail: "Requests an object",
    handlerSpan: "edge GET /object",
    dependencySpan: "origin fetch",
    requestLog: "edge_ms",
    dependencyLog: "origin_ms",
    noun: "edge fetch",
    plural: "edge fetches",
    run: "Run edge fetches",
    runFailures: "Run an origin surge",
    handlerButton: "Edge handler",
    dependencyButton: "Origin fetch",
    path: "GET /object",
  },
  deployment: {
    product: "Auth",
    service: "Sign-in",
    dependency: "Session",
    client: "Member",
    clientDetail: "Signs in",
    handlerSpan: "signin POST /session",
    dependencySpan: "session write",
    requestLog: "signin_ms",
    dependencyLog: "session_ms",
    noun: "sign-in",
    plural: "sign-ins",
    run: "Run sign-ins",
    runFailures: "Run failed sign-ins",
    handlerButton: "Sign-in handler",
    dependencyButton: "Session write",
    path: "POST /session",
  },
};

export function serviceStory(id: SreLabKey): ServiceStory {
  return SERVICE_STORIES[id];
}
