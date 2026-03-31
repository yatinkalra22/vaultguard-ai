import { Injectable } from '@nestjs/common';

export interface AlertSettings {
  enabled: boolean;
  riskThreshold: number;
  criticalFindingsThreshold: number;
  scanCooldownMinutes: number;
  slackAlertsEnabled: boolean;
  alertChannel: string;
}

export interface AlertIncident {
  id: string;
  orgId: string;
  reason: string;
  status: 'open' | 'acknowledged';
  currentRiskScore: number;
  criticalFindings: number;
  duplicateCount: number;
  createdAt: string;
  updatedAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}

export interface ThresholdEvaluation {
  settings: AlertSettings;
  riskExceeded: boolean;
  criticalExceeded: boolean;
  shouldTriggerScan: boolean;
  reason:
    | 'alerts_disabled'
    | 'risk_threshold_exceeded'
    | 'critical_findings_threshold_exceeded'
    | 'within_threshold';
}

@Injectable()
export class AlertsService {
  private readonly settingsByOrg = new Map<string, AlertSettings>();
  private readonly historyByOrg = new Map<string, AlertIncident[]>();

  private readonly defaultSettings: AlertSettings = {
    enabled: true,
    riskThreshold: 60,
    criticalFindingsThreshold: 10,
    scanCooldownMinutes: 30,
    slackAlertsEnabled: false,
    alertChannel: '#general',
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
      alertChannel: incoming.alertChannel?.trim() || current.alertChannel,
    };

    this.settingsByOrg.set(orgId, next);
    return next;
  }

  evaluate(
    orgId: string,
    currentRiskScore: number,
    criticalFindings: number,
  ): ThresholdEvaluation {
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

  listHistory(orgId: string): AlertIncident[] {
    const history = this.historyByOrg.get(orgId) ?? [];
    return [...history].sort((a, b) => {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }

  acknowledgeIncident(
    orgId: string,
    incidentId: string,
    actor: string,
  ): AlertIncident | null {
    const incidents = this.historyByOrg.get(orgId) ?? [];
    const incident = incidents.find((item) => item.id === incidentId);
    if (!incident) return null;

    incident.status = 'acknowledged';
    incident.acknowledgedAt = new Date().toISOString();
    incident.acknowledgedBy = actor;
    incident.updatedAt = new Date().toISOString();
    return incident;
  }

  recordIncident(
    orgId: string,
    reason: string,
    currentRiskScore: number,
    criticalFindings: number,
  ): { incident: AlertIncident; deduplicated: boolean } {
    const settings = this.getSettings(orgId);
    const now = new Date();
    const nowIso = now.toISOString();
    const history = this.historyByOrg.get(orgId) ?? [];
    const dedupeWindowMs = settings.scanCooldownMinutes * 60 * 1000;

    const existing = history.find((item) => {
      if (item.reason !== reason || item.status !== 'open') return false;
      return now.getTime() - new Date(item.updatedAt).getTime() < dedupeWindowMs;
    });

    if (existing) {
      existing.duplicateCount += 1;
      existing.currentRiskScore = currentRiskScore;
      existing.criticalFindings = criticalFindings;
      existing.updatedAt = nowIso;
      return { incident: existing, deduplicated: true };
    }

    const incident: AlertIncident = {
      id: `alert-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
      orgId,
      reason,
      status: 'open',
      currentRiskScore,
      criticalFindings,
      duplicateCount: 1,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    history.push(incident);
    this.historyByOrg.set(orgId, history);
    return { incident, deduplicated: false };
  }

  private clampNumber(value: number, min: number, max: number): number {
    if (Number.isNaN(value)) return min;
    return Math.max(min, Math.min(max, value));
  }
}
