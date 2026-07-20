import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — Grand Host Care Home" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type ProfileRow = { username: string | null; email: string | null; created_at: string };
type Status = "loading" | "unauthorized" | "ready" | "error";

function AdminPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("loading");
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        navigate({ to: "/apply" });
        return;
      }

      const uid = sessionData.session.user.id;
      const { data: ownProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", uid)
        .maybeSingle();

      if (ownProfile?.role !== "admin") {
        setStatus("unauthorized");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("username, email, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        setErrorMsg(error.message);
        setStatus("error");
        return;
      }

      setProfiles((data as ProfileRow[]) ?? []);
      setStatus("ready");
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-cream">
      <div className="relative bg-forest-deep pb-20 pt-32 text-primary-foreground md:pb-24 md:pt-40">
        <Header />
        <div className="container-x mx-auto max-w-5xl">
          <span className="eyebrow text-gold">Admin</span>
          <h1 className="mt-4 font-display text-4xl md:text-5xl">Registered accounts</h1>
        </div>
      </div>

      <section className="container-x mx-auto max-w-5xl py-16">
        {status === "loading" && (
          <p className="text-center text-muted-foreground">Loading…</p>
        )}

        {status === "unauthorized" && (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-border">
            <p className="text-forest-deep">You don't have access to this page.</p>
            <Link to="/" className="mt-4 inline-block font-semibold text-forest underline-offset-4 hover:underline">
              ← Back home
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-border">
            <p className="text-red-700">{errorMsg}</p>
          </div>
        )}

        {status === "ready" && profiles.length === 0 && (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-border">
            <p className="text-muted-foreground">No registered accounts yet.</p>
          </div>
        )}

        {status === "ready" && profiles.length > 0 && (
          <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-forest-deep">
                  <th className="px-6 py-4 font-semibold">Username</th>
                  <th className="px-6 py-4 font-semibold">Email</th>
                  <th className="px-6 py-4 font-semibold">Signed up</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-6 py-4 text-forest-deep">{p.username ?? "—"}</td>
                    <td className="px-6 py-4 text-muted-foreground">{p.email ?? "—"}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
