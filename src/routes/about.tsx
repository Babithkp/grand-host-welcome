import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import adminImg from "@/assets/admin.jpg";
import careTeamImg from "@/assets/care-team.jpg";
import teamPhotoAsset from "@/assets/team-photo.jpeg";
import careImg from "@/assets/care.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us — Grand Host Care Home, Rotterdam" },
      { name: "description", content: "Learn about Grand Host Care Home — an aged care facility in Rotterdam offering residential elderly care, dementia care and palliative care since 2008." },
      { property: "og:title", content: "About Grand Host Care Home — Rotterdam" },
      { property: "og:description", content: "Who we are: a Rotterdam aged care home supporting older adults through every stage of ageing." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: About,
});


function About() {
  const milestones = [
    ["2008", "Grand Host opens its doors in a restored villa in Kralingen, Rotterdam, welcoming its first eight residents."],
    ["2012", "Dedicated dementia household launched, with staff trained in specialist memory care."],
    ["2015", "Rated 'Goed' by the Dutch Health & Youth Care Inspectorate (IGJ) for the first time — a rating we've held ever since."],
    ["2018", "Expansion to 42 private en-suite suites and the addition of our walled garden and chapel."],
    ["2021", "Introduction of our on-site palliative care programme, in partnership with Rotterdam hospice specialists."],
    ["2024", "Recognised as one of Rotterdam's top-rated family-run care homes, with a 9.4 family satisfaction score."],
  ];

  return (
    <main className="bg-background">
      <Header />

      {/* Hero */}
      <section className="bg-forest-deep pb-20 pt-24 text-primary-foreground md:pb-28 md:pt-32">
        <div className="container-x mx-auto max-w-5xl">
          
          <h1 className="font-display text-5xl leading-[1.05] tracking-tight md:text-6xl">
            Supporting older adults through <em className="text-gold not-italic">every stage</em> of ageing.
          </h1>
          <p className="mt-8 max-w-3xl text-lg text-primary-foreground/85 md:text-xl">
            Grand Host Care Home is an aged care facility located in Rotterdam, Netherlands,
            dedicated to supporting older adults through every stage of ageing. Our services
            include residential elderly care, dementia care, and palliative care — delivered
            by trained healthcare professionals who are passionate about making a difference.
          </p>
        </div>
      </section>

      {/* Who we are + admin image */}
      <section className="py-24 md:py-32">
        <div className="container-x mx-auto grid max-w-7xl gap-14 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-6">
            <p className="eyebrow">Who we are</p>
            <h2 className="mt-4 font-display text-4xl leading-tight text-primary md:text-5xl">
              A Rotterdam family-run home, since 2008.
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-foreground">
              We opened Grand Host in 2008 with a simple belief: that later life should be
              lived — not merely managed. Nearly two decades on, we're still owned and run
              by the same Rotterdam family, and still shaped by the residents and staff who
              call this place home.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Every member of our care team — from registered nurses to household hosts — is
              trained, background-checked, and chosen for the warmth they bring to their work.
              Our administrative team keeps the paperwork gentle so families can focus on
              what matters: time together.
            </p>
          </div>
          <figure className="lg:col-span-6">
            <img
              src={adminImg}
              alt="Grand Host administrator welcoming a family at reception"
              width={1024}
              height={1024}
              loading="lazy"
              className="aspect-[4/5] w-full rounded-2xl object-cover shadow-xl"
            />
            <figcaption className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">
              On behalf of our entire team at Grand Host — ALWAYS A WARM WELCOME
            </figcaption>
          </figure>
        </div>
      </section>

      {/* Care team images */}
      <section className="bg-cream py-24 md:py-32">
        <div className="container-x mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="eyebrow">Our people</p>
            <h2 className="mt-4 font-display text-4xl leading-tight text-primary md:text-5xl">
              Trained professionals. Familiar faces.
            </h2>
            <p className="mt-6 text-lg text-muted-foreground">
              Behind every good day at Grand Host is a team that shows up early, stays late,
              and knows every resident by name.
            </p>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-2">
            <figure>
              <img
                src={careTeamImg}
                alt="Nurse gently holding the hand of an elderly resident"
                width={1024}
                height={1024}
                loading="lazy"
                className="aspect-[4/3] w-full rounded-2xl object-cover"
              />
              <figcaption className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">
                Bedside care · one-to-one time
              </figcaption>
            </figure>
            <figure>
              <img
                src={teamPhotoAsset}
                alt="Grand Host care team reviewing personalised care plans together"
                width={1024}
                height={1024}
                loading="lazy"
                className="aspect-[4/3] w-full rounded-2xl object-cover"
              />
              <figcaption className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">
                Weekly care-plan review with residents & families
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* Milestones */}
      <section className="bg-forest py-24 text-primary-foreground md:py-32">
        <div className="container-x mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="eyebrow">Our Journey</p>
              <h2 className="mt-4 font-display text-4xl leading-tight md:text-5xl">
                Significant milestones.
              </h2>
              <p className="mt-6 max-w-md text-primary-foreground/80">
                From a small villa with eight residents to a nationally recognised aged care
                home — each step shaped by the people we care for.
              </p>
              <figure className="mt-10 hidden lg:block">
                <img
                  src={careImg}
                  alt="A caregiver and resident sharing a moment at Grand Host"
                  width={1200}
                  height={1400}
                  loading="lazy"
                  className="aspect-[4/5] w-full rounded-2xl object-cover"
                />
              </figure>
            </div>
            <ol className="lg:col-span-7">
              {milestones.map(([year, body]) => (
                <li key={year} className="flex gap-8 border-t border-primary-foreground/15 py-8 first:border-t-0 first:pt-0">
                  <div className="w-24 shrink-0 font-display text-3xl text-gold md:text-4xl">{year}</div>
                  <p className="text-lg leading-relaxed text-primary-foreground/85">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-forest-deep py-20 text-primary-foreground">
        <div className="container-x mx-auto flex max-w-5xl flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-3xl md:text-4xl">Come and meet us.</h2>
            <p className="mt-2 text-primary-foreground/80">Tours run Monday to Friday, 10:00 – 16:00.</p>
          </div>
          <Link
            to="/"
            hash="visit"
            className="rounded-full bg-gold px-7 py-3.5 text-sm font-semibold text-forest-deep transition hover:bg-gold/90"
          >
            Arrange a visit →
          </Link>
        </div>
      </section>
    </main>
  );
}
