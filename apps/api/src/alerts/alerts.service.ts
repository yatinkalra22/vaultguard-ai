import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.service';

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
  private readonly logger = new Logger(AlertsService.name);
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

  constructor(private readonly supabase: SupabaseService) {}

  async getSettings(orgId: string): Promise<AlertSettings> {
    const { data, error } = await this.supabase.client
      .from('alert_settings')
      .select('*')
      .eq('org_id', orgId)
      .maybeSingle();

    if (error) {
      this.logger.warn(
        `alert_settings unavailable, using memory fallback: ${error.message}`,
      );
      return this.settingsByOrg.get(orgId) ?? this.defaultSettings;
    }

    if (!data) {
      return this.settingsByOrg.get(orgId) ?? this.defaultSettings;
    }

    const settings: AlertSettings = {
      enabled: Boolean(data.enabled),
      riskThreshold: Number(data.risk_threshold ?? this.defaultSettings.riskThreshold),
      criticalFindingsThreshold: Number(
        data.critical_findings_threshold ?? this.defaultSettings.criticalFindingsThreshold,
      ),
      scanCooldownMinutes: Number(
        data.scan_cooldown_minutes ?? this.defaultSettings.scanCooldownMinutes,
      ),
      slackAlertsEnabled: Boolean(data.slack_alerts_enabled),
      alertChannel: String(data.alert_channel ?? this.defaultSettings.alertChannel),
    };

    this.settingsByOrg.set(orgId, settings);
    return settings;
  }

  async updateSettings(
    orgId: string,
    incoming: Partial<AlertSettings>,
  ): Promise<AlertSettings> {
    const current = await this.getSettings(orgId);
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

    const { error } = await this.supabase.client.from('alert_settings').upsert(
      {
        org_id: orgId,
        enabled: next.enabled,
        risk_threshold: next.riskThreshold,
        critical_findings_threshold: next.criticalFindingsThreshold,
        scan_cooldown_minutes: next.scanCooldownMinutes,
        slack_alerts_enabled: next.slackAlertsEnabled,
        alert_channel: next.alertChannel,
      },
      { onConflict: 'org_id' },
    );

    if (error) {
      this.logger.warn(
        `failed to persist alert settings, using memory fallback: ${error.message}`,
      );
    }

    this.settingsByOrg.set(orgId, next);
    return next;
  }

  async evaluate(
    orgId: string,
    currentRiskScore: number,
    criticalFindings: number,
  ): Promise<ThresholdEvaluation> {
    const settings = await this.getSettings(orgId);

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

  async listHistory(orgId: string): Promise<AlertIncident[]> {
    const { data, error } = await this.supabase.client
      .from('alert_incidents')
      .select('*')
      .eq('org_id', orgId)
      .order('updated_at', { ascending: false });

    if (error) {
      this.logger.warn(
        `alert_incidents unavailable, using memory fallback: ${error.message}`,
      );
      const history = this.historyByOrg.get(orgId) ?? [];
      return [...history].sort((a, b) => {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
    }

    const mapped = (data ?? []).map((row) => ({
      id: String(row.id),
      orgId: String(row.org_id),
      reason: String(row.reason),
      status: (row.status as 'open' | 'acknowledged') ?? 'open',
      currentRiskScore: Number(row.current_risk_score ?? 0),
      criticalFindings: Number(row.critical_findings ?? 0),
      duplicateCount: Number(row.duplicate_count ?? 1),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      acknowledgedAt: row.acknowledged_at ? String(row.acknowledged_at) : undefined,
      acknowledgedBy: row.acknowledged_by ? String(row.acknowledged_by) : undefined,
    }));

    this.historyByOrg.set(orgId, mapped);
    return mapped;
  }

  async acknowledgeIncident(
    orgId: string,
    incidentId: string,
    actor: string,
  ): Promise<AlertIncident | null> {
    const now = new Date().toISOString();
    const { data, error } = await this.supabase.client
      .from('alert_incidents')
      .update({
        status: 'acknowledged',
        acknowledged_at: now,
        acknowledged_by: actor,
        updated_at: now,
      })
      .eq('org_id', orgId)
      .eq('id', incidentId)
      .select('*')
      .maybeSingle();

    if (!error && data) {
      return {
        id: String(data.id),
        orgId: String(data.org_id),
        reason: String(data.reason),
        status: 'acknowledged',
        currentRiskScore: Number(data.current_risk_score ?? 0),
        criticalFindings: Number(data.critical_findings ?? 0),
        duplicateCount: Number(data.duplicate_count ?? 1),
        createdAt: String(data.created_at),
        updatedAt: String(data.updated_at),
        acknowledgedAt: data.acknowledged_at ? String(data.acknowledged_at) : undefined,
        acknowledgedBy: data.acknowledged_by ? String(data.acknowledged_by) : undefined,
      };
    }

    if (error) {
      this.logger.warn(
        `failed to acknowledge in DB, using memory fallback: ${error.message}`,
      );
    }

    const incidents = this.historyByOrg.get(orgId) ?? [];
    const incident = incidents.find((item) => item.id === incidentId);
    if (!incident) return null;

    incident.status = 'acknowledged';
    incident.acknowledgedAt = now;
    incident.acknowledgedBy = actor;
    incident.updatedAt = now;
    return incident;
  }

  async recordIncident(
    orgId: string,
    reason: string,
    currentRiskScore: number,
    criticalFindings: number,
  ): Promise<{ incident: AlertIncident; deduplicated: boolean }> {
    const settings = await this.getSettings(orgId);
    const now = new Date();
    const nowIso = now.toISOString();
    const dedupeWindowStart = new Date(
      now.getTime() - settings.scanCooldownMinutes * 60 * 1000,
    ).toISOString();

    const { data: existingRow, error: existingError } = await this.supabase.client
      .from('alert_incidents')
      .select('*')
      .eq('org_id', orgId)
      .eq('reason', reason)
      .eq('status', 'open')
      .gte('updated_at', dedupeWindowStart)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!existingError && existingRow) {
      const nextDupCount = Number(existingRow.duplicate_count ?? 1) + 1;
      const { data: updated } = await this.supabase.client
        .from('alert_incidents')
        .update({
          duplicate_count: nextDupCount,
          current_risk_score: currentRiskScore,
          critical_findings: criticalFindings,
          updated_at: nowIso,
        })
        .eq('id', existingRow.id)
        .eq('org_id', orgId)
        .select('*')
        .maybeSingle();

      if (updated) {
        return {
          incident: {
            id: String(updated.id),
            orgId: String(updated.org_id),
            reason: String(updated.reason),
            status: (updated.status as 'open' | 'acknowledged') ?? 'open',
            currentRiskScore: Number(updated.current_risk_score ?? 0),
            criticalFindings: Number(updated.critical_findings ?? 0),
            duplicateCount: Number(updated.duplicate_count ?? 1),
            createdAt: String(updated.created_at),
            updatedAt: String(updated.updated_at),
            acknowledgedAt: updated.acknowledged_at
              ? String(updated.acknowledged_at)
              : undefined,
            acknowledgedBy: updated.acknowledged_by
              ? String(updated.acknowledged_by)
              : undefined,
          },
          deduplicated: true,
        };
      }
    }

    if (existingError) {
      this.logger.warn(
        `failed to check DB dedup, using memory fallback: ${existingError.message}`,
      );
    }

    const { data: inserted, error: insertError } = await this.supabase.client
      .from('alert_incidents')
      .insert({
        org_id: orgId,
        reason,
        status: 'open',
        current_risk_score: currentRiskScore,
        critical_findings: criticalFindings,
        duplicate_count: 1,
      })
      .select('*')
      .maybeSingle();

    if (!insertError && inserted) {
      return {
        incident: {
          id: String(inserted.id),
          orgId: String(inserted.org_id),
          reason: String(inserted.reason),
          status: 'open',
          currentRiskScore: Number(inserted.current_risk_score ?? 0),
          criticalFindings: Number(inserted.critical_findings ?? 0),
          duplicateCount: Number(inserted.duplicate_count ?? 1),
          createdAt: String(inserted.created_at),
          updatedAt: String(inserted.updated_at),
        },
        deduplicated: false,
      };
    }

    if (insertError) {
      this.logger.warn(
        `failed to insert DB incident, using memory fallback: ${insertError.message}`,
      );
    }

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
