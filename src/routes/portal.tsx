import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { X, Upload, FileText, Trash2, LogOut, CheckCircle, Clock } from "lucide-react";
import { Header } from "@/components/Header";
import { getSessionFn, logoutFn } from "@/server-functions/auth";
import { getApplicationFn, saveApplicationFn } from "@/server-functions/application";
import {
  listDocumentsFn,
  requestUploadFn,
  confirmUploadFn,
  deleteDocumentFn,
} from "@/server-functions/documents";

export const Route = createFileRoute("/portal")({
  head: () => ({
    meta: [
      { title: "Your Application Portal — Grand Host Care Home" },
      { name: "description", content: "Complete your job application at Grand Host Care Home." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PortalPage,
});

type DocRow = { id: string; file_name: string; file_size: number | null; created_at: string };

const positions = [
  "Palliative Care Assistant",
  "Elderly Care Assistant",
  "Registered Nurse",
  "Other",
];

function PortalPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [username, setUsername] = useState<string>("");

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    date_of_birth: "",
    address: "",
    phone: "",
    country: "",
    position: positions[0],
  });
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [showUpload, setShowUpload] = useState(false);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | null>(null);

  useEffect(() => {
    (async () => {
      const session = await getSessionFn();
      if (!session) {
        navigate({ to: "/apply" });
        return;
      }
      setUsername(session.username || session.email);

      const app = await getApplicationFn();
      if (app) {
        setForm({
          first_name: app.first_name ?? "",
          last_name: app.last_name ?? "",
          date_of_birth: app.date_of_birth ?? "",
          address: app.address ?? "",
          phone: app.phone ?? "",
          country: app.country ?? "",
          position: app.position ?? positions[0],
        });
        setSubmitted(!!app.submitted);
        setStatus(app.status ?? null);
      }
      await loadDocs();
      setReady(true);
    })();
  }, [navigate]);

  async function loadDocs() {
    const rows = await listDocumentsFn();
    setDocs(rows);
  }

  async function saveForm(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    try {
      await saveApplicationFn({
        data: { ...form, date_of_birth: form.date_of_birth || null },
      });
      setSaveMsg("Saved.");
    } catch (err: any) {
      setSaveMsg(`Error: ${err?.message ?? "Something went wrong"}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.length) return;
    setUploadErr(null);
    if (docs.length + e.target.files.length > 10) {
      setUploadErr("You can upload a maximum of 10 documents.");
      return;
    }
    setUploading(true);
    const failures: string[] = [];
    for (const file of Array.from(e.target.files)) {
      try {
        const { uploadUrl, key } = await requestUploadFn({
          data: {
            file_name: file.name,
            content_type: file.type || "application/octet-stream",
          },
        });
        const putRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });
        if (!putRes.ok) throw new Error("Upload to storage failed.");
        await confirmUploadFn({
          data: { key, file_name: file.name, file_size: file.size },
        });
      } catch (err: any) {
        failures.push(`${file.name}: ${err?.message ?? "Upload failed"}`);
      }
    }
    if (failures.length > 0) {
      setUploadErr(failures.join("; "));
    }
    await loadDocs();
    setUploading(false);
    e.target.value = "";
  }

  async function deleteDoc(d: DocRow) {
    setUploadErr(null);
    try {
      await deleteDocumentFn({ data: { id: d.id } });
      await loadDocs();
    } catch (err: any) {
      setUploadErr(err?.message ?? "Failed to delete document.");
    }
  }

  async function submitApplication() {
    setSubmitMsg(null);
    if (docs.length === 0) {
      setSubmitMsg("Please upload at least one document before submitting.");
      return;
    }
    try {
      await saveApplicationFn({
        data: { ...form, date_of_birth: form.date_of_birth || null, submit: true },
      });
      setSubmitted(true);
      setStatus("pending");
      setShowUpload(false);
    } catch (err: any) {
      setSubmitMsg(`Error: ${err?.message ?? "Something went wrong"}`);
    }
  }

  async function signOut() {
    await logoutFn();
    navigate({ to: "/" });
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-cream">
        <div className="bg-forest-deep pb-24 pt-32"><Header /></div>
        <p className="mt-12 text-center text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="relative bg-forest-deep pb-20 pt-32 text-primary-foreground md:pb-24 md:pt-40">
        <Header />
        <div className="container-x mx-auto max-w-5xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="eyebrow text-gold">Application portal</span>
              <h1 className="mt-4 font-display text-4xl md:text-5xl">Welcome, {username}</h1>
            </div>
            <button
              onClick={signOut}
              className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/30 px-4 py-2 text-sm text-primary-foreground hover:bg-primary-foreground/10"
            >
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </div>
      </div>

      {submitted ? (
        <section className="container-x mx-auto max-w-2xl py-16 text-center">
          <div className="rounded-2xl bg-white p-10 shadow-sm ring-1 ring-border md:p-14">
            <div className="flex justify-center">
              <div
                className={`grid h-20 w-20 place-items-center rounded-full ${
                  status === "rejected" ? "bg-red-100" : "bg-green-100"
                }`}
              >
                <CheckCircle
                  className={status === "rejected" ? "text-red-600" : "text-green-600"}
                  size={40}
                  strokeWidth={2.5}
                />
              </div>
            </div>
            <h2 className="mt-6 font-display text-3xl text-forest-deep md:text-4xl">
              Application submitted successfully
            </h2>

            {status === "approved" ? (
              <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-green-300 bg-green-50 px-5 py-2.5 text-sm font-medium text-green-800">
                <CheckCircle size={18} />
                Application approved
              </div>
            ) : status === "rejected" ? (
              <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-red-300 bg-red-50 px-5 py-2.5 text-sm font-medium text-red-800">
                Application not successful
              </div>
            ) : (
              <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-gold/40 bg-gold/10 px-5 py-2.5 text-sm font-medium text-forest-deep">
                <Clock className="text-gold" size={18} />
                Application pending
              </div>
            )}

            <p className="mt-8 text-muted-foreground">
              {status === "approved"
                ? "Congratulations — our team will be in touch about next steps."
                : status === "rejected"
                  ? "Thank you for your interest in Grand Host Care Home. We will not be proceeding with your application at this time."
                  : "When your documents has been accessed and verified, you will receive an email notification regarding the status of your application."}
            </p>
          </div>
        </section>
      ) : (
        <section className="container-x mx-auto max-w-4xl py-16">
          <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-border md:p-10">
            <p className="text-muted-foreground">
              To apply for a job position at our care home you would have to fill the form below and
              upload the following documents.
            </p>

            <form onSubmit={saveForm} className="mt-8 grid gap-5 md:grid-cols-2">
              <Field label="First name" value={form.first_name} onChange={(v) => setForm({ ...form, first_name: v })} required />
              <Field label="Last name" value={form.last_name} onChange={(v) => setForm({ ...form, last_name: v })} required />
              <Field label="Date of birth" type="date" value={form.date_of_birth} onChange={(v) => setForm({ ...form, date_of_birth: v })} required />
              <Field label="Phone number" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} required />
              <Field label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} required className="md:col-span-2" />
              <Field label="Country" value={form.country} onChange={(v) => setForm({ ...form, country: v })} required />
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-forest-deep">Position applying for</span>
                <select
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                  className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm outline-none focus:border-forest"
                >
                  {positions.map((p) => <option key={p}>{p}</option>)}
                </select>
              </label>

              <div className="md:col-span-2 flex items-center gap-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-forest px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-forest-deep disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save details"}
                </button>
                {saveMsg && <span className="text-sm text-muted-foreground">{saveMsg}</span>}
              </div>
            </form>

            <div className="mt-12 border-t border-border pt-8">
              <p className="font-semibold text-forest-deep">To submit your application upload the following documents:</p>
              <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-muted-foreground">
                <li><strong>Identification Document:</strong> International Passport, National identity card, or Driver's licence.</li>
                <li><strong>CV.</strong></li>
                <li><strong>Academic transcript and certificate from high school.</strong></li>
                <li>
                  <strong>Professional Certifications:</strong> any of the following will be accepted —
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    <li>Elderly care (Certificate)</li>
                    <li>Dementia care (Certificate)</li>
                    <li>Diploma in Nursing (Certificate and transcript)</li>
                    <li>Bachelor's or Master's degree in Nursing (Certificate and transcript)</li>
                  </ul>
                </li>
                <li><strong>Reference letter:</strong> a reference from previous or current employment as a nurse or caregiver.</li>
                <li><strong>Cover letter:</strong> a letter detailing why you would like to work in our care home and the contribution you can make as staff.</li>
              </ol>

              <div className="mt-6 rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm text-forest-deep">
                All required application documents — except your identification document — must be
                officially translated to Dutch by the Rotterdam International Translation Service (ITS).
              </div>

              <button
                onClick={() => setShowUpload(true)}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-forest px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-forest-deep"
              >
                <Upload size={16} /> Upload
              </button>
            </div>
          </div>
        </section>
      )}

      {showUpload && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-forest-deep/70 p-4 backdrop-blur-sm md:items-center"
          onClick={() => setShowUpload(false)}
        >
          <div
            className="relative my-8 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-cream p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowUpload(false)}
              aria-label="Close"
              className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-forest text-primary-foreground hover:bg-forest-deep"
            >
              <X size={18} />
            </button>

            <h3 className="font-display text-2xl text-forest-deep">Upload documents</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              You can upload and save up to 10 documents ({docs.length}/10 used).
            </p>
            <p className="mt-2 text-sm font-medium text-forest-deep">
              Only official translated documents in Dutch language by International Translation Service (ITS) will be accepted.
            </p>
            <p className="mt-2 text-sm font-medium text-forest-deep">
              ID documents such as passports, National ID cards, and driver's license can be submitted without translation.
            </p>


            <label className="mt-6 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-forest/40 bg-white p-10 text-center hover:border-forest">
              <Upload className="text-forest" size={32} />
              <span className="font-medium text-forest-deep">Browse documents to upload</span>
              <span className="text-xs text-muted-foreground">PDF, JPG, PNG, DOCX up to ~25 MB each</span>
              <input
                type="file"
                multiple
                onChange={handleUpload}
                disabled={uploading || docs.length >= 10}
                className="hidden"
              />
            </label>
            {uploading && <p className="mt-3 text-sm text-muted-foreground">Uploading…</p>}
            {uploadErr && <p className="mt-3 text-sm text-red-700">{uploadErr}</p>}

            {docs.length > 0 && (
              <ul className="mt-6 space-y-2">
                {docs.map((d) => (
                  <li key={d.id} className="flex items-center justify-between rounded-lg bg-white p-3 ring-1 ring-border">
                    <span className="flex min-w-0 items-center gap-2 text-sm text-forest-deep">
                      <FileText size={16} className="shrink-0 text-forest" />
                      <span className="truncate">{d.file_name}</span>
                    </span>
                    <button
                      onClick={() => deleteDoc(d)}
                      aria-label="Delete"
                      className="rounded-full p-2 text-muted-foreground hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <button
              onClick={submitApplication}
              className="mt-8 w-full rounded-full bg-gold px-6 py-3 text-sm font-semibold text-forest-deep hover:brightness-95"
            >
              Submit Application
            </button>
            {submitMsg && <p className="mt-4 text-center text-sm text-forest-deep">{submitMsg}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", required, className = "",
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm font-medium text-forest-deep">{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm outline-none focus:border-forest"
      />
    </label>
  );
}
