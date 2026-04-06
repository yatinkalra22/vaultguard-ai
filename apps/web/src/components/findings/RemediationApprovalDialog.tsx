'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { CheckCircle2, AlertTriangle, Loader } from 'lucide-react';
import { showSuccessToast, showErrorToast, showWarningToast } from '@/lib/api';
import type { FindingSeverity } from '@/types/domain';

interface ApprovalDialogProps {
  findings: Array<{
    id: string;
    title: string;
    severity: FindingSeverity;
    category: string;
  }>;
  onClose: () => void;
  onApprove: () => void;
}

interface BatchApproveResponse {
  status: 'queued' | 'partial' | 'skipped';
  requested: number;
  queued: number;
  failedCount: number;
  skippedCount: number;
}

export function RemediationApprovalDialog({
  findings,
  onClose,
  onApprove,
}: ApprovalDialogProps) {
  const [selectedFindings, setSelectedFindings] = useState<Set<string>>(
    new Set(findings.map((f) => f.id))
  );
  const [approving, setApproving] = useState(false);

  const handleSelectFinding = async (findingId: string) => {
    const newSelected = new Set(selectedFindings);
    if (newSelected.has(findingId)) {
      newSelected.delete(findingId);
    } else {
      newSelected.add(findingId);
    }
    setSelectedFindings(newSelected);
  };

  const handleApproveRemediations = async () => {
    if (selectedFindings.size === 0) return;

    setApproving(true);
    try {
      const idempotencyKey =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? `remediation-batch-${crypto.randomUUID()}`
          : `remediation-batch-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

      const result = await api.post<BatchApproveResponse>(
        'remediations/batch-approve',
        {
          findingIds: Array.from(selectedFindings),
        },
        {
          headers: {
            'x-idempotency-key': idempotencyKey,
          },
        },
      );

      if (result.status === 'skipped') {
        showWarningToast('No eligible open findings to queue for remediation');
        onClose();
        return;
      }

      showSuccessToast(
        `Approval requests submitted: ${result.queued}/${result.requested}`,
        undefined,
        4000,
      );

      onApprove();
      onClose();
    } catch (error: unknown) {
      showErrorToast(error, 'Failed to approve remediations');
    } finally {
      setApproving(false);
    }
  };

  const severityColor = (severity: FindingSeverity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-green-500/20 text-green-400 border-green-500/30';
    }
  };

  const riskColor = (risk: string) => {
    switch (risk) {
      case 'high':
        return 'text-red-400';
      case 'medium':
        return 'text-yellow-400';
      default:
        return 'text-green-400';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-border">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-4 sm:p-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-foreground">
              Review Remediation Actions
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedFindings.size} of {findings.length} findings selected
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-2xl"
          >
            ×
          </button>
        </div>

        {/* Findings List */}
        <div className="divide-y divide-border">
          {findings.map((finding) => (
            <div
              key={finding.id}
              className="p-3 sm:p-4 hover:bg-accent/50 cursor-pointer transition"
              onClick={() => handleSelectFinding(finding.id)}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedFindings.has(finding.id)}
                  onChange={() => handleSelectFinding(finding.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-1 w-5 h-5 rounded border-border text-primary cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground text-sm sm:text-base flex-1">
                      {finding.title}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${severityColor(
                        finding.severity
                      )}`}
                    >
                      {finding.severity.charAt(0).toUpperCase() +
                        finding.severity.slice(1)}
                    </span>
                  </div>

                  {/* Remediation Action Preview */}
                  <div className="mt-2 p-2 bg-primary/10 rounded space-y-1 text-xs sm:text-sm">
                    <p className="text-muted-foreground">
                      <span className="font-semibold text-foreground">Recommended Fix:</span> Auto-revoke
                      exposed credentials and rotate secrets
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-muted-foreground">
                      <span>⏱ 5-10 min</span>
                      <span className={`font-semibold ${riskColor('low')}`}>
                        Low Risk
                      </span>
                      <span>↩ Rollback available</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Safety Warnings */}
        {selectedFindings.size > 5 && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 sm:p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-300">
              <p className="font-semibold">Bulk remediation notice</p>
              <p className="mt-1">
                You are remediating {selectedFindings.size} findings. Ensure
                adequate testing in staging before production deployment.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="sticky bottom-0 bg-card border-t border-border px-4 sm:px-6 py-3 sm:py-4 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-muted-foreground border border-border rounded-lg hover:bg-accent/50 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleApproveRemediations}
            disabled={selectedFindings.size === 0 || approving}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 text-sm font-medium flex items-center gap-2"
          >
            {approving ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Approving...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Approve & Auto-Fix ({selectedFindings.size})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
