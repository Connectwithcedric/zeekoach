import { ByUsername } from "./by-username";

export function generateStaticParams() {
  return [{ username: "zkoach" }];
}

// @username links open the profile.
export default async function UsernamePage({ params }: PageProps<"/u/[username]">) {
  const { username } = await params;
  return <ByUsername username={username} />;
}
