import ts from "typescript"

export const ROOT_DIR = new URL("../", import.meta.url);
export const tsTranspileOptions: ts.TranspileOptions = {
  compilerOptions: {
    modue: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2020,
    strict: true,
    strictPropertyInitialization: false,
    skipLibCheck: true,
    forceConsistentCasingInFileNames: true,
    esModuleInterop: true,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    experimentalDecorators: true,
    emitDecoratorMetadata: true,
    allowJs: true,
    declaration: true,
    sourceMap: true,
    noFallthroughCasesInSwitch: true,
    allowSyntheticDefaultImports: true,
    isolatedModules: true,
    noEmit: true,
    incremental: true,
    resolveJsonModule: true,
  },
}