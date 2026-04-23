import { HttpClient } from "../client/http.js";
export class ProofsResource {
  constructor(private readonly http: HttpClient) {}
  async get(id: string) {
    return this.http.request(`/v1/proofs/${id}`);
  }
}
