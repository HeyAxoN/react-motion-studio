/* Offline sample previews. Uses our original cursor mesh; AE is the final renderer. */
(function () {
  'use strict';
  const entries = new Map(), renderers = {}, DEG = Math.PI / 180;
  let defaultPaused = false, lastPump = 0, raf = null, disposed = false;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function num(v, fallback, min, max) { const n = Number(v); return clamp(v === undefined || v === '' || !isFinite(n) ? fallback : n, min, max); }
  function parameters(p, values) {
    const o = {};
    (p.fields || []).forEach(f => {
      let v = values && values[f.key] !== undefined ? values[f.key] : f.value;
      if (f.type === 'number') v = num(v, f.value, f.min, f.max);
      if (f.type === 'color' && !/^#[0-9a-f]{6}$/i.test(v)) v = f.value;
      if (f.type === 'select' && !f.choices.some(pair => pair[0] === v)) v = f.value;
      o[f.key] = v;
    });
    return o;
  }
  function length(p, o) { if(p.kind==='cursor')return o.duration+1.25;if(p.kind==='carousel')return Math.abs(o.speed)>0?360/Math.abs(o.speed):12;if(p.kind==='marks')return o.duration+1.2;if(p.kind==='workshop')return (o.duration||.8)+(o.stagger||0)*16+1.2;return 3.5; }
  function rounded(c, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function backdrop(c, w, h) {
    c.fillStyle = '#100f19'; c.fillRect(0, 0, w, h);
    const g = c.createRadialGradient(w * .65, h * .3, 0, w * .65, h * .3, w * .7);
    g.addColorStop(0, '#352745'); g.addColorStop(1, '#100f19'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#ffffff05'; c.lineWidth = .6;
    for (let x = 0; x < w; x += 28) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
    for (let y = 0; y < h; y += 28) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  }
  function rotate(v, x, y, z) {
    const cx = Math.cos(x), sx = Math.sin(x), cy = Math.cos(y), sy = Math.sin(y), cz = Math.cos(z), sz = Math.sin(z);
    const a = [v[0], v[1] * cx - v[2] * sx, v[1] * sx + v[2] * cx];
    const b = [a[0] * cy + a[2] * sy, a[1], -a[0] * sy + a[2] * cy];
    return [b[0] * cz - b[1] * sz, b[0] * sz + b[1] * cz, b[2]];
  }
  function polygon(c, pts, fill, stroke) {
    c.beginPath(); pts.forEach((v, i) => i ? c.lineTo(v[0], v[1]) : c.moveTo(v[0], v[1])); c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.stroke(); }
  }
  function card(c, project, width, index) {
    const h = width * .68, x = -width / 2, y = -h / 2, r = width * .045, pts = [];
    [[x + width - r, y + r, -90], [x + width - r, y + h - r, 0], [x + r, y + h - r, 90], [x + r, y + r, 180]].forEach(corner => {
      for (let i = 0; i <= 4; i++) { const a = (corner[2] + i * 22.5) * DEG; pts.push(project(corner[0] + Math.cos(a) * r, corner[1] + Math.sin(a) * r)); }
    });
    const colors = ['#594269', '#364b5a', '#5c526f', '#30594e', '#604451', '#404867'];
    polygon(c, pts, colors[index % colors.length], '#d5c7ed66');
    function box(bx, by, bw, bh, fill) { polygon(c, [project(x + bx * width, y + by * width), project(x + (bx + bw) * width, y + by * width), project(x + (bx + bw) * width, y + (by + bh) * width), project(x + bx * width, y + (by + bh) * width)], fill); }
    box(.09, .09, .09, .07, '#d4b9ff'); box(.23, .105, .44, .026, '#eee7ff99');
    box(.09, .24, .32, .045, '#ffffffcc'); box(.09, .32, .43, .021, '#f0e9ff44');
    for (let i = 0; i < 6; i++) box(.1 + i * .13, .58 - (.05 + (i * 3 + index * 2) % 7 * .023), .07, .05 + (i * 3 + index * 2) % 7 * .023, i === 5 ? '#c6a4ff' : '#d1bee455');
  }
  renderers.carousel = function (c, w, h, t, o) {
    const extent = Math.max(120, o.radius + o.width * .65), focal = extent * 4;
    const scale = Math.min(w / (extent * 2.65), h / (extent * 1.8));
    const transform = v => rotate(v, o.tiltX * DEG, o.tiltY * DEG, o.tiltZ * DEG);
    const project = v => { const d = focal / (focal + v[2]); return [w / 2 + v[0] * scale * d, h / 2 + v[1] * scale * d]; };
    c.strokeStyle = '#c8aeeb22'; c.lineWidth = .65; c.beginPath();
    for (let i = 0; i <= 80; i++) { const a = i / 80 * Math.PI * 2, p = project(transform([Math.sin(a) * o.radius, 0, Math.cos(a) * o.radius])); if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); } c.stroke();
    const items = [];
    for (let i = 0; i < 6; i++) {
      const a = (i * 60 + t * o.speed) * DEG, offset = [Math.sin(a) * o.radius, 0, Math.cos(a) * o.radius];
      items.push({ i, offset, depth: transform(offset)[2], opacity: (100 + (Math.cos(a) + 1) / 2 * (o.farOpacity - 100)) / 100 });
    }
    items.sort((a, b) => b.depth - a.depth);
    items.forEach(item => {
      c.save(); c.globalAlpha = item.opacity; c.lineWidth = .6;
      try { card(c, (x, y) => project(transform([x + item.offset[0], y, item.offset[2]])), o.width, item.i); }
      finally { c.restore(); }
    });
  };
  renderers.cursor = function (c, w, h, t, o) {
    const u = clamp(t / o.duration, 0, 1), q = 1 - Math.pow(1 - u, 3), ct = t - o.duration;
    const smooth = v => v * v * (3 - 2 * v);
    const press = ct < 0 ? 0 : ct < .1 ? smooth(ct / .1) : ct < .35 ? 1 - smooth((ct - .1) / .25) : 0;
    const by = h * .39, bx = w * .21, bw = w * .58, bh = 43;
    c.save(); c.translate(bx + bw / 2, by + bh / 2); const response = 1 - o.click / 100 * press; c.scale(response, response);
    c.shadowColor = '#00000050'; c.shadowBlur = 18; c.shadowOffsetY = 7;
    c.fillStyle = '#705494'; rounded(c, -bw / 2, -bh / 2, bw, bh, 12); c.fill(); c.shadowBlur = 0; c.shadowOffsetY = 0;
    c.globalAlpha = press * .45; c.fillStyle = o.color; c.fill(); c.globalAlpha = 1; c.strokeStyle = '#d2b6ff88'; c.stroke();
    c.fillStyle = '#f3edff'; c.font = '500 12px Segoe UI, sans-serif'; c.textAlign = 'center'; c.fillText('Create something new', 0, 4); c.restore();
    const routeLift = o.style === 'float' ? 1 : o.style === 'sweep' ? .3 : .65;
    const depth = -o.lift * Math.sin(Math.PI * u) * routeLift;
    const mx = bx + bw / 2 + 58 * (1 - q), my = by + bh / 2 + 48 * (1 - q);
    const size = 64 * o.size / 100 * (900 / (900 + depth * .35));
    const tiltX = press * 20 * DEG, tiltY = -25 * Math.sin(Math.PI * u) * DEG, tiltZ = (o.style === 'sweep' ? -18 : 12) * DEG;
    const mesh = window.MSCursorMesh;
    if (!mesh) throw Error('Cursor preview mesh is missing. Reinstall the complete extension.');
    const material = o.finish === 'violet' ? [178, 137, 235] : o.finish === 'graphite' ? [79, 86, 110] : [226, 234, 251];
    const tris = [];
    for (let i = 0; i < mesh.positions.length; i += 9) {
      const pts = [], depths = [];
      for (let j = 0; j < 9; j += 3) { const p = rotate([mesh.positions[i + j], -mesh.positions[i + j + 1], -mesh.positions[i + j + 2]], tiltX, tiltY, tiltZ); pts.push([mx + p[0] * size, my + p[1] * size]); depths.push(p[2]); }
      const n = rotate([mesh.normals[i], -mesh.normals[i + 1], -mesh.normals[i + 2]], tiltX, tiltY, tiltZ);
      const light = .53 + Math.max(0, n[0] * -.4 + n[1] * -.5 + n[2] * -.76) * .52;
      const rgb = material.map(v => Math.round(clamp(v * light, 0, 255)));
      tris.push({ pts, depth: depths.reduce((a, b) => a + b, 0), color: 'rgb(' + rgb.join(',') + ')' });
    }
    tris.sort((a, b) => b.depth - a.depth); c.lineWidth = .28;
    tris.forEach(tri => polygon(c, tri.pts, tri.color, tri.color));
  };
  function caption(c,text,x,y,color='#bca6d2',size=10){c.font=size+'px Arial, sans-serif';c.textAlign='center';c.fillStyle=color;c.fillText(text,x,y);}
  function tile(c,x,y,w,h,title,color='#48335d'){rounded(c,x,y,w,h,7);c.fillStyle=color;c.fill();c.strokeStyle='#dcc2ff44';c.stroke();caption(c,title,x+w/2,y+h/2+4,'#edddff',11);}
  renderers.extract=function(c,w,h,t,o){
    const a=clamp(t/1.7,0,1);
    c.setLineDash([4,5]);rounded(c,58,44,150,133,12);c.strokeStyle='#b89cdd55';c.stroke();c.setLineDash([]);
    caption(c,a<.5?'NESTED COMPOSITION':'LAYERS + TRANSFORM',w/2,25,'#b49ccd',9);
    for(let i=0;i<3;i++){const x=76+a*118,y=65+i*31+a*(i-1)*12;tile(c,x,y,112,24,(o.prefixNames==='yes'&&a>.4?'UI / ':'')+['Heading','Button','Card'][i],['#5d4477','#34595e','#654852'][i]);}
    c.strokeStyle='#b69cdb88';c.lineWidth=1;c.beginPath();c.moveTo(92,192);c.lineTo(318,192);c.stroke();caption(c,'source retained',104,212,'#887797',9);caption(c,'editable layers',299,212,'#d1b6eb',9);
    c.fillStyle='#d0acf9';c.beginPath();c.arc(92+(t%2)/2*226,192,3,0,Math.PI*2);c.fill();
  };
  renderers.duplicate=function(c,w,h,t,o){
    const q=clamp(t/1.4,0,1),count=Math.min(3,o.copies||1);caption(c,'DEPENDENCIES STAY CONNECTED',w/2,25,'#b49ccd',9);
    tile(c,30,76,108,34,'Product');tile(c,43,151,82,29,'Shared UI','#31545d');
    c.strokeStyle='#bca6d277';c.beginPath();c.moveTo(84,110);c.lineTo(84,150);c.stroke();
    for(let k=count-1;k>=0;k--){const x=230+k*14,y=76-k*10;c.globalAlpha=(.55+.45*q)/(1+k*.3);tile(c,x,y,128,34,(''+(o.prefix||'')+'Product'+(o.suffix===undefined?' Copy':o.suffix)).slice(0,23));if(!o.depth||o.depth>0){tile(c,x+16,y+75,96,29,o.filter?'Shared source':'UI copy','#31545d');c.beginPath();c.moveTo(x+64,y+34);c.lineTo(x+64,y+75);c.stroke();}}c.globalAlpha=1;
    c.setLineDash([3,5]);c.beginPath();c.moveTo(145,94);c.lineTo(222,94);c.stroke();c.setLineDash([]);c.fillStyle='#d0acf9';c.beginPath();c.arc(145+(t%1.5)/1.5*77,94,3,0,Math.PI*2);c.fill();caption(c,count+' copy set'+(count===1?'':'s'),289,213,'#c1a6db',10);
  };
  function drawMark(c,w,h,t,o){
    c.font='bold 40px Arial, sans-serif';const text='Make it matter.',tw=c.measureText(text).width,scale=Math.min(1,330/(tw+o.padX*2));c.save();c.translate(w/2,h/2);c.scale(scale,scale);
    const x=-tw/2,y=-30,p=o.animate==='no'?1:1-Math.pow(1-clamp(t/o.duration,0,1),3),q=p*o.progress/100,style=o.markStyle||'underline';c.fillStyle=o.color;c.strokeStyle=o.color;
    const left=x-o.padX,ww=tw+o.padX*2,baseline=10;
    if(style==='highlight'||style==='half'){const hh=(style==='half'?20:40)+o.padY*2,yy=y+(style==='half'?20:0)-o.padY+o.offset;rounded(c,left,yy,ww*q,hh,o.roundness);c.fill();}
    c.fillStyle=style==='highlight'?'#21152c':'#f0e7f8';c.textAlign='left';c.fillText(text,x,baseline);
    if(style!=='highlight'&&style!=='half'){c.strokeStyle=o.color;c.lineWidth=o.thickness;c.lineCap='round';c.save();c.beginPath();c.rect(left-o.thickness,-150,ww*q+o.thickness,400);c.clip();c.beginPath();const yy=(style==='strike'?-10:18)+o.offset;c.moveTo(left,yy);if(style==='scribble'){for(let i=1;i<33;i++)c.lineTo(left+ww*i/32,yy+Math.sin(i/4*2.4)*o.thickness*.7);}else c.lineTo(left+ww,yy);c.stroke();c.restore();}
    c.restore();caption(c,'LIVE TEXT  /  EDITABLE SHAPES',w/2,h-24,'#957ba9',9);
  }
  renderers.marks=drawMark;
  const motionExamples={fade:{},scale:{s:0},up:{y:70},down:{y:-70},left:{x:90},right:{x:-90},pop:{s:0,spring:true},blur:{blur:35},'soft-rise':{y:35,blur:10},editorial:{y:90,r:6},kinetic:{x:100,r:-12},elastic:{s:0,spring:true},focus:{s:125,blur:35},cascade:{y:-100,r:-8},flutter:{y:45,r:35,spring:true},wide:{x:55,s:140},whisper:{y:12,blur:8},swing:{r:-70,s:80,spring:true},'slide-soft':{x:-60,blur:12},'type-on':{step:true},'random-pop':{s:0,spring:true,random:true},'random-drift':{y:65,r:20,blur:12,random:true},'word-lift':{y:45,words:true}};
  renderers.workshop=function(c,w,h,t,o){
    const op=o.operation||'inspect',text='Make it move',q=clamp(t/(o.duration||.8),0,1),colors=[o.color||'#bf94f5',o.color2||'#66d9e6',o.color3||'#ffb380'];
    if(op==='inspect'){
      c.fillStyle=o.background;c.fillRect(36,44,210,125);c.strokeStyle='#b99ada66';c.strokeRect(36,44,210,125);const margin=o.safeMargin/100;
      c.setLineDash([3,4]);c.strokeStyle='#9ae2c299';c.strokeRect(36+210*margin,44+125*margin,210*(1-margin*2),125*(1-margin*2));c.setLineDash([]);caption(c,'Make it move',141,112,'#ecddfa',22);
      for(let i=0;i<4;i++){const yy=68+i*29;c.fillStyle=['#c5a3ed','#78d2b4','#eebc8a','#97a9e7'][i];c.beginPath();c.arc(276,yy,3,0,Math.PI*2);c.fill();caption(c,['TYPE / 48 PX','6 SAFE CROPS','3 WORDS / '+(180/o.wpm).toFixed(1)+'s','SAMPLE REPORT'][i],339,yy+3,'#b6a0ca',9);}
      c.fillStyle='#bba4eb33';c.fillRect(36+(t%2)/2*210,44,2,125);caption(c,'Inspect your actual text with the button below',w/2,h-23,'#9b86af',9);return;
    }
    c.font='bold 40px Arial, sans-serif';const full=c.measureText(text).width,left=(w-full)/2;
    if(op==='motion'){
      const spec=motionExamples[o.motion]||motionExamples['soft-rise'];let x=left;
      for(let i=0;i<text.length;i++){let ix=o.units==='lines'?0:(o.units==='words'||spec.words)?text.slice(0,i+1).split(' ').length-1:i;const total=o.units==='lines'?1:(o.units==='words'||spec.words)?3:text.length;if(spec.random)ix=(ix*7+3)%total;if(o.order==='reverse')ix=total-1-ix;const u=clamp((t-ix*o.stagger)/o.duration,0,1),amount=spec.step?(u>=1?0:1):spec.spring?(u>=1?0:Math.exp(-7*u)*Math.cos(u*10)):o.easing==='linear'?1-u:Math.pow(1-u,3);const cw=c.measureText(text[i]).width;c.save();c.translate(x+cw/2+(spec.x||0)*amount,h/2+12+(spec.y||0)*amount);c.rotate((spec.r||0)*amount*DEG);const ss=spec.s===undefined?1:1+(spec.s/100-1)*amount;c.scale(ss,ss);c.globalAlpha=clamp(1-amount,0,1);if(spec.blur)c.filter='blur('+Math.max(0,spec.blur*amount*.3)+'px)';c.fillStyle='#ead9ff';c.textAlign='center';c.fillText(text[i],0,0);c.restore();x+=cw;}
    }else if(op==='colors'){
      let x=left;for(let i=0;i<text.length;i++){c.textAlign='left';if(o.colorMode==='gradient'){const v=i/(text.length-1)*2,a=MSColors.rgb(colors[Math.min(1,Math.floor(v))]),b=MSColors.rgb(colors[Math.min(2,Math.floor(v)+1)]),f=v>=2?1:v%1;c.fillStyle='rgb('+a.map((n,k)=>Math.round((n+(b[k]-n)*f)*255)).join(',')+')';}else c.fillStyle=colors[o.colorMode==='random'?((i+o.offset)*7+3)%3:(i+o.offset)%3];c.fillText(text[i],x,h/2+12);x+=c.measureText(text[i]).width;}
    }else if(op==='outlines'||op==='stroke'){
      c.textAlign='center';c.lineJoin='round';
      if(op==='outlines'){for(let i=o.outlines;i>=1;i--){c.lineWidth=o.thickness*i*2;c.strokeStyle=colors[i-1];c.strokeText(text,w/2,h/2+12);}c.fillStyle='#20152c';c.fillText(text,w/2,h/2+12);}
      else{c.save();if(o.strokeLook==='neon'){c.shadowColor=colors[0];c.shadowBlur=14;}let x=left;for(let i=0;i<text.length;i++){const cw=c.measureText(text[i]).width,u=clamp((t-(o.strokeMode==='sync'?0:i)*o.stagger)/o.duration,0,1);c.save();c.beginPath();c.rect(x-5,h/2-40,(cw+10)*(1-Math.pow(1-u,3)),70);c.clip();c.globalAlpha=o.strokeMode==='travel'?clamp((1-u)*4,0,1):1;c.textAlign='left';c.strokeStyle=colors[0];c.lineWidth=o.thickness;c.strokeText(text[i],x,h/2+12);if(o.strokeLook==='trail'){c.globalAlpha*=.25;c.strokeText(text[i],x-4,h/2+15);}c.restore();x+=cw;}c.restore();}
    }else{
      const cases={upper:'MAKE IT MOVE',lower:'make it move',title:'Make It Move',sentence:'Make it move',vowels:'mAkE It mOvE',consonants:'MaKe iT MoVe',edges:'MakE IT MovE',alternating:'MaKe iT MoVe'};
      let value=op==='case'?cases[o.caseMode]:op==='replace'&&o.find?text.split(o.find).join(o.replace):text;c.font='bold '+(op==='size'?clamp(o.fontSize*.6,15,65):36)+'px Arial, sans-serif';c.textAlign='center';c.fillStyle='#e9d8fb';c.fillText(value,w/2,h/2+10,370);
      if(op==='fit'){const pad=Math.min(50,o.padding*.3);c.setLineDash([4,4]);c.strokeStyle='#bf94f5';c.strokeRect(left-pad,h/2-32-pad,full+pad*2,50+pad*2);c.setLineDash([]);}
      if(op==='anchor'){c.strokeStyle='#e7b881';c.beginPath();c.arc(w/2,h/2-6,7,0,Math.PI*2);c.moveTo(w/2-12,h/2-6);c.lineTo(w/2+12,h/2-6);c.moveTo(w/2,h/2-18);c.lineTo(w/2,h/2+6);c.stroke();}
      if(op==='saveStyle'||op==='applyStyle'){tile(c,135,h-77,150,26,(op==='saveStyle'?o.styleName:o.savedStyle)||'Your saved typography','#39264d');}
    }
    caption(c,op==='stroke'?'CONTOUR REVEAL · ILLUSTRATED SAMPLE':op==='motion'?'NATIVE TEXT ANIMATORS':op.replace(/([A-Z])/g,' $1').toUpperCase()+' · SAMPLE TYPOGRAPHY',w/2,h-22,'#957ba9',9);
  };

  function render(canvas, p, t, values) {
    const c = canvas.getContext('2d'); if (!c) throw Error('Canvas rendering is unavailable.');
    const draw = renderers[p.kind]; if (!draw) throw Error('No preview registered for ' + p.kind + '.');
    const o = parameters(p, values), scale = canvas.width / 420;
    c.save();
    try { c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, canvas.width, canvas.height); c.scale(scale, scale); const h = canvas.height / scale; backdrop(c, 420, h); draw(c, 420, h, t, o); }
    finally { c.restore(); }
  }
  function emit(canvas, entry) {
    canvas.dispatchEvent(new CustomEvent('ms-preview-state', { detail: { time: entry.time, duration: length(entry.preset, entry.values), paused: entry.paused, error: entry.error || null } }));
  }
  function paint(canvas, entry) {
    try { render(canvas, entry.preset, entry.time, entry.values); entry.error = null; canvas.removeAttribute('data-preview-error'); }
    catch (error) {
      entry.error = error.message; entry.paused = true; canvas.setAttribute('data-preview-error', error.message);
      try { const c = canvas.getContext('2d'); c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#17121e'; c.fillRect(0, 0, canvas.width, canvas.height); c.fillStyle = '#d9c3ec'; c.textAlign = 'center'; c.font = '14px sans-serif'; c.fillText('Preview unavailable — press Restart', canvas.width / 2, canvas.height / 2); c.restore(); } catch (_) {}
    }
    emit(canvas, entry);
  }
  function attach(canvas, preset, values) {
    const entry = { preset, values: parameters(preset, values), time: 0, paused: defaultPaused, error: null };
    entries.set(canvas, entry); paint(canvas, entry); return entry;
  }
  function update(canvas, values) { const e = entries.get(canvas); if (e) { e.values = parameters(e.preset, values); e.time = Math.min(e.time, length(e.preset, e.values)); paint(canvas, e); } }
  function pause(value, canvas) {
    if (!canvas) defaultPaused = !!value;
    entries.forEach((e, c) => { if (!canvas || canvas === c) { e.paused = !!value; emit(c, e); } }); return !!value;
  }
  function seek(canvas, time) { const e = entries.get(canvas); if (e) { e.time = num(time, 0, 0, length(e.preset, e.values)); paint(canvas, e); } }
  function restart(canvas) { const e = entries.get(canvas); if (e) { e.time = 0; e.error = null; e.paused = false; paint(canvas, e); } }
  function visible(canvas) { const r = canvas.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth; }
  function pump() {
    if (disposed) return;
    const now = Date.now(); if (now - lastPump < 30) return;
    const dt = lastPump ? Math.min(.1, (now - lastPump) / 1000) : 0; lastPump = now;
    if (document.hidden) return;
    entries.forEach((entry, canvas) => {
      if (!canvas.isConnected) { entries.delete(canvas); return; }
      if (entry.paused || !visible(canvas)) return;
      entry.time = (entry.time + dt) % length(entry.preset, entry.values); paint(canvas, entry);
    });
  }
  function frame() { raf = null; try { pump(); } finally { if (!disposed && window.requestAnimationFrame) raf = window.requestAnimationFrame(frame); } }
  if (window.requestAnimationFrame) raf = window.requestAnimationFrame(frame);
  // CEP sometimes suspends rAF when docking. One throttled clock also serves the timer.
  const timer = window.setInterval(pump, 80);
  document.addEventListener('visibilitychange', () => { lastPump = Date.now(); });
  window.addEventListener('unload', () => { disposed = true; clearInterval(timer); if (raf !== null && window.cancelAnimationFrame) window.cancelAnimationFrame(raf); entries.clear(); });
  window.MSPreviews = { attach, update, pause, seek, restart, render, detach: c => entries.delete(c), supports: kind => typeof renderers[kind] === 'function' };
})();
