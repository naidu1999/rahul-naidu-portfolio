(() => {
  const canvas = document.querySelector("#data-sphere");
  const stage = document.querySelector("#visual-stage");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (canvas && stage) {
    const ctx = canvas.getContext("2d", { alpha: true });
    const points = [];
    const count = 210;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let pointerX = 0;
    let pointerY = 0;
    let targetX = 0;
    let targetY = 0;
    let frame = 0;

    for (let i = 0; i < count; i += 1) {
      const y = 1 - (i / (count - 1)) * 2;
      const radius = Math.sqrt(1 - y * y);
      const angle = goldenAngle * i;
      const ripple = 1 + Math.sin(i * 1.71) * 0.035;
      points.push({
        x: Math.cos(angle) * radius * ripple,
        y: y * ripple,
        z: Math.sin(angle) * radius * ripple,
        seed: i * 19.17,
      });
    }

    const resize = () => {
      const box = stage.getBoundingClientRect();
      width = box.width;
      height = box.height;
      pixelRatio = Math.min(window.devicePixelRatio || 1, 1.8);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const project = (point, yaw, pitch, t) => {
      const x1 = point.x * Math.cos(yaw) - point.z * Math.sin(yaw);
      const z1 = point.x * Math.sin(yaw) + point.z * Math.cos(yaw);
      const y2 = point.y * Math.cos(pitch) - z1 * Math.sin(pitch);
      const z2 = point.y * Math.sin(pitch) + z1 * Math.cos(pitch);
      const radius = Math.min(width, height) * 0.355;
      const focal = radius * 2.8;
      const scale = focal / (focal + z2 * radius);
      const pulse = 1 + Math.sin(t * 0.0015 + point.seed) * 0.012;
      return {
        x: width * 0.5 + x1 * radius * scale * pulse,
        y: height * 0.51 + y2 * radius * scale * pulse,
        z: z2,
        scale,
      };
    };

    const draw = (now) => {
      frame = window.requestAnimationFrame(draw);
      ctx.clearRect(0, 0, width, height);
      if (!width || !height) return;

      const time = reduceMotion ? 0 : now;
      const baseYaw = time * 0.00012;
      pointerX += (targetX - pointerX) * 0.035;
      pointerY += (targetY - pointerY) * 0.035;
      const yaw = baseYaw + pointerX * 0.5;
      const pitch = -0.15 + pointerY * 0.24 + Math.sin(time * 0.00023) * 0.07;
      const projected = points.map((point) => project(point, yaw, pitch, time));
      const maxDistance = Math.min(width, height) * 0.19;

      for (let i = 0; i < projected.length; i += 1) {
        const a = projected[i];
        for (let j = i + 1; j < projected.length; j += 1) {
          const b = projected[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distance = Math.hypot(dx, dy);
          if (distance < maxDistance && Math.abs(a.z - b.z) < 0.55) {
            const depth = Math.max(0, (a.z + b.z + 1.35) / 2.35);
            const proximity = 1 - distance / maxDistance;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = "rgba(181, 232, 158, " + (0.025 + proximity * depth * 0.19) + ")";
            ctx.lineWidth = 0.45 + depth * 0.35;
            ctx.stroke();
          }
        }
      }

      const ordered = projected.map((point, index) => ({ ...point, index })).sort((a, b) => a.z - b.z);
      for (const point of ordered) {
        const depth = Math.max(0, Math.min(1, (point.z + 1) / 2));
        const twinkle = reduceMotion ? 0 : (Math.sin(now * 0.0016 + points[point.index].seed) + 1) * 0.5;
        const size = (0.7 + depth * 1.75 + twinkle * 0.65) * point.scale;
        const bright = depth > 0.73 || (point.index % 29 === 0);
        ctx.beginPath();
        ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
        ctx.fillStyle = bright
          ? "rgba(222, 255, 144, " + (0.44 + depth * 0.54) + ")"
          : "rgba(143, 222, 190, " + (0.16 + depth * 0.48) + ")";
        ctx.fill();
        if (bright && size > 1.4) {
          ctx.beginPath();
          ctx.arc(point.x, point.y, size * 3.5, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(208, 255, 112, " + (0.025 + depth * 0.055) + ")";
          ctx.fill();
        }
      }

      if (reduceMotion) window.cancelAnimationFrame(frame);
    };

    stage.addEventListener("pointermove", (event) => {
      const box = stage.getBoundingClientRect();
      targetX = ((event.clientX - box.left) / box.width - 0.5) * 1.35;
      targetY = ((event.clientY - box.top) / box.height - 0.5) * 1.15;
    });
    stage.addEventListener("pointerleave", () => {
      targetX = 0;
      targetY = 0;
    });
    window.addEventListener("resize", resize, { passive: true });
    resize();
    frame = window.requestAnimationFrame(draw);
  }

  const toggle = document.querySelector(".menu-toggle");
  const menu = document.querySelector("#mobile-menu");
  const setMenu = (open) => {
    if (!toggle || !menu) return;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    menu.hidden = !open;
    document.body.classList.toggle("menu-open", open);
  };

  if (toggle && menu) {
    toggle.addEventListener("click", () => {
      setMenu(toggle.getAttribute("aria-expanded") !== "true");
    });
    menu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setMenu(false));
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setMenu(false);
    });
  }

  const projectCards = Array.from(document.querySelectorAll(".project-card[data-categories]"));
  const projectFilters = Array.from(document.querySelectorAll("[data-project-filter]"));
  const visibleProjectCount = document.querySelector("[data-visible-projects]");
  if (projectCards.length && projectFilters.length) {
    const updateProjectFilter = (filter) => {
      let visibleCount = 0;
      projectCards.forEach((card) => {
        const categories = card.dataset.categories.split(/\s+/);
        const visible = filter === "all" || categories.includes(filter);
        card.hidden = !visible;
        if (visible) visibleCount += 1;
      });
      if (visibleProjectCount) visibleProjectCount.textContent = String(visibleCount);
      projectFilters.forEach((button) => {
        const selected = button.dataset.projectFilter === filter;
        button.classList.toggle("is-active", selected);
        button.setAttribute("aria-pressed", String(selected));
      });
    };

    projectFilters.forEach((button) => {
      const filter = button.dataset.projectFilter;
      const filterCount = filter === "all"
        ? projectCards.length
        : projectCards.filter((card) => card.dataset.categories.split(/\s+/).includes(filter)).length;
      const countLabel = button.querySelector("span");
      if (countLabel) countLabel.textContent = String(filterCount);
      button.addEventListener("click", () => updateProjectFilter(filter));
    });
  }

  const revealTargets = document.querySelectorAll(".section-heading, .about-content, .capabilities, .experience-intro, .timeline-item, .work-heading, .project-card, .education-card, .recognition");
  if ("IntersectionObserver" in window && !reduceMotion) {
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          currentObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealTargets.forEach((element, index) => {
      element.classList.add("reveal");
      element.style.transitionDelay = Math.min(index % 4, 3) * 55 + "ms";
      observer.observe(element);
    });
  }
})();
