import { describe, expect, it } from 'vitest';
import { getCursorEffect } from '../CursorReactiveLayer';

describe('page-specific cursor effects', () => {
  it('assigns a distinct motion treatment to every primary page', () => {
    expect(getCursorEffect('/')).toBe('home');
    expect(getCursorEffect('/dashboard')).toBe('dashboard');
    expect(getCursorEffect('/settings')).toBe('settings');
    expect(getCursorEffect('/login')).toBe('login');
    expect(getCursorEffect('/signup')).toBe('signup');
    expect(getCursorEffect('/forgot-password')).toBe('recovery');
    expect(getCursorEffect('/privacy')).toBe('privacy');
    expect(getCursorEffect('/terms')).toBe('terms');
    expect(getCursorEffect('/ab12cd')).toBe('editor');
    expect(getCursorEffect('/room/ab12cd')).toBe('editor');
  });

  it('handles missing paths and root-level room routes safely', () => {
    expect(getCursorEffect(null)).toBe('home');
    expect(getCursorEffect('/unrecognized')).toBe('editor');
    expect(getCursorEffect('/api')).toBe('default');
    expect(getCursorEffect('/unknown/nested/path')).toBe('default');
  });
});
