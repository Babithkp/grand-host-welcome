import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { Header } from "@/components/Header";
import { getSessionFn } from "@/server-functions/auth";
import {
  getAdminDashboardFn,
  updateApplicationStatusFn,
  getAdminDocumentUrlFn,
} from "@/server-functions/admin";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — Grand Host Care Home" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type DashboardRow = Awaited<ReturnType<typeof getAdminDashboardFn>>[number];
type Status = "loading" | "unauthorized" | "ready" | "error";

function statusLabel(row: DashboardRow): string {
  if (!row.application) return "Not started";
  if (!row.application.submitted) return "In progress";
  if (row.application.status === "approved") return "Approved";
  if (row.application.status === "rejected") return "Rejected";
  return "Pending";
}

function statusClasses(row: DashboardRow): string {
  const label = statusLabel(row);
  if (label === "Approved") return "bg-green-100 text-green-800";
  if (label === "Rejected") return "bg-red-100 text-red-800";
  if (label === "Pending") return "bg-gold/20 text-forest-deep";
  if (label === "In progress") return "bg-blue-100 text-blue-800";
  return "bg-muted text-muted-foreground";
}

function AdminPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("loading");
  const [rows, setRows] = useState<DashboardRow[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const session = await getSessionFn();
      if (!session) {
        navigate({ to: "/apply" });
        return;
      }
      if (session.role !== "admin") {
        setStatus("unauthorized");
        return;
      }

      try {
        const data = await getAdminDashboardFn();
        setRows(data);
        setStatus("ready");
      } catch (err: any) {
        setErrorMsg(err?.message ?? "Something went wrong");
        setStatus("error");
      }
    })();
  }, [navigate]);

  async function viewDocument(documentId: string) {
    setActionErr(null);
    try {
      const { url } = await getAdminDocumentUrlFn({ data: { documentId } });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      setActionErr(err?.message ?? "Failed to open document.");
    }
  }

  async function decide(userId: string, decision: "approved" | "rejected") {
    setActionErr(null);
    setBusyUserId(userId);
    try {
      await updateApplicationStatusFn({ data: { userId, status: decision } });
      setRows((prev) =>
        prev.map((row) =>
          row.userId === userId && row.application
            ? { ...row, application: { ...row.application, status: decision } }
            : row,
        ),
      );
    } catch (err: any) {
      setActionErr(err?.message ?? "Failed to update status.");
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="relative bg-forest-deep pb-20 pt-32 text-primary-foreground md:pb-24 md:pt-40">
        <Header />
        <div className="container-x mx-auto max-w-6xl">
          <span className="eyebrow text-gold">Admin</span>
          <h1 className="mt-4 font-display text-4xl md:text-5xl">Applications</h1>
        </div>
      </div>

      <section className="container-x mx-auto max-w-6xl py-16">
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

        {status === "ready" && rows.length === 0 && (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-border">
            <p className="text-muted-foreground">No registered accounts yet.</p>
          </div>
        )}

        {status === "ready" && rows.length > 0 && (
          <>
            {actionErr && (
              <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{actionErr}</p>
            )}
            <div className="space-y-4">
              {rows.map((row) => (
                <div key={row.userId} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-border">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="grid gap-1 text-sm">
                      <p>
                        <span className="font-medium text-forest-deep">Username: </span>
                        {row.username}
                      </p>
                      <p>
                        <span className="font-medium text-forest-deep">Email: </span>
                        {row.email}
                      </p>
                      <p>
                        <span className="font-medium text-forest-deep">Date: </span>
                        {new Date(row.signedUpAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(row)}`}
                    >
                      {statusLabel(row)}
                    </span>
                  </div>

                  {row.application && (
                    <div className="mt-4 grid gap-2 border-t border-border pt-4 text-sm text-muted-foreground md:grid-cols-2">
                      <p>
                        <span className="font-medium text-forest-deep">Name: </span>
                        {row.application.first_name} {row.application.last_name}
                      </p>
                      <p>
                        <span className="font-medium text-forest-deep">Position: </span>
                        {row.application.position ?? "—"}
                      </p>
                      <p>
                        <span className="font-medium text-forest-deep">Phone: </span>
                        {row.application.phone ?? "—"}
                      </p>
                      <p>
                        <span className="font-medium text-forest-deep">Country: </span>
                        {row.application.country ?? "—"}
                      </p>
                    </div>
                  )}

                  {row.documents.length > 0 && (
                    <div className="mt-4 border-t border-border pt-4">
                      <p className="mb-2 text-sm font-medium text-forest-deep">Documents</p>
                      <ul className="space-y-1">
                        {row.documents.map((d) => (
                          <li key={d.id}>
                            <button
                              onClick={() => viewDocument(d.id)}
                              className="inline-flex items-center gap-2 text-sm text-forest hover:underline"
                            >
                              <FileText size={14} />
                              {d.file_name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {row.application?.submitted && statusLabel(row) === "Pending" && (
                    <div className="mt-4 flex gap-3 border-t border-border pt-4">
                      <button
                        onClick={() => decide(row.userId, "approved")}
                        disabled={busyUserId === row.userId}
                        className="rounded-full bg-forest px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-forest-deep disabled:opacity-60"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => decide(row.userId, "rejected")}
                        disabled={busyUserId === row.userId}
                        className="rounded-full border border-red-300 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
