import { ethers } from 'ethers';
import { SiweMessage } from 'siwe';
import { buildKycVerificationOffer } from "verite";
// import Web3 from "web3";
import { json } from "./abi";

// const web3 = new Web3(Web3.givenProvider || "ws://localhost:8545");

const domain = window.location.host;
const origin = window.location.origin;
const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

const BACKEND_ADDR = "http://localhost:3000";
async function createSiweMessage(address, statement) {
    const res = await fetch(`${BACKEND_ADDR}/nonce`, {
        credentials: 'include',
    });
    const message = new SiweMessage({
        domain,
        address,
        statement,
        uri: origin,
        version: '1',
        chainId: '1',
        nonce: await res.text()
    });
    return message.prepareMessage();
}

function connectWallet() {
    provider.send('eth_requestAccounts', [])
        .catch(() => console.log('user rejected request'));
}

async function signInWithEthereum() {
    const message = await createSiweMessage(
        await signer.getAddress(),
        'Sign in with Ethereum to the app.'
    );
    const signature = await signer.signMessage(message);

    const res = await fetch(`${BACKEND_ADDR}/sign_in`, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, signature }),
        credentials: 'include'
    });
    console.log(await res.text());
}

async function requestAllowlistAccess() {
    try {
        const res = await fetch(`${BACKEND_ADDR}/requestAllowlist`, {
            credentials: 'include',
        });
        const message = await res.json();

        if(res.status === 401) {
            alert(message.message);
            return;
        }
        localStorage.setItem("nft-vc", message);
        alert("Credential received and stored in browser");   
    } catch (error) {
        console.log(error);
        alert(error.message);
    }    
}

async function mintPresale() {
    const jwt = localStorage.getItem("nft-vc");
    if(!jwt) {
        alert("No early access credential found");
        return;
    }

    const res = await fetch(`${BACKEND_ADDR}/verifyMintAccess`, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jwt }),
        credentials: 'include'
    });
   
    if(res.status === 401 || res.status === 403) {
        alert("You're not authorized to mint or not signed in with the right wallet");
        return;        
    }

    const sig = await res.text();

    const contract = new ethers.Contract(address, json(), signer);
    const allowList = {
        allow: address
      }
    // alert("You're on the allow list! Time to mint!");
    let overrides = {
        value: ethers.utils.parseEther((0.06).toString()),
      };
    const mint = await contract.mintAllowList(1, allowList, sig, address, overrides);
    console.log(mint);
    alert("Minted successfully");
}

const connectWalletBtn = document.getElementById('connectWalletBtn');
const siweBtn = document.getElementById('siweBtn');
const allowAccessBtn = document.getElementById('allowAccessBtn');
const mintPresaleBtn = document.getElementById('mintPresaleBtn');
connectWalletBtn.onclick = connectWallet;
siweBtn.onclick = signInWithEthereum;
allowAccessBtn.onclick = requestAllowlistAccess;
mintPresaleBtn.onclick = mintPresale;