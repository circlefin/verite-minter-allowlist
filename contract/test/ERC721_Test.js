const { expect } = require("chai");
const { ethers } = require("hardhat");
const TOKEN_NAME = "TEST";
const TOKEN_SYMBOL = "TST";
const BASE_URI = "ipfs://QmdtEUVRTNx1MXxooz2fbr67pwMCqZHMdYY51o5ueJAQFJ"; // This will be a single metadata file that will resolve for every token until we reveal
const MAX_PER_TX = 5;
const MINT_PRICE = 0.06;
const firstNonce = "9af39248-a65c-4f17-820d-88cc40470d33";
const secondNonce = "cf1b8ac6-aa44-4474-94ad-cb949acf9ecf";
let domain,
types

const deployment = async () => {
  const Contract = await ethers.getContractFactory("BASEERC721");
  const contract = await Contract.deploy(
    BASE_URI,
    MAX_PER_TX,
    TOKEN_NAME,
    TOKEN_SYMBOL
  );
  await contract.deployed();
  return contract;
};

const getDataToSign = async (contract, address) => {
    domain = {
      name: "AllowList",
      version: "1.0",
      chainId: hre.network.config.chainId ?? 1337,
      verifyingContract: await contract.resolvedAddress
    }
    types = {
      AllowList: [       
        { name: "allow", type: "address" }, 
        // { name: "nonce", type: "string" }
      ]
    }
    allowList = {
      allow: address, 
      // nonce: nonce
    }
};

describe("ERC721 Deployment", function () {
  it("Should deploy the contract and BASE_URI should be accurate", async function () {
    const contract = await deployment();
    expect(await contract.BASE_URI()).to.equal(BASE_URI);
  });
});

describe("Minting", () => {
  // it("Should create a deadline in seconds based on last block timestamp", async function () {
  //   const provider = ethers.getDefaultProvider()
  //   const lastBlockNumber = await provider.getBlockNumber()
  //   const lastBlock = await provider.getBlock(lastBlockNumber)
  //   expiration = lastBlock.timestamp + 300
  // });

  // it("should not allow minting is attached eth is too low", async () => {
  //   const contract = await deployment();
  //   const [_, addr1] = await ethers.getSigners();

  //   try {
  //     await contract.connect(addr1).mint(3);
  //   } catch (error) {
  //     expect(error.message).to.include(INSUFFICIENT_FUNDS_ERROR);
  //   }
  // })

  // it("should not allow minting more than max", async () => {
  //   const contract = await deployment();
  //   const [_, addr1] = await ethers.getSigners();

  //   let overrides = {
  //     value: ethers.utils.parseEther((11 * MINT_PRICE).toString()),
  //   };

  //   try {
  //     await contract.connect(addr1).mint(11, overrides);
  //   } catch (error) {
  //     expect(error.message).to.include(TOO_MANY_TOKENS);
  //   }
  // });

  it("should allow minting pre-sale", async () => {
    const contract = await deployment();
    const [owner, addr1] = await ethers.getSigners();
    await getDataToSign(contract, addr1.address);
    const signature = await owner._signTypedData(domain, types, allowList);
    const recoveredAddress = ethers.utils.verifyTypedData(
      domain,
      types,
      allowList,
      signature, 
      firstNonce
    );

    expect(recoveredAddress).to.equal(owner.address);
    let overrides = {
      value: ethers.utils.parseEther((6 * MINT_PRICE).toString()),
    };

    await contract
    .connect(addr1)
    .mintAllowList(5, allowList, signature, addr1.address, overrides);      
    expect(await contract.ownerOf(1)).to.equal(addr1.address);

    // let err = null;
    // try {
    //   const res = await contract
    //   .connect(addr1)
    //   .mintAllowList(5, allowList, signature, addr1.address, overrides)
    // } catch (error) {
    //   err = error;
    // }
    // expect(err).to.not.equal(null);
  });

  // it("should allow minting one per transaction", async () => {
  //   const contract = await deployment();
  //   const [_, addr1] = await ethers.getSigners();

  //   let overrides = {
  //     value: ethers.utils.parseEther((MINT_PRICE).toString()),
  //   };

  //   await contract.connect(addr1).mint(1, overrides);
  //   expect(await contract.totalSupply()).to.equal(1);
  // });

  // it("should allow minting multiple max per transaction", async () => {
  //   const contract = await deployment();
  //   const [_, addr1] = await ethers.getSigners();

  //   let overrides = {
  //     value: ethers.utils.parseEther((4 * MINT_PRICE).toString()),
  //   };

  //   await contract.connect(addr1).mint(4, overrides);
  //   expect(await contract.totalSupply()).to.equal(4);
  // });
});

// describe("Updating URI", () => {
//   it("should set a new baseURI", async () => {
//     const contract = await deployment();
//     expect(await contract.BASE_URI()).to.equal(BASE_URI);
//     const NEW_URI = "ipfs://QmdtEUVRTbqlMXxooz2fbr67pwMCqZHMdYY51o5ueJAQFJ/"
//     await contract.setBaseURI(NEW_URI);
//     expect(await contract.BASE_URI()).to.equal(NEW_URI);
//     const [_, addr1] = await ethers.getSigners();

//     let overrides = {
//       value: ethers.utils.parseEther((4 * MINT_PRICE).toString()),
//     };

//     await contract.connect(addr1).mint(4, overrides);
//     expect(await contract.totalSupply()).to.equal(4);
//     expect(await contract.tokenURI(1)).to.equal(`${NEW_URI}1`);
//   })
// })

// describe("Withdrawing", () => {
//   it("should withdraw the correct funds", async () => {
//     const contract = await deployment();
//     const [owner, addr1] = await ethers.getSigners();

//     let overrides = {
//       value: ethers.utils.parseEther((4 * MINT_PRICE).toString()),
//     };

//     await contract.connect(addr1).mint(4, overrides);
//     expect(await contract.totalSupply()).to.equal(4);
//     const provider = ethers.provider;  
//     const balance = await provider.getBalance(owner.address);
//     const wei = ethers.BigNumber.from(balance.toString());
//     const currentBalanceInEth = parseInt(ethers.utils.formatEther(wei), 10);
//     await contract.connect(owner).withdraw();
    
//     const updatedBalance = await provider.getBalance(owner.address);
//     const updatedWei = ethers.BigNumber.from(updatedBalance.toString());
//     const updatedBalanceInEth = parseInt(ethers.utils.formatEther(updatedWei), 10);
    
//     const mintedValueInEth = MINT_PRICE * 4;

//     expect(updatedBalanceInEth).to.equal(mintedValueInEth + currentBalanceInEth);
//   })
// })
