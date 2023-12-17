import {
  ConstVar,
  ConverterInput,
  ConverterOutput,
  InputSchema,
  ReferenceVar,
  SetupVar,
  StaticVar,
  Variable
} from "../types.js";
import { objUtil } from "o1js-trgraph";
import { jalUtil, o1jsTrGraph } from "../util.js";
import sortKeys from "sort-keys";

export interface ConverterZkProgramOut extends ConverterOutput {
  publicInput: Record<string, any>;
  privateInput: any[];
}

export function toZkProgramInput<
  T extends ConverterOutput = ConverterZkProgramOut
>({ inputSchema, inputSetup }: Omit<ConverterInput, "target">): T {
  const sortedInputSchema = sortKeys(inputSchema, { deep: true });
  const sortedInputSetup = sortKeys(inputSetup, { deep: true });
  const initPool = initialize(sortedInputSchema, sortedInputSetup);
  const workingPool = postInitialize(sortedInputSchema, initPool);
  const valuesPaths = objUtil.getValuePaths(
    sortedInputSchema,
    (value) => typeof value?.type === "string"
  );
  const publicInput: Record<string, any> = {};
  const privateInput = [];
  for (const path of valuesPaths) {
    const value = objUtil.getValue(workingPool, path);
    if (path[0] === "public") {
      const key = path.slice(1).map((it) => it.replace(/[:\-~#+=]/g, "_")).join("_");
      publicInput[key] = value;
    } else {
      privateInput.push(value);
    }
  }
  return {
    publicInput,
    privateInput
  } as T;
}

function initialize(
  inputSchema: InputSchema,
  inputSetup: Record<string, any>
): Record<string, any> {
  const pathsToSchemaVars = objUtil.getValuePaths(
    inputSchema,
    (value: unknown) => {
      const type = (value as any)?.type;
      return type === "static" || type === "setup" || type === "constant";
    }
  );
  const initPool: Record<string, any> = {};
  for (const path of pathsToSchemaVars) {
    const variable: StaticVar | SetupVar | ConstVar = objUtil.getValue(inputSchema, path);
    if (variable.type === "static") {
      const transformed = o1jsTrGraph.transform(variable.value, variable.transLinks);
      objUtil.putValue(initPool, path, transformed);
    }
    if (variable.type === "constant") {
      const constantName = variable.name;
      const { transLinks, value } = jalUtil.toConstantInfo(constantName);
      const transformed = o1jsTrGraph.transform(value, transLinks);
      objUtil.putValue(initPool, path, transformed);
    }
    if (variable.type === "setup") {
      const value = objUtil.getValue(inputSetup, path);
      const transformed = o1jsTrGraph.transform(value, variable.transLinks);
      objUtil.putValue(initPool, path, transformed);
    }
  }
  return initPool;
}

function postInitialize(inputSchema: InputSchema, initPool: Record<string, any>) {
  const pathsToSchemaVars = objUtil.getValuePaths(
    inputSchema,
    (value) => value?.type === "reference"
  );
  for (const path of pathsToSchemaVars) {
    const value = processRefVar(inputSchema, initPool, path);
    objUtil.putValue(initPool, path, value);
  }
  return initPool;
}

function processRefVar(
  inputSchema: InputSchema,
  initPool: Record<string, any>,
  path: string[]
): any {
  const refVar: ReferenceVar = objUtil.getValue(inputSchema, path);
  const pointVar: Variable = objUtil.getValue(inputSchema, refVar.path);
  if (pointVar.type === "reference") {
    return processRefVar(inputSchema, initPool, refVar.path);
  }
  return objUtil.getValue(initPool, refVar.path);
}