import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { FgaService } from './fga.service';

/**
 * WHY: Guard that checks FGA before allowing remediation approval.
 * Apply with @UseGuards(FgaGuard) on endpoints that modify access.
 * If FGA is not configured, the guard is permissive (dev mode).
 */
@Injectable()
export class FgaGuard implements CanActivate {
  constructor(private readonly fga: FgaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.sub || !user?.orgId) {
      throw new ForbiddenException('Missing user or org context');
    }

    const allowed = await this.fga.canApproveRemediation(
      user.sub,
      user.orgId,
    );

    if (!allowed) {
      throw new ForbiddenException(
        'You do not have permission to approve remediations for this organization',
      );
    }

    return true;
  }
}
