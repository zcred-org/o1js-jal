import { ConstantName } from "./types.js";

export const CONSTANTS_NAME = ["year"] as const;


export const O1JS_CONSTANTS: Record<ConstantName, {
  programName: string;
  programType: string;
  programValue: string;
  value: number | string | boolean | bigint | object;
  initialize: string;
  transLinks: string[];
}> = {
  year: {
    programName: "YEAR",
    programType: "Field",
    programValue: "Field(365.25 * 24 * 60 * 60 * 1000)",
    value: 365.25 * 24 * 60 * 60 * 1000,
    initialize: `const YEAR = Field(365.25 * 24 * 60 * 60 * 1000)`,
    transLinks: ["uint64-mina:field"]
  }
};

export function isConstantName(name: string): name is ConstantName {
  return CONSTANTS_NAME
    // @ts-expect-error
    .includes(name);
}