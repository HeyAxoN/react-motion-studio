// Additional AE API contract model. Deliberately does not pretend to render AE.
const base=require('./ae-mock.cjs'),fs=require('fs'),path=require('path');
module.exports=function(temp){
 const w=base(temp),{P,Layer,Comp,app,context}=w;let nextId=10000;
 const styleDefaults={font:'ArialMT',fontSize:48,applyFill:true,fillColor:[1,1,1],applyStroke:false,strokeColor:[0,0,0],strokeWidth:1,strokeOverFill:true,tracking:0,leading:58,autoLeading:true};
 class TextDocument{
  constructor(s='Hello world'){this._text=s;this._styles=Array.from(s,()=>structuredClone(styleDefaults));this.boxText=false}
  clone(){const t=new TextDocument(this._text);t._styles=structuredClone(this._styles);t.boxText=this.boxText;return t}
  get text(){return this._text}set text(s){const st=this._styles[0]||styleDefaults;this._text=s;this._styles=Array.from(s,()=>structuredClone(st))}
  characterRange(start,end){if(start<0||end>this.text.length||end<start)throw Error('Invalid range');const d=this;return new Proxy({}, {get(_,key){if(key==='text')return d._text.slice(start,end);return d._styles[start]&&structuredClone(d._styles[start][key])},set(_,key,value){if(key==='text'){const style=structuredClone(d._styles[start]||d._styles[start-1]||styleDefaults);d._text=d._text.slice(0,start)+value+d._text.slice(end);d._styles.splice(start,end-start,...Array.from(value,()=>structuredClone(style)))}else for(let i=start;i<end;i++)d._styles[i][key]=structuredClone(value);return true}})}
 }
 for(const key of Object.keys(styleDefaults))Object.defineProperty(TextDocument.prototype,key,{get(){return structuredClone((this._styles[0]||styleDefaults)[key])},set(v){for(const s of this._styles)s[key]=structuredClone(v)}});
 const copy=v=>v instanceof TextDocument?v.clone():Array.isArray(v)?Array.from(v,copy):v&&typeof v==='object'?structuredClone(v):v;
 Object.defineProperty(P.prototype,'value',{configurable:true,get(){return copy(this._value)},set(v){this._value=copy(v)}});
 Object.defineProperty(P.prototype,'expressionEnabled',{configurable:true,get(){return this._enabled!==false&&!!this.expression},set(v){this._enabled=v}});
 P.prototype.setValueAtTime=function(t,v){this.keys=this.keys||[];const k=this.keys.find(k=>k.t===t);if(k)k.v=copy(v);else this.keys.push({t,v:copy(v)});this.keys.sort((a,b)=>a.t-b.t);this.numKeys=this.keys.length;this.value=v};
 P.prototype.setValueAtKey=function(i,v){if(!this.keys?.[i-1])throw Error('Missing key');this.keys[i-1].v=copy(v);this.value=v};
 P.prototype.keyValue=function(i){return copy(this.keys[i-1].v)};P.prototype.keyTime=function(i){return this.keys[i-1].t};
 P.prototype.removeKey=function(i){this.keys.splice(i-1,1);this.numKeys=this.keys.length};
 P.prototype.keyInInterpolationType=P.prototype.keyOutInterpolationType=()=>1;
 P.prototype.keyInTemporalEase=P.prototype.keyOutTemporalEase=()=>[{speed:12,influence:33}];
 P.prototype.keyTemporalContinuous=P.prototype.keyTemporalAutoBezier=()=>false;
 for(const method of ['setInterpolationTypeAtKey','setTemporalEaseAtKey','setTemporalContinuousAtKey','setTemporalAutoBezierAtKey'])P.prototype[method]=function(i,...args){if(!this.keys?.[i-1])throw Error('Missing key');(this.keys[i-1].meta||={})[method]=args};
 const oldAdd=P.prototype.addProperty;
 const shapeSchemas={
  'ADBE Vector Shape - Rect':{'ADBE Vector Rect Size':[100,100],'ADBE Vector Rect Position':[0,0],'ADBE Vector Rect Roundness':0},
  'ADBE Vector Shape - Group':{'ADBE Vector Shape':0},
  'ADBE Vector Graphic - Fill':{'ADBE Vector Fill Color':[1,1,1,1]},
  'ADBE Vector Graphic - Stroke':{'ADBE Vector Stroke Color':[1,1,1,1],'ADBE Vector Stroke Width':2,'ADBE Vector Stroke Line Cap':1},
  'ADBE Vector Filter - Trim':{'ADBE Vector Trim Start':0,'ADBE Vector Trim End':100,'ADBE Vector Trim Type':1}
 };
 P.prototype.addProperty=function(n){if(n==='ADBE Vector Group'){const g=this.child(n,true);g.child('ADBE Vectors Group',true);return g}if(shapeSchemas[n]){const g=this.child(n,true);for(const [key,v]of Object.entries(shapeSchemas[n]))g.child(key,false,v);return g}const p=oldAdd.call(this,n);if(n==='ADBE Layer Control')p.property(1).propertyValueType=17;return p};
 function cloneProps(from,to){to.props=[];for(const p of from.props){const q=new P(p.matchName,p.propertyType!==1,to,p.value);q.name=p.name;q._expression=p.expression;q._enabled=p.expressionEnabled;q.dimensionsSeparated=p.dimensionsSeparated;q.propertyValueType=p.propertyValueType;q.keys=(p.keys||[]).map(k=>({t:k.t,v:copy(k.v)}));q.numKeys=q.keys.length;to.props.push(q);cloneProps(p,q)}}
 const add=Comp.prototype.add;
 Comp.prototype.add=function(n,kind){const l=add.call(this,n,kind);Object.assign(l,{id:nextId++,stretch:100,inPoint:0,outPoint:this.duration,audioEnabled:false,blendingMode:0,autoOrient:0,adjustmentLayer:false,hasTrackMatte:false,isTrackMatte:false,collapseTransformation:false,timeRemapEnabled:false,solo:false});l.child('ADBE Mask Parade',true);if(kind==='text')l.property('ADBE Text Properties').property('ADBE Text Document').value=new TextDocument();if(kind==='shape')l.child('ADBE Root Vectors Group',true);return l};
 Object.defineProperty(Layer.prototype,'containingComp',{get(){return this.c}});
 Layer.prototype.remove=function(){const i=this.c.arr.indexOf(this);if(i<0)throw Error('Already removed');this.c.arr.splice(i,1)};
 Layer.prototype.moveBefore=function(target){this.remove();this.c.arr.splice(target.index-1,0,this)};
 Layer.prototype.moveAfter=function(target){this.remove();this.c.arr.splice(target.index,0,this)};
 Layer.prototype.setParentWithJump=function(parent){this.parent=parent||null};
 Layer.prototype.setTrackMatte=function(layer,type){this.trackMatteLayer=layer;this.trackMatteType=type;this.hasTrackMatte=true};
 Layer.prototype.replaceSource=function(source){this.source=source};
 Layer.prototype.copyToComp=function(c){const l=c.add(this.name,this.kind);cloneProps(this,l);for(const k of ['source','stretch','startTime','inPoint','outPoint','enabled','audioEnabled','threeDLayer','locked','parent','trackMatteLayer','trackMatteType','solo'])l[k]=this[k];return l};
 Layer.prototype.duplicate=function(){return this.copyToComp(this.c)};
 const create=w.createComp;
 w.createComp=function(n){const c=create(n);decorate(c);return c};
 function decorate(c){c.parentFolder=app.project.rootFolder;c.layers.addShape=()=>c.add('Shape','shape');c.layers.addText=s=>{const l=c.add('Text','text');l.property('ADBE Text Properties').property('ADBE Text Document').value=new TextDocument(s);return l};const originalSolid=c.layers.addSolid;c.layers.addSolid=(color,n,width=100,height=100,pa=1)=>{const l=originalSolid(color,n),f=new w.Footage(new w.File(path.join(temp,'solid.placeholder')));f.file=null;f.mainSource=new SolidSource(color);f.width=width;f.height=height;f.pixelAspect=pa;f.parentFolder=app.project.rootFolder;f.remove=removeItem;app.project._items.push(f);l.source=f;return l};}
 function removeItem(){const i=app.project._items.indexOf(this);if(i<0)throw Error('Removed item');app.project._items.splice(i,1)}
 Comp.prototype.remove=removeItem;
 Comp.prototype.duplicate=function(){const c=w.createComp(this.name);Object.assign(c,{width:this.width,height:this.height,duration:this.duration,frameRate:this.frameRate,parentFolder:this.parentFolder});const map=new Map();for(let i=this.arr.length-1;i>=0;i--)map.set(this.arr[i],this.arr[i].copyToComp(c));for(const [src,dest]of map){dest.parent=map.get(src.parent)||src.parent;dest.trackMatteLayer=map.get(src.trackMatteLayer)||null}return c};
 class FolderItem{constructor(n){this.name=n;this.id=nextId++;this.parentFolder=app.project.rootFolder;this.selected=false}remove(){removeItem.call(this)}}
 class SolidSource{constructor(color){this.color=color;this.isStill=true}}
 class KeyframeEase{constructor(speed,influence){this.speed=speed;this.influence=influence}}
 app.project.rootFolder=new FolderItem('Root');app.project.selection=[];app.project.items.addFolder=n=>{const f=new FolderItem(n);app.project._items.push(f);return f};app.project.items.addComp=(n,width,height,pa,duration,fps)=>{const c=w.createComp(n);Object.assign(c,{width,height,pixelAspect:pa,duration,frameRate:fps});return c};
 w.Footage.prototype.remove=removeItem;
 Object.assign(context,{TextDocument,FolderItem,SolidSource,KeyframeEase,AutoOrientType:{NO_AUTO_ORIENT:0},PropertyValueType:{LAYER_INDEX:17}});context.BlendingMode.NORMAL=0;
 w.Folder.userData=new w.Folder(path.join(temp,'user-data'));fs.mkdirSync(w.Folder.userData.fsName,{recursive:true});
 w.TextDocument=TextDocument;w.decorate=decorate;return w;
};
