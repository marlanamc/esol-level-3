// Slide Presentation JavaScript

(function() {
  'use strict';

  let currentSlideIndex = 0;
  let slides = [];
  let totalSlides = 0;

  // Initialize slides
  function initSlides() {
    slides = Array.from(document.querySelectorAll('.slide'));
    totalSlides = slides.length;

    if (totalSlides === 0) {
      console.warn('No slides found');
      return;
    }

    // Update total slides counter
    const totalSlidesSpan = document.getElementById('total-slides');
    if (totalSlidesSpan) {
      totalSlidesSpan.textContent = totalSlides;
    }

    // Set up event listeners
    setupEventListeners();

    // Show first slide
    showSlide(0);
  }

  // Show specific slide
  function showSlide(index) {
    if (index < 0) {
      currentSlideIndex = 0;
    } else if (index >= totalSlides) {
      currentSlideIndex = totalSlides - 1;
    } else {
      currentSlideIndex = index;
    }

    // Hide all slides
    slides.forEach(slide => {
      slide.classList.remove('active');
    });

    // Show current slide
    if (slides[currentSlideIndex]) {
      slides[currentSlideIndex].classList.add('active');
    }

    // Update UI
    updateSlideCounter();
    updateProgressBar();
    updateButtonStates();
    scrollToTop();
  }

  // Go to next slide
  function nextSlide() {
    if (currentSlideIndex < totalSlides - 1) {
      showSlide(currentSlideIndex + 1);
    }
  }

  // Go to previous slide
  function prevSlide() {
    if (currentSlideIndex > 0) {
      showSlide(currentSlideIndex - 1);
    }
  }

  // Go to first slide
  function firstSlide() {
    showSlide(0);
  }

  // Go to last slide
  function lastSlide() {
    showSlide(totalSlides - 1);
  }

  // Update slide counter
  function updateSlideCounter() {
    const currentSlideSpan = document.getElementById('current-slide');
    if (currentSlideSpan) {
      currentSlideSpan.textContent = currentSlideIndex + 1;
    }
  }

  // Update progress bar
  function updateProgressBar() {
    const progressBar = document.getElementById('progress-bar');
    if (progressBar && totalSlides > 0) {
      const progress = ((currentSlideIndex + 1) / totalSlides) * 100;
      progressBar.style.width = progress + '%';
    }
  }

  // Update button states
  function updateButtonStates() {
    const prevBtn = document.getElementById('prev-slide');
    const nextBtn = document.getElementById('next-slide');

    if (prevBtn) {
      prevBtn.disabled = currentSlideIndex === 0;
    }
    if (nextBtn) {
      nextBtn.disabled = currentSlideIndex === totalSlides - 1;
    }
  }

  // Scroll to top
  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Setup event listeners
  function setupEventListeners() {
    // Previous button
    const prevBtn = document.getElementById('prev-slide');
    if (prevBtn) {
      prevBtn.addEventListener('click', prevSlide);
    }

    // Next button
    const nextBtn = document.getElementById('next-slide');
    if (nextBtn) {
      nextBtn.addEventListener('click', nextSlide);
    }

    // Exit button
    const exitBtn = document.getElementById('exit-presentation');
    if (exitBtn) {
      exitBtn.addEventListener('click', function() {
        // Try to go back, or go to index.html
        if (window.history.length > 1) {
          window.history.back();
        } else {
          // Determine correct path based on current location
          const currentPath = window.location.pathname;
          if (currentPath.includes('/activities/present-perfect/')) {
            window.location.href = '../../index.html';
          } else if (currentPath.includes('/activities/')) {
            window.location.href = '../index.html';
          } else {
            window.location.href = 'index.html';
          }
        }
      });
    }

    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
      // Don't interfere with input fields
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      switch(e.key) {
        case 'ArrowRight':
        case ' ':
          e.preventDefault();
          nextSlide();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          prevSlide();
          break;
        case 'Home':
          e.preventDefault();
          firstSlide();
          break;
        case 'End':
          e.preventDefault();
          lastSlide();
          break;
        case 'Escape':
          e.preventDefault();
          if (exitBtn) exitBtn.click();
          break;
        case '?':
          e.preventDefault();
          toggleKeyboardShortcuts();
          break;
        case 'f':
        case 'F':
          // Fullscreen toggle
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
              console.log('Error attempting to enable fullscreen:', err);
            });
          } else {
            document.exitFullscreen();
          }
          break;
      }
    });

    // Touch/swipe support for mobile
    let touchStartX = 0;
    let touchEndX = 0;

    document.addEventListener('touchstart', function(e) {
      touchStartX = e.changedTouches[0].screenX;
    });

    document.addEventListener('touchend', function(e) {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    });

    function handleSwipe() {
      const swipeThreshold = 50;
      const diff = touchStartX - touchEndX;

      if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
          // Swipe left - next slide
          nextSlide();
        } else {
          // Swipe right - previous slide
          prevSlide();
        }
      }
    }
  }

  // Toggle keyboard shortcuts help
  function toggleKeyboardShortcuts() {
    const shortcuts = document.getElementById('keyboard-shortcuts');
    if (shortcuts) {
      const isVisible = shortcuts.style.display !== 'none';
      shortcuts.style.display = isVisible ? 'none' : 'block';
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSlides);
  } else {
    initSlides();
  }

  // Export functions for global access if needed
  window.slidePresentation = {
    next: nextSlide,
    prev: prevSlide,
    goTo: showSlide,
    first: firstSlide,
    last: lastSlide,
    getCurrentIndex: () => currentSlideIndex,
    getTotalSlides: () => totalSlides
  };

})();

