import { Command, FunctionVar, FunName, Pool, StaticVar, Variable } from "../types.js";
import { jalUtil, o1jsTrGraph } from "../util.js";

type ProvidedType = keyof typeof TOKENS

export function translateO1jsCommands(commands: Command[], namePool: Pool) {
  const result: string[] = [];
  for (const command of commands) {
    const translated = translateVar(jalUtil.commandToFunction(command));
    const providedFunctions = Object.keys(FUN_TOKENS);
    const funName = Object.keys(command)
      .filter(it => providedFunctions.includes(it))[0];
    if (!funName) {
      throw new Error(`Internal error: command ${funName} is not supported`);
    }
    const commandEntry = command[funName as FunName];
    // @ts-expect-error
    if ("out" in commandEntry && typeof commandEntry.out === "string") {
      namePool[commandEntry.out] = commandEntry.out;
      result.push([`const ${commandEntry.out} = `, translated, " \n"].join(""));
    } else {
      result.push([translated, "\n"].join(""));
    }
  }
  return result;
}

function translateVar(
  variable: Variable,
) {
  if (jalUtil.isFunction(variable)) {
    return translateFunction(variable, translateVar);

  } else if (jalUtil.isStatic(variable)) {
    return translateStatic(variable);

  } else if (jalUtil.isReference(variable)) {
    return `{{ ${variable.path.join(".")} }}`;

  } else if (jalUtil.isConstant(variable)) {
    return jalUtil.toConstantInfo(variable.name).programValue;
  }
  throw new Error(``);
}

function translateFunction(
  variable: FunctionVar,
  translateVar: (input: Variable) => string
) {
  const providedFns = Object.keys(FUN_TOKENS);
  const funName = Object.keys(variable)
    .filter(it => providedFns.includes(it))[0];
  if (!funName) {
    throw new Error(`Internal error: translation function ${JSON.stringify(variable)} problem`);
  }
  const result = FUN_TOKENS[funName as FunName]?.(variable, translateVar);
  if (!result) {
    throw new Error(`Internal error: can not to translate function`);
  }
  return result;
}

export const FUN_TOKENS: Record<
  FunName,
  (variable: FunctionVar, translateVar: (variable: Variable) => string) => string
> = {
  add(variable, translateVar) {
    const input = variable.add!.in;
    const var1 = translateVar(input[0]);
    const var2 = translateVar(input[1]);
    return `${var1}.add(${var2})`;
  },
  sub(variable, translateVar) {
    const var1 = translateVar(variable.sub!.in[0]);
    const var2 = translateVar(variable.sub!.in[1]);
    return `${var1}.sub(${var2})`;
  },
  mul(variable, translateVar) {
    const var1 = translateVar(variable.mul!.in[0]);
    const var2 = translateVar(variable.mul!.in[1]);
    return `${var1}.mul(${var2})`;
  },
  equal(variable, translateVar) {
    const var1 = translateVar(variable.equal!.in[0]);
    const var2 = translateVar(variable.equal!.in[1]);
    return `${var1}.equals(${var2})`;
  },
  greater(variable, translateVar) {
    const var1 = translateVar(variable.greater!.in[0]);
    const var2 = translateVar(variable.greater!.in[1]);
    return `${var1}.greaterThan(${var2})`;
  },
  greaterEqual(variable, translateVar) {
    const var1 = translateVar(variable.greaterEqual!.in[0]);
    const var2 = translateVar(variable.greaterEqual!.in[1]);
    return `${var1}.greaterThanOrEqual(${var2})`;
  },
  less(variable, translateVar) {
    const var1 = translateVar(variable.less!.in[0]);
    const var2 = translateVar(variable.less!.in[1]);
    return `${var1}.lessThan(${var2})`;
  },
  lessEqual(variable, translateVar) {
    const var1 = translateVar(variable.lessEqual!.in[0]);
    const var2 = translateVar(variable.lessEqual!.in[1]);
    return `${var1}.lessThanOrEqual(${var2})`;
  },
  assert(variable, translateVar) {
    const var1 = translateVar(variable.assert!.in[0]);
    return `${var1}.assertTrue()`;
  },
  ternary(variable, translateVar) {
    const boolVar = translateVar(variable.ternary!.in[0]);
    const var1 = translateVar(variable.ternary!.in[1]);
    const var2 = translateVar(variable.ternary!.in[2]);
    return `Provable.if(${boolVar}, ${var1}, ${var2})`;
  },
  verifySign(variable, translateVar) {
    // const alg = variable.verifySign!.in[0];
    const signature = translateVar(variable.verifySign!.in[1]);
    const message = translateVar(variable.verifySign!.in[2]);
    const publickey = translateVar(variable.verifySign!.in[3]);
    return `${signature}.verify(${publickey}, [${message}])`;
  },
  hash(variable, translateVar) {
    const input = variable.hash!.in;
    // const alg = input[0];
    const hashInputs: string[] = [];
    for (let i = 0; i < input.length; i++) {
      if (i === 0) { continue; }
      const variable = translateVar(input[i] as Variable);
      hashInputs.push(variable);
    }
    return (hashInputs.length === 0)
      ? `Poseidon.hash([])`
      : `Poseidon.hash([\n`
      + hashInputs.map(it => `          ` + it).join(",\n")
      + `])`;
  },
  transform(variable, translateVar) {
    const translated = translateVar(variable.transform!.in[0]);
    const transLink = variable.transform!.in[1];
    const sourceType = transLink.split("-")[0]?.split(":")[1];
    if (!sourceType) {
      throw new Error(`Internal error: trans link ${transLink} to transform function is not supported`);
    }
    const targetType = transLink.split("-")[1]?.split(":")[1];
    if (!targetType) {
      throw new Error(`Internal error: trans link ${transLink} to transform function is not supported`);
    }
    const result = TRANSFORMS[sourceType]?.[targetType]?.(translated);
    if (!result) {
      throw new Error(`Internal error: trans link ${transLink} to transform function is not supported`);
    }
    return result;
  },
  spread(variable, translateVar) {
    const input = variable.spread!.in;
    const token = translateVar(input[0]);
    return `...${token}`;
  },
  not(variable, translateVar) {
    const input = variable.not!.in;
    const token = translateVar(input[0]);
    return `${token}.not()`;
  }
};

