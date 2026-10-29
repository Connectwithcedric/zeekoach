"use client";

import { useSyncExternalStore } from "react";

// Today's date in the visitor's browser. It is null during prerendering, so pages
// stay static and the date never mismatches the server's clock or time zone.
let today: Date | null = null;
const getToday = () => (today ??= new Date());
const noopSubscribe = () => () => {};

export function useToday(): Date | null {
  return useSyncExternalStore(noopSubscribe, getToday, () => null);
}
