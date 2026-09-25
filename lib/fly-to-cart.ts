"use client";

/** Compact fly-to-cart: image shrinks to a dot and travels to the header cart icon. */
export function flyImageToCart(
  sourceEl: HTMLElement | null,
  imageUrl?: string | null,
) {
  if (typeof window === "undefined" || !sourceEl) return;

  const cart =
    document.querySelector<HTMLElement>("[data-cart-icon]") ||
    document.querySelector<HTMLElement>('[aria-label^="Cart"]');
  if (!cart) return;

  const from = sourceEl.getBoundingClientRect();
  const to = cart.getBoundingClientRect();
  if (from.width < 4 || from.height < 4) return;

  const startSize = Math.min(56, from.width, from.height);
  const startX = from.left + from.width / 2 - startSize / 2;
  const startY = from.top + from.height / 2 - startSize / 2;
  const endX = to.left + to.width / 2 - 6;
  const endY = to.top + to.height / 2 - 6;

  const ghost = document.createElement("div");
  ghost.setAttribute("aria-hidden", "true");
  Object.assign(ghost.style, {
    position: "fixed",
    left: `${startX}px`,
    top: `${startY}px`,
    width: `${startSize}px`,
    height: `${startSize}px`,
    borderRadius: "12px",
    overflow: "hidden",
    zIndex: "9999",
    pointerEvents: "none",
    boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
    background: "var(--primary, #0ea5e9)",
    backgroundImage: imageUrl ? `url(${imageUrl})` : "none",
    backgroundSize: "cover",
    backgroundPosition: "center",
    willChange: "transform, opacity, border-radius, width, height",
    transition:
      "transform 0.55s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.55s ease, border-radius 0.45s ease, width 0.55s ease, height 0.55s ease",
  } as CSSStyleDeclaration);

  document.body.appendChild(ghost);

  // Force layout then animate
  void ghost.offsetWidth;
  const dx = endX - startX;
  const dy = endY - startY;
  ghost.style.width = "12px";
  ghost.style.height = "12px";
  ghost.style.borderRadius = "9999px";
  ghost.style.transform = `translate(${dx}px, ${dy}px) scale(0.35)`;
  ghost.style.opacity = "0.35";

  cart.classList.add("cart-icon-bump");
  window.setTimeout(() => cart.classList.remove("cart-icon-bump"), 420);

  window.setTimeout(() => {
    ghost.remove();
  }, 600);
}
