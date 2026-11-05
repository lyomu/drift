import { localeOf, msg, render, t } from './index';

describe('server translations', () => {
  it('uses English for missing locale choices', () => {
    expect(localeOf(null)).toBe('en');
    expect(localeOf('unknown')).toBe('en');
  });

  it('renders a parameter in the selected language', () => {
    const message = msg('connection.request.title', { name: 'Alex' });
    expect(render('fr', message)).toContain('Alex');
    expect(render('fr', message)).not.toBe(render('en', message));
    expect(t('es', 'connection.request.body')).not.toBe(
      t('en', 'connection.request.body'),
    );
  });
});
