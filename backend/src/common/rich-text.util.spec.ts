import { sanitizeRichText } from './rich-text.util';

describe('sanitizeRichText', () => {
  it('keeps the allowed formatting tags', () => {
    const html =
      '<h2>Rules</h2><p>Play <strong>fair</strong> and <em>fast</em>.</p>' +
      '<ul><li>One</li><li>Two</li></ul>';
    expect(sanitizeRichText(html)).toBe(html);
  });

  it('normalises <b>/<i> from pasted content to <strong>/<em>', () => {
    expect(sanitizeRichText('<p><b>bold</b> <i>it</i></p>')).toBe(
      '<p><strong>bold</strong> <em>it</em></p>',
    );
  });

  it('strips <script> and event-handler attributes', () => {
    expect(
      sanitizeRichText('<p onclick="steal()">ok</p><script>alert(1)</script>'),
    ).toBe('<p>ok</p>');
  });

  it('drops javascript: links but keeps http/mailto and pins rel/target', () => {
    expect(sanitizeRichText('<p><a href="javascript:alert(1)">x</a></p>')).toBe(
      '<p>x</p>',
    );
    expect(
      sanitizeRichText('<p><a href="https://drift.tennis">x</a></p>'),
    ).toBe(
      '<p><a rel="noopener noreferrer nofollow" target="_blank" href="https://drift.tennis">x</a></p>',
    );
  });

  it('discards unknown tags and their attributes but keeps inner text', () => {
    expect(
      sanitizeRichText(
        '<div style="position:fixed">hi <span>there</span></div>',
      ),
    ).toBe('hi there');
  });

  it('collapses an empty editor value to undefined', () => {
    expect(sanitizeRichText('<p></p>')).toBeUndefined();
    expect(sanitizeRichText('   ')).toBeUndefined();
    expect(sanitizeRichText('')).toBeUndefined();
    expect(sanitizeRichText(undefined)).toBeUndefined();
  });
});
