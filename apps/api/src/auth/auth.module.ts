import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { Auth0Strategy } from './auth0.strategy';
import { FgaService } from './fga.service';
import { FgaGuard } from './fga.guard';
import { StepUpGuard } from './step-up.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  providers: [Auth0Strategy, FgaService, FgaGuard, StepUpGuard],
  exports: [PassportModule, FgaService, FgaGuard, StepUpGuard],
})
export class AuthModule {}
