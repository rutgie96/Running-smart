export function initNavigation(context) {
  const { elements } = context;
  const { viewButtons, views, viewShortcuts } = elements;

  viewButtons.forEach((button) => {
    button.addEventListener('click', () => showView(context, button.dataset.view));
  });

  viewShortcuts.forEach((shortcut) => {
    shortcut.addEventListener('click', () => {
      const { target } = shortcut.dataset;
      if (target) {
        showView(context, target);
      }
    });
  });
}

export function showView(context, viewId) {
  const { elements } = context;
  const { views, viewButtons } = elements;
  if (!views || !views.has(viewId)) return;
  views.forEach((section, id) => {
    section?.classList.toggle('active', id === viewId);
  });
  viewButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.view === viewId);
  });
  scrollToTop();
}

function scrollToTop() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    window.scrollTo(0, 0);
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
