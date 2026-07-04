const KEY = "active-entity-id";

export function getActiveEntityId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEY);
}

export function setActiveEntityId(id: string) {
  localStorage.setItem(KEY, id);
}
