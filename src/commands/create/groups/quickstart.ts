import chalk from "chalk";
import inquirer from "inquirer";

import Logger from "../../../utils/logger.js";
import { packageManagers } from "../../../utils/packageManager.js";
import { isPrivateKey } from "../../../utils/validators.js";
import {
  askForPackageManager,
  askForTemplate,
  getUniqueValues,
  setupTemplate,
  successfulMessage,
} from "../utils.js";

import type { PackageManagerType } from "../../../utils/packageManager.js";
import type { GenericTemplate } from "../index.js";

export type Template = GenericTemplate & {
  framework: "Hardhat" | "Foundry";
  ethereumFramework: "Ethers v6" | "Solidity";
  language: "Solidity" | "Vyper";
};

export const templates: Template[] = [
  {
    name: "ZKsync 101",
    value: "zksync-101",
    framework: "Hardhat",
    ethereumFramework: "Ethers v6",
    language: "Solidity",
    path: "templates/101",
    git: "https://github.com/matter-labs/zksync-contract-templates/",
  },
  {
    name: "Quickstart - Hardhat + Solidity",
    value: "qs-hello-zksync",
    framework: "Hardhat",
    ethereumFramework: "Ethers v6",
    language: "Solidity",
    path: "templates/quickstart/hardhat/hello-zksync",
    git: "https://github.com/matter-labs/zksync-contract-templates/",
  },
  {
    name: "Quickstart - Hardhat + Solidity",
    value: "qs-factories",
    framework: "Hardhat",
    ethereumFramework: "Ethers v6",
    language: "Solidity",
    path: "templates/quickstart/hardhat/factory",
    git: "https://github.com/matter-labs/zksync-contract-templates/",
  },
  {
    name: "Quickstart - Hardhat + Solidity",
    value: "qs-testing",
    framework: "Hardhat",
    ethereumFramework: "Ethers v6",
    language: "Solidity",
    path: "templates/quickstart/hardhat/testing",
    git: "https://github.com/matter-labs/zksync-contract-templates/",
  },
  {
    name: "Quickstart - Hardhat + Solidity",
    value: "qs-upgrade",
    framework: "Hardhat",
    ethereumFramework: "Ethers v6",
    language: "Solidity",
    path: "templates/quickstart/hardhat/upgradability",
    git: "https://github.com/matter-labs/zksync-contract-templates/",
  },
  {
    name: "Quickstart - Hardhat + Solidity",
    value: "qs-paymaster",
    framework: "Hardhat",
    ethereumFramework: "Ethers v6",
    language: "Solidity",
    path: "templates/quickstart/hardhat/paymaster",
    git: "https://github.com/matter-labs/zksync-contract-templates/",
  },
  {
    name: "Quickstart - Foundry",
    value: "qs-fs-hello-zksync",
    framework: "Foundry",
    ethereumFramework: "Solidity",
    language: "Solidity",
    path: "templates/quickstart/foundry/hello-zksync",
    git: "https://github.com/matter-labs/zksync-contract-templates/",
  },
  {
    name: "Quickstart - Foundry",
    value: "qs-fs-factories",
    framework: "Foundry",
    ethereumFramework: "Solidity",
    language: "Solidity",
    path: "templates/quickstart/foundry/factory",
    git: "https://github.com/matter-labs/zksync-contract-templates/",
  },
  {
    name: "Quickstart - Foundry",
    value: "qs-fs-testing",
    framework: "Foundry",
    ethereumFramework: "Solidity",
    language: "Solidity",
    path: "templates/quickstart/foundry/testing",
    git: "https://github.com/matter-labs/zksync-contract-templates/",
  },
];

const logFoundryInfo = () => {
  const contractsDir = "/src";
  const deploymentScriptsDir = "/script";
  const tipMessage =
    "- Tip: You can use the " +
    chalk.blueBright("--rpc-url") +
    " option to specify the network to deploy to.";
  const deployCommand = `- Deploy your contract: ${chalk.blueBright("forge script [OPTIONS] <PATH> [ARGS] --zksync")}`;
  const directoryOverview = `${chalk.magentaBright("Directory Overview:")}
  - Contracts: ${contractsDir}
  - Deployment Scripts: ${deploymentScriptsDir}`;
  const commandsOverview = `${chalk.magentaBright("Commands:")}
  - Compile your contracts: ${chalk.blueBright("forge build --zksync")}
  ${deployCommand}
  ${tipMessage}`;

  Logger.info(`${directoryOverview}\n\n${commandsOverview}`);
};

const logHardhatInfo = (packageManager: PackageManagerType) => {
  const contractsDir = "/contracts";
  const deploymentScriptsDir = "/deploy";
  const tipMessage =
    "- Tip: You can use the " +
    chalk.blueBright("--network") +
    " option to specify the network to deploy to.";
  const deployCommand = `- Deploy your contract: ${chalk.blueBright(packageManagers[packageManager].run("deploy"))}`;
  const directoryOverview = `${chalk.magentaBright("Directory Overview:")}
  - Contracts: ${contractsDir}
  - Deployment Scripts: ${deploymentScriptsDir}`;
  const commandsOverview = `${chalk.magentaBright("Commands:")}
  - Compile your contracts: ${chalk.blueBright(packageManagers[packageManager].run("compile"))}
  ${deployCommand}
  ${tipMessage}`;

  Logger.info(`${directoryOverview}\n\n${commandsOverview}`);
};

export default async (
  folderLocation: string,
  folderRelativePath: string,
  templateKey?: string
) => {
  let env: Record<string, string> = {};
  let template: Template;
  if (!templateKey) {
    const {
      ethereumFramework,
    }: { ethereumFramework: Template["ethereumFramework"] } =
      await inquirer.prompt([
        {
          message: "Ethereum framework",
          name: "ethereumFramework",
          type: "list",
          choices: getUniqueValues(
            templates.map((template) => template.ethereumFramework)
          ),
          required: true,
        },
      ]);
    template = await askForTemplate(
      templates.filter(
        (template) => template.ethereumFramework === ethereumFramework
      )
    );
  } else {
    template = templates.find((e) => e.value === templateKey)!;
    Logger.info(`Using ${chalk.magentaBright(template.name)} template`);
  }
  const { privateKey }: { privateKey: string } = await inquirer.prompt([
    {
      message: "Private key of the wallet responsible for deploying contracts",
      name: "privateKey",
      suffix: chalk.gray(" (optional)"),
      type: "input",
      validate: (input: string) => {
        if (!input) return true; // since it's optional
        return isPrivateKey(input);
      },
      transformer: (input: string) => {
        return input.replace(/./g, "*");
      },
    },
  ]);
  env = {
    ...env,
    WALLET_PRIVATE_KEY: privateKey,
  };
  let packageManager: PackageManagerType | undefined;
  if (template.framework === "Foundry") {
    await setupTemplate(template, folderLocation, env);
    successfulMessage.start(folderRelativePath);
    logFoundryInfo();
    successfulMessage.end(folderRelativePath);
  } else {
    packageManager = await askForPackageManager();
    await setupTemplate(template, folderLocation, env, packageManager);
    successfulMessage.start(folderRelativePath);
    logHardhatInfo(packageManager);
    successfulMessage.end(folderRelativePath);
  }
};
