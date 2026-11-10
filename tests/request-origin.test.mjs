import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const code=ts.transpileModule(readFileSync(new URL('../src/lib/request-origin.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const loaded={exports:{}};new Function('module','exports',code)(loaded,loaded.exports);
const {getRequestOrigin,publicSubmissionsEnabled}=loaded.exports;
function req(origin,host='internal.local:3000',forwarded='attacker.example') {return new Request('http://internal.local:3000/auth/login',{method:'POST',headers:{...(origin?{origin}:{}),host,'x-forwarded-host':forwarded}});}
async function environment(values,callback){const previous={...process.env};for(const key of ['APP_ORIGIN','VERCEL','VERCEL_URL','VERCEL_BRANCH_URL','PUBLIC_SUBMISSIONS_ENABLED'])delete process.env[key];Object.assign(process.env,values);try{await callback();}finally{process.env=previous;}}
test('production accepts configured HTTPS origin behind a proxy',()=>environment({NODE_ENV:'production',APP_ORIGIN:'https://clinic.example'},()=>{
 assert.equal(getRequestOrigin(req('https://clinic.example')),'https://clinic.example');
 assert.equal(getRequestOrigin(req('https://attacker.example')),null);
 assert.equal(getRequestOrigin(req('http://clinic.example')),null);
 assert.equal(getRequestOrigin(req(null)),null);
}));
test('only Vercel system URLs are accepted as deployment origins',()=>environment({NODE_ENV:'production',VERCEL:'1',VERCEL_URL:'clinic-abc.vercel.app',VERCEL_BRANCH_URL:'clinic-git-preview.vercel.app'},()=>{
 assert.equal(getRequestOrigin(req('https://clinic-abc.vercel.app')),'https://clinic-abc.vercel.app');
 assert.equal(getRequestOrigin(req('https://clinic-git-preview.vercel.app')),'https://clinic-git-preview.vercel.app');
 assert.equal(getRequestOrigin(req('https://other.vercel.app')),null);
 process.env.VERCEL_URL='attacker.example';assert.equal(getRequestOrigin(req('https://attacker.example')),null);
}));
test('production cannot trust request host or forwarded host to authorize origins',()=>environment({NODE_ENV:'production'},()=>{
 assert.equal(getRequestOrigin(req('https://attacker.example','attacker.example','attacker.example')),null);
 assert.equal(getRequestOrigin(req('http://127.0.0.1:3000','127.0.0.1:3000')),null);
}));
test('development origin must be loopback with matching host and port',()=>environment({NODE_ENV:'development'},()=>{
 assert.equal(getRequestOrigin(req('http://127.0.0.1:3000','127.0.0.1:3000')),'http://127.0.0.1:3000');
 assert.equal(getRequestOrigin(req('http://127.0.0.1:3001','127.0.0.1:3000')),null);
 assert.equal(getRequestOrigin(req('https://attacker.example','attacker.example')),null);
}));
test('hosted submissions require the exact explicit enable flag',()=>environment({NODE_ENV:'production'},()=>{
 assert.equal(publicSubmissionsEnabled(),false);
 process.env.PUBLIC_SUBMISSIONS_ENABLED='TRUE';assert.equal(publicSubmissionsEnabled(),false);
 process.env.PUBLIC_SUBMISSIONS_ENABLED='true';assert.equal(publicSubmissionsEnabled(),true);
}));
