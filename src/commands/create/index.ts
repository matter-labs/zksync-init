import path from "path";
import chalk from "chalk";
import { Option } from "commander";
import inquirer from "inquirer";

import { zeekOption } from "../../common/options.js";
import Program from "../../program.js";
import { fileOrDirExists } from "../../utils/files.js";
import Logger from "../../utils/logger.js";
import zeek from "../../utils/zeek.js";
import useContractTemplates, {
  templates as contractTemplates,
} from "./groups/contracts.js";
import useFrontendTemplates, {
  templates as frontendTemplates,
} from "./groups/frontend.js";
import useQuickstartTemplates, {
  templates as quickstartTemplates,
} from "./groups/quickstart.js";
import useScriptingTemplates, {
  templates as scriptingTemplates,
} from "./groups/scripting.js";

import type { DefaultOptions } from "../../common/options.js";

export type GenericTemplate = {
  name: string;
  value: string;
  git: string;
  path?: string;
};
type ProjectType = "frontend" | "contracts" | "scripting" | "quickstart";

const templateOption = new Option(
  "--template <name>",
  "Project template to use"
).choices(
  [
    ...contractTemplates,
    ...frontendTemplates,
    ...scriptingTemplates,
    ...quickstartTemplates,
  ].map((template) => template.value)
);
const projectTypeOption = new Option(
  "--project <name>",
  "Project type to select templates from"
).choices(["contracts", "frontend", "scripting"]);

type CreateOptions = DefaultOptions & {
  folderName?: string;
  project?: ProjectType;
  template: string;
};

export const handler = async (
  predefinedFolderName: string | undefined,
  options: CreateOptions
) => {
  try {
    options = {
      ...options,
      folderName: predefinedFolderName,
    };
    Logger.debug(
      `Initial create project options: ${JSON.stringify(options, null, 2)}`
    );

    if (!options.folderName) {
      const transformer = (input: string) => {
        return input.trim().replace(/\s+/g, "-");
      };
      const { folderName }: { folderName: string } = await inquirer.prompt([
        {
          name: "folderName",
          message: "Enter a folder name for your project:",
          required: true,
          default: "my-zksync-project",
          validate: (input) => {
            const formattedInput = input.trim().replace(/\s+/g, "-");
            const isValid = /^[a-zA-Z0-9-_]+$/.test(formattedInput);
            return (
              isValid ||
              "Folder name can only contain letters, numbers, hyphens, and underscores."
            );
          },
          transformer,
        },
      ]);
      options.folderName = transformer(folderName);
    }
    const folderLocation = path.join(process.cwd(), options.folderName!);
    if (fileOrDirExists(folderLocation)) {
      throw new Error(
        `Folder at ${folderLocation} already exists. Try a different project name or remove the folder.`
      );
    }

    const templates: {
      [key in ProjectType]: (
        folder: string,
        folderRelativePath: string,
        templateKey?: string
      ) => Promise<void>;
    } = {
      contracts: useContractTemplates,
      frontend: useFrontendTemplates,
      quickstart: useQuickstartTemplates,
      scripting: useScriptingTemplates,
    };

    if (!options.template) {
      const { projectType }: { projectType: ProjectType } =
        await inquirer.prompt([
          {
            message: "What type of project do you want to create?",
            name: "projectType",
            type: "list",
            choices: [
              {
                name: `Contracts ${chalk.gray("- quick contract deployment and testing")}`,
                short: "Contracts",
                value: "contracts",
              },
              {
                name: `Frontend ${chalk.gray("- rapid UI development and integration")}`,
                short: "Frontend",
                value: "frontend",
              },
              {
                name: `Scripting ${chalk.gray("- automated interactions and advanced ZKsync operations")}`,
                short: "Scripting",
                value: "scripting",
              },
            ],
            required: true,
          },
        ]);

      await templates[projectType](folderLocation, options.folderName);
    } else {
      // find project type by template value
      let projectType: ProjectType | undefined;
      if (
        contractTemplates.some(
          (template) => template.value === options.template
        )
      ) {
        projectType = "contracts";
      } else if (
        frontendTemplates.some(
          (template) => template.value === options.template
        )
      ) {
        projectType = "frontend";
      } else if (
        scriptingTemplates.some(
          (template) => template.value === options.template
        )
      ) {
        projectType = "scripting";
      } else if (
        quickstartTemplates.some(
          (template) => template.value === options.template
        )
      ) {
        projectType = "quickstart";
      }
      if (!projectType)
        throw new Error(
          `Could not find project type for template ${options.template}`
        );

      await templates[projectType](
        folderLocation,
        options.folderName,
        options.template
      );
    }

    if (options.zeek) {
      zeek();
    }
  } catch (error) {
    Logger.error("There was an error while creating new project:");
    Logger.error(error);
  }
};

Program.command("create")
  .description("Scaffold new project for ZKsync")
  .argument("[folder_name]", "Folder name to create project in")
  .addOption(templateOption)
  .addOption(projectTypeOption)
  .addOption(zeekOption)
  .action(handler);
