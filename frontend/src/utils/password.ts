const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnopqrstuvwxyz';
const DIGITS = '23456789';
const SPECIAL = '@$!%*?&#';

function randomInt(max: number) {
  const values = new Uint32Array(1);
  window.crypto.getRandomValues(values);
  return values[0] % max;
}

const pick = (characters: string) => characters[randomInt(characters.length)];

export function generatePassword(length = 14) {
  const size = Math.min(Math.max(length, 12), 20);
  const all = UPPER + LOWER + DIGITS + SPECIAL;
  const characters = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SPECIAL), ...Array.from({ length: size - 4 }, () => pick(all))];
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swap = randomInt(index + 1);
    [characters[index], characters[swap]] = [characters[swap], characters[index]];
  }
  return characters.join('');
}
