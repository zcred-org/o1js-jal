import { suite } from "uvu";
import * as a from "uvu/assert";
import { translateO1jsCommands } from "../../src/translator/o1js-commands.js";
import { o1jsTrGraph } from "../../src/util.js";
import { Field, PrivateKey, PublicKey, Signature } from "o1js";

const test = suite("Commands translator test");

test("translate add function", () => {
  const result = translateO1jsCommands([
    {
      add: {
        in: [
          { type: "static", value: 1, transLinks: ["uint64-mina:field"] },
          { type: "reference", path: ["private", "name"] }
        ]
      }
    }
  ], {
    private: {
      name: "private_name"
    }
  });
  a.equal(result, ["Field(1).add({{ private.name }})\n"]);
});

test("translate sub function", () => {
  const result = translateO1jsCommands([
    {
      sub: {
        in: [
          { type: "static", value: 3, transLinks: ["uint64-mina:uint64"] },
          { type: "static", value: 1, transLinks: ["uint64-mina:uint64"] }
        ],
        out: "threeSubOne"
      }
    }
  ], {});
  a.equal(result, [
    "const threeSubOne = UInt64.from(Field(3)).sub(UInt64.from(Field(1))) \n"
  ]);
});

test("translate mul function", () => {
  const result = translateO1jsCommands([
    {
      mul: {
        in: [
          { type: "static", value: 3, transLinks: ["uint64-mina:field"] },
          { type: "static", value: 2, transLinks: ["uint64-mina:field"] }
        ],
        out: "threeMulTwo"
      }
    }
  ], {});
  a.equal(result, [
    `const threeMulTwo = Field(3).mul(Field(2)) \n`
  ]);
});

test("translate equal function", () => {
  const result = translateO1jsCommands([
    {
      equal: {
        in: [
          { type: "static", value: 3, transLinks: ["uint64-mina:field"] },
          { type: "static", value: 3, transLinks: ["uint64-mina:field"] }
        ],
        out: "threeEqThree"
      }
    }
  ], {});
  a.equal(result, [
    `const threeEqThree = Field(3).equals(Field(3)) \n`
  ]);
});

test("translate greater function", () => {
  const result = translateO1jsCommands([
    {
      greater: {
        in: [
          { type: "static", value: 1, transLinks: ["uint64-mina:uint64"] },
          { type: "static", value: 0, transLinks: ["uint64-mina:uint64"] },
        ],
        out: "oneGreaterZero"
      }
    }
  ], {});
  a.equal(result, [
    `const oneGreaterZero = UInt64.from(Field(1)).greaterThan(UInt64.from(Field(0))) \n`
  ]);
});

test("translate greaterEqual function", () => {
  const result = translateO1jsCommands([
    {
      greaterEqual: {
        in: [
          { type: "static", value: 3, transLinks: ["uint64-mina:field"] },
          { type: "static", value: 3, transLinks: ["uint64-mina:field"] }
        ],
        out: "threeGreaterEqualThree"
      }
    }
  ], {});
  a.equal(result, [
    `const threeGreaterEqualThree = Field(3).greaterThanOrEqual(Field(3)) \n`
  ]);
});

test("translate less function", () => {
  const result = translateO1jsCommands([
    {
      less: {
        in: [
          { type: "static", value: 2, transLinks: ["uint64-mina:field"] },
          { type: "static", value: 5, transLinks: ["uint64-mina:field"] }
        ],
        out: "twoLessFive"
      }
    }
  ], {});
  a.equal(result, [
    `const twoLessFive = Field(2).lessThan(Field(5)) \n`
  ]);
});

test("translate lessEqual function", () => {
  const result = translateO1jsCommands([
    {
      lessEqual: {
        in: [
          { type: "static", value: 5, transLinks: ["uint64-mina:uint64"] },
          { type: "static", value: 5, transLinks: ["uint64-mina:uint64"] },
        ],
        out: "fiveLessEqualFive"
      }
    }
  ], {});
  a.equal(result, [
    `const fiveLessEqualFive = UInt64.from(Field(5)).lessThanOrEqual(UInt64.from(Field(5))) \n`
  ]);
});

test("assert", () => {
  const result = translateO1jsCommands([
    {
      assert: {
        in: [{ type: "static", value: true, transLinks: ["uint64-mina:bool"] }]
      }
    }
  ], {});
  a.equal(result, [
    `Bool(true).assertTrue()\n`
  ]);
});

