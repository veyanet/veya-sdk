import { HttpClient } from "../client/http.js";
export class ApiKeysResource {
  constructor(private readonly http: HttpClient) {}
  async create() {
    return this.http.request("/v1/apikeys", { method: "POST" });
  }
}
