"use client";

import { useEffect, useState } from "react";
import { entityStore, type Entity } from "@/lib/store";
import { getActiveEntityId, setActiveEntityId } from "@/lib/active-entity";

export function useActiveEntity() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  function load() {
    const all = entityStore.getAll();
    setEntities(all);
    const stored = getActiveEntityId();
    if (stored && all.find(e => e.id === stored)) {
      setActiveId(stored);
    } else if (all.length) {
      setActiveId(all[0].id);
      setActiveEntityId(all[0].id);
    }
  }

  useEffect(() => {
    load();
    window.addEventListener("active-entity-changed", load);
    return () => window.removeEventListener("active-entity-changed", load);
  }, []);

  const activeEntity = entities.find(e => e.id === activeId) ?? null;

  return { activeId, activeEntity, entities };
}
