import { HttpClient } from "../client/http.js";
export class SolanaResource {
  constructor(private readonly http: HttpClient) {}
  async getInfo() {
    return this.http.request("/v1/solana/info");
  }
}
