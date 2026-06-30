import type { CSSProperties, KeyboardEvent, MouseEvent, WheelEvent as ReactWheelEvent } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { projects, type Project } from "./data/projects";
import { BrickCanvas } from "./components/BrickCanvas";
import { BrickGrid, BrickThumb } from "./components/BrickGrid";
import { useStudGrid } from "./lib/heroGrid";
import heroBackground from "./assets/backgrounds/bkg4.gif";

type CssVars = CSSProperties & Record<`--${string}`, string | number>;
const RAIL_STEP = 100;
const RAIL_SNAP_THRESHOLD = 58;
const RAIL_DRAG_RESISTANCE = 0.48;

function navigateTo(path: string) {
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

type PortfolioProps = {
  isProjects: boolean;
  onOpenProject: (project: Project) => void;
};

// One persistent shell for both routes. The stud grid, wire frame, vignette and
// nav are measured and drawn ONCE; navigating between home and projects never
// redraws the wires. Instead the content is split into a background layer (the
// mosaic, which sits under the frame) and a foreground layer (text / catalogue,
// above the frame), and the layers for the two routes cross-fade — so the frame
// stays put while only what fills it swaps.
function Portfolio({ isProjects, onOpenProject }: PortfolioProps) {
  const heroRef = useRef<HTMLElement | null>(null);
  const linksRef = useRef<HTMLElement | null>(null);
  const grid = useStudGrid(heroRef);

  // First-load choreography (once): when the grid resolves so the wires land on
  // their real positions, flip on `is-intro-ready` to play the staged wire-draw
  // + fade-up. Guarded so a resize re-measure — or a later route change — never
  // replays it; from then on the frame persists and routes just cross-fade.
  const [introReady, setIntroReady] = useState(false);
  const introPlayedRef = useRef(false);
  useEffect(() => {
    if (introPlayedRef.current || !grid) return;
    introPlayedRef.current = true;
    const id = requestAnimationFrame(() => setIntroReady(true));
    return () => cancelAnimationFrame(id);
  }, [grid]);

  // Fence off a wide right cell with the vertical divider and spread the three
  // links across it. The row spans the whole cell (divider -> right wire) and
  // `space-evenly` (see CSS) distributes all four gaps equally: divider -> home,
  // home -> work, work -> projects, projects -> right wire are the same.
  const [navWireX, setNavWireX] = useState<number | null>(null);
  const [navWidth, setNavWidth] = useState<number | null>(null);
  useLayoutEffect(() => {
    const measure = () => {
      const links = linksRef.current;
      if (!links || !grid?.frame || !grid.size) return;

      // Intrinsic word width — stable even once we widen the row, since
      // space-evenly grows the gaps, not the words themselves.
      let textWidth = 0;
      for (let i = 0; i < links.children.length; i += 1) {
        textWidth += (links.children[i] as HTMLElement).offsetWidth;
      }

      // Pick a comfortable gap; the cell holds the words plus four of them. Place
      // the divider that far left of the right wire, snapped to a stud seam, then
      // size the row to span the whole cell so the even spacing lands exactly.
      const gap = Math.max(22, Math.min(56, grid.frame.rightPx * 0.03));
      const desiredLeft = grid.frame.rightPx - (textWidth + 4 * gap);
      const seamIndex = Math.floor((desiredLeft - grid.frame.leftPx) / grid.size);
      const wireX = grid.frame.leftPx + seamIndex * grid.size;
      setNavWireX(Math.round(wireX));
      setNavWidth(Math.round(grid.frame.rightPx - wireX));
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (linksRef.current) observer.observe(linksRef.current);
    if (heroRef.current) observer.observe(heroRef.current);
    document.fonts?.ready.then(measure);
    return () => observer.disconnect();
  }, [grid]);

  // The projects route is a stage + index rail: one active project shown large on
  // the left, every project listed on the right. Defaults to 01 on load.
  const [activeIndex, setActiveIndex] = useState(0);
  const [railOffset, setRailOffset] = useState(0);
  const [isRailScrolling, setIsRailScrolling] = useState(false);
  const activeProject = projects[activeIndex];
  const railRef = useRef<HTMLElement | null>(null);
  const railOffsetRef = useRef(0);
  const railDragRef = useRef(0);
  const railWheelResetRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (railWheelResetRef.current != null) {
        window.clearTimeout(railWheelResetRef.current);
      }
    };
  }, []);

  const snapToProject = (index: number, focus = false) => {
    const next = Math.min(projects.length - 1, Math.max(0, index));
    const offset = next * RAIL_STEP;
    railDragRef.current = 0;
    railOffsetRef.current = offset;
    setRailOffset(offset);
    setActiveIndex(next);

    if (focus) {
      const buttons = railRef.current?.querySelectorAll<HTMLButtonElement>("button");
      buttons?.[next]?.focus();
    }
  };

  // Up/Down move the active project and carry focus with them; tab + enter on the
  // individual buttons works on its own.
  const onRailKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const dir = event.key === "ArrowDown" ? 1 : -1;
    snapToProject(activeIndex + dir, true);
  };

  const onRailWheel = (event: ReactWheelEvent<HTMLElement>) => {
    if (event.ctrlKey) return;
    event.preventDefault();
    event.stopPropagation();

    const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaMode === 2 ? event.deltaY * 80 : event.deltaY;
    railDragRef.current += delta;

    const baseOffset = activeIndex * RAIL_STEP;
    const maxOffset = (projects.length - 1) * RAIL_STEP;
    const edgeResistance =
      (activeIndex === 0 && railDragRef.current < 0) ||
      (activeIndex === projects.length - 1 && railDragRef.current > 0)
        ? 0.22
        : RAIL_DRAG_RESISTANCE;
    const visualOffset = Math.min(
      maxOffset,
      Math.max(0, baseOffset + railDragRef.current * edgeResistance)
    );
    railOffsetRef.current = visualOffset;
    setRailOffset(visualOffset);
    setIsRailScrolling(true);

    if (railWheelResetRef.current != null) {
      window.clearTimeout(railWheelResetRef.current);
    }
    railWheelResetRef.current = window.setTimeout(() => {
      const drag = railDragRef.current;
      const snappedIndex =
        Math.abs(drag) >= RAIL_SNAP_THRESHOLD
          ? activeIndex + (drag > 0 ? 1 : -1)
          : activeIndex;
      railWheelResetRef.current = null;
      setIsRailScrolling(false);
      snapToProject(snappedIndex);
    }, 120);
  };

  // Position the wire box + the text on the exact stud lines the grid resolved,
  // so the frame and the studs share boundaries. Falls back to the CSS defaults
  // for the first paint before the grid is measured.
  const f = grid?.frame;
  const frameVars: CssVars | undefined = f
    ? {
        "--wire-top": `${f.topPx}px`,
        "--wire-bottom": `${f.bottomPx}px`,
        "--wire-left": `${f.leftPx}px`,
        "--wire-right": `${f.rightPx}px`,
        "--wire-right-inset": `${f.rightInsetPx}px`,
        "--wire-bottom-inset": `${f.bottomInsetPx}px`
      }
    : undefined;

  // The wire box is shared with the hero and never moves: the stage spans from the
  // left wire to the same nav divider the hero measured, and the index rail
  // occupies the cell beyond it. Both start under the nav-band.
  const fieldStyle: CSSProperties | undefined =
    f && navWireX != null
      ? { left: `${f.leftPx}px`, width: `${navWireX - f.leftPx}px` }
      : undefined;
  const railStyle: CSSProperties | undefined =
    f && navWireX != null
      ? { left: `${navWireX}px`, width: `${f.rightPx - navWireX}px` }
      : undefined;
  const railTapeStyle = {
    ...(railStyle ?? {}),
    "--rail-offset": `${railOffset}px`
  } as CssVars;

  return (
    <section
      className={`hero${isProjects ? " is-projects" : " is-home"} is-intro${introReady ? " is-intro-ready" : ""}`}
      ref={heroRef}
      style={frameVars}
    >
      {/* BACKGROUND layer (under the frame): the mosaic. Home only — on projects
          it fades out, leaving the black field the wire box carves up. */}
      <div className={`page-bg${isProjects ? "" : " is-active"}`} aria-hidden={isProjects}>
        <BrickCanvas src={heroBackground} grid={grid} focalY={0.22} mediaDarken={0.28} active={!isProjects} />
      </div>

      {/* PERSISTENT wire box (drawn once, shared by both routes). Two layers: the
          extension layer sweeps in full-bleed across the black border during the
          load-in, then dissolves; the core layer is the bounded square that stays.
          The is-nav-down wire drops just left of the nav links, fencing the right
          cell. */}
      <div className="hero-frame" aria-hidden="true">
        <span className="frame-line is-ext is-top" />
        <span className="frame-line is-ext is-bottom" />
        <span className="frame-line is-ext is-left" />
        <span className="frame-line is-ext is-right" />
        <span className="frame-line is-ext is-nav-under" />
        {navWireX != null && (
          <span className="frame-line is-ext is-nav-down" style={{ left: `${navWireX}px` }} />
        )}

        <span className="frame-line is-core is-top" />
        <span className="frame-line is-core is-bottom" />
        <span className="frame-line is-core is-left" />
        <span className="frame-line is-core is-right" />
        <span className="frame-line is-core is-nav-under" />
        {navWireX != null && (
          <span className="frame-line is-core is-nav-down" style={{ left: `${navWireX}px` }} />
        )}
      </div>

      {/* PERSISTENT top strip: section links, right-aligned. The active link
          tracks the route; the strip itself never re-fades after the intro. */}
      <header className="hero-nav">
        <nav
          className="hero-links"
          ref={linksRef}
          style={navWidth != null ? { width: `${navWidth}px` } : undefined}
        >
          <a
            href="/"
            className={isProjects ? undefined : "is-active"}
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
            className={isProjects ? "is-active" : undefined}
            onClick={(event) => {
              event.preventDefault();
              navigateTo("/projects");
            }}
          >
            projects
          </a>
        </nav>
      </header>

      {/* FOREGROUND home layer (above the frame): name, tagline, socials,
          location. Cross-fades with the projects layer below. */}
      <div className={`page-fg page-home${isProjects ? "" : " is-active"}`} aria-hidden={isProjects}>
        <div className="hero-content">
          <h1 className="hero-name">Eugene Lee</h1>
          <p className="hero-tagline">
            I study Software Engineering at the University of Waterloo. I'm interested in hard problems and algorithms. My current work at Eureka DevSecOps revolves around building agents for automated code vulnerability remediation.
          </p>
          <div className="hero-socials">

            Feel free to connect with me through:
            <a href="https://github.com/eu-lee" target="_blank" rel="noreferrer" aria-label="GitHub">
              {ICONS.github}
            </a>
            <a href="https://www.linkedin.com/in/eu-lee/" target="_blank" rel="noreferrer" aria-label="LinkedIn">
              {ICONS.linkedin}
            </a>
            <a href="mailto:eugene.lee@uwaterloo.ca" aria-label="Email">
              {ICONS.mail}
            </a>
          </div>
        </div>

        <span className="hero-loc">
          <span className="hero-loc-place">
            {ICONS.pin}
            Vancouver
          </span>
          <span>BC, Canada</span>
        </span>
      </div>

      {/* FOREGROUND projects layer (above the frame): the LEFT stage (the active
          project, large) and the RIGHT index rail (every project, navigable). */}
      <div className={`page-fg page-projects${isProjects ? " is-active" : ""}`} aria-hidden={!isProjects}>
        <div className="projects-stage" style={fieldStyle}>
          <div className="stage-cover">
            {activeProject.cover ? (
              <img src={activeProject.cover} alt={`${activeProject.title} cover`} />
            ) : (
              <BrickGrid type={activeProject.board} width={24} height={12} />
            )}
          </div>

          <div className="stage-meta">
            <div className="stage-top">
              <span className="stage-num">{String(activeIndex + 1).padStart(2, "0")}</span>
              {activeProject.links?.[0] ? (
                <a
                  className="stage-kind"
                  style={{ color: `var(--${activeProject.accent})` }}
                  href={activeProject.links[0].href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {activeProject.kind}
                </a>
              ) : (
                <span className="stage-kind" style={{ color: `var(--${activeProject.accent})` }}>
                  {activeProject.kind}
                </span>
              )}
            </div>
            <h1 className="stage-title">{activeProject.title}</h1>
            <p className="stage-sub">{activeProject.subtitle}</p>
            <div className="stage-stack">
              {activeProject.stack.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>
        </div>

        <nav
          className={`projects-rail${isRailScrolling ? " is-scrolling" : ""}`}
          style={railTapeStyle}
          ref={railRef}
          onKeyDown={onRailKeyDown}
          onWheel={onRailWheel}
          aria-label="Project index"
        >
          <div className="projects-rail-track">
            {projects.map((project, index) => (
              <button
                key={project.id}
                type="button"
                className={`rail-item${index === activeIndex ? " is-active" : ""}`}
                aria-current={index === activeIndex}
                onClick={() => snapToProject(index)}
              >
                <span className="rail-row">
                  <span className="rail-thumb">
                    {project.cover ? (
                      <img src={project.cover} alt="" />
                    ) : (
                      <BrickThumb type={project.board} width={12} height={8} />
                    )}
                  </span>
                  <span className="rail-copy">
                    <span className="rail-heading">
                      <span className="rail-name">{project.title}</span>
                    </span>
                    <span className="rail-summary">{project.summary}</span>
                  </span>
                </span>
              </button>
            ))}
          </div>
        </nav>
      </div>
    </section>
  );
}

type ProjectDialogProps = {
  project: Project | null;
  onClose: () => void;
};

function ProjectDialog({ project, onClose }: ProjectDialogProps) {
  if (!project) return null;
  const links = project.links ?? [];

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="project-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-dialog-title"
        onMouseDown={(event: MouseEvent) => event.stopPropagation()}
      >
        <button className="dialog-close" type="button" aria-label="Close project details" onClick={onClose}>
          ×
        </button>
        <div className="dialog-hero" style={{ "--accent": `var(--${project.accent})` } as CssVars}>
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
          {links.length > 0 && (
            <div className="dialog-links">
              {links.map((link) => (
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
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
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
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey) event.preventDefault();
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);

  const isProjectsPage = path === "/projects";

  return (
    <>
      <main className={isProjectsPage ? "app-shell projects-shell" : "app-shell home-shell"}>
        <Portfolio isProjects={isProjectsPage} onOpenProject={setSelectedProject} />
      </main>
      <ProjectDialog project={selectedProject} onClose={() => setSelectedProject(null)} />
    </>
  );
}
