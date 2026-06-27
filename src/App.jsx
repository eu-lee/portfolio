import { useEffect, useMemo, useRef, useState } from "react";
import { filters, projects } from "./data/projects.js";
import { BrickCanvas } from "./components/BrickCanvas.jsx";
import { BrickGrid } from "./components/BrickGrid.jsx";
import { Nameplate } from "./components/Nameplate.jsx";
import { ProjectCard } from "./components/ProjectCard.jsx";
import { useStudGrid } from "./lib/heroGrid.js";
import heroBackground from "./assets/backgrounds/bkg.jpg";

function navigateTo(path) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function Hero() {
  // Measure the hero once and resolve the stud grid here; both the canvas and
  // the nameplate consume the same grid so they can't round onto different
  // layouts (which is what made the plate drift off the studs under zoom).
  const heroRef = useRef(null);
  const grid = useStudGrid(heroRef);

  return (
    <section className="hero" ref={heroRef}>
      <BrickCanvas src={heroBackground} grid={grid} />
      <Nameplate grid={grid} onNavigate={navigateTo} />
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
