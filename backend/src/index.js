import cors from "cors";
import express from "express";
import Session from "express-session";
import { generateNonce, SiweMessage } from "siwe";
import fs from "fs";
import {
  randomDidKey,
  buildIssuer,
  buildAndSignFulfillment,
  buildKycAmlManifest,
  decodeCredentialApplication,
  buildCredentialApplication,
  buildKycVerificationOffer,
  buildPresentationSubmission,
  validateVerificationSubmission,
  decodeVerifiableCredential,
  decodeVerifiablePresentation,
} from "verite";
import { randomBytes } from "crypto";
import { v4 as uuidv4 } from "uuid";
import ethers from "ethers";


const config = JSON.parse(fs.readFileSync("../config.json"));

const validateAllowlistAccess = (address) => {
  return config.addressesForAllowlist.includes(address);
};

const fromHexString = (hexString) =>
  new Uint8Array(hexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));

const toHexString = (bytes) =>
  bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, "0"), "");

const getOrCreateDidKey = async (address) => {
  const db = JSON.parse(fs.readFileSync("db.json"));
  let keyInfo = db.find((entry) => entry.address === address);
  if (!keyInfo) {
    const subject = randomDidKey(randomBytes);
    subject.privateKey = toHexString(subject.privateKey);
    subject.publicKey = toHexString(subject.publicKey);
    keyInfo = {
      address,
      subject,
    };
    db.push(keyInfo);
    fs.writeFileSync("db.json", JSON.stringify(db));
  }

  return keyInfo;
};

const getIssuerKey = async () => {
  let issuer = JSON.parse(fs.readFileSync("issuer.json"));
  if (!issuer.controller) {
    issuer = randomDidKey(randomBytes);
    issuer.privateKey = toHexString(issuer.privateKey);
    issuer.publicKey = toHexString(issuer.publicKey);
    if (!issuerDidKey.signingKey) {
      const randomWallet = ethers.Wallet.createRandom();
      const privateKey = randomWallet._signingKey().privateKey;
      issuerDidKey.signingKey = privateKey;
    }
    fs.writeFileSync("issuer.json", JSON.stringify(issuer));
  }

  return issuer;
};

const createApplication = async (issuerDidKey, subject) => {
  subject.privateKey = fromHexString(subject.privateKey);
  subject.publicKey = fromHexString(subject.publicKey);
  const manifest = buildKycAmlManifest({ id: issuerDidKey.controller });
  const application = await buildCredentialApplication(subject, manifest);
  return application;
};

const getPresentation = async (issuerDidKey, application) => {
  issuerDidKey.privateKey = fromHexString(issuerDidKey.privateKey);
  issuerDidKey.publicKey = fromHexString(issuerDidKey.publicKey);

  const decodedApplication = await decodeCredentialApplication(application);

  const attestation = {
    type: "KYCAMLAttestation",
    process: "https://verite.id/definitions/processes/kycaml/0.0.1/usa",
    approvalDate: new Date().toISOString(),
  };

  const issuer = buildIssuer(issuerDidKey.subject, issuerDidKey.privateKey);
  const presentation = await buildAndSignFulfillment(
    issuer,
    decodedApplication,
    attestation
  );

  return presentation;
};

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:8080",
    credentials: true,
  })
);

app.use(
  Session({
    name: "siwe-quickstart",
    secret: "siwe-quickstart-secret",
    resave: true,
    saveUninitialized: true,
    cookie: { secure: false, sameSite: true },
  })
);

app.get("/nonce", async function (req, res) {
  req.session.nonce = generateNonce();
  res.setHeader("Content-Type", "text/plain");
  res.status(200).send(req.session.nonce);
});

app.post("/sign_in", async function (req, res) {
  try {
    if (!req.body.message) {
      res
        .status(422)
        .json({ message: "Expected prepareMessage object as body." });
      return;
    }

    let message = new SiweMessage(req.body.message);
    const fields = await message.validate(req.body.signature);
    if (fields.nonce !== req.session.nonce) {
      console.log(req.session);
      res.status(422).json({
        message: `Invalid nonce.`,
      });
      return;
    }
    req.session.siwe = fields;
    req.session.cookie.expires = new Date(fields.expirationTime);
    req.session.save(() => res.status(200).end());
  } catch (e) {
    req.session.siwe = null;
    req.session.nonce = null;
    console.error(e);
    switch (e) {
      case ErrorTypes.EXPIRED_MESSAGE: {
        req.session.save(() => res.status(440).json({ message: e.message }));
        break;
      }
      case ErrorTypes.INVALID_SIGNATURE: {
        req.session.save(() => res.status(422).json({ message: e.message }));
        break;
      }
      default: {
        req.session.save(() => res.status(500).json({ message: e.message }));
        break;
      }
    }
  }
});

app.get("/requestAllowlist", async function (req, res) {
  if (!req.session.siwe) {
    res.status(401).json({ message: "You have to first sign_in" });
    return;
  }
  const address = req.session.siwe.address;
  if (!validateAllowlistAccess(address)) {
    res.status(401).json({ message: "You are not eligible for the allowlist" });
    return;
  }

  const { subject } = await getOrCreateDidKey(address);

  const issuerDidKey = await getIssuerKey();
  const application = await createApplication(issuerDidKey, subject);
  const presentation = await getPresentation(issuerDidKey, application);

  res.setHeader("Content-Type", "application/json");
  res.json(presentation);
});

app.post("/verifyMintAccess", async function (req, res) {
  try {
    const { jwt } = req.body;

    if (!req.session || !req.session.siwe) {
      return res.status(403).send("Unauthorized, please sign in");
    }
    const address = req.session.siwe.address;

    const decoded = await decodeVerifiablePresentation(jwt);

    const vc = decoded.verifiableCredential[0];

    const decodedVc = await decodeVerifiableCredential(vc.proof.jwt);

    const issuerDidKey = await getIssuerKey();

    const { subject } = await getOrCreateDidKey(address);

    const offer = buildKycVerificationOffer(
      uuidv4(),
      issuerDidKey.subject,
      "https://test.host/verify"
    );
    const submission = await buildPresentationSubmission(
      subject,
      offer.body.presentation_definition,
      decodedVc
    );

    //  The verifier will take the submission and verify its authenticity. There is no response
    //  from this function, but if it throws, then the credential is invalid.
    try {
      await validateVerificationSubmission(
        submission,
        offer.body.presentation_definition
      );
    } catch (error) {
      console.log(error);
      return res.status(401).json({ message: "Could not verify credential" });
    }

    let privateKey = "";

    if (!issuerDidKey.signingKey) {
      throw new Error("No signing key found");
    } else {
      privateKey = issuerDidKey.signingKey;
    }

    let wallet = new ethers.Wallet(privateKey);

    const domain = {
      name: "AllowList",
      version: "1.0",
      chainId: config.chainId,
      verifyingContract: config.contractAddress,
    };
    const types = {
      AllowList: [{ name: "allow", type: "address" }
    ],
    };
    const allowList = {
      allow: address
    };

    const signature = await wallet._signTypedData(domain, types, allowList);

    return res.send(signature);
  } catch (error) {
    console.log(error);
    res.status(500).send(error.message);
  }
});

app.listen(3000);
