import { HttpClient } from '../client/http.js';
export class DecentralizedComputeResource {
  constructor(private readonly http: HttpClient) {}
  async run() { return { success: true }; }
}
