import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import residentialImg from "@/assets/residential-care.jpg";
import dementiaImg from "@/assets/dementia-care.jpg";
import palliativeImg from "@/assets/palliative-care.jpg";

export const Route = createFileRoute("/our-care")({
  head: () => ({
    meta: [
      { title: "Our Care — Grand Host Care Home, Rotterdam" },
      { name: "description", content: "Discover the care services at Grand Host Care Home in Rotterdam: residential elderly care, specialist dementia care, and compassionate palliative care." },
      { property: "og:title", content: "Our Care — Grand Host Care Home, Rotterdam" },
      { property: "og:description", content: "Residential, dementia and palliative care delivered by trained professionals in Rotterdam." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OurCare,
});

function OurCare() {
  return (
    <main className="bg-background">
      <Header />

      {/* Hero */}
      <section className="bg-forest-deep pb-20 pt-24 text-primary-foreground md:pb-28 md:pt-32">
        <div className="container-x mx-auto max-w-5xl">
          <h1 className="font-display text-5xl leading-[1.05] tracking-tight md:text-6xl">
            Care that feels like <em className="text-gold not-italic">home</em>.
          </h1>
          <p className="mt-8 max-w-3xl text-lg text-primary-foreground/85 md:text-xl">
            At Grand Host Care Home in Rotterdam, we provide personalised support for older adults
            across three core services: residential care, dementia care, and palliative care. Each
            programme is delivered by trained healthcare professionals who treat residents with
            dignity, respect, and genuine warmth.
          </p>
        </div>
      </section>

      {/* Residential Care */}
      <section className="py-24 md:py-32">
        <div className="container-x mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2">
          <figure className="order-2 lg:order-1">
            <img
              src={residentialImg}
              alt="A senior woman talking with a nurse in a comfortable retirement home lounge"
              width={1600}
              height={1067}
              loading="lazy"
              className="aspect-[3/2] w-full rounded-2xl object-cover shadow-xl"
            />
            <figcaption className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">
              Residential care · companionship and everyday support
            </figcaption>
          </figure>
          <div className="order-1 lg:order-2">
            <p className="eyebrow">Residential Care</p>
            <h2 className="mt-4 font-display text-4xl leading-tight text-primary md:text-5xl">
              A safe, homely place to live well.
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-foreground">
              Our residential care is designed for older adults who need help with daily living
              but want to remain as independent as possible. Residents enjoy a private en-suite
              suite, nutritious Dutch-inspired meals, and a full calendar of social activities.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Care plans are built around each person’s preferences, routines, and goals — from
              medication support and mobility assistance to simply sharing a cup of coffee in the
              garden.
            </p>
            <ul className="mt-8 space-y-3 text-foreground">
              <li className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                24/7 on-site care team
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                Personalised daily living support
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                Private suites with en-suite bathrooms
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Dementia Care */}
      <section className="bg-cream py-24 md:py-32">
        <div className="container-x mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2">
          <div>
            <p className="eyebrow">Dementia Care</p>
            <h2 className="mt-4 font-display text-4xl leading-tight text-primary md:text-5xl">
              Understanding, patience, and specialist support.
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-foreground">
              Our dedicated dementia household provides a calm, structured environment for people
              living with Alzheimer’s disease and other forms of dementia. Specially trained staff
              use reminiscence therapy, meaningful routines, and sensory activities to help
              residents feel secure and engaged.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Families are partners in care. We keep you informed, involve you in decisions, and
              welcome visits at any time — because familiar faces are part of the support we provide.
            </p>
            <ul className="mt-8 space-y-3 text-foreground">
              <li className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                Secure, memory-friendly household
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                Trained dementia care professionals
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                Life-story and reminiscence activities
              </li>
            </ul>
          </div>
          <figure>
            <img
              src={dementiaImg}
              alt="A caregiver sharing tea with a happy senior woman at home"
              width={1600}
              height={1067}
              loading="lazy"
              className="aspect-[3/2] w-full rounded-2xl object-cover shadow-xl"
            />
            <figcaption className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">
              Dementia care · familiar routines and gentle support
            </figcaption>
          </figure>
        </div>
      </section>

      {/* Palliative Care */}
      <section className="py-24 md:py-32">
        <div className="container-x mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2">
          <figure className="order-2 lg:order-1">
            <img
              src={palliativeImg}
              alt="A health visitor with a senior woman in a wheelchair at home"
              width={1600}
              height={1067}
              loading="lazy"
              className="aspect-[3/2] w-full rounded-2xl object-cover shadow-xl"
            />
            <figcaption className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">
              Palliative care · comfort, dignity and family support
            </figcaption>
          </figure>
          <div className="order-1 lg:order-2">
            <p className="eyebrow">Palliative Care</p>
            <h2 className="mt-4 font-display text-4xl leading-tight text-primary md:text-5xl">
              Comfort and dignity when it matters most.
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-foreground">
              Our palliative care programme focuses on relieving symptoms, managing pain, and
              supporting emotional and spiritual wellbeing for residents with life-limiting
              conditions. We work closely with Rotterdam hospice specialists, GPs, and families to
              honour each person’s wishes.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Whether care takes place in a resident’s suite or in a quieter part of the home, our
              team is present around the clock — offering compassionate support to residents and
              their loved ones.
            </p>
            <ul className="mt-8 space-y-3 text-foreground">
              <li className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                Pain and symptom management
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                Emotional and spiritual support
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                Family-focused end-of-life planning
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-forest-deep py-20 text-primary-foreground">
        <div className="container-x mx-auto flex max-w-5xl flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-3xl md:text-4xl">Not sure which service fits?</h2>
            <p className="mt-2 text-primary-foreground/80">
              Our team is happy to talk through your situation and answer questions.
            </p>
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
