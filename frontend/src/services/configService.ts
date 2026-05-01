import apiClient from "./apiClient";

export interface ImportResult {
  imported: number;
  projects: Array<{ project: string; repos: number }>;
}

const configService = {
  /** Downloads the config JSON as a file in the browser. */
  async downloadExport(): Promise<void> {
    const res = await apiClient.get<Blob>("/api/config/export", {
      responseType: "blob",
    });

    const today = new Date().toISOString().slice(0, 10);
    const filename = `deploy-config-${today}.json`;

    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /** Parses a JSON File and imports it into the current instance. */
  async importFromFile(file: File): Promise<ImportResult> {
    const text = await file.text();
    let bundle: unknown;
    try {
      bundle = JSON.parse(text);
    } catch {
      throw new Error("El archivo no es un JSON válido.");
    }

    const res = await apiClient.post<{ data: ImportResult }>(
      "/api/config/import",
      bundle,
    );
    return res.data.data;
  },
};

export default configService;
