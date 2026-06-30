// ─────────────────────────────────────────────────────────────────────────────
// DROP-IN REPLACEMENT for the `Projects` component in src/App.tsx
//
// Replaces the old card-grid Projects page with the wireframe catalogue (option
// 6a): hero-matched frame, full-height nav-divider wire continued by the right
// rail, "Projects" title + working filters, and a scroll region that holds many
// builds. No footer bar (consistent with the hero — there's no dedicated footer).
//
// HOW TO APPLY:
//   1. In src/App.tsx, replace the entire existing `function Projects(...) {...}`
//      with the function below.
//   2. Append the CSS in repo-patch/projects-page.css to the end of
//      src/styles.css.
//   3. `navigateTo`, `filters`, `projects`, `FilterId`, `Project`, and
//      `BrickGrid` are already imported/declared in App.tsx — no new imports
//      needed. (BrickGrid is already imported for the dialog.)
//
// To show more projects, just add entries to src/data/projects.ts — the grid
// scrolls automatically.
// ─────────────────────────────────────────────────────────────────────────────

function Projects({ onOpenProject }: ProjectsProps) {
  const [activeFilter, setActiveFilter] = useState<FilterId>("all");
  const visibleProjects = useMemo(() => {
    if (activeFilter === "all") return projects;
    return projects.filter((project) => project.category === activeFilter);
  }, [activeFilter]);

  const count = String(projects.length).padStart(2, "0");

  return (
    <section className="wf-page" aria-label="Projects">
      <div className="wf-frame">
        {/* header: nav only, right-aligned. Its left border begins the
            full-height wire that the right rail continues to the bottom. */}
        <header className="wf-head">
          <nav className="wf-nav">
            <a
              href="/"
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
              className="is-active"
              onClick={(event) => {
                event.preventDefault();
                navigateTo("/projects");
              }}
            >
              projects
            </a>
          </nav>
        </header>

        <div className="wf-body">
          {/* LEFT: title + filters + scrolling catalogue */}
          <div className="wf-main">
            <div className="wf-title-row">
              <h1 className="wf-title">Projects</h1>
              <div className="wf-filters" role="tablist" aria-label="Project filter">
                {filters.map((filter) => {
                  const n =
                    filter.id === "all"
                      ? projects.length
                      : projects.filter((p) => p.category === filter.id).length;
                  return (
                    <button
                      className={`wf-filter${activeFilter === filter.id ? " is-active" : ""}`}
                      type="button"
                      role="tab"
                      aria-selected={activeFilter === filter.id}
                      key={filter.id}
                      onClick={() => setActiveFilter(filter.id)}
                    >
                      {filter.label} {n}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="wf-scroll">
              <div className="wf-grid">
                {visibleProjects.map((project, index) => (
                  <button
                    key={project.id}
                    type="button"
                    className="wf-tile"
                    onClick={() => onOpenProject(project)}
                  >
                    <div className="wf-tile-top">
                      <span className="wf-tile-num">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span
                        className="wf-tile-kind"
                        style={{ color: `var(--${project.accent})` }}
                      >
                        {project.kind}
                      </span>
                    </div>
                    <div className="wf-tile-cover">
                      {project.cover ? (
                        <img src={project.cover} alt={`${project.title} cover`} />
                      ) : (
                        <BrickGrid type={project.board} width={18} height={8} />
                      )}
                    </div>
                    <div className="wf-tile-foot">
                      <span className="wf-tile-title">{project.title}</span>
                      <span className="wf-tile-open">open ▸</span>
                    </div>
                    <span className="wf-tile-sub">{project.subtitle}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT rail: border-left continues the wire down to the frame edge */}
          <aside className="wf-rail">
            <p className="wf-rail-eyebrow">Selected work</p>
            <p className="wf-rail-meta">
              {count} builds
              <br />
              algorithms · ml · systems
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}
