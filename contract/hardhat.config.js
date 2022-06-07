require("dotenv").config();
require('hardhat-contract-sizer');
require("hardhat-gas-reporter");
require("@nomiclabs/hardhat-waffle");

module.exports = {
  solidity: "0.8.4",
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true
  }, 
  gasReporter: {
    currency: 'USD',
    gasPrice: "auto", 
    coinmarketcap: process.env.COINMARKETCAP_KEY, 
    gasPriceApi:
        "https://api.etherscan.io/api?module=proxy&action=eth_gasPrice",
  }, 
  networks: {
    hardhat: {
      chainId: 1337
    },
  }
};
