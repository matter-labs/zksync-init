import { executeCommand } from "./src/helper";


describe("Check zksync-cli dev", () => {

    it("npx zksync-cli dev config", () => {
        const command = "yes | npx zksync-cli dev config";
        const result = executeCommand(command);
        expect(result.exitCode).toBe(0);
    });

    it("npx zksync-cli dev start", () => {
        const command = "npx zksync-cli dev start";
        const result = executeCommand(command);
        expect(result.exitCode).toBe(0);
    });

    //id1718
    it("npx zksync-cli dev update module", () => {
        const command = "npx zksync-cli dev update zkcli-portal";
        const result = executeCommand(command);
        expect(result.output).toMatch(/(Updating module)/i);
        expect(result.exitCode).toBe(0);
    });

    it("npx zksync-cli dev restart", () => {
        const command = "npx zksync-cli dev restart";
        const result = executeCommand(command);
        // console.log(result.output);
        expect(result.exitCode).toBe(0);
    });

    it("npx zksync-cli dev stop", () => {
        const command = "npx zksync-cli dev stop";
        const result = executeCommand(command);
        // console.log(result.output);
        expect(result.exitCode).toBe(0);
    });
});
