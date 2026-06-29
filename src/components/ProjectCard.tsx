import type { CSSProperties } from "react";
import type { Project } from "../data/projects";
import { BrickGrid } from "./BrickGrid";

type ProjectCardProps = {
  project: Project;
  onOpen: (project: Project) => void;
};

export function ProjectCard({ project, onOpen }: ProjectCardProps) {
  return (
    <article className={`project-card${project.featured ? " is-featured" : ""}`}>
      <button
        className="project-cover"
        style={{ "--accent": `var(--${project.accent})` } as CSSProperties}
        type="button"
        onClick={() => onOpen(project)}
      >
        {project.cover ? (
          <img className="cover-image" src={project.cover} alt="" />
        ) : (
          <BrickGrid type={project.board} />
        )}
        <span className="project-reveal">
          <span>
            <span className="project-kind">{project.kind}</span>
            <strong>{project.title}</strong>
            <span className="project-open">Open details</span>
          </span>
        </span>
      </button>
      <h3>{project.title}</h3>
      <p>{project.subtitle}</p>
    </article>
  );
}
