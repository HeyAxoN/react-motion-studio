// Real browser/canvas checks. CEP requests are stubbed; this does not run After Effects.
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
let playwright;try{playwright=require('playwright')}catch(e){playwright=require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright'))}
const root=path.resolve(__dirname,'../extension'),out=path.resolve(__dirname,'../validation');
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await playwright.chromium.launch({headless:true,...(process.env.MS_TEST_BROWSER?{executablePath:process.env.MS_TEST_BROWSER}:{}),args:['--no-sandbox','--allow-file-access-from-files',...(process.env.MS_TEST_SINGLE_PROCESS?['--single-process','--no-zygote','--disable-gpu']:[])]});
 const checks=[],errors=[];
 const test=async(name,fn)=>{await fn();checks.push(name);console.log('PASS '+name)};
 const url='file://'+root+'/index.html';
 try {
  const context=await browser.newContext({viewport:{width:460,height:900}});const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  const snap=selector=>page.locator(selector||'#large-canvas').evaluate(c=>c.toDataURL());
  const moving=async(selector)=>{const a=await snap(selector);await page.waitForTimeout(350);assert((await snap(selector))!==a,'Canvas must change over time')};
  await page.goto(url);await page.waitForSelector('.preset-card');
  await test('Six integrated tools are exposed; every tool has a renderer',async()=>{
   assert.equal(await page.locator('.preset-card').count(),6);
   assert.deepEqual(await page.locator('#filters button').allTextContents(),['All','Cursors','Carousel','Compositions','Text']);
   assert(await page.evaluate(()=>MSCatalog.every(p=>MSPreviews.supports(p.kind))));
   assert.equal(await page.locator('script[src*="depth"]').count(),0);
  });
  await test('All six thumbnail canvases animate',async()=>{
   for(const id of ['cursor-pearl','carousel-orbit','extract-comp','deep-duplicate','text-marks','text-workshop']){const selector='[data-preset="'+id+'"] canvas';await page.locator(selector).scrollIntoViewIfNeeded();await page.locator(selector).evaluate(c=>MSPreviews.restart(c));await moving(selector);}await page.evaluate(()=>scrollTo(0,0));
  });
  await test('Filtering and search find the remaining tools',async()=>{
   for(const cat of ['Cursors','Carousel']){await page.getByRole('button',{name:cat,exact:true}).click();assert.equal(await page.locator('.preset-card').count(),1)}
   await page.getByRole('button',{name:'All',exact:true}).click();
   await page.locator('#search').fill('orbit');assert.equal(await page.locator('.preset-card').count(),1);
   await page.locator('#search').fill('no possible match');assert(await page.locator('#no-results').isVisible());
   await page.locator('#search').fill('');
  });
  for(const id of ['carousel-orbit','cursor-pearl']){
   await page.locator('[data-preset="'+id+'"]').click();
   await test(id+' modal plays, pauses, scrubs, restarts, and reopens',async()=>{
    await moving();
    await page.locator('#pause-preview').click();const paused=await snap();await page.waitForTimeout(220);assert.equal(await snap(),paused);
    await page.locator('#preview-scrub').fill(id==='cursor-pearl'?'0.6':'4.5');assert.notEqual(await snap(),paused);
    await page.locator('#restart-preview').click();await moving();
    await page.keyboard.press('Escape');await page.locator('[data-preset="'+id+'"]').click();await moving();
   });
   await page.locator('#pause-preview').click();
   await test(id+' every setting updates paused preview pixels',async()=>{
    const changes=id==='cursor-pearl'?{finish:'violet',style:'sweep',duration:'1.5',size:'140',lift:'500',click:'25',color:'#fa7134'}:{radius:'800',width:'600',speed:'-30',tiltX:'65',tiltY:'40',tiltZ:'35',farOpacity:'10'};
    for(const [key,value] of Object.entries(changes)){
     await page.locator('#reset-preset').click();
     await page.locator('#preview-scrub').fill(id==='cursor-pearl'?(key==='click'||key==='color'?'0.95':'0.45'):'2.5');
     const before=await snap(),field=page.locator('#field-'+key);
     if(['finish','style'].includes(key))await field.selectOption(value);
     else if(key==='color')await field.evaluate((n,v)=>{n.value=v;n.dispatchEvent(new Event('input',{bubbles:true}))},value);
     else await field.fill(value);
     assert.notEqual(await snap(),before,'Setting '+key+' must change the preview');
    }
    await page.locator('#reset-preset').click();
   });
   if(id==='carousel-orbit')await test('Zero speed intentionally holds still; negative speed animates',async()=>{
    await page.locator('#field-speed').fill('0');await page.locator('#restart-preview').click();const still=await snap();await page.waitForTimeout(250);assert.equal(await snap(),still);
    await page.locator('#field-speed').fill('-25');await moving();
    await page.locator('#pause-preview').click();await page.locator('#reset-preset').click();
   });
   await page.locator('#preview-scrub').fill(id==='cursor-pearl'?'0.95':'2.5');
   await page.screenshot({path:path.join(out,id==='cursor-pearl'?'Cursor-Controls.png':'Carousel-Controls.png')});
   await page.keyboard.press('Escape');
  }
  await test('A failed canvas does not freeze others; Restart retries',async()=>{
   await page.locator('[data-preset="carousel-orbit"]').click();
   await page.evaluate(()=>{const canvas=document.querySelector('#large-canvas'),ctx=canvas.getContext('2d'),original=ctx.createRadialGradient;ctx.createRadialGradient=function(){ctx.createRadialGradient=original;throw Error('Injected transient canvas failure')}});
   await page.waitForFunction(()=>!document.querySelector('#preview-error').classList.contains('hidden'));
   await page.evaluate(()=>MSPreviews.restart(document.querySelector('[data-preset="cursor-pearl"] canvas')));
   await moving('[data-preset="cursor-pearl"] canvas');
   await page.locator('#restart-preview').click();assert(await page.locator('#preview-error').isHidden());await moving();await page.keyboard.press('Escape');
  });
  await test('Narrow and short panels retain a sized canvas and usable playback controls',async()=>{
   for(const [width,height] of [[350,480],[460,900],[860,900]]){
    await page.setViewportSize({width,height});await page.locator('[data-preset="carousel-orbit"]').click();
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    const r=await page.locator('#large-canvas').boundingBox();assert(r.width>250&&r.height>100);
    await page.locator('#pause-preview').click();await page.keyboard.press('Escape');
   }
   await page.setViewportSize({width:460,height:900});
  });
  await test('Disconnected Apply explains the host requirement; Store consent remains enforced',async()=>{
   await page.locator('[data-preset="cursor-pearl"]').click();await page.locator('#apply-preset').click();
   assert.match(await page.locator('#toast').innerText(),/Open Meelan Studio/);assert(!await page.locator('#busy-overlay').isVisible());await page.keyboard.press('Escape');
   await page.locator('[data-tab="store"]').click();await page.locator('#save-first').click();await page.locator('#comp-name').fill('My animation');await page.locator('#confirm-save').click();assert.match(await page.locator('#toast').innerText(),/Confirm saving/);await page.keyboard.press('Escape');await page.locator('[data-tab="tools"]').click();
  });
  await test('Carousel settings reach the native host with the same values',async()=>{
   const calls=[];await page.exposeFunction('testDispatch',code=>{const request=JSON.parse(JSON.parse(code.slice('MeelanStudioHost.dispatch('.length,-1)));calls.push(request);return JSON.stringify({ok:true,data:request.action==='info'?{version:'2.1.0',ae:'26 TEST STUB',comp:'Test',selected:3}:{message:'Test operation recorded'}})});
   await page.evaluate(()=>{window.__adobe_cep__={getSystemPath:()=>'/test extension',evalScript:(code,cb)=>window.testDispatch(code).then(cb)}});await page.addScriptTag({url:'file://'+root+'/js/bridge.js'});
   await page.locator('[data-preset="carousel-orbit"]').click();await page.locator('#field-radius').fill('700');await page.locator('#field-speed').fill('-40');await page.locator('#apply-preset').click();
   await page.waitForFunction(()=>document.querySelector('#preset-overlay').classList.contains('hidden'));
   const r=calls.find(c=>c.action==='carousel');assert.equal(r.options.radius,700);assert.equal(r.options.speed,-40);assert.equal(r.options.extensionPath,'/test extension');
  });
  await test('Timer fallback animates when requestAnimationFrame is not delivered',async()=>{
   const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(()=>{window.requestAnimationFrame=()=>0});await p.goto(url);await p.locator('[data-preset="carousel-orbit"]').click();
   const a=await p.locator('#large-canvas').evaluate(c=>c.toDataURL());await p.waitForTimeout(400);assert.notEqual(await p.locator('#large-canvas').evaluate(c=>c.toDataURL()),a);await p.close();
  });
  await test('Reduced motion has an explicit working Play override',async()=>{
   const p=await context.newPage();await p.emulateMedia({reducedMotion:'reduce'});p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.locator('[data-preset="carousel-orbit"]').click();assert.match(await p.locator('#pause-preview').innerText(),/Play/);
   const a=await p.locator('#large-canvas').evaluate(c=>c.toDataURL());await p.waitForTimeout(150);assert.equal(await p.locator('#large-canvas').evaluate(c=>c.toDataURL()),a);
   await p.locator('#pause-preview').click();await p.waitForTimeout(350);assert.notEqual(await p.locator('#large-canvas').evaluate(c=>c.toDataURL()),a);await p.close();
  });
  await test('All five mark styles play, scrub and respond to controls',async()=>{
   await page.locator('[data-preset="text-marks"]').click();
   for(const style of ['underline','strike','highlight','half','scribble']){await page.locator('#field-markStyle').selectOption(style);await page.locator('#restart-preview').click();await moving();await page.locator('#pause-preview').click();await page.locator('#preview-scrub').fill('0.4');const a=await snap();await page.locator('#field-color').evaluate(n=>{n.value='#e0ac51';n.dispatchEvent(new Event('input',{bubbles:true}))});assert.notEqual(await snap(),a);await page.locator('#field-color').evaluate(n=>{n.value='#bf94f5';n.dispatchEvent(new Event('input',{bubbles:true}))});}
   await page.screenshot({path:path.join(out,'Text-Marks.png')});await page.keyboard.press('Escape');
  });
  await test('Workshop navigation exposes only relevant fields and previews every operation',async()=>{
   await page.locator('[data-preset="text-workshop"]').click();
   const operations=await page.evaluate(()=>MSWorkshopOperations);
   for(const op of operations){await page.locator('.workshop-tabs button').getByText(op.group,{exact:true}).click();await page.locator('.operation-grid button').getByText(op.label,{exact:true}).click();assert.equal(await page.locator('#field-operation').inputValue(),op.id);assert.match(await page.locator('#apply-preset').innerText(),new RegExp(op.apply));await page.locator('#pause-preview').click();await page.locator('#preview-scrub').fill('0.5');assert.equal(await page.locator('#large-canvas').getAttribute('data-preview-error'),null);assert(await page.evaluate(()=>Array.from(document.querySelectorAll('#preset-fields label.hidden input,#preset-fields label.hidden select')).every(n=>n.disabled)));}
   for(const name of await page.locator('#field-motion option').evaluateAll(a=>a.map(n=>n.value))){await page.locator('#field-motion').selectOption(name);await page.locator('#preview-scrub').fill('0');const initial=await snap();await page.locator('#preview-scrub').fill('1.1');assert.notEqual(await snap(),initial,'Motion preset '+name+' must render distinct start/end frames');}await page.locator('#restart-preview').click();await page.locator('#large-canvas').scrollIntoViewIfNeeded();
   await page.locator('#pause-preview').click();await page.locator('#preview-scrub').fill('0.8');await page.screenshot({path:path.join(out,'Text-Workshop.png')});await page.keyboard.press('Escape');
  });
  await test('Composition tools have working playback and configurable controls',async()=>{
   for(const id of ['extract-comp','deep-duplicate']){await page.locator('[data-preset="'+id+'"]').click();await moving();await page.locator('#pause-preview').click();const a=await snap();await page.locator('#preview-scrub').fill('0.9');assert.notEqual(await snap(),a);await page.screenshot({path:path.join(out,id==='extract-comp'?'Extract-Comp.png':'Deep-Duplicate.png')});await page.keyboard.press('Escape');}
  });
  await test('Add-on options reach the bridge; reports render text safely and locate their actual IDs',async()=>{
   await page.evaluate(()=>{window.addonCalls=[];window.MSBridge.call=async(action,options)=>{window.addonCalls.push({action,options});if(action==='info')return {ae:'26 TEST STUB',comp:'Test',selected:1};if(action==='textStyles')return {styles:[{name:'Student title'}]};if(action==='textWorkshop'&&options.operation==='inspect')return {message:'One sampled text layer',rows:[{layer:'<img src=x onerror=alert(1)>',text:'Editable title',composition:'UI',compId:71,layerId:81,words:2}],warnings:['Sampled at the current time']};return {message:'Test operation recorded'};};});
   for(const [id,action] of [['extract-comp','extractComp'],['deep-duplicate','deepDuplicate'],['text-marks','markText']]){await page.locator('[data-preset="'+id+'"]').click();if(id==='deep-duplicate'){await page.locator('#field-copies').fill('3');await page.locator('#field-prefix').fill('Student ');}await page.locator('#apply-preset').click();await page.waitForFunction(()=>document.querySelector('#preset-overlay').classList.contains('hidden'));assert(await page.evaluate(a=>window.addonCalls.some(c=>c.action===a),action));}
   await page.locator('[data-preset="text-workshop"]').click();await page.locator('.workshop-tabs button').getByText('Inspect',{exact:true}).click();await page.locator('#apply-preset').click();await page.waitForSelector('#result-overlay:not(.hidden)');assert.equal(await page.locator('#result-rows img').count(),0);assert.match(await page.locator('#result-rows').innerText(),/<img/);await page.locator('#result-rows button').click();assert(await page.evaluate(()=>window.addonCalls.some(c=>c.action==='locateResult'&&c.options.compId===71&&c.options.layerId===81)));await page.screenshot({path:path.join(out,'Text-Report.png')});await page.locator('.close-result').click();
   const calls=await page.evaluate(()=>window.addonCalls);const dup=calls.find(c=>c.action==='deepDuplicate');assert.equal(dup.options.copies,3);assert.equal(dup.options.prefix,'Student ');const inspection=calls.find(c=>c.action==='textWorkshop');assert.equal(inspection.options.operation,'inspect');assert(!Object.hasOwn(inspection.options,'motion'));
  });
  // Screenshot a clean disconnected panel, with no simulated AE connection label.
  const cover=await context.newPage();await cover.setViewportSize({width:540,height:1120});await cover.goto(url);await cover.evaluate(()=>localStorage.clear());await cover.reload();await cover.waitForSelector('.preset-card');await cover.evaluate(()=>{MSPreviews.pause(true);document.querySelectorAll('.preset-card').forEach(n=>MSPreviews.seek(n.querySelector('canvas'),n.dataset.preset==='cursor-pearl'?.95:2.5))});await cover.screenshot({path:path.join(out,'Meelan-Studio-Interface.png')});await cover.close();
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({version:'2.1.0-rc.3',browser:browser.version(),checks,uncaughtErrors:errors,aeRuntimeTested:false},null,2));
  console.log(checks.length+' browser/canvas checks passed. Desktop AE was not run.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
