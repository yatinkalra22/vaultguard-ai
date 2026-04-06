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
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IntegrationsService } from './integrations.service';

@Controller('integrations')
@UseGuards(JwtAuthGuard)
export class IntegrationsController {
  constructor(
    private readonly integrations: IntegrationsService,
    private readonly config: ConfigService,
  ) {}

  private resolveOrgId(req: { user: { orgId?: string } }): string | undefined {
    return req.user.orgId ?? this.config.get<string>('AUTH0_ORGANIZATION_ID');
  }

  @Get()
  async listIntegrations(@Request() req: { user: { orgId?: string } }) {
    const orgId = this.resolveOrgId(req);
    if (!orgId) return [];

    return this.integrations.listIntegrations(orgId);
  }

  @Post(':provider/connect')
  async connectIntegration(
    @Param('provider') provider: string,
    @Request() req: { user: { orgId?: string } },
  ) {
    const orgId = this.resolveOrgId(req);
    if (!orgId) {
      // WHY: Must throw (not return) so the frontend catch block runs.
      // Returning { error } gives HTTP 200 — the frontend destructures `url`,
      // gets undefined, and navigates to the literal string "undefined".
      // WHY ForbiddenException (403) not UnauthorizedException (401):
      // The user IS authenticated — JWT is valid. They just don't have an org
      // claim yet. 401 would trigger the global auto-logout redirect, which
      // is wrong for an account configuration issue.
      // WHY code:'no_organization': generic 403 maps to "You don't have
      // permission" in the frontend, which is confusing. The custom code maps
      // to a message that actually tells the user what's wrong.
      throw new ForbiddenException({
        code: 'no_organization',
        message: 'No organization associated with this account. Ensure your Auth0 organization is configured.',
      });
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
    const orgId = this.resolveOrgId(req);
    if (!orgId) {
      throw new ForbiddenException({
        code: 'no_organization',
        message: 'No organization associated with this account.',
      });
    }

    return this.integrations.disconnectIntegration(orgId, id);
  }
}
