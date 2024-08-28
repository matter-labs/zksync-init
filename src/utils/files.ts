import fs from "fs";
import { homedir } from "os";
import path from "path";
import { fileURLToPath } from "url";

const getUserDirectory = () => {
  // From the XDG Base Directory Specification:
  // `$XDG_STATE_HOME` defines the base directory relative to which user-specific state files should be stored.
  // If `$XDG_STATE_HOME` is either not set or empty, a default equal to `$HOME/.local/state/` should be used.
  const xdgStateHome =
    process.env.XDG_STATE_HOME || path.join(homedir(), ".local/state/");
  return path.join(xdgStateHome, "zksync-cli/");
};

export const getLocalPath = (...filePath: string[]) => {
  return path.join(getUserDirectory(), ...filePath);
};

export const fileOrDirExists = (...filePath: string[]) => {
  return fs.existsSync(path.join(...filePath));
};

export const getDirPath = (filePath: string) => {
  const filename = fileURLToPath(filePath);
  return path.dirname(filename);
};

export const writeFile = (
  filePath: string,
  data: string | NodeJS.ArrayBufferView
) => {
  // Create directory if it doesn't exist
  const directory = path.dirname(filePath);
  if (!fileOrDirExists(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  // Then write file
  fs.writeFileSync(filePath, data, "utf-8");
};

export const createSymlink = (
  targetPath: string,
  linkPath: string,
  type: "file" | "dir" | "junction" = "file"
) => {
  if (fileOrDirExists(linkPath)) {
    throw new Error(`${type} already exists at ${linkPath}`);
  }
  fs.symlinkSync(targetPath, linkPath, type);
};

export const copyRecursiveSync = (src: string, dest: string) => {
  const stats = fs.statSync(src);
  const isDirectory = stats.isDirectory();
  if (isDirectory) {
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
};
