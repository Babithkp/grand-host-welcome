import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { X, Briefcase, Globe2, HeartHandshake, Dumbbell, ShoppingBasket, CalendarDays, Stethoscope } from "lucide-react";
import { Header } from "@/components/Header";
import careTeamImg from "@/assets/team-meeting.jpg";
import residentialImg from "@/assets/residential-care.jpg";
import palliativeImg from "@/assets/palliative-care.jpg";

export const Route = createFileRoute("/careers")({
  head: () => ({
    meta: [
      { title: "Careers — Grand Host Care Home Rotterdam" },
      { name: "description", content: "Join Grand Host Care Home in Rotterdam. Open roles for palliative and elderly care assistants. Open to foreign candidates with visa sponsorship and training." },
      { property: "og:title", content: "Careers at Grand Host Care Home" },
      { property: "og:description", content: "Meaningful careers in elderly and palliative care in Rotterdam. Open to overseas nurses with training and sponsorship." },
    ],
  }),
  component: CareersPage,
});

type Job = {
  id: string;
  title: string;
  summary: string;
  location: string;
  schedule: string;
  salary: string;
  duties: string[];
  requirements: string[];
};

const jobs: Job[] = [
  {
    id: "palliative",
    title: "Palliative Care Assistant",
    summary:
      "Support residents in the final chapter of life with comfort, dignity and unhurried presence. You will work alongside our nursing team, families and GP to deliver holistic end-of-life care.",
    location: "Rotterdam, Netherlands",
    schedule:
      "36–40 hours per week across day, evening and weekend rotations. 8-hour shifts with a paid handover. Night rotations approximately once every three weeks.",
    salary: "€2,650 – €3,200 per month (CAO VVT scale FWG 35), plus irregular-hours (ORT), holiday and end-of-year allowances.",
    duties: [
      "Provide personal care — washing, mouth care, repositioning and pain-relief support.",
      "Monitor symptoms and comfort levels; report changes to the nurse on duty.",
      "Administer prescribed medication under nursing supervision.",
      "Sit with residents and families, offering emotional and spiritual support.",
      "Keep accurate notes in the resident's electronic care record (ONS/Nedap).",
      "Coordinate with GPs, chaplains and hospice specialists on the care plan.",
      "Support bereaved families in the hours and days after a resident passes.",
    ],
    requirements: [
      "Minimum two years' experience in elderly care or two years' experience as a nurse.",
      "Verzorgende IG (Niveau 3) or equivalent overseas nursing qualification.",
      "Additional palliative care training preferred (or willingness to complete our in-house programme).",
      "Working proficiency in English; Dutch A2 on arrival with a path to B1 within 12 months (funded).",
      "Compassionate, calm under pressure and comfortable working with grief.",
      "Open to foreign candidates — visa sponsorship, relocation support and housing assistance provided.",
    ],
  },
  {
    id: "elderly",
    title: "Elderly Care Assistant",
    summary:
      "Be the friendly face of daily life at Grand Host — supporting residents with personal care, meals, activities and companionship in our small-scale residential wings.",
    location: "Rotterdam, Netherlands",
    schedule:
      "32–40 hours per week. Rotating early (07:00–15:00) and late (14:30–22:30) shifts, with one weekend in two. Predictable rota published four weeks in advance.",
    salary: "€2,650 – €3,200 per month (CAO VVT scale FWG 35), plus irregular-hours (ORT), holiday and end-of-year allowances.",
    duties: [
      "Support residents with washing, dressing, grooming and toileting.",
      "Serve breakfast and help residents at mealtimes; encourage hydration.",
      "Assist with mobility, transfers and use of aids (hoists, walkers).",
      "Run small-group activities: reading circles, garden walks, memory sessions.",
      "Observe wellbeing and flag changes to the nurse or team lead.",
      "Keep rooms tidy and stock personal-care supplies.",
      "Build warm, respectful relationships with residents and their families.",
    ],
    requirements: [
      "Minimum two years' experience in elderly care or two years' experience as a nurse.",
      "Helpende Zorg & Welzijn (Niveau 2) minimum, Verzorgende IG (Niveau 3) preferred, or overseas equivalent.",
      "Basic first aid / BHV (or willingness to obtain — we fund it).",
      "Conversational English; Dutch A2 on arrival with funded classes to B1.",
      "Physically fit for care work, patient and a genuine team player.",
      "Open to foreign candidates — visa sponsorship, flights and first-month housing provided.",
    ],
  },
];

const benefits = [
  { icon: Stethoscope, label: "Free private healthcare insurance for you and your family" },
  { icon: CalendarDays, label: "30 days of paid annual leave, plus recognised Dutch public holidays" },
  { icon: Dumbbell, label: "Free access to our partner gym and wellness centre in Kralingen" },
  { icon: ShoppingBasket, label: "Staff discount on weekly groceries at our partner store" },
  { icon: HeartHandshake, label: "Pension contribution via PFZW and a €500 annual wellbeing budget" },
  { icon: Globe2, label: "Relocation package for overseas hires: flights, first-month housing and Dutch classes" },
];

