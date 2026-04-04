import { HttpClient } from "./http.js";
import { VeyaConfig } from "../config.js";
import { EnvironmentsResource } from "../modules/environments.js";
export class Veya {
  public readonly environments: EnvironmentsResource;
  constructor(config: VeyaConfig = {}) {
    const http = new HttpClient(config);
    this.environments = new EnvironmentsResource(http);
  }
}
