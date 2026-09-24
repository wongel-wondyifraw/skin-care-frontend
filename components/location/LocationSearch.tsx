import { useState, useEffect, useRef } from "react";
import { Loader2, MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { shopAutocomplete } from "@/lib/shop-api";
import { useDebounce } from "@/hooks/use-debounce"; // Assuming this exists or I will just write inline

export type LocationSuggestion = {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
};

type Props = {
  onSelect: (location: LocationSuggestion) => void;
  placeholder?: string;
  defaultValue?: string;
};

export function LocationSearch({ onSelect, placeholder = "Search location...", defaultValue = "" }: Props) {
  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Quick inline debounce if hook isn't available
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 500);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    shopAutocomplete(debouncedQuery)
      .then((results) => {
        if (isMounted) {
          setSuggestions(results);
          setIsOpen(true);
        }
      })
      .catch(() => {
        if (isMounted) setSuggestions([]);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [debouncedQuery]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          placeholder={placeholder}
          className="pl-9 pr-9"
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((s) => (
            <button
              key={s.place_id}
              type="button"
              className="w-full text-left px-4 py-3 text-sm hover:bg-muted/50 border-b border-border/50 last:border-0 flex items-start gap-2 transition-colors"
              onClick={() => {
                setQuery(s.display_name);
                setIsOpen(false);
                onSelect(s);
              }}
            >
              <MapPin className="size-4 shrink-0 mt-0.5 text-primary" />
              <span className="line-clamp-2">{s.display_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
