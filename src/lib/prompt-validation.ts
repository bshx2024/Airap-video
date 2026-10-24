/** Chinese prompts shorter than this are often rejected upstream as too vague. */
export const MIN_CJK_PROMPT_LENGTH = 6;

const HAN = /\p{Script=Han}/u;
const IGNORED = /[\s\p{P}\p{S}]/gu;

/** True when a prompt is written in Chinese and too short to describe an image. */
export function isCjkPromptTooShort(prompt: string): boolean {
  const compact = prompt.replace(IGNORED, '');
  if (!HAN.test(compact)) return false;
  return Array.from(compact).length < MIN_CJK_PROMPT_LENGTH;
}
