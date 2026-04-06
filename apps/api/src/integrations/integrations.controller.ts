import {
  BadRequestException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IntegrationsService } from './integrations.service';

@Controller('integrations')
@UseGuards(JwtAuthGuard)
export class IntegrationsController {
  constructor(private readonly integrations: IntegrationsService) {}

  @Get()
  async listIntegrations(@Request() req: { user: { orgId?: string } }) {
    const orgId = req.user.orgId;
    if (!orgId) return [];

    return this.integrations.listIntegrations(orgId);
  }

  @Post(':provider/connect')
  async connectIntegration(
    @Param('provider') provider: string,
    @Request() req: { user: { orgId?: string } },
  ) {
    const orgId = req.user.orgId;
    if (!orgId) {
      // WHY: Must throw (not return) so the frontend catch block runs.
      // Returning { error } gives HTTP 200 — the frontend destructures `url`,
      // gets undefined, and navigates to the literal string "undefined".
      // WHY ForbiddenException (403) not UnauthorizedException (401):
      // The user IS authenticated — their JWT is valid. They just don't have an
      // org claim yet (Auth0 org not configured). 401 would trigger the
      // global auto-logout redirect in showErrorToast, which is wrong here.
      throw new ForbiddenException(
        'No organization associated with this account. Ensure your Auth0 organization is configured.',
      );
    }

    if (provider !== 'slack' && provider !== 'github') {
      throw new BadRequestException('Unsupported integration provider');
    }

    return this.integrations.connectIntegration(orgId, provider);
  }

  @Delete(':id')
  async disconnectIntegration(
    @Param('id') id: string,
    @Request() req: { user: { orgId?: string } },
  ) {
    const orgId = req.user.orgId;
    if (!orgId) {
      throw new ForbiddenException(
        'No organization associated with this account.',
      );
    }

    return this.integrations.disconnectIntegration(orgId, id);
  }
}
