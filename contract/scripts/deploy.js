const hre = require("hardhat");
const TOKEN_NAME = "TEST";
const TOKEN_SYMBOL = "TST";
const BASE_URI = "ipfs://QmdtEUVRTNx1MXxooz2fbr67pwMCqZHMdYY51o5ueJAQFJ"; // This will be a single metadata file that will resolve for every token until we reveal
const MAX_PER_TX = 5;
const MINT_PRICE = 0.06;

async function main() {
  const ERC721 = await hre.ethers.getContractFactory("BASEERC721");
  const erc721 = await ERC721.deploy(
    BASE_URI,
    MAX_PER_TX,
    TOKEN_NAME,
    TOKEN_SYMBOL
  );

  await erc721.deployed();

  console.log("Contract deployed to:", erc721.address);
  //0x5FbDB2315678afecb367f032d93F642f64180aa3
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });