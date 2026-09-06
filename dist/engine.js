export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const NUDGE_LIMIT = 10;
export const wrap = value => ((value % 26) + 26) % 26;
export const letterAt = value => ALPHABET[wrap(value)];
export const toLetters = word => [...word].map(letter => ALPHABET.indexOf(letter));
export function distance(from, to) {
  const delta = Math.abs(from - to);
  return Math.min(delta, 26 - delta);
}
export function totalDistance(letters, answer) {
  return letters.reduce((sum, letter, index) => sum + distance(letter, toLetters(answer)[index]), 0);
}
export function validatePuzzles(data) {
  const seen = new Set();
  if (!Array.isArray(data.puzzles) || !data.puzzles.length) throw new Error('No puzzles available');
  for (const puzzle of data.puzzles) {
    if (!puzzle.id || seen.has(puzzle.id) || !/^[A-Z]{3,8}$/.test(puzzle.answer) || puzzle.answer.length !== puzzle.length || typeof puzzle.clue !== 'string' || !puzzle.clue.trim()) throw new Error('Invalid puzzle');
    seen.add(puzzle.id);
  }
  for (let length = 3; length <= 8; length++) {
    if (!data.puzzles.some(p => p.length === length)) throw new Error('Missing word length');
  }
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
// Independent bags keep every word length fresh for an entire session.
export function createDeck(puzzles, random = Math.random) {
  const bags = new Map();
  const previous = new Map();
  return length => {
    if (!bags.get(length)?.length) {
      const bag = shuffle(puzzles.filter(p => p.length === length), random);
      if (!bag.length) throw new Error('No puzzles for this length');
      if (bag.length > 1 && bag.at(-1).id === previous.get(length)) [bag[0], bag[bag.length - 1]] = [bag.at(-1), bag[0]];
      bags.set(length, bag);
    }
    const puzzle = bags.get(length).pop();
    previous.set(length, puzzle.id);
    return puzzle;
  };
}
// Build a bounded displacement, not random letters or a cancelling random walk.
export function createRound(puzzle, random = Math.random) {
  const cost = 4 + Math.floor(random() * 5);
  const offsets = Array(puzzle.length).fill(0);
  const directions = offsets.map(() => random() < 0.5 ? -1 : 1);
  for (let i = 0; i < cost; i++) offsets[Math.floor(random() * offsets.length)]++;
  return {
    puzzle,
    letters: toLetters(puzzle.answer).map((letter, index) => wrap(letter + offsets[index] * directions[index])),
    remaining: NUDGE_LIMIT,
    status: 'playing',
  };
}
export function nudge(round, index, direction) {
  if (round.status !== 'playing' || !Number.isInteger(index) || index < 0 || index >= round.letters.length || ![-1, 1].includes(direction)) return round;
  const letters = [...round.letters];
  letters[index] = wrap(letters[index] + direction);
  const remaining = round.remaining - 1;
  // A correct tenth nudge wins before checking exhaustion.
  const won = letters.map(letterAt).join('') === round.puzzle.answer;
  return { ...round, letters, remaining, status: won ? 'won' : remaining === 0 ? 'lost' : 'playing' };
}