const TRANSFORMS: Record<string, Record<string, (token: string) => string>> = {
  uint64: {
    fields: (token: string) => `${token}.toFields()`,
  },
  signature: {
    fields: (token: string) => `${token}.toFields()`
  },
  publickey: {
    fields: (token: string) => `${token}.toFields()`
  },
  field: {
    uint64: (token: string) => `UInt64.from(${token})`
  },
  bool: {
    field: (token: string) => `${token}.toField()`
  },
  string: {
    fields: (token: string) => `${token}.toFields()`
  }
};

function translateStatic(variable: StaticVar) {
  const transLinks = variable.transLinks;
  const finalType = transLinks[transLinks.length - 1]!
    .split("-")[1]!
    .split(":")[1];
  const isProvidedType = function (_valueType: string | undefined): _valueType is ProvidedType {
    if (!_valueType) return false;
    return Object.keys(TOKENS).includes(_valueType);
  }(finalType);
  if (!isProvidedType) {
    throw new Error(`Internal error: program static variable last trans graph node type is not provided`);
  }
  const transformed = o1jsTrGraph.transform(
    variable.value,
    variable.transLinks.slice(0, variable.transLinks.length - 1)
  );
  // @ts-expect-error
  return TOKENS[finalType].static(transformed);
}

function reference(path: string[]) {
  return `{{ ${path.join(".")} }}`;
}

const Field = {
  static: (value: number | bigint | string) => {
    let result: string;
    if (typeof value !== "string") {
      const target = typeof value === "number"
        ? String(value)
        : `${value.toString()}n`;
      result = `Field(${target})`;
    } else {
      result = `Field(\"${value}\")`;
    }
    return result;
  },
  reference: reference
};

const UInt64 = {
  static: (value: number | bigint | string) => {
    return `UInt64.from(${Field.static(value)})`;
  },
  reference: reference
};

const Bool = {
  static: (value: boolean) => {
    return `Bool(${String(value)})`;
  },
  reference: reference
};

const Signature = {
  static: (value: string) => {
    return `Signature.fromBase58(\"${value}\")`;
  },
  reference: reference
};

const PublicKey = {
  static: (value: string) => {
    return `PublicKey.fromBase58(\"${value}\")`;
  },
  reference: reference
};

const CircuitString = {
  static: (value: string) => {
    return `CircuitString.fromString(\"${value}\")`;
  },
  reference: reference
};

const TOKENS = {
  field: Field,
  publickey: PublicKey,
  signature: Signature,
  uint64: UInt64,
  bool: Bool,
  string: CircuitString
};

