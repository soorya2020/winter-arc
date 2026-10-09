import Link from "next/link";

export default function Header({ right }: { right?: React.ReactNode }) {
  return (
    <header className="bar">
      <Link className="mark" href="/"><i />Winter Arc</Link>
      <nav className="nav">{right ?? <span className="pill">Invite only · 7 spots</span>}</nav>
    </header>
  );
}
