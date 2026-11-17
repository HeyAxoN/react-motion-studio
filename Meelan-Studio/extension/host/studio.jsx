/* Meelan Studio 2.1.0 — original implementation. ES3 / AE 26. */
var MeelanStudioHost = (function () {
    function parseJSON(src) {var i=0;function ws(){while(/\s/.test(src.charAt(i))&&i<src.length)i++;}function str(){var out='';i++;while(i<src.length){var c=src.charAt(i++);if(c==='"')return out;if(c==='\\'){var e=src.charAt(i++),m={'"':'"','\\':'\\','/':'/','b':'\b','f':'\f','n':'\n','r':'\r','t':'\t'};if(e==='u'){var h=src.substr(i,4);if(!/^[0-9a-fA-F]{4}$/.test(h))fail('Invalid JSON escape');out+=String.fromCharCode(parseInt(h,16));i+=4;}else if(m[e]!==undefined)out+=m[e];else fail('Invalid JSON escape');}else{if(c.charCodeAt(0)<32)fail('Invalid JSON string');out+=c;}}fail('Unterminated JSON string');}function val(depth){if(depth>80)fail('JSON nesting too deep');ws();var c=src.charAt(i),r,k;if(c==='"')return str();if(c==='['){i++;r=[];ws();if(src.charAt(i)===']'){i++;return r;}while(true){r.push(val(depth+1));ws();c=src.charAt(i++);if(c===']')return r;if(c!==',')fail('Invalid JSON array');}}if(c==='{'){i++;r={};ws();if(src.charAt(i)==='}'){i++;return r;}while(true){ws();if(src.charAt(i)!=='"')fail('Invalid JSON key');k=str();if(k==='__proto__'||k==='constructor'||k==='prototype')fail('Reserved JSON key');ws();if(src.charAt(i++)!==':')fail('Invalid JSON object');r[k]=val(depth+1);ws();c=src.charAt(i++);if(c==='}')return r;if(c!==',')fail('Invalid JSON object');}}var rest=src.substr(i),m=rest.match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/);if(m){i+=m[0].length;return Number(m[0]);}if(rest.substr(0,4)==='true'){i+=4;return true;}if(rest.substr(0,5)==='false'){i+=5;return false;}if(rest.substr(0,4)==='null'){i+=4;return null;}fail('Invalid JSON at '+i);}var result=val(0);ws();if(i!==src.length)fail('Extra data after JSON');return result;}
    var VERSION = "2.1.0", PREFIX = "// Meelan Studio 2\n";
    function fail(s) { throw new Error(s); }
    function json(v) {
        if (v === null || v === undefined) return "null";
        if (typeof v === "string") return '"' + v.replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/[\x00-\x1f\u2028\u2029]/g,function(c){var h=c.charCodeAt(0).toString(16);return '\\u'+('0000'+h).slice(-4);}) + '"';
        if (typeof v === "number") return isFinite(v) ? String(v) : "null";
        if (typeof v === "boolean") return String(v);
        var a = [], i, k;
        if (v instanceof Array) { for (i=0;i<v.length;i++) a.push(json(v[i])); return "["+a.join(",")+"]"; }
        for (k in v) if (v.hasOwnProperty(k)) a.push(json(k)+":"+json(v[k]));
        return "{"+a.join(",")+"}";
    }
    function number(v, d, lo, hi) { var n=Number(v); if(v===undefined||v===null||!isFinite(n))n=d; return Math.max(lo,Math.min(hi,n)); }
    function active() {var c=app.project.activeItem;if(!(c instanceof CompItem))fail('Open a composition first.');return c;}
    function selected(c, min) {var a=c.selectedLayers, out=[],i;if(a.length<(min||1))fail('Select '+(min||1)+' or more visual layers.');for(i=0;i<a.length;i++){if(a[i].locked)fail('Unlock '+a[i].name+' first.');if(a[i] instanceof CameraLayer||a[i] instanceof LightLayer)fail('Select artwork, not cameras or lights.');out.push(a[i]);}out.sort(function(a,b){return a.index-b.index;});return out;}
    function prop(l,n) {return l.property('ADBE Transform Group').property(n);}
    function effect(l,id,name) {var g=l.property('ADBE Effect Parade');if(!g||!g.canAddProperty(id))fail('Required effect is unavailable: '+id);var e=g.addProperty(id);e.name=name||id;return e;}
    function ctrl(l,n,v,type) {var g=l.property('ADBE Effect Parade'),e=g.property(n);if(!e)e=effect(l,type||'ADBE Slider Control',n);if(type==='ADBE Color Control'&&v.length===3)v=[v[0],v[1],v[2],1];e.property(1).setValue(v);return e.property(1);}
    function ref(n) {return 'effect('+json(n)+')(1)';}
    function ex(p,s) {if(!p||!p.canSetExpression)fail('A required property cannot accept an expression.');p.expression=PREFIX+s;}
    function free(p) {if(!p||!p.canSetExpression)fail('A required property is unavailable.');if(p.expression)fail('The selected property already has an expression. Duplicate the layer or remove that expression first.');}
    function clear(p) {if(p.canSetExpression)p.expression='';while(p.numKeys)p.removeKey(p.numKeys);}
    function unique(c,n) {var i,k=0,r=n,exists;do{exists=false;for(i=1;i<=c.numLayers;i++)if(c.layer(i).name===r)exists=true;if(exists)r=n+' '+(++k);}while(exists);return r;}
    function tag(l,kind) {l.comment='MS2:'+kind+':'+new Date().getTime();}
    function pick(c,l) {for(var i=1;i<=c.numLayers;i++)c.layer(i).selected=false;l.selected=true;}
    function layerLink(l,n,t) {ctrl(l,n,t.index,'ADBE Layer Control');}
    function phase(prefix) {prefix=prefix||'MS ';return 'var d=Math.max(.001,'+ref(prefix+'Duration')+');var u=clamp((time-'+ref(prefix+'Start')+')/d,0,1);var q=1-Math.pow(1-u,3);\n';}
    function timeControls(l,t,d,p) {p=p||'MS ';ctrl(l,p+'Start',t);ctrl(l,p+'Duration',d);}
    function nullLayer(c,n,is3d) {var l=c.layers.addNull(c.duration);l.name=unique(c,n);l.threeDLayer=!!is3d;prop(l,'ADBE Anchor Point').setValue(is3d?[0,0,0]:[0,0]);tag(l,'controller');return l;}
    function walk(g,fn) {for(var i=1;i<=g.numProperties;i++){var p=g.property(i);if(!p)continue;if(p.propertyType===PropertyType.PROPERTY)fn(p);else walk(p,fn);}}
    function info() {var c=app.project.activeItem,out={version:VERSION,ae:app.version,comp:null,selected:0};if(c instanceof CompItem){out.comp=c.name;out.width=c.width;out.height=c.height;out.time=c.time;out.selected=c.selectedLayers.length;}return out;}
    function cursor(o) {
        var c=active(),a=selected(c),target=a[0],sc=prop(target,'ADBE Scale');
        if(a.length!==1)fail('Select one button or target layer.');if(!target.property('ADBE Effect Parade'))fail('Select a 2D button or a precomp as the cursor target.');free(sc);
        var asset=new File(o.extensionPath+'/assets/models/cursor-'+(o.finish==='graphite'?'graphite':o.finish==='violet'?'violet':'pearl')+'.glb');
        if(!asset.exists)fail('Cursor model missing. Reinstall the complete extension folder.');
        var item=app.project.importFile(new ImportOptions(asset)),model=c.layers.add(item);
        model.name=unique(c,'MS 3D Cursor');var root=nullLayer(c,'MS Cursor Controls',true);
        layerLink(root,'Target',target);timeControls(root,c.time,number(o.duration,.85,.1,10));
        ctrl(root,'Size',number(o.size,100,10,1000));ctrl(root,'Approach X',number(o.approachX,240,-2000,2000));ctrl(root,'Approach Y',number(o.approachY,200,-2000,2000));
        ctrl(root,'Lift',number(o.lift,160,0,1000));ctrl(root,'Click Depth',number(o.click,7,0,40));
        ctrl(root,'Click Tint',o.color||[.56,.35,1],'ADBE Color Control');ctrl(root,'Tip X',0);ctrl(root,'Tip Y',0);ctrl(root,'Cursor Tilt',o.style==='sweep'?-18:12);
        model.parent=root;prop(model,'ADBE Anchor Point').setValue([0,0,0]);prop(model,'ADBE Position').setValue([0,0,0]);prop(model,'ADBE Orientation').setValue([0,0,0]);
        ex(prop(model,'ADBE Scale'),'var s=parent.effect("Size")(1);[s,s,s];');
        ex(prop(model,'ADBE Rotate Z'),'parent.effect("Cursor Tilt")(1);');
        var route=phase()+'var l='+ref('Target')+';var r=l.sourceRectAtTime(time,false);var p=l.toComp([r.left+r.width/2,r.top+r.height/2,0]);';
        var lift=o.style==='float'?1:o.style==='sweep'?.3:.65;
        ex(prop(root,'ADBE Position'),route+'var x=p[0]+'+ref('Approach X')+'*(1-q)+'+ref('Tip X')+';var y=p[1]+'+ref('Approach Y')+'*(1-q)+'+ref('Tip Y')+';var z=-'+ref('Lift')+'*Math.sin(Math.PI*u)*'+lift+';var cam=thisComp.activeCamera;cam?cam.toWorld([x-thisComp.width/2,y-thisComp.height/2,cam.zoom+z]):[x,y,z];');
        ex(prop(model,'ADBE Rotate Y'),'var u=clamp((time-parent.effect("MS Start")(1))/Math.max(.001,parent.effect("MS Duration")(1)),0,1);-25*Math.sin(Math.PI*u);');
        ex(prop(model,'ADBE Rotate X'),'var t=time-parent.effect("MS Start")(1)-parent.effect("MS Duration")(1);t<0?0:(t<.12?ease(t,0,.12,0,20):ease(t,.12,.35,20,0));');
        layerLink(target,'MS Cursor',root);
        var click='var c='+ref('MS Cursor')+';var t=time-c.effect("MS Start")(1)-c.effect("MS Duration")(1);var k=t<0?0:(t<.1?ease(t,0,.1,0,1):ease(t,.1,.35,1,0));';
        ex(sc,click+'value*(1-c.effect("Click Depth")(1)/100*k);');
        var fill=effect(target,'ADBE Fill','MS Click color');ex(fill.property(2),'effect("MS Cursor")(1).effect("Click Tint")(1);');ex(fill.property(7),click+'k*.3;');
        var light=c.layers.addLight(unique(c,'MS Cursor Key'),[c.width*.35,c.height*.2]);light.lightType=LightType.POINT;prop(light,'ADBE Position').setValue([c.width*.35,c.height*.2,-600]);light.property('ADBE Light Options Group').property('ADBE Light Intensity').setValue(140);
        model.motionBlur=true;pick(c,root);return {message:'3D model and click rig created. Move the target to move the cursor destination.',controlLayer:root.name};
    }
    function carousel(o) {
        var c=active(),a=selected(c,2),i,l,root,baseWidth;
        for(i=0;i<a.length;i++)if(!a[i].property('ADBE Effect Parade'))fail('Precompose 3D models before using them as carousel cards.');
        root=nullLayer(c,'MS Carousel Controls',true);prop(root,'ADBE Position').setValue([c.width/2,c.height/2,0]);
        ctrl(root,'Radius',number(o.radius,460,50,3000));ctrl(root,'Angle',0,'ADBE Angle Control');ctrl(root,'Speed',number(o.speed,20,-180,180));
        ctrl(root,'Tilt X',number(o.tiltX,18,-85,85),'ADBE Angle Control');ctrl(root,'Tilt Y',number(o.tiltY,-14,-85,85),'ADBE Angle Control');ctrl(root,'Tilt Z',number(o.tiltZ,-10,-180,180),'ADBE Angle Control');
        ctrl(root,'Card Width',number(o.width,340,20,3000));ctrl(root,'Far Opacity',number(o.farOpacity,55,0,100));ctrl(root,'Start',c.time);
        ex(prop(root,'ADBE Rotate X'),ref('Tilt X')+';');ex(prop(root,'ADBE Rotate Y'),ref('Tilt Y')+';');ex(prop(root,'ADBE Rotate Z'),ref('Tilt Z')+';');
        for(i=0;i<a.length;i++) {
            l=a[i].duplicate();l.enabled=true;l.name='MS Card '+(i+1)+' - '+a[i].name;l.parent=null;l.threeDLayer=true;
            if(prop(l,'ADBE Position').dimensionsSeparated)prop(l,'ADBE Position').dimensionsSeparated=false;
            var names=['ADBE Position','ADBE Scale','ADBE Anchor Point','ADBE Orientation','ADBE Rotate X','ADBE Rotate Y','ADBE Rotate Z','ADBE Opacity'];
            for(var j=0;j<names.length;j++)clear(prop(l,names[j]));
            var r=l.sourceRectAtTime(c.time,false);baseWidth=Math.max(1,r.width);prop(l,'ADBE Anchor Point').setValue([r.left+r.width/2,r.top+r.height/2,0]);
            l.parent=root;prop(l,'ADBE Orientation').setValue([0,0,0]);prop(l,'ADBE Rotate X').setValue(0);prop(l,'ADBE Rotate Y').setValue(0);prop(l,'ADBE Rotate Z').setValue(0);
            layerLink(l,'MS Carousel',root);ctrl(l,'MS Slot',i);ctrl(l,'MS Count',a.length);ctrl(l,'MS Source Width',baseWidth);
            var expr='var c='+ref('MS Carousel')+';var a=('+ref('MS Slot')+'/Math.max(1,'+ref('MS Count')+')*360+c.effect("Angle")(1)+(time-c.effect("Start")(1))*c.effect("Speed")(1))*Math.PI/180;';
            ex(prop(l,'ADBE Position'),expr+'var r=c.effect("Radius")(1);[Math.sin(a)*r,0,Math.cos(a)*r];');
            ex(prop(l,'ADBE Scale'),'var s='+ref('MS Carousel')+'.effect("Card Width")(1)/'+ref('MS Source Width')+'*100;[s,s,s];');
            ex(prop(l,'ADBE Opacity'),expr+'linear(Math.cos(a),-1,1,100,c.effect("Far Opacity")(1));');
            l.motionBlur=true;a[i].enabled=false;tag(l,'carousel');
        }
        pick(c,root);return {message:'Carousel created from copies. Source layers are retained and disabled.',controlLayer:root.name};
    }
    function findComp(id) {for(var i=1;i<=app.project.numItems;i++){var x=app.project.item(i);if(x instanceof CompItem&&x.id===id)return x;}fail('The target composition was closed or removed.');}
    function mkdir(path) {var f=new Folder(path);if(!f.exists&&!f.create())fail('Cannot create folder: '+path);return f;}
    function readFile(f) {f.encoding='UTF-8';if(!f.open('r'))fail('Cannot read '+f.fsName);try{return f.read();}finally{f.close();}}
    function writeFile(f,s) {f.encoding='UTF-8';if(!f.open('w'))fail('Cannot write '+f.fsName);try{if(!f.write(s))fail('Write failed: '+f.fsName);}finally{f.close();}}
    function archiveComp(o) {
        var c=active(),original=app.project.file,rootId=c.id,rootName=c.name,time=c.time;
        if(!o.saveProjectConsent)fail('Confirm saving the current project in the Save Composition dialog.');
        if(!original){if(!app.project.saveWithDialog())fail('Save the project before storing a composition.');original=app.project.file;}
        else app.project.save(original);
        if(!original||!original.exists)fail('The current project must be saved first.');
        var dir=mkdir(o.entryPath),media=mkdir(dir.fsName+'/media'),staged=new File(dir.fsName+'/working.aep'),dest=new File(dir.fsName+'/composition.aep');
        if(dest.exists)fail('This store entry already exists. Save as a new entry.');
        var thumb=new File(dir.fsName+'/cover.png'),warnings=[],fonts=[],effects=[],seen={},item,i,l,j,switched=false,saved=false;
        try{c.saveFrameToPng(Math.max(0,Math.min(time,c.duration-c.frameDuration)),thumb);}catch(e){warnings.push('Thumbnail export unavailable; use a custom cover.');}
        if(!original.copy(staged.fsName))fail('Could not create the working project copy. Your project is unchanged.');
        try {
            switched=true;app.open(staged);c=findComp(rootId);c.comment='MS_STORE_ROOT:'+o.entryId;
            // AE reduction does not reliably retain dependencies named only inside expressions.
            var crossReferences=false,scan=[c],scanned={},scanIndex=0;
            while(scanIndex<scan.length){var scanComp=scan[scanIndex++];if(scanned[scanComp.id])continue;scanned[scanComp.id]=true;for(j=1;j<=scanComp.numLayers;j++){var scanLayer=scanComp.layer(j);if(scanLayer.source instanceof CompItem)scan.push(scanLayer.source);visitLayer(scanLayer,function(p){if(p.canSetExpression&&p.expressionEnabled&&/(^|[^\w.])(comp|footage)\s*\(/.test(p.expression))crossReferences=true;});}}
            if(crossReferences)warnings.push('The archive retains the full project because expressions refer to other compositions or footage.');
            else app.project.reduceProject([c]);
            function collect(src,index,isSequence) {
                if(!src.exists)fail('Missing media: '+src.fsName);
                var sub=mkdir(media.fsName+'/'+index),dst=new File(sub.fsName+'/'+src.name);
                if(isSequence){
                    var match=decodeURI(src.name).match(/^(.*?)(\d+)(\.[^.]+)$/);if(!match)fail('Cannot identify image sequence: '+src.name);
                    var siblings=src.parent.getFiles(),copied=0;
                    for(var z=0;z<siblings.length;z++)if(siblings[z] instanceof File){var n=decodeURI(siblings[z].name),m=n.match(/^(.*?)(\d+)(\.[^.]+)$/);if(m&&m[1]===match[1]&&m[2].length===match[2].length&&m[3]===match[3]){if(!siblings[z].copy(sub.fsName+'/'+siblings[z].name))fail('Could not copy image sequence.');copied++;}}
                    if(!copied)fail('No image-sequence frames found.');
                }else if(!src.copy(dst.fsName))fail('Could not copy media: '+src.fsName);
                return dst;
            }
            for(i=1;i<=app.project.numItems;i++) {
                item=app.project.item(i);
                if(item instanceof FootageItem&&item.file){
                    var sourceName=item.name,f=item.file,ext=decodeURI(f.name).split('.').pop().toLowerCase();
                    if(ext==='gltf'||ext==='obj')fail('Store external 3D assets as a self-contained GLB before archiving.');
                    var seq=!item.mainSource.isStill&&/^(png|jpg|jpeg|exr|tif|tiff|dpx|tga|bmp)$/.test(ext),col=collect(f,i,seq);
                    if(seq)item.replaceWithSequence(col,false);else item.replace(col);item.name=sourceName;
                }
                if(item.proxySource&&item.proxySource.file){var using=item.useProxy,pf=item.proxySource.file,pe=decodeURI(pf.name).split('.').pop().toLowerCase(),ps=!item.proxySource.isStill&&/^(png|jpg|jpeg|exr|tif|tiff|dpx|tga|bmp)$/.test(pe);var proxy=collect(pf,'proxy-'+i,ps);if(ps)item.setProxyWithSequence(proxy,false);else item.setProxy(proxy);item.useProxy=using;}
                if(item instanceof CompItem)for(j=1;j<=item.numLayers;j++){
                    l=item.layer(j);var tp=l.property('ADBE Text Properties');if(tp){var font=tp.property('ADBE Text Document').value.font;if(!seen['font'+font]){fonts.push(font);seen['font'+font]=true;}}
                    var ep=l.property('ADBE Effect Parade');if(ep)for(var k=1;k<=ep.numProperties;k++){var mn=ep.property(k).matchName;if(!seen['fx'+mn]){effects.push(mn);seen['fx'+mn]=true;}}
                }
            }
            app.project.save(dest);saved=dest.exists;if(!saved)fail('The composition project was not written.');
            writeFile(new File(dir.fsName+'/entry.json'),json({id:o.entryId,name:o.name||rootName,tags:o.tags||[],created:new Date().getTime(),rootName:rootName,width:c.width,height:c.height,duration:c.duration,fps:c.frameRate,ae:app.version,fonts:fonts,effects:effects,warnings:warnings,cover:thumb.exists?'cover.png':null,project:'composition.aep'}));
        } finally {
            if(switched){app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES);app.open(original);try{var restored=findComp(rootId);restored.time=time;restored.openInViewer();}catch(ignore){}}
            if(saved&&staged.exists)staged.remove();
        }
        return {message:'Composition and used media saved. Your original project is restored.',entryPath:dir.fsName,warnings:warnings};
    }
    function importComp(o) {
        var destination=app.project.activeItem,projectFile=new File(o.entryPath+'/composition.aep');
        if(!projectFile.exists)fail('Stored project not found.');var metadata=parseJSON(readFile(new File(o.entryPath+'/entry.json'))),ids={},i,item;
        for(i=1;i<=app.project.numItems;i++)ids[app.project.item(i).id]=true;
        var options=new ImportOptions(projectFile);if(options.canImportAs(ImportAsType.PROJECT))options.importAs=ImportAsType.PROJECT;
        var folder=app.project.importFile(options),root=null;
        for(i=1;i<=app.project.numItems;i++){item=app.project.item(i);if(!ids[item.id]&&item instanceof CompItem&&item.comment==='MS_STORE_ROOT:'+metadata.id){root=item;break;}}
        if(!root)fail('Could not locate the stored root composition. Imported items remain in the Project panel.');
        if(destination instanceof CompItem&&o.addToComp!==false){var l=destination.layers.add(root);l.startTime=destination.time;pick(destination,l);destination.openInViewer();}
        else root.openInViewer();
        return {message:'Imported '+metadata.name+'.',fonts:metadata.fonts,effects:metadata.effects};
    }
    function audit() {
        var c=active(),errors=[],n=0,times=[c.time,Math.min(c.duration-c.frameDuration,c.time+.4),Math.min(c.duration-c.frameDuration,c.time+1.5)],i,j;
        for(i=1;i<=c.numLayers;i++){var l=c.layer(i);visitLayer(l,function(p){if(p.canSetExpression&&p.expressionEnabled){n++;for(j=0;j<times.length;j++){try{p.valueAtTime(times[j],false);if(p.expressionError){errors.push(l.name+' / '+p.name+': '+p.expressionError);break;}}catch(e){errors.push(l.name+' / '+p.name+': '+e.toString());break;}}}});}
        return {message:errors.length?errors.length+' expression error(s).':'No expression errors at the sampled times.',checked:n,errors:errors};
    }
        // Original comp tools. All routes share the core's ES3 serializer and Undo group.
    function result(message, rows, warnings) {return {message:message,rows:rows||[],warnings:warnings||[]};}
    function yes(v) {return v===true||v==='yes';}
    function contains(a,v) {for(var i=0;i<a.length;i++)if(a[i]===v)return true;return false;}
    function cleanCreated(a) {for(var i=a.length-1;i>=0;i--){try{if(typeof a[i].locked==='boolean')a[i].locked=false;}catch(ignore){}try{a[i].remove();}catch(ignore2){}}}
    function visitLayer(l,fn) {
        // Layer.numProperties omits named groups such as Transform and Text.
        var seen={},i,p,names=['ADBE Transform Group','ADBE Text Properties','ADBE Root Vectors Group','ADBE Layer Styles','ADBE Time Remapping','ADBE Marker'];
        function descend(g,path) {if(g.propertyType===PropertyType.PROPERTY){fn(g,path);return;}for(var j=1;j<=g.numProperties;j++){var x=g.property(j);if(x)descend(x,path.concat([j]));}}
        for(i=1;i<=l.numProperties;i++){p=l.property(i);if(p){seen['$'+p.matchName]=true;descend(p,[p.matchName]);}}
        for(i=0;i<names.length;i++)if(!seen['$'+names[i]]){p=l.property(names[i]);if(p)descend(p,[names[i]]);}
    }
    function atPath(l,path) {var p=l;for(var i=0;i<path.length&&p;i++)p=p.property(path[i]);return p;}
    function easeScaled(a,k) {var out=[];for(var i=0;i<a.length;i++)out.push(new KeyframeEase(a[i].speed/k,a[i].influence));return out;}
    function snapshotProperty(p) {
        var s={value:p.value,keys:[],expression:p.canSetExpression?p.expression:'',enabled:p.canSetExpression?p.expressionEnabled:false},i,k;
        for(i=1;i<=p.numKeys;i++){
            k={time:p.keyTime(i),value:p.keyValue(i)};
            try{k.input=p.keyInInterpolationType(i);k.output=p.keyOutInterpolationType(i);k.ein=p.keyInTemporalEase(i);k.eout=p.keyOutTemporalEase(i);k.tc=p.keyTemporalContinuous(i);k.ta=p.keyTemporalAutoBezier(i);}catch(ignore){}
            if(p.isSpatial)try{k.sin=p.keyInSpatialTangent(i);k.sout=p.keyOutSpatialTangent(i);k.sc=p.keySpatialContinuous(i);k.sa=p.keySpatialAutoBezier(i);k.roving=p.keyRoving(i);}catch(ignore2){}
            s.keys.push(k);
        }return s;
    }
    function restoreProperty(p,s,offset,scale) {
        offset=offset||0;scale=scale||1;var i,k;
        if(p.canSetExpression)p.expression='';while(p.numKeys)p.removeKey(p.numKeys);
        if(!s.keys.length)p.setValue(s.value);
        for(i=0;i<s.keys.length;i++)p.setValueAtTime(offset+s.keys[i].time*scale,s.keys[i].value);
        for(i=0;i<s.keys.length;i++){
            k=s.keys[i];
            if(k.ein&&k.eout)p.setTemporalEaseAtKey(i+1,easeScaled(k.ein,scale),easeScaled(k.eout,scale));
            if(k.input!==undefined&&k.output!==undefined)p.setInterpolationTypeAtKey(i+1,k.input,k.output);
            if(k.tc!==undefined)p.setTemporalContinuousAtKey(i+1,k.tc);
            if(k.ta!==undefined)p.setTemporalAutoBezierAtKey(i+1,k.ta);
            if(k.sin){p.setSpatialTangentsAtKey(i+1,k.sin,k.sout);p.setSpatialContinuousAtKey(i+1,k.sc);p.setSpatialAutoBezierAtKey(i+1,k.sa);if(i>0&&i<s.keys.length-1)p.setRovingAtKey(i+1,k.roving);}
        }
        if(s.expression){p.expression=s.expression;p.expressionEnabled=s.enabled;}
    }
    function compRoots(o) {
        var out=[],a,i,c;
        if(o.scope==='project'){a=app.project.selection;for(i=0;i<a.length;i++)if(a[i] instanceof CompItem)out.push(a[i]);}
        else if(o.scope==='layers'){c=active();a=c.selectedLayers;for(i=0;i<a.length;i++)if(a[i].source instanceof CompItem&&!contains(out,a[i].source))out.push(a[i].source);}
        else out=[active()];
        if(!out.length)fail('Select one or more compositions in the requested scope.');return out;
    }
    function projectName(n) {var base=n||'Composition',name=base,k=1,found,i;do{found=false;for(i=1;i<=app.project.numItems;i++)if(app.project.item(i).name===name){found=true;break;}if(found)name=base+' '+(++k);}while(found);return name;}
    function renameCopy(n,o,set) {var s=String(n);if(o.find)s=s.split(String(o.find)).join(String(o.replace||''));return String(o.prefix||'')+s+String(o.suffix===undefined?' Copy':o.suffix)+(set>0?' '+(set+1):'');}
    function literalExpression(src,names) {
        // Lexical, deliberately conservative: never rewrite comments, strings, templates or regex/division expressions.
        var i=0,out='',quote,c,start,value,m,changed=0,ambiguous=false;
        while(i<src.length){c=src.charAt(i);
            if(src.substr(i,2)==='//'){start=i;i=src.indexOf('\n',i);if(i<0)i=src.length;out+=src.substring(start,i);continue;}
            if(src.substr(i,2)==='/*'){start=i;i=src.indexOf('*/',i+2);if(i<0)return {text:src,changed:0,warning:true};i+=2;out+=src.substring(start,i);continue;}
            if(c==='/'||c==='`')return {text:src,changed:0,warning:true};
            if(c==='"'||c==="'"){quote=c;start=i++;while(i<src.length){if(src.charAt(i)==='\\')i+=2;else if(src.charAt(i++)===quote)break;}out+=src.substring(start,i);continue;}
            if(src.substr(i,4)==='comp'&&(i===0||!/[\w$.]/.test(src.charAt(i-1)))){
                m=src.substring(i).match(/^comp\s*\(\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')\s*\)/);
                if(m){value=m[1].substring(1,m[1].length-1);if(/\\[^\\"']/.test(value)){ambiguous=true;}else{value=value.replace(/\\([\\"'])/g,'$1');if(names.hasOwnProperty('$'+value)){out+='comp('+json(names['$'+value])+')';i+=m[0].length;changed++;continue;}}}
                else if(/^comp\s*\(/.test(src.substring(i)))ambiguous=true;
            }out+=c;i++;
        }return {text:out,changed:changed,warning:ambiguous};
    }
    function deepDuplicate(o) {
        var roots=compRoots(o),nodes=[],depth={},queue=[],i,j,k,c,l,src,limit=Math.round(number(o.depth,0,0,100)),copies=Math.round(number(o.copies,1,1,30)),warnings=[],rows=[],created=[],counts=0,rewrites=0,mediaCount=0;
        var filter=null;if(o.filter){if(o.filterType==='regex'){try{filter=new RegExp(String(o.filter),'i');}catch(e){fail('Invalid dependency filter: '+e.toString());}}else filter=String(o.filter).toLowerCase();}
        function allowed(n){if(!filter)return true;var found=typeof filter==='string'?n.toLowerCase().indexOf(filter)>=0:filter.test(n);return o.filterMode==='include'?found:!found;}
        for(i=0;i<roots.length;i++){depth[roots[i].id]=0;queue.push(roots[i]);}
        for(i=0;i<queue.length;i++){c=queue[i];if(contains(nodes,c))continue;nodes.push(c);if(limit&&depth[c.id]>=limit)continue;for(j=1;j<=c.numLayers;j++){src=c.layer(j).source;if(src instanceof CompItem&&allowed(src.name)&&depth[src.id]===undefined){depth[src.id]=depth[c.id]+1;queue.push(src);}}}
        var globalNames={};for(i=1;i<=app.project.numItems;i++){c=app.project.item(i);if(c instanceof CompItem)globalNames['$'+c.name]=(globalNames['$'+c.name]||0)+1;}
        try{
            for(var set=0;set<copies;set++){
                var map={},folderMap={},names={},media={},folder=null;
                if(o.folders!=='original'){folder=app.project.items.addFolder(projectName('MS Duplicate '+(set+1)));created.push(folder);}
                function targetFolder(f){if(o.folders==='original')return f;if(o.folders!=='hierarchy'||!f||f===app.project.rootFolder)return folder;if(!folderMap[f.id]){var parent=targetFolder(f.parentFolder),nf=app.project.items.addFolder(f.name);created.push(nf);nf.parentFolder=parent;folderMap[f.id]=nf;}return folderMap[f.id];}
                for(i=0;i<nodes.length;i++){c=nodes[i];var clone=c.duplicate();created.push(clone);clone.name=projectName(renameCopy(c.name,o,set));clone.parentFolder=targetFolder(c.parentFolder);map[c.id]=clone;if(globalNames['$'+c.name]===1)names['$'+c.name]=clone.name;else warnings.push('Ambiguous comp name: '+c.name+'. Literal expression links were left unchanged.');counts++;}
                function duplicateMedia(item){
                    if(media[item.id])return media[item.id];var io,copy,tmp,solid;
                    if(item.mainSource instanceof SolidSource){tmp=app.project.items.addComp('MS Solid Transfer',item.width,item.height,item.pixelAspect,1,30);created.push(tmp);solid=tmp.layers.addSolid(item.mainSource.color,item.name,item.width,item.height,item.pixelAspect,1);copy=solid.source;created.push(copy);tmp.remove();}
                    else if(item.file&&item.file.exists){io=new ImportOptions(item.file);io.sequence=!item.mainSource.isStill&&/\.(?:png|jpe?g|tiff?|tga|exr|dpx|cin|psd|bmp)$/i.test(item.file.name);copy=app.project.importFile(io);created.push(copy);var attrs=['alphaMode','premulColor','invertAlpha','fieldSeparationType','removePulldown','highQualityFieldSeparation','conformFrameRate','loop'];for(var ai=0;ai<attrs.length;ai++)try{copy.mainSource[attrs[ai]]=item.mainSource[attrs[ai]];}catch(ignore){}if(item.proxySource&&item.proxySource.file){if(item.proxySource.isStill||!/\.(?:png|jpe?g|tiff?|tga|exr|dpx|cin|psd|bmp)$/i.test(item.proxySource.file.name))copy.setProxy(item.proxySource.file);else copy.setProxyWithSequence(item.proxySource.file,false);copy.useProxy=item.useProxy;}}
                    else{warnings.push('Shared unsupported or missing footage: '+item.name);return item;}
                    copy.name=projectName(renameCopy(item.name,o,set));copy.parentFolder=targetFolder(item.parentFolder);media[item.id]=copy;mediaCount++;return copy;
                }
                for(i=0;i<nodes.length;i++){
                    c=nodes[i];var dest=map[c.id];
                    for(j=1;j<=c.numLayers;j++){l=dest.layer(j);src=c.layer(j).source;if(src&&map[src.id])l.replaceSource(map[src.id],false);else if(src instanceof FootageItem&&o.media==='items')l.replaceSource(duplicateMedia(src),false);
                        if(o.expressions!=='no')visitLayer(l,function(p){if(!p.canSetExpression||!p.expression)return;var old=p.expression,enabled=p.expressionEnabled,r=literalExpression(old,names);if(r.warning)warnings.push(dest.name+' / '+l.name+': complex expression kept for review.');if(r.changed){p.expression=r.text;p.expressionEnabled=enabled;if(enabled){try{p.valueAtTime(dest.time,false);}catch(ignore){}if(p.expressionError){p.expression=old;p.expressionEnabled=enabled;warnings.push(dest.name+' / '+l.name+': expression rewrite reverted after an AE error.');return;}}rewrites+=r.changed;}});
                    }
                }
                for(i=0;i<roots.length;i++)rows.push({composition:map[roots[i].id].name,compId:map[roots[i].id].id,layers:map[roots[i].id].numLayers});
            }
        }catch(e){cleanCreated(created);fail('Duplication stopped; created items were removed. '+e.toString());}
        for(i=1;i<=app.project.numItems;i++)app.project.item(i).selected=false;
        for(i=0;i<rows.length;i++)findComp(rows[i].compId).selected=true;
        return result(counts+' compositions duplicated; '+mediaCount+' footage items copied; '+rewrites+' literal expression links updated.',rows,warnings);
    }
    function extractComp(o) {
        var c=active(),outer=selected(c),plans=[],created=[],rows=[],warnings=[],i,j,l,s,op;
        // Preflight the complete selection before the first copy.
        for(i=0;i<outer.length;i++){
            l=outer[i];s=l.source;if(!(s instanceof CompItem))fail(l.name+': select precomp layers only.');
            if(l.threeDLayer||l.collapseTransformation||l.timeRemapEnabled||l.stretch<=0)fail(l.name+': extraction needs a 2D precomp with positive stretch, no time remap or collapsed transforms.');
            if(l.autoOrient!==undefined&&l.autoOrient!==AutoOrientType.NO_AUTO_ORIENT)fail(l.name+': bake outer Auto-Orient before extracting.');
            if(s.pixelAspect!==c.pixelAspect)fail(l.name+': comp pixel aspect ratios must match.');
            op=prop(l,'ADBE Opacity');if(op.expression||op.numKeys||op.value!==100||l.blendingMode!==BlendingMode.NORMAL||l.hasTrackMatte||l.isTrackMatte||l.adjustmentLayer)fail(l.name+': outer opacity, blending, adjustment layers and mattes must be flattened first.');
            var effects=l.property('ADBE Effect Parade'),masks=l.property('ADBE Mask Parade'),styles=l.property('ADBE Layer Styles');
            if((effects&&effects.numProperties)||(masks&&masks.numProperties)||(styles&&styles.numProperties&&styles.enabled))fail(l.name+': outer effects, masks or layer styles cannot be transferred without changing compositing.');
            var parent=l.parent;while(parent){if(parent.threeDLayer)fail(l.name+': 3D parent chains are unsupported.');parent=parent.parent;}
            visitLayer(l,function(p){if(p.canSetExpression&&p.expression)fail(l.name+': remove or bake outer expressions first.');});
            var items=[];
            for(j=1;j<=s.numLayers;j++){
                var inner=s.layer(j),timed=[],links=[];
                if(inner.threeDLayer||inner instanceof CameraLayer||inner instanceof LightLayer||inner.adjustmentLayer||inner.solo||inner.stretch<=0)fail(s.name+' / '+inner.name+': 3D, adjustment, solo or reversed layers need to remain precomposed.');
                if(inner.autoOrient!==undefined&&inner.autoOrient!==AutoOrientType.NO_AUTO_ORIENT)fail(inner.name+': bake Auto-Orient before extracting.');
                visitLayer(inner,function(p,path){if(p.canSetExpression&&p.expression&&o.expressions!=='keep')fail(s.name+' / '+inner.name+': expressions depend on their comp. Choose Keep expressions to proceed with manual review.');if(p.numKeys)timed.push({path:path,state:snapshotProperty(p)});if(p.propertyValueType===PropertyValueType.LAYER_INDEX){if(p.numKeys||p.expression)fail(inner.name+': animated layer references are unsupported.');links.push({path:path,index:p.value});}});
                items.push({layer:inner,index:j,parent:inner.parent?inner.parent.index:0,matte:inner.trackMatteLayer?inner.trackMatteLayer.index:0,matteType:inner.trackMatteType,timed:timed,links:links});
            }
            plans.push({outer:l,items:items,enabled:l.enabled,audio:l.audioEnabled,solo:l.solo});
        }
        try{
            for(i=0;i<plans.length;i++){
                var plan=plans[i],original=plan.outer,scale=original.stretch/100,offset=original.startTime,map={},helper=nullLayer(c,original.name+' · Transform',false);created.push(helper);
                helper.moveBefore(original);if(original.parent)helper.setParentWithJump(original.parent);
                var tn=['ADBE Anchor Point','ADBE Position','ADBE Scale','ADBE Rotate Z'];
                if(prop(original,'ADBE Position').dimensionsSeparated)prop(helper,'ADBE Position').dimensionsSeparated=true;
                for(j=0;j<tn.length;j++){var sp=prop(original,tn[j]),dp=prop(helper,tn[j]);if(sp.dimensionsSeparated){for(var dim=0;dim<2;dim++)restoreProperty(dp.getSeparationFollower(dim),snapshotProperty(sp.getSeparationFollower(dim)),0,1);}else restoreProperty(dp,snapshotProperty(sp),0,1);}
                for(j=plan.items.length-1;j>=0;j--){var item=plan.items[j];item.layer.copyToComp(c);var copy=c.layer(1);created.push(copy);copy.locked=false;copy.moveBefore(original);map[item.index]=copy;copy.setParentWithJump();copy.stretch=item.layer.stretch*scale;copy.startTime=offset+item.layer.startTime*scale;copy.inPoint=offset+item.layer.inPoint*scale;copy.outPoint=offset+item.layer.outPoint*scale;
                    if(copy.outPoint<=original.inPoint||copy.inPoint>=original.outPoint)copy.enabled=false;else{copy.inPoint=Math.max(copy.inPoint,original.inPoint);copy.outPoint=Math.min(copy.outPoint,original.outPoint);copy.enabled=item.layer.enabled&&plan.enabled;}
                    copy.audioEnabled=!!(item.layer.audioEnabled&&plan.audio);copy.solo=plan.solo;
                    if(yes(o.prefixNames))copy.name=original.name+' / '+item.layer.name;
                    for(var ti=0;ti<item.timed.length;ti++)restoreProperty(atPath(copy,item.timed[ti].path),item.timed[ti].state,offset,scale);
                }
                // Correct order above was reversed by copyToComp; explicitly restore top-to-bottom order.
                for(j=0;j<plan.items.length;j++)map[plan.items[j].index].moveBefore(original);
                for(j=0;j<plan.items.length;j++){item=plan.items[j];copy=map[item.index];copy.setParentWithJump(item.parent?map[item.parent]:helper);if(item.matte)copy.setTrackMatte(map[item.matte],item.matteType);for(var li=0;li<item.links.length;li++)atPath(copy,item.links[li].path).setValue(item.links[li].index&&map[item.links[li].index]?map[item.links[li].index].index:0);copy.locked=item.layer.locked;}
                rows.push({composition:c.name,source:original.name,layers:plan.items.length,compId:c.id});
            }
            // Commit only after every extraction has completed.
            for(i=0;i<plans.length;i++){plans[i].outer.enabled=false;plans[i].outer.audioEnabled=false;plans[i].outer.solo=false;}
        }catch(e){cleanCreated(created);for(i=0;i<plans.length;i++)try{plans[i].outer.enabled=plans[i].enabled;plans[i].outer.audioEnabled=plans[i].audio;plans[i].outer.solo=plans[i].solo;}catch(ignore){}fail('Extraction stopped; new layers were removed and originals retained. '+e.toString());}
        warnings.push('Original precomp instances are retained disabled. Source comps are unchanged. Extraction removes the source-comp crop boundary and can change effects that sample time or neighboring layers.');
        if(o.expressions==='keep')warnings.push('Expressions were copied verbatim. thisComp, time, index, random and named layer references require manual review; they are not rewritten.');
        return result(outer.length+' precomp instance(s) extracted with transform helpers.',rows,warnings);
    }

    // Text Marks and Text Workshop: native editable AE layers, no purchased presets.
    function textProperty(l) {var g=l.property('ADBE Text Properties');return g?g.property('ADBE Text Document'):null;}
    function textLayers(o) {
        var out=[],i,j,c,a;
        if(o.scope==='project'){for(i=1;i<=app.project.numItems;i++){c=app.project.item(i);if(c instanceof CompItem)for(j=1;j<=c.numLayers;j++)if(textProperty(c.layer(j)))out.push(c.layer(j));}}
        else{c=active();a=o.scope==='comp'?null:c.selectedLayers;if(a){for(i=0;i<a.length;i++)if(textProperty(a[i]))out.push(a[i]);}else for(i=1;i<=c.numLayers;i++)if(textProperty(c.layer(i)))out.push(c.layer(i));}
        if(!out.length)fail('No text layers in this scope. Select text or choose a wider scope.');return out;
    }
    function markText(o) {
        var c=active(),a=selected(c),created=[],i,style=o.markStyle||'underline';
        if(!contains(['underline','strike','highlight','half','scribble'],style))fail('Unknown mark style.');
        for(i=0;i<a.length;i++)if(!textProperty(a[i]))fail('Select text layers for Text Marks.');
        try{for(i=0;i<a.length;i++){
            var target=a[i],l=c.layers.addShape();created.push(l);l.name=unique(c,target.name+' · '+style);l.threeDLayer=target.threeDLayer;l.setParentWithJump(target);
            prop(l,'ADBE Anchor Point').setValue(l.threeDLayer?[0,0,0]:[0,0]);prop(l,'ADBE Position').setValue(l.threeDLayer?[0,0,0]:[0,0]);l.moveAfter(target);l.inPoint=target.inPoint;l.outPoint=target.outPoint;
            timeControls(l,c.time,number(o.duration,.65,.05,10));ctrl(l,'Color',o.color||[.76,.59,1],'ADBE Color Control');ctrl(l,'Thickness',number(o.thickness,7,.5,200));ctrl(l,'Padding X',number(o.padX,12,0,400));ctrl(l,'Padding Y',number(o.padY,6,0,400));ctrl(l,'Offset Y',number(o.offset,5,-500,500));ctrl(l,'Roundness',number(o.roundness,6,0,200));ctrl(l,'Progress',number(o.progress,100,0,100));ctrl(l,'Animate',o.animate==='no'?0:1,'ADBE Checkbox Control');
            ex(prop(l,'ADBE Opacity'),'parent.transform.opacity;');
            var g=l.property('ADBE Root Vectors Group'),base='var r=parent.sourceRectAtTime(time,false);var px=effect("Padding X")(1),py=effect("Padding Y")(1),y=effect("Offset Y")(1);';
            var progress='var d=Math.max(.001,effect("MS Duration")(1));var u=clamp((time-effect("MS Start")(1))/d,0,1);var q=(effect("Animate")(1)>0?1-Math.pow(1-u,3):1)*clamp(effect("Progress")(1)/100,0,1);';
            if(style==='highlight'||style==='half'){
                var rect=g.addProperty('ADBE Vector Shape - Rect');
                ex(rect.property('ADBE Vector Rect Size'),base+progress+'[Math.max(.001,(r.width+2*px)*q),Math.max(.001,r.height*'+(style==='half'?'.5':'1')+'+2*py)];');
                ex(rect.property('ADBE Vector Rect Position'),base+progress+'[r.left-px+(r.width+2*px)*q/2,r.top+r.height*'+(style==='half'?'.75':'.5')+'+y];');
                ex(rect.property('ADBE Vector Rect Roundness'),'effect("Roundness")(1);');
                var fill=g.addProperty('ADBE Vector Graphic - Fill');ex(fill.property('ADBE Vector Fill Color'),'effect("Color")(1);');
            }else{
                var path=g.addProperty('ADBE Vector Shape - Group'),code=base+'var x=r.left-px,w=r.width+2*px;var yy=r.top+r.height*'+(style==='strike'?'.52':'1')+'+y;';
                if(style==='scribble')code+='var pts=[],ins=[],outs=[];for(var i=0;i<9;i++){pts.push([x+w*i/8,yy+Math.sin(i*2.4)*effect("Thickness")(1)*.7]);ins.push([-w/32,0]);outs.push([w/32,0]);}createPath(pts,ins,outs,false);';
                else code+='createPath([[x,yy],[x+w,yy]],[],[],false);';
                ex(path.property('ADBE Vector Shape'),code);
                var stroke=g.addProperty('ADBE Vector Graphic - Stroke');ex(stroke.property('ADBE Vector Stroke Color'),'effect("Color")(1);');ex(stroke.property('ADBE Vector Stroke Width'),'effect("Thickness")(1);');stroke.property('ADBE Vector Stroke Line Cap').setValue(2);
                var trim=g.addProperty('ADBE Vector Filter - Trim');ex(trim.property('ADBE Vector Trim End'),progress+'q*100;');
            }tag(l,'text-mark');
        }}catch(e){cleanCreated(created);fail('Text Marks stopped; new marks were removed. '+e.toString());}
        return result(a.length+' live '+style+' mark(s) created.',[],['Marks follow the full text bounding box. Multiline text is treated as one block; individual word selection and per-line marks are not included.']);
    }
    function editableDocs(a) {
        var out=[],i,p,docs,k;
        for(i=0;i<a.length;i++){if(a[i].locked)fail('Unlock '+a[i].name+' first.');p=textProperty(a[i]);if(p.expression)fail(a[i].name+': source text has an expression. Bake or remove it before editing the text.');docs=[];if(p.numKeys){for(k=1;k<=p.numKeys;k++)docs.push({key:k,original:p.keyValue(k),value:p.keyValue(k)});}else docs.push({key:0,original:p.value,value:p.value});out.push({layer:a[i],property:p,docs:docs});}return out;
    }
    function commitDocs(items) {
        var i,j,d;try{for(i=0;i<items.length;i++)for(j=0;j<items[i].docs.length;j++){d=items[i].docs[j];if(d.key)items[i].property.setValueAtKey(d.key,d.value);else items[i].property.setValue(d.value);}}
        catch(e){for(i=0;i<items.length;i++)for(j=0;j<items[i].docs.length;j++){d=items[i].docs[j];try{if(d.key)items[i].property.setValueAtKey(d.key,d.original);else items[i].property.setValue(d.original);}catch(ignore){}}fail('Text changes were rolled back: '+e.toString());}
    }
    function changeCase(d,mode) {
        var s=d.text,i,ch,v,wordStart=true,sentenceStart=true;
        var changes=[];
        for(i=0;i<s.length;i++){ch=s.charAt(i);v=ch;
            if(mode==='upper')v=ch.toUpperCase();else if(mode==='lower')v=ch.toLowerCase();
            else if(mode==='title')v=wordStart?ch.toUpperCase():ch.toLowerCase();
            else if(mode==='sentence')v=sentenceStart?ch.toUpperCase():ch.toLowerCase();
            else if(mode==='vowels')v=/[aeiou]/i.test(ch)?ch.toUpperCase():ch.toLowerCase();
            else if(mode==='consonants')v=/[a-z]/i.test(ch)&&!/[aeiou]/i.test(ch)?ch.toUpperCase():ch.toLowerCase();
            else if(mode==='edges')v=wordStart||i===s.length-1||/\s/.test(s.charAt(i+1))?ch.toUpperCase():ch.toLowerCase();
            else if(mode==='alternating')v=i%2?ch.toLowerCase():ch.toUpperCase();
            if(/[a-z\u00c0-\uffff]/i.test(ch))sentenceStart=false;if(/[.!?\r\n]/.test(ch))sentenceStart=true;wordStart=/\s/.test(ch);
            if(v!==ch)changes.push({i:i,v:v});
        }
        for(i=changes.length-1;i>=0;i--)d.characterRange(changes[i].i,changes[i].i+1).text=changes[i].v;
    }
    function trimText(d) {
        var s=d.text,matches=[],re=/[ \t]+(?=[\r\n]|$)|(^|[\r\n])[ \t]+/g,m,start;
        while((m=re.exec(s))!==null){start=m.index+(m[1]?m[1].length:0);matches.push([start,m.index+m[0].length]);}
        for(var i=matches.length-1;i>=0;i--)if(matches[i][1]>matches[i][0])d.characterRange(matches[i][0],matches[i][1]).text='';
    }
    function replaceText(d,find,replacement) {if(!find)fail('Enter the text to find.');var positions=[],i=0,s=d.text;while((i=s.indexOf(find,i))>=0){positions.push(i);i+=find.length;}for(i=positions.length-1;i>=0;i--)d.characterRange(positions[i],positions[i]+find.length).text=replacement;}
    function allStyle(d,name,v) {if(d.text.length)d.characterRange(0,d.text.length)[name]=v;else d[name]=v;}
    function styleFile() {return new File(mkdir(Folder.userData.fsName+'/MeelanStudio').fsName+'/text-styles.json');}
    function loadStyles() {var f=styleFile();if(!f.exists)return [];var data=parseJSON(readFile(f));if(!(data instanceof Array))fail('Text style file is invalid.');return data;}
    function saveStyles(styles) {var f=styleFile(),backup=new File(f.fsName+'.bak'),temp=new File(f.fsName+'.tmp');if(f.exists&&!f.copy(backup.fsName))fail('Cannot back up existing text styles.');try{writeFile(temp,json(styles));parseJSON(readFile(temp));if(!temp.copy(f.fsName))fail('Could not save text styles.');}catch(e){if(backup.exists)backup.copy(f.fsName);throw e;}finally{if(temp.exists)temp.remove();}}
    function textStyles() {return {styles:loadStyles()};}
    function styleFrom(d) {var names=['font','fontSize','applyFill','fillColor','applyStroke','strokeColor','strokeWidth','strokeOverFill','tracking','autoLeading','leading'],s={},i;for(i=0;i<names.length;i++)try{s[names[i]]=d[names[i]];}catch(ignore){}return s;}
    function styleApply(d,s) {var names=['font','fontSize','fillColor','strokeColor','strokeWidth','strokeOverFill','tracking','leading','autoLeading','applyFill','applyStroke'];for(var i=0;i<names.length;i++)if(s[names[i]]!==undefined)allStyle(d,names[i],s[names[i]]);}
    function point2D(l,p,t) {
        var guard=0;
        while(l){if(l.threeDLayer)fail('3D layer bounds need a rendered camera view.');if(++guard>100)fail('Parent chain exceeds 100 layers.');var a=prop(l,'ADBE Anchor Point').valueAtTime(t,false),s=prop(l,'ADBE Scale').valueAtTime(t,false),pos=prop(l,'ADBE Position').valueAtTime(t,false),r=prop(l,'ADBE Rotate Z').valueAtTime(t,false)*Math.PI/180,x=(p[0]-a[0])*s[0]/100,y=(p[1]-a[1])*s[1]/100;p=[pos[0]+x*Math.cos(r)-y*Math.sin(r),pos[1]+x*Math.sin(r)+y*Math.cos(r)];l=l.parent;}return p;
    }
    function layerBounds(l,t) {var r=l.sourceRectAtTime(t,true),pts=[[r.left,r.top],[r.left+r.width,r.top],[r.left+r.width,r.top+r.height],[r.left,r.top+r.height]],b=[Infinity,Infinity,-Infinity,-Infinity],i,p;for(i=0;i<pts.length;i++){p=point2D(l,pts[i],t);b[0]=Math.min(b[0],p[0]);b[1]=Math.min(b[1],p[1]);b[2]=Math.max(b[2],p[0]);b[3]=Math.max(b[3],p[1]);}return b;}
    function contrast(a,b) {function lum(v){var out=0,weights=[.2126,.7152,.0722];for(var i=0;i<3;i++)out+=weights[i]*(v[i]<=.04045?v[i]/12.92:Math.pow((v[i]+.055)/1.055,2.4));return out;}var x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
    function textInspect(o,a) {
        var rows=[],i,l,c,p,d,s,flags,ratios=[['9:16',9/16],['16:9',16/9],['1:1',1],['4:5',4/5],['2:3',2/3],['3:4',3/4]],fonts={},sizes={};
        for(i=0;i<a.length;i++){d=textProperty(a[i]).value;fonts['$'+d.font]=(fonts['$'+d.font]||0)+1;sizes['$'+Math.round(d.fontSize)]=(sizes['$'+Math.round(d.fontSize)]||0)+1;}
        function common(m){var best='',count=0,k;for(k in m)if(m.hasOwnProperty(k)&&m[k]>count){best=k;count=m[k];}return best;}
        var mainFont=common(fonts),mainSize=common(sizes);
        for(i=0;i<a.length;i++){
            l=a[i];c=l.containingComp;p=textProperty(l);d=p.valueAtTime(c.time,false);s=String(d.text);flags=[];var expressions=0,fx=l.property('ADBE Effect Parade'),scale=prop(l,'ADBE Scale').value,b=null,safe=[];
            visitLayer(l,function(v){if(v.canSetExpression&&v.expressionEnabled)expressions++;});
            if(/(^|[\r\n])[ \t]|[ \t]($|[\r\n])/.test(s))flags.push('edge whitespace');if(/lorem ipsum|placeholder|your text|text here/i.test(s))flags.push('placeholder');
            if(scale[0]!==100||scale[1]!==100)flags.push('scaled text');if(a.length>2&&'$'+d.font!==mainFont)flags.push('font differs');if(a.length>2&&'$'+Math.round(d.fontSize)!==mainSize)flags.push('size differs');
            try{b=layerBounds(l,c.time);}catch(ignore){flags.push('3D bounds unavailable');}
            if(b)for(var ri=0;ri<ratios.length;ri++){var ratio=ratios[ri][1],w=Math.min(c.width,c.height*ratio),h=w/ratio,margin=number(o.safeMargin,5,0,40)/100,x=(c.width-w)/2+w*margin,y=(c.height-h)/2+h*margin;safe.push(ratios[ri][0]+': '+(b[0]>=x&&b[1]>=y&&b[2]<=c.width-x&&b[3]<=c.height-y?'inside':'outside'));}
            var words=s.replace(/^\s+|\s+$/g,'').split(/\s+/).length;if(!s.replace(/\s/g,''))words=0;
            var fill=null;try{if(d.applyFill)fill=d.fillColor;}catch(ignore2){}
            rows.push({composition:c.name,layer:l.name,text:s,font:d.font,size:d.fontSize,scale:scale.join(' / '),words:words,readingSeconds:Math.round(words/number(o.wpm,180,60,500)*600)/10,contrast:fill?Math.round(contrast(fill,o.background||[.06,.05,.08])*100)/100:'no fill',effects:fx?fx.numProperties:0,expressions:expressions,safeCrops:safe.join(' | '),notes:flags.join(', ')||'No basic issues',compId:c.id,layerId:l.id});
        }
        return result(rows.length+' text layers inspected at each comp’s current time.',rows,['Font and color statistics use the first character; mixed runs, text animators, effects, masks and layer-style extents are not evaluated. Contrast uses your chosen solid background. Safe zones are centered aspect-ratio crops, not platform UI overlays.']);
    }
    function makeAnimator(l,name,values,amount,based) {
        var g=l.property('ADBE Text Properties').property('ADBE Text Animators'),a=g.addProperty('ADBE Text Animator'),idx=a.propertyIndex,k;a.name=name;
        for(k in values)if(values.hasOwnProperty(k))g.property(idx).property('ADBE Text Animator Properties').addProperty(k).setValue(values[k]);
        var selectors=g.property(idx).property('ADBE Text Selectors');while(selectors.numProperties)selectors.property(selectors.numProperties).remove();
        var selector=selectors.addProperty('ADBE Text Expressible Selector');selector.property('ADBE Text Range Type2').setValue(based||1);ex(selector.property('ADBE Text Expressible Amount'),amount);return g.property(idx);
    }
    var motionPresets={
        'fade':{opacity:0},'scale':{scale:0,opacity:0},'up':{y:70,opacity:0},'down':{y:-70,opacity:0},'left':{x:90,opacity:0},'right':{x:-90,opacity:0},'pop':{scale:0,opacity:0,spring:true},'blur':{blur:35,opacity:0},
        'soft-rise':{y:35,blur:10,opacity:0},'editorial':{y:90,rotation:6,opacity:0},'kinetic':{x:100,rotation:-12,opacity:0},'elastic':{scale:0,opacity:0,spring:true},'focus':{scale:125,blur:35,opacity:0},'cascade':{y:-100,rotation:-8,opacity:0},'flutter':{y:45,rotation:35,opacity:0,spring:true},'wide':{x:55,scale:140,opacity:0},'whisper':{y:12,blur:8,opacity:0},'swing':{rotation:-70,scale:80,opacity:0,spring:true},'slide-soft':{x:-60,blur:12,opacity:0},'type-on':{opacity:0,step:true},'random-pop':{scale:0,opacity:0,spring:true,random:true},'random-drift':{y:65,rotation:20,blur:12,opacity:0,random:true},'word-lift':{y:45,opacity:0,words:true}
    };
    function rigCheckpoint(a) {var out=[];for(var i=0;i<a.length;i++)out.push({layer:a[i],effects:a[i].property('ADBE Effect Parade').numProperties,animators:a[i].property('ADBE Text Properties').property('ADBE Text Animators').numProperties,motionBlur:a[i].motionBlur});return out;}
    function rollbackRigs(a) {for(var i=0;i<a.length;i++){var l=a[i].layer,g=l.property('ADBE Effect Parade');while(g.numProperties>a[i].effects)g.property(g.numProperties).remove();g=l.property('ADBE Text Properties').property('ADBE Text Animators');while(g.numProperties>a[i].animators)g.property(g.numProperties).remove();l.motionBlur=a[i].motionBlur;}}
    function motionText(o,a) {
        var spec=motionPresets[o.motion||'soft-rise'];if(!spec)fail('Unknown motion preset.');var i,created=[];
        for(i=0;i<a.length;i++)if(a[i].locked)fail('Unlock '+a[i].name+' first.');
        var checkpoint=rigCheckpoint(a);try{for(i=0;i<a.length;i++){
            var l=a[i],p={},suffix=' '+new Date().getTime()+' '+i,label='MS Motion'+suffix;
            // Individual runs get individual controls, so applying another preset never retimes an earlier animator.
            ctrl(l,label+' Start',l.containingComp.time);ctrl(l,label+' Duration',number(o.duration,.65,.05,10));ctrl(l,label+' Stagger',number(o.stagger,.035,0,1));
            p['ADBE Text Opacity']=0;if(spec.x||spec.y)p['ADBE Text Position 3D']=[spec.x||0,spec.y||0,0];if(spec.scale!==undefined)p['ADBE Text Scale 3D']=[spec.scale,spec.scale,spec.scale];if(spec.rotation)p['ADBE Text Rotation']=spec.rotation;if(spec.blur)p['ADBE Text Blur']=[spec.blur,spec.blur];
            var amount='var ix=textIndex-1;'+(spec.random?'seedRandom(textIndex+17,true);ix=Math.floor(random(0,textTotal));':'')+(o.order==='reverse'?'ix=textTotal-1-ix;':'')+'var u=clamp((time-effect('+json(label+' Start')+')(1)-ix*effect('+json(label+' Stagger')+')(1))/Math.max(.001,effect('+json(label+' Duration')+')(1)),0,1);';
            amount+=spec.step?'u>=1?0:100;':spec.spring?'u>=1?0:(Math.exp(-7*u)*Math.cos(u*10)*100);':o.easing==='linear'?'(1-u)*100;':'Math.pow(1-u,3)*100;';
            makeAnimator(l,'MS · '+o.motion,p,amount,spec.words||o.units==='words'?3:o.units==='lines'?4:1);l.motionBlur=true;
        }}catch(e){rollbackRigs(checkpoint);fail('Text motion stopped; new animators and controls removed. '+e.toString());}return result(a.length+' editable text motion animator(s) created.');
    }
    function colorText(o,a) {
        var colors=[o.color||[.76,.59,1],o.color2||[.4,.85,.9],o.color3||[1,.7,.5]],i,j;
        for(i=0;i<a.length;i++)if(a[i].locked)fail('Unlock '+a[i].name+' first.');
        var checkpoint=rigCheckpoint(a);try{for(i=0;i<a.length;i++)for(j=0;j<3;j++){
            var amount,p={'ADBE Text Fill Color':colors[j]},shift=Math.round(number(o.offset,0,0,100));
            if(o.colorMode==='gradient')amount=j===0?'100;':j===1?'clamp((textIndex-1)/Math.max(1,textTotal-1)*2,0,1)*100;':'clamp((textIndex-1)/Math.max(1,textTotal-1)*2-1,0,1)*100;';
            else if(o.colorMode==='random')amount='seedRandom(textIndex+'+shift+',true);Math.floor(random(0,3))==='+j+'?100:0;';
            else amount='(textIndex-1+'+shift+')%3==='+j+'?100:0;';
            makeAnimator(a[i],'MS Color '+(j+1),p,amount,1);
        }}catch(e){rollbackRigs(checkpoint);fail('Character Colors stopped; new animators removed. '+e.toString());}return result(a.length+' text layers colored with editable character selectors.');
    }
    function outlineText(o,a) {
        var created=[],i,j,n=Math.round(number(o.outlines,2,1,3)),colors=[o.color||[.76,.59,1],o.color2||[.4,.85,.9],o.color3||[1,.7,.5]];
        for(i=0;i<a.length;i++)if(a[i].locked)fail('Unlock '+a[i].name+' first.');
        try{for(i=0;i<a.length;i++)for(j=n;j>=1;j--){var src=a[i],c=src.containingComp,l=src.duplicate();created.push(l);l.locked=false;l.name=unique(c,src.name+' · Outline '+j);l.moveAfter(src);l.setParentWithJump(src);var dims=l.threeDLayer?3:2;clear(prop(l,'ADBE Anchor Point'));clear(prop(l,'ADBE Position'));if(prop(l,'ADBE Position').dimensionsSeparated)prop(l,'ADBE Position').dimensionsSeparated=false;prop(l,'ADBE Anchor Point').setValue(dims===3?[0,0,0]:[0,0]);prop(l,'ADBE Position').setValue(dims===3?[0,0,0]:[0,0]);clear(prop(l,'ADBE Scale'));prop(l,'ADBE Scale').setValue(dims===3?[100,100,100]:[100,100]);var rotations=['ADBE Rotate Z'];if(dims===3)rotations=rotations.concat(['ADBE Rotate X','ADBE Rotate Y','ADBE Orientation']);for(var ri=0;ri<rotations.length;ri++){clear(prop(l,rotations[ri]));prop(l,rotations[ri]).setValue(rotations[ri]==='ADBE Orientation'?[0,0,0]:0);}clear(prop(l,'ADBE Opacity'));ex(prop(l,'ADBE Opacity'),'parent.transform.opacity;');
            layerLink(l,'MS Outline Source',src);ctrl(l,'MS Outline Color',colors[j-1],'ADBE Color Control');ctrl(l,'MS Outline Width',number(o.thickness,4,.5,100)*j*2);
            var p=textProperty(l);clear(p);ex(p,'var L=effect("MS Outline Source")(1);text.sourceText.style.setText(L.text.sourceText.toString()).setApplyFill(false).setApplyStroke(true).setStrokeColor(effect("MS Outline Color")(1)).setStrokeWidth(effect("MS Outline Width")(1));');tag(l,'text-outline');
        }}catch(e){cleanCreated(created);fail('Outlines stopped; new outline layers were removed. '+e.toString());}
        return result(created.length+' linked outline layer(s) created.',[],['Outline content and transforms follow the original. Styling is uniform per outline. Later text animator, effect and mixed-style edits on the original do not automatically propagate to its outline copies.']);
    }
    function strokeReveal(o) {
        var c=active(),a=selected(c),created=[],i,converted=0,command=0;
        for(i=0;i<a.length;i++){if(!a[i].property('ADBE Root Vectors Group')&&!textProperty(a[i]))fail('Select text or shape layers.');if(textProperty(a[i])){command=app.findMenuCommandId('Create Shapes from Text');if(!command)fail('AE’s Create Shapes from Text command is unavailable in this UI language. Convert text to shapes in AE first, then run Stroke Reveal.');}}
        var enabled=[];for(i=0;i<a.length;i++)enabled.push(a[i].enabled);
        try{for(i=0;i<a.length;i++){
            var src=a[i],l=null,ids={},j;
            if(textProperty(src)){for(j=1;j<=c.numLayers;j++)ids[c.layer(j).id]=true;pick(c,src);app.executeCommand(command);for(j=1;j<=c.numLayers;j++)if(!ids[c.layer(j).id]&&c.layer(j).property('ADBE Root Vectors Group')){l=c.layer(j);created.push(l);break;}if(!l)fail('AE did not create a shape layer.');converted++;}
            else{l=src.duplicate();created.push(l);}
            l.locked=false;l.name=unique(c,src.name+' · Stroke');timeControls(l,c.time,number(o.duration,1,.05,10));ctrl(l,'MS Stroke Stagger',number(o.stagger,.06,0,1));ctrl(l,'MS Stroke Width',number(o.thickness,3,.5,100));ctrl(l,'MS Stroke Color',o.color||[.76,.59,1],'ADBE Color Control');
            var groupIndex=0;
            function prepare(g){var k,p,hasPath=false;
                for(k=g.numProperties;k>=1;k--){p=g.property(k);if(p.matchName==='ADBE Vector Graphic - Fill'||p.matchName==='ADBE Vector Graphic - G-Fill'||p.matchName==='ADBE Vector Graphic - Stroke'||p.matchName==='ADBE Vector Graphic - G-Stroke'||p.matchName==='ADBE Vector Filter - Trim')p.remove();}
                for(k=1;k<=g.numProperties;k++){p=g.property(k);if(p.matchName==='ADBE Vector Group')prepare(p.property('ADBE Vectors Group'));else if(/^ADBE Vector Shape/.test(p.matchName))hasPath=true;}
                if(!hasPath)return;
                var index=groupIndex++,st=g.addProperty('ADBE Vector Graphic - Stroke');ex(st.property('ADBE Vector Stroke Color'),'effect("MS Stroke Color")(1);');ex(st.property('ADBE Vector Stroke Width'),'effect("MS Stroke Width")(1);');st.property('ADBE Vector Stroke Line Cap').setValue(2);
                var tr=g.addProperty('ADBE Vector Filter - Trim'),base='var u=clamp((time-effect("MS Start")(1)-'+(o.strokeMode==='sync'?0:index)+'*effect("MS Stroke Stagger")(1))/Math.max(.001,effect("MS Duration")(1)),0,1);';
                ex(tr.property('ADBE Vector Trim End'),base+'(1-Math.pow(1-u,3))*100;');if(o.strokeMode==='travel')ex(tr.property('ADBE Vector Trim Start'),base+'clamp((u-.28)/.72,0,1)*100;');
            }prepare(l.property('ADBE Root Vectors Group'));if(!groupIndex)fail(src.name+': no supported vector paths found.');
            if(o.strokeLook==='neon'){var halo=l.duplicate();created.push(halo);halo.name=l.name+' · Halo';halo.moveAfter(l);var blur=effect(halo,'ADBE Gaussian Blur 2','MS Halo');blur.property(1).setValue(number(o.thickness,3,.5,100)*3);halo.blendingMode=BlendingMode.ADD;}
            if(o.strokeLook==='trail'){for(j=1;j<=2;j++){var trail=l.duplicate();created.push(trail);trail.name=l.name+' · Trail '+j;trail.moveAfter(l);ctrl(trail,'MS Start',c.time+.08*j);clear(prop(trail,'ADBE Opacity'));prop(trail,'ADBE Opacity').setValue(35/j);}}
            src.enabled=false;tag(l,'stroke-reveal');
        }}catch(e){cleanCreated(created);for(i=0;i<a.length;i++)a[i].enabled=enabled[i];fail('Stroke Reveal stopped; originals restored. '+e.toString());}
        return result(a.length+' stroke reveal(s) created.',[],[converted?'Converted text is an outline snapshot; originals are retained disabled.':'Original shape layers are retained disabled.','Stroke Reveal draws glyph contours, not handwriting centerlines. Wave order follows shape-group order. Preview the result in AE.']);
    }
    function centerAnchor(a) {
        var i;for(i=0;i<a.length;i++){var l=a[i],p=prop(l,'ADBE Position'),anchor=prop(l,'ADBE Anchor Point');if(l.locked||l.threeDLayer||p.expression||anchor.expression||p.dimensionsSeparated)fail(l.name+': centering needs unlocked 2D text with unseparated position and no position/anchor expressions.');}
        for(i=0;i<a.length;i++){l=a[i];p=prop(l,'ADBE Position');anchor=prop(l,'ADBE Anchor Point');var r=l.sourceRectAtTime(l.containingComp.time,false),v=anchor.value,dx=r.left+r.width/2-v[0],dy=r.top+r.height/2-v[1];if(anchor.numKeys){for(var k=1;k<=anchor.numKeys;k++){v=anchor.keyValue(k);anchor.setValueAtKey(k,[v[0]+dx,v[1]+dy]);}}else anchor.setValue([v[0]+dx,v[1]+dy]);ex(p,'var d=['+dx+','+dy+'];var s=transform.scale/100;var r=degreesToRadians(transform.rotation);var x=d[0]*s[0],y=d[1]*s[1];value+[x*Math.cos(r)-y*Math.sin(r),x*Math.sin(r)+y*Math.cos(r)];');}
        return result(a.length+' anchors centered; position compensation follows animated scale and rotation.');
    }
    function normalizeText(a) {
        var docs=editableDocs(a),scales=[],i,j,k,l,p,v,d;
        for(i=0;i<a.length;i++){l=a[i];p=prop(l,'ADBE Scale');v=p.value;if(l.threeDLayer||p.numKeys||p.expression||v[0]<=0||Math.abs(v[0]-v[1])>.0001||prop(l,'ADBE Anchor Point').expression||l.property('ADBE Text Properties').property('ADBE Text Animators').numProperties||l.property('ADBE Effect Parade').numProperties)fail(l.name+': normalize needs point text with uniform static positive scale, no effects, animators or anchor expressions.');for(j=1;j<=l.containingComp.numLayers;j++)if(l.containingComp.layer(j).parent===l)fail(l.name+': Normalize Scale cannot change a text layer that parents other layers.');scales.push(v[0]/100);for(j=0;j<docs[i].docs.length;j++){d=docs[i].docs[j].value;if(d.boxText)fail(l.name+': paragraph box text is not supported by Normalize Scale.');for(k=0;k<d.text.length;k++){var range=d.characterRange(k,k+1);range.fontSize*=scales[i];if(range.strokeWidth)range.strokeWidth*=scales[i];if(range.baselineShift)range.baselineShift*=scales[i];if(!range.autoLeading&&range.leading)range.leading*=scales[i];}}}
        commitDocs(docs);
        for(i=0;i<a.length;i++){p=prop(a[i],'ADBE Anchor Point');if(p.numKeys){for(k=1;k<=p.numKeys;k++){v=p.keyValue(k);p.setValueAtKey(k,[v[0]*scales[i],v[1]*scales[i]]);}}else{v=p.value;p.setValue([v[0]*scales[i],v[1]*scales[i]]);}prop(a[i],'ADBE Scale').setValue([100,100]);}
        return result(a.length+' point-text layer(s) normalized to 100% scale.');
    }
    function fitTextComp(o) {
        var c=active(),a=selected(c),b=[Infinity,Infinity,-Infinity,-Infinity],i,j,l,r,p,roots=[];
        for(i=0;i<a.length;i++){if(!textProperty(a[i])&&!a[i].property('ADBE Root Vectors Group'))fail('Fit Comp accepts selected text and shape layers.');r=layerBounds(a[i],c.time);b=[Math.min(b[0],r[0]),Math.min(b[1],r[1]),Math.max(b[2],r[2]),Math.max(b[3],r[3])];}
        for(i=1;i<=c.numLayers;i++){l=c.layer(i);if(l.threeDLayer||l instanceof CameraLayer||l instanceof LightLayer)fail('Fit Comp needs a 2D composition.');if(!l.parent){p=prop(l,'ADBE Position');if(l.locked||p.expression||p.dimensionsSeparated)fail(l.name+': unlock root layers and bake position expressions/separated position before fitting.');roots.push(l);}}
        var padding=number(o.padding,40,0,2000),dx=padding-b[0],dy=padding-b[1],w=Math.ceil(b[2]-b[0]+padding*2),h=Math.ceil(b[3]-b[1]+padding*2);
        if(w<4||h<4||w>30000||h>30000)fail('Resulting composition dimensions are outside AE’s range.');
        for(i=0;i<roots.length;i++){p=prop(roots[i],'ADBE Position');if(p.numKeys){for(j=1;j<=p.numKeys;j++){r=p.keyValue(j);p.setValueAtKey(j,[r[0]+dx,r[1]+dy]);}}else{r=p.value;p.setValue([r[0]+dx,r[1]+dy]);}}
        c.width=w;c.height=h;return result('Composition fitted to '+w+' × '+h+'.',[],['Bounds are sampled at the current frame. Masks, raster effects, layer styles, animation beyond this frame and downstream uses of comp dimensions require visual review.']);
    }
    function textWorkshop(o) {
        var op=o.operation||'inspect';if(op==='stroke')return strokeReveal(o);if(op==='fit')return fitTextComp(o);
        var a=textLayers(o),i,j,items,d,styles,name,found;
        if(op==='inspect')return textInspect(o,a);
        if(op==='motion')return motionText(o,a);if(op==='colors')return colorText(o,a);if(op==='outlines')return outlineText(o,a);if(op==='anchor')return centerAnchor(a);if(op==='normalize')return normalizeText(a);
        if(op==='rename'){for(i=0;i<a.length;i++)if(a[i].locked)fail('Unlock '+a[i].name+' first.');for(i=0;i<a.length;i++)a[i].name=String(textProperty(a[i]).value.text).replace(/\s+/g,' ').substring(0,90)||'Empty text';return result(a.length+' text layers renamed.');}
        if(op==='saveStyle'){if(a.length!==1)fail('Select exactly one text layer to capture its style.');name=String(o.styleName||'').replace(/^\s+|\s+$/g,'');if(!name)fail('Enter a style name.');styles=loadStyles();for(i=0;i<styles.length;i++)if(styles[i].name===name)fail('That style name already exists. Use a new name to keep both styles.');styles.push({name:name,style:styleFrom(textProperty(a[0]).value),created:new Date().getTime()});saveStyles(styles);return result('Style “'+name+'” saved.',[],['A saved style captures first-character typography, fill and stroke settings. It does not capture text animators, effects or mixed style runs.']);}
        if(!contains(['trim','case','replace','size','applyStyle'],op))fail('Unknown Text Workshop operation.');
        items=editableDocs(a);
        if(op==='applyStyle'){styles=loadStyles();for(i=0;i<styles.length;i++)if(styles[i].name===o.savedStyle)found=styles[i].style;if(!found)fail('Choose an existing saved style.');}
        for(i=0;i<items.length;i++)for(j=0;j<items[i].docs.length;j++){d=items[i].docs[j].value;if(op==='trim')trimText(d);else if(op==='case')changeCase(d,o.caseMode||'upper');else if(op==='replace')replaceText(d,String(o.find||''),String(o.replace||''));else if(op==='size')allStyle(d,'fontSize',number(o.fontSize,72,.1,1296));else if(op==='applyStyle')styleApply(d,found);}
        commitDocs(items);return result(a.length+' text layer(s) updated; Source Text keyframe times retained.');
    }
    function locateResult(o) {var c=findComp(o.compId);if(!c)fail('That composition no longer exists.');c.openInViewer();if(o.layerId){for(var i=1;i<=c.numLayers;i++)if(c.layer(i).id===Number(o.layerId)){pick(c,c.layer(i));return {message:'Layer selected.'};}fail('That layer no longer exists.');}return {message:'Composition opened.'};}

    var routes={extractComp:extractComp,deepDuplicate:deepDuplicate,markText:markText,textWorkshop:textWorkshop,textStyles:textStyles,locateResult:locateResult,info:info,cursor:cursor,carousel:carousel,archive:archiveComp,importComp:importComp,audit:audit,chooseFolder:function(){var f=Folder.selectDialog('Choose the Pre-Comp Store folder');return {path:f?f.fsName:null};},openFolder:function(o){new Folder(o.path).execute();return {message:'Folder opened.'};}};
    function dispatch(input) {
        var req,undo=false;
        try {req=parseJSON(input);if(!routes[req.action])fail('Unknown action.');if(req.action!=='info'&&parseFloat(app.version)<26)fail('This build targets AE 2026.');
            if(req.action!=='archive'&&req.action!=='info'&&req.action!=='chooseFolder'&&req.action!=='textStyles'&&req.action!=='openFolder'){app.beginUndoGroup('Meelan Studio '+req.action);undo=true;}
            var result=routes[req.action](req.options||{});return json({ok:true,data:result});
        }catch(e){return json({ok:false,error:e.toString(),line:e.line||null,action:req?req.action:null});}
        finally{if(undo)app.endUndoGroup();}
    }
    return {dispatch:dispatch};
})();
