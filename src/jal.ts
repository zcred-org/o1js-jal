import { ConverterInput, ConverterOutput, O1JalTarget, Program } from "./types.js";
import { translateZkProgram } from "./translator/zk-program.js";
import { translateSmartContract } from "./translator/smart-contract.js";
import { jalUtil } from "./util.js";
import { ConverterZkProgramOut, toZkProgramInput } from "./converter/zk-program.js";
import { ConverterSCOut, toSmartContractInput } from "./converter/smart-contract.js";
import sortKeys from "sort-keys";

type ConverterOutTypes = {
  "o1js:zk-program": ConverterZkProgramOut;
  "o1js:smart-contract": ConverterSCOut;
}

export function convertToInput<
  TKey extends keyof ConverterOutTypes = keyof ConverterOutTypes,
  TOut extends ConverterOutTypes[TKey] = ConverterOutTypes[TKey]
>(
  target: TKey,
  input: Omit<ConverterInput, "target">
): TOut {
  if (!jalUtil.isTarget(target as string)) {
    throw new Error(`Target program ${target} is not supported`);
  }
  return converterMap[target as O1JalTarget](sortKeys(input, { deep: true })) as TOut;
}

const converterMap: Record<
  O1JalTarget,
  (input: Omit<ConverterInput, "target">) => ConverterOutput
> = {
  "o1js:zk-program": toZkProgramInput,
  "o1js:smart-contract": toSmartContractInput
};

export function translate<
  TTarget extends string = string,
  TLink extends string = string
>(program: Program<TTarget, TLink>): string {
  const target = program.target;
  if (!jalUtil.isTarget(target)) {
    throw new Error(`Target program ${target} is not supported`);
  }
  return translatorMap[target](sortKeys(program, { deep: true }));
}

const translatorMap: Record<O1JalTarget, (program: Program) => string> = {
  "o1js:zk-program": translateZkProgram,
  "o1js:smart-contract": translateSmartContract
};

export function initProgram<
  TTarget extends string = string,
  TLink extends string = string
>(program: Program<TTarget, TLink>) {
  return {
    translate: () => translate(program),
    toInput<
      TOut extends ConverterOutput = ConverterOutput
    >(inputSetup: Record<string, any>): TOut {
      return convertToInput(program.target as O1JalTarget, {
        inputSchema: program.inputSchema,
        inputSetup: inputSetup
      }) as TOut;
    }
  };

}

export const o1jsJal = {
  convertToInput: convertToInput,
  translate: translate,
  initProgram: initProgram
};

