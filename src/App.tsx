import type { CSSProperties, KeyboardEvent, MouseEvent, ReactNode, UIEvent } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { projects, type Project } from "./data/projects";
import { BrickCanvas } from "./components/BrickCanvas";
import { useStudGrid } from "./lib/heroGrid";
import heroBackground from "../content/backgrounds/bkg4.gif";
import aboutMarkdown from "../content/about/index.md?raw";

type CssVars = CSSProperties & Record<`--${string}`, string | number>;

function navigateTo(path: string) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

type AboutBlock = {
  type: "heading" | "paragraph";
  text: string;
};

const aboutBlocks: AboutBlock[] = aboutMarkdown
  .trim()
  .split(/\n\s*\n/)
  .map((block) => {
    const text = block.replace(/\s+/g, " ").trim();
    return text.startsWith("# ")
      ? { type: "heading", text: text.replace(/^#\s+/, "") }
      : { type: "paragraph", text };
  });

const aboutAssets = import.meta.glob("../content/about/**/*.{svg,png,jpg,jpeg,gif,webp,avif}", {
  import: "default",
  eager: true,
}) as Record<string, string>;

function resolveAboutAsset(href: string): string {
  if (/^(https?:)?\/\//.test(href) || href.startsWith("/")) return href;
  const match = Object.entries(aboutAssets).find(([path]) => path.endsWith(`/content/about/${href}`));
  if (!match) {
    throw new Error(`About asset "${href}" not found in content/about/`);
  }
  return match[1];
}

function renderMarkdownInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const tokenPattern = /(!?)\[([^\]]+)]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(text))) {
    const [raw, imageMarker, label, href] = match;
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));

    if (imageMarker) {
      nodes.push(
        <img className="about-inline-icon" key={`${href}-${match.index}`} src={resolveAboutAsset(href)} alt={label} />
      );
    } else {
      const isInternal = href.startsWith("/");
      nodes.push(
        <a
          key={`${href}-${match.index}`}
          href={href}
          target={isInternal ? undefined : "_blank"}
          rel={isInternal ? undefined : "noreferrer"}
          onClick={
            isInternal
              ? (event) => {
                  event.preventDefault();
                  navigateTo(href);
                }
              : undefined
          }
        >
          {label}
        </a>
      );
    }

    lastIndex = match.index + raw.length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

