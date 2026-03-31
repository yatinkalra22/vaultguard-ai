import { Injectable } from '@nestjs/common';

export enum RemediationType {
  REVOKE_CREDENTIALS = 'revoke_credentials',
  PATCH_CONFIGURATION = 'patch_configuration',
  ROTATE_SECRETS = 'rotate_secrets',
  ENABLE_ENCRYPTION = 'enable_encryption',
  REVOKE_PERMISSIONS = 'revoke_permissions',
  UPDATE_POLICY = 'update_policy',
}

export interface RemediationAction {
  findingId: string;
  findingTitle: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: RemediationType;
  description: string;
  estimatedTime: number; // minutes
  riskLevel: 'low' | 'medium' | 'high';
  affectedResources: string[];
  rollbackAvailable: boolean;
}

export interface RemediationResult {
  findingId: string;
  success: boolean;
  message: string;
  appliedAt: string;
  changedResources?: string[];
}

@Injectable()
export class RemediationActionsService {
  /**
   * Get available auto-fix actions for a finding
   */
  getAvailableActions(severity: string, category: string): RemediationAction[] {
    const actions: RemediationAction[] = [];

    // IAM & Access violations
    if (category.includes('IAM') || category.includes('Access')) {
      actions.push({
        findingId: '',
        findingTitle: 'Revoke Exposed Credentials',
        severity: 'critical',
        type: RemediationType.REVOKE_CREDENTIALS,
        description: 'Automatically revoke and rotate all exposed API keys and credentials',
        estimatedTime: 5,
        riskLevel: 'low',
        affectedResources: [],
        rollbackAvailable: true,
      });

      actions.push({
        findingId: '',
        findingTitle: 'Reduce Permission Scope',
        severity: 'high',
        type: RemediationType.REVOKE_PERMISSIONS,
        description: 'Apply least-privilege principle to IAM roles and service accounts',
        estimatedTime: 15,
        riskLevel: 'medium',
        affectedResources: [],
        rollbackAvailable: true,
      });
    }

    // Data Exposure
    if (category.includes('Data Exposure') || category.includes('Secrets')) {
      actions.push({
        findingId: '',
        findingTitle: 'Rotate Secrets',
        severity: 'critical',
        type: RemediationType.ROTATE_SECRETS,
        description: 'Rotate all exposed database passwords, API keys, and connection strings',
        estimatedTime: 10,
        riskLevel: 'low',
        affectedResources: [],
        rollbackAvailable: true,
      });
    }

    // Encryption & Configuration
    if (category.includes('Encryption') || category.includes('Configuration')) {
      actions.push({
        findingId: '',
        findingTitle: 'Enable Encryption',
        severity: 'high',
        type: RemediationType.ENABLE_ENCRYPTION,
        description: 'Enable encryption at rest and in transit for all data stores',
        estimatedTime: 20,
        riskLevel: 'medium',
        affectedResources: [],
        rollbackAvailable: false,
      });

      actions.push({
        findingId: '',
        findingTitle: 'Update Security Policy',
        severity: 'medium',
        type: RemediationType.UPDATE_POLICY,
        description: 'Update configuration to follow security best practices',
        estimatedTime: 30,
        riskLevel: 'low',
        affectedResources: [],
        rollbackAvailable: true,
      });
    }

    return actions;
  }

  /**
   * Execute auto-remediation for a batch of findings
   */
  async executeRemediations(
    findingIds: string[],
    _actionTypes: RemediationType[],
  ): Promise<RemediationResult[]> {
    // Mock execution - in production, would call actual remediation services
    return findingIds.map((findingId, index) => ({
      findingId,
      success: Math.random() > 0.1, // 90% success rate
      message:
        Math.random() > 0.1
          ? `Successfully remediated finding ${findingId}`
          : `Remediation in progress for ${findingId}`,
      appliedAt: new Date().toISOString(),
      changedResources: [`resource-${index + 1}`, `resource-${index + 2}`],
    }));
  }

  /**
   * Validate remediation can be safely applied
   */
  validateRemediationSafety(
    actionType: RemediationType,
    resourceCount: number,
  ): { safe: boolean; warnings: string[] } {
    const warnings: string[] = [];

    if (resourceCount > 10) {
      warnings.push(
        `This action affects ${resourceCount} resources. Recommend testing in staging first.`,
      );
    }

    if (
      actionType === RemediationType.REVOKE_CREDENTIALS &&
      resourceCount > 5
    ) {
      warnings.push(
        'Revoking credentials affects dependent services. Ensure graceful key rotation configured.',
      );
    }

    return {
      safe: warnings.length === 0,
      warnings,
    };
  }

  /**
   * Get remediation progress and status
   */
  getRemediationProgress(batchId: string) {
    return {
      batchId,
      totalFindings: 5,
      successCount: 3,
      failureCount: 0,
      inProgressCount: 2,
      progress: 60,
      estimatedTimeRemaining: 5, // minutes
    };
  }
}
