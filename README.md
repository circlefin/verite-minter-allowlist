## Verite Minter Allowlist Example App

This example app shows how a project might use verifiable credentials to add people to a minting allow list. Today, projects often manage allow lists on-chain. This is expensive, but it's secure. Verite + VCs should allow for off-chain allow list management. 

### How does it work?

This is just an example - a production implementation would need to take additional security precautions. 

In this example, a project runs a client and a server. The server includes a file system database for managing delegated keys. The flow looks like this: 

1) Project creates a list of wallet addresses that should be on the allow list. 
2) User comes to the project's frontend site and signs in with Ethereum.
3) User requests a VC representing that they should be on the allow list.
4) If the user is supposed to receive the VC, the project generates the credential on the server and returns it to the client.
5) The credential is stored in local storage
6) When the user is ready to mint (during the pre-sale, for example), the mint function will first make a call to the server with the verifiable credential.
7) The server will verify the credential.
8) If the credential is valid, the server will generate an EIP712-compliant message including the user's wallet address and a nonce.
9) This message will be signed with the project's private key (in the example, it's the same key used to deploy the smart contract, but this is not the best option in production).
10) The user, through a function on the frontend, will call the minting contract with all the parameters to mint PLUS the signature provided by the server.
11) The smart contract will verify the signature, make sure the recovered address matches the expected address (in this case, it's the contract deployer, but again there are better options in production). 
12) If the addresses match, the contract will verify the signature is not being re-used.
13) If the signature is not being re-used, the contract will allow the user to mint.