const ICONS = {
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

type Route = "home" | "about" | "projects";

type PortfolioProps = {
  route: Route;
  onOpenProject: (project: Project) => void;
};

// One persistent shell for both routes. The stud grid, wire frame, vignette and
// nav are measured and drawn ONCE; navigating between home and projects never
// redraws the wires. Instead the content is split into a background layer (the
// mosaic, which sits under the frame) and a foreground layer (text / catalogue,
// above the frame), and the layers for the two routes cross-fade — so the frame
// stays put while only what fills it swaps.
function Portfolio({ route, onOpenProject }: PortfolioProps) {
  const isHome = route === "home";
  const isProjects = route === "projects";
  const isAbout = route === "about";
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
  // `space-evenly` (see CSS) distributes all four gaps equally across the nav cell.
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
      const hero = heroRef.current;
      const navPad = hero
        ? parseFloat(getComputedStyle(hero).getPropertyValue("--nav-pad")) || 0
        : 0;
      const desiredLeft = grid.frame.rightPx - (textWidth + 4 * gap + 2 * navPad);
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
  // the left, all projects listed on the right in FIXED positions. The rail is a native
  // scroller whose scrollable length comes from an invisible spacer, so it keeps
  // the momentum smoothness; the pinned list stays put and scroll PROGRESS maps to
  // which entry lights up + expands (and swaps the left stage). Defaults to 01.
  const [activeIndex, setActiveIndex] = useState(0);
  const activeProject = projects[activeIndex];
  const activeIndexRef = useRef(0);
  // Measured top offset that sits the stage thumbnail at the vertical middle of
  // the stage. It's a function of the stage height and the (content-independent)
  // thumbnail height only, so every project's thumbnail/title/metadata anchor to
  // the SAME spot; the description flows below and scrolls when it overflows.
  const stageRef = useRef<HTMLDivElement | null>(null);
  const coverRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const [stageLead, setStageLead] = useState(0);
  const [stageScrolled, setStageScrolled] = useState(false);
  const stageScrolledRef = useRef(false);
  const railRef = useRef<HTMLElement | null>(null);
  const railRafRef = useRef<number | null>(null);
  const projectButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  // Set while a click/keyboard selection is smooth-scrolling the rail. During
  // that glide the scroll sweeps past every entry in between; without this guard
  // updateActiveFromRail would flip activeIndex (and re-render the heavy stage
  // cover) for each one. We hold the target until the scroll lands on it.
  const railGlideRef = useRef(false);
  const railGlideTimer = useRef<number | null>(null);

  // Keep a ref mirror of the active index so the scroll/key handlers read the
  // latest value without being re-created (and re-bound) every render.
  activeIndexRef.current = activeIndex;

  useEffect(() => {
    return () => {
      if (railRafRef.current != null) cancelAnimationFrame(railRafRef.current);
      if (railGlideTimer.current != null) clearTimeout(railGlideTimer.current);
    };
  }, []);

  // Sit the project TITLE at the vertical middle of the stage by measuring, so
  // its resting position is identical for every project (independent of
  // description length). The offset pushes the block down until the title's
  // center lands on the stage's mid-line, discounting the stage's own top
  // padding, and is clamped to >= 0 so the thumbnail is never pulled above the
  // top (which would clip it un-scrollably). Re-measured whenever the projects
  // view is shown, the grid resolves, or anything resizes — the first mount reads
  // stale sizes (grid unresolved, layer laid out at defaults), so a one-shot
  // measure isn't enough. Zero-size reads are skipped so we never latch a bad 0.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const cover = coverRef.current;
    const title = titleRef.current;
    if (!stage || !cover || !title) return;
    const measure = () => {
      const H = stage.clientHeight;
      if (!H || !cover.offsetHeight) return;
      const padTop = parseFloat(getComputedStyle(stage).paddingTop) || 0;
      // Title-center distance from the top of the block, independent of the
      // current lead (both rects shift together, so their delta is stable).
      const coverTop = cover.getBoundingClientRect().top;
      const titleRect = title.getBoundingClientRect();
      const titleCenterFromBlockTop = titleRect.top + titleRect.height / 2 - coverTop;
      setStageLead(Math.max(0, Math.round(H / 2 - padTop - titleCenterFromBlockTop)));
    };
    measure();
    const raf = requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    observer.observe(cover);
    document.fonts?.ready.then(measure);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [isProjects, grid]);

  const syncStageScrolled = (scrollTop: number) => {
    const next = scrollTop > 2;
    if (next === stageScrolledRef.current) return;
    stageScrolledRef.current = next;
    setStageScrolled(next);
  };

  useEffect(() => {
    if (!isProjects) {
      syncStageScrolled(0);
      return;
    }
    syncStageScrolled(stageRef.current?.scrollTop ?? 0);
  }, [isProjects, activeIndex]);

  const onStageScroll = (event: UIEvent<HTMLDivElement>) => {
    syncStageScrolled(event.currentTarget.scrollTop);
  };

  // Map scroll progress (0 → top, 1 → bottom of the spacer) to the entry index.
  const updateActiveFromRail = () => {
    const rail = railRef.current;
    if (!rail) return;
    const max = rail.scrollHeight - rail.clientHeight;
    const progress = max > 0 ? Math.min(1, Math.max(0, rail.scrollTop / max)) : 0;
    const pos = progress * (projects.length - 1);
    const current = activeIndexRef.current;
    // During a click/keyboard glide, swallow the intermediate steps and only
    // release once the scroll has settled on the target (activeIndexRef).
    if (railGlideRef.current) {
      if (Math.round(pos) === current) railGlideRef.current = false;
      return;
    }
    // Hysteresis: hold the current entry until the scroll has moved DECISIVELY
    // toward a neighbour (past the midpoint + a dead zone). Without this, slow
    // scrolling that parks near the exact .5 boundary lets pixel-level jitter
    // toggle activeIndex back and forth — which flickers the rail highlight and
    // thrashes the heavy stage cover (a re-render per flip), the lag you saw.
    const DEAD_ZONE = 0.18;
    if (Math.abs(pos - current) <= 0.5 + DEAD_ZONE) return;
    const nextIndex = Math.round(pos);
    if (nextIndex !== current) setActiveIndex(nextIndex);
  };

  // rAF-throttled off the native scroll so the highlight glides with the momentum.
  const onRailScroll = (_event: UIEvent<HTMLElement>) => {
    if (railRafRef.current != null) return;
    railRafRef.current = requestAnimationFrame(() => {
      railRafRef.current = null;
      updateActiveFromRail();
    });
  };

  // Click / keyboard: scroll to the progress position for that entry; the native
  // smooth-scroll then drives updateActiveFromRail so the highlight tracks the glide.
  const selectProject = (index: number, focus = false) => {
    const next = Math.min(projects.length - 1, Math.max(0, index));
    setActiveIndex(next);
    const rail = railRef.current;
    if (rail && projects.length > 1) {
      const max = rail.scrollHeight - rail.clientHeight;
      // Lock out intermediate scroll updates for the duration of the glide so
      // the stage jumps straight to `next` instead of flipping through every
      // cover on the way. The timer is a fallback in case the scroll settles a
      // hair off the exact target and never trips the equality check.
      railGlideRef.current = true;
      if (railGlideTimer.current != null) clearTimeout(railGlideTimer.current);
      railGlideTimer.current = window.setTimeout(() => {
        railGlideRef.current = false;
      }, 700);
      rail.scrollTo({ top: (next / (projects.length - 1)) * max, behavior: "smooth" });
    }
    if (focus) projectButtonRefs.current[next]?.focus();
  };

  // Up/Down move the active project and carry focus with them; tab + enter on the
  // individual buttons works on its own.
  const onRailKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const dir = event.key === "ArrowDown" ? 1 : -1;
    selectProject(activeIndexRef.current + dir, true);
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
  // railStyle spans the divider -> right wire cell; shared by projects and about.
  const railStyle: CSSProperties | undefined =
    f && navWireX != null
      ? { left: `${navWireX}px`, width: `${f.rightPx - navWireX}px` }
      : undefined;

  return (
    <section
      className={`hero is-${route} is-intro${introReady ? " is-intro-ready" : ""}`}
      ref={heroRef}
      style={frameVars}
    >
      {/* BACKGROUND layer (under the frame): the full-bleed mosaic. Present and
          animating on EVERY route now — on projects and about a dim overlay (see
          .page-bg::after in CSS) drops it down so the text/catalogue reads cleanly,
          while home shows it at full brightness. */}
      <div className="page-bg is-active" aria-hidden={!isHome}>
        <BrickCanvas
          src={heroBackground}
          grid={grid}
          focalY={0.22}
          mediaDarken={0.28}
          active
          slowdown={isHome ? 1 : 3}
        />
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
          style={navWidth != null ? { width: `calc(${navWidth}px - (2 * var(--nav-pad)))` } : undefined}
        >
          <a
            href="/"
            className={isHome ? "is-active" : undefined}
            onClick={(event) => {
              event.preventDefault();
              navigateTo("/");
            }}
          >
            home
          </a>
          <a
            href="/about"
            className={isAbout ? "is-active" : undefined}
            onClick={(event) => {
              event.preventDefault();
              navigateTo("/about");
            }}
          >
            about
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

      {/* PERSISTENT contact row: anchored in the right column at the bottom of the
          shared frame, so it stays available on every route. */}
      <div className="hero-socials" style={railStyle}>
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

      {/* FOREGROUND home layer (above the frame): name and tagline. Cross-fades
          with the projects layer below. */}
      <div className={`page-fg page-home${isHome ? " is-active" : ""}`} aria-hidden={!isHome}>
        <div className="hero-content" style={fieldStyle}>
          <h1 className="hero-name">Eugene Lee</h1>
          <p className="hero-tagline">
            SE @ UWaterloo
          </p>
        </div>
      </div>

      {/* FOREGROUND projects layer (above the frame): the LEFT stage (the active
          project, large) and the RIGHT index rail (every project, navigable). */}
      <div className={`page-fg page-projects${isProjects ? " is-active" : ""}`} aria-hidden={!isProjects}>
        <div
          className="projects-stage"
          style={fieldStyle}
          ref={stageRef}
          onScroll={onStageScroll}
        >
          <div className="stage-inner" style={{ "--stage-lead": `${stageLead}px` } as CssVars}>
            {/* The media slot embeds a link-less YouTube player when the project
                has a video, otherwise the cover image, otherwise a placeholder. */}
            <div className="stage-cover" ref={coverRef}>
              {activeProject.video ? (
                <iframe
                  className="stage-video"
                  src={activeProject.video}
                  title={`${activeProject.title} video`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : activeProject.cover ? (
                <img src={activeProject.cover} alt={`${activeProject.title} cover`} />
              ) : (
                <div className="media-placeholder" aria-hidden="true" />
              )}
            </div>

            <div className="stage-meta">
              <h1 className="stage-title" ref={titleRef}>{activeProject.title}</h1>
              {activeProject.links && activeProject.links.length > 0 && (
                <div className="stage-links">
                  {activeProject.links.map((link) => (
                    <a
                      key={`${link.label}-${link.href}`}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              )}
              {activeProject.technologies && activeProject.technologies.length > 0 && (
                <ul className="stage-tech">
                  {activeProject.technologies.map((tech) => (
                    <li key={tech}>{tech}</li>
                  ))}
                </ul>
              )}
              {activeProject.description && activeProject.description.length > 0 && (
                <div className="stage-body">
                  {activeProject.description.map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div
          className={`projects-stage-fade${stageScrolled ? " is-visible" : ""}`}
          style={fieldStyle}
          aria-hidden="true"
        />

        <nav
          className="projects-rail"
          style={railStyle}
          ref={railRef}
          onKeyDown={onRailKeyDown}
          onScroll={onRailScroll}
          aria-label="Project index"
        >
          {/* Pinned list — the entries hold their positions while the spacer below
              provides the scroll length that drives which one lights up. */}
          <div className="projects-rail-track">
            {projects.map((project, index) => (
              <button
                ref={(node) => {
                  projectButtonRefs.current[index] = node;
                }}
                key={project.id}
                type="button"
                className={`rail-item${index === activeIndex ? " is-active" : ""}`}
                aria-current={index === activeIndex}
                onClick={() => selectProject(index)}
              >
                <span className="rail-row">
                  <span className="rail-thumb">
                    {project.thumbnail ? (
                      <img src={project.thumbnail} alt="" />
                    ) : (
                      <div className="media-placeholder" aria-hidden="true" />
                    )}
                  </span>
                  <span className="rail-copy">
                    <span className="rail-heading">
                      <span className="rail-name">{project.title}</span>
                      {project.dateLabel && (
                        <span className="rail-date">({project.dateLabel})</span>
                      )}
                    </span>
                    <span className="rail-summary">{project.summary}</span>
                  </span>
                </span>
              </button>
            ))}
          </div>
          <div
            className="projects-rail-spacer"
            style={{ height: `${(projects.length - 1) * 22}vh` }}
            aria-hidden="true"
          />
        </nav>
      </div>

      {/* FOREGROUND about layer (above the frame): a compact about page that uses
          the same left field + right rail geometry as projects. */}
      <div className={`page-fg page-about${isAbout ? " is-active" : ""}`} aria-hidden={!isAbout}>
        <section className="about-panel" style={fieldStyle} aria-label="About Eugene Lee">
          <div className="about-markdown">
            {aboutBlocks.map((block, index) =>
              block.type === "heading" ? (
                <h1 className="about-md-heading" key={`${block.type}-${index}`}>
                  {renderMarkdownInline(block.text)}
                </h1>
              ) : (
                <p className="about-md-paragraph" key={`${block.type}-${index}`}>
                  {renderMarkdownInline(block.text)}
                </p>
              )
            )}
          </div>
        </section>
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
        <div className="dialog-hero">
          {project.video ? (
            <iframe
              className="cover-video"
              src={project.video}
              title={`${project.title} video`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : project.cover ? (
            <img className="cover-image" src={project.cover} alt={`${project.title} cover`} />
          ) : (
            <div className="media-placeholder" aria-hidden="true" />
          )}
        </div>
        <div className="dialog-content">
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

  const route: Route =
    path === "/projects" ? "projects" : path === "/about" ? "about" : "home";
  const shellClass =
    route === "home" ? "app-shell home-shell" : `app-shell ${route}-shell`;

  return (
    <>
      <main className={shellClass}>
        <Portfolio route={route} onOpenProject={setSelectedProject} />
      </main>
      <ProjectDialog project={selectedProject} onClose={() => setSelectedProject(null)} />
    </>
  );
}
