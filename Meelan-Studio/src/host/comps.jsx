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
