import Link from "next/link";

export const NOT_FOUND_TITLE = "Page not found | Lantern Studio";

export function NotFoundContent() {
  return (
    <main id="main">
      <div className="page-hero">
        <h1>Page not found</h1>
      </div>
      <div className="section">
        <p>We could not find the page you asked for. It may have moved, or the address may have a typing mistake.</p>
        <p>
          <Link href="/" className="button">
            Back to the homepage
          </Link>
        </p>
      </div>
    </main>
  );
}