function CareersPage() {
  const [openJob, setOpenJob] = useState<Job | null>(null);

  return (
    <div className="min-h-screen bg-cream">
      <div className="relative bg-forest-deep pb-20 pt-32 text-primary-foreground md:pb-28 md:pt-40">
        <Header />
        <div className="container-x mx-auto max-w-5xl">
          <span className="eyebrow text-gold">Careers</span>
          <h1 className="mt-4 font-display text-4xl leading-tight md:text-6xl">
            Meaningful work, made in Rotterdam.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-primary-foreground/80">
            At Grand Host Care Home we look after people at the most tender moments of later life.
            The team who make that possible — nurses, care assistants, cooks, gardeners — are the
            reason families trust us. We hire slowly, train generously, and keep people for the long run.
          </p>
        </div>
      </div>

      {/* Overseas nurses */}
      <section className="container-x mx-auto max-w-6xl py-20 md:py-28">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <span className="eyebrow">International hiring</span>
            <h2 className="mt-3 font-display text-3xl text-forest-deep md:text-4xl">
              Recruiting and training nurses from overseas
            </h2>
            <p className="mt-6 text-muted-foreground">
              The Netherlands, like much of Europe, faces a real shortage of trained care staff.
              Rather than compete for a shrinking local pool, we recruit qualified nurses from
              overseas — from the Philippines, Nigeria, India, Kenya, Indonesia and beyond — and
              bring them into a structured 12-month integration programme in Rotterdam.
            </p>
            <p className="mt-4 text-muted-foreground">
              We sponsor visas for foreign healthcare workers via the Dutch GVVA single work permit,
              we cover flights and the first month of housing, and fund the language course from A2
              through B1. On the clinical side, new hires shadow a senior nurse for six weeks before
              taking a caseload, and complete our in-house modules in dementia care, palliative care
              and Dutch care-home protocols.
            </p>
            <p className="mt-4 text-muted-foreground">
              From day one, every nurse or caregiver joins our structured arrival training programme
              to learn the Grand Host standard of quality care: person-centred support, dignity in
              daily life, safe moving and handling, infection control, and clear communication with
              residents and families. Dutch language training is included from the start, so our team
              can speak with residents in the language they feel most at home in.
            </p>
            <p className="mt-4 text-muted-foreground">
              It is a serious commitment on both sides — and it is why those who join us tend to stay.
            </p>
          </div>
          <div className="grid gap-4">
            <img src={careTeamImg} alt="Grand Host care team" className="h-64 w-full rounded-2xl object-cover shadow-lg md:h-80" />
          </div>
        </div>
      </section>

      {/* Open positions */}
      <section className="bg-secondary py-20 md:py-28">
        <div className="container-x mx-auto max-w-6xl">
          <span className="eyebrow">Open positions</span>
          <h2 className="mt-3 font-display text-3xl text-forest-deep md:text-4xl">
            We are currently hiring
          </h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Both roles below are open to foreign candidates. We sponsor visas and support the full
            relocation.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {jobs.map((job, i) => (
              <article key={job.id} className="flex flex-col rounded-2xl bg-cream p-8 shadow-sm">
                <img
                  src={i === 0 ? palliativeImg : residentialImg}
                  alt=""
                  className="mb-6 h-48 w-full rounded-xl object-cover"
                />
                <div className="flex items-center gap-2 text-gold">
                  <Briefcase size={18} />
                  <span className="text-xs uppercase tracking-widest">Full-time · Rotterdam</span>
                </div>
                <h3 className="mt-3 font-display text-2xl text-forest-deep">{job.title}</h3>
                <p className="mt-3 flex-1 text-sm text-muted-foreground">{job.summary}</p>
                <button
                  type="button"
                  onClick={() => setOpenJob(job)}
                  className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-forest-deep"
                >
                  Job description
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="container-x mx-auto max-w-6xl py-20 md:py-28">
        <span className="eyebrow">Staff benefits</span>
        <h2 className="mt-3 font-display text-3xl text-forest-deep md:text-4xl">
          Looking after the people who look after our residents
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {benefits.map(({ icon: Icon, label }) => (
            <div key={label} className="rounded-2xl border border-border bg-cream p-6">
              <Icon className="text-gold" size={28} strokeWidth={1.75} />
              <p className="mt-4 text-sm text-forest-deep">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Modal */}
      {openJob && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-forest-deep/70 p-4 backdrop-blur-sm md:items-center"
          onClick={() => setOpenJob(null)}
        >
          <div
            className="relative my-8 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-cream p-8 shadow-2xl md:p-10"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpenJob(null)}
              aria-label="Close"
              className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-forest text-primary-foreground transition hover:bg-forest-deep"
            >
              <X size={18} />
            </button>

            <span className="eyebrow">Job description</span>
            <h3 className="mt-2 font-display text-3xl text-forest-deep">{openJob.title}</h3>
            <p className="mt-4 text-muted-foreground">{openJob.summary}</p>

            <div className="mt-6 grid gap-4 rounded-xl bg-secondary p-5 sm:grid-cols-3">
              <div>
                <div className="text-xs uppercase tracking-widest text-gold">Location</div>
                <p className="mt-1 text-sm text-forest-deep">{openJob.location}</p>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-gold">Schedule</div>
                <p className="mt-1 text-sm text-forest-deep">{openJob.schedule}</p>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-gold">Salary</div>
                <p className="mt-1 text-sm text-forest-deep">{openJob.salary}</p>
              </div>
            </div>

            <h4 className="mt-8 font-display text-xl text-forest-deep">Duties & responsibilities</h4>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              {openJob.duties.map((d) => <li key={d}>{d}</li>)}
            </ul>

            <h4 className="mt-8 font-display text-xl text-forest-deep">Requirements</h4>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              {openJob.requirements.map((r) => <li key={r}>{r}</li>)}
            </ul>

            <div className="mt-8 rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm text-forest-deep">
              This role is currently open to foreign candidates.
            </div>

            <a
              href="mailto:recruitment@ghcarehome.com"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-forest px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-forest-deep"
            >
              Contact recruitment@ghcarehome.com
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
