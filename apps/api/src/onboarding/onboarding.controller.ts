import { Controller, Post, Body } from '@nestjs/common';
import { OnboardingService, RegisterCustomerInput, RegistrationResult, CustomerUser } from '@cloudfly/domain';

export interface VerifyEmailDto {
  userId: string;
  token: string;
}

@Controller('onboarding')
export class OnboardingController {
  constructor(private onboarding: OnboardingService) {}

  @Post('register')
  register(@Body() input: RegisterCustomerInput): RegistrationResult {
    return this.onboarding.register(input);
  }

  @Post('verify')
  verifyEmail(@Body() input: VerifyEmailDto): CustomerUser {
    return this.onboarding.verifyEmail(input.userId, input.token);
  }
}