test("translate ternary function", () => {
  const result = translateO1jsCommands([
    {
      verifySign: {
        in: [
          "pasta",
          { type: "static", value: "345...345", transLinks: ["base58-mina:signature"] },
          { type: "static", value: 3, transLinks: ["uint64-mina:field"] },
          { type: "static", value: "123...123", transLinks: ["base58-mina:publickey"] }
        ],
        out: "isVerified"
      }
    }
  ], {});
  a.equal(result, [
    `const isVerified = Signature.fromBase58("345...345").verify(PublicKey.fromBase58("123...123"), [Field(3)]) \n`
  ]);
});

test("translate hash function", () => {
  const result = translateO1jsCommands([
    {
      hash: {
        in: [
          "poseidon",
          { type: "static", value: 3, transLinks: ["uint64-mina:field"] },
          { type: "static", value: 1, transLinks: ["uint128-mina:field"] }
        ],
        out: "hash"
      }
    }
  ], {});
  a.equal(result, [
    `const hash = Poseidon.hash([
          Field(3),
          Field(1)]) \n`
  ]);
});

test("translate transform function", () => {
  a.equal(translateO1jsCommands([
    {
      transform: {
        in: [
          { type: "static", value: 3, transLinks: ["uint64-mina:uint64"] },
          "mina:uint64-mina:fields"
        ],
        out: "fieldsFromUint64"
      }
    },
    {
      transform: {
        in: [
          { type: "static", value: "123...123", transLinks: ["base58-mina:signature"] },
          "mina:signature-mina:fields"
        ],
        out: "fieldsFromSignature"
      }
    },
    {
      transform: {
        in: [
          { type: "static", value: "123...123", transLinks: ["base58-mina:publickey"] },
          "mina:publickey-mina:fields"
        ],
        out: "fieldsFromPublickey"
      }
    },
    {
      transform: {
        in: [
          { type: "static", value: 1, transLinks: ["base58-mina:field"] },
          "mina:field-mina:uint64"
        ],
        out: "uint64FromField"
      }
    },
    {
      transform: {
        in: [
          { type: "static", value: true, transLinks: ["boolean-mina:bool"] },
          "mina:bool-mina:field"
        ],
        out: "fieldFromBool"
      }
    }
  ], {}), [
    `const fieldsFromUint64 = UInt64.from(Field(3)).toFields() \n`,
    `const fieldsFromSignature = Signature.fromBase58("123...123").toFields() \n`,
    `const fieldsFromPublickey = PublicKey.fromBase58("123...123").toFields() \n`,
    `const uint64FromField = UInt64.from(Field(1)) \n`,
    `const fieldFromBool = Bool(true).toField() \n`
  ]);
});

test("translate spread function", () => {
  const result = translateO1jsCommands([
    {
      spread: {
        in: [{
          type: "function",
          transform: {
            in: [
              { type: "static", value: "123...123", transLinks: ["base58-mina:signature"] },
              "mina:signature-mina:fields"
            ]
          }
        }]
      }
    }
  ], {});
  a.equal(result, [
    `...Signature.fromBase58("123...123").toFields()\n`
  ]);
});

test("translate ternary function", () => {
  const result = translateO1jsCommands([
    {
      ternary: {
        in: [
          { type: "static", value: true, transLinks: ["boolean-mina:bool"] },
          { type: "static", value: 1, transLinks: ["uint16-mina:field"] },
          { type: "static", value: 0, transLinks: ["uint16-mina:field"] },
        ],
        out: "one"
      }
    }
  ], {});
  a.equal(result, [
    `const one = Provable.if(Bool(true), Field(1), Field(0)) \n`
  ]);
});

test("translate not function", () => {
  const result = translateO1jsCommands([
    {
      not: {
        in: [
          { type: "static", value: true, transLinks: ["boolean-mina:bool"] },
        ],
        out: "notTrue"
      }
    }
  ], {});
  a.equal(result, [
    `const notTrue = Bool(true).not() \n`
  ]);
});

test("translate transform function with string", () => {
  const result = translateO1jsCommands([
    {
      transform: {
        in: [
          { type: "static", value: "Hello world", transLinks: ["ascii-mina:string"] },
          "mina:string-mina:fields"
        ],
        out: "stringFields"
      }
    }
  ], {});
  a.equal(result, [
    `const stringFields = CircuitString.fromString("Hello world").toFields() \n`
  ]);
});

