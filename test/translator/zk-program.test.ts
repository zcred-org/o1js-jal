import { suite } from "uvu";
import { unlinkSync, writeFileSync } from "fs";
import { translateZkProgram } from "../../src/translator/zk-program.js";
import { InputSchema } from "../../src/types.js";
import { randomUUID } from "node:crypto";
import * as a from "uvu/assert";
// @ts-ignore
import { ROOT_DIR } from "../test-util.js";

const test = suite("Experimental program translator");


let randomPath: URL;

test.before.each(() => {
  randomPath = new URL(`./test/translator/${randomUUID()}.js`, ROOT_DIR);
});

test.after.each(() => {
  unlinkSync(randomPath);
});

test("", async () => {
  const inputSchema: InputSchema = {
    private: {
      age: {
        type: "setup",
        transLinks: ["uint64-mina:field"]
      }
    },
    public: {
      age: {
        type: "reference",
        path: ["private", "age"]
      }
    }
  };
  const translated = translateZkProgram({
    inputSchema: inputSchema,
    commands: [
      {
        assert: {
          in: [
            {
              type: "function",
              equal: {
                in: [
                  { type: "reference", path: ["private", "age"] },
                  { type: "reference", path: ["public", "age"] }
                ]
              }
            }
          ]
        }
      },
      {
        assert: {
          in:
            [
              {
                type: "function",
                equal: {
                  in: [
                    { type: "constant", name: "year" },
                    { type: "static", value: 365.25 * 24 * 60 * 60 * 1000, transLinks: ["uint64-mina:field"] }]
                }
              }
            ]
        }
      }
    ]
  });
  writeFileSync(randomPath, translated, { flag: "w" });
  const { PublicInput, zkProgram } = await import(randomPath.href);
  a.is(typeof PublicInput, "function");
  a.is(typeof zkProgram.compile, "function");
  a.is(typeof zkProgram.execute, "function");
});

test.run();