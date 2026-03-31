'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { CheckCircle2, AlertTriangle, Loader } from 'lucide-react';
import { showSuccessToast, showErrorToast } from '@/lib/api';

interface ApprovalDialogProps {
  findings: Array<{
    id: string;
    title: string;
    severity: string;
    category: string;
  }>;
  onClose: () => void;
  onApprove: () => void;
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

  // Fetch available remediation actions
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
      await api.post('/remediations/batch-approve', {
        findingIds: Array.from(selectedFindings),
      });

        showSuccessToast(`Remediations approved: ${selectedFindings.size} findings queued for auto-fix`, undefined, 4000);

      onApprove();
      onClose();
    } catch (error) {
      showErrorToast(error, 'Failed to approve remediations');
    } finally {
      setApproving(false);
    }
  };

  const severityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-green-100 text-green-800 border-green-300';
    }
  };

  const riskColor = (risk: string) => {
    switch (risk) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      default:
        return 'text-green-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">
              Review Remediation Actions
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {selectedFindings.size} of {findings.length} findings selected
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Findings List */}
        <div className="divide-y divide-gray-200">
          {findings.map((finding) => (
            <div
              key={finding.id}
              className="p-3 sm:p-4 hover:bg-gray-50 cursor-pointer transition"
              onClick={() => handleSelectFinding(finding.id)}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedFindings.has(finding.id)}
                  onChange={() => handleSelectFinding(finding.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-1 w-5 h-5 rounded border-gray-300 text-blue-600 cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900 text-sm sm:text-base flex-1">
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
                  <div className="mt-2 p-2 bg-blue-50 rounded space-y-1 text-xs sm:text-sm">
                    <p className="text-gray-700">
                      <span className="font-semibold">Recommended Fix:</span> Auto-revoke
                      exposed credentials and rotate secrets
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-gray-600">
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
          <div className="mx-4 sm:mx-6 mt-4 p-3 sm:p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-semibold">Bulk remediation notice</p>
              <p className="mt-1">
                You are remediating {selectedFindings.size} findings. Ensure
                adequate testing in staging before production deployment.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleApproveRemediations}
            disabled={selectedFindings.size === 0 || approving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-sm font-medium flex items-center gap-2"
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
