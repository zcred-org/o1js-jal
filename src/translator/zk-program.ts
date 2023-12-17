import { Pool, Program } from "../types.js";
import { jalUtil, TYPE_TOKENS } from "../util.js";
import { objUtil } from "o1js-trgraph";
import { translateO1jsCommands } from "./o1js-commands.js";
import Mustache from "mustache";
import sortKeys from "sort-keys";

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
  `} from "o1js";\n\n`;

export function translateZkProgram({
    inputSchema,
    commands
  }: Omit<Program, "target">
): string {
  const sortedInputSchema = sortKeys(inputSchema, { deep: true });
  const sortedCommands = sortKeys(commands, { deep: true });
  const variablesPaths = jalUtil.getVariablesPaths(sortedInputSchema);
  const namePool = createProgramNamePool(variablesPaths);
  const typePool = createTypePool(sortedInputSchema, variablesPaths);
  const workingPool = {
    ...namePool,
    VARIABLE_TYPES: { ...typePool }
  };
  const translatedPublicInput = translatePublicInput(variablesPaths, workingPool);
  const translatedPrivateInput = translatePrivateInput(variablesPaths, workingPool);
  const translatedCommands = translateO1jsCommands(sortedCommands, workingPool);
  const template =
    importString +
    translatedPublicInput + `\n\n`
    + `export const zkProgram = ZkProgram({\n`
    + `  publicInput: PublicInput,\n`
    + `  methods: {\n`
    + `    execute: {\n`
    + translatedPrivateInput
    + ` {\n`
    + translatedCommands.map((command) => `        ` + command).join("")
    + `      }\n`
    + `    }\n`
    + `  }\n`
    + `});\n`;
  return Mustache.render(template, workingPool);

}

export function translatePublicInput(variablesPaths: string[][], pool: Pool) {
  const publicPaths = variablesPaths.filter(path => path[0] === "public");
  let publicInputNamePool = {};
  for (const path of publicPaths) {
    publicInputNamePool = objUtil.putValue(
      publicInputNamePool,
      path,
      path.slice(1).map(it => it.replace(/[:\-~#+=]/g, "_")).join("_")
    );
  }
  const inputs: string[] = [];
  for (const path of publicPaths) {
    inputs.push(
      `  {{ ${["PUBLIC_INPUT_NAMES", ...path].join(".")} }}: {{ ${["VARIABLE_TYPES", ...path].join(".")} }}, \n`
    );
  }
  const template = `export class PublicInput extends Struct({ \n` + inputs.join("") + `}) {}`;
  return Mustache.render(template, {
    ...pool,
    PUBLIC_INPUT_NAMES: publicInputNamePool
  });
}

export function translatePrivateInput(variablesPaths: string[][], pool: Pool) {
  const privatePaths = variablesPaths.filter(path => path[0] === "private");
  const translatedTypes: string[] = [];
  const translatedVariables: string[] = [];
  for (const path of privatePaths) {
    translatedTypes
      .push(`        {{ ${["VARIABLE_TYPES", ...path].join(".")} }},\n`);
    translatedVariables
      .push(`        {{ ${path.join(".")} }},\n`);
  }
  const template =
    `      privateInputs: [\n`
    + translatedTypes.join("")
    + `      ],\n`
    + `      method(\n`
    + `        publicInput,\n`
    + translatedVariables.join("")
    + `      )`;
  return Mustache.render(template, pool);
}


function createProgramNamePool(variablePaths: string[][]): Pool {
  const namePool: Pool = {};
  for (const variablePath of variablePaths) {
    const path = variablePath.map(it => it.replace(/[:\-~#+=]/g, "_"));
    let value: string = "";
    if (path[0] === "public") {
      value = ["publicInput", path.slice(1).join("_")].join(".");
    } else {
      value = path.join("_");
    }
    objUtil.putValue(namePool, variablePath, value);
  }
  return namePool;
}

function createTypePool(
  inputSchema: Record<string, any>,
  variablePaths: string[][]
): Pool {
  let typePool: Pool = {};
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
    typePool = objUtil.putValue(typePool, path, typeToken);
  }
  return typePool;
}