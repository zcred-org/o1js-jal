import { suite } from "uvu";
import {
  AccountUpdate,
  Field,
  Mina,
  Poseidon,
  PrivateKey,
  Proof,
  PublicKey,
  Signature,
  SmartContract,
  verify
} from "o1js";
import { InputSchema, O1JalTarget, Program } from "../src/types.js";
import sortKeys from "sort-keys";
import { o1jsJal } from "../src/jal.js";
import ts from "typescript";
import * as a from "uvu/assert";
import { type O1GraphLink } from "o1js-trgraph";
// @ts-ignore
import { ROOT_DIR, tsTranspileOptions } from "./test-util.js";
import { randomUUID } from "node:crypto";
import { unlinkSync, writeFileSync } from "node:fs";
import { o1jsTrGraph } from "../src/util.js";

const test = suite("O1JS JAL tests");

let randomPath: URL;

test.before.each(() => {
  randomPath = new URL(`./test/translator/${randomUUID()}.js`, ROOT_DIR);
});

test.after.each(() => {
  unlinkSync(randomPath);
});

const issuerPrivateKey = PrivateKey.fromBase58("EKFUUVXCHt3P5MSpzVfhNwUG4bkomYTCkPhgF7keR32hNyfZXKrT");
const issuerPublicKey = PublicKey.fromBase58("B62qj2aocCw3Ub1BnQXhUj1omS7dmVEvC3z8dsL2MkLcrw1cUgD3Apo");

const subjectPrivateKey = PrivateKey.random();
const subjectPublicKey = subjectPrivateKey.toPublicKey();

const attributes = {
  type: "passport",
  issuanceDate: new Date().toISOString(),
  validFrom: new Date().toISOString(),
  validUntil: new Date(2500, 1, 1).toISOString(),
  subject: {
    id: {
      type: "mina:publickey",
      key: subjectPublicKey.toBase58()
    },
    birthDate: new Date(2000, 5, 8).toISOString(),
    name: "Test"
  }
};

const attributesTrSchema = sortKeys({
  type: ["ascii-bytes", "bytes-uint128", "uint128-mina:field"],
  issuanceDate: ["isodate-unixtime", "unixtime-uint64", "uint64-mina:field"],
  validFrom: ["isodate-unixtime", "unixtime-uint64", "uint64-mina:field"],
  validUntil: ["isodate-unixtime", "unixtime-uint64", "uint64-mina:field"],
  subject: {
    id: {
      type: ["ascii-bytes", "bytes-uint128", "uint128-mina:field"],
      key: ["base58-mina:publickey", "mina:publickey-mina:fields"],
    },
    birthDate: ["isodate-unixtime", "unixtime-uint64", "uint64-mina:field"],
    name: ["ascii-bytes", "bytes-uint128", "uint128-mina:field"]
  }
}, { deep: true });

const { linear } = o1jsTrGraph.objectTransform<Field[]>(attributes, attributesTrSchema);
const msg = Poseidon.hash(linear);
const signature = Signature.create(issuerPrivateKey, [msg]);

