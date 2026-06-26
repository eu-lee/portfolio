import { useEffect, useMemo, useState } from "react";
import { filters, projects } from "./data/projects.js";
import { BrickCanvas } from "./components/BrickCanvas.jsx";
import { BrickGrid } from "./components/BrickGrid.jsx";
import { ProjectCard } from "./components/ProjectCard.jsx";

function navigateTo(path) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function Hero() {
  return (
    <section className="hero">
      <BrickCanvas />
      <div className="hero-panel">
        <p className="eyebrow">Software Engineering · University of Waterloo</p>
        <h1>Eugene Lee</h1>
        <nav className="hero-nav" aria-label="Primary navigation">
          <a href="/projects" onClick={(event) => {
            event.preventDefault();
            navigateTo("/projects");
          }}>
            Projects
          </a>
        </nav>
        <p>
          I build with algorithms, machine learning, and transformers, assembled
          one small piece at a time.
        </p>
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
          <BrickGrid type={project.board} width={24} height={9} />
        </div>
        <div className="dialog-content">
          <p className="eyebrow">{project.kind}</p>
          <h2 id="project-dialog-title">{project.title}</h2>
          <p>{project.summary}</p>
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
