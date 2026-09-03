import { BadRequestException } from '@nestjs/common';

export const MINIMUM_ACCOUNT_AGE = 18;
export const AGE_POLICY_ERROR_MESSAGE =
  'You must confirm you are 18 or older to create an account.';

export function assertAgePolicyAccepted(accepted?: boolean): void {
  if (accepted !== true) {
    throw new BadRequestException(AGE_POLICY_ERROR_MESSAGE);
  }
}
