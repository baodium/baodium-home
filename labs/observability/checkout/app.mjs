import { sdk } from './telemetry.mjs';
import express from 'express';
import client from 'prom-client';
import { context, propagation, trace, SpanKind, SpanStatusCode, ROOT_CONTEXT } from '@opentelemetry/api';
const app=express();app.use(express.json({limit:'2kb'}));
const tracer=trace.getTracer('baodium-checkout');
const registry=new client.Registry();
const requests=new client.Counter({name:'baodium_checkout_requests_total',help:'Finished checkout requests by HTTP status',labelNames:['status'],registers:[registry]});
const latency=new client.Histogram({name:'baodium_checkout_duration_seconds',help:'Checkout latency in seconds',buckets:[.025,.05,.1,.25,.5,1,2,5],registers:[registry]});
const active=new client.Gauge({name:'baodium_checkout_active_requests',help:'Checkouts currently waiting for payment',registers:[registry]});
const payment=process.env.PAYMENT_URL??'http://payment:8000';
app.get('/health',(_req,res)=>res.json({status:'ready',service:'baodium-checkout'}));
app.get('/metrics',async(_req,res)=>res.type(registry.contentType).send(await registry.metrics()));
app.post('/checkout',async(req,res)=>{
 const parent=propagation.extract(ROOT_CONTEXT,req.headers);
 await context.with(parent,()=>tracer.startActiveSpan('POST /checkout',{kind:SpanKind.SERVER},async span=>{
  const end=latency.startTimer();active.inc();let status=200;
  try{
   const upstream=await tracer.startActiveSpan('payment.request',{kind:SpanKind.CLIENT},async child=>{
    const headers={};propagation.inject(context.active(),headers);
    try{const response=await fetch(payment+'/charge',{method:'POST',headers,signal:AbortSignal.timeout(1500)});child.setAttribute('http.response.status_code',response.status);if(!response.ok)child.setStatus({code:SpanStatusCode.ERROR});return response;}
    catch(error){child.recordException(error);child.setStatus({code:SpanStatusCode.ERROR});throw error;}
    finally{child.end();}
   });
   status=upstream.ok?200:502;
  }catch(error){status=504;span.recordException(error);}
  finally{
   requests.inc({status:String(status)});active.dec();const duration=end();
   span.setAttribute('http.response.status_code',status);if(status>=500)span.setStatus({code:SpanStatusCode.ERROR});
   const {traceId,spanId}=span.spanContext();
   console.log(JSON.stringify({time:new Date().toISOString(),service:'checkout',event:'checkout.finished',status,duration_ms:Math.round(duration*1000),trace_id:traceId,span_id:spanId}));
   res.status(status).json({status:status===200?'paid':'payment_unavailable',traceId});span.end();
  }
 }));
});
app.get('/lab/config',async(_req,res)=>{try{const r=await fetch(payment+'/config');res.status(r.status).json(await r.json());}catch{res.status(503).json({error:'Payment service unavailable'});}});
app.post('/lab/config',async(req,res)=>{
 const {delayMs,failEvery}=req.body??{};
 if(!Number.isInteger(delayMs)||delayMs<0||delayMs>3000||!Number.isInteger(failEvery)||failEvery<0||failEvery>20)return res.status(400).json({error:'delayMs must be 0–3000; failEvery must be 0–20, both integers.'});
 try{const r=await fetch(payment+'/config',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({delayMs,failEvery})});res.status(r.status).json(await r.json());}catch{res.status(503).json({error:'Payment service unavailable'});}
});
const server=app.listen(4319,'0.0.0.0',()=>console.log(JSON.stringify({service:'checkout',event:'ready',port:4319})));
process.on('SIGTERM',()=>server.close(async()=>{await sdk.shutdown();process.exit(0);}));
