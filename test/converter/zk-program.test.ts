import { suite } from "uvu";
import * as a from "uvu/assert";
import { O1TrGraph } from "o1js-trgraph";
import { toZkProgramInput } from "../../src/converter/zk-program.js";

const test = suite("Experimental program converter test");

test("convert", () => {
  const tg = new O1TrGraph();
  const result = toZkProgramInput(
    {
      inputSchema: {
        private: {
          name: {
            type: "setup",
            transLinks: ["ascii-mina:string"]
          },
          age: {
            type: "static",
            value: 18,
            transLinks: ["uint64-mina:uint64"]
          },
          constYear: {
            type: "constant",
            name: "year"
          }
        },
        public: {
          nameRef: {
            type: "reference",
            path: ["private", "name"]
          },
          nameRefRef: {
            type: "reference",
            path: ["public", "nameRef"]
          },
          country: {
            code: {
              type: "setup",
              transLinks: ["iso3166alpha2-iso3166numeric", "iso3166numeric-uint64", "uint64-mina:field"]
            }
          },
          constYear: {
            type: "constant",
            name: "year"
          }
        }
      }, inputSetup: {
        private: {
          name: "Test",
        },
        public: {
          country: { code: "BR" }
        }
      }
    }
  );
  a.equal(result, {
    publicInput: {
      nameRef: tg.transform("Test", ["ascii-mina:string"]),
      nameRefRef: tg.transform("Test", ["ascii-mina:string"]),
      country_code: tg.transform("BR", ["iso3166alpha2-iso3166numeric", "iso3166numeric-uint64", "uint64-mina:field"]),
      constYear: tg.transform(365.25 * 24 * 60 * 60 * 1000, ["uint64-mina:field"]),
    },
    privateInput: [
      tg.transform(18, ["uint64-mina:uint64"]),
      tg.transform(365.25 * 24 * 60 * 60 * 1000, ["uint64-mina:field"]),
      tg.transform("Test", ["ascii-mina:string"]),
    ]
  });
});

test.run();