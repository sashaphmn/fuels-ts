// #region main
import { Provider, Wallet, TESTNET_NETWORK_URL } from 'fuels';

const ADDRESS = '0x767caf5b08eba21c561078a4d5be09bbd7f16b9eca22699a61f1edd9e456126f';

// Create a provider using the `TESTNET_NETWORK_URL` constant
const provider = await Provider.create(TESTNET_NETWORK_URL);

// Then use it when creating a wallet
const wallet = Wallet.fromAddress(ADDRESS, provider);
const balances = await wallet.getBalances();

console.log({ balances, providerUrl: provider.url });
// #endregion main
