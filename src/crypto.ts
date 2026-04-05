import { webcrypto } from 'node:crypto';
export async function encryptAgentConfig() { const iv = webcrypto.getRandomValues(new Uint8Array(12)); return { encryptedConfig: '', configIv: '' }; }
