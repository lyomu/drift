"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";

import type { Locale } from "@/lib/locales";
import { dmSerifDisplay, outfit } from "@/lib/fonts";
import { waitlistUrl } from "@/lib/site";

import styles from "./landing-page.module.css";

type LandingPageProps = {
  locale: Locale;
};

const loopSteps = [
  ["01", "DISCOVER", "Find your level and people."],
  ["02", "PLAY", "Make it a real fixture."],
  ["03", "COMPETE", "Seasons, standings, rating."],
  ["04", "IMPROVE", "Know what to practise."],
  ["05", "CONNECT", "Stay in the tennis community."],
] as const;

const standings = [
  ["1", "Sarah W.", "6", "5", "1", "4.2", [true, true, true, true]],
  ["2", "Kevin M.", "6", "4", "2", "3.8", [true, true, true, false]],
  ["3", "Emma O.", "6", "2", "4", "2.4", [false, true, false, true]],
  ["4", "Daniel K.", "6", "1", "5", "2.1", [false, false, true, false]],
] as const;

const heroSlides = [
  {
    image: "/images/pen/hero-racket.jpg",
    title: ["Because one more", "match is always a", "good idea."],
    description: "Find people who want to play, discover new places to meet on court, compete when you're ready and keep improving every time you pick up your racket.",
  },
  {
    image: "/images/pen/hero-player.jpg",
    title: ["Find your people.", "Play your game."],
    description: "From a casual hit to a competitive fixture, Drift makes it easier to keep playing.",
  },
  {
    image: "/images/pen/hero-padel.jpg",
    title: ["Your next padel match", "starts here."],
    description: "Find your partner, book a court, and keep the point moving with Drift.",
  },
] as const;

function Arrow() {
  return <svg aria-hidden="true" className={styles.arrow} viewBox="0 0 16 16" fill="none"><path d="M3 13 13 3M6 3h7v7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function BuildingIcon() {
  return <svg aria-hidden="true" className={styles.inlineIcon} viewBox="0 0 16 16" fill="none"><path d="M3 14V4.5c0-.83.67-1.5 1.5-1.5h7c.83 0 1.5.67 1.5 1.5V14M1.5 14h13M6 6h1M9 6h1M6 9h1M9 9h1M7 14v-2.5h2V14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>;
}

function RacketIcon() {
  return <svg aria-hidden="true" className={styles.racketIcon} viewBox="0 0 24 24" fill="none"><ellipse cx="14" cy="9" rx="6" ry="7.5" stroke="currentColor" strokeWidth="1.8" transform="rotate(30 14 9)" /><path d="M10.2 14.6 4 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
}

