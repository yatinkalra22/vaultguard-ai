import {
  BadRequestException,
  Controller,
  Delete,
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
      return { error: 'No organization associated with this user' };
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
      return { error: 'No organization associated with this user' };
    }

    return this.integrations.disconnectIntegration(orgId, id);
  }
}
