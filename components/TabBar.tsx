"use client";

// Bottom bar shared by the landing page (Home) and the member app (/board tabs).
const TABS = [
  { id: "home", href: "/", label: "Home", icon: <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z" /> },
  { id: "today", href: "/board#today", label: "Today", icon: <path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.2 1.2-3.6 2.4-4.6.3 1.6 1.1 2.6 2.1 3.1C11 9 11 6 12 3z" /> },
  { id: "ring", href: "/board#ring", label: "Ring", icon: <><circle cx="12" cy="12" r="8" /><path d="m9 9 6 6M15 9l-6 6" /></> },
  { id: "ranks", href: "/board#ranks", label: "Ranks", icon: <path d="M5 20v-6h4v6M10 20V8h4v12M15 20v-9h4v9" /> },
  { id: "me", href: "/board#me", label: "Me", icon: <><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c1-4 4-6 7-6s6 2 7 6" /></> },
];

/** On /board the tabs switch in place (onPick); everywhere else they are plain links. */
export default function TabBar({ active, onPick }: { active: string; onPick?: (id: string) => void }) {
  return (
    <nav className="tabbar" aria-label="App">
      {TABS.map((t) => (
        <a key={t.id} href={t.href} aria-current={active === t.id ? "page" : undefined}
          onClick={(e) => { if (onPick && t.id !== "home") { e.preventDefault(); onPick(t.id); } }}>
          <svg viewBox="0 0 24 24" aria-hidden="true">{t.icon}</svg>
          <span>{t.label}</span>
        </a>
      ))}
    </nav>
  );
}