function PlayIcon({ kind }: { kind: "match" | "book" | "grow" }) {
  if (kind === "book") return <svg aria-hidden="true" className={styles.cardIcon} viewBox="0 0 16 16" fill="none"><rect x="2.5" y="3" width="11" height="10.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" /><path d="M5 1.8v2.4M11 1.8v2.4M2.5 6.2h11M5.2 9h.1M8 9h.1M10.8 9h.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>;
  if (kind === "grow") return <svg aria-hidden="true" className={styles.cardIcon} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" /><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" /><path d="m10 6 3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>;
  return <svg aria-hidden="true" className={styles.cardIcon} viewBox="0 0 16 16" fill="none"><path d="m2.5 2.5 11 11M13.5 2.5l-11 11M4 2.5h-1.5V4M12 13.5h1.5V12M12 2.5h1.5V4M4 13.5h-1.5V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function StoreIcon({ platform }: { platform: "apple" | "android" }) {
  return platform === "apple" ? <svg aria-hidden="true" className={styles.storeIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M16.7 12.7c0-2.1 1.7-3.1 1.8-3.2-1-1.5-2.5-1.7-3-1.7-1.3-.1-2.5.8-3.1.8-.7 0-1.7-.8-2.8-.8-1.5 0-2.8.9-3.6 2.2-1.5 2.7-.4 6.7 1.1 8.9.8 1.1 1.6 2.3 2.8 2.2 1.2 0 1.6-.7 3.1-.7 1.4 0 1.8.7 3.1.7 1.3 0 2.1-1.1 2.8-2.2.8-1.3 1.2-2.5 1.2-2.6-.1 0-3.4-1.3-3.4-3.6ZM14.7 6.5c.6-.7 1-1.7.9-2.7-.9 0-2 .6-2.7 1.3-.6.7-1.1 1.7-.9 2.6 1 .1 2-.5 2.7-1.2Z" /></svg> : <svg aria-hidden="true" className={styles.storeIcon} viewBox="0 0 24 24" fill="none"><path d="M7 9.5 5.4 6.7M17 9.5l1.6-2.8M7.3 6.8 5.9 4.5M16.7 6.8l1.4-2.3M5 10.5h14v7.3c0 .7-.5 1.2-1.2 1.2H6.2c-.7 0-1.2-.5-1.2-1.2v-7.3ZM8.2 13h.1M15.7 13h.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M7 9.5c.3-2.2 2.2-3.8 5-3.8s4.7 1.6 5 3.8H7Z" stroke="currentColor" strokeWidth="1.5" /></svg>;
}

function PlayStoreIcon() {
  return (
    <svg aria-hidden="true" className={styles.storeIcon} viewBox="0 0 24 24" fill="none">
      <path d="m4.4 3.7 9.43 8.29L4.4 20.3c-.25-.3-.4-.7-.4-1.2V4.9c0-.5.15-.9.4-1.2Z" fill="#44d1ff" />
      <path d="m14.2 12.32 2.9 2.55-10.8 6.02a1.6 1.6 0 0 1-1.55-.2l9.45-8.37Z" fill="#ffcf44" />
      <path d="m17.12 9.15-2.92 2.54-9.44-8.38c.44-.35 1-.43 1.54-.15l10.82 5.99Z" fill="#37dc8c" />
      <path d="M20 12c0 .58-.3 1.08-.82 1.37l-1.5.83-3.12-2.2 3.12-2.18 1.51.84c.51.28.81.77.81 1.34Z" fill="#ff5a68" />
    </svg>
  );
}

function StoreButton({
  href,
  platform,
  eyebrow,
  label,
}: {
  href: string;
  platform: "apple" | "google";
  eyebrow: string;
  label: string;
}) {
  return (
    <a className={styles.storeButton} href={href} aria-label={`Join the waitlist for ${label}`}>
      {platform === "apple" ? <StoreIcon platform="apple" /> : <PlayStoreIcon />}
      <span>
        <small>{eyebrow}</small>
        <strong>{label}</strong>
      </span>
    </a>
  );
}

function Button({ href, children, inverse = false }: { href: string; children: ReactNode; inverse?: boolean }) {
  return (
    <a className={`${styles.button} ${inverse ? styles.buttonInverse : ""}`} href={href}>
      {children} <Arrow />
    </a>
  );
}

function Kicker({ children, lime = false }: { children: ReactNode; lime?: boolean }) {
  return <div className={`${styles.kicker} ${lime ? styles.kickerLime : ""}`}>{children}</div>;
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className={styles.sectionTitle}>{children}</h2>;
}

function SectionBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`${styles.sectionBody} ${className}`}>{children}</p>;
}

function DownloadPhonePreview() {
  return (
    <div className={styles.downloadVisual}>
      <Image
        className={styles.downloadImage}
        src="/images/pen/download-preview.jpg"
        alt="Drift app preview showing a nearby match and players"
        width={1200}
        height={900}
      />
    </div>
  );
}

/**
 * THESIS: Drift is a weekly tennis ritual, not a generic app pitch.
 * OWN-WORLD: dark evergreen courts, chalk-white type, acid-lime actions and Outfit.
 * STORY: visitors see how a match becomes a season, then join the waitlist.
 * FIRST VIEWPORT: full-bleed court photography with a left-aligned action stack.
 * FORM: Pen's staged, full-width editorial landing page; source-export fidelity leads.
 */
