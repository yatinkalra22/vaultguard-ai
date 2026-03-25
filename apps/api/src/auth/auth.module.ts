import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { Auth0Strategy } from './auth0.strategy';
import { FgaService } from './fga.service';
import { FgaGuard } from './fga.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  providers: [Auth0Strategy, FgaService, FgaGuard],
  exports: [PassportModule, FgaService, FgaGuard],
})
export class AuthModule {}
