import type { HttpClient } from "../client/http.js";
import type {
  Environment,
  EnvironmentStatus,
  EnvironmentType,
} from "../types/environment.js";

export type CreateEnvironmentInput = {
  name: string;
  type: EnvironmentType;
  memoryScope?: Record<string, unknown>;
  policyConfig?: Record<string, unknown>;
  spendingLimits?: Record<string, unknown>;
  agentRoster?: string[];
};

export type UpdateEnvironmentInput = Partial<{
  name: string;
  status: EnvironmentStatus;
  memoryScope: Record<string, unknown>;
  policyConfig: Record<string, unknown>;
  spendingLimits: Record<string, unknown>;
  agentRoster: string[];
}>;

export class EnvironmentsResource {
  constructor(private readonly http: HttpClient) {}

  async list(): Promise<Environment[]> {
    const { environments } = await this.http.request<{ environments: Environment[] }>(
      "/v1/environments"
    );
    return environments;
  }

  async create(input: CreateEnvironmentInput): Promise<Environment> {
    const { environment } = await this.http.request<{ environment: Environment }>(
      "/v1/environments",
      {
        method: "POST",
        body: {
          memoryScope: {},
          policyConfig: {},
          spendingLimits: {},
          agentRoster: [],
          ...input,
        },
      }
    );
    return environment;
  }

  async get(id: string): Promise<Environment> {
    const { environment } = await this.http.request<{ environment: Environment }>(
      `/v1/environments/${id}`
    );
    return environment;
  }

  async update(id: string, input: UpdateEnvironmentInput): Promise<Environment> {
    const { environment } = await this.http.request<{ environment: Environment }>(
      `/v1/environments/${id}`,
      { method: "PATCH", body: input }
    );
    return environment;
  }
}
