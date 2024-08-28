import { executeCommand } from "./helpers.js";

let nodeVersion: string | undefined;

export const getNodeVersion = async () => {
  if (nodeVersion) return nodeVersion;
  try {
    const version = (
      await executeCommand("node --version", { silent: true })
    ).trim();
    const vIndex = version.indexOf("v");
    if (vIndex === -1) {
      return version;
    }
    return version.slice(vIndex + 1);
  } catch {
    throw new Error("Node.js is not installed. Download: http://nodejs.org");
  }
};
