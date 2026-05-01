/**
 * RepoAutocomplete
 *
 * Text input with GitHub repo suggestions.
 * - On focus: fetches recent repos (q="") from the backend.
 * - While typing: debounces 300 ms then fetches with the actual query.
 *   When q >= 2 chars the backend uses GitHub Search API (finds any
 *   accessible repo, including orgs/collaborations).
 * - Results come directly from the backend — no local filtering cap.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import githubService, {
  type GithubRepoSuggestion,
} from "../../services/githubService";

interface Props {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

const DEBOUNCE_MS = 300;

export default function RepoAutocomplete({ value, onChange, error }: Props) {
  const [suggestions, setSuggestions] = useState<GithubRepoSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Abort stale requests: track latest call id
  const callIdRef = useRef(0);

  const fetchSuggestions = useCallback(async (q: string) => {
    const id = ++callIdRef.current;
    setLoading(true);
    try {
      const repos = await githubService.searchRepos(q);
      if (id !== callIdRef.current) return; // stale
      setSuggestions(repos);
    } catch {
      if (id !== callIdRef.current) return;
      setSuggestions([]);
    } finally {
      if (id === callIdRef.current) setLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    onChange(v);
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(v), DEBOUNCE_MS);
  };

  const handleFocus = () => {
    setOpen(true);
    // Only load initial list if we haven't fetched anything yet
    if (suggestions.length === 0 && !loading) {
      fetchSuggestions(value);
    }
  };

  const handleSelect = (repo: GithubRepoSuggestion) => {
    onChange(repo.clone_url);
    setOpen(false);
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Cleanup debounce on unmount
  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const showDropdown = open && (loading || suggestions.length > 0);

  return (
    <div ref={containerRef} className="relative w-full">
      <label htmlFor="git-url" className="form-label">
        URL del repositorio
        <span className="ml-1 text-red-400" aria-hidden="true">
          *
        </span>
      </label>

      <div className="relative">
        <input
          id="git-url"
          type="text"
          autoComplete="off"
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          placeholder="https://github.com/org/repo.git  o busca tu repo…"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "git-url-error" : undefined}
          className={`form-input pr-8 ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
        />
        {loading && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500">
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
          </span>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-dark-border bg-dark-surface shadow-xl"
          style={{ maxHeight: "260px", overflowY: "auto" }}
        >
          {loading && suggestions.length === 0 && (
            <li className="px-4 py-3 text-sm text-slate-500">
              Cargando repositorios…
            </li>
          )}
          {!loading && suggestions.length === 0 && (
            <li className="px-4 py-3 text-sm text-slate-500">Sin resultados</li>
          )}
          {suggestions.map((repo) => (
            <li
              key={repo.id}
              role="option"
              aria-selected={value === repo.clone_url}
              onMouseDown={(e) => {
                e.preventDefault(); // prevent input blur before selection
                handleSelect(repo);
              }}
              className="flex cursor-pointer flex-col gap-0.5 px-4 py-2.5 hover:bg-dark-bg"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-200">
                  {repo.full_name}
                </span>
                {repo.private && (
                  <span className="rounded bg-slate-700 px-1.5 py-0.5 text-xs text-slate-400">
                    privado
                  </span>
                )}
              </div>
              {repo.description && (
                <span className="truncate text-xs text-slate-500">
                  {repo.description}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p id="git-url-error" role="alert" className="form-error">
          {error}
        </p>
      )}
    </div>
  );
}
