import { adresses, contracts, wallet } from "./src/entities";
import { executeCommand } from "./src/helper";
import { setTimeout } from "timers/promises";


describe("Common tests", () => {

  //id1717
  describe("Check version of package", () => {
    it("npx zksync-cli -V", () => {
      const command = "npx zksync-cli -V";
      const result = executeCommand(command);
      expect(result.output).toMatch(/(^\d+\.\d+\.\d+(-\w+)?$)/i);
      expect(result.exitCode).toBe(0);
    });

    it("npx zksync-cli --version", () => {
      const command = "npx zksync-cli --version";
      const result = executeCommand(command);
      expect(result.output).toMatch(/(^\d+\.\d+\.\d+(-\w+)?$)/i);
      expect(result.exitCode).toBe(0);
    });

    it("Negative: npx zksync-cli --wersion", () => {
      const command = "npx zksync-cli --wersion";
      const result = executeCommand(command);
      expect(result.output).not.toMatch(/(^\d+\.\d+\.\d+(-\w+)?$)/i);
      expect(result.exitCode).toBe(1);
    });
  });

  //id1734 id1715
  describe("Check help for:", () => {
    it("npx zksync-cli help", () => {
      const command = "npx zksync-cli help";
      const result = executeCommand(command);
      expect(result.output).toMatch(/(CLI tool that simplifies the process of developing applications and interacting)/i);
      expect(result.exitCode).toBe(0);
    });

    it("npx zksync-cli help dev", () => {
      const command = "npx zksync-cli help dev";
      const result = executeCommand(command);
      expect(result.output).toMatch(/(Manage local zkSync development environment)/i);
      expect(result.exitCode).toBe(0);
    });

    it("Negative: npx zksync-cli helppp", () => {
      const command = "npx zksync-cli helppp";
      const result = executeCommand(command);
      expect(result.output).toMatch(/(CLI tool that simplifies the process of developing applications and interacting)/i);
      expect(result.exitCode).toBe(1);
    });

    it("npx zksync-cli -h", () => {
      const command = "npx zksync-cli -h";
      const result = executeCommand(command);
      expect(result.output).toMatch(/(Options:|Commands:)/i);
      expect(result.exitCode).toBe(0);
    });

    it("npx zksync-cli --help", () => {
      const command = "npx zksync-cli --help";
      const result = executeCommand(command);
      expect(result.output).toMatch(/(Options:|Commands:)/i);
      expect(result.exitCode).toBe(0);
    });
  });

  //id1715
  describe("Check help selection for:", () => {
    it("npx zksync-cli dev --help", () => {
      const command = "npx zksync-cli dev --help";
      const result = executeCommand(command);
      expect(result.output).toMatch(/(Select modules to run in local development)/i);
      expect(result.output).toMatch(/(Start local zkSync environment and modules)/i);
      expect(result.output).toMatch(/(Stop local zkSync environment and modules)/i);
      expect(result.exitCode).toBe(0);
    });

    it("npx zksync-cli dev -h", () => {
      const command = "npx zksync-cli dev -h";
      const result = executeCommand(command);
      expect(result.output).toMatch(/(Select modules to run in local development)/i);
      expect(result.output).toMatch(/(Start local zkSync environment and modules)/i);
      expect(result.output).toMatch(/(Stop local zkSync environment and modules)/i);
      expect(result.exitCode).toBe(0);
    });

    it("npx zksync-cli dev help start", () => {
      const command = "npx zksync-cli dev help start";
      const result = executeCommand(command);
      expect(result.output).toMatch(/(Start local zkSync environment and modules)/i);
      expect(result.exitCode).toBe(0);
    });
  });

  //id1719
  describe("User can check installed modules", () => {
    it("npx zksync-cli dev modules", () => {
      const command = "npx zksync-cli dev modules";
      const result = executeCommand(command);
      expect(result.output).toMatch(/(In memory node)/i);
      expect(result.output).toMatch(/(Dockerized node)/i);
      expect(result.output).toMatch(/(Portal)/i);
      expect(result.exitCode).toBe(0);
    });
  });

  //id1869
  describe("Check wallet balance of specified address", () => {
    const partialCommand = "npx zksync-cli wallet balance";
    it(`${partialCommand} | on Sepolia Testnet`, () => {
      const command = `${partialCommand} --chain zksync-sepolia --address ${adresses.sepoliaTestnet}`;
      const result = executeCommand(command);
      expect(result.output).toMatch(/(zkSync Sepolia Testnet Balance:)/i);
      expect(result.exitCode).toBe(0);
    });

    it(`${partialCommand} | on zkSync Mainnet`, () => {
      const command = `${partialCommand} --chain zksync-mainnet --address ${adresses.zksyncMainnet}`;
      const result = executeCommand(command);
      expect(result.output).toMatch(/(zkSync Mainnet Balance:)/i);
      expect(result.exitCode).toBe(0);
    });

    it(`${partialCommand} | on Goerli Testnet`, () => {
      const command = `${partialCommand} --chain zksync-goerli --address ${adresses.goerliTestnet}`;
      const result = executeCommand(command);
      expect(result.output).toMatch(/(zkSync Goerli Testnet Balance:)/i);
      expect(result.exitCode).toBe(0);
    });
  });

  //id1874
  describe("User can call read method from deployed contract on network", () => {
    it("npx zksync-cli contract read", () => {
      const command = `npx zksync-cli contract read --chain zksync-sepolia\
          --contract ${contracts.sepoliaTestnet} --method "greet() view returns (string)"\
          --output string`;
      const result = executeCommand(command);
      expect(result.output).toMatch(/(Method response)/i);
      expect(result.output).toMatch(/(Decoded method response:)/i);
      expect(result.output).not.toMatch(/([Ee]rror|[Ww]arning|[Ff]ail)/i);
      expect(result.exitCode).toBe(0);
    });
  });

  //id1875
  describe("User can call write method from deployed contract on network", () => {
    it("npx zksync-cli contract write", () => {
      // We have to use redirection to null in this case to catch the transaction response
      let optionalRedirection = " > /dev/null ";
      if (process.platform === "win32") {
        optionalRedirection = " > nul ";
      }
      const command = `npx zksync-cli contract write --chain zksync-sepolia\
          --contract ${contracts.sepoliaTestnet} --method "setGreeting(string _greeting) "\
          --args "New Test ARG" --private-key ${wallet.testnetPK} ${optionalRedirection}`;
      const result = executeCommand(command);
      setTimeout(3000)
      expect(result.output).toMatch(/(Transaction submitted.)/i);
      expect(result.output).toMatch(/(Transaction processed successfully.)/i);
      expect(result.output).not.toMatch(/([Ee]rror|[Ww]arning|[Ff]ail)/i);
      expect(result.exitCode).toBe(0);
    });
  });
});
