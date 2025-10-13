export function showToast(toastEl, message) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add('visible');
  if (toastEl._timeoutId) {
    clearTimeout(toastEl._timeoutId);
  }
  toastEl._timeoutId = setTimeout(() => {
    toastEl.classList.remove('visible');
    toastEl._timeoutId = undefined;
  }, 2200);
}
