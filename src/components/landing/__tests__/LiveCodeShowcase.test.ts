import { describe, expect, it } from 'vitest';
import { getNextShowcaseStep } from '../LiveCodeShowcase';

describe('live code showcase steps', () => {
  it('moves through each demo stage and loops to the beginning', () => {
    expect(getNextShowcaseStep(0)).toBe(1);
    expect(getNextShowcaseStep(1)).toBe(2);
    expect(getNextShowcaseStep(2)).toBe(0);
  });

  it('recovers safely from invalid stage indexes', () => {
    expect(getNextShowcaseStep(-1)).toBe(0);
    expect(getNextShowcaseStep(3)).toBe(0);
    expect(getNextShowcaseStep(Number.NaN)).toBe(0);
  });
});