test("zk program", async () => {
  // @ts-ignore
  const inputSetup = {
    private: {
      credential: {
        attributes: attributes,
        proofs: {
          "mina:poseidon-pasta": {
            "mina:publickey:B62qj2aocCw3Ub1BnQXhUj1omS7dmVEvC3z8dsL2MkLcrw1cUgD3Apo": {
              issuer: {
                id: { type: "mina:publickey", key: issuerPublicKey.toBase58() }
              },
              signature: signature.toBase58()
            }
          }
        }
      }
    }
  };

  const inputSchema: InputSchema<O1GraphLink> = {
    private: {
      credential: {
        attributes: {
          type: { type: "setup", transLinks: ["ascii-bytes", "bytes-uint128", "uint128-mina:field"] },
          issuanceDate: {
            type: "setup", transLinks: ["isodate-unixtime", "unixtime-uint64", "uint64-mina:field"]
          },
          validFrom: {
            type: "setup", transLinks: ["isodate-unixtime", "unixtime-uint64", "uint64-mina:field"],
          },
          validUntil: {
            type: "setup", transLinks: ["isodate-unixtime", "unixtime-uint64", "uint64-mina:field"],
          },
          subject: {
            id: {
              type: { type: "setup", transLinks: ["ascii-bytes", "bytes-uint128", "uint128-mina:field"] },
              key: { type: "setup", transLinks: ["base58-mina:publickey"] }
            },
            birthDate: { type: "setup", transLinks: ["isodate-unixtime", "unixtime-uint64", "uint64-mina:field"] },
            name: { type: "setup", transLinks: ["ascii-bytes", "bytes-uint128", "uint128-mina:field"] }
          }
        },
        proofs: {
          "mina:poseidon-pasta": {
            "mina:publickey:B62qj2aocCw3Ub1BnQXhUj1omS7dmVEvC3z8dsL2MkLcrw1cUgD3Apo": {
              issuer: {
                id: {
                  key: { type: "setup", transLinks: ["base58-mina:publickey"] }
                }
              },
              signature: { type: "setup", transLinks: ["base58-mina:signature"] }
            }
          }
        }
      }
    },
    public: {
      subject: {
        id: {
          type: { type: "reference", path: ["private", "credential", "attributes", "subject", "id", "type"] },
          key: { type: "reference", path: ["private", "credential", "attributes", "subject", "id", "key"] }
        }
      },
      issuer: {
        id: {
          key: {
            type: "reference",
            path: ["private", "credential", "proofs", "mina:poseidon-pasta",
              "mina:publickey:B62qj2aocCw3Ub1BnQXhUj1omS7dmVEvC3z8dsL2MkLcrw1cUgD3Apo", "issuer", "id", "key"]
          }
        }
      }
    }
  };
  const program: Program<O1JalTarget, O1GraphLink> = {
    target: "o1js:zk-program",
    inputSchema: inputSchema,
    commands: [
      {
        assert: {
          in: [{
            type: "function", equal: {
              in: [
                { type: "reference", path: ["private", "credential", "attributes", "subject", "id", "key"] },
                { type: "reference", path: ["public", "subject", "id", "key"] }
              ]
            }
          }]
        }
      },
      {
        assert: {
          in: [{
            type: "function", equal: {
              in: [
                {
                  type: "reference", path: ["private", "credential", "proofs", "mina:poseidon-pasta",
                    "mina:publickey:B62qj2aocCw3Ub1BnQXhUj1omS7dmVEvC3z8dsL2MkLcrw1cUgD3Apo", "issuer", "id", "key"]
                },
                { type: "reference", path: ["public", "issuer", "id", "key"] }
              ]
            }
          }]
        }
      },
      {
        hash: {
          in: ["poseidon",
            { type: "reference", path: ["private", "credential", "attributes", "issuanceDate"] },
            { type: "reference", path: ["private", "credential", "attributes", "subject", "birthDate"] },
            {
              type: "function", spread: {
                in: [{
                  type: "function", transform: {
                    in: [
                      { type: "reference", path: ["private", "credential", "attributes", "subject", "id", "key"] },
                      "mina:publickey-mina:fields"
                    ]
                  }
                }]
              }
            },
            { type: "reference", path: ["private", "credential", "attributes", "subject", "id", "type"] },
            { type: "reference", path: ["private", "credential", "attributes", "subject", "name"] },
            { type: "reference", path: ["private", "credential", "attributes", "type"] },
            { type: "reference", path: ["private", "credential", "attributes", "validFrom"] },
            { type: "reference", path: ["private", "credential", "attributes", "validUntil"] }
          ], out: "hashedAttributes"
        },
      },
      {
        verifySign: {
          in: ["pasta", {
            type: "reference", path: [
              "private", "credential", "proofs", "mina:poseidon-pasta",
              "mina:publickey:B62qj2aocCw3Ub1BnQXhUj1omS7dmVEvC3z8dsL2MkLcrw1cUgD3Apo", "signature"]
          }, {
            type: "reference", path: ["hashedAttributes"]
          }, {
            type: "reference", path: [
              "private", "credential", "proofs", "mina:poseidon-pasta",
              "mina:publickey:B62qj2aocCw3Ub1BnQXhUj1omS7dmVEvC3z8dsL2MkLcrw1cUgD3Apo", "issuer", "id", "key"]
          }],
          out: "verified"
        }
      },
      {
        assert: { in: [{ type: "reference", path: ["verified"] }] }
      }
    ]
  };
  const jalProgram = o1jsJal.initProgram<O1JalTarget, O1GraphLink>(program);
  const translated = jalProgram.translate();
  writeFileSync(randomPath, translated, { flag: "w" });
  const {
    publicInput,
    privateInput
  } = jalProgram.toInput<{ privateInput: any[], publicInput: Record<string, any> }>(inputSetup);
  const { zkProgram, PublicInput } = await import(randomPath.href);
  const { verificationKey } = await zkProgram.compile();
  const proof: Proof<any, void> = await zkProgram.execute(new PublicInput(publicInput), ...privateInput);
  const verified = await verify(proof.toJSON(), verificationKey);
  a.is(verified, true);
});