test("translate constant variable", () => {
  const result = translateO1jsCommands([
    {
      mul: {
        in: [
          { type: "static", value: 18, transLinks: ["uint64-mina:field"] },
          { type: "constant", name: "year" }
        ],
        out: "eighteenYears"
      }
    }
  ], {});
  a.equal(result, [
    `const eighteenYears = Field(18).mul(Field(365.25 * 24 * 60 * 60 * 1000)) \n`
  ]);
});

test("translate static variable as field", () => {
  const result = translateO1jsCommands([
    {
      equal: {
        in: [
          {
            type: "static",
            value: "hello",
            transLinks: ["ascii-bytes", "bytes-uint128", "uint128-mina:field"]
          },
          {
            type: "reference",
            path: ["private", "value"]
          }
        ]
      }
    }
  ], {
    private: {
      value: "private_value"
    }
  });
  const transformed = o1jsTrGraph.transform<bigint>(
    "hello",
    ["ascii-bytes", "bytes-uint128"]
  ).toString();
  a.equal(result, [
    `Field(${transformed}n).equals({{ private.value }})\n`]);
});

test("translate static variable as publickey", () => {
  const privateKey = PrivateKey.random();
  const publicKeyBase58 = privateKey.toPublicKey().toBase58();
  const result = translateO1jsCommands([
    {
      equal: {
        in: [
          {
            type: "static",
            value: publicKeyBase58,
            transLinks: ["base58-bytes", "bytes-base58", "base58-mina:publickey"]
          },
          {
            type: "static",
            value: publicKeyBase58,
            transLinks: ["base58-mina:publickey"]
          }
        ]
      }
    }
  ], {});
  const transformed = o1jsTrGraph.transform<PublicKey>(
    publicKeyBase58,
    ["base58-bytes", "bytes-base58", "base58-mina:publickey"]
  ).toBase58();
  a.equal(result, [
    `PublicKey.fromBase58("${transformed}").equals(PublicKey.fromBase58("${transformed}"))\n`
  ]);
});

test("translate static variable as signature", () => {
  const privateKey = PrivateKey.random();
  const signatureBase58 = Signature.create(privateKey, [Field(1)]).toBase58();
  const result = translateO1jsCommands([
    {
      equal: {
        in: [
          {
            type: "static",
            value: signatureBase58,
            transLinks: ["base58-mina:signature"]
          },
          {
            type: "static",
            value: signatureBase58,
            transLinks: ["base58-bytes", "bytes-base58", "base58-mina:signature"]
          }
        ]
      }
    }
  ], {});
  a.equal(result, [
    `Signature.fromBase58("${signatureBase58}").equals(Signature.fromBase58("${signatureBase58}"))\n`
  ]);
});

test("translate static variable as mina:uint64", () => {
  const result = translateO1jsCommands([{
    equal: {
      in: [
        {
          type: "static",
          value: "hi",
          transLinks: ["ascii-bytes", "bytes-uint64", "uint64-mina:uint64"]
        },
        {
          type: "static",
          value: 123,
          transLinks: ["uint64-mina:uint64"]
        }
      ]
    }
  }], {});
  const transformed = o1jsTrGraph.transform("hi", ["ascii-bytes", "bytes-uint64"]);
  a.equal(result, [
    `UInt64.from(Field(${transformed}n)).equals(UInt64.from(Field(123)))\n`
  ]);
});

test("translate static variable as bool", () => {
  const result = translateO1jsCommands([
    {
      assert: {
        in: [
          {
            type: "static",
            value: "true",
            transLinks: ["utf8-boolean", "boolean-mina:bool"]
          }
        ]
      }
    }], {});
  a.equal(result, [
    `Bool(true).assertTrue()\n`
  ]);
});

test("translate static variable as mina:string", () => {
  const result = translateO1jsCommands([
    {
      equal: {
        in: [
          {
            type: "static",
            value: 2,
            transLinks: ["uint16-bytes", "bytes-ascii", "ascii-mina:string"]
          },
          {
            type: "static",
            value: 2,
            transLinks: ["uint16-bytes", "bytes-ascii", "ascii-mina:string"]
          }
        ]
      }
    }
  ], {})
  const transformed = o1jsTrGraph.transform(2, ["uint16-bytes", "bytes-ascii"]);
  a.equal(result, [
    `CircuitString.fromString("${transformed}").equals(CircuitString.fromString("${transformed}"))\n`
  ])
})

test.run();