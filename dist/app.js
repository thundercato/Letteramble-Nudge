import { NUDGE_LIMIT, createDeck, createRound, letterAt, nudge, validatePuzzles } from './engine.js';
const $ = id => document.getElementById(id);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let length = 5, round = null, draw, busy = false, audioContext;
let muted = false;
try { muted = localStorage.getItem('letteramble-nudge-muted') === 'true'; } catch {}
const reelNodes = [];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function sound(frequency = 500, duration = .12, offset = 0) {
  if (muted) return;
  try {
    audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') void audioContext.resume().catch(() => {});
    const time = audioContext.currentTime + offset;
    const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
    oscillator.type = 'sine'; oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, time); gain.gain.linearRampToValueAtTime(.1, time + .008); gain.gain.exponentialRampToValueAtTime(.001, time + duration);
    oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(time); oscillator.stop(time + duration);
  } catch { /* Sound is optional; the puzzle remains playable. */ }
}
function updateSound() {
  $('sound').textContent = muted ? 'Sound off' : 'Sound on';
  $('sound').setAttribute('aria-pressed', String(muted));
  $('sound').setAttribute('aria-label', muted ? 'Turn sound on' : 'Turn sound off');
}
$('sound').addEventListener('click', () => { muted = !muted; try { localStorage.setItem('letteramble-nudge-muted', String(muted)); } catch {} updateSound(); if (!muted) sound(); });
updateSound();
function paintReel(index, value) {
  const node = reelNodes[index];
  node.letters[0].textContent = letterAt(value - 1);
  node.letters[1].textContent = letterAt(value);
  node.letters[2].textContent = letterAt(value + 1);
  node.window.setAttribute('aria-label', `Reel ${index + 1}, ${letterAt(value)}. Up for previous letter, down for next letter.`);
}
function makeReels() {
  $('reels').replaceChildren(); reelNodes.length = 0;
  $('reels').style.setProperty('--count', length); $('reels').dataset.count = length;
  for (let i = 0; i < length; i++) {
    const reel = document.createElement('div'); reel.className = 'reel';
    const up = document.createElement('button'), down = document.createElement('button');
    for (const [button, direction, text] of [[up, -1, '▴'], [down, 1, '▾']]) {
      button.type = 'button'; button.className = 'nudge'; button.textContent = text;
      button.setAttribute('aria-label', `Reel ${i + 1}: ${direction === -1 ? 'previous' : 'next'} letter`);
      button.addEventListener('click', () => move(i, direction)); button.disabled = true;
    }
    const win = document.createElement('div'); win.className = 'window'; win.tabIndex = 0;
    win.setAttribute('role', 'group');
    const strip = document.createElement('div'); strip.className = 'strip'; strip.setAttribute('aria-hidden', 'true');
    const letters = [-1, 0, 1].map(offset => { const el = document.createElement('span'); el.className = `letter${offset ? ' neighbour' : ''}`; strip.append(el); return el; });
    win.append(strip); reel.append(up, win, down); $('reels').append(reel);
    reelNodes.push({window:win,strip,letters,up,down});
    paintReel(i, 'NUDGEFUN'.charCodeAt(i) - 65);
    win.addEventListener('keydown', event => {
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') { event.preventDefault(); move(i, event.key === 'ArrowUp' ? -1 : 1); }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); reelNodes[(i + (event.key === 'ArrowLeft' ? length - 1 : 1)) % length].window.focus(); }
    });
    let touchStart = null;
    win.addEventListener('pointerdown', event => { if (event.pointerType !== 'mouse') touchStart = {x:event.clientX,y:event.clientY}; });
    win.addEventListener('pointercancel', () => { touchStart = null; });
    win.addEventListener('pointerup', event => {
      if (!touchStart) return;
      const dy = event.clientY - touchStart.y, dx = event.clientX - touchStart.x; touchStart = null;
      if (Math.abs(dy) > 24 && Math.abs(dy) > Math.abs(dx)) move(i, dy < 0 ? 1 : -1);
    });
  }
}
function updateControls() {
  const active = round?.status === 'playing';
  $('spin').disabled = !draw || busy || active;
  $('spin-label').textContent = busy ? 'Spinning…' : round && !active ? 'Spin again' : 'Spin the reels';
  $('give-up').disabled = !active || busy;
  document.querySelectorAll('[data-length]').forEach(button => { button.disabled = busy || active; button.setAttribute('aria-pressed', String(Number(button.dataset.length) === length)); });
  reelNodes.forEach(node => { node.up.disabled = node.down.disabled = !active || busy; node.window.setAttribute('aria-disabled', String(!active || busy)); });
  const remaining = round?.remaining ?? NUDGE_LIMIT;
  $('remaining').replaceChildren(document.createTextNode(String(remaining)));
  const total = document.createElement('span'); total.textContent = ' / 10'; $('remaining').append(total);
  $('pips').replaceChildren(...Array.from({length:NUDGE_LIMIT}, (_, i) => { const pip = document.createElement('span'); pip.className = `pip${i >= remaining ? ' used' : ''}`; return pip; }));
  $('remaining').parentElement.classList.toggle('low', remaining <= 3);
}
function finish() {
  const won = round.status === 'won';
  $('result').className = `result ${won ? 'win' : 'loss'}`;
  $('display-label').textContent = won ? 'WORD FOUND' : 'THE ANSWER';
  $('result').textContent = won ? `${round.puzzle.answer}! Lovely work. ${round.remaining} ${round.remaining === 1 ? 'nudge' : 'nudges'} to spare.` : `The word was ${round.puzzle.answer}. Give another one a spin.`;
  if (!won) $('clue').textContent = `${round.puzzle.answer} · ${round.puzzle.clue}`;
  reelNodes.forEach(node => node.window.classList.toggle('winning', won));
  if (won) [523,659,784,1047].forEach((freq, i) => sound(freq,.22,i*.1));
  else { sound(280,.2); sound(210,.28,.17); }
  updateControls();
}
function move(index, direction) {
  if (busy || !round || round.status !== 'playing') return;
  round = nudge(round, index, direction); paintReel(index, round.letters[index]);
  if (!reducedMotion.matches) {
    const strip = reelNodes[index].strip; strip.getAnimations().forEach(animation => animation.cancel());
    strip.animate([{transform:`translateY(${direction * 24}px)`},{transform:'translateY(0)'}],{duration:160,easing:'cubic-bezier(.2,.7,.3,1)'});
  }
  sound(350 + index * 45,.075);
  if (round.status !== 'playing') finish();
  else { $('result').textContent = `${round.letters.map(letterAt).join(' ')}. ${round.remaining} ${round.remaining === 1 ? 'nudge' : 'nudges'} left.`; updateControls(); }
}
async function spin() {
  if (!draw || busy || round?.status === 'playing') return;
  busy = true; round = createRound(draw(length));
  $('clue').textContent = 'Let the letters land…'; $('display-label').textContent = 'ROLLING';
  $('result').textContent = 'Your clue appears when the reels stop.'; $('result').className = 'result';
  reelNodes.forEach(node => { node.window.classList.remove('winning','bounce'); node.strip.getAnimations().forEach(animation => animation.cancel()); });
  updateControls(); sound(220,.12);
  await Promise.all(reelNodes.map(async (node, i) => {
    if (!reducedMotion.matches) {
      node.window.classList.add('spinning');
      const ticker = setInterval(() => paintReel(i, Math.floor(Math.random()*26)),70);
      try { await delay(750+i*180); } finally { clearInterval(ticker); }
    } else await delay(120+i*35);
    node.window.classList.remove('spinning'); paintReel(i,round.letters[i]);
    node.window.classList.add('bounce'); sound(470+i*70,.18);
  }));
  busy = false; $('clue').textContent = round.puzzle.clue; $('display-label').textContent = 'HERE’S YOUR CLUE';
  $('result').textContent = 'Nudge the letters to match the clue. You have 10 moves.';
  updateControls();
}
$('spin').addEventListener('click', spin);
$('give-up').addEventListener('click', () => { if (!busy && round?.status === 'playing') { round = {...round,status:'lost'}; finish(); } });
document.querySelectorAll('[data-length]').forEach(button => button.addEventListener('click', () => {
  if (busy || round?.status === 'playing') return;
  length = Number(button.dataset.length); round = null; makeReels();
  $('word-length').textContent = `${length} LETTERS`; $('clue').textContent = 'Ready when you are.';
  $('display-label').textContent = 'YOUR NEXT WORD AWAITS'; $('result').className = 'result';
  $('result').textContent = 'Press spin to find your next word.'; updateControls();
}));
makeReels(); updateControls();
async function load() {
  try {
    const response = await fetch(new URL('./data/puzzles.json', import.meta.url));
    if (!response.ok) throw new Error('Clue bank unavailable');
    draw = createDeck(validatePuzzles(await response.json()));
    $('clue').textContent = 'Ready when you are.'; updateControls();
  } catch {
    $('display-label').textContent = 'COULDN’T LOAD THE CLUES';
    $('clue').textContent = 'Please reload and try again.';
    $('result').textContent = 'Check your connection. Your game will be ready once the clues load.';
    $('spin-label').textContent = 'Reload game'; $('spin').disabled = false;
    $('spin').addEventListener('click', () => location.reload(), {once:true});
  }
}
void load();