test("smart contract", async () => {
  const inputSetup = {
    private: {
      credential: {
        attributes: attributes,
        proofs: {
          "mina:poseidon-pasta": {
            "mina:publickey:B62qj2aocCw3Ub1BnQXhUj1omS7dmVEvC3z8dsL2MkLcrw1cUgD3Apo": {
              issuer: {
                id: { type: "mina:publickey", key: issuerPublicKey.toBase58() }
              },
              signature: signature.toBase58()
            }
          }
        }
      }
    }
  };
  const inputSchema: InputSchema = {
    private: {
      credential: {
        attributes: {
          type: { type: "setup", transLinks: ["ascii-bytes", "bytes-uint128", "uint128-mina:field"] },
          issuanceDate: { type: "setup", transLinks: ["isodate-unixtime", "unixtime-uint64", "uint64-mina:field"] },
          validFrom: { type: "setup", transLinks: ["isodate-unixtime", "unixtime-uint64", "uint64-mina:field"], },
          validUntil: { type: "setup", transLinks: ["isodate-unixtime", "unixtime-uint64", "uint64-mina:field"], },
          subject: {
            id: {
              type: { type: "setup", transLinks: ["ascii-bytes", "bytes-uint128", "uint128-mina:field"] },
              key: { type: "setup", transLinks: ["base58-mina:publickey"] }
            },
            birthDate: { type: "setup", transLinks: ["isodate-unixtime", "unixtime-uint64", "uint64-mina:field"] },
            name: { type: "setup", transLinks: ["ascii-bytes", "bytes-uint128", "uint128-mina:field"] }
          }
        },
        proofs: {
          "mina:poseidon-pasta": {
            "mina:publickey:B62qj2aocCw3Ub1BnQXhUj1omS7dmVEvC3z8dsL2MkLcrw1cUgD3Apo": {
              issuer: {
                id: {
                  key: { type: "setup", transLinks: ["base58-mina:publickey"] }
                }
              },
              signature: { type: "setup", transLinks: ["base58-mina:signature"] }
            }
          }
        }
      }
    }
  };
  const program: Program = {
    target: "o1js:smart-contract",
    inputSchema: inputSchema,
    commands: [
      {
        assert: {
          in: [{
            type: "function",
            equal: {
              in: [
                { type: "reference", path: ["private", "credential", "attributes", "subject", "id", "key"] },
                { type: "static", value: subjectPublicKey.toBase58(), transLinks: ["base58-mina:publickey"] }
              ]
            }
          }]
        }
      },
      {
        assert: {
          in: [{
            type: "function",
            equal: {
              in: [
                {
                  type: "reference", path: [
                    "private", "credential", "proofs",
                    "mina:poseidon-pasta", "mina:publickey:B62qj2aocCw3Ub1BnQXhUj1omS7dmVEvC3z8dsL2MkLcrw1cUgD3Apo",
                    "issuer", "id", "key"]
                },
                {
                  type: "static",
                  value: issuerPublicKey.toBase58(),
                  transLinks: ["base58-mina:publickey"]
                }
              ]
            }
          }]
        }
      },
      // Verify credential attributes
      {
        hash: {
          in: [
            "poseidon",
            { type: "reference", path: ["private", "credential", "attributes", "issuanceDate"] },
            { type: "reference", path: ["private", "credential", "attributes", "subject", "birthDate"] },
            {
              type: "function",
              spread: {
                in: [{
                  type: "function",
                  transform: {
                    in: [{
                      type: "reference",
                      path: ["private", "credential", "attributes", "subject", "id", "key"]
                    }, "mina:publickey-mina:fields"]
                  }
                }]
              }
            },
            { type: "reference", path: ["private", "credential", "attributes", "subject", "id", "type"] },
            { type: "reference", path: ["private", "credential", "attributes", "subject", "name"] },
            { type: "reference", path: ["private", "credential", "attributes", "type"] },
            { type: "reference", path: ["private", "credential", "attributes", "validFrom"] },
            { type: "reference", path: ["private", "credential", "attributes", "validUntil"] }
          ],
          out: "hashedAttributes"
        },
      },
      {
        verifySign: {
          in: [
            "pasta",
            {
              type: "reference",
              path: ["private", "credential", "proofs", "mina:poseidon-pasta",
                "mina:publickey:B62qj2aocCw3Ub1BnQXhUj1omS7dmVEvC3z8dsL2MkLcrw1cUgD3Apo", "signature"]
            }, {
              type: "reference",
              path: ["hashedAttributes"]
            }, {
              type: "reference", path: ["private", "credential", "proofs",
                "mina:poseidon-pasta", "mina:publickey:B62qj2aocCw3Ub1BnQXhUj1omS7dmVEvC3z8dsL2MkLcrw1cUgD3Apo",
                "issuer", "id", "key"]
            }], out: "verified"
        }
      },
      { assert: { in: [{ type: "reference", path: ["verified"] }] } }
    ]
  };
  const jalProgram = o1jsJal.initProgram(program);
  const translated = jalProgram.translate();
  const { outputText } = ts.transpileModule(translated, tsTranspileOptions);
  writeFileSync(randomPath, outputText, { flag: "w" });
  const { ZkSmartContract } = await import(randomPath.href);
  a.is(typeof ZkSmartContract, "function");
  a.instance(ZkSmartContract.prototype, SmartContract);
  const proofsEnabled = true;
  if (proofsEnabled) await ZkSmartContract.compile();
  const Local = Mina.LocalBlockchain({ proofsEnabled });
  Mina.setActiveInstance(Local);
  const { privateKey: deployerKey, publicKey: deployerAccount } = Local.testAccounts[0]!;
  // const { privateKey: senderKey, publicKey: senderAccount } = Local.testAccounts[1]!;
  const zkAppKey = PrivateKey.random();
  const zkAppAddress = zkAppKey.toPublicKey();
  const zkApp = new ZkSmartContract(zkAppAddress);
  const txn = await Mina.transaction(deployerAccount, () => {
    AccountUpdate.fundNewAccount(deployerAccount);
    zkApp.deploy();
  });
  await txn.prove();
  await txn.sign([deployerKey, zkAppKey]).send();
  const { privateInput } = jalProgram.toInput<{
    privateInput: any[];
    publicInput: null
  }>(inputSetup);
  await zkApp.execute(...privateInput);
  // Mina.transaction(senderAccount, () => {
  // });
  // await txn.prove();
  // await txn.sign([senderKey]).send();
});

test.run();