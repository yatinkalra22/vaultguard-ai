import { Body, Controller, Get, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AlertsService, AlertSettings } from './alerts.service';

@Controller('alerts')
@UseGuards(JwtAuthGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get('settings')
  getSettings(@Request() req: { user: { orgId?: string } }) {
    const orgId = req.user.orgId;
    if (!orgId) return null;
    return this.alertsService.getSettings(orgId);
  }

  @Patch('settings')
  updateSettings(
    @Request() req: { user: { orgId?: string } },
    @Body() body: Partial<AlertSettings>,
  ) {
    const orgId = req.user.orgId;
    if (!orgId) return { error: 'No organization associated with this user' };
    return this.alertsService.updateSettings(orgId, body);
  }

  @Post('evaluate')
  evaluate(
    @Request() req: { user: { orgId?: string } },
    @Body() body: { currentRiskScore: number; criticalFindings: number },
  ) {
    const orgId = req.user.orgId;
    if (!orgId) return { error: 'No organization associated with this user' };
    return this.alertsService.evaluate(
      orgId,
      body.currentRiskScore ?? 0,
      body.criticalFindings ?? 0,
    );
  }
}
