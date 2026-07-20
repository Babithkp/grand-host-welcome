import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import heroImg from "@/assets/hero.jpg";
import careImg from "@/assets/care.jpg";
import diningImg from "@/assets/dining.jpg";
import gardenImg from "@/assets/garden.jpg";
import lifeTherapyDog from "@/assets/life-therapy-dog.png";
import lifePumpkin from "@/assets/life-pumpkin.jpeg";
import lifeOutdoorDining from "@/assets/life-outdoor-dining.jpeg";
import lifeActivities from "@/assets/life-activities.png";

export const Route = createFileRoute("/")({
  component: Home,
});


function Hero() {
  return (
    <section id="top" className="relative min-h-[92vh] w-full overflow-hidden bg-forest-deep text-primary-foreground">
      <img
        src={heroImg}
        alt="Grand Host Care Home exterior at dusk in Rotterdam"
        width={1600}
        height={1100}
        className="absolute inset-0 h-full w-full object-cover opacity-60"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-forest-deep/80 via-forest-deep/40 to-forest-deep/85" />
      <Header />
      <div className="relative z-10 container-x mx-auto flex min-h-[92vh] max-w-7xl flex-col justify-end pb-20 pt-40 md:pb-28">
        <div className="max-w-3xl">
          <p className="eyebrow mb-6">Since 2008 · Rotterdam, Netherlands</p>
          <h1 className="font-display text-5xl leading-[1.02] tracking-tight text-primary-foreground md:text-7xl lg:text-[5.5rem]">
            A home where every <em className="text-gold not-italic">day</em> is met with care.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-primary-foreground/80 md:text-xl">
            Grand Host is a family-run care home in the heart of Rotterdam — offering
            residential, dementia and respite care with the warmth of Dutch hospitality.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <a href="#visit" className="rounded-full bg-gold px-7 py-3.5 text-sm font-semibold text-forest-deep transition hover:bg-gold/90">
              Arrange a visit
            </a>
            <a href="#care" className="rounded-full border border-primary-foreground/30 px-7 py-3.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary-foreground/10">
              Explore our care
            </a>
          </div>
        </div>
        <div className="mt-16 grid grid-cols-2 gap-6 border-t border-primary-foreground/15 pt-8 md:grid-cols-4">
          {[
            ["18", "Years of care"],
            ["42", "Private suites"],
            ["24/7", "Nursing team"],
            ["9.4", "Family rating"],
          ].map(([n, l]) => (
            <div key={l}>
              <div className="font-display text-4xl text-gold md:text-5xl">{n}</div>
              <div className="mt-1 text-xs uppercase tracking-widest text-primary-foreground/70">{l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Intro() {
  return (
    <section className="bg-background py-24 md:py-32">
      <div className="container-x mx-auto grid max-w-7xl gap-16 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="eyebrow">Welkom bij Grand Host</p>
          <h2 className="mt-4 font-display text-4xl leading-tight text-primary md:text-5xl">
            It's what's inside that counts.
          </h2>
        </div>
        <div className="lg:col-span-7">
          <p className="text-lg leading-relaxed text-foreground md:text-xl">
            For nearly two decades, Grand Host has been a place where older adults in
            Rotterdam are known by name — not by room number. Family-owned, values-led, and
            proudly rooted in the Netherlands, our home combines expert nursing with the
            small rituals that make life feel like life: morning coffee in the garden,
            fresh stroopwafels, and Sunday concerts in the salon.
          </p>
          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            <Value title="Family owned" body="Two generations of the same Rotterdam family, still on site every week." />
            <Value title="Care CQC-inspired" body="Rated 'Goed' by the Dutch Health & Youth Care Inspectorate." />
            <Value title="One-to-one time" body="A staffing ratio designed around companionship, not just tasks." />
            <Value title="Rooted locally" body="Fresh produce from Markthal, ties with local schools & choirs." />
          </div>
        </div>
      </div>
    </section>
  );
}

function Value({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-t border-border pt-5">
      <h3 className="font-display text-xl text-primary">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function Care() {
  const services = [
    {
      title: "Residential Care",
      body: "A permanent, homely place to live with all the everyday support you need — around the clock.",
    },
    {
      title: "Dementia Care",
      body: "A specialist household designed for people living with dementia, led by trained memory carers.",
    },
    {
      title: "Nursing Care",
      body: "Complex clinical needs met by an on-site registered nursing team, day and night.",
    },
    {
      title: "Respite & Short Stay",
      body: "Short breaks from one week — for recovery, a change of scene, or family peace of mind.",
    },
    {
      title: "Palliative Care",
      body: "Compassionate end-of-life care that honours dignity, comfort and family closeness.",
    },
    {
      title: "Day Guests",
      body: "Join us for a day of company, meals and activities. No overnight stay required.",
    },
  ];
  return (
    <section id="care" className="bg-secondary py-24 md:py-32">
      <div className="container-x mx-auto max-w-7xl">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="eyebrow">Our Care</p>
            <h2 className="mt-4 font-display text-4xl leading-tight text-primary md:text-5xl">
              Six ways we can care for someone you love.
            </h2>
          </div>
          <a href="#visit" className="text-sm font-semibold text-primary underline decoration-gold decoration-2 underline-offset-8">
            Talk to our care team →
          </a>
        </div>
        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl bg-border md:grid-cols-2 lg:grid-cols-3">
          {services.map((s, i) => (
            <article key={s.title} className="group relative bg-background p-8 transition hover:bg-cream md:p-10">
              <div className="flex items-baseline gap-4">
                <span className="font-display text-sm text-gold">0{i + 1}</span>
                <h3 className="font-display text-2xl text-primary">{s.title}</h3>
              </div>
              <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">{s.body}</p>
              <span className="mt-6 inline-block text-xs font-semibold uppercase tracking-widest text-primary opacity-0 transition group-hover:opacity-100">
                Learn more →
              </span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Life() {
  return (
    <section id="life" className="bg-background py-24 md:py-32">
      <div className="container-x mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5 lg:sticky lg:top-24 lg:self-start">
            <p className="eyebrow">Life at Grand Host</p>
            <h2 className="mt-4 font-display text-4xl leading-tight text-primary md:text-5xl">
              A day full of small, beautiful moments.
            </h2>
            <p className="mt-6 text-lg text-muted-foreground">
              From morning walks along the Nieuwe Maas to afternoon baking, our residents
              choose how each day unfolds. Nothing is scheduled for the sake of it — everything
              is here because it brings joy.
            </p>
            <div className="mt-8 space-y-4">
              {[
                ["Food & Drink", "Seasonal Dutch menus cooked fresh, three times a day."],
                ["Activities & Wellbeing", "Music, movement, gardening, and outings across the city."],
                ["Faith & Culture", "Multilingual staff and services reflecting Rotterdam's community."],
              ].map(([t, b]) => (
                <div key={t} className="flex gap-4 border-t border-border pt-4">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-gold" />
                  <div>
                    <div className="font-display text-lg text-primary">{t}</div>
                    <div className="text-sm text-muted-foreground">{b}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-4 lg:col-span-7 lg:grid-cols-6">
            <figure className="lg:col-span-6">
              <img src={lifeTherapyDog} alt="Residents greeting a therapy dog in the lounge" loading="lazy" className="aspect-[4/3] w-full rounded-2xl object-cover" />
              <figcaption className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">Therapy dog visits</figcaption>
            </figure>
            <figure className="lg:col-span-3">
              <img src={lifePumpkin} alt="Residents carving pumpkins together at the table" loading="lazy" className="aspect-[4/3] w-full rounded-2xl object-cover" />
              <figcaption className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">Seasonal crafts</figcaption>
            </figure>
            <figure className="lg:col-span-3">
              <img src={lifeOutdoorDining} alt="Residents dining outside in the garden" loading="lazy" className="aspect-[4/3] w-full rounded-2xl object-cover" />
              <figcaption className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">Garden lunches</figcaption>
            </figure>
            <figure className="lg:col-span-6">
              <img src={lifeActivities} alt="Residents painting and enjoying an activity afternoon" loading="lazy" className="aspect-[4/3] w-full rounded-2xl object-cover" />
              <figcaption className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">Activity afternoons</figcaption>
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
}

function Home_Section() {
  return (
    <section id="home" className="relative overflow-hidden bg-forest text-primary-foreground py-24 md:py-32">
      <div className="container-x mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="eyebrow">The Home</p>
          <h2 className="mt-4 font-display text-4xl leading-tight md:text-5xl">
            A restored Dutch villa on a quiet Rotterdam street.
          </h2>
          <p className="mt-6 text-lg text-primary-foreground/80">
            Set behind a walled garden in Kralingen, our home blends the character of a
            19th-century brick villa with the calm and safety of modern care. Forty-two
            private en-suite rooms, three lounges, a chapel, a hair salon, and a
            terrace looking out over the lime trees.
          </p>
          <dl className="mt-10 grid grid-cols-2 gap-6 border-t border-primary-foreground/15 pt-8">
            {[
              ["Location", "Kralingen, Rotterdam"],
              ["Rooms", "42 en-suite suites"],
              ["Garden", "1,400 m² walled"],
              ["Languages", "NL · EN · DE · TR"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs uppercase tracking-widest text-primary-foreground/60">{k}</dt>
                <dd className="mt-1 font-display text-xl text-gold">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="relative">
          <img
            src={heroImg}
            alt="Grand Host Care Home villa exterior"
            width={1600}
            height={1100}
            loading="lazy"
            className="aspect-[4/5] w-full rounded-2xl object-cover shadow-2xl"
          />
          <div className="absolute -bottom-6 -left-6 hidden max-w-[240px] rounded-xl bg-cream p-5 text-primary shadow-xl md:block">
            <p className="font-display text-lg leading-snug">"Wij zijn thuis."</p>
            <p className="mt-2 text-xs text-muted-foreground">— Anneke, resident since 2021</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stories() {
  const quotes = [
    {
      q: "The care my mother receives at Grand Host has given our whole family peace. The team knows her — really knows her.",
      a: "Sophie de Vries",
      r: "Daughter of resident",
    },
    {
      q: "It doesn't feel like a care home. It feels like the home of a very large, very kind family.",
      a: "Marcus Bakker",
      r: "Visiting son",
    },
    {
      q: "I moved in for respite and stayed. The garden, the food, the people — I couldn't leave.",
      a: "Elena K.",
      r: "Resident",
    },
  ];
  return (
    <section id="stories" className="bg-cream py-24 md:py-32">
      <div className="container-x mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <p className="eyebrow">Family Stories</p>
          <h2 className="mt-4 font-display text-4xl leading-tight text-primary md:text-5xl">
            In the words of the families who trust us.
          </h2>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {quotes.map((t, i) => (
            <figure key={i} className="flex flex-col rounded-2xl border border-border bg-background p-8">
              <span className="font-display text-5xl leading-none text-gold">"</span>
              <blockquote className="mt-4 flex-1 font-display text-xl leading-snug text-primary">
                {t.q}
              </blockquote>
              <figcaption className="mt-6 border-t border-border pt-4">
                <div className="font-semibold text-primary">{t.a}</div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">{t.r}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function Visit() {
  return (
    <section id="visit" className="bg-forest-deep py-24 text-primary-foreground md:py-32">
      <div className="container-x mx-auto grid max-w-7xl gap-12 lg:grid-cols-2">
        <div>
          <p className="eyebrow">Visit Us</p>
          <h2 className="mt-4 font-display text-4xl leading-tight md:text-5xl">
            Come and see for yourself.
          </h2>
          <p className="mt-6 max-w-md text-lg text-primary-foreground/80">
            The best way to understand Grand Host is to walk through the door. Tours run
            every weekday — no appointment strictly needed, but a heads-up helps us have
            the kettle on.
          </p>
          <div className="mt-10 space-y-6">
            <ContactRow label="Address" value="Kralingse Plaslaan 128, 3062 DP Rotterdam" />
            <ContactRow label="Telephone" value="+31 9705804551" />
            <ContactRow label="Email" value="Info@ghcarehome.com" />
            <ContactRow label="Tours" value="Mon–Fri · 10:00 – 16:00" />
          </div>
        </div>
        <form className="rounded-2xl bg-cream p-8 text-foreground md:p-10">
          <h3 className="font-display text-2xl text-primary">Arrange a visit</h3>
          <p className="mt-2 text-sm text-muted-foreground">We'll be in touch within one working day.</p>
          <div className="mt-6 grid gap-4">
            <Field label="Your name" name="name" />
            <Field label="Email" name="email" type="email" />
            <Field label="Phone" name="phone" type="tel" />
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Care needed</label>
              <select className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary">
                <option>Residential care</option>
                <option>Dementia care</option>
                <option>Nursing care</option>
                <option>Respite / short stay</option>
                <option>Just looking around</option>
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Message</label>
              <textarea rows={3} className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
            </div>
            <button type="button" className="mt-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground transition hover:bg-forest-deep">
              Request a tour
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function ContactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-primary-foreground/15 pt-4">
      <div className="text-xs uppercase tracking-widest text-primary-foreground/60">{label}</div>
      <div className="mt-1 font-display text-xl text-gold">{value}</div>
    </div>
  );
}

function Field({ label, name, type = "text" }: { label: string; name: string; type?: string }) {
  return (
    <div>
      <label htmlFor={name} className="text-xs uppercase tracking-widest text-muted-foreground">{label}</label>
      <input id={name} name={name} type={type} className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
    </div>
  );
}

function Footer() {
  return (
    <footer className="bg-forest-deep text-primary-foreground/70">
      <div className="container-x mx-auto max-w-7xl border-t border-primary-foreground/10 py-10">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="font-display text-lg text-primary-foreground">Grand Host Care Home</div>
          <div className="text-xs uppercase tracking-widest">
            © {new Date().getFullYear()} · Rotterdam, Netherlands · KvK 12345678
          </div>
        </div>
      </div>
    </footer>
  );
}

function Home() {
  return (
    <main className="bg-background">
      <Hero />
      <Intro />
      <Care />
      <Life />
      <Home_Section />
      <Stories />
      <Visit />
      <Footer />
    </main>
  );
}
