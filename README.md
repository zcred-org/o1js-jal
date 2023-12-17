# O1JS JAL - O1JS JSON Abstract Language

# Description

"O1JS JAL" is a domain-specific language designed to bridge compatibility between the O1JS (Mina) proof system and a user-friendly, readable format.

# Examples

## ZK Program

### JAL to ZK-Program

```typescript
// Translate O1JS JAL to O1JS ZkProgram
// Init program
const program: Program<O1JalTarget, O1GraphLink> = {
    target: "o1js:zk-program", // Target language
    // Program input schema
    inputSchema: { 
      private: {
        name: {
          type: "setup", transLinks: ["ascii-bytes", "bytes-uint128", "uint128-mina:field"],
        },
        birthDate: {
          type: "setup", transLinks: ["isodate-unixtime19", "unixtime19-uint64", "uint64-mina:field"]
        }
      },
      public: {
        now: { type: "setup", transLinks: ["isodate-unixtime19", "unixtime19-uint64", "uint64-mina:field"] },
        birthDate: { type: "reference", path: ["private", "birthDate"] }
      }
    }, 
    // Program commands 
    commands: [
      {
        assert: {
          in: [{
            type: "function", equal: {
              in: [
                { type: "reference", path: ["private", "birthDate"] },
                { type: "reference", path: ["public", "birthDate"] }
              ]
            }
          }]
        }
      },
      {
        assert: {
          in: [{
            type: "function", greaterEqual: {
              in: [
                {
                  type: "function", sub: {
                    in: [
                      { type: "reference", path: ["public", "now"] },
                      { type: "reference", path: ["private", "birthDate"] }]
                  }
                },
                {
                  type: "function", mul: {
                    in: [
                      { type: "static", value: 18, transLinks: ["uint64-mina:field"] },
                      { type: "constant", name: "year" }
                    ]
                  }
                }
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
                { type: "reference", path: ["private", "name"] },
                { type: "static", value: "John", transLinks: ["ascii-bytes", "bytes-uint128", "uint128-mina:field"] }
              ]
            }
          }]
        }
      }
    ]
  };
const inputSetup = {
  private: {
    name: "John",
    birthDate: new Date(2000, 1, 1).toISOString()
  }
}
const jalProgram = o1jsJal.initProgram(program);
console.log(jalProgram.translate());
saveProgram(path, jalProgram.translate());
const { zkProgram, PublicInput } = await import(path);
const { verificationKey } = await zkProgram.compile();
const { privateInput, publicInput } = jalProgram.toInput(inputSetup);
const proof = await zkProgram.execute(
  new PublicInput(publicInput),
  ...privateInput
)
assert(await verify(verificationKey, proof.toJSON()))
```

### Result

```typescript
import {
  Bool,
  Provable,
  CircuitString,
  ZkProgram,
  Field,
  Poseidon,
  PublicKey,
  Signature,
  Struct,
  UInt64,
} from "o1js";

export class PublicInput extends Struct({
  birthDate: Field,
  now: Field,
}) {}

export const zkProgram = ZkProgram({
  publicInput: PublicInput,
  methods: {
    execute: {
      privateInputs: [
        Field,
        Field,
      ],
      method(
        publicInput,
        private_birthDate,
        private_name,
      ) {
        private_birthDate.equals(publicInput.birthDate).assertTrue()
        publicInput.now
          .sub(private_birthDate)
          .greaterThanOrEqual(Field(18).mul(Field(365.25 * 24 * 60 * 60 * 1000)))
          .assertTrue()
        private_name.equals(Field(1248815214n)).assertTrue()
      }
    }
  }
});
```

### Explanation

**Circuit private input:**

```typescript
type PrivateInput = {
  name: string, // transformed to Field in ZK program
  birthDate: ISODateString, // transformed to Field in ZK program
}
```

**Circuit public input:**

```typescript
type PublicInput = {
  now: ISODateString, // (current time) transformed to Field in ZK program 
  birthDate: ISODateString, // (birthDate from PrivateInput birthDate) transformed to Field
}
```

**Circuit logic:**

- Check that private input birth date equals public input birth date
- Check that user older then 18 y.o.
- Check that user name is "John"

# Variables

### ***Setup***

Variable value refer to the primitive value in the setup input.

Type:

```typescript
type SetupVariable = {
  type: "setup";
  transLinks: string[]
}
```

Example:

```typescript
const initSchema = {
  name: { 
    type: "setup",
    transLinks: ["uint16-mina:field"] 
  }
}

const initSetup = {
  name: 3
}

// After compilation

const initPool = {
  name: Field(3)
}
```

## *Constant*

Constant is permanent variable

Type:

```typescript
type ConstanVariable = {
  type: "constant",
  name: string
}
```

Example:

```typescript
const inputSchema = {
  oneYear: {
    type: "constant",
    name: "year"
  }
};
const inputSetup = {};

/** After compilation process */
const initPool = {
  oneYear: Field(365.25 * 24 * 60 * 60 * 1000)
}
```

### Provided constants

| name | value                        | type  | transformation node |
| ---- | ---------------------------- | ----- | ------------------- |
| year | 365.25 * 24 * 60 * 60 * 1000 | Field | mina:field          |

## ***Static***

Variable value that is always static

Type:

```typescript
type StaticVariable = {
  type: "static",
  value: number | string | boolean,
  transLinks: string[]
}
```

Example:

