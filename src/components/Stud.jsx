export function Stud({ color = "red" }) {
  return <span className={`stud stud-${color}`} aria-hidden="true" />;
}
