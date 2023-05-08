import { toASCII as punycodeEncode } from 'punycode';
import { URLSearchParams, URL } from 'node:url';
import { readFileSync, createWriteStream, mkdirSync, symlinkSync } from 'fs';
import * as crypto from 'crypto';


const trimChar = (s: string, charToRemove: string): string => {
  const regex = new RegExp(`^${charToRemove}+|${charToRemove}+$`, "g");
  return s.replace(regex, "");
};


export const url2dirpath = (url: string): string => {
  const parsedUrl = new URL(url);
  const hostname = parsedUrl.hostname ? punycodeEncode(parsedUrl.hostname) : '';
  let path = parsedUrl.pathname ? parsedUrl.pathname : '';
  path = trimChar(path, "/")
  let query = parsedUrl.search ? new URLSearchParams(parsedUrl.search.slice(1)).toString() : '';
  let fragment = parsedUrl.hash ? new URLSearchParams(parsedUrl.hash.slice(1)).toString() : '';

  if (path.length > 512) {
    const parts = [];
    for (const part of path.split('/')) {
      if (part.length > 255) {
        const h = crypto.createHash('sha256');
        h.update(Buffer.from(part, 'utf-8'));
        const digest = h.digest('hex');
        parts.push(digest);
      } else {
        parts.push(part);
      }
    }
    path = parts.join('/');
    if (path.length > 512) {
      path = path.slice(0, 512);
    }
  }

  if (query.length > 255) {
    const h = crypto.createHash('sha256');
    h.update(Buffer.from(query, 'utf-8'));
    const digest = h.digest('hex');
    query = digest;
  }

  if (fragment.length > 255) {
    const h = crypto.createHash('sha256');
    h.update(Buffer.from(fragment, 'utf-8'));
    const digest = h.digest('hex');
    fragment = digest;
  }

  let result = [hostname, path, query, fragment].join('/');
  result = result.replace(/[^-0-9a-zA-Z./]/g, '_');;
  result = trimChar(result, "/")

  return result;
};


export const loadUrlsInFile = (urlFile: string): string[] => {
  return readFileSync(urlFile, 'utf-8')
    .split('\n')
    .filter((url) => {
      // 行頭・行末の空白文字列は除去
      url = url.trim();

      // 先頭に # を含む行は無視
      const doesNotStartWithHash = !url.startsWith('#');

      // 空行は無視
      const isNotEmpty = url.trim().length > 0;

      return doesNotStartWithHash && isNotEmpty;
    });
};


export const makedir = (dirpath: string): void => {
  mkdirSync(dirpath, { recursive: true });
};


export const output = (data: any, filepath: string, flags: string = "w"): void => {
  const lines: string[] = [];

  if (typeof data === 'string') {
    lines.push(data);
  } else if (Array.isArray(data) || data instanceof Set) {
    for (const line of data) {
      if (typeof line === 'string') {
        const trimmedLine = line.trim();
        if (trimmedLine) {
          lines.push(trimmedLine);
        }  
      }
    }
  } else if (typeof data === 'object' && data !== null) {
    for (const [key, value] of Object.entries(data)) {
      const trimmedKey: string = key.trim();
      if (trimmedKey) {
        if (typeof value === 'string') {
          const trimmedValue = value.trim();
          lines.push(`${trimmedKey} => ${trimmedValue}`);            
        }
      }
    }
  }

  const writeStream = createWriteStream(filepath, { flags: flags });
  writeStream.write(`${lines.join('\n')}\n`, 'utf-8', () => {
    // コールバック関数内で書き込み完了後の処理を行う
    writeStream.end();
  });
};

export const makeSymlink = (realfile: string, linkfile: string): void => {
  symlinkSync(realfile, linkfile)
}
