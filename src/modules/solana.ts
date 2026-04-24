import { HttpClient } from '../client/http.js';
export class SolanaResource {
  constructor(private readonly http: HttpClient) {}
  async list() { return []; }
}
