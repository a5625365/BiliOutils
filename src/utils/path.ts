import path from 'path';

export function resolvePath(str: string) {
  return path.resolve(process.cwd(), str);
}

export function resolvePathArray(arr: string[]) {
  return arr.map(resolvePath);
}
