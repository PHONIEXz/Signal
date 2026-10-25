import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { canonicalAppRedirects } from "./canonical-app.ts";
const require = createRequire(import.meta.url);
const { unstable_getResponseFromNextConfig } = require("next/experimental/testing/server");
const oldOrigin="https://signal-phoenix-dashboard.vercel.app";
const newOrigin="https://socialpanora.phoenixreborn.tech";
async function response(url:string,origin:string) {
  return unstable_getResponseFromNextConfig({url,nextConfig:{async redirects(){return canonicalAppRedirects(origin);}}});
}

test("migration sends .tech app entries to the working origin, preserving paths and queries", async()=>{
  for(const path of ["/login","/signup","/forgot-password","/reset-password","/dashboard/reports?account=one&posts=25","/api/auth/csrf","/api/connect/x/callback?code=test&state=test","/api/signup"]) {
    const result=await response(newOrigin+path,oldOrigin);
    assert.equal(result.status,307,path);
    assert.equal(result.headers.get("location"),oldOrigin+path,path);
  }
});

test("migration leaves public .tech pages and canonical app routes in place",async()=>{
  for(const path of ["/","/product","/privacy","/terms","/data-deletion","/socialpanora-icon.svg"]){
    assert.equal((await response(newOrigin+path,oldOrigin)).headers.get("location"),null,path);
  }
  assert.equal((await response(oldOrigin+"/dashboard",oldOrigin)).headers.get("location"),null);
});

test("the final .tech switch redirects the former hostname without a redirect loop",async()=>{
  for(const path of ["/","/dashboard/reports?posts=25","/api/connect/facebook/callback?code=test"]){
    const result=await response(oldOrigin+path,newOrigin);
    assert.equal(result.status,307);
    assert.equal(result.headers.get("location"),newOrigin+path);
    assert.equal((await response(newOrigin+path,newOrigin)).headers.get("location"),null);
  }
});

test("untrusted hosts, lookalikes and user redirect parameters cannot change the destination",async()=>{
  for(const host of ["https://untrusted.example","https://socialpanoraXphoenixrebornXtech","https://socialpanora.phoenixreborn.tech.untrusted.example"]){
    assert.equal((await response(host+"/login",oldOrigin)).headers.get("location"),null);
  }
  const result=await response(newOrigin+"/login?callbackUrl=https%3A%2F%2Funtrusted.example",oldOrigin);
  assert.equal(new URL(result.headers.get("location")!).origin,oldOrigin);
});

test("invalid configuration and non-production origins never enable production redirects",()=>{
  for(const value of [undefined,"","bad-url","https://untrusted.example","http://localhost:3000",oldOrigin+"/path",oldOrigin+"?x=1",oldOrigin+"#hash","https://user:password@signal-phoenix-dashboard.vercel.app","http://signal-phoenix-dashboard.vercel.app"]){
    assert.deepEqual(canonicalAppRedirects(value),[]);
  }
});
