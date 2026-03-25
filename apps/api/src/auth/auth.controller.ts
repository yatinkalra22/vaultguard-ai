import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@Request() req: { user: { sub: string; email?: string; orgId?: string } }) {
    // WHY: Returns the decoded JWT payload — frontend uses this to display
    // the current user and their org context. No DB lookup needed since
    // Auth0 JWT already contains the claims.
    return {
      userId: req.user.sub,
      email: req.user.email,
      orgId: req.user.orgId,
    };
  }
}
