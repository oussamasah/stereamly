import { describe, expect, it } from 'vitest';
import { direction, getMessages, isLocale } from './i18n';
describe('i18n', () => { it('supports required locales', () => { expect(isLocale('fr')).toBe(true); expect(isLocale('en')).toBe(true); expect(isLocale('ar')).toBe(true); }); it('uses RTL only for Arabic', () => { expect(direction('ar')).toBe('rtl'); expect(direction('fr')).toBe('ltr'); }); it('has translated titles', () => expect(new Set(['fr','en','ar'].map((l) => getMessages(l as 'fr'|'en'|'ar').title)).size).toBe(3)); });

