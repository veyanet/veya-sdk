import { HttpClient } from "../client/http.js";
export class EnvironmentsResource {
  constructor(private readonly http: HttpClient) {}
  async list() {
    return this.http.request("/v1/environments");
  }
}
