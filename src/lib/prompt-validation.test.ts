import { describe, expect, it } from 'vitest';

import { isCjkPromptTooShort } from './prompt-validation';

describe('isCjkPromptTooShort', () => {
  it('flags short Chinese prompts', () => {
    expect(isCjkPromptTooShort('漂亮的小猫')).toBe(true);
    expect(isCjkPromptTooShort('  小猫！ ')).toBe(true);
  });
  it('allows Chinese prompts with enough detail', () => {
    expect(isCjkPromptTooShort('一只可爱的橘色小猫')).toBe(false);
    expect(isCjkPromptTooShort('1个可爱的泰迪小狗')).toBe(false);
  });
  it('ignores prompts without Chinese', () => {
    expect(isCjkPromptTooShort('cat')).toBe(false);
    expect(isCjkPromptTooShort('')).toBe(false);
  });
});
