import * as _ from "underscore";
export const msg = (literals, ...expressions) => {
  const key = literals.length > 0 ? literals[0].trim() : "";
  let message = allKeys[key];

  return _.inject(
    expressions,
    (memo, expression) => memo.replace(/\{\}/, expression),
    message
  );
};

const allKeys = {
  "someone.has.merged": `{} has merged {}`,
  "someone.has.merged.window.closed": `{} has merged {} when the release window was closed`,
  "ci.merging.master": `Merging master`,
  "ci.conflicts.merging.master": `Conflicts merging with master`,
  "ci.tests.start": `Merge successful, running tests`,
  "ci.tests.failures": `Tests failures`,
  "ci.failure.abnormal": `Abnormal failure`,
  "ci.tests.success": `Tests successful`,
  "ci.messages.title": `:lock: <{}|{}>`
};
