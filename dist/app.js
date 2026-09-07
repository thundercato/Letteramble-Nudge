import { award, createDeck, createRound, currentWord, elapsedSeconds, restoreRound, rotateWheel, tryUnlock, useHint, validatePuzzles, wrap } from './engine.js?v=2';
const $ = id => document.getElementById(id);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const STORAGE_KEY = 'letteramble-case-v2';
const names = {3:'The pocket job.',4:'The quiet courier.',5:'The silent briefcase.',6:'The midnight hand-off.',7:'The double agent.',8:'The final dossier.'};
const labels = {3:'Pocket job',4:'Quiet courier',5:'Silent briefcase',6:'Midnight hand-off',7:'Double agent',8:'Final dossier'};
const flavour = {3:'A little warm-up',4:'Trust your instincts',5:'A proper little mystery',6:'Keep your wits about you',7:'For the word detectives',8:'The big assignment'};
let puzzles = [], draw, round = null, pendingLength = null, busy = false, audioContext;
let muted = false, storageAvailable = true, wheelNodes = [], activeDrag = null;
let record = {points:0,cases:0,best:{}};
let loadedSave = null, ready = false;
try {
  loadedSave = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  muted = loadedSave?.muted ?? (localStorage.getItem('letteramble-nudge-muted') === 'true');
  if (typeof muted !== 'boolean') muted = false;
  if (loadedSave?.record && Number.isSafeInteger(loadedSave.record.points) && loadedSave.record.points >= 0 && Number.isSafeInteger(loadedSave.record.cases) && loadedSave.record.cases >= 0) {
    record.points = loadedSave.record.points; record.cases = loadedSave.record.cases;
    for (let n=3;n<=8;n++) if (['gold','silver','bronze'].includes(loadedSave.record.best?.[n])) record.best[n] = loadedSave.record.best[n];
  }
} catch { loadedSave = null; }
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function save() {
  if (!ready) return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({version:2,muted,record,round:round?.status === 'locked' ? round : null})); }
  catch { storageAvailable = false; }
}
function tone(frequency, duration = .1, offset = 0, type = 'sine', volume = .07) {
  if (muted) return;
  try {
    audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') void audioContext.resume().catch(() => {});
    const t = audioContext.currentTime + offset, oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency,t);
    gain.gain.setValueAtTime(0,t); gain.gain.linearRampToValueAtTime(volume,t+.006); gain.gain.exponentialRampToValueAtTime(.001,t+duration);
    oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(t); oscillator.stop(t+duration);
  } catch { /* Browser audio is optional. */ }
}
function vibrate(pattern) { try { navigator.vibrate?.(pattern); } catch {} }
function updateSound() { $('sound').textContent = muted ? 'Sound off' : 'Sound on'; $('sound').setAttribute('aria-pressed',String(muted)); $('sound').setAttribute('aria-label',muted ? 'Turn sound on' : 'Turn sound off'); }
$('sound').addEventListener('click',()=>{muted=!muted;updateSound();save();if(!muted) tone(640,.12);}); updateSound();
function showHelp() { if (!$('help-dialog').open) $('help-dialog').showModal(); }
$('help-button').addEventListener('click',showHelp); $('mission-help').addEventListener('click',showHelp);
document.querySelectorAll('.dialog-close,.dialog-done').forEach(button=>button.addEventListener('click',()=>$('help-dialog').close()));
function formatTime(seconds) { return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`; }
function updateTimer() { if(round) $('timer').textContent = formatTime(elapsedSeconds(round)); }
setInterval(updateTimer,1000);
document.addEventListener('visibilitychange',()=>{save();updateTimer();});
function renderRecord() {
  $('total-cases').textContent=record.cases; $('total-points').textContent=record.points;
  $('record-caption').textContent = !storageAvailable ? 'Progress lasts for this visit only.' : record.cases===0 ? 'Every agent starts somewhere.' : record.cases<5 ? 'A promising start, Agent.' : record.cases<20 ? 'Making a name in the field.' : 'A rather distinguished operative.';
  $('record-caption').classList.toggle('storage-note',!storageAvailable);
}
function renderCases() {
  $('case-grid').replaceChildren();
  for(let length=3;length<=8;length++) {
    const button=document.createElement('button');button.type='button';button.className='case-card';button.dataset.length=length;
    const active=round?.status==='locked' && round.wheels.length===length;
    if(active) button.classList.add('resume');
    button.setAttribute('aria-label',`${active?'Resume':'Open'} ${length}-letter case: ${labels[length]}`);
    const art=document.createElement('div');art.className='case-art';
    const img=document.createElement('img');img.src='./assets/case-closed.png';img.alt='';img.width=1536;img.height=1024;img.draggable=false;
    const number=document.createElement('span');number.className='case-number';number.textContent=length;
    const tag=document.createElement('span');tag.className='case-tag';tag.textContent=`CASE 0${length}`;
    art.append(img,number,tag);
    if(record.best[length]) { const medal=document.createElement('span');medal.className=`case-medal ${record.best[length]}`;medal.textContent=`${record.best[length]} ★`;art.append(medal); }
    const caption=document.createElement('div');caption.className='case-caption';
    const text=document.createElement('div'),strong=document.createElement('strong'),small=document.createElement('small');
    strong.textContent=active?'Resume your case':labels[length];small.textContent=active?'Your lock is just as you left it':`${length} letters · ${flavour[length]}`;
    text.append(strong,small);const arrow=document.createElement('span');arrow.className='enter-case';arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');caption.append(text,arrow);
    button.append(art,caption);button.addEventListener('click',()=>chooseCase(length,button));$('case-grid').append(button);
  }
  renderRecord();
}
function chooseCase(length,button) {
  if(busy || !draw) return;
  if(round?.status==='locked' && round.wheels.length!==length) { pendingLength=length;$('switch-dialog').showModal();return; }
  void openCase(length,button);
}
$('keep-case').addEventListener('click',()=>{$('switch-dialog').close();pendingLength=null;});
$('replace-case').addEventListener('click',()=>{const length=pendingLength;$('switch-dialog').close();pendingLength=null;if(length){round=null;void openCase(length);}});
function paintWheel(index,offset=0) {
  const node=wheelNodes[index], wheel=round.wheels[index], position=round.positions[index];
  node.cells.forEach((cell,j)=>{cell.textContent=wheel[wrap(position+j-4,5)];});
  node.strip.style.transform=`translateY(calc(-50% + ${offset}px))`;
  node.element.setAttribute('aria-valuenow',String(position+1));
  node.element.setAttribute('aria-valuetext',`${wheel[position]}. Available letters: ${wheel.join(', ')}.`);
  $('code-readout').textContent=currentWord(round).split('').join(' ');
}
function turn(index,steps,animate=true) {
  if(busy || !round || round.status!=='locked') return;
  round=rotateWheel(round,index,steps);paintWheel(index);save();
  if(animate && !reducedMotion.matches) {
    const strip=wheelNodes[index].strip;strip.getAnimations().forEach(a=>a.cancel());
    strip.animate([{transform:`translateY(calc(-50% + ${Math.sign(steps)*28}px))`},{transform:'translateY(-50%)'}],{duration:170,easing:'cubic-bezier(.15,.7,.3,1)'});
  }
  tone(270+index*22,.035,0,'triangle',.035);
  $('feedback').className='feedback';$('feedback').textContent='Got a hunch? Try the lock.';
}
function finishDrag(cancelled=false) {
  if(!activeDrag) return;
  const drag=activeDrag;activeDrag=null;
  if(round?.status!=='locked') return;
  if(!cancelled) {
    if(drag.moved) { if(Math.abs(drag.offset)>drag.row/3) turn(drag.index,drag.offset<0?1:-1); }
    else turn(drag.index,drag.tapY<drag.height/2?-1:1);
  }
  paintWheel(drag.index);
}
function buildWheels() {
  activeDrag=null;wheelNodes=[];$('wheels').replaceChildren();$('wheels').style.setProperty('--count',round.wheels.length);$('wheels').dataset.count=round.wheels.length;
  round.wheels.forEach((wheel,index)=>{
    const element=document.createElement('div');element.className='wheel';element.tabIndex=0;element.dataset.wheel=index;
    element.setAttribute('role','spinbutton');element.setAttribute('aria-label',`Letter ${index+1}`);element.setAttribute('aria-valuemin','1');element.setAttribute('aria-valuemax','5');
    const strip=document.createElement('div');strip.className='wheel-strip';strip.setAttribute('aria-hidden','true');
    const cells=Array.from({length:9},()=>{const cell=document.createElement('span');cell.className='wheel-letter';strip.append(cell);return cell;});
    element.append(strip);$('wheels').append(element);wheelNodes.push({element,strip,cells});paintWheel(index);
    element.addEventListener('keydown',event=>{
      if(busy) return;
      if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End','Enter',' '].includes(event.key))event.preventDefault();
      if(event.key==='ArrowUp')turn(index,-1);
      if(event.key==='ArrowDown'||event.key===' ')turn(index,1);
      if(event.key==='Home')turn(index,-round.positions[index]);
      if(event.key==='End')turn(index,4-round.positions[index]);
      if(event.key==='ArrowLeft'||event.key==='ArrowRight')wheelNodes[wrap(index+(event.key==='ArrowLeft'?-1:1),wheelNodes.length)].element.focus();
      if(event.key==='Enter')void unlock();
    });
    element.addEventListener('pointerdown',event=>{
      if(busy||round.status!=='locked'||activeDrag||(!event.isPrimary)||event.button!==0)return;
      event.preventDefault();element.focus({preventScroll:true});element.setPointerCapture(event.pointerId);
      strip.getAnimations().forEach(a=>a.cancel());
      const rect=element.getBoundingClientRect();
      activeDrag={index,pointerId:event.pointerId,lastY:event.clientY,startY:event.clientY,offset:0,moved:false,tapY:event.clientY-rect.top,height:rect.height,row:parseFloat(getComputedStyle(cells[0]).height)};
      tone(150,.018,0,'triangle',.015);
    });
    element.addEventListener('pointermove',event=>{
      const drag=activeDrag;if(!drag||drag.index!==index||drag.pointerId!==event.pointerId)return;
      event.preventDefault();drag.offset+=event.clientY-drag.lastY;drag.lastY=event.clientY;
      if(Math.abs(event.clientY-drag.startY)>5)drag.moved=true;
      while(Math.abs(drag.offset)>=drag.row){const step=drag.offset<0?1:-1;turn(index,step,false);drag.offset+=step*drag.row;}
      paintWheel(index,drag.offset);
    });
    element.addEventListener('pointerup',event=>{if(activeDrag?.pointerId===event.pointerId){finishDrag();if(element.hasPointerCapture(event.pointerId))element.releasePointerCapture(event.pointerId);}});
    element.addEventListener('pointercancel',()=>finishDrag(true));
    element.addEventListener('lostpointercapture',()=>{if(activeDrag?.index===index)finishDrag(true);});
    let wheelBudget=0;
    element.addEventListener('wheel',event=>{
      if(busy||round.status!=='locked')return;event.preventDefault();wheelBudget+=event.deltaY;
      if(Math.abs(wheelBudget)>24){turn(index,wheelBudget>0?1:-1);wheelBudget=0;}
    },{passive:false});
  });
}
function renderMessage() {
  const puzzle=puzzles.find(p=>p.id===round.puzzleId);
  $('comms').classList.toggle('intel',round.hintUsed);$('hint-copy').hidden=!round.hintUsed;
  $('message-tag').textContent=round.hintUsed?'INTEL RECEIVED':'SECURE LINE';
  $('message-copy').textContent=round.hintUsed?'Have you cracked that case yet, Agent? Our field operative intercepted this little gem:':'Have you cracked that case yet, Agent? There’s a word in that lock. I’ll be here if you need a little intel.';
  $('hint-copy').textContent=round.hintUsed?`“${puzzle.clue}”`:'';
  $('hint').disabled=round.hintUsed;
  $('hint').replaceChildren(document.createTextNode(round.hintUsed?'Intel received':'Request intel'));
  const small=document.createElement('small');small.textContent=round.hintUsed?'Clue pinned above':'Hint · half points';$('hint').append(small);
}
async function openCase(length,button) {
  if(busy)return;busy=true;
  const resuming=round?.status==='locked' && round.wheels.length===length;
  const origin=button?.querySelector('.case-art')?.getBoundingClientRect();
  button?.classList.add('departing');tone(240,.08);tone(340,.09,.07);
  if(!reducedMotion.matches)await sleep(180);
  if(!resuming)round=createRound(draw(length));
  save();$('selection').hidden=true;$('mission').hidden=false;$('mission').classList.add('entering');
  $('mission-title').textContent=names[length];$('case-ref').textContent=`CASE FILE 0${length}`;
  $('stage-label').textContent=`SECURED · ${length}-LETTER LOCK`;$('case-stage').className='case-stage';
  $('mission-case').src='./assets/case-closed.png';$('celebration').replaceChildren();$('lock-panel').hidden=false;
  $('lock-status').textContent='LOCKED';$('mission-controls').hidden=false;$('reward').hidden=true;$('medal-guide').hidden=false;
  $('unlock').disabled=false;$('back').disabled=false;$('hint').disabled=false;
  $('feedback').className='feedback';$('feedback').textContent=resuming?'Welcome back, Agent. Your lock is just as you left it.':'Find the hidden word, then try the lock.';
  renderMessage();buildWheels();updateTimer();
  window.scrollTo({top:0,behavior:'instant'});
  if(origin && !reducedMotion.matches) {
    const destination=$('mission-case').getBoundingClientRect();
    const zoom=document.createElement('img');zoom.src='./assets/case-closed.png';zoom.className='case-zoom';zoom.alt='';zoom.setAttribute('aria-hidden','true');document.body.append(zoom);
    const frame=rect=>({left:`${rect.left}px`,top:`${rect.top}px`,width:`${rect.width}px`,height:`${rect.height}px`});
    try { await zoom.animate([{...frame(origin),opacity:1},{...frame(destination),opacity:0}],{duration:540,easing:'cubic-bezier(.2,.75,.3,1)',fill:'forwards'}).finished; } catch {} finally { zoom.remove(); }
  }
  busy=false;
  $('mission-title').tabIndex=-1;$('mission-title').focus({preventScroll:true});
}
function allCases() {
  if(busy)return;activeDrag=null;save();$('mission').hidden=true;$('selection').hidden=false;$('mission').classList.remove('entering');renderCases();
  window.scrollTo({top:0,behavior:'instant'});$('selection-title').tabIndex=-1;$('selection-title').focus({preventScroll:true});
}
$('back').addEventListener('click',allCases);$('next-case').addEventListener('click',()=>{round=null;allCases();});
$('hint').addEventListener('click',()=>{
  if(busy||!round||round.status!=='locked'||round.hintUsed)return;
  round=useHint(round);save();renderMessage();$('comms').classList.add('arriving');
  tone(660,.1);tone(880,.15,.12);vibrate(30);
  $('feedback').className='feedback';$('feedback').textContent=`Intel received: ${puzzles.find(p=>p.id===round.puzzleId).clue}. Your points will be halved.`;
});
async function unlock() {
  if(busy||!round||round.status!=='locked')return;
  finishDrag(true);busy=true;$('unlock').disabled=true;$('hint').disabled=true;$('back').disabled=true;
  const puzzle=puzzles.find(p=>p.id===round.puzzleId);
  round=tryUnlock(round,puzzle);save();$('lock-status').textContent='CHECKING';tone(180,.075,0,'triangle');
  if(!reducedMotion.matches)await sleep(200);
  if(round.status!=='open') {
    $('case-stage').classList.remove('rattle');void $('case-stage').offsetWidth;$('case-stage').classList.add('rattle');
    tone(140,.16,0,'triangle');tone(110,.15,.14,'triangle');vibrate([45,35,45]);
    $('lock-status').textContent='LOCKED';$('feedback').className='feedback error';
    $('feedback').textContent=round.attempts===1?'Not quite, Agent. The lock’s keeping its secrets. Try another word.':`Still locked. Attempt ${round.attempts}. No penalty. Keep sleuthing.`;
    if(!reducedMotion.matches)await sleep(360);
    busy=false;$('unlock').disabled=false;$('hint').disabled=round.hintUsed;$('back').disabled=false;return;
  }
  const seconds=elapsedSeconds(round),prize=award(seconds,round.hintUsed);
  record.cases++;record.points+=prize.points;
  const rank={bronze:1,silver:2,gold:3};if(!record.best[puzzle.length]||rank[prize.medal]>rank[record.best[puzzle.length]])record.best[puzzle.length]=prize.medal;
  save(); // Persist the award before animation; reloading cannot credit it twice.
  $('lock-status').textContent='UNLOCKED';$('feedback').className='feedback';$('feedback').textContent=`${puzzle.answer}. Code accepted. Stand back, Agent…`;
  tone(420,.1);tone(630,.12,.09);tone(840,.14,.18);vibrate([35,35,80]);
  wheelNodes.forEach(node=>{node.element.tabIndex=-1;node.element.setAttribute('aria-disabled','true');});
  if(!reducedMotion.matches)await sleep(430);
  if(!reducedMotion.matches) {
    const lid=document.createElement('img');lid.src='./assets/case-closed.png';lid.className='case-lid';lid.alt='';$('case-stage').append(lid);lid.addEventListener('animationend',()=>lid.remove(),{once:true});
  }
  $('case-stage').classList.add('opened');$('mission-case').src='./assets/case-open.png';$('stage-label').textContent='CLASSIFIED CONTENTS · RECOVERED';
  $('mission-controls').hidden=true;$('message-tag').textContent='MISSION COMPLETE';$('hint-copy').hidden=true;
  $('message-copy').textContent='Beautiful work, Agent Letteramble. Case cracked. Reward recovered. I knew that suspiciously large vocabulary would come in handy.';
  if(!reducedMotion.matches)await sleep(280);
  const medal=document.createElement('img');medal.src='./assets/medal.png';medal.className=`prize-medal ${prize.medal}`;medal.alt='';$('celebration').append(medal);
  if(!reducedMotion.matches)for(let i=0;i<30;i++){
    const confetti=document.createElement('i');confetti.className='confetti';confetti.style.setProperty('--x',`${(Math.random()-.5)*500}px`);confetti.style.setProperty('--y',`${-40-Math.random()*220}px`);confetti.style.setProperty('--spin',`${Math.random()*700}deg`);confetti.style.background=['#f4c36e','#e77d5d','#c5b5e6','#fff4d8'][i%4];confetti.style.animationDelay=`${Math.random()*.15}s`;$('celebration').append(confetti);
  }
  [523,659,784,1047].forEach((frequency,i)=>tone(frequency,.32,i*.1,'sine',.09));
  $('reward-points').textContent=`+${prize.points}`;$('reward-medal').textContent=`${prize.medal.toUpperCase()} MEDAL`;
  $('reward-detail').textContent=`${puzzle.answer} · ${formatTime(seconds)} · ${round.attempts} ${round.attempts===1?'attempt':'attempts'}${round.hintUsed?` · ${prize.basePoints} points halved for intel`:' · No intel needed'}`;
  $('reward').hidden=false;$('lock-panel').hidden=true;$('feedback').textContent=`Case cracked! ${prize.medal} medal and ${prize.points} points.`;
  busy=false;$('back').disabled=false;updateTimer();
  $('reward').focus({preventScroll:true});
  if(!reducedMotion.matches)$('reward').scrollIntoView({behavior:'smooth',block:'nearest'});
}
$('unlock').addEventListener('click',()=>void unlock());
async function load() {
  try {
    const response=await fetch(new URL('./data/puzzles.json',import.meta.url));if(!response.ok)throw new Error('Clues unavailable');
    puzzles=validatePuzzles(await response.json());draw=createDeck(puzzles);
    round=restoreRound(loadedSave?.round,puzzles);ready=true;save();$('loading').hidden=true;renderCases();
    for(const src of ['./assets/case-open.png','./assets/medal.png']){const img=new Image();img.src=src;}
  } catch {
    $('loading').textContent='Field Control couldn’t send the cases. Check your connection, then reload to try again.';
    const retry=document.createElement('button');retry.type='button';retry.className='primary-button';retry.textContent='Reconnect to Control';retry.addEventListener('click',()=>location.reload());$('case-grid').replaceChildren(retry);
  }
}
void load();
