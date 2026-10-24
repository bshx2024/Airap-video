import { expect, test } from 'vitest';

import {
  declaredBodyExceeds,
  extFromImageMime,
  isDeclaredImageType,
  normalizeMime,
  sniffImageMime,
} from './upload-guard';

const bytes = (...parts: Array<number[] | string>) =>
  new Uint8Array(
    parts.flatMap((p) =>
      typeof p === 'string' ? [...p].map((c) => c.charCodeAt(0)) : p
    )
  );
const ftyp = (major: string, ...compat: string[]) =>
  bytes(
    [0, 0, 0, 16 + 4 * compat.length],
    'ftyp',
    major,
    [0, 0, 0, 0],
    ...compat
  );

const PNG = bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG = bytes([0xff, 0xd8, 0xff, 0xe0]);
const SVG = bytes(
  '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
);

test('SVG and non-image types get no extension (rejected)', () => {
  expect(extFromImageMime('image/svg+xml')).toBe('');
  expect(extFromImageMime('text/html')).toBe('');
  expect(extFromImageMime('application/octet-stream')).toBe('');
  expect(extFromImageMime('')).toBe('');
});

test('raster types map to a fixed extension (aliases included)', () => {
  expect(extFromImageMime('image/png')).toBe('png');
  expect(extFromImageMime('image/JPEG; charset=binary')).toBe('jpg');
  expect(extFromImageMime('image/jpg')).toBe('jpg');
  expect(extFromImageMime('image/pjpeg')).toBe('jpg');
  expect(extFromImageMime('image/webp')).toBe('webp');
  expect(normalizeMime(' Image/PNG ; x=y')).toBe('image/png');
});

test('declared type pre-check: images, or nothing useful', () => {
  expect(isDeclaredImageType('image/jpeg')).toBe(true);
  expect(isDeclaredImageType('')).toBe(true); // HEIC on some browsers
  expect(isDeclaredImageType('application/octet-stream')).toBe(true);
  expect(isDeclaredImageType('text/html')).toBe(false);
  expect(isDeclaredImageType('video/mp4')).toBe(false);
});

test('type is sniffed from the content', () => {
  expect(sniffImageMime(PNG)).toBe('image/png');
  expect(sniffImageMime(JPEG)).toBe('image/jpeg');
  expect(sniffImageMime(bytes('GIF89a'))).toBe('image/gif');
  expect(sniffImageMime(bytes('GIF87a'))).toBe('image/gif');
  expect(sniffImageMime(bytes('RIFF', [0, 0, 0, 0], 'WEBP'))).toBe(
    'image/webp'
  );
  expect(sniffImageMime(ftyp('avif', 'mif1', 'miaf'))).toBe('image/avif');
  expect(sniffImageMime(ftyp('heic', 'mif1', 'heic'))).toBe('image/heic');
  expect(sniffImageMime(ftyp('mif1', 'heic'))).toBe('image/heic');
  expect(sniffImageMime(ftyp('mif1', 'miaf'))).toBe('image/heif');
});

test('markup, video and audio never sniff as images', () => {
  expect(sniffImageMime(SVG)).toBe('');
  expect(sniffImageMime(bytes('<!doctype html><script>'))).toBe('');
  expect(sniffImageMime(ftyp('isom', 'mp42'))).toBe(''); // mp4 video
  expect(sniffImageMime(bytes('RIFF', [0, 0, 0, 0], 'WAVE'))).toBe('');
  expect(sniffImageMime(new Uint8Array())).toBe('');
});

test('declared body size is checked before buffering', () => {
  const big = new Request('http://x/', {
    method: 'POST',
    headers: { 'content-length': String(60 * 1024 * 1024) },
  });
  const small = new Request('http://x/', {
    method: 'POST',
    headers: { 'content-length': '100' },
  });
  expect(declaredBodyExceeds(big, 50 * 1024 * 1024)).toBe(true);
  expect(declaredBodyExceeds(small, 50 * 1024 * 1024)).toBe(false);
  expect(declaredBodyExceeds(new Request('http://x/'), 50 * 1024 * 1024)).toBe(
    false
  );
});
