import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRound, createDeck, nudge, toLetters, totalDistance, wrap, validatePuzzles } from '../dist/engine.js';
const puzzles = validatePuzzles(JSON.parse(readFileSync(new URL('../dist/data/puzzles.json',import.meta.url))));
function seeded(seed = 420) { return () => { seed = (Math.imul(seed,1664525)+1013904223) >>> 0; return seed / 4294967296; }; }
test('120 unique valid puzzles, 20 per length, short clues', () => {
  assert.equal(puzzles.length,120); assert.equal(new Set(puzzles.map(p=>p.answer)).size,120);
  for(let length=3; length<=8; length++) assert.equal(puzzles.filter(p=>p.length===length).length,20);
  for(const puzzle of puzzles) assert.ok(puzzle.clue.length<=64);
});
test('every generated puzzle needs 4–8 moves and can be solved within ten', () => {
  const random=seeded();
  for(const puzzle of puzzles) for(let repeat=0;repeat<100;repeat++) {
    let round=createRound(puzzle,random);
    const cost=totalDistance(round.letters,puzzle.answer);
    assert.ok(cost>=4 && cost<=8, `${puzzle.answer}: ${cost}`);
    for(const [index,target] of toLetters(puzzle.answer).entries()) {
      while(round.letters[index]!==target) {
        const direction=wrap(target-round.letters[index])<=13?1:-1;
        round=nudge(round,index,direction);
      }
    }
    assert.equal(round.status,'won'); assert.equal(round.remaining,10-cost);
  }
});
test('wraps Z to A and A to Z and counts each move', () => {
  const round={puzzle:puzzles[0],letters:[25,0,0],remaining:10,status:'playing'};
  const next=nudge(round,0,1); assert.equal(next.letters[0],0); assert.equal(next.remaining,9);
  assert.equal(nudge(next,0,-1).letters[0],25); assert.equal(round.letters[0],25);
});
test('correct final nudge wins; wrong final nudge loses; finished rounds cannot change', () => {
  const round={puzzle:{answer:'CAT'},letters:toLetters('BAT'),remaining:1,status:'playing'};
  const win=nudge(round,0,1); assert.equal(win.status,'won'); assert.equal(win.remaining,0);
  assert.equal(nudge(win,1,1),win);
  const lose=nudge(round,0,-1); assert.equal(lose.status,'lost'); assert.equal(nudge(lose,0,1),lose);
});
test('independent shuffled decks exhaust before repeating, including bag boundaries', () => {
  const draw=createDeck(puzzles,seeded());
  for(let length=3;length<=8;length++) {
    let previous;
    for(let cycle=0;cycle<4;cycle++) {
      const batch=Array.from({length:20},()=>draw(length));
      assert.equal(new Set(batch.map(p=>p.id)).size,20);
      assert.notEqual(batch[0].id,previous); previous=batch.at(-1).id;
      assert.ok(batch.every(p=>p.length===length));
    }
  }
});
test('ignores invalid moves', () => {
  const round=createRound(puzzles[0]);
  for(const [index,direction] of [[-1,1],[99,1],[.5,1],[0,0],[0,2]]) assert.equal(nudge(round,index,direction),round);
});
test('static entrypoint assets exist', () => {
  const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
  for(const match of html.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g)) assert.ok(existsSync(new URL(`../dist/${match[1]}`,import.meta.url)),match[1]);
});
