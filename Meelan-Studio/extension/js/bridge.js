(function(){
let running=false;const logs=[];const cep=window.__adobe_cep__;
let fs,path,os;try{const req=window.cep_node?window.cep_node.require:require;fs=req('fs');path=req('path');os=req('os');}catch(e){}
const extensionPath=cep?decodeURI(cep.getSystemPath('extension')).replace(/^file:\/\/\//,navigator.platform.indexOf('Win')>=0?'':'/'):'';
function call(action,options={}){return new Promise((resolve,reject)=>{
 if(!cep)return reject(Error('Open Meelan Studio from Window > Extensions in After Effects. This browser is only an interface preview.'));
 if(running)return reject(Error('Wait for the current AE operation to finish.'));
 running=true;const request=JSON.stringify({action,options:{...options,extensionPath}});const literal=JSON.stringify(request).replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');const code='MeelanStudioHost.dispatch('+literal+')';
 // Long AE operations remain locked until their callback arrives; no unsafe retry timeout.
 try { cep.evalScript(code,res=>{running=false;try{const result=JSON.parse(res);logs.push({time:new Date().toISOString(),action,result});if(!result.ok)throw Error(result.error+(result.line?' (line '+result.line+')':''));resolve(result.data);}catch(e){logs.push({time:new Date().toISOString(),action,error:String(e),raw:res});reject(Error(res==='EvalScript error.'?'AE could not load the extension host code. Restart AE and check that the full extension folder is installed.':e.message));}}); } catch(e) { running=false; reject(e); }
 });}
window.MSBridge={call,connected:!!cep,extensionPath,fs,path,os,logs,busy:()=>running,log:(v)=>logs.push(v)};
})();
