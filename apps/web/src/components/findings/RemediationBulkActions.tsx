'use client';

import { useState } from 'react';
import { Zap, AlertCircle } from 'lucide-react';
import { RemediationApprovalDialog } from './RemediationApprovalDialog';

interface RemediationBulkActionsProps {
  findings: Array<{
    id: string;
    title: string;
    severity: string;
    category: string;
  }>;
  onRemediateBatch: (findingIds: string[]) => void;
}

export function RemediationBulkActions({
  findings,
  onRemediateBatch,
}: RemediationBulkActionsProps) {
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [queuedCount, setQueuedCount] = useState<number>(0);

  // Filter critical/high findings
  const criticalFindings = findings.filter(
    (f) => f.severity === 'critical' || f.severity === 'high'
  );

  if (criticalFindings.length === 0) return null;

  const handleApprove = () => {
    onRemediateBatch(criticalFindings.map((f) => f.id));
    setQueuedCount(criticalFindings.length);
  };

  return (
    <>
      <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-4 sm:p-6">
        <div className="flex items-start gap-4 flex-col sm:flex-row">
          <div className="flex-shrink-0">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">
              {criticalFindings.length} Critical/High Findings Detected
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Submit approval requests for these findings and execute remediation
              after confirmation.
            </p>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 text-xs">
              <div className="bg-white rounded p-2 sm:p-3">
                <div className="font-semibold text-red-600">
                  {criticalFindings.filter((f) => f.severity === 'critical').length}
                </div>
                <div className="text-gray-600">Critical</div>
              </div>
              <div className="bg-white rounded p-2 sm:p-3">
                <div className="font-semibold text-orange-600">
                  {criticalFindings.filter((f) => f.severity === 'high').length}
                </div>
                <div className="text-gray-600">High</div>
              </div>
              <div className="bg-white rounded p-2 sm:p-3">
                <div className="font-semibold text-blue-600">5-10 min</div>
                <div className="text-gray-600">Avg Time</div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={() => setShowApprovalDialog(true)}
            className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm sm:text-base flex items-center justify-center gap-2 flex-shrink-0"
          >
            <Zap className="w-5 h-5" />
            <span>Review Auto-Fix</span>
          </button>
        </div>

        {/* Queue Status */}
        {queuedCount > 0 && (
          <div className="mt-4 pt-4 border-t border-red-200">
            <p className="text-xs text-gray-600">
              Submitted {queuedCount} remediation approval request(s). Track status from
              the remediations list.
            </p>
          </div>
        )}
      </div>

      {/* Approval Dialog */}
      {showApprovalDialog && (
        <RemediationApprovalDialog
          findings={criticalFindings}
          onClose={() => setShowApprovalDialog(false)}
          onApprove={handleApprove}
        />
      )}
    </>
  );
}
