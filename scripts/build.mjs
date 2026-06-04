#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const result = spawnSync("npm", ["run", "build"], { stdio: "inherit", shell: true });
process.exit(result.status ?? 1);
