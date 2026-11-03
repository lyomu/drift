import { IsIn } from 'class-validator';
import { LOCALES, type LocaleCode } from '../../common/i18n';

/** Settings → Language (mobile) and the club-admin language switcher. */
export class UpdateLocaleDto {
  @IsIn(LOCALES)
  locale!: LocaleCode;
}
