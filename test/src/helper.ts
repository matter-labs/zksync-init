import { spawnSync } from "child_process";


export function executeCommand(command: string) {
  const result = spawnSync(command, { encoding: 'utf-8', shell: true, stdio: 'pipe' });
  return {
    output: result.stdout.trim() || result.stderr.trim(),
    exitCode: result.status
  };
}
