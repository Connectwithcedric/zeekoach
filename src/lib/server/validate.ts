// Rules shared by sign up checks on the server.
export const usernameProblem = (u: string) => {
  if (u.length < 3) return "At least 3 characters.";
  if (u.length > 25) return "25 characters at most.";
  if (!/^[a-z0-9._]+$/.test(u)) return "Only letters, numbers, dots and underscores.";
  if (/(admin|zeekoach|youkoach|zkoach|support|official)/.test(u)) return "This username isn't allowed.";
  return null;
};