```typescript
const initSchema = {
  century: {
    type: "static",
    value: 21,
    transLinks: ["uint16-mina:field"]
  }
}

/** After compilation process */
const initPool = {
  century: Field(21)
}
```

## ***Reference***

Variable value refer to another variable

Type:

```typescript
type ReferenceVariable = {
  type: "reference";
  // path to variable throught compiled input
  path: string[]
}
```

Example:

```typescript
const inputSchema = {
  century: {
    type: "static",
    value: 21,
    transLinks: ["uint-mina:field"]
  },
  city: {
    type: "setup",
    transLinks: ["utf8-bytes", "bytes-uint64", "uint64-mina:uint64"]
  }
}

const inputSetup = {
  city: "NY"
}

/** After compilation */
const workingPool = {
  century: Field(21),
  city: UInt64.from(22862)
}
```

## ***Function***

Function variables MUST be used only in program as input of another function or instruction

Type:

```typescript
type FunctionVariable = {
  type: "funtion", // omit if instruction
  FunctionName: { // function name
    in: (Variable | string)[] // input variables
    // Rusult of the function will be writen in "out",
    // where "out" value is reference name, 
    // reference name can be used to refer to the variable (function result)
    // as "reference variable"
    out: string // reference of the variable
  }
}

// Some function extends properties above
```

Example:

```typescript
const inputSchema = {
  one: {
    type: "setup",
    transLinks: ["utf8-uint16", "uint16-mina:field"]
  },
  two: {
    type: "static",
    value: "2",
    transLinks: ["utf8-uint16", "uint16-mina:field"],
  }
}

const initSetup = {
  one: "1"
}

const initPool = {
  one: Field(1),
  two: Field(2)
}

/**
  Program create zk circuite which validate that:
  $isEqual = (3 == (compiledInput.one + compiledInput.two))
  assert($isEqual)
*/
const commands = [
  {
    equal: { // instruction / function name 
      in: [
        { // first variable input
          type: "static",
          value: "3",
          transLinks: ["utf8-uint16", "uint16-mina:field"] // transform utf8 "3" to number 3 
        },
        { // result of the function below is second variable input
          type: "function",
          add: {
            in: [
              {
                type: "reference",
                path: ["one"]
              },
              {
                type: "reference",
                path: ["two"]
              }
            ]
          }
        }
      ],
      out: "$isEqual" // path to boolean like result
    },
    {
      assert: {
        in: [ { type: "reference", path: ["$isEqual"] } ], // reference to equal function result above
      }
    }
  }
]
```

# Functions or Commands

`Command` is `Function` but without `type` property

## *add*

**in:** [`Variable`, `Variable`] (first num-like `Variable` add second num-like `Variable`)

**out:** `string` (num-like result `Variable` name)

## *sub*

**in:** [`Variable`, `Variable`] (firs num-like `Variable` sub second num-like `Variable`)

**out:** `string` (num-like result `Variable` name)

## *mul*

**in:** [`Variable`, `Variable`] (firs num-like `Variable` multiply second num-like `Variable`)

**out:** `string` (num-like result `Variable` name)

## *equal*

**in:** [`Variable`, `Variable`] (firs `Variable` equals second `Variable`)

**out:** `string` (boolean-like `mina:bool` result `Variable` name)

## *greater*

**in:** [`Variable`, `Variable`] (firs `Variable` greater than second `Variable`)

**out:** `string` (boolean-like `mina:bool` result `Variable` name)

## *greaterEqual*

**in:** [`Variable`, `Variable`] (firs `Variable` greater than or equals second `Variable`)

**out:** `string` (boolean-like `mina:bool` result `Variable` name)

## *less*

**in:** [`Variable`, `Variable`] (firs `Variable` less than second `Variable`)

**out:** `string` (boolean-like `mina:bool` result `Variable` name)

## *lessEqual*

**in:** [`Variable`, `Variable`] (firs `Variable` less than or equals second `Variable`)

**out:** `string` (boolean-like `mina:bool` result `Variable` name)

## *assert*

**in:** [`Variable`] (assert that boolean-like `Variable` is true)

## *ternary*

**in:** [`Variable`, `Variable`, `Variable`] (if first boolean-like `Variable` return second `Variable`, else return third `Variable`)

**out:** `string` (result `Variable` name)

## *transform*

**in:** [`Variable`, `string`] (first `Variable` transform into another type described by trans link `string`)

**out:** `string` (result `Variable` name)

## *verifySign*

**in:** [`"mina:pasta"`, `Variable`, `Variable`, `Variable`]  (`"mina:pasta"` - name DSA algorithm, first `Variable` - signature `mina:signature`,  second `Variable` - message `mina:field`, third `Variable` - signer public key `mina:publickey`)

**out:** `string` (boolean-like `mina:bool` result `Variable` name, `mina:bool`)

## *hash*

**in:** [`mina:poseidon`, `...Variable[]`] (`mina:poseidon` - hash algorithm, `...Variable[]` - hash input, `mana:field` list)

**out:** `string` (result `Variable` name, `mina:field`)

## *spread*

**in:** [`Variable`] (spread `Variable` e.g. `…signature.toFields()`, use only for `mina:fields`)

## *not*

**in:** [`Variable`] (this function is NOT operator, input is boolean-like `mina:bool` `Variable` )

# References

[What is transformation graph and trans links?](https://github.com/zcred-org/o1js-trgraph)
