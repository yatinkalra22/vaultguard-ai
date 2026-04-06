import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { Auth0Strategy } from './auth0.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { FgaService } from './fga.service';
import { FgaGuard } from './fga.guard';
import { StepUpGuard } from './step-up.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  providers: [Auth0Strategy, JwtAuthGuard, FgaService, FgaGuard, StepUpGuard],
  exports: [PassportModule, JwtAuthGuard, FgaService, FgaGuard, StepUpGuard],
})
export class AuthModule {}
