import {
  Command,
  ConstVar,
  FunctionVar,
  O1JalTarget,
  PROGRAM_TARGETS,
  ReferenceVar,
  SetupVar,
  StaticVar,
  Variable
} from "./types.js";
import { O1TrGraph, objUtil } from "o1js-trgraph";
import { isConstantName, O1JS_CONSTANTS } from "./constants.js";

function isVariable(variable: any): variable is Variable {
  return variable && "type" in variable && typeof variable.type === "string";
}

function isFunctionVar(variable: any): variable is FunctionVar {
  return isVariable(variable) && variable.type === "function";
}

function isStaticVar(variable: any): variable is StaticVar {
  return isVariable(variable) && variable.type === "static";
}

function isReferenceVar(variable: any): variable is ReferenceVar {
  return isVariable(variable) && variable.type === "reference";
}

function isConstantVar(variable: any): variable is ConstVar {
  return isVariable(variable) && variable.type === "constant";
}

function isSetupVar(variable: any): variable is SetupVar {
  return isVariable(variable) && variable.type === "setup";
}

/**
 * Returns transformation links of variable
 * @param inputSchema JAL input schema
 * @param path path to variable in input schema
 */
function getVarTransLinks(
  inputSchema: Record<string, any>,
  path: string[]
): string[] {
  const variable = objUtil.getValue(inputSchema, path);
  if (isReferenceVar(variable)) {
    return getVarTransLinks(inputSchema, variable.path);

  } else if (isStaticVar(variable)) {
    return variable.transLinks;

  } else if (isSetupVar(variable)) {
    return variable.transLinks;

  } else if (isConstantVar(variable)) {
    return jalUtil.toConstantInfo(variable.name).transLinks;
  }
  throw new Error(`Variable ${JSON.stringify(variable)} is not JAL variable`);
}

function getVariablesPaths(
  schema: Record<string, any>,
  parentPath: string[] = []
): string[][] {
  const result: string[][] = [];
  for (const key in schema) {
    const value = schema[key]!;
    if (isVariable(value)) {
      result.push([...parentPath, key]);
    } else {
      const paths = getVariablesPaths(value, [...parentPath, key]);
      for (const path of paths) {
        result.push(path);
      }
    }
  }
  return result;
}

export const jalUtil = {
  getVariableTransLinks: getVarTransLinks,
  getVariablesPaths: getVariablesPaths,
  isVariable: isVariable,
  isFunction: isFunctionVar,
  isStatic: isStaticVar,
  isConstant: isConstantVar,
  isReference: isReferenceVar,
  isSetup: isSetupVar,
  commandToFunction: (command: Command): FunctionVar => ({ type: "function", ...command }),
  isConstantName: isConstantName,
  toConstantInfo: (constName: string) => {
    if (!isConstantName(constName)) {
      throw new Error(`Constant variable with name "${constName}" is not provided`);
    }
    return O1JS_CONSTANTS[constName];
  },
  isTarget(target: string): target is O1JalTarget {
    return PROGRAM_TARGETS
      // @ts-expect-error
      .includes(target);
  }
};

export const o1jsJalUtil = jalUtil;

export const TYPE_TOKENS: Record<string, string> = {
  field: "Field",
  publickey: "PublicKey",
  uint64: "UInt64",
  bool: "Bool",
  signature: "Signature",
  string: "CircuitString"
};

export const o1jsTrGraph = new O1TrGraph();