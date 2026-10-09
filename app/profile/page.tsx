import { redirect } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import ProfileForm from "./ProfileForm";
import { currentParticipant } from "@/lib/auth";
import { allParticipants, displayName } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const me = await currentParticipant();
  if (!me?.accepted_at) redirect("/");
  const rivals = (await allParticipants()).filter((p) => p.accepted_at && p.id !== me.id).map((p) => ({ id: p.id, name: displayName(p) }));
  return (
    <div className="wrap">
      <Header right={<><Link href="/board">Arena</Link><Link href="/?home=1">Home</Link></>} />
      <section style={{ maxWidth: "40rem" }}>
        <div className="head">
          <span className="label">{displayName(me)}</span>
          <h2>Your fighter</h2>
          <p>These answers shape how your fighter talks, and give everyone else material to use against you.</p>
        </div>
        <ProfileForm profile={me.profile} catchphrase={me.catchphrase} rivals={rivals} />
      </section>
    </div>
  );
}
