<div align="center">

# ‣ ZKsync CLI 

![ZKsync CLI](./zksync-cli-banner.png)

This CLI tool simplifies the process of developing applications and interacting with ZKsync.

[Documentation](https://docs.zksync.io/build/tooling/zksync-cli) | [Report a bug](https://github.com/matter-labs/zksync-cli/issues/new) | [Request a feature](https://github.com/matter-labs/zksync-cli/issues/new)

[pr-welcome]: https://img.shields.io/static/v1?color=indigo&label=PRs&style=flat&message=welcome

</div>

## Table of Contents

- [Prerequisites](#-prerequisites)
- [Usage](#-usage)
- [Commands List](#-commands)
  - [Local Development](#local-development-commands)
  - [Create Project](#create-project-commands)
  - [Contract Interaction](#contract-interaction-commands)
  - [Transaction](#transaction-commands)
  - [Wallet](#wallet-commands)
  - [Bridge](#bridge-commands)
  - [Other Commands](#other-commands)
- [Supported Chains](#-supported-chains)
- [Developing New Features](#-developing-new-features)
- [Official Links](#-official-links)
- [License](#-license)
- [Troubleshooting](#-troubleshooting)

## 🛠 Prerequisites

- [Node.js v18 or higher](https://nodejs.org/en)
- [Git](https://git-scm.com/downloads)
- [Docker](https://www.docker.com/get-started/) (for `zksync-cli dev` commands)

## 📥 Usage

You can run commands without installation: `npx zksync-cli`. For example: `npx zksync-cli dev start`.

## 💻 Commands

### Local development commands
`npx zksync-cli dev` - Manage local ZKsync development environment. It allows to easily start ZKsync stack locally, for example: local Ethereum and ZKsync nodes, Block Explorer, Wallet and Bridge.

- `npx zksync-cli dev start` - start local development environment (will ask to configure if starting for the first time)
- `npx zksync-cli dev clean` - clean data for configured modules
- `npx zksync-cli dev config` - select modules to run in local development environment

Run `npx zksync-cli dev` to see the full list of commands.

### Create Project commands
- `npx zksync-cli create`: Create a project using updated templates.
  - **Frontend**: Rapid UI development with templates for Vue, React, Next.js, Nuxt, Vite, etc. Options include viem, ethers, web3modal, rainbowkit. [More Info](https://github.com/matter-labs/zksync-frontend-templates#readme)
  - **Contracts**: Quick contract deployment and testing with tools like Hardhat on Solidity or Vyper. [Contract templates](https://github.com/matter-labs/zksync-contract-templates#readme)
  - **Scripting**: Automated interactions and advanced ZKsync operations using Node.js, with examples of wallet or contract interactions using viem, ethers or web3.js. [Scripting Templates](https://github.com/matter-labs/zksync-scripting-templates#readme)

### Contract interaction commands
See full documentation and advanced examples [here](./docs/contract-interaction.md).
- `npx zksync-cli contract read`: run read-only contract methods
- `npx zksync-cli contract write`: send transactions to the contract
- `npx zksync-cli contract encode`: get calldata from the contract method

### Transaction commands
See full documentation and advanced examples [here](./docs/transaction-info.md).
- `npx zksync-cli transaction info`: get information about a transaction

### Wallet commands
- `npx zksync-cli wallet transfer`: send funds on L2 to another account
- `npx zksync-cli wallet balance`: displays token balance of the specified address

### Bridge commands
- `npx zksync-cli bridge deposit`: deposits funds from Ethereum (L1) to ZKsync (L2)
- `npx zksync-cli bridge withdraw`: withdraws funds from ZKsync (L2) to Ethereum (L1)
- `npx zksync-cli bridge withdraw-finalize`: finalizes withdrawal of funds from ZKsync (L2) to Ethereum (L1)

### Other commands
- `npx zksync-cli config chains`: Add or edit custom chains
- `npx zksync-cli help`: Provides information about all supported commands
- `npx zksync-cli <command> --help`: Provides detailed information about how to use a specific command. Replace \<command\> with the name of the command you want help with (e.g., `create`, `dev config`, `bridge withdraw-finalize`)
- `npx zksync-cli --version`: Returns the current version


### 🔗 Supported chains

Note: currently you might face issues interacting with custom ZK Chains. Fix is in progress.
By default ZKsync CLI bridge commands support ZKsync Sepolia Testnet and ZKsync Mainnet. You can also use other networks by using one the options below:
- Adding custom chain using `npx zksync-cli config chains` command.
- Overwriting L1 and L2 RPC URLs. For example: `npx zksync-cli deposit --rpc=http://... --l1-rpc=http://...`

If you're using [local setup (dockerized testing node)](https://github.com/matter-labs/local-setup) with default L1 and L2 RPC URLs, you can select `Local Dockerized node` option in the CLI or provide option `--chain local-dockerized`.

## 👩‍💻 Developing new features

### Run in development mode

1. Install all dependencies with `npm i`.
2. To use CLI in development mode run `npm run dev -- [command] [options]` (e.g. `npm run dev -- bridge deposit --chain=zksync-sepolia`).

### Building for production

1. Install all dependencies with `npm i`.
2. This project was build with Typescript. Run `npm run build` to compile the code into `/bin`.
3. You can run your local build with `node ./bin`

### Testing

At the moment, we are working on CLI tests.
In the meantime, you can test the code manually by running the code in [development mode](#run-in-development-mode).

### CLI tests

To run CLI tests for zksync-cli do the following:
1. Make preparation steps `1` and `2` from `Building for production`, or just run `npm i && npm run build`
2. Make sure you see your development build `0.0.0-development` using `npx zksync-cli --version`. If not, install it in depends of your OS settings: `npm i -g .` or `sudo npm i -g .` If you have any other zksync-cli package installed globally `npm ls -g`, just remove it in advance `npm remove zksync-cli -g`.
3. Make sure you have [Docker](https://docs.docker.com/engine/install/) on your system.
4. Rename `.env.example` to `.env` in `./test/src/` dir and add your wallet private key to this file. F.e.: It may looks like `E2E_TESTNET_PK=012345...abcdef`
5. Run `npm run test`

## 🌍 Official Links

- [Website](https://zksync.io/)
- [GitHub](https://github.com/matter-labs)
- [Twitter](https://twitter.com/zksync)
- [Twitter for Devs](https://twitter.com/ZKsyncDevs)
- [Discord](https://join.zksync.dev/)
- [Youtube](https://www.youtube.com/@ZKsync-era)

## 📜 License

This project is licensed under [MIT](./LICENSE-MIT).

## ❓ Troubleshooting

Encountering issues with ZKsync CLI? Below are some common problems with step-by-step recommendations for resolving them:

<details>
<summary><b>`unknown command` Error</b></summary>

If you encounter an `unknown command` error, follow these steps:

a. **Check the ZKsync CLI Version**
   - Run `npx zksync-cli --version` to check your current version.
   - Compare it with the latest version available on [npm](https://www.npmjs.com/package/zksync-cli).
   - If your version is lower than the one on npm follow the steps bellow. If your version is up-to-date, it's possible that the command was moved or renamed. Use `npx zksync-cli help` for a list of current commands or refer to the documentation.

b. **Verify Local Installation**
   - Use `npm list zksync-cli` to check if `zksync-cli` is installed in the current directory or any parent directories from where you are running your terminal.
   - If it is indeed installed, make sure to uninstall it by running `npm uninstall zksync-cli` in its installation location. Remove all instances of `zksync-cli` until there are no more found by `npm list zksync-cli`.

c. **Verify Global Installation**
   - Use `npm list -g zksync-cli` to check if `zksync-cli` is installed globally.
   - If it is installed globally, uninstall it using `npm uninstall -g zksync-cli`.

d. **Clean npm Cache**
   - Run `npm cache clean --force`.

e. **Use the Latest Version**
   - As a quick fix, or if the above steps don't resolve the issue, use `npx zksync-cli@latest [command]`, for example, `npx zksync-cli@latest dev start`.
</details>

<details>
<summary><b>My Version is Outdated</b></summary>

If `npx zksync-cli` is not running the latest version:

- Refer to the guide above to check and update your ZKsync CLI version.
</details>

<details>
<summary><b>`command not found: npx` Error</b></summary>

If you receive a `command not found: npx` error, it means Node.js is not installed or not correctly set up on your system:

- Install Node.js from [https://nodejs.org/](https://nodejs.org/). This will also install `npm` and `npx`.
- After installation, restart your terminal and try running `npx zksync-cli` again.
</details>

For all other issues, we encourage you to ask for help or report them in our [GitHub Discussions](https://github.com/ZKsync-Community-Hub/zksync-developers/discussions/new?category=general&title=[zksync-cli]%20<Title>).
