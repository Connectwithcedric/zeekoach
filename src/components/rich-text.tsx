import Link from "next/link";

// Captions and comments: #hashtags open the hashtag page, @usernames open the profile.
export function RichText({ text }: { text: string }) {
  const parts = text.split(/([#@][A-Za-z0-9_.]{1,50})/g);
  return (
    <>
      {parts.map((p, i) =>
        /^#[A-Za-z0-9_]+$/.test(p) ? (
          <Link key={i} href={`/tags/${p.slice(1).toLowerCase()}`} className="font-bold text-primary hover:underline">{p}</Link>
        ) : /^@[A-Za-z0-9_.]+$/.test(p) ? (
          <Link key={i} href={`/u/${p.slice(1).toLowerCase()}`} className="font-bold text-primary hover:underline">{p}</Link>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}
