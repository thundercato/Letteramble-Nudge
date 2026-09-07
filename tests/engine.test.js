import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {award,createRound,createDeck,currentWord,elapsedSeconds,restoreRound,rotateWheel,tryUnlock,useHint,validatePuzzles,wrap} from '../dist/engine.js';
const puzzles=validatePuzzles(JSON.parse(readFileSync(new URL('../dist/data/puzzles.json',import.meta.url))));
function seeded(seed=420){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
test('120 unique valid puzzles, 20 per length, short clues',()=>{
  assert.equal(puzzles.length,120);assert.equal(new Set(puzzles.map(p=>p.answer)).size,120);
  for(let length=3;length<=8;length++)assert.equal(puzzles.filter(p=>p.length===length).length,20);
  for(const puzzle of puzzles)assert.ok(puzzle.clue.length<=64);
});
test('12,000 rounds have five unique alphabetical letters per wheel, contain the answer, and start unsolved',()=>{
  const random=seeded(),offsetCounts=Array(5).fill(0);
  for(const puzzle of puzzles)for(let repeat=0;repeat<100;repeat++){
    let round=createRound(puzzle,random,1000);
    assert.notEqual(currentWord(round),puzzle.answer);
    round.wheels.forEach((wheel,i)=>{
      assert.equal(wheel.length,5);assert.equal(new Set(wheel).size,5);assert.ok(wheel.includes(puzzle.answer[i]));offsetCounts[wheel.indexOf(puzzle.answer[i])]++;
      for(let j=1;j<5;j++)assert.equal(wrap(wheel[j-1].charCodeAt(0)-65+1),wheel[j].charCodeAt(0)-65);
      round=rotateWheel(round,i,wheel.indexOf(puzzle.answer[i])-round.positions[i]);
    });
    assert.equal(currentWord(round),puzzle.answer);assert.equal(round.status,'locked','Alignment alone must not unlock');
    const won=tryUnlock(round,puzzle,2000);assert.equal(won.status,'open');assert.equal(won.attempts,1);
  }
  assert.ok(offsetCounts.every(n=>n>10000),'Answer positions spread across all five slots');
});
test('each wheel loops through its own five letters, in both directions, without a move limit',()=>{
  const puzzle=puzzles[0];let round=createRound(puzzle,seeded());const original=currentWord(round);
  for(let i=0;i<1000;i++)round=rotateWheel(round,0,1);
  assert.equal(currentWord(round),original);assert.equal(round.status,'locked');
  const next=rotateWheel(round,0,-1);assert.equal(next.positions[0],wrap(round.positions[0]-1,5));
  assert.equal(rotateWheel(next,0,1).positions[0],round.positions[0]);
});
test('wrong attempts do not end the case; a correct code needs the unlock button; solved rounds are immutable',()=>{
  const puzzle=puzzles.find(p=>p.answer==='DREAM');let round=createRound(puzzle,seeded(),1000);
  for(let i=0;i<30;i++)round=tryUnlock(round,puzzle,2000);
  assert.equal(round.status,'locked');assert.equal(round.attempts,30);
  round.wheels.forEach((wheel,i)=>{round=rotateWheel(round,i,wheel.indexOf(puzzle.answer[i])-round.positions[i]);});
  assert.equal(round.status,'locked');const won=tryUnlock(round,puzzle,3000);
  assert.equal(won.status,'open');assert.equal(won.attempts,31);assert.equal(won.solvedAt,3000);
  assert.equal(tryUnlock(won,puzzle,4000),won);assert.equal(rotateWheel(won,0,1),won);assert.equal(useHint(won),won);
});
test('hint halves points once, medal bands have exact boundaries and no time limit',()=>{
  assert.deepEqual(award(299),{medal:'gold',basePoints:10,points:10});
  assert.deepEqual(award(300),{medal:'silver',basePoints:6,points:6});
  assert.deepEqual(award(599,true),{medal:'silver',basePoints:6,points:3});
  assert.deepEqual(award(600,true),{medal:'bronze',basePoints:4,points:2});
  assert.equal(award(90000).medal,'bronze');assert.equal(award(20,true).points,5);
  const hinted=useHint(createRound(puzzles[0]));assert.equal(useHint(hinted),hinted);
});
test('timer includes time away, stops when solved, and cannot go negative',()=>{
  let round=createRound(puzzles[0],seeded(),1000);assert.equal(elapsedSeconds(round,61000),60);
  assert.equal(elapsedSeconds(round,0),0);round={...round,solvedAt:91000};assert.equal(elapsedSeconds(round,999000),90);
});
test('restores valid locked rounds without leaking corrupted state into the UI',()=>{
  const round=useHint(createRound(puzzles[0],seeded(),1000));assert.deepEqual(restoreRound(JSON.parse(JSON.stringify(round)),puzzles,2000),round);
  assert.equal(restoreRound({...round,status:'open'},puzzles,2000),null);
  assert.equal(restoreRound({...round,startedAt:3000},puzzles,2000),null);
  assert.equal(restoreRound({...round,positions:[100,0,0]},puzzles,2000),null);
  assert.equal(restoreRound({...round,wheels:[['A','B','C','D','E']]},puzzles,2000),null);
  assert.equal(restoreRound({...round,attempts:-1},puzzles,2000),null);
  assert.equal(restoreRound({...round,solvedAt:2000},puzzles,2000),null);
  assert.equal(restoreRound(null,puzzles),null);
});
test('independent decks exhaust before repeating, including bag boundaries',()=>{
  const draw=createDeck(puzzles,seeded());
  for(let length=3;length<=8;length++){let previous;for(let cycle=0;cycle<4;cycle++){
    const batch=Array.from({length:20},()=>draw(length));assert.equal(new Set(batch.map(p=>p.id)).size,20);assert.notEqual(batch[0].id,previous);previous=batch.at(-1).id;assert.ok(batch.every(p=>p.length===length));
  }}
});
test('invalid moves and a mismatched puzzle do nothing',()=>{
  const round=createRound(puzzles[0]);for(const [index,step]of[[-1,1],[99,1],[.5,1],[0,.5]])assert.equal(rotateWheel(round,index,step),round);
  assert.equal(tryUnlock(round,puzzles[1]),round);
});
test('entrypoint assets and generated game art exist; forwarding route is preserved',()=>{
  const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
  for(const match of html.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g))assert.ok(existsSync(new URL(`../dist/${match[1].split('?')[0]}`,import.meta.url)),match[1]);
  for(const file of ['case-closed.png','case-open.png','medal.png'])assert.ok(existsSync(new URL(`../dist/assets/${file}`,import.meta.url)));
  assert.match(readFileSync(new URL('../index.html',import.meta.url),'utf8'),/url=\.\/dist\//);
});
