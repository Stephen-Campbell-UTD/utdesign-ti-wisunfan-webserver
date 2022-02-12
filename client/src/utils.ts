import {THEME} from './ColorScheme';

function getScrollBarWidth(): number {
  var inner = document.createElement('p');
  inner.style.width = '100%';
  inner.style.height = '200px';

  var outer = document.createElement('div');
  outer.style.position = 'absolute';
  outer.style.top = '0px';
  outer.style.left = '0px';
  outer.style.visibility = 'hidden';
  outer.style.width = '200px';
  outer.style.height = '150px';
  outer.style.overflow = 'hidden';
  outer.appendChild(inner);

  document.body.appendChild(outer);
  var w1 = inner.offsetWidth;
  outer.style.overflow = 'scroll';
  var w2 = inner.offsetWidth;
  if (w1 === w2) w2 = outer.clientWidth;

  document.body.removeChild(outer);

  return w1 - w2;
}

export function scrollbarVisible(element: HTMLElement): boolean {
  return element.scrollHeight > element.clientHeight;
}

//TODO make this dynamic
export const scrollbarWidth = getScrollBarWidth();

//https://stackoverflow.com/questions/13142968/deep-comparison-of-objects-arrays
export function compareObjects(o: any, p: any) {
  return JSON.stringify(o) === JSON.stringify(p);
}

export function mergeObjectsInPlace(target: any, source: any) {
  console.assert(typeof target === typeof source);
  //only mutate strings, numbers, booleans

  if (target instanceof Array) {
    //s -> t (modify)
    const commonLength = Math.min(target.length, source.length);
    for (let i = 0; i < commonLength; i++) {
      mergeSubEntity(target, source, i);
    }
    //s -> t (add)
    if (target.length < source.length) {
      target.push(...source.slice(target.length));
    } else if (source.length < target.length) {
      //s -> t (remove)
      target.splice(source.length, target.length - source.length);
    }
  } else if (typeof target === 'object') {
    //s -> t (modify)
    for (const tKey in target) {
      if (tKey in source && target[tKey] !== source[tKey]) {
        mergeSubEntity(target, source, tKey);
      }
    }
    //s -> t (add)
    const newSKeys = Object.keys(source).filter(sKey => !(sKey in target));
    newSKeys.forEach(sKey => {
      target[sKey] = source[sKey];
    });
    //s -> t (remove)
    const tKeysToRemove = Object.keys(target).filter(tKey => !(tKey in source));
    tKeysToRemove.forEach(tKey => {
      delete target[tKey];
    });
  }

  function mergeSubEntity(target: any, source: any, key: any) {
    const sVal = source[key];
    const sValType = typeof sVal;
    if (sValType === 'string' || sValType === 'number' || sValType === 'boolean') {
      target[key] = sVal;
    } else {
      mergeObjectsInPlace(target[key], sVal);
    }
  }
}

export function timestampStringToDate(timestamp: string): Date {
  //example timestamp string "10/31/2021, 10:49:35 AM 221ms"
  const dateRegexMatches = timestamp.match(/(.*) (\d{1,3})ms/);
  //index 0 is the entire timestamp string
  //index 1 is date time w/o ms
  // index 2 is ms
  if (dateRegexMatches === null || dateRegexMatches.length < 3) {
    console.error('Could not convert timestamp string: ', timestamp);
    return new Date();
  }
  const dateWithoutMS = dateRegexMatches[1];
  const ms = parseInt(dateRegexMatches[2]);
  const convertedDate = new Date(dateWithoutMS);
  convertedDate.setMilliseconds(ms);
  return convertedDate;
}

export function average(array: number[]) {
  return array.reduce((acc, cur) => acc + cur, 0) / array.length;
}

/***
 * Instances tracks the themes that have been implemented for a specific component
 *
 */
export class ComponentThemeImplementations<ComponentThemeType> {
  implementions = new Map<THEME, ComponentThemeType>();

  public set(theme: THEME, implementation: ComponentThemeType) {
    this.implementions.set(theme, implementation);
  }
  public get(theme: THEME): ComponentThemeType {
    const implementation = this.implementions.get(theme);
    if (typeof implementation === 'undefined') {
      throw Error(
        `Theme ${theme} Not implemented. The following are implementations ${this.implementions}`
      );
    }
    return implementation;
  }
}

export const usedNicknamesCacheIPToNN = new Map<string, string>();
export const usedNicknamesCacheNNToIP = new Map<string, string>();

const nicknames = [
  'Alfa',
  'Bravo',
  'Charlie',
  'Delta',
  'Echo',
  'Foxtrot',
  'Golf',
  'Hotel',
  'India',
  'Juliett',
  'Kilo',
  'Lima',
  'Mike',
  'November',
  'Oscar',
  'Papa',
  'Quebec',
  'Romeo',
  'Sierra',
  'Tango',
  'Uniform',
  'Victor',
  'Whiskey',
  'X-ray',
  'Yankee',
  'Zulu',
];
export function nicknameGenerator(seed: string): string {
  const potentialNickname = usedNicknamesCacheIPToNN.get(seed);
  if (potentialNickname !== undefined) {
    return potentialNickname;
  }
  let newNicknameFound = false;
  let nickname = '';
  const maxIterations = 1000;
  let iterations = 0;
  let seedNum = seed
    .split('')
    .map(char => char.charCodeAt(0))
    .reduce((prev, curr) => prev + curr, 0);
  while (!newNicknameFound) {
    const index = (seedNum + iterations) % nicknames.length;
    nickname = nicknames[index];
    newNicknameFound = !usedNicknamesCacheNNToIP.has(nickname);

    if (usedNicknamesCacheNNToIP.size === nicknames.length) {
      throw Error('Out of nicknames');
    } else if (iterations > maxIterations) {
      throw Error('Nickname gen required more than 1000 iterations');
    }
    iterations++;
  }

  usedNicknamesCacheNNToIP.set(nickname, seed);
  usedNicknamesCacheIPToNN.set(seed, nickname);
  return nickname;
}

export function debounce(func: Function, timeout: number = 300) {
  let timer: any;
  return (...args: any[]) => {
    if (!timer) {
      timer = setTimeout(() => {
        timer = undefined;
      }, timeout);
      return func(...args);
    }
  };
}

/** Pulls keys of type V out of object of type T  e.g.
 * type M {a:string, b:number}
 *
 * this means KeysMatching<M,string> will only match a e.g
 * let x : KeysMatching<M,string> = "a" // All good
 * let y : KeysMatching<M,string> = "b" // Type Error
 */
// more examples
// type M = {
//   a: string;
//   b: number;
//   c: string;
// };
// let x: KeysMatching<M, string> = 'a';
// let y: KeysMatching<M, string> = 'b';
// let z: KeysMatching<M, string> = 'c';
export type KeysMatching<T, V> = {[K in keyof T]-?: T[K] extends V ? K : never}[keyof T];
