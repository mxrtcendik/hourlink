"use client";

import { useId, useRef, useState } from "react";
import { MAX_ZONES } from "@/lib/link";
import { searchZones, zonePlace } from "@/lib/zones";

export function CityField({
  zones,
  onAdd,
}: {
  zones: string[];
  onAdd: (zone: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const results = searchZones(query, zones);
  const full = zones.length >= MAX_ZONES;

  function select(zone: string) {
    onAdd(zone);
    setQuery("");
    setActive(0);
    setOpen(false);
    inputRef.current?.blur();
  }

  if (full) {
    return <p className="text-sm text-faint">This link has eight cities.</p>;
  }

  return (
    <div className="relative">
      <label className="block">
        <span className="text-xs text-faint">Add a city</span>
        <input
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && results[active] ? `${listId}-${active}` : undefined}
          ref={inputRef}
          value={query}
          placeholder="New York"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="mt-1 w-full border-0 border-b border-rule bg-transparent px-0 py-2 text-base text-ink placeholder:text-faint"
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActive((index) => Math.min(index + 1, Math.max(results.length - 1, 0)));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((index) => Math.max(index - 1, 0));
            } else if (event.key === "Enter" && results[active]) {
              event.preventDefault();
              select(results[active]);
            } else if (event.key === "Escape") {
              setOpen(false);
              event.currentTarget.blur();
            }
          }}
        />
      </label>
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute top-[calc(100%+4px)] z-10 w-full border border-rule bg-paper"
        >
          {results.length === 0 ? (
            <li className="px-3 py-3 text-sm text-faint">No city matches.</li>
          ) : (
            results.map((zone, index) => {
              const place = zonePlace(zone);
              return (
                <li key={zone} id={`${listId}-${index}`} role="option" aria-selected={index === active}>
                  <button
                    type="button"
                    className={`flex min-h-11 w-full items-baseline justify-between gap-4 px-3 text-left ${
                      index === active ? "bg-soft" : ""
                    }`}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => select(zone)}
                  >
                    <span>{place.city}</span>
                    <span className="text-sm text-faint">{place.region}</span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
