"use client";

const FLY_MS = 1100;
const DOT_BROWN = "#3d2314";

/** Compact fly-to-cart: image shrinks to a deep-brown dot and travels to the header cart. */
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
  const endDot = 14;
  const endX = to.left + to.width / 2 - endDot / 2;
  const endY = to.top + to.height / 2 - endDot / 2;

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
    boxShadow: "0 8px 24px rgba(61,35,20,0.35)",
    background: DOT_BROWN,
    backgroundImage: imageUrl ? `url(${imageUrl})` : "none",
    backgroundSize: "cover",
    backgroundPosition: "center",
    willChange: "transform, opacity, border-radius, width, height",
    transition: [
      `transform ${FLY_MS}ms cubic-bezier(0.22, 0.8, 0.28, 1)`,
      `opacity ${FLY_MS}ms ease`,
      `border-radius ${FLY_MS * 0.85}ms ease`,
      `width ${FLY_MS}ms ease`,
      `height ${FLY_MS}ms ease`,
      `background ${FLY_MS * 0.5}ms ease`,
      `box-shadow ${FLY_MS}ms ease`,
    ].join(", "),
  } as CSSStyleDeclaration);

  document.body.appendChild(ghost);

  void ghost.offsetWidth;
  const dx = endX - startX;
  const dy = endY - startY;
  ghost.style.width = `${endDot}px`;
  ghost.style.height = `${endDot}px`;
  ghost.style.borderRadius = "9999px";
  ghost.style.backgroundImage = "none";
  ghost.style.background = DOT_BROWN;
  ghost.style.boxShadow = "0 2px 8px rgba(61,35,20,0.55)";
  ghost.style.transform = `translate(${dx}px, ${dy}px)`;
  ghost.style.opacity = "1";

  cart.classList.add("cart-icon-bump");
  window.setTimeout(() => cart.classList.remove("cart-icon-bump"), FLY_MS + 80);

  window.setTimeout(() => {
    ghost.remove();
  }, FLY_MS + 80);
}
