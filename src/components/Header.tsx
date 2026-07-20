import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";

const links: Array<[string, string, "route" | "hash"]> = [
  ["Home", "/", "route"],
  ["About Us", "/about", "route"],
  ["Our Care", "/our-care", "route"],
  ["Life at Grand Host", "#life", "hash"],
  ["Careers", "/careers", "route"],
  ["Application portal", "/apply", "route"],
  ["Contact", "#visit", "hash"],
];

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-3">
      <span className="grid h-10 w-10 place-items-center rounded-full border border-gold text-gold">
        <span className="font-display text-lg leading-none">G</span>
      </span>
      <span className="leading-tight">
        <span className="block font-display text-lg text-primary-foreground">Grand Host</span>
        <span className="block text-[10px] tracking-[0.25em] uppercase text-primary-foreground/80">
          Care Home · Rotterdam
        </span>
      </span>
    </Link>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="absolute top-0 left-0 right-0 z-30">
      <div className="container-x mx-auto flex max-w-7xl items-center justify-between py-6">
        <Logo />

        {!open && (
          <nav className="hidden items-center gap-8 lg:flex">
            {links.map(([label, href, kind]) =>
              kind === "route" ? (
                <Link
                  key={href}
                  to={href}
                  className="text-sm font-medium text-primary-foreground/90 transition hover:text-gold"
                  activeProps={{ className: "text-gold" }}
                >
                  {label}
                </Link>
              ) : (
                <Link
                  key={href}
                  to="/"
                  hash={href.replace("#", "")}
                  className="text-sm font-medium text-primary-foreground/90 transition hover:text-gold"
                  activeProps={{ className: "text-gold" }}
                >
                  {label}
                </Link>
              )
            )}
          </nav>
        )}

        <button
          type="button"
          aria-label="Menu"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/30 px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary-foreground/10 lg:px-5 lg:py-2.5"
        >
          <Menu size={18} strokeWidth={2} />
          <span>Menu</span>
        </button>
      </div>

      {/* Mobile / full-screen menu */}
      {open && (
        <div className="fixed inset-0 z-50 bg-forest-deep/98 backdrop-blur-sm">
          <div className="container-x mx-auto flex max-w-7xl items-center justify-between py-6">
            <Logo />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/30 px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary-foreground/10"
            >
              <X size={18} strokeWidth={2} />
              Close
            </button>
          </div>

          <nav className="container-x mx-auto mt-10 flex max-w-7xl flex-col gap-6">
            {links.map(([label, href, kind]) =>
              kind === "route" ? (
                <Link
                  key={href}
                  to={href}
                  onClick={() => setOpen(false)}
                  className="font-display text-3xl text-primary-foreground transition hover:text-gold md:text-5xl"
                  activeProps={{ className: "text-gold" }}
                >
                  {label}
                </Link>
              ) : (
                <Link
                  key={href}
                  to="/"
                  hash={href.replace("#", "")}
                  onClick={() => setOpen(false)}
                  className="font-display text-3xl text-primary-foreground transition hover:text-gold md:text-5xl"
                  activeProps={{ className: "text-gold" }}
                >
                  {label}
                </Link>
              )
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
