import { useEffect, useMemo, useRef, useState } from "react";
import { translateTexts } from "./api";
import type { Language } from "./i18n";
import type { OrgNode } from "../types";

const CACHE_STORAGE_KEY = "orgcraft.translationCache.v1";

// The org-chart fields that carry free text an admin typed in, as opposed to identifiers
// (sede/department are also used to filter/route and must stay in their original form) —
// see NodeCard.tsx for how title/name/department show up on a card.
const TRANSLATABLE_FIELDS = ["title", "name", "department", "customBadge"] as const;
type TranslatableField = (typeof TRANSLATABLE_FIELDS)[number];

type LangCache = Record<string, string>;
type Cache = Partial<Record<Language, LangCache>>;

function loadCache(): Cache {
  try {
    const raw = localStorage.getItem(CACHE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Applies cached AI translations to org-chart node text (title/name/department/customBadge)
 * for display only — the nodes this returns must never be fed back into edit/save flows,
 * only into read-only rendering (TreeView/NodeCard/AllCentersOverview). Content is assumed
 * authored in Spanish, so nothing is requested while "es" is selected; every unique string
 * not yet cached gets batched into a single translation request. Failures (e.g. no
 * GEMINI_API_KEY configured) are silent — the original text just keeps showing. */
export function useTranslatedNodes(nodes: OrgNode[], language: Language): OrgNode[] {
  const [cache, setCache] = useState<Cache>(loadCache);
  const inFlight = useRef<Set<string>>(new Set());
  const langCache = cache[language];

  const uncached = useMemo(() => {
    if (language === "es") return [] as string[];
    const known = langCache || {};
    const seen = new Set<string>();
    for (const node of nodes) {
      for (const field of TRANSLATABLE_FIELDS) {
        const value = node[field as TranslatableField];
        if (value && !known[value] && !inFlight.current.has(value)) seen.add(value);
      }
    }
    return Array.from(seen);
  }, [nodes, language, langCache]);

  useEffect(() => {
    if (uncached.length === 0) return;
    uncached.forEach((text) => inFlight.current.add(text));
    let cancelled = false;
    translateTexts(uncached, language)
      .then((res) => {
        if (cancelled) return;
        setCache((prev) => {
          const merged: LangCache = { ...(prev[language] || {}) };
          uncached.forEach((text, i) => {
            merged[text] = res.translations[i] || text;
          });
          const next = { ...prev, [language]: merged };
          try {
            localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(next));
          } catch {
            // Storage full/unavailable — translations still work for this session, just not persisted.
          }
          return next;
        });
      })
      .catch((err) => {
        // Soft-fail: keep showing the original text. Logged (not surfaced in the UI) so a
        // misconfigured GEMINI_API_KEY on the deploy target is still diagnosable from devtools.
        console.error("Content translation failed:", err);
      })
      .finally(() => {
        uncached.forEach((text) => inFlight.current.delete(text));
      });
    return () => {
      cancelled = true;
    };
  }, [uncached, language]);

  return useMemo(() => {
    if (language === "es" || !langCache) return nodes;
    return nodes.map((node) => {
      const patch: Partial<Record<TranslatableField, string>> = {};
      let changed = false;
      for (const field of TRANSLATABLE_FIELDS) {
        const value = node[field as TranslatableField];
        const translated = value && langCache[value];
        if (translated && translated !== value) {
          patch[field] = translated;
          changed = true;
        }
      }
      return changed ? { ...node, ...patch } : node;
    });
  }, [nodes, language, langCache]);
}
