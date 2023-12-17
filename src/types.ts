import { CONSTANTS_NAME } from "./constants.js";

export type ReferenceVar = {
  type: "reference",
  path: string[],
}

export type StaticVar<TLink extends string = string> = {
  type: "static",
  value: string | number | boolean;
  transLinks: TLink[];
}

export type SetupVar<TLink extends string = string> = {
  type: "setup";
  transLinks: TLink[];
}

export type ConstVar = {
  type: "constant",
  name: ConstantName
}

export type Variable<TLink extends string = string> =
  | FunctionVar<TLink>
  | StaticVar<TLink>
  | ReferenceVar
  | SetupVar<TLink>
  | ConstVar

type FunctionVarInput<TLink extends string = string> =
  | ReferenceVar
  | StaticVar<TLink>
  | FunctionVar<TLink>
  | ConstVar;

export type FunName<TLink extends string = string> = keyof Required<Omit<FunctionVar<TLink>, "type">>

export type FunctionVar<TLink extends string = string> = {
  type: "function",
  add?: {
    in: [
      FunctionVarInput<TLink>,
      FunctionVarInput<TLink>,
    ],
    out?: string
  },
  sub?: {
    in: [
      FunctionVarInput<TLink>,
      FunctionVarInput<TLink>,
    ],
    out?: string
  },
  mul?: {
    in: [
      FunctionVarInput<TLink>,
      FunctionVarInput<TLink>,
    ],
    out?: string
  },
  equal?: {
    in: [
      FunctionVarInput<TLink>,
      FunctionVarInput<TLink>,
    ],
    out?: string
  },
  greater?: {
    in: [
      FunctionVarInput<TLink>,
      FunctionVarInput<TLink>,
    ],
    out?: string
  },
  greaterEqual?: {
    in: [
      FunctionVarInput<TLink>,
      FunctionVarInput<TLink>,
    ],
    out?: string
  },
  less?: {
    in: [
      FunctionVarInput<TLink>,
      FunctionVarInput<TLink>,
    ],
    out?: string
  },
  lessEqual?: {
    in: [
      FunctionVarInput<TLink>,
      FunctionVarInput<TLink>,
    ],
    out?: string
  },
  assert?: {
    in: [FunctionVarInput<TLink>]
  },
  ternary?: {
    in: [
      FunctionVarInput<TLink>,
      FunctionVarInput<TLink>,
      FunctionVarInput<TLink>,
    ],
    out?: string
  },
  transform?: {
    in: [
      FunctionVarInput<TLink>,
      TLink
    ],
    out?: string
  },
  verifySign?: {
    in: [
      "mina:pasta",
      FunctionVarInput<TLink>,
      FunctionVarInput<TLink>,
      FunctionVarInput<TLink>,
    ],
    out?: string
  },
  hash?: {
    in: [
      "mina:poseidon",
      ...FunctionVarInput<TLink>[],
    ],
    out?: string
  },
  spread?: {
    in: [
      FunctionVarInput<TLink>
    ]
  },
  not?: {
    in: [
      FunctionVarInput<TLink>
    ],
    out?: string
  }
}

export type Pool = Record<string, string> | { [key: string]: Pool }

export type Command<TLink extends string = string> = Omit<FunctionVar<TLink>, "type">

export type InputSchemaValue<TLink extends string = string> =
  | Variable<TLink>
  | { [key: string]: InputSchemaValue<TLink> }

export type InputSchemaContext<TLink extends string = string> = {
  general?: {
    timestamp?: Variable<TLink>; // UNIX timestamp
    timestampU19?: Variable<TLink> // UNIX 19 timestamp
    now?: Variable<TLink>;
    nuwU19?: Variable<TLink>;
  },
  mina?: { // mina context
    smartContract?: {
      state?: InputSchemaValue<TLink>;
    }
  }
}

export type InputSchema<TLink extends string = string> = {
  private: InputSchemaValue<TLink>;
  public?: {
    context?: InputSchemaContext;
  } & InputSchemaValue<TLink>;
}

export type Program<
  TTarget extends string = string,
  TLink extends string = string
> = {
  target: TTarget;
  inputSchema: InputSchema<TLink>;
  commands: Command<TLink>[];
  options?: ProgramOptions;
}

export const PROGRAM_TARGETS = [
  "o1js:zk-program",
  "o1js:smart-contract"
] as const;

export type O1JalTarget = typeof PROGRAM_TARGETS[number]

export type ProgramOptions = { [key: string]: any }

export type ConverterInput = {
  inputSchema: InputSchema;
  inputSetup: Record<string, any>;
  target: string;
}

export type ConverterOutput = {
  publicInput: any;
  privateInput: any;
}

export type ConstantName = typeof CONSTANTS_NAME[number];

