/** Big Manglish hype words that take turns popping in on the right of the hero. Pure CSS, so it costs nothing on phones. */
export const HYPE = ["Polikkam!", "Vidilla machane", "Adipoli", "Pedikkanda", "Entha mone?", "Theerkkum"];

export default function Hype({ style = "burst" }: { style?: "burst" | "slam" | "flip" }) {
  return (
    <div className={`hype hype--${style}`} aria-hidden="true">
      {HYPE.map((w, i) => <span key={w} style={{ ["--n" as string]: i }}><b><i>{w}</i></b></span>)}
    </div>
  );
}
