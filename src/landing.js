
import './landing.css';






const playBtn = document.getElementById('play-btn');
if (playBtn) {
  playBtn.href = import.meta.env.BASE_URL + 'play/';
}

// Ensure the Spotify link points to the episode URL (keeps HTML and JS consistent)
const spotifyLink = document.getElementById('spotify-link');
if (spotifyLink) {
  // canonical episode URL (without extra querystring params)
  spotifyLink.href = 'https://open.spotify.com/episode/5SRXstwZdXWuUTi51n6bDD';
}


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
