"use client";
import Link from "next/link";
import { useState } from "react";

/** Enter the arena: reacts the moment it's tapped, while the arena loads behind it. */
export default function ArenaLink() {
  const [going, setGoing] = useState(false);
  return (
    <Link className="cta wide" href="/board" prefetch aria-busy={going} onClick={() => setGoing(true)}>
      {going ? "Entering the arena…" : <>Enter the arena <span>→</span></>}
    </Link>
  );
}
