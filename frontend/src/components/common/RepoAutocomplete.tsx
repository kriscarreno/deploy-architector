/**
 * RepoAutocomplete
 *
 * Text input that:
 * 1. On focus / first keystroke fetches all repos from the backend
 *    (cached 60 s server-side, also cached in component state).
 * 2. Filters suggestions as the user types.
 * 3. On selection fills in the clone_url and calls onSelect with a
 *    { url, mainBranch?, prodBranch? } payload so the parent form can
 *    prefill the branch fields (GitHub API doesn't give branches, so
 *    we just pass the URL and keep branches at their defaults).
 */
import { useEffect, useRef, useState } from "react";
import githubService, {
  type GithubRepoSuggestion,
} from "../../services/githubService";

interface Props {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export default function RepoAutocomplete({ value, onChange, error }: Props) {
  const [suggestions, setSuggestions] = useState<GithubRepoSuggestion[]>([]);
  const [allRepos, setAllRepos] = useState<GithubRepoSuggestion[] | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load full repo list once on first focus
  const loadRepos = async () => {
    if (allRepos !== null) return; // already loaded
    setLoading(true);
    try {
      const repos = await githubService.searchRepos("");
      setAllRepos(repos);
      setSuggestions(filter(repos, value));
    } catch {
      setAllRepos([]);
    } finally {
      setLoading(false);
    }
  };

  const filter = (repos: GithubRepoSuggestion[], q: string) => {
    const term = q.toLowerCase();
    return repos
      .filter(
        (r) =>
          r.full_name.toLowerCase().includes(term) ||
          (r.description ?? "").toLowerCase().includes(term),
      )
      .slice(0, 10);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    onChange(v);
    if (allRepos) setSuggestions(filter(allRepos, v));
    setOpen(true);
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
          onFocus={() => {
            setOpen(true);
            loadRepos();
          }}
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
