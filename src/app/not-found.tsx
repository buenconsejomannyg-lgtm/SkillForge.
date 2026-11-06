import Link from "next/link";
export default function NotFound() {
  return (
    <section className="card empty-state">
      <h1>Page not found</h1>
      <p>This page is not part of the SkillForge prototype.</p>
      <Link className="button" href="/dashboard">
        Go to Dashboard
      </Link>
    </section>
  );
}
