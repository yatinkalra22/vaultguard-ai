// Toast service — provides centralized toast notifications
// Supports success, error, warning, info types with optional action buttons

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number; // ms, 0 = manual dismiss
  requestId?: string; // for error correlation
}

// Global toast manager — can be called from anywhere
let toastListeners: ((toast: Toast) => void)[] = [];
let removeListeners: ((id: string) => void)[] = [];

export function registerToastListener(
  onAdd: (toast: Toast) => void,
  onRemove: (id: string) => void
) {
  toastListeners.push(onAdd);
  removeListeners.push(onRemove);

  // Cleanup function
  return () => {
    toastListeners = toastListeners.filter((l) => l !== onAdd);
    removeListeners = removeListeners.filter((l) => l !== onRemove);
  };
}

function generateId() {
  return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const toast = {
  success: (
    title: string,
    options?: { message?: string; duration?: number; action?: Toast['action'] }
  ) => {
    const t: Toast = {
      id: generateId(),
      type: 'success',
      title,
      message: options?.message,
      action: options?.action,
      duration: options?.duration ?? 3000,
    };
    toastListeners.forEach((listener) => listener(t));
  },

  error: (
    title: string,
    options?: {
      message?: string;
      duration?: number;
      action?: Toast['action'];
      requestId?: string;
    }
  ) => {
    const t: Toast = {
      id: generateId(),
      type: 'error',
      title,
      message: options?.message,
      action: options?.action,
      duration: options?.duration ?? 5000,
      requestId: options?.requestId,
    };
    toastListeners.forEach((listener) => listener(t));
  },

  warning: (
    title: string,
    options?: { message?: string; duration?: number; action?: Toast['action'] }
  ) => {
    const t: Toast = {
      id: generateId(),
      type: 'warning',
      title,
      message: options?.message,
      action: options?.action,
      duration: options?.duration ?? 4000,
    };
    toastListeners.forEach((listener) => listener(t));
  },

  info: (
    title: string,
    options?: { message?: string; duration?: number; action?: Toast['action'] }
  ) => {
    const t: Toast = {
      id: generateId(),
      type: 'info',
      title,
      message: options?.message,
      action: options?.action,
      duration: options?.duration ?? 3000,
    };
    toastListeners.forEach((listener) => listener(t));
  },

  dismiss: (id: string) => {
    removeListeners.forEach((listener) => listener(id));
  },
};
