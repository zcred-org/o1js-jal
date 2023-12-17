import { suite } from "uvu";
import * as a from "uvu/assert";
import { toSmartContractInput } from "../../src/converter/smart-contract.js";
import { o1jsTrGraph } from "../../src/util.js";
import { Field } from "o1js";

const test = suite("Convert smart contract input tests");

test("Convert smart-contract input", () => {
  const convertedOutput = toSmartContractInput({
    inputSchema: {
      private: {
        name: {
          type: "setup",
          transLinks: ["utf8-bytes", "bytes-uint128", "uint128-mina:field"]
        },
        surname: {
          type: "static",
          value: "Test-test",
          transLinks: ["ascii-mina:string"]
        },
        other: {
          year: {
            type: "constant",
            name: "year"
          }
        }
      }
    },
    inputSetup: {
      private: {
        name: "Test",
      }
    }
  });
  a.equal(convertedOutput.publicInput, null);
  a.is(
    convertedOutput.privateInput[0].toBigInt(),
    o1jsTrGraph.transform("Test", ["utf8-bytes", "bytes-uint128", "uint128-mina:field"]).toBigInt()
  );
  a.is(
    convertedOutput.privateInput[1].toString(),
    o1jsTrGraph.transform("Test-test", ["ascii-mina:string"]).toString(),
  );
  a.is(
    convertedOutput.privateInput[2].toBigInt(),
    Field(365.25 * 24 * 60 * 60 * 1000).toBigInt()
  );
  a.is(convertedOutput.publicInput, null);
})
;

test.run();
;