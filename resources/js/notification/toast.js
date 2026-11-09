import '../shared/toast.js';
export const showToast = (message, type = 'success') => window.TmisToast.show(message, type);
