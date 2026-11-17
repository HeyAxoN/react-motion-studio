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
    /* @addons */
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
