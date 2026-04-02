import { VeyaError } from "../errors/VeyaError.js";
import type { VeyaConfig } from "../config.js";
export class HttpClient {
  constructor(private readonly config: VeyaConfig) {}
  async request(path: string, options: any = {}) {
    const url = `${this.config.apiUrl || "https://api.veyanet.tech"}${path}`;
    const headers = new Headers({ Accept: "application/json" });
    if (this.config.apiKey) {
      headers.set("X-Api-Key", this.config.apiKey);
    }
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) throw new VeyaError("Request failed");
    return response.json();
  }
  setAccessToken(token: string) {
    this.config.accessToken = token;
  }
}
