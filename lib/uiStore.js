// lib/uiStore.js
// Tiny framework-free store for toasts + modal dialogs, so any component can call
// toast.success(...) or `await confirmDialog(...)` without wrapping the tree in a
// provider. A single <Toaster/> (rendered once in the admin) subscribes and draws
// them. Replaces browser alert()/confirm()/prompt().

let toasts = [];
let dialog = null;
const toastListeners = new Set();
const dialogListeners = new Set();
let counter = 0;

const emitToasts = () => toastListeners.forEach((l) => l());
const emitDialog = () => dialogListeners.forEach((l) => l());

export const subscribeToasts = (l) => { toastListeners.add(l); return () => toastListeners.delete(l); };
export const getToasts = () => toasts;
export const subscribeDialog = (l) => { dialogListeners.add(l); return () => dialogListeners.delete(l); };
export const getDialog = () => dialog;

function push(message, type) {
    const id = ++counter;
    toasts = [...toasts, { id, message, type }];
    emitToasts();
    setTimeout(() => { toasts = toasts.filter((t) => t.id !== id); emitToasts(); }, 4500);
}
export function dismissToast(id) { toasts = toasts.filter((t) => t.id !== id); emitToasts(); }

export const toast = {
    success: (m) => push(m, 'success'),
    error: (m) => push(m, 'error'),
    info: (m) => push(m, 'info'),
};

// Returns a Promise<boolean>.
export function confirmDialog({ title = 'Please confirm', message = '', confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false } = {}) {
    return new Promise((resolve) => {
        dialog = { kind: 'confirm', title, message, confirmLabel, cancelLabel, danger, resolve };
        emitDialog();
    });
}
// Returns a Promise<string|null> (null = cancelled).
export function promptDialog({ title = '', message = '', defaultValue = '', placeholder = '', confirmLabel = 'OK', required = false, inputType = 'text' } = {}) {
    return new Promise((resolve) => {
        dialog = { kind: 'prompt', title, message, defaultValue, placeholder, confirmLabel, required, inputType, resolve };
        emitDialog();
    });
}
export function resolveDialog(value) {
    if (!dialog) return;
    const { resolve } = dialog;
    dialog = null;
    emitDialog();
    resolve(value);
}
