import apiClient from "./apiClient";

export interface GithubRepoSuggestion {
  id: number;
  full_name: string;
  clone_url: string;
  description: string | null;
  private: boolean;
}

const githubService = {
  searchRepos(q: string) {
    return apiClient
      .get<{ data: GithubRepoSuggestion[] }>(`/api/github/repos`, {
        params: q ? { q } : undefined,
      })
      .then((r) => r.data.data);
  },
};

export default githubService;
