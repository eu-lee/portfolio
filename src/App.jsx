import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { filters, projects } from "./data/projects.js";
import { BrickCanvas } from "./components/BrickCanvas.jsx";
import { BrickGrid } from "./components/BrickGrid.jsx";
import { ProjectCard } from "./components/ProjectCard.jsx";
import { useStudGrid } from "./lib/heroGrid.js";
import heroBackground from "./assets/backgrounds/bkg4.gif";

function navigateTo(path) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

const ICONS = {
  pin: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  github: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58l-.02-2.05c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.96 0-1.32.47-2.39 1.24-3.23-.13-.3-.54-1.53.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.25 2.88.12 3.18.77.84 1.24 1.91 1.24 3.23 0 4.63-2.81 5.65-5.49 5.95.43.37.82 1.1.82 2.22l-.01 3.29c0 .32.21.7.82.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z" />
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
    </svg>
  ),
  mail: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </svg>
  )
};

function Hero() {
  const heroRef = useRef(null);
  const linksRef = useRef(null);
  const grid = useStudGrid(heroRef);

  // The nav links are right-aligned, so their left edge depends on the text
  // width (and the font once it loads). Measure it so the vertical wire can sit
  // just to the left of the first link ("home"), running down through the frame.
  const [navWireX, setNavWireX] = useState(null);
  const [navShiftX, setNavShiftX] = useState(0);
  useLayoutEffect(() => {
    const measure = () => {
      const links = linksRef.current;
      const hero = heroRef.current;
      if (!links || !hero) return;
      const linksLeft = links.offsetLeft;
      const linksRight = links.offsetLeft + links.offsetWidth;
      // Start with a balanced text-based position, then snap it to the seam on
      // the left edge of that stud so the divider doesn't cut through a brick.
      const gap = grid?.frame ? grid.frame.rightPx - linksRight : 16;
      const targetX = linksLeft - gap;
      if (grid?.frame && grid.size) {
        const seamIndex = Math.floor((targetX - grid.frame.leftPx) / grid.size);
        const wireX = grid.frame.leftPx + seamIndex * grid.size;
        const leftGap = linksLeft - wireX;
        const rightGap = grid.frame.rightPx - linksRight;
        setNavWireX(Math.round(wireX));
        setNavShiftX(Math.round((rightGap - leftGap) / 2));
      } else {
        setNavWireX(Math.round(targetX));
        setNavShiftX(0);
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (linksRef.current) observer.observe(linksRef.current);
    if (heroRef.current) observer.observe(heroRef.current);
    document.fonts?.ready.then(measure);
    return () => observer.disconnect();
  }, [grid]);

  // Position the wire box + the text on the exact stud lines the grid resolved,
  // so the frame and the studs share boundaries. Falls back to the CSS defaults
  // for the first paint before the grid is measured.
  const f = grid?.frame;
  const frameVars = f
    ? {
        "--wire-top": `${f.topPx}px`,
        "--wire-bottom": `${f.bottomPx}px`,
        "--wire-left": `${f.leftPx}px`,
        "--wire-right": `${f.rightPx}px`,
        "--wire-right-inset": `${f.rightInsetPx}px`,
        "--wire-bottom-inset": `${f.bottomInsetPx}px`
      }
    : undefined;

  return (
    <section className="hero" ref={heroRef} style={frameVars}>
      <BrickCanvas src={heroBackground} grid={grid} focalY={0.22} mediaDarken={0.28} />

      {/* White wire box on the inner frame edges, extending out across the black
          border to the screen edges. The is-nav-down wire drops from the top just
          left of the nav links, dividing off the header's right cell. */}
      <div className="hero-frame" aria-hidden="true">
        <span className="frame-line is-top" />
        <span className="frame-line is-bottom" />
        <span className="frame-line is-left" />
        <span className="frame-line is-right" />
        {navWireX != null && (
          <span className="frame-line is-nav-down" style={{ left: `${navWireX}px` }} />
        )}
      </div>

      {/* Top strip: location on the left, section links on the right. */}
      <header className="hero-nav">
        <span className="hero-loc">
          {ICONS.pin}
          Vancouver, BC
        </span>
        <nav className="hero-links" ref={linksRef} style={{ transform: `translateX(${navShiftX}px)` }}>
          <a
            href="/"
            className="is-active"
            onClick={(event) => {
              event.preventDefault();
              navigateTo("/");
            }}
          >
            home
          </a>
          <a
            href="/projects"
            onClick={(event) => {
              event.preventDefault();
              navigateTo("/projects");
            }}
          >
            work
          </a>
          <a
            href="/projects"
            onClick={(event) => {
              event.preventDefault();
              navigateTo("/projects");
            }}
          >
            projects
          </a>
        </nav>
      </header>

      {/* Name, tagline and socials, anchored bottom-left over the pixels. */}
      <div className="hero-content">
        <h1 className="hero-name">Eugene Lee</h1>
        <p className="hero-tagline">
          I study Software Engineering at the University of Waterloo. I'm interested in hard problems and algorithms. I currently work at Eureka DevSecOps, where I work on agents for automated code vulnerability remediation.
        </p>
        <div className="hero-socials">

          Feel free to reach out:
          <a href="https://github.com/" target="_blank" rel="noreferrer" aria-label="GitHub">
            {ICONS.github}
          </a>
          <a href="https://www.linkedin.com/" target="_blank" rel="noreferrer" aria-label="LinkedIn">
            {ICONS.linkedin}
          </a>
          <a href="mailto:eugene.lee@uwaterloo.ca" aria-label="Email">
            {ICONS.mail}
          </a>
        </div>
      </div>
    </section>
  );
}

function Projects({ onOpenProject }) {
  const [activeFilter, setActiveFilter] = useState("all");
  const visibleProjects = useMemo(() => {
    if (activeFilter === "all") return projects;
    return projects.filter((project) => project.category === activeFilter);
  }, [activeFilter]);

  return (
    <section className="section projects-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Selected work</p>
          <h2>Brick covers, real project details.</h2>
        </div>
        <a className="back-link" href="/" onClick={(event) => {
          event.preventDefault();
          navigateTo("/");
        }}>
          Home
        </a>
        <div className="filter-group" role="tablist" aria-label="Project filter">
          {filters.map((filter) => (
            <button
              className={`filter${activeFilter === filter.id ? " is-active" : ""}`}
              type="button"
              role="tab"
              aria-selected={activeFilter === filter.id}
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>
      <div className="project-grid">
        {visibleProjects.map((project) => (
          <ProjectCard key={project.id} project={project} onOpen={onOpenProject} />
        ))}
      </div>
    </section>
  );
}

function ProjectDialog({ project, onClose }) {
  if (!project) return null;

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="project-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="dialog-close" type="button" aria-label="Close project details" onClick={onClose}>
          ×
        </button>
        <div className="dialog-hero" style={{ "--accent": `var(--${project.accent})` }}>
          {project.cover ? (
            <img className="cover-image" src={project.cover} alt={`${project.title} cover`} />
          ) : (
            <BrickGrid type={project.board} width={24} height={9} />
          )}
        </div>
        <div className="dialog-content">
          <p className="eyebrow">{project.kind}</p>
          <h2 id="project-dialog-title">{project.title}</h2>
          {(project.description ?? [project.summary]).map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
          {project.links?.length > 0 && (
            <div className="dialog-links">
              {project.links.map((link) => (
                <a key={`${link.label}-${link.href}`} href={link.href} target="_blank" rel="noreferrer">
                  {link.label}
                </a>
              ))}
            </div>
          )}
          <div className="meta-list">
            {project.stack.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default function App() {
  const [selectedProject, setSelectedProject] = useState(null);
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Cancel the pinch-zoom gesture (trackpad pinch and Ctrl+wheel both arrive as
  // a wheel event with ctrlKey set). This blocks the blurry bitmap magnify
  // without touching keyboard/menu zoom, which stays available for
  // accessibility and reflows the studs crisply. Must be non-passive so
  // preventDefault takes effect.
  useEffect(() => {
    const onWheel = (event) => {
      if (event.ctrlKey) event.preventDefault();
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);

  const isProjectsPage = path === "/projects";

  return (
    <>
      <main className={isProjectsPage ? "app-shell projects-shell" : "app-shell home-shell"}>
        {isProjectsPage ? (
          <Projects onOpenProject={setSelectedProject} />
        ) : (
          <Hero />
        )}
      </main>
      <ProjectDialog project={selectedProject} onClose={() => setSelectedProject(null)} />
    </>
  );
}
