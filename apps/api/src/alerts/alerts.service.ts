import { Injectable } from '@nestjs/common';

export interface AlertSettings {
  enabled: boolean;
  riskThreshold: number;
  criticalFindingsThreshold: number;
  scanCooldownMinutes: number;
  slackAlertsEnabled: boolean;
}

@Injectable()
export class AlertsService {
  private readonly settingsByOrg = new Map<string, AlertSettings>();

  private readonly defaultSettings: AlertSettings = {
    enabled: true,
    riskThreshold: 60,
    criticalFindingsThreshold: 10,
    scanCooldownMinutes: 30,
    slackAlertsEnabled: false,
  };

  getSettings(orgId: string): AlertSettings {
    return this.settingsByOrg.get(orgId) ?? this.defaultSettings;
  }

  updateSettings(orgId: string, incoming: Partial<AlertSettings>): AlertSettings {
    const current = this.getSettings(orgId);
    const next: AlertSettings = {
      ...current,
      ...incoming,
      riskThreshold: this.clampNumber(incoming.riskThreshold ?? current.riskThreshold, 0, 100),
      criticalFindingsThreshold: this.clampNumber(
        incoming.criticalFindingsThreshold ?? current.criticalFindingsThreshold,
        0,
        1000,
      ),
      scanCooldownMinutes: this.clampNumber(
        incoming.scanCooldownMinutes ?? current.scanCooldownMinutes,
        1,
        1440,
      ),
    };

    this.settingsByOrg.set(orgId, next);
    return next;
  }

  evaluate(orgId: string, currentRiskScore: number, criticalFindings: number) {
    const settings = this.getSettings(orgId);

    const riskExceeded = currentRiskScore >= settings.riskThreshold;
    const criticalExceeded =
      criticalFindings >= settings.criticalFindingsThreshold;

    return {
      settings,
      riskExceeded,
      criticalExceeded,
      shouldTriggerScan: settings.enabled && (riskExceeded || criticalExceeded),
      reason: !settings.enabled
        ? 'alerts_disabled'
        : riskExceeded
          ? 'risk_threshold_exceeded'
          : criticalExceeded
            ? 'critical_findings_threshold_exceeded'
            : 'within_threshold',
    };
  }

  private clampNumber(value: number, min: number, max: number): number {
    if (Number.isNaN(value)) return min;
    return Math.max(min, Math.min(max, value));
  }
}
