// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { keepsakeHTML, keepsakeMarkdown, type KeepsakeInput } from './keepsake';
import { DEFAULT_DOLL } from './quitapenas';
import { SLIDES } from './content';

const slideId = SLIDES[0].id;
const evil = '<script>alert("x")</script> & \'ok\'';
const base: KeepsakeInput = { nickname: null, notes: { [slideId]: { text: evil, savedAt: 0 } }, doll: null };
const withDoll: KeepsakeInput = { ...base, doll: { name: '<b>Lupita</b>', pena: 0, opts: DEFAULT_DOLL } };

describe('keepsakeHTML', () => {
  it('escapa el HTML de las notas', () => {
    const html = keepsakeHTML(base);
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;ok&#39;');
  });

  it('escapa el apodo', () => {
    const html = keepsakeHTML({ ...base, nickname: '<img src=x onerror=alert(1)>' });
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('incluye el quitapenas solo si existe', () => {
    expect(keepsakeHTML(base)).not.toContain('class="doll"');
    expect(keepsakeHTML(base)).not.toContain('<svg');
    const html = keepsakeHTML(withDoll);
    expect(html).toContain('class="doll"');
    expect(html).toContain('<svg');
    expect(html).toContain('&lt;b&gt;Lupita&lt;/b&gt;');
    expect(html).not.toContain('<b>Lupita</b>');
  });
});

describe('keepsakeMarkdown', () => {
  it('incluye la nota de la persona', () => {
    expect(keepsakeMarkdown(base)).toContain(`> **Mi nota:** ${evil}`);
  });

  it('incluye el quitapenas solo si existe', () => {
    expect(keepsakeMarkdown(base)).not.toContain('Mi quitapenas');
    expect(keepsakeMarkdown(withDoll)).toContain('## Mi quitapenas: <b>Lupita</b>');
  });
});
