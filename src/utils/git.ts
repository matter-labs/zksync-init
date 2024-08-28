import { fileOrDirExists } from "./files.js";
import { executeCommand } from "./helpers.js";
import Logger from "./logger.js";

import type { ExecuteOptions } from "./helpers.js";

let gitInstalled = false;

const checkGitInstallation = async () => {
  if (gitInstalled) return;
  try {
    await executeCommand("git --version", { silent: true });
    gitInstalled = true;
  } catch {
    throw new Error("Git is not installed. Download: https://git-scm.com");
  }
};

export const cloneRepo = async (
  repoUrl: string,
  destination: string,
  options?: ExecuteOptions
) => {
  if (fileOrDirExists(destination)) {
    Logger.debug(`${repoUrl} repository is already cloned. Skipping...`);
    return;
  }

  await checkGitInstallation();

  const command = `git clone ${repoUrl} ${destination}`;
  Logger.debug(`Cloning ${repoUrl} repository to ${destination}`);
  await executeCommand(command, options);
};

export const getLatestReleaseVersion = async (
  repo: string
): Promise<string> => {
  const apiUrl = `https://api.github.com/repos/${repo}/releases/latest`;
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(
        `GitHub API request failed with status: ${response.status}`
      );
    }
    const releaseInfo = await response.json();
    if (typeof releaseInfo?.tag_name !== "string") {
      throw new Error(
        `Failed to parse the latest release version: ${JSON.stringify(releaseInfo)}`
      );
    }
    return releaseInfo.tag_name;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `Failed to fetch the latest release version: ${error.message}`
      );
    }
    throw error;
  }
};
