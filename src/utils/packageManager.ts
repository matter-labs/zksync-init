import { executeCommand } from "./helpers.js";

// Define the type for package managers
export type PackageManagerType = "npm" | "yarn" | "pnpm" | "bun";

// Define the structure of the package manager methods
interface PackageManagerMethods {
  install(packages?: string): string;
  run(script: string): string;
  uninstall(packages?: string): string;
  isInstalled(): Promise<boolean>;
}

// The package manager implementations
export const packageManagers: Record<
  PackageManagerType,
  PackageManagerMethods
> = {
  npm: {
    install(packages?: string): string {
      return `npm install${packages ? ` ${packages}` : ""} --force`;
    },
    run(script: string): string {
      return `npm run ${script}`;
    },
    uninstall(packages: string): string {
      return `npm uninstall ${packages}`;
    },
    isInstalled(): Promise<boolean> {
      return executeCommand("npm --version", { silent: true })
        .then(() => true)
        .catch(() => false);
    },
  },
  yarn: {
    install(packages?: string): string {
      return `yarn${packages ? ` add ${packages}` : ""} --force`;
    },
    run(script: string): string {
      return `yarn ${script}`;
    },
    uninstall(packages: string): string {
      return `yarn remove ${packages}`;
    },
    isInstalled(): Promise<boolean> {
      return executeCommand("yarn --version", { silent: true })
        .then(() => true)
        .catch(() => false);
    },
  },
  pnpm: {
    install(packages?: string): string {
      return packages ? `pnpm add ${packages}` : "pnpm install --force";
    },
    run(script: string): string {
      return `pnpm ${script}`;
    },
    uninstall(packages: string): string {
      return `pnpm uninstall ${packages}`;
    },
    isInstalled(): Promise<boolean> {
      return executeCommand("pnpm --version", { silent: true })
        .then(() => true)
        .catch(() => false);
    },
  },
  bun: {
    install(packages?: string): string {
      return packages ? `bun add ${packages}` : "bun install --force";
    },
    run(script: string): string {
      return `bun run ${script}`;
    },
    uninstall(packages: string): string {
      return `bun remove ${packages}`;
    },
    isInstalled(): Promise<boolean> {
      return executeCommand("bun --version", { silent: true })
        .then(() => true)
        .catch(() => false);
    },
  },
};
