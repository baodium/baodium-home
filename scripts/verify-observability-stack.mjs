/** Run against the owned local course stack after `node labs/observability/lab.mjs up`. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
const tool=path.resolve('labs/observability/lab.mjs');
const checks=[];
function run(...args){const result=spawnSync(process.execPath,[tool,...args],{encoding:'utf8',env:process.env,timeout:150000});process.stdout.write(result.stdout??'');if(result.status!==0)throw new Error(result.stderr||result.error?.message||`Command failed: ${args.join(' ')}`);checks.push(args.join(' '));}
try{
 run('recover');run('verify','baseline');
 const invalid=await fetch(`http://127.0.0.1:${process.env.BAODIUM_API_PORT??4319}/lab/config`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({delayMs:-1,failEvery:100})});
 assert.equal(invalid.status,400);checks.push('invalid fault input rejected with HTTP 400');
 run('fault','slow');
 const began=performance.now();const slow=await fetch(`http://127.0.0.1:${process.env.BAODIUM_API_PORT??4319}/checkout`,{method:'POST'});
 assert.equal(slow.status,200);assert.ok(performance.now()-began>=850);checks.push('900 ms downstream fault produces a real delayed successful request');
 run('fault','timeout');
 const timeout=await fetch(`http://127.0.0.1:${process.env.BAODIUM_API_PORT??4319}/checkout`,{method:'POST'});assert.equal(timeout.status,504);checks.push('2200 ms downstream work exceeds 1500 ms caller wait and returns HTTP 504');
 run('fault','errors');run('traffic','30');run('verify','alerts');
 run('recover');run('verify','recovery');run('reload');
 const report={passed:true,verifiedAt:new Date().toISOString(),checks};
 mkdirSync('labs/observability/reports',{recursive:true});writeFileSync('labs/observability/reports/end-to-end.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{
 const result=spawnSync(process.execPath,[tool,'recover'],{stdio:'pipe',env:process.env});if(result.status!==0)console.error('Restore the local payment configuration with node lab.mjs recover.');
}
