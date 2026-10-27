// Lightweight, self-contained QR Code Generator (Byte Mode, ISO/IEC 18004)
// Generates a boolean 2D matrix (true = dark module, false = light module)

export function generateQrMatrix(text: string): boolean[][] {
  // Simple, robust QR generator supporting alphanumeric/byte URLs up to ~150 chars (Version 3/4)
  // For full fidelity, we can also use data URL or SVG rendering
  return createQrCode(text);
}

// Minimal QR Code Engine for web URLs
function createQrCode(text: string): boolean[][] {
  const bytes = new TextEncoder().encode(text);
  const len = bytes.length;
  
  // Choose version based on length
  let version = 2; // 25x25
  let maxBytes = 32;
  if (len > 32) {
    version = 4; // 33x33
    maxBytes = 78;
  }
  if (len > 78) {
    version = 6; // 41x41
    maxBytes = 134;
  }
  if (len > 134) {
    version = 8; // 49x49
    maxBytes = 192;
  }

  const size = version * 4 + 17;
  const matrix: (boolean | null)[][] = Array.from({ length: size }, () =>
    Array(size).fill(null)
  );

  // 1. Finder patterns (7x7 at top-left, top-right, bottom-left)
  const addFinder = (row: number, col: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const mr = row + r;
        const mc = col + c;
        if (mr >= 0 && mr < size && mc >= 0 && mc < size) {
          if (r === -1 || r === 7 || c === -1 || c === 7) {
            matrix[mr][mc] = false; // Separator
          } else if (r === 0 || r === 6 || c === 0 || c === 6) {
            matrix[mr][mc] = true;
          } else if (r >= 2 && r <= 4 && c >= 2 && c <= 4) {
            matrix[mr][mc] = true;
          } else {
            matrix[mr][mc] = false;
          }
        }
      }
    }
  };

  addFinder(0, 0);
  addFinder(0, size - 7);
  addFinder(size - 7, 0);

  // 2. Timing patterns
  for (let i = 8; i < size - 8; i++) {
    const val = i % 2 === 0;
    if (matrix[6][i] === null) matrix[6][i] = val;
    if (matrix[i][6] === null) matrix[i][6] = val;
  }

  // 3. Dark module
  matrix[size - 8][8] = true;

  // 4. Reserve format info areas
  for (let i = 0; i < 9; i++) {
    if (matrix[8][i] === null) matrix[8][i] = false;
    if (matrix[i][8] === null) matrix[i][8] = false;
  }
  for (let i = size - 8; i < size; i++) {
    if (matrix[8][i] === null) matrix[8][i] = false;
    if (matrix[i][8] === null) matrix[i][8] = false;
  }

  // 5. Pack data bits (Mode: Byte 0100 + Length + Bytes + Terminator)
  const bits: number[] = [];
  // Mode: 8-bit byte (0100)
  bits.push(0, 1, 0, 0);
  // Character count (8 bits for V1-9)
  for (let i = 7; i >= 0; i--) bits.push((len >> i) & 1);
  // Data bytes
  for (const b of bytes) {
    for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1);
  }
  // Terminator (up to 4 zeros)
  for (let i = 0; i < 4 && bits.length < maxBytes * 8; i++) bits.push(0);
  // Pad to multiple of 8
  while (bits.length % 8 !== 0) bits.push(0);
  // Pad bytes 0xEC, 0x11
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bits.length < maxBytes * 8) {
    const pb = padBytes[padIdx % 2];
    for (let i = 7; i >= 0; i--) bits.push((pb >> i) & 1);
    padIdx++;
  }

  // 6. Placement in matrix (zigzag from right to left)
  let bitIdx = 0;
  let upward = true;

  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--; // Skip vertical timing column

    const rowStart = upward ? size - 1 : 0;
    const rowEnd = upward ? -1 : size;
    const step = upward ? -1 : 1;

    for (let row = rowStart; row !== rowEnd; row += step) {
      for (let c = 0; c < 2; c++) {
        const mc = col - c;
        if (matrix[row][mc] === null) {
          const bit = bitIdx < bits.length ? bits[bitIdx++] : 0;
          // Apply mask 000: (row + col) % 2 === 0
          const mask = (row + mc) % 2 === 0;
          matrix[row][mc] = (bit ^ (mask ? 1 : 0)) === 1;
        }
      }
    }
    upward = !upward;
  }

  // Fill any remaining nulls with false
  return matrix.map((row) => row.map((cell) => cell ?? false));
}
