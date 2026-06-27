/**
 * Veya.sol ABI as compiled for Robinhood Chain.
 *
 * Inlined here so @veya/sdk does not depend on the Anchor monorepo's
 * @veya/program package. Keep this file in lockstep with
 * robinhood/contracts/Veya.sol.
 */

import type { InterfaceAbi } from "ethers";
import artifact from "./Veya.json" with { type: "json" };

export const VEYA_ABI = artifact.abi as InterfaceAbi;
export const VEYA_BYTECODE = artifact.bytecode as string;
export const VEYA_PROTOCOL_CONTRACT_ADDRESS =
  "0x1a1Dc3c55550FCE9F70ef6cDEeF967c0b72a5d84";
export const VEYA_CONTRACT_ADDRESS = VEYA_PROTOCOL_CONTRACT_ADDRESS;

export function abiFunctionNames(): string[] {
  return (VEYA_ABI as Array<{ type?: string; name?: string }>)
    .filter((e) => e.type === "function" && e.name)
    .map((e) => e.name as string)
    .sort();
}

export function abiEventNames(): string[] {
  return (VEYA_ABI as Array<{ type?: string; name?: string }>)
    .filter((e) => e.type === "event" && e.name)
    .map((e) => e.name as string)
    .sort();
}

export function abiErrorNames(): string[] {
  return (VEYA_ABI as Array<{ type?: string; name?: string }>)
    .filter((e) => e.type === "error" && e.name)
    .map((e) => e.name as string)
    .sort();
}
