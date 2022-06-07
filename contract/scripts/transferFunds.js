const hre = require("hardhat");

async function main() {
  const [owner, addr1] = await hre.ethers.getSigners();
  let tx = {
    to: "0xCdCDC174901B12e87Cc82471A2A2Bd6181c89392",
    // Convert currency unit from ether to wei
    value: ethers.utils.parseEther("2")
}
  const res = await owner.sendTransaction(tx);
  console.log(res);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });