import fs from "fs";
import path from "path";
import chalk from "chalk";
import inquirer from "inquirer";
import ora from "ora";

import { copyRecursiveSync, fileOrDirExists } from "../../utils/files.js";
import { cloneRepo } from "../../utils/git.js";
import { executeCommand } from "../../utils/helpers.js";
import Logger from "../../utils/logger.js";
import { packageManagers } from "../../utils/packageManager.js";

import type { PackageManagerType } from "../../utils/packageManager.js";
import type { Template } from "./groups/quickstart.js";
import type { GenericTemplate } from "./index.js";

export const getUniqueValues = <T>(arr: T[]) => {
  return Array.from(new Set(arr));
};

export const askForTemplate = async <T extends GenericTemplate>(
  templates: T[]
) => {
  const { name: templateValue }: { name: T["name"] } = await inquirer.prompt([
    {
      message: "Template",
      name: "name",
      type: "list",
      choices: templates,
      required: true,
    },
  ]);

  const template = templates.find((t) => t.value === templateValue)!;
  return template;
};

export const askForPackageManager = async () => {
  const { packageManager }: { packageManager: PackageManagerType } =
    await inquirer.prompt([
      {
        message: "Package manager",
        name: "packageManager",
        type: "list",
        choices: <PackageManagerType[]>["npm", "pnpm", "yarn", "bun"],
        required: true,
      },
    ]);
  return packageManager;
};

const setupEnv = (folderLocation: string, env: Record<string, string>) => {
  const envExamplePath = path.join(folderLocation, ".env.example");
  const envPath = path.join(folderLocation, ".env");

  // Initialize finalEnvContent with the content from .env if it exists or an empty string
  let finalEnvContent = fs.existsSync(envPath)
    ? fs.readFileSync(envPath, "utf8")
    : "";

  // Keep track of what keys we've seen in the final .env content
  const seenKeys: Record<string, boolean> = {};

  // Extract and remember the keys that are already in the final .env content
  finalEnvContent.split("\n").forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=/);
    if (match) {
      seenKeys[match[1]] = true;
    }
  });

  if (fs.existsSync(envExamplePath)) {
    // .env.example exists, so iterate over its content
    const envExampleContent = fs.readFileSync(envExamplePath, "utf8");
    const lines = envExampleContent.split("\n");
    lines.forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=(.*)$/);
      if (match) {
        const key = match[1];
        // Replace only if the key from .env.example is in the env object and hasn't been seen in the .env
        if (!seenKeys[key] && Object.prototype.hasOwnProperty.call(env, key)) {
          line = `${key}=${env[key]}`;
          seenKeys[key] = true; // Mark as seen
        }
      }
      finalEnvContent += line + "\n";
    });
  }

  // Append new keys from the env object that weren't in .env.example
  for (const [key, value] of Object.entries(env)) {
    if (!seenKeys[key]) {
      finalEnvContent += `${key}=${value}\n`;
    }
  }

  // Write the final .env content
  fs.writeFileSync(envPath, finalEnvContent.trim() + "\n");
};

export const setupTemplate = async (
  template: GenericTemplate,
  folderLocation: string,
  env: Record<string, string>,
  packageManager?: PackageManagerType
) => {
  Logger.info(
    `\nSetting up template in ${chalk.magentaBright(folderLocation)}...`
  );
  const typedTemplate = template as Template;
  if (typedTemplate.framework === "Foundry") {
    await setupFoundryProject(template, folderLocation);
    return;
  }

  await setupHardhatProject(template, folderLocation);

  if (Object.keys(env).length > 0) {
    await setupEnvironmentVariables(folderLocation, env);
  }
  if (packageManager) {
    await installDependencies(packageManager, folderLocation);
  } else {
    throw new Error("Package manager is required to install dependencies.");
  }
};
// Sets up a foundry project by initializing it with the specified template.
// Primarily only used for foundry quickstart templates.
const setupFoundryProject = async (
  template: GenericTemplate,
  folderLocation: string
) => {
  const spinner = ora("Initializing foundry project...").start();

  try {
    const isInstalled = await executeCommand("forge --version", {
      silent: true,
    });
    // TODO: https://github.com/matter-labs/zksync-cli/issues/137
    if (!isInstalled) {
      spinner.fail(
        "Forge is not installed from the `foundry-zksync` repository. Please visit the official installation guide at https://github.com/matter-labs/foundry-zksync and follow the instructions to install it. Once installed, try running the command again."
      );
      return;
    }

    const cloneTempPath = path.join(folderLocation, "___temp");
    await executeCommand(
      `forge init --template ${template.git} ${cloneTempPath}`,
      { silent: true }
    );

    const templatePath = path.join(cloneTempPath, template.path || "");
    if (!fileOrDirExists(templatePath)) {
      throw new Error(
        `The specified template path does not exist: ${templatePath}`
      );
    }

    copyRecursiveSync(templatePath, folderLocation);
    fs.rmSync(cloneTempPath, { recursive: true, force: true });

    spinner.succeed("Foundry project initialized successfully.");
  } catch (error) {
    spinner.fail("Failed to initialize foundry project");
    throw error;
  }
};

// Sets up a Hardhat project by cloning the specified template and copying it to the specified folder location.
const setupHardhatProject = async (
  template: GenericTemplate,
  folderLocation: string
) => {
  if (!template.path) {
    const spinner = ora("Cloning template...").start();
    try {
      await cloneRepo(template.git, folderLocation, { silent: true });
      try {
        fs.rmSync(path.join(folderLocation, ".git"), { recursive: true });
      } catch {
        Logger.warn(
          "Failed to remove .git folder. Make sure to remove it manually before pushing to a new repo."
        );
      }
      try {
        const githubFolderLocation = path.join(folderLocation, ".github");
        if (fileOrDirExists(githubFolderLocation)) {
          fs.rmSync(githubFolderLocation, { recursive: true });
        }
      } catch {
        Logger.warn(
          "Failed to remove .github folder. Make sure to remove it manually before pushing to a new repo."
        );
      }
      spinner.succeed("Cloned template");
    } catch (error) {
      spinner.fail("Failed to clone template");
      throw error;
    }
  } else {
    // We need to firstly clone the repo to a temp folder
    // then copy required folder to the main folder
    // then remove the temp folder
    const cloneTempPath = path.join(folderLocation, "___temp");
    const spinner = ora("Cloning template...").start();
    try {
      await cloneRepo(template.git, cloneTempPath, { silent: true });
      const templatePath = path.join(cloneTempPath, template.path);
      if (fileOrDirExists(templatePath)) {
        try {
          copyRecursiveSync(templatePath, folderLocation);
          fs.rmSync(cloneTempPath, { recursive: true, force: true });
        } catch {
          throw new Error("An error occurred while copying the template");
        }
      } else {
        throw new Error(
          `The specified template path does not exist: ${templatePath}`
        );
      }
      spinner.succeed("Cloned template");
    } catch (error) {
      spinner.fail("Failed to clone template");
      throw error;
    }
  }
};
// Sets up environment variables in the specified folder location.
const setupEnvironmentVariables = async (
  folderLocation: string,
  env: Record<string, string>
) => {
  const spinner = ora("Setting up environment variables...").start();
  try {
    setupEnv(folderLocation, env);
  } catch (error) {
    spinner.fail("Failed to set up environment variables");
    throw error;
  }
  spinner.succeed("Environment variables set up");
};
// Install dependencies with the specified package manager in the specified folder location.
const installDependencies = async (
  packageManager: PackageManagerType,
  folderLocation: string
) => {
  const spinner = ora(
    `Installing dependencies with ${chalk.bold(packageManager)}... This may take a couple minutes.`
  ).start();
  if (await packageManagers[packageManager].isInstalled()) {
    try {
      await executeCommand(packageManagers[packageManager].install(), {
        cwd: folderLocation,
        silent: true,
      });
    } catch (error) {
      spinner.fail("Failed to install dependencies");
      throw error;
    }
    spinner.succeed("Dependencies installed");
  } else {
    spinner.fail(
      `${chalk.bold(packageManager)} is not installed. After installing it, run \`${chalk.blueBright(
        packageManagers[packageManager].install()
      )}\` in the project folder.`
    );
  }
};

export const successfulMessage = {
  start: (folderName: string) => {
    Logger.info(`\n${chalk.green("🎉 All set up! 🎉")}\n`);
    Logger.info("--------------------------\n", { noFormat: true });
    Logger.info(
      `${chalk.magentaBright("Navigate to your project:")} ${chalk.blueBright(`cd ${folderName}`)}\n`
    );
  },
  end: (folderName: string) => {
    Logger.info(`${chalk.magentaBright("\nFurther Reading:")}
  - Check out the README file in the project location for more details: ${path.join(folderName, "README.md")}\n`);
    Logger.info("--------------------------", { noFormat: true });
  },
};