export function LandingPage({ locale }: LandingPageProps) {
  const waitlist = waitlistUrl(locale);
  const rootRef = useRef<HTMLElement>(null);
  const [heroSlide, setHeroSlide] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const interval = window.setInterval(() => {
      setHeroSlide((current) => (current + 1) % heroSlides.length);
    }, 12000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const sections = Array.from(root.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement && child.tagName === "SECTION",
    );
    const hero = sections.find((section) => section.classList.contains(styles.hero));
    root.classList.add(styles.motionReady);

    requestAnimationFrame(() => hero?.classList.add(styles.revealed));

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add(styles.revealed);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -12%", threshold: 0.12 },
    );

    const revealPastSections = () => {
      for (const section of sections) {
        if (section.getBoundingClientRect().top < window.innerHeight * .88) {
          section.classList.add(styles.revealed);
          observer.unobserve(section);
        }
      }
    };

    for (const section of sections) {
      if (section !== hero) observer.observe(section);
    }
    revealPastSections();
    window.addEventListener("scroll", revealPastSections, { passive: true });

    return () => {
      window.removeEventListener("scroll", revealPastSections);
      observer.disconnect();
    };
  }, []);

  return (
    <main ref={rootRef} className={`${styles.preview} ${outfit.className}`}>
      <section className={`${styles.hero} ${styles.photoHero}`} id="top">
        <div className={styles.heroSlides} aria-hidden="true">
          {heroSlides.map(({ image }, index) => (
            <div
              className={`${styles.heroSlide} ${index === heroSlide ? styles.heroSlideActive : ""}`}
              key={image}
              style={{ backgroundImage: `url("${image}")` }}
            />
          ))}
        </div>
        <div className={styles.heroShade} />
        <header className={styles.header}>
          <a className={styles.brand} href="#top" aria-label="Drift home">
            <Image src="/images/logo-white.png" alt="" width={1600} height={802} className={styles.brandMark} priority />
          </a>
          <nav className={styles.nav} aria-label="Primary navigation">
            <a href="#play">FOR PLAYERS</a>
            <a href="#clubs">FOR CLUBS</a>
            <a href="#training">FOR COACHES</a>
          </nav>
          <a className={styles.appLink} href={waitlist}>
            JOIN WAITING LIST
          </a>
        </header>
        <div className={`${styles.inner} ${styles.heroContent}`}>
          <h1>{heroSlides[heroSlide].title.map((line) => <span key={line}>{line}</span>)}</h1>
          <p>{heroSlides[heroSlide].description}</p>
          <div className={styles.heroActions}>
            <Button href={waitlist}>JOIN WAITING LIST</Button>
            <a className={styles.textAction} href="#clubs"><BuildingIcon /> FOR CLUBS / COACHES</a>
          </div>
        </div>
        <div className={styles.heroControls} aria-label="Hero slides">
          {heroSlides.map((slide, index) => (
            <button
              className={`${styles.heroDot} ${index === heroSlide ? styles.heroDotActive : ""}`}
              key={slide.title.join("-")}
              type="button"
              aria-label={`Show slide ${index + 1}`}
              aria-pressed={index === heroSlide}
              onClick={() => setHeroSlide(index)}
            />
          ))}
        </div>
      </section>

      <section className={`${styles.about} ${styles.lightBand}`}>
        <div className={styles.inner}>
          <div className={styles.aboutTop}>
            <div>
              <Kicker>ABOUT DRIFT</Kicker>
              <SectionTitle>Built around the people who power the game.</SectionTitle>
              <SectionBody>Drift is a connected tennis platform built for players, coaches, clubs and communities. We make it easier for players to find opponents, discover local coaches, organise matches, join competitions, discover courts and track their progress, while giving coaches a platform to connect with players and support their development. For clubs, Drift simplifies the management of members, competitions, fixtures, results, standings, courts and communication. By bringing every part of the tennis community into one ecosystem, Drift helps create more opportunities to <strong>play, compete, connect and grow the game.</strong></SectionBody>
              <Button href={waitlist}>JOIN THE WAITLIST</Button>
            </div>
            <div className={`${styles.photoPanel} ${styles.aboutPhoto}`} />
          </div>
        </div>
      </section>

      <section className={`${styles.proof} ${styles.deepBand}`}>
        <div className={`${styles.inner} ${styles.proofGrid}`}>
          <div className={styles.liveCard} aria-label="Illustrative live match card" style={{ padding: 0, overflow: "hidden", width: "100%", height: "100%", border: "none", background: "none", boxShadow: "none" }}>
            <img src="/images/match-card-preview.jpg" alt="Court preview" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>
          <div className={styles.proofCopy}>
            <Kicker lime>ONE APP. EVERY MATCH.</Kicker>
            <SectionTitle>Find your next match. Play more often.</SectionTitle>
            <SectionBody>Drift connects you with players at your level, helps you find the right court, and makes organising your next match simple. Less time planning, more time playing.</SectionBody>
            <div className={styles.proofStats}><span><b>100+</b> COUNTRIES</span></div>
          </div>
        </div>
      </section>

      <section className={`${styles.playbook} ${styles.lightBand}`} id="play">
        <div className={styles.inner}>
          <div className={styles.sectionIntro}>
            <Kicker>THE DRIFT PLAYBOOK</Kicker>
            <SectionTitle>More ways to show up for the game.</SectionTitle>
            <SectionBody>From an easy Tuesday hit to your new doubles crew, Drift makes the tennis you want to play feel effortless.</SectionBody>
          </div>
          <div className={styles.playCards}>
            <article><PlayIcon kind="match" /><h3>MATCH</h3><p>Find a competitive rally in your area.</p></article>
            <article><PlayIcon kind="book" /><h3>BOOK</h3><p>Reserve a court without the admin.</p></article>
            <article><PlayIcon kind="grow" /><h3>GROW</h3><p>Track your rhythm. Keep your streak alive.</p></article>
          </div>
          <div className={styles.gallery}>
            <div className={styles.galleryOne} /><div className={styles.galleryTwo} /><div className={styles.galleryThree} />
          </div>
        </div>
      </section>

      <section className={styles.clubsHero} id="clubs">
        <div className={styles.clubsPhoto} aria-hidden="true" />
        <div className={`${styles.inner} ${styles.clubsCopy}`}>
          <Kicker lime>FOR CLUBS &amp; ACADEMIES</Kicker>
          <SectionTitle>Manage your club</SectionTitle>
          <SectionBody>Bring your tennis and padel players, courts, coaches and competitions together with Drift. Manage memberships, organise leagues and tournaments, coordinate fixtures, schedules and results, and keep your community informed and connected. From everyday club activities to competitive events and player development, Drift gives you the tools to simplify your tennis or padel club management, engage your members and create more opportunities for everyone to play, compete and grow.</SectionBody>
          <div style={{ display: "flex", gap: "32px", alignItems: "center", marginTop: "32px" }}>
            <Button href={waitlist}>ONBOARD YOUR CLUB TODAY</Button>
            <a className={styles.clubsAction} href="#clubs" style={{ margin: 0 }}>EXPLORE CLUBS <Arrow /></a>
          </div>
        </div>
      </section>

      <section className={styles.padelFeature} id="padel">
        <div className={styles.padelFeatureImage} aria-hidden="true" />
        <div className={`${styles.inner} ${styles.padelFeatureContent}`}>
          <Kicker>PADEL IS PART OF THE DRIFT</Kicker>
          <SectionTitle>A new game to play. More people to meet.</SectionTitle>
          <SectionBody>Padel is fast, social and easy to get into. Find players who match your energy, discover courts near you and organise your next game without the group-chat scramble.</SectionBody>
          <SectionBody>Whether you are picking up a racket for the first time or already hooked, Drift helps you play more, meet more people and keep improving.</SectionBody>
          <Button href={waitlist}>PLAY PADEL WITH DRIFT</Button>
        </div>
      </section>

      <section className={styles.training} id="training">
        <div className={`${styles.inner} ${styles.coachesGrid}`}>
          <div className={styles.trainingCopy}>
            <Kicker lime>FOR COACHES</Kicker>
            <SectionTitle>Grow your coaching. Find more players.</SectionTitle>
            <SectionBody>Join Drift and put your coaching services in front of players actively looking to improve their game. Build your coaching profile, showcase your experience and specialities, connect with players at different levels, manage coaching opportunities and grow your presence within the tennis community.</SectionBody>
            <Button href={waitlist}>SIGN UP AS A COACH</Button>
          </div>
          <div className={styles.trainingMedia} aria-hidden="true">
            <div className={styles.trainingPhoto} />
          </div>
        </div>
      </section>

      <section className={`${styles.loop} ${styles.lightBand}`} id="loop">
        <div className={styles.inner}>
          <p className={styles.loopIntro}>ONE LOOP. FIVE STAGES. BACK IN PLAY EVERY WEEK.</p>
          <ol>{loopSteps.map(([number, title, detail]) => <li key={title}><span>{number}</span><h3>{title}</h3><p>{detail}</p></li>)}</ol>
        </div>
      </section>

      <section className={`${styles.standings} ${styles.deepBand}`} id="standings">
        <div className={`${styles.inner} ${styles.standingsGrid}`}>
          <div><Kicker lime>COMPETE</Kicker><SectionTitle>Standings that mean something.</SectionTitle><SectionBody>Real leagues have registration windows, automatic round-robin pairing, fixtures, a rating you can trust, and snapshots that remember how you moved.</SectionBody></div>
          <div className={styles.tableWrap}>
            <div className={styles.tableTop}><b>SATURDAY LEAGUE | ROUND 6</b><span>LIVE TABLE</span></div>
            <table><thead><tr><th>#</th><th>PLAYER</th><th>P</th><th>W</th><th>L</th><th>RATING</th><th>FORM</th></tr></thead><tbody>{standings.map(([rank, player, played, won, lost, rating, form]) => <tr key={player}><td>{rank}</td><td>{player}</td><td>{played}</td><td>{won}</td><td>{lost}</td><td>{rating}</td><td>{form.map((win, index) => <i className={win ? styles.win : styles.loss} key={index} />)}</td></tr>)}</tbody></table>
          </div>
        </div>
      </section>

      <section className={`${styles.connection} ${styles.lightBand}`} id="connection">
        <div className={`${styles.inner} ${styles.connectionGrid}`}>
          <div><Kicker>CONNECT</Kicker><SectionTitle>Your tennis life, in one place.</SectionTitle><SectionBody>Connections, match messages, club announcements and tennis news—with the official channel separate from the group-chat noise.</SectionBody></div>
          <div className={styles.connectionList}>
            <article><div><h3>Messaging that stays in context</h3><span>MATCH THREADS</span></div><p>Every match gets its own thread, and every state change lands in it as a clear system message.</p></article>
            <article><div><h3>Clubs & announcements</h3><span>CLUB FEED</span></div><p>Follow official club updates without drowning out casual chat.</p></article>
            <article><div><h3>Tennis news, categorised</h3><span>NEWS FEED</span></div><p>Pro, players, tournaments, local clubs and community - summarised with attribution.</p></article>
          </div>
        </div>
      </section>

      <section className={`${styles.assessment} ${styles.lightBand}`} id="assessment">
        <div className={`${styles.inner} ${styles.assessmentGrid}`}>
          <div><SectionTitle>Find your level. Find your people.</SectionTitle><SectionBody>Start with a quick assessment that helps Drift understand your experience, playing style and current skill level. From there, discover players who match how you want to play — whether you&apos;re looking for a casual rally, a regular hitting partner or your next competitive challenge.</SectionBody></div>
          <div className={styles.assessmentPhoto} />
          <div className={styles.assessmentBenefits}><span><b>SMART ASSESSMENT</b>Answer a few questions about your experience, skills and match play to establish a starting level that you can review and adjust.</span><span><b>BETTER MATCHES</b>Discover players based on level, location, availability and playing preferences — so you can spend less time searching and more time playing.</span><span><b>PLAY YOUR WAY</b>Looking for singles, doubles, social play or serious competition? Set your preferences and find players who want the same kind of game.</span></div>
        </div>
      </section>

      <section className={`${styles.skillProgress} ${styles.darkBand}`} id="skills">
        <div className={styles.inner}>
          <div className={styles.sectionIntro}><Kicker lime>IMPROVE WITH A REAL BASELINE</Kicker><SectionTitle>Know what to practise on Tuesday.</SectionTitle><SectionBody>Your rating says how you compete; your skill profile says why. Drift keeps both and points your practice at the weakest one.</SectionBody></div>
          <div className={styles.skillCards}><article><span className={styles.skillBadge}>SEVEN PILLARS</span><h3>A real skill profile</h3><p>Serve, forehand, backhand, return, net, movement and match play - blended from your assessment baseline and logged practice.</p></article><article><span className={styles.skillBadge}>LEARNING CENTRE</span><h3>Lessons, drills, plans</h3><p>Recommendations matched to your level and weakest skill, sequenced into a plan you can actually follow.</p></article><article><span className={styles.skillBadge}>MILESTONES</span><h3>Goals with honest progress</h3><p>Set a target, get milestones, and a status that compares your real pace to the plan.</p></article></div>
        </div>
      </section>


      <section className={styles.faq} id="faq"><div className={styles.inner}><Kicker>FAQ</Kicker><SectionTitle>Questions, answered.</SectionTitle><SectionBody>A few helpful details before you join the community and play your next match.</SectionBody><div className={styles.faqList}>{[{q:"How does player matching work?",a:"Drift helps you discover players based on factors such as your playing level, location, availability and playing preferences. Whether you want a casual hitting partner or a competitive opponent, the goal is to help you find people who fit the way you want to play."},{q:"Can I join leagues and tournaments?",a:"Yes. Drift lets you discover and join available leagues, tournaments and other competitions. You can follow fixtures, schedule matches, submit results and keep track of standings and your competition progress from the app."},{q:"Can coaches and clubs join Drift?",a:"Yes. Coaches can create profiles, showcase their experience and services, and connect with players looking to improve. Clubs can use Drift to manage members, organise competitions, coordinate fixtures and results, communicate with their community and create more opportunities for members to play."},{q:"How does Drift determine my playing level?",a:"When you join, Drift guides you through a short assessment covering your experience, skills and match play. This helps establish a starting level that can evolve as you play, record results and build your playing history."},{q:"Is Drift only for tennis players?",a:"Drift is built primarily around tennis, bringing players, coaches and clubs into one connected platform. Padel is also supported as an additional sport, allowing players to expand their profile and discover more ways to play."},{q:"Can I find courts on Drift?",a:"Yes. Drift helps you discover courts and clubs, view useful facility information and find available contact or booking options where provided."},{q:"Can Drift help me improve my skills?",a:"Yes. Drift is designed around more than finding matches. You can understand different areas of your game, set development goals, access relevant training and drills, and track how your skills develop over time."},{q:"Is my location visible to other players?",a:"Drift is designed with player privacy in mind. Discovery can use general location information to help you find relevant players and courts without publicly exposing your precise location or private contact information."}].map(({q,a}) => <details key={q}><summary>{q}<span className={styles.faqIcon}>+</span></summary><p>{a}</p></details>)}</div></div></section>

      <section className={styles.download} id="download">
        <div className={`${styles.inner} ${styles.downloadInner}`}>
          <div className={styles.downloadCopy}>
            <Kicker>YOUR NEXT MATCH IS WAITING</Kicker>
            <h2>
              Find your
              <br />
              <span className={`${styles.scriptWord} ${dmSerifDisplay.className}`}>people.</span> Play.
            </h2>
            <SectionBody>Players at your level. Courts around the corner. Competitive matches without the group-chat chaos.</SectionBody>
            <div className={styles.storeButtons}>
              <StoreButton href={waitlist} platform="apple" eyebrow="Download on the" label="App Store" />
              <StoreButton href={waitlist} platform="google" eyebrow="Get it on" label="Google Play" />
            </div>
          </div>
          <DownloadPhonePreview />
        </div>
      </section>

      <footer className={styles.footer} id="footer"><div className={`${styles.inner} ${styles.footerGrid}`}><div><Image src="/images/logo-white.png" alt="Drift Tennis" width={1600} height={802} className={styles.footerMark} /><p>Find your next rally.</p></div><div><b>LEGAL</b><Link href="/terms">Terms and Conditions</Link><Link href="/privacy-policy">Privacy Policy</Link><Link href="/data-privacy">Data Privacy Notice</Link></div><div><b>CONTACT</b><a href="mailto:serve@driftsports.app">serve@driftsports.app</a></div></div><p className={`${styles.inner} ${styles.copyright}`}>© 2026 Drift Sports.</p></footer>
      <button
        type="button"
        className={styles.backToTop}
        aria-label="Back to top"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <RacketIcon />
      </button>
    </main>
  );
}

// Compatibility alias for the noindex `/preview` comparison route.
export const PreviewLandingPage = LandingPage;
