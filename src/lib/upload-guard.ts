/**
 * Upload hardening for user-supplied images (ported from the base template's
 * upload-image hardening, plus a content sniff).
 *
 * - Raster formats only. SVG can carry script and would run on whatever origin
 *   serves it, so it is never accepted from users.
 * - The stored type and extension come from the file's bytes — never from the
 *   client-supplied file name or type. Browsers derive `File.type` from the
 *   extension (a PNG saved as `.jpg` reports `image/jpeg`, and HEIC often
 *   reports nothing), so a mismatching or missing declared type is not
 *   rejected as long as the content is a supported raster image.
 */
const RASTER_IMAGE_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

const MIME_ALIASES: Record<string, string> = {
  'image/jpg': 'image/jpeg',
  'image/pjpeg': 'image/jpeg',
  'image/x-png': 'image/png',
};

/** `image/PNG; charset=x` → `image/png` (with legacy aliases canonicalized). */
export function normalizeMime(type: string | null | undefined): string {
  const mime = (type || '').split(';')[0].trim().toLowerCase();
  return MIME_ALIASES[mime] || mime;
}

/** Extension for an allowed raster type, or '' when the type is not allowed. */
export function extFromImageMime(mimeType: string): string {
  return RASTER_IMAGE_EXT[normalizeMime(mimeType)] || '';
}

/**
 * Cheap pre-check before reading the bytes: the client says it is an image,
 * or says nothing useful (empty / octet-stream). Anything else (text/html,
 * video/mp4, …) is refused without buffering the file.
 */
export function isDeclaredImageType(type: string | null | undefined) {
  const mime = normalizeMime(type);
  return (
    !mime || mime === 'application/octet-stream' || mime.startsWith('image/')
  );
}

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.slice(start, end));
}

const AVIF_BRANDS = new Set(['avif', 'avis']);
const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis']);
const HEIF_BRANDS = new Set(['mif1', 'msf1']);

/** ISO-BMFF `ftyp` brands (major + compatible), or [] when not ISO-BMFF. */
function isoBrands(bytes: Uint8Array): string[] {
  if (bytes.length < 12 || ascii(bytes, 4, 8) !== 'ftyp') return [];
  const boxSize =
    ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
  const end = Math.min(bytes.length, boxSize || 0, 256);
  const brands = [ascii(bytes, 8, 12)];
  for (let i = 16; i + 4 <= end; i += 4) brands.push(ascii(bytes, i, i + 4));
  return brands;
}

/**
 * The raster image type the content actually is, or '' when it is not one we
 * accept. SVG/HTML/video never match.
 */
export function sniffImageMime(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes[0] === 0x89 &&
    ascii(bytes, 1, 4) === 'PNG' &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP') {
    return 'image/webp';
  }
  const gif = ascii(bytes, 0, 6);
  if (gif === 'GIF87a' || gif === 'GIF89a') return 'image/gif';

  const brands = isoBrands(bytes);
  if (brands.some((b) => AVIF_BRANDS.has(b))) return 'image/avif';
  if (brands.some((b) => HEIC_BRANDS.has(b))) return 'image/heic';
  if (brands.some((b) => HEIF_BRANDS.has(b))) return 'image/heif';
  return '';
}

/** Refuse oversized bodies before buffering them, when the size is declared. */
export function declaredBodyExceeds(request: Request, maxBytes: number) {
  const declared = Number(request.headers.get('content-length') || 0);
  return Number.isFinite(declared) && declared > maxBytes;
}
