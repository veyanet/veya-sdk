import { HttpClient } from "../client/http.js";
export class AgentsResource {
  constructor(private readonly http: HttpClient) {}
  async deploy(envId: string, options: any) {
    return this.http.request(`/v1/environments/${envId}/agents`, { method: "POST", body: options });
  }
}
