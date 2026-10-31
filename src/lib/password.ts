// The old YouKoach password rules: 8 to 30 characters, upper and lower case, a number and a special character.
export const passwordRules = (p: string) => ({
  length: p.length >= 8 && p.length <= 30,
  mix: /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p) && /[^A-Za-z0-9]/.test(p),
});
export const passwordOk = (p: string) => Object.values(passwordRules(p)).every(Boolean);
