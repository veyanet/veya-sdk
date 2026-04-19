import { HttpClient } from '../client/http.js';
export class MemoryResource {
  constructor(private readonly http: HttpClient) {}
}
