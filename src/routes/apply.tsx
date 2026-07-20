import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";

export const Route = createFileRoute("/apply")({
  head: () => ({
    meta: [
      { title: "Application Portal — Grand Host Care Home" },
      { name: "description", content: "Create your account to apply for a role at Grand Host Care Home in Rotterdam." },
    ],
  }),
  component: ApplyPage,
});

function ApplyPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username },
            emailRedirectTo: `${window.location.origin}/portal`,
          },
        });
        if (error) throw error;
        if (!data.session) {
          // email confirmation required — try immediate sign-in
          const { error: sErr } = await supabase.auth.signInWithPassword({ email, password });
          if (sErr) throw sErr;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/portal" });
    } catch (e: any) {
      setErr(e?.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="relative bg-forest-deep pb-24 pt-32 text-primary-foreground md:pb-32 md:pt-40">
        <Header />
        <div className="container-x mx-auto max-w-3xl text-center">
          <span className="eyebrow text-gold">Application portal</span>
          <h1 className="mt-4 font-display text-4xl leading-tight md:text-5xl">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-4 text-primary-foreground/80">
            {mode === "signup"
              ? "Sign up to start your application."
              : "Sign in to continue your application."}
          </p>
        </div>
      </div>

      <div className="container-x mx-auto mt-8 max-w-md pb-24">
        <form onSubmit={submit} className="rounded-2xl bg-cream p-8 shadow-xl ring-1 ring-border">
          {mode === "signup" && (
            <label className="mb-4 block">
              <span className="mb-1 block text-sm font-medium text-forest-deep">Username</span>
              <input
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm text-forest-deep placeholder:text-muted-foreground outline-none focus:border-forest"
              />
            </label>
          )}
          <label className="mb-4 block">
            <span className="mb-1 block text-sm font-medium text-forest-deep">Email</span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm text-forest-deep placeholder:text-muted-foreground outline-none focus:border-forest"
            />
          </label>
          <label className="mb-6 block">
            <span className="mb-1 block text-sm font-medium text-forest-deep">Password</span>
            <input
              required
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm text-forest-deep placeholder:text-muted-foreground outline-none focus:border-forest"
            />
          </label>

          {err && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-forest px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-forest-deep disabled:opacity-60"
          >
            {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signup" ? "Already have an account?" : "New to Grand Host?"}{" "}
            <button
              type="button"
              onClick={() => { setErr(null); setMode(mode === "signup" ? "signin" : "signup"); }}
              className="font-semibold text-forest underline-offset-4 hover:underline"
            >
              {mode === "signup" ? "Sign in" : "Create an account"}
            </button>
          </p>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/careers" className="hover:underline">← Back to Careers</Link>
        </p>
      </div>
    </div>
  );
}
