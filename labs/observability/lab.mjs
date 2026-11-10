#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=path.dirname(fileURLToPath(import.meta.url));
const ports={api:process.env.BAODIUM_API_PORT??4319,prometheus:process.env.BAODIUM_PROMETHEUS_PORT??9097,grafana:process.env.BAODIUM_GRAFANA_PORT??3007,jaeger:process.env.BAODIUM_JAEGER_PORT??16697};
const url=(service,route)=>`http://127.0.0.1:${ports[service]}${route}`;
const command=process.argv[2]??'help';
const pause=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));
async function json(service,route,options){const response=await fetch(url(service,route),{signal:AbortSignal.timeout(6000),...options});if(!response.ok)throw new Error(`${service} ${route}: HTTP ${response.status}`);return response.json();}
function compose(args,capture=false){const result=spawnSync('docker',['compose','-f',path.join(root,'compose.yml'),...args],{cwd:root,encoding:'utf8',stdio:capture?'pipe':'inherit'});if(result.error)throw result.error;if(result.status!==0)throw new Error(capture?result.stderr:`Docker Compose exited ${result.status}`);return result.stdout;}
export async function traffic(seconds=10){
 const end=Date.now()+seconds*1000;let success=0,failed=0,lastTrace;
 await Promise.all(Array.from({length:4},async()=>{while(Date.now()<end){try{const response=await fetch(url('api','/checkout'),{method:'POST',signal:AbortSignal.timeout(4000)});const data=await response.json();lastTrace=data.traceId;if(response.ok)success++;else failed++;}catch{failed++;}await pause(50);}}));
 return {success,failed,lastTrace};
}
async function configure(settings){return json('api','/lab/config',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(settings)});}
async function query(expression){const response=await json('prometheus','/api/v1/query?query='+encodeURIComponent(expression));if(response.status!=='success')throw new Error(response.error??'PromQL query failed');return response.data.result;}
async function poll(check,timeout=25000){const end=Date.now()+timeout;let last;while(Date.now()<end){try{return await check();}catch(error){last=error;await pause(1000);}}throw last??new Error('Timed out');}
function assert(condition,message){if(!condition)throw new Error(message);}
const ratio='sum(rate(baodium_checkout_requests_total{status=~"5.."}[30s])) / sum(rate(baodium_checkout_requests_total[30s]))';
async function verify(stage){
 const checks=[];
 if(stage==='setup'||stage==='baseline'||stage==='all'){
  await poll(async()=>{for(const [service,route]of [['api','/health'],['prometheus','/-/ready'],['grafana','/api/health'],['jaeger','/api/v3/services']]){const response=await fetch(url(service,route),{signal:AbortSignal.timeout(3000)});assert(response.ok,`${service} is not ready`);}});
  checks.push('Checkout, Prometheus, Grafana and Jaeger respond on loopback.');
 }
 if(stage==='metrics'||stage==='baseline'||stage==='all'){
  await traffic(4);
  const result=await poll(async()=>{const rows=await query('sum(baodium_checkout_requests_total)');assert(rows.length&&Number(rows[0].value[1])>0,'Prometheus has not scraped checkout counters yet');return rows;});
  checks.push(`Prometheus recorded ${result[0].value[1]} completed checkout requests.`);
 }
 if(stage==='dashboards'||stage==='baseline'||stage==='all'){
  const dashboard=await json('grafana','/api/dashboards/uid/baodium-checkout');
  assert([1,2,3,4].every(id=>dashboard.dashboard.panels.some(panel=>panel.id===id)),'Expected baseline panel IDs 1–4. Additional learner panels are allowed.');
  const health=await json('grafana','/api/datasources/uid/baodium-prometheus/health');assert(health.status==='OK','Grafana cannot query its Prometheus data source');
  checks.push('Grafana serves the provisioned four-panel checkout dashboard and its Prometheus data source is healthy. Learner-added panels need visual inspection.');
 }
 if(stage==='traces'||stage==='baseline'||stage==='all'){
  const load=await traffic(2);
  const traceId=load.lastTrace;
  assert(traceId,'Checkout did not return a trace ID');
  const trace=await poll(async()=>{
   const response=await json('jaeger','/api/v3/traces/'+traceId);
   const resources=response.result?.resourceSpans??[];
   const names=resources.flatMap(resource=>resource.resource?.attributes??[]).filter(attribute=>attribute.key==='service.name').map(attribute=>attribute.value.stringValue);
   const spans=resources.flatMap(resource=>resource.scopeSpans??[]).flatMap(scope=>scope.spans??[]);
   const outbound=spans.find(span=>span.name==='payment.request');
   const server=spans.find(span=>span.name==='POST /charge'&&span.parentSpanId===outbound?.spanId);
   assert(names.includes('baodium-checkout')&&names.includes('baodium-payment')&&outbound&&server,'No connected cross-service checkout → payment trace exported yet');
   return {traceID:traceId};
  });
  const logs=compose(['logs','--tail','200','--no-color','--no-log-prefix','checkout','payment'],true);
  const records=logs.split('\n').flatMap(line=>{try{return [JSON.parse(line)];}catch{return [];}}).filter(record=>record.trace_id===trace.traceID);
  assert(records.some(record=>record.service==='checkout')&&records.some(record=>record.service==='payment'),'The exported trace ID must appear in both service logs');
  checks.push(`Trace ${trace.traceID} crosses Express and FastAPI; both logs carry the same trace ID.`);
 }
 if(stage==='alerts'){
  const alerts=await json('prometheus','/api/v1/alerts');
  assert(alerts.data.alerts.some(alert=>alert.labels.alertname==='CheckoutFailuresHigh'&&alert.state==='firing'),'CheckoutFailuresHigh is not firing. Inject errors, then generate traffic for 30 seconds.');
  checks.push('Prometheus evaluated CheckoutFailuresHigh and its sustained condition is firing.');
 }
 if(stage==='recovery'){
  const settings=await json('api','/lab/config');assert(settings.delayMs===40&&settings.failEvery===0,'Recover the payment configuration first: node lab.mjs recover');
  console.log('Generating real healthy traffic for 40 seconds to replace the 30-second alert window…');
  const load=await traffic(40);assert(load.failed===0,`Recovery requests still failed: ${load.failed}`);
  const rows=await query(ratio);assert(rows.length&&Number(rows[0].value[1])<.01,'Measured error ratio has not recovered below 1%');
  await poll(async()=>{const alerts=await json('prometheus','/api/v1/alerts');assert(!alerts.data.alerts.some(alert=>alert.labels.alertname==='CheckoutFailuresHigh'&&alert.state==='firing'),'Failure alert has not resolved');},15000);
  checks.push(`${load.success} real checkout requests succeeded with no failures; measured 30-second error ratio is below 1%; failure alert resolved.`);
 }
 assert(checks.length,'Unknown checkpoint. Use setup, metrics, dashboards, traces, alerts, recovery, or baseline.');
 const report={course:'baodium-observability',checkpoint:stage,passed:true,checkedAt:new Date().toISOString(),checks};
 mkdirSync(path.join(root,'reports'),{recursive:true});writeFileSync(path.join(root,'reports',`${stage}.json`),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));return report;
}
try{
 if(command==='doctor'){assert(Number(process.versions.node.split('.')[0])>=20,'Install Node.js 20 or newer.');compose(['version']);const result=spawnSync('docker',['info','--format','{{.ServerVersion}}'],{stdio:'inherit'});assert(result.status===0,'Start Docker Desktop or the Docker daemon.');compose(['config','--quiet']);console.log('Prerequisites ready. Ports: '+JSON.stringify(ports));}
 else if(command==='up')compose(['up','-d','--build','--wait','--wait-timeout','120']);
 else if(command==='down')compose(['down','--volumes','--remove-orphans']);
 else if(command==='traffic'){const seconds=Number(process.argv[3]??10);assert(Number.isInteger(seconds)&&seconds>=1&&seconds<=120,'Traffic duration must be 1–120 seconds.');console.log(JSON.stringify(await traffic(seconds),null,2));}
 else if(command==='fault'){const mode=process.argv[3]??'errors';const profiles={errors:{delayMs:100,failEvery:3},slow:{delayMs:900,failEvery:0},timeout:{delayMs:2200,failEvery:0}};assert(profiles[mode],'Fault must be errors, slow or timeout.');console.log(await configure(profiles[mode]));}
 else if(command==='recover')console.log(await configure({delayMs:40,failEvery:0}));
 else if(command==='verify')await verify(process.argv[3]??'baseline');
 else if(command==='query'){assert(process.argv[3],'Provide a quoted PromQL expression.');console.log(JSON.stringify(await query(process.argv[3]),null,2));}
 else if(command==='reload'){const response=await fetch(url('prometheus','/-/reload'),{method:'POST'});assert(response.ok,'Prometheus rejected the configuration. Check its container logs.');console.log('Prometheus configuration reloaded.');}
 else if(command==='logs')compose(['logs','--tail','50','checkout','payment']);
 else console.log('Baodium observability lab\nnode lab.mjs doctor | up | down | traffic [seconds] | fault errors|slow|timeout | recover | query "PromQL" | reload | logs | verify setup|metrics|dashboards|traces|alerts|recovery|baseline');
}catch(error){
 console.error('CHECK FAILED: '+error.message);
 if(command==='verify'){
  const requested=process.argv[3]??'baseline';
  const checkpoint=['setup','metrics','dashboards','traces','alerts','recovery','baseline','all'].includes(requested)?requested:'unknown';
  mkdirSync(path.join(root,'reports'),{recursive:true});
  writeFileSync(path.join(root,'reports',`${checkpoint}.json`),JSON.stringify({course:'baodium-observability',checkpoint,passed:false,checkedAt:new Date().toISOString(),error:error.message},null,2)+'\n');
 }
 console.error('See README.md for tool URLs, ports and troubleshooting. A failed checkpoint does not record a pass.');
 process.exitCode=1;
}
