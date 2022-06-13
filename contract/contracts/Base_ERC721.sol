pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract BASEERC721 is ERC721Enumerable, Ownable, EIP712("AllowList", "1.0") {
    using Counters for Counters.Counter;
    using Strings for uint256;

    struct AllowList {
        address allow; // address of the subject of the verification
    }

    string private PREVIOUS_SIGNATURE = "0";
    string public BASE_URI;
    uint256 public MAX_SUPPLY = 10000;
    uint256 public PRICE = 60000000000000000;
    uint256 public MAX_PER_TX = 0;
    bool public PUBLIC_SALE = false;
    address public CONTRACT_OWNER;

    constructor(
        string memory baseURI,
        uint256 max_per_tx,
        string memory name,
        string memory symbol
    ) ERC721(name, symbol) {
        BASE_URI = baseURI;
        MAX_PER_TX = max_per_tx;
        CONTRACT_OWNER = msg.sender;
    }

    function _baseURI() internal view override returns (string memory) {
        return string(abi.encodePacked(BASE_URI, "/"));
    }

    function togglePublicSale() public onlyOwner {
        PUBLIC_SALE = !PUBLIC_SALE;
    }

    function mintAllowList(
        uint256 quantity,
        AllowList memory dataToVerify,
        bytes memory signature,
        address addr
    ) external payable {
        require(totalSupply() <= MAX_SUPPLY, "Would exceed max supply");
        require(msg.value >= PRICE, "insufficient funds");
        require(quantity <= MAX_PER_TX, "cannot mint that many");
        require(_verifySignature(dataToVerify, signature), "Invalid signature");
        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = totalSupply() + 1;
            _safeMint(addr, tokenId);
        }
    }

    function mint(address addr, uint256 quantity) public payable {
        require(PUBLIC_SALE == true, "Public sale not active");
        require(totalSupply() <= MAX_SUPPLY, "Would exceed max supply");
        require(msg.value >= PRICE, "insufficient funds");
        require(quantity <= MAX_PER_TX, "cannot mint that many");
        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = totalSupply() + 1;
            _safeMint(addr, tokenId);
        }
    }

    function _verifySignature(
        AllowList memory dataToVerify,
        bytes memory signature
    ) internal view returns (bool) {
        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    keccak256("AllowList(address allow)"),
                    dataToVerify.allow
                )
            )
        );

        require(keccak256(bytes(signature)) != keccak256(bytes(PREVIOUS_SIGNATURE)), "Invalid nonce");
        require(msg.sender == dataToVerify.allow, "Not on allow list");

        address signerAddress = ECDSA.recover(digest, signature);
 
        require(CONTRACT_OWNER == signerAddress, "Invalid signature");

        return true;
    }
}
