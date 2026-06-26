import { projects } from "./data/projects.js";
import { Stud } from "./components/Stud.jsx";
import { ProjectCard } from "./components/ProjectCard.jsx";

function Header() {
  return (
    <header className="site-header">
      <a className="brand" href="#home" aria-label="Eugene Lee home">
        <Stud color="red" />
        <span>Eugene Lee</span>
      </a>
      <nav className="site-nav" aria-label="Primary navigation">
        <a href="#projects">Projects</a>
        <a href="#about">About</a>
        <a href="#contact">Contact</a>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className="hero" id="home">
      <div className="brick-backdrop" aria-hidden="true" />
      <div className="hero-panel">
        <p className="eyebrow">Software Engineering · University of Waterloo</p>
        <h1>Eugene Lee</h1>
        <p>
          I build with algorithms, machine learning, and transformers, assembled
          one small piece at a time.
        </p>
      </div>
    </section>
  );
}

function Projects() {
  return (
    <section className="section" id="projects">
      <div className="section-heading">
        <p className="eyebrow">Selected work</p>
        <h2>Projects</h2>
      </div>
      <div className="project-grid">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </section>
  );
}

function About() {
  return (
    <section className="section" id="about">
      <div className="section-heading">
        <p className="eyebrow">About</p>
        <h2>Build notes</h2>
      </div>
      <p className="section-copy">
        This section is reserved for the portfolio story, skills, and LEGO
        build-system details.
      </p>
    </section>
  );
}

function Contact() {
  return (
    <section className="section" id="contact">
      <div className="section-heading">
        <p className="eyebrow">Contact</p>
        <h2>Links</h2>
      </div>
      <p className="section-copy">
        Email, GitHub, LinkedIn, and resume links will go here.
      </p>
    </section>
  );
}

export default function App() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Projects />
        <About />
        <Contact />
      </main>
    </>
  );
}
