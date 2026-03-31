import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditService } from '../audit/audit.service';
import { SlackService } from '../slack/slack.service';
import {
  AlertsService,
  AlertSettings,
  ThresholdEvaluation,
} from './alerts.service';

@Controller('alerts')
@UseGuards(JwtAuthGuard)
export class AlertsController {
  constructor(
    private readonly alertsService: AlertsService,
    private readonly slackService: SlackService,
    private readonly auditService: AuditService,
  ) {}

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
  async evaluate(
    @Request() req: { user: { sub: string; orgId?: string } },
    @Body() body: { currentRiskScore: number; criticalFindings: number },
  ) {
    const orgId = req.user.orgId;
    if (!orgId) return { error: 'No organization associated with this user' };

    const evaluation: ThresholdEvaluation = this.alertsService.evaluate(
      orgId,
      body.currentRiskScore ?? 0,
      body.criticalFindings ?? 0,
    );

    if (!evaluation.shouldTriggerScan) {
      return evaluation;
    }

    const { incident, deduplicated } = this.alertsService.recordIncident(
      orgId,
      evaluation.reason,
      body.currentRiskScore ?? 0,
      body.criticalFindings ?? 0,
    );

    let slackDelivered = false;
    if (evaluation.settings.slackAlertsEnabled && !deduplicated) {
      const message =
        `VaultGuard Alert: ${evaluation.reason} | ` +
        `Risk=${body.currentRiskScore ?? 0} | ` +
        `Critical=${body.criticalFindings ?? 0}`;
      slackDelivered = await this.slackService.sendAlertMessage(
        req.user.sub,
        evaluation.settings.alertChannel,
        message,
      );
    }

    await this.auditService.log({
      orgId,
      actor: req.user.sub,
      action: deduplicated ? 'alert.deduplicated' : 'alert.triggered',
      target: {
        incident_id: incident.id,
        reason: evaluation.reason,
      },
      metadata: {
        risk: body.currentRiskScore ?? 0,
        criticalFindings: body.criticalFindings ?? 0,
        slackDelivered,
      },
    });

    return {
      ...evaluation,
      incident,
      deduplicated,
      slackDelivered,
    };
  }

  @Get('history')
  getHistory(@Request() req: { user: { orgId?: string } }) {
    const orgId = req.user.orgId;
    if (!orgId) return [];
    return this.alertsService.listHistory(orgId);
  }

  @Patch('history/:id/acknowledge')
  async acknowledge(
    @Request() req: { user: { sub: string; orgId?: string } },
    @Param('id') id: string,
  ) {
    const orgId = req.user.orgId;
    if (!orgId) return { error: 'No organization associated with this user' };

    const incident = this.alertsService.acknowledgeIncident(orgId, id, req.user.sub);
    if (!incident) return { error: 'Alert incident not found' };

    await this.auditService.log({
      orgId,
      actor: req.user.sub,
      action: 'alert.acknowledged',
      target: {
        incident_id: id,
      },
    });

    return incident;
  }
}
