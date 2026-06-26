export function ProjectCard({ project }) {
  return (
    <article className="project-card" aria-label={`${project.title} placeholder`}>
      <div className="project-placeholder" />
      <h3>{project.title}</h3>
      <p>{project.subtitle}</p>
    </article>
  );
}
