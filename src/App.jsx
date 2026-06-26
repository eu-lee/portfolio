import { useMemo, useState } from "react";
import { filters, projects } from "./data/projects.js";
import { BrickCanvas } from "./components/BrickCanvas.jsx";
import { BrickGrid } from "./components/BrickGrid.jsx";
import { ProjectCard } from "./components/ProjectCard.jsx";

function Hero() {
  return (
    <section className="hero" id="home">
      <BrickCanvas />
      <div className="hero-panel">
        <p className="eyebrow">Software Engineering · University of Waterloo</p>
        <h1>Eugene Lee</h1>
        <nav className="hero-nav" aria-label="Primary navigation">
          <a href="#projects">Projects</a>
          <a href="#build-system">Build</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
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
    <section className="section" id="projects">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Selected work</p>
          <h2>Brick covers, real project details.</h2>
        </div>
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

function BuildSystem() {
  return (
    <section className="section build-section" id="build-system">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Build system</p>
          <h2>Portfolio components as studs.</h2>
        </div>
      </div>
      <div className="build-layout">
        <div className="spec-panel">
          <span className="spec-stud stud stud-red" aria-hidden="true" />
          <div>
            <h3>The 1x1 stud</h3>
            <p>
              Every cover is generated from a small data grid, using real
              LEGO-inspired colors and a reusable highlight/shadow treatment.
            </p>
          </div>
        </div>
        <div className="palette" aria-label="LEGO-inspired color palette">
          <span style={{ "--swatch": "#C91A09" }}>Bright Red</span>
          <span style={{ "--swatch": "#0B5FA5" }}>Bright Blue</span>
          <span style={{ "--swatch": "#1E9DD5" }}>Medium Azure</span>
          <span style={{ "--swatch": "#F2CD37" }}>Bright Yellow</span>
          <span style={{ "--swatch": "#FE8A18" }}>Orange</span>
          <span style={{ "--swatch": "#3A8C3F" }}>Green</span>
          <span style={{ "--swatch": "#A6C520" }}>Lime</span>
          <span style={{ "--swatch": "#F4F5F2" }}>White</span>
        </div>
      </div>
    </section>
  );
}

function About() {
  return (
    <section className="section about-section" id="about">
      <div>
        <p className="eyebrow">About</p>
        <h2>Software engineer focused on the small pieces that make systems work.</h2>
        <p>
          I like work where rigorous implementation meets visible behavior:
          search, visualization, model tooling, developer experience, and
          interfaces that help people reason through complex systems.
        </p>
      </div>
      <div className="brick-stack" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
    </section>
  );
}

function Contact() {
  const [copied, setCopied] = useState(false);

  async function copyEmail() {
    await navigator.clipboard.writeText("eugene@example.com");
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section className="section contact-section" id="contact">
      <div>
        <p className="eyebrow">Contact</p>
        <h2>Let’s build something.</h2>
        <p>
          Replace these links with your real email, GitHub, LinkedIn, and resume
          when you are ready.
        </p>
      </div>
      <div className="contact-actions">
        <a href="mailto:eugene@example.com">Email</a>
        <a href="https://github.com/" target="_blank" rel="noreferrer">GitHub</a>
        <a href="https://www.linkedin.com/" target="_blank" rel="noreferrer">LinkedIn</a>
        <button type="button" onClick={copyEmail}>Copy email</button>
      </div>
      <div className={`toast${copied ? " is-visible" : ""}`} role="status" aria-live="polite">
        Email copied
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

  return (
    <>
      <main>
        <Hero />
        <Projects onOpenProject={setSelectedProject} />
        <BuildSystem />
        <About />
        <Contact />
      </main>
      <ProjectDialog project={selectedProject} onClose={() => setSelectedProject(null)} />
    </>
  );
}
