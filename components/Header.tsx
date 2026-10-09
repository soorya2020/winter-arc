import Link from "next/link";

export default function Header({ right }: { right?: React.ReactNode }) {
  return (
    <header className="bar">
      <Link className="mark" href="/">Winter Arc</Link>
      <span>Season 2026</span>
      <nav className="nav">{right ?? <span className="pill">By invitation</span>}</nav>
    </header>
  );
}
