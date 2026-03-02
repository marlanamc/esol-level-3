// Main JavaScript utilities

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
  // Hide decorative icons from screen readers
  document.querySelectorAll('[data-lucide]').forEach(icon => {
    icon.setAttribute('aria-hidden', 'true');
    icon.setAttribute('focusable', 'false');
  });

  // Make each slide a named region for screen reader navigation
  document.querySelectorAll('.slide').forEach((slide, index) => {
    slide.setAttribute('role', 'region');
    slide.setAttribute('tabindex', '-1');

    const heading = slide.querySelector('h1, h2, h3');
    if (heading) {
      if (!heading.id) {
        heading.id = `slide-heading-${index + 1}`;
      }
      slide.setAttribute('aria-labelledby', heading.id);
    } else {
      slide.setAttribute('aria-label', `Slide ${index + 1}`);
    }
  });

  console.log('ESOL Teacher Resources - Main JS loaded');
});





