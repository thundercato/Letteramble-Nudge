export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const WHEEL_SIZE = 5;
export const wrap = (value, size = 26) => ((value % size) + size) % size;
export const letterAt = value => ALPHABET[wrap(value)];

export function validatePuzzles(data) {
  const ids = new Set(), answers = new Set();
  if (!Array.isArray(data.puzzles) || !data.puzzles.length) throw new Error('No puzzles available');
  for (const puzzle of data.puzzles) {
    if (!puzzle.id || ids.has(puzzle.id) || answers.has(puzzle.answer) || !/^[A-Z]{3,8}$/.test(puzzle.answer) || puzzle.answer.length !== puzzle.length || typeof puzzle.clue !== 'string' || !puzzle.clue.trim()) throw new Error('Invalid puzzle');
    ids.add(puzzle.id); answers.add(puzzle.answer);
  }
  for (let length = 3; length <= 8; length++) if (!data.puzzles.some(p => p.length === length)) throw new Error('Missing word length');
  return data.puzzles;
}
export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function createDeck(puzzles, random = Math.random) {
  const bags = new Map(), previous = new Map();
  return length => {
    if (!bags.get(length)?.length) {
      const bag = shuffle(puzzles.filter(p => p.length === length), random);
      if (!bag.length) throw new Error('No puzzles for this length');
      if (bag.length > 1 && bag.at(-1).id === previous.get(length)) [bag[0], bag[bag.length - 1]] = [bag.at(-1), bag[0]];
      bags.set(length, bag);
    }
    const puzzle = bags.get(length).pop(); previous.set(length, puzzle.id); return puzzle;
  };
}
// The answer can occupy any of the five positions, independently on every wheel.
export function createRound(puzzle, random = Math.random, now = Date.now()) {
  const wheels = [...puzzle.answer].map(letter => {
    const start = ALPHABET.indexOf(letter) - Math.floor(random() * WHEEL_SIZE);
    return Array.from({length:WHEEL_SIZE}, (_, i) => letterAt(start + i));
  });
  const positions = wheels.map(() => Math.floor(random() * WHEEL_SIZE));
  if (wheels.map((wheel, i) => wheel[positions[i]]).join('') === puzzle.answer) positions[0] = wrap(positions[0] + 1, WHEEL_SIZE);
  return { puzzleId:puzzle.id, wheels, positions, startedAt:now, solvedAt:null, attempts:0, hintUsed:false, status:'locked' };
}
export const currentWord = round => round.wheels.map((wheel, i) => wheel[round.positions[i]]).join('');
export function rotateWheel(round, index, steps) {
  if (round.status !== 'locked' || !Number.isInteger(index) || index < 0 || index >= round.wheels.length || !Number.isInteger(steps)) return round;
  const positions = [...round.positions]; positions[index] = wrap(positions[index] + steps, WHEEL_SIZE);
  return {...round, positions};
}
export function useHint(round) {
  return round.status === 'locked' && !round.hintUsed ? {...round, hintUsed:true} : round;
}
export function tryUnlock(round, puzzle, now = Date.now()) {
  if (round.status !== 'locked' || puzzle.id !== round.puzzleId) return round;
  const won = currentWord(round) === puzzle.answer;
  return {...round, attempts:round.attempts + 1, status:won ? 'open' : 'locked', solvedAt:won ? Math.max(round.startedAt, now) : null};
}
export function elapsedSeconds(round, now = Date.now()) {
  return Math.max(0, Math.floor(((round.solvedAt ?? now) - round.startedAt) / 1000));
}
export function award(seconds, hintUsed = false) {
  const medal = seconds < 300 ? 'gold' : seconds < 600 ? 'silver' : 'bronze';
  const basePoints = {gold:10,silver:6,bronze:4}[medal];
  return {medal,basePoints,points:hintUsed ? basePoints / 2 : basePoints};
}
// Persist only well-formed playable rounds. A bad local save never blocks a fresh game.
export function restoreRound(value, puzzles, now = Date.now()) {
  if (!value || value.status !== 'locked') return null;
  const puzzle = puzzles.find(p => p.id === value.puzzleId);
  if (!puzzle || !Array.isArray(value.wheels) || value.wheels.length !== puzzle.length || !Array.isArray(value.positions) || value.positions.length !== puzzle.length || !Number.isFinite(value.startedAt) || value.startedAt < 0 || value.startedAt > now || !Number.isSafeInteger(value.attempts) || value.attempts < 0 || typeof value.hintUsed !== 'boolean' || value.solvedAt !== null) return null;
  for (let i = 0; i < puzzle.length; i++) {
    const wheel = value.wheels[i];
    if (!Array.isArray(wheel) || wheel.length !== WHEEL_SIZE || !wheel.every(c => typeof c === 'string' && /^[A-Z]$/.test(c)) || !wheel.includes(puzzle.answer[i]) || !Number.isInteger(value.positions[i]) || value.positions[i] < 0 || value.positions[i] >= WHEEL_SIZE) return null;
    if (!wheel.every((letter, j) => letter === letterAt(ALPHABET.indexOf(wheel[0]) + j))) return null;
  }
  return {puzzleId:value.puzzleId,wheels:value.wheels.map(w=>[...w]),positions:[...value.positions],startedAt:value.startedAt,solvedAt:null,attempts:value.attempts,hintUsed:value.hintUsed,status:'locked'};
}
