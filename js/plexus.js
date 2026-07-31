/**
 * QAlify Blog - Muted Header Plexus Animation
 * Ultra-lightweight 2D Canvas plexus background.
 * Optimized for performance: low node count, IntersectionObserver auto-pause,
 * visibility change listeners, and retina scaling.
 */

(function () {
  'use strict';

  function initHeaderPlexus() {
    const canvas = document.getElementById('headerPlexus');
    if (!canvas) return;

    const header = canvas.closest('.header') || canvas.parentElement;
    if (!header) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId = null;
    let width = 0;
    let height = 0;
    let particles = [];
    let isVisible = true;

    // Mouse tracking state
    const mouse = {
      x: -1000,
      y: -1000,
      radius: 130,
      active: false
    };

    // Color definitions matching the site design system
    const colorIndigo = { r: 99, g: 102, b: 241 }; // #6366f1
    const colorCyan = { r: 6, g: 182, b: 212 };   // #06b6d4

    function resize() {
      const rect = header.getBoundingClientRect();
      width = rect.width;
      height = rect.height;

      if (width === 0 || height === 0) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';

      ctx.resetTransform();
      ctx.scale(dpr, dpr);

      createParticles();
    }

    function createParticles() {
      // Dynamic count based on header surface area (lightweight: max 40 desktop, 18 mobile)
      const count = Math.max(18, Math.min(42, Math.floor((width * height) / 3200)));

      particles = [];
      for (let i = 0; i < count; i++) {
        const isCyan = i % 3 === 0;
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          radius: Math.random() * 1.2 + 1.1, // 1.1px to 2.3px radius
          color: isCyan ? colorCyan : colorIndigo,
          baseAlpha: Math.random() * 0.25 + 0.175 // Brighter alpha: 0.175 to 0.425 (+15%)
        });
      }
    }

    function update() {
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        // Bounce off canvas boundaries
        if (p.x < 0) { p.x = 0; p.vx *= -1; }
        if (p.x > width) { p.x = width; p.vx *= -1; }
        if (p.y < 0) { p.y = 0; p.vy *= -1; }
        if (p.y > height) { p.y = height; p.vy *= -1; }

        // Gentle interactive mouse repulsion
        if (mouse.active) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < mouse.radius && dist > 0) {
            const force = (mouse.radius - dist) / mouse.radius;
            p.x += (dx / dist) * force * 0.5;
            p.y += (dy / dist) * force * 0.5;
          }
        }
      }
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);

      const maxDist = 115;
      const maxDistSq = maxDist * maxDist;

      // Draw connecting lines between close particles
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < maxDistSq) {
            const dist = Math.sqrt(distSq);
            // Alpha fades out with distance (max line opacity ~ 0.185, +15% brighter)
            const lineAlpha = (1 - dist / maxDist) * 0.185;

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(${p1.color.r}, ${p1.color.g}, ${p1.color.b}, ${lineAlpha.toFixed(3)})`;
            ctx.lineWidth = 0.85;
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.baseAlpha})`;
        ctx.fill();
      }
    }

    function renderLoop() {
      if (!isVisible) return;
      update();
      draw();
      animFrameId = requestAnimationFrame(renderLoop);
    }

    function startLoop() {
      if (!animFrameId) {
        animFrameId = requestAnimationFrame(renderLoop);
      }
    }

    function stopLoop() {
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
    }

    // Window & Mouse Listeners
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(resize, 100);
    });

    header.addEventListener('mousemove', (e) => {
      const rect = header.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    });

    header.addEventListener('mouseleave', () => {
      mouse.active = false;
    });

    // Pause rendering when tab is inactive
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        isVisible = false;
        stopLoop();
      } else {
        isVisible = true;
        startLoop();
      }
    });

    // IntersectionObserver to pause rendering when header is out of screen
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            isVisible = true;
            startLoop();
          } else {
            isVisible = false;
            stopLoop();
          }
        });
      }, { threshold: 0.05 });
      observer.observe(header);
    }

    // Initialize layout and animation loop
    resize();
    startLoop();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeaderPlexus);
  } else {
    initHeaderPlexus();
  }
})();
