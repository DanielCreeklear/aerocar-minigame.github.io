// Ensure landing styles are bundled by Vite
import './landing.css';

// Keep landing JS tiny: only lazy-load embed if present
document.addEventListener('DOMContentLoaded', () => {
  const el = document.getElementById('spotify-embed');
  if (!el) return;
  const src = el.dataset && el.dataset.src;
  if (!src) return;
  const load = () => {
    const iframe = document.createElement('iframe');
    iframe.src = src;
    iframe.width = '100%';
    iframe.height = '232';
    iframe.frameBorder = '0';
    iframe.loading = 'lazy';
    iframe.allow = 'autoplay; encrypted-media; clipboard-write; fullscreen; picture-in-picture';
    el.innerHTML = '';
    el.appendChild(iframe);
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries, obs) => {
      if (entries.some(e => e.isIntersecting)) {
        load();
        obs.disconnect();
      }
    }, { rootMargin: '200px' });
    io.observe(el);
  } else {
    load();
  }
});

// Ensure the "Jogar" button navigates even if default link is prevented
document.addEventListener('DOMContentLoaded', () => {
  const play = document.getElementById('play-btn');
  if (!play) return;
  play.addEventListener('click', (e) => {
    // If some other handler prevented the default, force navigation
    if (e.defaultPrevented) {
      const href = play.getAttribute('href');
      if (href) window.location.href = href;
    }
    // otherwise let the browser handle it
  });
});
