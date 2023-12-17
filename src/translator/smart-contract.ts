import { InputSchema, Pool, Program } from "../types.js";
import { jalUtil, TYPE_TOKENS } from "../util.js";
import { objUtil } from "o1js-trgraph";
import Mustache from "mustache";
import { translateO1jsCommands } from "./o1js-commands.js";

const importString =
  `import {\n` +
  `  Bool,\n` +
  `  Provable,\n` +
  `  CircuitString,\n` +
  `  ZkProgram,\n` +
  `  Field,\n` +
  `  Poseidon,\n` +
  `  PublicKey,\n` +
  `  Signature,\n` +
  `  Struct,\n` +
  `  UInt64,\n` +
  `  method,\n` +
  `  SmartContract\n` +
  `} from "o1js";\n\n`;

export function translateSmartContract({
    inputSchema,
    commands
  }: Omit<Program, "target">
): string {
  const targetInputSchema = { ...inputSchema, public: undefined };
  const variablesPaths = jalUtil.getVariablesPaths(targetInputSchema);
  const namePool = createProgramNamePool(variablesPaths);
  const typePool = createTypePool(targetInputSchema, variablesPaths);
  const workingPool = {
    ...namePool,
    VARIABLE_TYPES: { ...typePool }
  };
  const methodInput = translateMethodInput(variablesPaths, workingPool);
  const translatedCommands = translateO1jsCommands(commands, workingPool);
  const template =
    importString +
    `export class ZkSmartContract extends SmartContract {\n` +
    `  @method execute(\n`
    + methodInput +
    `  ) {\n` +
    translatedCommands.map((it) => `    ` + it).join("") +
    `  }\n` +
    `}\n`;
  return Mustache.render(template, workingPool);
}

function createProgramNamePool(variablePaths: string[][]): Pool {
  const namePool: Pool = {};
  for (const variablePath of variablePaths) {
    const path = variablePath.map(it => it.replace(/[:\-~#+=]/g, "_"));
    const value = path.join("_");
    objUtil.putValue(namePool, variablePath, value);
  }
  return namePool;
}

function createTypePool(
  inputSchema: InputSchema,
  variablePaths: string[][]
): Pool {
  const typePool: Pool = {};
  for (const path of variablePaths) {
    const transLinks = jalUtil.getVariableTransLinks(inputSchema, path);
    const latLink = transLinks[transLinks.length - 1];
    if (!latLink) {
      throw new Error(`Internal error: Transformation links must not be empty`);
    }
    const finalType = latLink.split("-")[1]?.split(":")[1];
    if (!finalType) throw new Error(`Internal error: Can't find final transLinks type`);
    const typeToken = TYPE_TOKENS[finalType];
    if (!typeToken) throw new Error(`Internal error: Can't find Type token for ${finalType}`);
    objUtil.putValue(typePool, path, typeToken);
  }
  return typePool;
}

function translateMethodInput(variablePaths: string[][], workingPool: Pool) {
  const methodInput: string[] = [];
  for (const path of variablePaths) {
    methodInput.push(
      `    {{ ${path.join(".")} }}: {{ ${["VARIABLE_TYPES", ...path].join(".")} }},\n`
    );
  }
  const template = methodInput.join("");
  return Mustache.render(template, workingPool);
}