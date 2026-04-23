import { HttpClient } from '../client/http.js';
export class ProofsResource {
  constructor(private readonly http: HttpClient) {}
  async list() { return []; }
}
