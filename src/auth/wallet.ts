import { HttpClient } from "../client/http.js";
export async function walletAuth(http: HttpClient, options: any) {
  return { token: "jwt_token" };
}
