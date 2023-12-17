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
import { jalUtil, o1jsTrGraph } from "../util.js";
import { objUtil } from "o1js-trgraph";

export interface ConverterSCOut extends ConverterOutput {
  privateInput: any[],
  publicInput: null
}

export function toSmartContractInput<
  T extends ConverterOutput = ConverterSCOut
>({ inputSchema, inputSetup }: Omit<ConverterInput, "target">): T {
  const initPool = initialize(inputSchema, inputSetup);
  const workingPool = postInitialize(inputSchema, initPool);
  const valuesPaths = objUtil.getValuePaths(
    inputSchema,
    (value) => typeof value?.type === "string"
  );
  const privateInput = [];
  for (const path of valuesPaths) {
    const value = objUtil.getValue(workingPool, path);
    if (path[0] !== "public") {
      privateInput.push(value);
    }
  }
  return {
    privateInput: privateInput,
    publicInput: null
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