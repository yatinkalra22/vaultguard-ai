import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { Auth0Strategy } from './auth0.strategy';

@Module({
  imports: [
    // WHY: defaultStrategy 'jwt' means @UseGuards(AuthGuard()) will use
    // our Auth0Strategy without specifying the strategy name each time.
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  providers: [Auth0Strategy],
  exports: [PassportModule],
})
export class AuthModule {}
