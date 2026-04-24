import './landing.css';

document.addEventListener("DOMContentLoaded", () => {
  const placeholder = document.getElementById("spotify-embed");
  if (!placeholder) return;

  const src = placeholder.dataset.src;
  if (!src) return;

  // Lazy load via IntersectionObserver
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const iframe = document.createElement("iframe");
          iframe.setAttribute("src", src);
          iframe.setAttribute("width", "100%");
          iframe.setAttribute("height", "232");
          iframe.setAttribute("frameborder", "0");
          iframe.setAttribute("allow", "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture");
          iframe.setAttribute("title", "Podcast - AeroCar");
          iframe.loading = "lazy";
          placeholder.innerHTML = "";
          placeholder.appendChild(iframe);
          obs.disconnect();
        }
      });
    }, { rootMargin: "200px" });
    io.observe(placeholder);
  } else {
    // fallback: immediate load
    const iframe = document.createElement("iframe");
    iframe.src = src;
    iframe.width = "100%";
    iframe.height = "232";
    iframe.frameBorder = "0";
    iframe.setAttribute("allow", "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture");
    iframe.setAttribute("title", "Podcast - AeroCar");
    placeholder.innerHTML = "";
    placeholder.appendChild(iframe);
  }
});
