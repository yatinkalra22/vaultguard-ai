import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// WHY: Named guard wrapping Passport's 'jwt' strategy. Apply with
// @UseGuards(JwtAuthGuard) on any controller or route that requires auth.
// See: https://docs.nestjs.com/guards#binding-guards
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
