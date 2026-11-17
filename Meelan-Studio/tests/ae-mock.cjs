// Contract mock: catches missing properties/invalid values. It is NOT an Adobe runtime.
const fs=require('fs'),path=require('path'),vm=require('vm');
module.exports=function create(temp){
 const records=[],projects=new Map();let id=1,project,opened=[],copyFailure=null,undo=0;
 class P {
  constructor(name,group=false,parent=null,value=0){Object.assign(this,{name,matchName:name,parentGroup:parent,props:[],propertyType:group?2:1,canSetExpression:!group,_expression:'',value,numKeys:0,dimensionsSeparated:false,isSeparationLeader:name==='ADBE Position'});}
  get numProperties(){return this.props.length}get propertyIndex(){return this.parentGroup?this.parentGroup.props.indexOf(this)+1:1}get expression(){return this._expression}set expression(s){if(!this.canSetExpression)throw Error('Expression on group '+this.name);new vm.Script(s);this._expression=s}get expressionEnabled(){return !!this.expression}get expressionError(){return ''}
  property(k){return typeof k==='number'?this.props[k-1]||null:this.props.find(p=>p.name===k||p.matchName===k)||null}
  child(n,group=false,value=0){const p=new P(n,group,this,value);this.props.push(p);return p}
  canAddProperty(n){return n in schemas||['ADBE Text Animator','ADBE Text Expressible Selector',...textProps].includes(n)}
  addProperty(n){if(!this.canAddProperty(n))throw Error('Unknown addProperty '+n);let p;
   if(n in schemas){p=this.child(n,true);schemas[n].forEach((v,i)=>p.child(n+'-'+(i+1),false,v));}
   else if(n==='ADBE Text Animator'){p=this.child(n,true);p.child('ADBE Text Animator Properties',true);p.child('ADBE Text Selectors',true);}
   else if(n==='ADBE Text Expressible Selector'){p=this.child(n,true);p.child('ADBE Text Range Type2',false,1);p.child('ADBE Text Expressible Amount',false,100);}
   else p=this.child(n,false,0);records.push(p);return p;
  }
  setValue(v){if(this.numKeys)throw Error('setValue on keyed property '+this.name);if(typeof v==='number'&&!Number.isFinite(v))throw Error('Nonfinite value');if(Array.isArray(v)&&v.some(x=>!Number.isFinite(x)))throw Error('Invalid vector');this.value=v}
  valueAtTime(){return this.value}removeKey(){if(!this.numKeys)throw Error('No keys');this.numKeys--}remove(){this.parentGroup.props.splice(this.propertyIndex-1,1)}
 }
 const schemas={'ADBE Slider Control':[0],'ADBE Angle Control':[0],'ADBE Color Control':[[1,1,1,1]],'ADBE Checkbox Control':[0],'ADBE Layer Control':[0],'ADBE Fill':[0,[1,0,0,1],0,0,0,0,1],'ADBE Ramp':[[0,0],[0,0,0,1],[0,100],[1,1,1,1],1,0,0],'ADBE Displacement Map':[0,1,5,2,5,1,0,0],'ADBE Gradient Wipe':[0,0,0,1,0],'ADBE Gaussian Blur 2':[0,1,0]};
 const textProps=['ADBE Text Opacity','ADBE Text Position 3D','ADBE Text Scale 3D','ADBE Text Rotation','ADBE Text Skew','ADBE Text Blur','ADBE Text Fill Color'];
 class Layer extends P {
  constructor(c,name,kind='art'){super(name,true);Object.assign(this,{c,kind,parent:null,selected:false,locked:false,threeDLayer:false,enabled:true,comment:'',startTime:0});const t=this.child('ADBE Transform Group',true);
   for(const n of ['ADBE Anchor Point','ADBE Position','ADBE Scale','ADBE Orientation','ADBE Rotate X','ADBE Rotate Y','ADBE Rotate Z','ADBE Opacity'])t.child(n,false,n==='ADBE Scale'?[100,100,100]:n==='ADBE Opacity'?100:/Position|Anchor|Orientation/.test(n)?[0,0,0]:0);
   if(kind!=='model')this.child('ADBE Effect Parade',true);
   if(kind==='text'){const t=this.child('ADBE Text Properties',true);t.child('ADBE Text Document',false,{font:'ArialMT',text:'Hello world'});t.child('ADBE Text Animators',true);}
  }
  get index(){return this.c.arr.indexOf(this)+1}sourceRectAtTime(){return {left:0,top:0,width:300,height:90}}duplicate(){const l=this.c.add(this.name,this.kind);l.threeDLayer=this.threeDLayer;l.enabled=this.enabled;return l}moveToEnd(){this.c.arr.splice(this.index-1,1);this.c.arr.push(this)}
 }
 class CameraLayer extends Layer{};class LightLayer extends Layer{constructor(c,n){super(c,n);this.child('ADBE Light Options Group',true).child('ADBE Light Intensity',false,100)}}
 class Comp extends P {
  constructor(name,w=1920,h=1080){super(name,true);Object.assign(this,{id:id++,width:w,height:h,pixelAspect:1,duration:10,frameRate:30,frameDuration:1/30,time:1,arr:[],comment:''});this.layers={addNull:()=>this.add('Null'),addSolid:(col,n)=>this.add(n),add:item=>{const l=this.add(item.name,item.file&&item.file.name.endsWith('.glb')?'model':'art');l.source=item;return l},addLight:n=>{const l=new LightLayer(this,n);this.arr.unshift(l);return l},precompose:(indices,name)=>{const child=new Comp(name,this.width,this.height);project._items.push(child);const chosen=indices.map(i=>this.layer(i));this.arr=this.arr.filter(l=>!chosen.includes(l));for(const l of chosen){l.c=child;child.arr.push(l)}const out=this.layers.add(child);return child}};}
  add(n,k){const l=new Layer(this,n,k);this.arr.unshift(l);return l}get numLayers(){return this.arr.length}get selectedLayers(){return this.arr.filter(l=>l.selected)}layer(k){return typeof k==='number'?this.arr[k-1]:this.arr.find(l=>l.name===k)}saveFrameToPng(t,f){fs.writeFileSync(f.fsName,'MOCK FRAME')}openInViewer(){project.activeItem=this}
 }
 class File {
  constructor(p){this.fsName=path.resolve(String(p));this.encoding='UTF-8'}get exists(){return fs.existsSync(this.fsName)}get name(){return path.basename(this.fsName)}get parent(){return new Folder(path.dirname(this.fsName))}copy(to){if(copyFailure&&copyFailure(this.fsName))return false;fs.copyFileSync(this.fsName,to);if(projects.has(this.fsName))projects.set(path.resolve(to),projects.get(this.fsName));return true}open(mode){this.mode=mode;return mode==='w'||this.exists}read(){return fs.readFileSync(this.fsName,'utf8')}write(s){fs.writeFileSync(this.fsName,s);return true}close(){}remove(){fs.unlinkSync(this.fsName);return true}
 }
 class Folder {constructor(p){this.fsName=path.resolve(String(p))}get exists(){return fs.existsSync(this.fsName)}create(){fs.mkdirSync(this.fsName,{recursive:true});return true}getFiles(){return fs.readdirSync(this.fsName).map(n=>{const p=path.join(this.fsName,n);return fs.statSync(p).isDirectory()?new Folder(p):new File(p)})}execute(){}}
 class Footage {constructor(file,still=true){this.id=id++;this.name=file.name;this.file=file;this.mainSource={isStill:still};this.proxySource=null;this.width=518;this.height=518}replace(f){this.file=f}replaceWithSequence(f){this.file=f;this.mainSource.isStill=false}setProxy(f){this.proxySource={file:f,isStill:true}}setProxyWithSequence(f){this.proxySource={file:f,isStill:false}}}
 function snapshot(p){return {items:p._items.map(x=>x instanceof Comp?{type:'comp',id:x.id,name:x.name,comment:x.comment,w:x.width,h:x.height,time:x.time,layers:x.arr.map(l=>({name:l.name,kind:l.kind,source:l.source&&l.source.id}))}:{type:'footage',id:x.id,file:x.file.fsName,still:x.mainSource.isStill}),active:p.activeItem&&p.activeItem.id}}
 function restore(s,file){const p=makeProject();p.file=file;const by={};for(const d of s.items){const x=d.type==='comp'?new Comp(d.name,d.w,d.h):new Footage(new File(d.file),d.still);x.id=d.id;x.comment=d.comment||'';if(d.type==='comp')x.time=d.time;by[x.id]=x;p._items.push(x)}for(const d of s.items)if(d.layers)for(const l of d.layers){const n=by[d.id].add(l.name,l.kind);n.source=by[l.source]}p.activeItem=by[s.active];return p}
 function makeProject(){const p={_items:[],file:null,activeItem:null};Object.defineProperty(p,'numItems',{get:()=>p._items.length});p.item=i=>p._items[i-1];p.items={addComp:(n,w,h)=>{const c=new Comp(n,w,h);p._items.push(c);return c}};p.save=f=>{p.file=f;fs.writeFileSync(f.fsName,'MOCK AEP');projects.set(f.fsName,snapshot(p))};p.saveWithDialog=()=>false;p.close=()=>true;p.reduceProject=keep=>{const set=new Set(keep);for(const x of set)if(x instanceof Comp)for(const l of x.arr)if(l.source)set.add(l.source);p._items=p._items.filter(x=>set.has(x))};p.importFile=o=>{if(o.file.name.endsWith('.aep')){const archive=restore(projects.get(o.file.fsName),o.file);for(const x of archive._items){x.id=id++;p._items.push(x)}return {name:'Imported'}}const x=new Footage(o.file);p._items.push(x);return x};return p}
 project=makeProject();const app={version:'26.0.0',get project(){return project},beginUndoGroup(){undo++},endUndoGroup(){undo--},open(f){opened.push(f.fsName);project=restore(projects.get(f.fsName),f)}};
 class ImportOptions{constructor(file){this.file=file}canImportAs(){return true}}
 const context={app,CompItem:Comp,FootageItem:Footage,CameraLayer,LightLayer,File,Folder,ImportOptions,PropertyType:{PROPERTY:1},BlendingMode:{ADD:1},LightType:{POINT:1},CloseOptions:{DO_NOT_SAVE_CHANGES:1},ImportAsType:{PROJECT:1}};
 vm.createContext(context);vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../extension/host/studio.jsx'),'utf8'),context);
 function call(action,options={}){return JSON.parse(context.MeelanStudioHost.dispatch(JSON.stringify({action,options})))}
 return {call,app,records,Comp,Footage,File,Folder,context,opened,P,Layer,schemas,get undo(){return undo},setFailure(f){copyFailure=f},createComp(name='Scene'){const c=new Comp(name);project._items.push(c);project.activeItem=c;return c},createFootage(f,still){const x=new Footage(new File(f),still);project._items.push(x);return x}};
};
