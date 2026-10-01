"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import type { Locale } from "@/lib/locales";
import { outfit } from "@/lib/fonts";
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

const events = [
  ["THU | 18:30", "Doubles at Dusk", "Riverside Courts | 12 spots", "eventDoubles"],
  ["SAT | 10:00", "Rookie Rally", "Intro clinic | 8 spots", "eventRookie"],
  ["SUN | 16:00", "Sunday Social", "Clay & coffee | 24 spots", "eventSocial"],
] as const;

const heroImages = [
  "/images/pen/hero-racket.jpg",
  "/images/pen/hero-player.jpg",
] as const;

function Arrow() {
  return <svg aria-hidden="true" className={styles.arrow} viewBox="0 0 16 16" fill="none"><path d="M3 13 13 3M6 3h7v7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function BuildingIcon() {
  return <svg aria-hidden="true" className={styles.inlineIcon} viewBox="0 0 16 16" fill="none"><path d="M3 14V4.5c0-.83.67-1.5 1.5-1.5h7c.83 0 1.5.67 1.5 1.5V14M1.5 14h13M6 6h1M9 6h1M6 9h1M9 9h1M7 14v-2.5h2V14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>;
}

function PlayIcon({ kind }: { kind: "match" | "book" | "grow" }) {
  if (kind === "book") return <svg aria-hidden="true" className={styles.cardIcon} viewBox="0 0 16 16" fill="none"><rect x="2.5" y="3" width="11" height="10.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" /><path d="M5 1.8v2.4M11 1.8v2.4M2.5 6.2h11M5.2 9h.1M8 9h.1M10.8 9h.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>;
  if (kind === "grow") return <svg aria-hidden="true" className={styles.cardIcon} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" /><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" /><path d="m10 6 3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>;
  return <svg aria-hidden="true" className={styles.cardIcon} viewBox="0 0 16 16" fill="none"><path d="m2.5 2.5 11 11M13.5 2.5l-11 11M4 2.5h-1.5V4M12 13.5h1.5V12M12 2.5h1.5V4M4 13.5h-1.5V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function StoreIcon({ platform }: { platform: "apple" | "android" }) {
  return platform === "apple" ? <svg aria-hidden="true" className={styles.storeIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M16.7 12.7c0-2.1 1.7-3.1 1.8-3.2-1-1.5-2.5-1.7-3-1.7-1.3-.1-2.5.8-3.1.8-.7 0-1.7-.8-2.8-.8-1.5 0-2.8.9-3.6 2.2-1.5 2.7-.4 6.7 1.1 8.9.8 1.1 1.6 2.3 2.8 2.2 1.2 0 1.6-.7 3.1-.7 1.4 0 1.8.7 3.1.7 1.3 0 2.1-1.1 2.8-2.2.8-1.3 1.2-2.5 1.2-2.6-.1 0-3.4-1.3-3.4-3.6ZM14.7 6.5c.6-.7 1-1.7.9-2.7-.9 0-2 .6-2.7 1.3-.6.7-1.1 1.7-.9 2.6 1 .1 2-.5 2.7-1.2Z" /></svg> : <svg aria-hidden="true" className={styles.storeIcon} viewBox="0 0 24 24" fill="none"><path d="M7 9.5 5.4 6.7M17 9.5l1.6-2.8M7.3 6.8 5.9 4.5M16.7 6.8l1.4-2.3M5 10.5h14v7.3c0 .7-.5 1.2-1.2 1.2H6.2c-.7 0-1.2-.5-1.2-1.2v-7.3ZM8.2 13h.1M15.7 13h.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M7 9.5c.3-2.2 2.2-3.8 5-3.8s4.7 1.6 5 3.8H7Z" stroke="currentColor" strokeWidth="1.5" /></svg>;
}

function Button({ href, children, inverse = false }: { href: string; children: ReactNode; inverse?: boolean }) {
  return (
    <a className={`${styles.button} ${inverse ? styles.buttonInverse : ""}`} href={href}>
      {children} <Arrow />
    </a>
  );
}

function Kicker({ children, lime = false }: { children: ReactNode; lime?: boolean }) {
  return <p className={`${styles.kicker} ${lime ? styles.kickerLime : ""}`}>{children}</p>;
}

/**
 * THESIS: Drift is a weekly tennis ritual, not a generic app pitch.
 * OWN-WORLD: dark evergreen courts, chalk-white type, acid-lime actions and Outfit.
 * STORY: visitors see how a match becomes a season, then join the waitlist.
 * FIRST VIEWPORT: full-bleed court photography with a left-aligned action stack.
 * FORM: Pen's staged, full-width editorial landing page; source-export fidelity leads.
 */
export function PreviewLandingPage({ locale }: LandingPageProps) {
  const waitlist = waitlistUrl(locale);
  const rootRef = useRef<HTMLElement>(null);
  const [heroSlide, setHeroSlide] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const interval = window.setInterval(() => {
      setHeroSlide((current) => (current + 1) % heroImages.length);
    }, 6500);

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
          {heroImages.map((image, index) => (
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
            <span className={styles.brandBall} aria-hidden="true" />
            <span>DRIFT</span>
          </a>
          <nav className={styles.nav} aria-label="Primary navigation">
            <a href="#play">FOR PLAYERS</a>
            <a href="#clubs">FOR CLUBS</a>
            <a href="#training">FOR COACHES</a>
          </nav>
          <a className={styles.appLink} href="#download">GET THE APP <Arrow /></a>
        </header>
        <div className={`${styles.inner} ${styles.heroContent}`}>
          <Kicker lime>TENNIS, IN MOTION</Kicker>
          <h1>Your next rally starts here.</h1>
          <p>Meet better players, book beautiful courts, and keep your game moving — all in one place.</p>
          <div className={styles.heroActions}>
            <Button href={waitlist}>START PLAYING</Button>
            <a className={styles.textAction} href="#clubs"><BuildingIcon /> FOR CLUBS / COACHES</a>
          </div>
          <p className={styles.online}><span /> 1,240 players looking for a match now</p>
        </div>
      </section>

      <section className={`${styles.about} ${styles.lightBand}`}>
        <div className={styles.inner}>
          <div className={styles.aboutTop}>
            <div>
              <Kicker lime>ABOUT DRIFT</Kicker>
              <h2>A season, not a scramble.</h2>
              <p>Drift started with a simple frustration: finding a good match takes more effort than playing one. So we built the whole loop into one app - find an opponent at your level, agree a court and a time, play, and confirm the result together. Tennis leads, padel runs on the same rails.</p>
            </div>
            <div className={`${styles.photoPanel} ${styles.aboutPhoto}`} />
          </div>
          <div className={styles.aboutBottom}>
            <div className={styles.statsRow}>
              <div><strong>2</strong><span>SPORTS, ONE RATING</span></div>
              <div><strong>5</strong><span>STAGE SEASON LOOP</span></div>
              <div><strong>Free</strong><span>WHILE WE GET GOING</span></div>
              <div><strong>Padel</strong><span>FOLLOWING TENNIS</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className={`${styles.proof} ${styles.deepBand}`}>
        <div className={`${styles.inner} ${styles.proofGrid}`}>
          <div className={styles.proofCopy}>
            <Kicker lime>ONE APP. EVERY MATCH.</Kicker>
            <h2>Find the people who make you play more.</h2>
            <p>Drift turns a spare hour into a great match. Discover players at your level, join a local court, and let the good games happen.</p>
            <div className={styles.proofStats}><span><b>4.9</b> APP RATING</span><span><b>24k</b> ACTIVE PLAYERS</span></div>
          </div>
          <div className={styles.liveCard} aria-label="Illustrative live match card">
            <div className={styles.liveTop}><strong>DRIFT / PLAY NOW</strong><span><i /> 18 NEARBY</span></div>
            <div className={styles.matchCard}>
              <div className={styles.playerDetails}>
                <span>TODAY | 6:30 PM</span>
                <h3>Sunset Rally</h3>
                <p>Riverside Club | Intermediate</p>
                <button type="button">JOIN MATCH <Arrow /></button>
              </div>
              <div className={styles.courtPreview}><span /><i /></div>
            </div>
          </div>
        </div>
      </section>

      <section className={`${styles.playbook} ${styles.lightBand}`} id="play">
        <div className={styles.inner}>
          <div className={styles.sectionIntro}>
            <Kicker>THE DRIFT PLAYBOOK</Kicker>
            <h2>More ways to show up for the game.</h2>
            <p>From an easy Tuesday hit to your new doubles crew, Drift makes the tennis you want to play feel effortless.</p>
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
        <div className={styles.clubsPhotoShade} aria-hidden="true" />
        <div className={`${styles.inner} ${styles.clubsCopy}`}>
          <Kicker lime>YOUR HOME COURT</Kicker>
          <h2>Clubs that feel like a second home.</h2>
          <p>Explore courts, coaching, drop-ins, and the people who are always up for one more set.</p>
          <a className={styles.clubsAction} href="#clubs">EXPLORE CLUBS <Arrow /></a>
        </div>
        <div className={styles.featuredClub}><span>FEATURED CLUB</span><strong>NORTHSIDE TENNIS CLUB</strong><small>12 courts | Open until 10 PM</small></div>
      </section>

      <section className={`${styles.community} ${styles.darkBand}`} id="community">
        <div className={`${styles.inner} ${styles.communityGrid}`}>
          <div className={styles.communityHeader}>
            <Kicker lime>THE DRIFT EFFECT</Kicker>
            <h2>Made for the people who stay for one more set.</h2>
          </div>
          <blockquote><span>&quot;</span>Drift changed my city from a list of courts into a community of people I actually want to play with.</blockquote>
          <p className={styles.quoteBy}>MAYA R. | DRIFT MEMBER, LONDON</p>
          <div className={styles.communityStats}><span><b>48k+</b>MATCHES MADE</span><span><b>92%</b>COME BACK WEEKLY</span><span><b>36</b>CITIES IN PLAY</span></div>
          <div className={styles.communityPhoto} />
        </div>
      </section>

      <section className={`${styles.events} ${styles.lightBand}`}>
        <div className={styles.inner}>
          <div className={styles.eventsHeader}><div><Kicker>THIS WEEK ON DRIFT</Kicker><h2>Make your next rally a plan.</h2></div><a href="#download">VIEW CALENDAR <Arrow /></a></div>
          <div className={styles.eventGrid}>
            {events.map(([date, title, detail, image]) => <article key={title} className={styles.eventCard}><div className={styles[image]} /><div><span>{date.replace(" | ", " · ")}</span><h3>{title}</h3><p>{detail.replace(" | ", " · ")}</p><a href="#download" aria-label={`View ${title}`}><Arrow /></a></div></article>)}
          </div>
        </div>
      </section>

      <section className={styles.training} id="training">
        <div className={styles.trainingPhoto} aria-hidden="true" />
        <div className={styles.trainingPhotoShade} aria-hidden="true" />
        <div className={styles.trainingBadge}>COACH-LED, NOT FEED-LED</div>
        <div className={`${styles.inner} ${styles.trainingCopy}`}>
          <Kicker lime>GET BETTER, TOGETHER</Kicker>
          <h2>Find coaches who speak your game.</h2>
          <p>Book small-group sessions, get personal feedback, and turn your next hour on court into real progress.</p>
          <div className={styles.benefitRow}><span><b>1:1</b>Private drills</span><span><b>SMALL</b>Squads of 4</span><span><b>LOCAL</b>Verified coaches</span></div>
        </div>
      </section>

      <section className={`${styles.loop} ${styles.lightBand}`} id="loop">
        <div className={styles.inner}>
          <p className={styles.loopIntro}>ONE LOOP. FIVE STAGES. BACK IN PLAY EVERY WEEK.</p>
          <ol>{loopSteps.map(([number, title, detail]) => <li key={title}><span>{number}</span><h3>{title}</h3><p>{detail}</p></li>)}</ol>
        </div>
      </section>

      <section className={styles.admin} id="admin">
        <div className={styles.adminPhoto} aria-hidden="true" />
        <div className={styles.adminPhotoShade} aria-hidden="true" />
        <div className={`${styles.inner} ${styles.adminCopy}`}>
          <Kicker lime>FOR CLUBS & ACADEMIES</Kicker>
          <h2>Run your club without the spreadsheet.</h2>
          <p>Create leagues and seasons, generate fixtures, settle disputes from a real queue, keep members and announcements in one place, and keep your courts discoverable.</p>
          <div className={styles.adminFeatures}><span><b>LEAGUES</b>Fixtures & disputes</span><span><b>MEMBERS</b>Roles & invites</span><span><b>COURTS</b>Listings & verification</span></div>
        </div>
      </section>

      <section className={`${styles.standings} ${styles.deepBand}`} id="standings">
        <div className={`${styles.inner} ${styles.standingsGrid}`}>
          <div><Kicker lime>COMPETE</Kicker><h2>Standings that mean something.</h2><p>Real leagues have registration windows, automatic round-robin pairing, fixtures, a rating you can trust, and snapshots that remember how you moved.</p></div>
          <div className={styles.tableWrap}>
            <div className={styles.tableTop}><b>SATURDAY LEAGUE | ROUND 6</b><span>LIVE TABLE</span></div>
            <table><thead><tr><th>#</th><th>PLAYER</th><th>P</th><th>W</th><th>L</th><th>RATING</th><th>FORM</th></tr></thead><tbody>{standings.map(([rank, player, played, won, lost, rating, form]) => <tr key={player}><td>{rank}</td><td>{player}</td><td>{played}</td><td>{won}</td><td>{lost}</td><td>{rating}</td><td>{form.map((win, index) => <i className={win ? styles.win : styles.loss} key={index} />)}</td></tr>)}</tbody></table>
          </div>
        </div>
      </section>

      <section className={`${styles.connection} ${styles.lightBand}`} id="connection">
        <div className={`${styles.inner} ${styles.connectionGrid}`}>
          <div><Kicker>CONNECT</Kicker><h2>Your tennis life, in one place.</h2><p>Connections, match messages, club announcements and tennis news—with the official channel separate from the group-chat noise.</p></div>
          <div className={styles.connectionList}>
            <article><div><h3>Messaging that stays in context</h3><span>MATCH THREADS</span></div><p>Every match gets its own thread, and every state change lands in it as a clear system message.</p></article>
            <article><div><h3>Clubs & announcements</h3><span>CLUB FEED</span></div><p>Follow official club updates without drowning out casual chat.</p></article>
            <article><div><h3>Tennis news, categorised</h3><span>NEWS FEED</span></div><p>Pro, players, tournaments, local clubs and community - summarised with attribution.</p></article>
          </div>
        </div>
      </section>

      <section className={`${styles.assessment} ${styles.lightBand}`} id="assessment">
        <div className={`${styles.inner} ${styles.assessmentGrid}`}>
          <div><span className={styles.sectionNumber}>01</span><h2>Find your level. Find your people.</h2><p>A short, honest assessment places you on a 1.0–7.0 scale. Discovery stays beginner-safe by only introducing you to players you can actually rally with.</p></div>
          <div className={styles.assessmentPhoto} />
          <div className={styles.assessmentBenefits}><span><b>ADAPTIVE ASSESSMENT</b>Thirteen questions estimate your level and skill breakdown. Adjust it if the result misses.</span><span><b>PRIVACY-FIRST</b>Filter by level, distance, format and availability - exact locations and contact details stay private.</span><span><b>COURTS NEARBY</b>Surface, lighting, booking type and verified club details in one useful court finder.</span></div>
        </div>
      </section>

      <section className={`${styles.skillProgress} ${styles.darkBand}`} id="skills">
        <div className={styles.inner}>
          <div className={styles.sectionIntro}><Kicker lime>IMPROVE WITH A REAL BASELINE</Kicker><h2>Know what to practise on Tuesday.</h2><p>Your rating says how you compete; your skill profile says why. Drift keeps both and points your practice at the weakest one.</p></div>
          <div className={styles.skillCards}><article><span className={styles.skillBadge}>SEVEN PILLARS</span><h3>A real skill profile</h3><p>Serve, forehand, backhand, return, net, movement and match play - blended from your assessment baseline and logged practice.</p></article><article><span className={styles.skillBadge}>LEARNING CENTRE</span><h3>Lessons, drills, plans</h3><p>Recommendations matched to your level and weakest skill, sequenced into a plan you can actually follow.</p></article><article><span className={styles.skillBadge}>MILESTONES</span><h3>Goals with honest progress</h3><p>Set a target, get milestones, and a status that compares your real pace to the plan.</p></article></div>
        </div>
      </section>

      <section className={`${styles.rules} ${styles.lightBand}`} id="rules">
        <div className={`${styles.inner} ${styles.rulesGrid}`}>
          <div><Kicker>YOUR SEASON, AT A GLANCE</Kicker><h2>A format that keeps results honest.</h2><p>Real fixtures, real confirmations and clear movement - without the admin circus.</p></div>
          <div className={styles.ruleList}><article><b>01</b><div><h3>AUTOMATIC FIXTURES</h3><p>Round-robin fixtures are generated per season and land on your calendar when the round opens.</p></div></article><article><b>02</b><div><h3>CONFIRMED RESULTS</h3><p>Opponent-confirmed results; disputes remain in a real queue until they are settled.</p></div></article><article><b>03</b><div><h3>STANDINGS WITH HISTORY</h3><p>Round-closed standings snapshots make every movement arrow next to your name earned, not decorative.</p></div></article></div>
        </div>
      </section>

      <section className={styles.faq} id="faq"><div className={styles.inner}><Kicker>FAQ</Kicker><h2>Questions, answered.</h2><p>A few helpful details before you join the community and play your next match.</p><div className={styles.faqGrid}>{["Is Drift free to join?", "How does matching work?", "Can I play in a club league?", "When will the app be available?"].map((question) => <details key={question}><summary>{question}<span>⌄</span></summary><p>We are building Drift to make local tennis simpler, more social, and easier to keep playing.</p></details>)}</div></div></section>

      <section className={styles.download} id="download"><div className={styles.inner}><Kicker lime>GET THE APP</Kicker><h2>Play your first match this week.</h2><p>One app for finding opponents at your level, agreeing a court and a time, and keeping your season honest.</p><div className={styles.storeButtons}><a href={waitlist}><StoreIcon platform="apple" /><div><span>Download on the</span><b>App Store</b></div></a><a href={waitlist}><StoreIcon platform="android" /><div><span>Get it on</span><b>Google Play</b></div></a></div><small>Tennis first. Padel follows. Free to join while we get going.</small></div></section>

      <section className={styles.closing} id="closing"><div className={styles.inner}><div><h2>Your season starts with one match.</h2><p>Join the waitlist—Tennis first, Padel follows. We’ll let you know the moment Drift is live.</p></div><Button href={waitlist}>JOIN THE WAITLIST</Button></div></section>

      <footer className={styles.footer} id="footer"><div className={`${styles.inner} ${styles.footerGrid}`}><div><strong>DRIFT</strong><p>Find your next rally.</p></div><div><b>LEGAL</b><a href="/terms">Terms and Conditions</a><a href="/privacy-policy">Privacy Policy</a><a href="/data-privacy">Data Privacy Notice</a></div><div><b>CONTACT</b><a href="mailto:serve@driftsports.app">serve@driftsports.app</a></div></div><p className={`${styles.inner} ${styles.copyright}`}>© 2026 Drift Sports. Built for the next point.</p></footer>
    </main>
  );
}
