import path from "path";

import { executeCommand } from "./helpers.js";
import Logger from "./logger.js";

let dockerInstalled = false;

const checkDockerInstallation = async () => {
  if (dockerInstalled) return;
  try {
    await executeCommand("docker --version", { silent: true });
    dockerInstalled = true;
  } catch {
    throw new Error(
      "Docker is not installed. Download: https://www.docker.com/get-started/"
    );
  }
};

const getComposeCommandBase = (
  dockerComposePath: string,
  projectDir?: string
) => {
  return `docker compose -f ${dockerComposePath} --project-directory ${projectDir ?? path.dirname(dockerComposePath)}`;
};
const createComposeCommand =
  (action: string) =>
  async (
    dockerComposePath: string,
    projectDir?: string,
    additionalArgs?: string[]
  ) => {
    await checkDockerInstallation();
    const baseCommand = getComposeCommandBase(dockerComposePath, projectDir);
    const args = additionalArgs ? `${additionalArgs.join(" ")}` : "";
    return await executeCommand(`${baseCommand} ${action} ${args}`.trim());
  };

enum ContainerStatus {
  Running = "running",
  Exited = "exited",
  Paused = "paused",
  Restarting = "restarting",
  Dead = "dead",
  Unknown = "unknown",
}
type Container = { Name: string; State: ContainerStatus };
interface ContainerInfo {
  name: string;
  isRunning: boolean;
}
export const composeStatus = async (
  dockerComposePath: string,
  projectDir?: string
): Promise<ContainerInfo[]> => {
  await checkDockerInstallation();
  let statusJson = (
    await executeCommand(
      `${getComposeCommandBase(dockerComposePath, projectDir)} ps --format json --all`,
      {
        silent: true,
      }
    )
  ).trim(); // trim to remove leading and trailing whitespace

  // if no containers are mounted, docker compose returns an empty string
  if (!statusJson.length) {
    return [];
  }
  // on windows, docker compose returns json objects separated by newlines
  if (statusJson.startsWith("{") && statusJson.endsWith("}")) {
    statusJson = "[" + statusJson.split("\n").join(",") + "]";
  }

  try {
    const containers = JSON.parse(statusJson) as Array<Container>;

    return containers.map((container) => ({
      name: container.Name,
      isRunning:
        container.State === ContainerStatus.Running ||
        container.State === ContainerStatus.Restarting,
    }));
  } catch (error) {
    Logger.debug(
      `Failed to JSON.parse compose status ${dockerComposePath}: ${error?.toString()}`
    );
    Logger.debug(statusJson);
    return [];
  }
};
export const composeLogs = async (
  dockerComposePath: string,
  projectDir?: string,
  totalLines = 15
): Promise<string[]> => {
  await checkDockerInstallation();
  const response = (
    await executeCommand(
      `${getComposeCommandBase(dockerComposePath, projectDir)} logs --tail=${totalLines}`,
      {
        silent: true,
      }
    )
  ).trim(); // trim to remove leading and trailing whitespace

  try {
    return response.split("\n");
  } catch (error) {
    Logger.debug(
      `Failed to split compose logs ${dockerComposePath}: ${error?.toString()}`
    );
    return [];
  }
};

export const compose = {
  build: createComposeCommand("build"),
  create: createComposeCommand("create"),
  up: createComposeCommand("up -d"),
  stop: createComposeCommand("stop"),
  down: createComposeCommand("down --rmi all --volumes --remove-orphans"),
  logs: composeLogs,
  status: composeStatus,
};
