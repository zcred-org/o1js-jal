import { suite } from "uvu";
import * as a from "uvu/assert";
import { SmartContract } from "o1js";
import { unlinkSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { translateSmartContract } from "../../src/translator/smart-contract.js";
// @ts-ignore
import { ROOT_DIR, tsTranspileOptions } from "../test-util.js";
import ts from "typescript";

const test = suite("Translate zk smart contract tests");

let randomPath: URL;

test.before.each(async () => {
  randomPath = new URL(`./test/translator/${randomUUID()}.js`, ROOT_DIR);
});

test.after.each(async () => {
  unlinkSync(randomPath);
});

test("Test", async () => {
  const translated = translateSmartContract({
    inputSchema: {
      private: {
        year: {
          type: "static",
          value: 365.25 * 24 * 3600 * 1000,
          transLinks: ["uint64-mina:field"]
        },
        yearClone: {
          type: "reference",
          path: ["private", "year"]
        }
      },
      public: {
        year: {
          type: "reference",
          path: ["private", "yearClone"]
        }
      }
    }, commands: [
      {
        equal: {
          in: [
            { type: "reference", path: ["private", "year"] },
            { type: "reference", path: ["private", "yearClone"] }
          ]
        }
      }
    ]
  });
  const { outputText } = ts.transpileModule(translated, tsTranspileOptions);
  writeFileSync(randomPath, outputText, { flag: "w" });
  const { ZkSmartContract } = await import(randomPath.href);
  a.is(typeof ZkSmartContract, "function");
  a.instance(ZkSmartContract.prototype, SmartContract);
});

test.run();