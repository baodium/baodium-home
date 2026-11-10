import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Radio,
  Waypoints,
} from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { SystemPreview } from "@/components/product/SystemPreview";
import { book } from "@/data/writing";
import { projects } from "@/data/projects";

const featured = [
  {
    href: "/system-design/experience/chapter-1",
    number: "01",
    title: "A feature flag. Forty connections.",
    objective:
      "Trace recommendations through a shared pool, then stop the queue from growing.",
    meta: "Beginner · 12–18 min",
    controls: "Feature exposure, timeouts, admission",
  },
  {
    href: "/sre-labs/cascade",
    number: "02",
    title: "When retries become the incident.",
    objective:
      "Follow a checkout into a slow provider. Use spans and metrics to choose a mitigation.",
    meta: "Intermediate · 15–20 min",
    controls: "Retry limits, deadlines, cancellation",
  },
  {
    href: "/sre-labs/alert",
    number: "03",
    title: "Decide what deserves a page.",
    objective:
      "Compare host alarms with customer-impact alerts through short spikes and sustained failure.",
    meta: "Intermediate · 10–15 min",
    controls: "Alert rules, failure scenarios",
  },
];

export default function Home() {
  return (
    <div className="product-site">
      <Navigation />
      <main id="main" tabIndex={-1}>
        <section className="product-hero">
          <div className="product-container hero-grid">
            <div className="hero-editorial">
              <p className="product-eyebrow">
                Adewale Obadimu / Engineer. Author. Philanthropist.
              </p>
              <h1>
                Understand the systems.
                <br />
                <em>Experience the failures.</em>
              </h1>
              <p className="hero-description">
                Read the decisions behind reliable systems. Then change a
                running simulation and see what those decisions do.
              </p>
              <div className="product-actions">
                <Link
                  href="/system-design/experience/chapter-1"
                  className="product-button"
                >
                  Start your first lab <ArrowRight size={17} />
                </Link>
                <Link href="/system-design" className="product-text-link">
                  Read the book for free <ArrowUpRight size={16} />
                </Link>
              </div>
              <p className="hero-assurance">
                First seven chapters free. Browser-based labs. No account
                required.
              </p>
              <div className="hero-index">
                <span>14 chapters</span>
                <span>8 chapter labs</span>
                <span>6 SRE labs</span>
              </div>
            </div>
            <div className="hero-experiment">
              <div className="section-index">
                <span>01 / An experiment, not a screenshot</span>
                <span>Try it below ↓</span>
              </div>
              <SystemPreview />
            </div>
          </div>
        </section>
        <section
          className="product-section product-container"
          aria-labelledby="paths-title"
        >
          <div className="section-intro">
            <p className="product-eyebrow">Two ways to build understanding</p>
            <h2 id="paths-title">
              From design decisions
              <br />
              to operational judgment.
            </h2>
            <p>
              Follow the book’s concepts, or learn to investigate a system
              through its signals. Both start with a working experiment.
            </p>
          </div>
          <div className="learning-destinations">
            <Link href="/system-design/experience" className="destination">
              <Waypoints aria-hidden="true" />
              <p className="product-eyebrow">Practical System Design Labs</p>
              <h3>
                Change the design.
                <br />
                Observe the tradeoff.
              </h3>
              <p>
                Connection pools, idempotency, caching, queues and the
                boundaries between services. Each lab connects directly to a
                chapter.
              </p>
              <span className="product-text-link">
                Explore chapter labs <ArrowRight size={17} />
              </span>
            </Link>
            <Link href="/sre-labs" className="destination destination-sre">
              <Radio aria-hidden="true" />
              <p className="product-eyebrow">Baodium SRE Lab</p>
              <h3>
                Read the signals.
                <br />
                Make the next decision.
              </h3>
              <p>
                Instrument a checkout, define what good means, build an alert,
                then investigate a cascading failure with evidence.
              </p>
              <span className="product-text-link">
                Explore the SRE curriculum <ArrowRight size={17} />
              </span>
            </Link>
          </div>
        </section>
        <section className="book-feature" aria-labelledby="home-book-title">
          <div className="product-container book-feature-grid">
            <div className="book-feature-cover">
              <Image
                src={book.cover}
                alt={`Cover of ${book.title}`}
                width={398}
                height={600}
                sizes="(max-width: 700px) 180px, 260px"
              />
            </div>
            <div>
              <p className="product-eyebrow">The book behind the experiments</p>
              <h2 id="home-book-title">{book.title}</h2>
              <p className="book-subtitle">{book.subtitle}</p>
              <p>
                Fourteen chapters about the decisions that shape reliable
                systems, told through production failures. Read the first seven
                chapters free online, explore the full edition on Amazon, and
                take the concepts into the labs.
              </p>
              <div className="product-actions">
                <Link
                  href="/system-design/chapter-1"
                  className="product-button"
                >
                  <BookOpen size={17} /> Open Chapter 1
                </Link>
                <Link href="/system-design" className="product-text-link">
                  Browse the contents <ArrowRight size={17} />
                </Link>
              </div>
              <a
                href={book.href}
                target="_blank"
                rel="noopener noreferrer"
                className="book-print-link"
              >
                View the print edition on Amazon <ArrowUpRight size={14} />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </div>
          </div>
        </section>
        <section
          className="product-section product-container"
          aria-labelledby="featured-title"
        >
          <div className="section-heading">
            <div>
              <p className="product-eyebrow">A good place to begin</p>
              <h2 id="featured-title">
                Small experiments.
                <br />
                Lasting intuition.
              </h2>
            </div>
            <Link href="/play" className="product-text-link">
              Have five minutes? Try a drill <ArrowRight size={17} />
            </Link>
          </div>
          <ol className="featured-lessons">
            {featured.map((lab) => (
              <li key={lab.href}>
                <Link href={lab.href}>
                  <span className="lesson-number">{lab.number}</span>
                  <div>
                    <p className="lesson-meta">
                      {lab.meta} · Browser simulation
                    </p>
                    <h3>{lab.title}</h3>
                    <p>{lab.objective}</p>
                    <p className="lesson-controls">
                      You control: {lab.controls}
                    </p>
                  </div>
                  <ArrowUpRight aria-hidden="true" size={22} />
                </Link>
              </li>
            ))}
          </ol>
        </section>
        <section className="projects-feature">
          <div className="product-container">
            <div className="section-heading">
              <div>
                <p className="product-eyebrow">Engineering beyond the lab</p>
                <h2>Ideas built into products.</h2>
              </div>
              <Link href="/projects" className="product-text-link">
                See the work <ArrowRight size={17} />
              </Link>
            </div>
            <div className="product-projects">
              {projects.map((project) => (
                <article key={project.slug}>
                  <p className="lesson-meta">
                    {project.status} · {project.tags.join(" / ")}
                  </p>
                  <h3>{project.name}</h3>
                  <p>{project.description}</p>
                  <Link href="/projects" className="product-text-link">
                    View the walkthrough <ArrowUpRight size={16} />
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="author-feature product-container">
          <Image
            src="/images/adewale-hero-poster.jpg"
            alt="Adewale Obadimu"
            width={320}
            height={320}
            sizes="(max-width: 700px) 120px, 220px"
          />
          <div>
            <p className="product-eyebrow">The person behind Baodium</p>
            <h2>
              Engineering, writing,
              <br />
              and work that reaches further.
            </h2>
            <p>
              I’m Adewale Obadimu. Baodium brings together my technical
              publishing, engineering products and broader personal work.
            </p>
            <Link href="/about" className="product-text-link">
              Meet Adewale <ArrowRight size={17} />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
