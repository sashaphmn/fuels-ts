import { Address } from '@fuel-ts/address';
import { ErrorCode, FuelError } from '@fuel-ts/errors';
import type { AbstractAddress } from '@fuel-ts/interfaces';
import { Mnemonic } from '@fuel-ts/mnemonic';
import type { Provider } from '@fuel-ts/providers';
import type { WalletUnlocked } from '@fuel-ts/wallet';
import { Wallet } from '@fuel-ts/wallet';

import type { Vault } from '../types';

interface MnemonicVaultOptions {
  secret?: string;
  rootPath?: string;
  numberOfAccounts?: number | null;
  provider: Provider;
}

export class MnemonicVault implements Vault<MnemonicVaultOptions> {
  static readonly type = 'mnemonic';
  readonly #secret: string;

  pathKey = '{}';
  rootPath: string = `m/44'/1179993420'/${this.pathKey}'/0/0`;
  numberOfAccounts: number = 0;
  provider: Provider;

  constructor(options: MnemonicVaultOptions) {
    this.#secret = options.secret || Mnemonic.generate();
    this.rootPath = options.rootPath || this.rootPath;
    // On creating the vault also adds one account
    this.numberOfAccounts = options.numberOfAccounts || 1;
    this.provider = options.provider;
  }

  getDerivePath(index: number) {
    if (this.rootPath.includes(this.pathKey)) {
      return this.rootPath.replace(this.pathKey, String(index));
    }
    return `${this.rootPath}/${index}`;
  }

  serialize(): MnemonicVaultOptions {
    return {
      secret: this.#secret,
      rootPath: this.rootPath,
      numberOfAccounts: this.numberOfAccounts,
      provider: this.provider,
    };
  }

  getAccounts() {
    const accounts = [];
    let numberOfAccounts = 0;

    // Create all accounts to current vault
    do {
      const wallet = Wallet.fromMnemonic(
        this.#secret,
        this.provider,
        this.getDerivePath(numberOfAccounts)
      );
      accounts.push({
        publicKey: wallet.publicKey,
        address: wallet.address,
      });
      numberOfAccounts += 1;
    } while (numberOfAccounts < this.numberOfAccounts);

    return accounts;
  }

  addAccount() {
    this.numberOfAccounts += 1;
    const wallet = Wallet.fromMnemonic(
      this.#secret,
      this.provider,
      this.getDerivePath(this.numberOfAccounts - 1)
    );

    return {
      publicKey: wallet.publicKey,
      address: wallet.address,
    };
  }

  exportAccount(address: string | AbstractAddress): string {
    let numberOfAccounts = 0;
    const ownerAddress = Address.fromAddressOrString(address);
    // Look for the account that has the same address
    do {
      const wallet = Wallet.fromMnemonic(
        this.#secret,
        this.provider,
        this.getDerivePath(numberOfAccounts)
      );
      if (wallet.address.equals(ownerAddress)) {
        return wallet.privateKey;
      }
      numberOfAccounts += 1;
    } while (numberOfAccounts < this.numberOfAccounts);

    throw new FuelError(
      ErrorCode.WALLET_MANAGER_ERROR,
      `Account with address '${address}' not found in derived wallets.`
    );
  }

  getWallet(address: string | AbstractAddress): WalletUnlocked {
    const privateKey = this.exportAccount(address);
    return Wallet.fromPrivateKey(privateKey, this.provider);
  }
}
