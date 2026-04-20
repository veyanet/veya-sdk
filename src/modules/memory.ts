import { HttpClient } from "../client/http.js";
export class MemoryResource {
  constructor(private readonly http: HttpClient) {}
  async get(key: string) {
    return this.http.request(`/v1/memory/${key}`);
  }
}
