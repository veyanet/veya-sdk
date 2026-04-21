import { HttpClient } from "../client/http.js";
export class ExecutionsResource {
  constructor(private readonly http: HttpClient) {}
  async get(id: string) {
    return this.http.request(`/v1/executions/${id}`);
  }
}
