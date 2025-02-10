"use strict";var h=Object.defineProperty;var g=Object.getOwnPropertyDescriptor;var q=Object.getOwnPropertyNames;var T=Object.prototype.hasOwnProperty;var w=(o,e)=>{for(var t in e)h(o,t,{get:e[t],enumerable:!0})},b=(o,e,t,r)=>{if(e&&typeof e=="object"||typeof e=="function")for(let n of q(e))!T.call(o,n)&&n!==t&&h(o,n,{get:()=>e[n],enumerable:!(r=g(e,n))||r.enumerable});return o};var C=o=>b(h({},"__esModule",{value:!0}),o);var P={};w(P,{HttpClient:()=>d,HttpError:()=>a});module.exports=C(P);var a=class extends Error{constructor(t,r,n,s){super(`HTTP Error ${t}: ${r}`);this.status=t;this.statusText=r;this.data=n;this.config=s;this.name="HttpError"}};var d=class{constructor(e={}){this.requestInterceptors=[];this.responseInterceptors=[];var t,r,n,s;this.baseURL=(t=e.baseURL)!=null?t:"",this.defaultHeaders={"Content-Type":"application/json",...e.headers},this.timeout=(r=e.timeout)!=null?r:3e4,this.retries=(n=e.retries)!=null?n:0,this.retryDelay=(s=e.retryDelay)!=null?s:1e3}addRequestInterceptor(e){return this.requestInterceptors.push(e),()=>{let t=this.requestInterceptors.indexOf(e);t!==-1&&this.requestInterceptors.splice(t,1)}}addResponseInterceptor(e){return this.responseInterceptors.push(e),()=>{let t=this.responseInterceptors.indexOf(e);t!==-1&&this.responseInterceptors.splice(t,1)}}async get(e,t){return this.request("GET",e,void 0,t)}async post(e,t,r){return this.request("POST",e,t,r)}async put(e,t,r){return this.request("PUT",e,t,r)}async delete(e,t){return this.request("DELETE",e,void 0,t)}async patch(e,t,r){return this.request("PATCH",e,t,r)}async request(e,t,r,n={}){var c,u,f,l;let s={...n,method:e,url:this.buildUrl(t,n.params),headers:{...this.defaultHeaders,...n.headers},data:r,retries:(c=n.retries)!=null?c:this.retries,retryDelay:(u=n.retryDelay)!=null?u:this.retryDelay};try{s=await this.applyRequestInterceptors(s),s.transformRequest&&s.data&&(s.data=await s.transformRequest(s.data));let p=new AbortController,m=setTimeout(()=>p.abort(),(f=s.timeout)!=null?f:this.timeout),y=(l=s.signal)!=null?l:p.signal,i=await fetch(s.url,{method:s.method,headers:s.headers,body:s.data?JSON.stringify(s.data):void 0,signal:y});clearTimeout(m),i=await this.applyResponseInterceptors(i);let R=await this.parseResponse(i);if(!i.ok)throw new a(i.status,i.statusText,R,s);return s.transformResponse?s.transformResponse(R,i.headers):R}catch(p){if(s.retries>0&&this.shouldRetry(p))return await this.delay(s.retryDelay),this.request(e,t,r,{...s,retries:s.retries-1});throw p}}async applyRequestInterceptors(e){let t={...e};for(let r of this.requestInterceptors)try{t=await r.onRequest(t)}catch(n){throw r.onRequestError&&await r.onRequestError(n),n}return t}async applyResponseInterceptors(e){let t=e;for(let r of this.responseInterceptors)try{t=await r.onResponse(t)}catch(n){throw r.onResponseError&&await r.onResponseError(n),n}return t}async parseResponse(e){let t=e.headers.get("content-type");return t!=null&&t.includes("application/json")?e.json():t!=null&&t.includes("text/")?e.text():e.blob()}buildUrl(e,t){let r=e.startsWith("http")?e:`${this.baseURL}${e.startsWith("/")?e:`/${e}`}`;if(!t)return r;let n=new URLSearchParams;Object.entries(t).forEach(([c,u])=>{u!=null&&n.append(c,u)});let s=n.toString();return s?`${r}${r.includes("?")?"&":"?"}${s}`:r}shouldRetry(e){return e instanceof a?e.status>=500||e.status===0:!0}delay(e){return new Promise(t=>setTimeout(t,e))}};0&&(module.exports={HttpClient,HttpError});
//# sourceMappingURL=index.cjs.map