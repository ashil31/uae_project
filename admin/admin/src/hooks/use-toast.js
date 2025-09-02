// hooks/use-toast.ts
import toast from 'react-hot-toast';

export function useToast() {
  return {
    toast: (message) => toast(message),
    dismiss: toast.dismiss,
    success: (message) => toast.success(message),
    error: (message) => toast.error(message),
    promise: toast.promise,
    // Add any other methods you need from your original implementation
    loading: (message) => toast.loading(message),
    custom: (message, options) => toast(message, options),
  };
}