'use client';

// Toast UI container — renders stacked toast notifications
// Displays at bottom-right with auto-dismiss based on type

import { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { Toast, registerToastListener } from '@/lib/toast';

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const cleanup = registerToastListener(
      (toast) => {
        setToasts((prev) => [...prev, toast]);

        // Auto-dismiss if duration > 0
        if (toast.duration && toast.duration > 0) {
          const timer = setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== toast.id));
          }, toast.duration);

          return () => clearTimeout(timer);
        }
      },
      (id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }
    );

    return cleanup;
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
}

function ToastItem({ toast }: ToastItemProps) {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      // Actual removal handled by container listener
    }, 200);
  };

  // Type-specific styling and icons
  const config = {
    success: {
      icon: <CheckCircle2 className="w-5 h-5" />,
      bg: 'bg-green-950/80',
      border: 'border-green-700',
      text: 'text-green-100',
      title: 'text-green-200',
    },
    error: {
      icon: <AlertCircle className="w-5 h-5" />,
      bg: 'bg-red-950/80',
      border: 'border-red-700',
      text: 'text-red-100',
      title: 'text-red-200',
    },
    warning: {
      icon: <AlertTriangle className="w-5 h-5" />,
      bg: 'bg-yellow-950/80',
      border: 'border-yellow-700',
      text: 'text-yellow-100',
      title: 'text-yellow-200',
    },
    info: {
      icon: <Info className="w-5 h-5" />,
      bg: 'bg-blue-950/80',
      border: 'border-blue-700',
      text: 'text-blue-100',
      title: 'text-blue-200',
    },
  };

  const c = config[toast.type];

  return (
    <div
      className={`transform transition-all duration-200 ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-96 opacity-0'
      }`}
    >
      <div
        className={`${c.bg} ${c.border} border rounded-lg backdrop-blur-sm shadow-lg p-4 flex items-start gap-3`}
      >
        <div className={c.text}>{c.icon}</div>

        <div className="flex-1 min-w-0">
          <h3 className={`${c.title} font-semibold text-sm`}>{toast.title}</h3>
          {toast.message && (
            <p className={`${c.text} text-xs mt-1 leading-relaxed`}>
              {toast.message}
            </p>
          )}
          {toast.requestId && (
            <p className={`${c.text} text-xs mt-2 opacity-75 font-mono`}>
              ID: {toast.requestId.substring(0, 12)}...
            </p>
          )}

          {/* Action button */}
          {toast.action && (
            <button
              onClick={() => {
                toast.action?.onClick();
                handleDismiss();
              }}
              className={`mt-3 px-3 py-1 rounded text-xs font-semibold ${c.border} border transition-colors hover:opacity-80`}
            >
              {toast.action.label}
            </button>
          )}
        </div>

        <button
          onClick={handleDismiss}
          className={`${c.text} hover:opacity-75 transition-opacity flex-shrink-0 mt-0.5`}
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
