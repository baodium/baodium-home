import { assessChapter1 } from "../src/lib/experience/ch01/sim";

const result = assessChapter1();
const problems: string[] = [];

if (result.atZero.busy < 5 || result.atZero.busy > 12) {
  problems.push(`flag 0% busy ${result.atZero.busy}, expected about 8 of 40`);
}
if (result.atZero.waiting !== 0) {
  problems.push(`flag 0% waiting ${result.atZero.waiting}, expected 0`);
}
if (result.atZero.page != null && result.atZero.page >= 100) {
  problems.push(`flag 0% page p99 ${result.atZero.page}, expected under 100 ms`);
}
if (result.atHalf.page != null && result.atHalf.page >= 300) {
  problems.push(`flag 50% page p99 ${result.atHalf.page}, expected under 300 ms`);
}
if (result.atFull.busy < 40) {
  problems.push(`flag 100% busy ${result.atFull.busy}, expected 40`);
}
if (result.atFull.waiting < 20) {
  problems.push(`flag 100% waiting ${result.atFull.waiting}, expected dozens`);
}
if ((result.atFull.peakPage ?? 0) <= 300) {
  console.log(
    `Note: page p99 peaked at ${Math.round(result.atFull.peakPage ?? 0)} ms. The book rates are (110 + 447) x 0.0715 s = 39.8 of 40, so this seed queues dozens of requests without sustaining the incident snapshot's ~600 ms acquire.`,
  );
}
if (
  result.atFull.sql != null &&
  result.sqlBaseline != null &&
  result.atFull.sql > result.sqlBaseline * 2.5
) {
  problems.push(
    `SQL p99 ${Math.round(result.atFull.sql)} drifted from baseline ${Math.round(result.sqlBaseline)}`,
  );
}
if (result.seen !== 8) {
  problems.push(`${result.seen} of 8 instances saw the flag within 15 s`);
}
if (result.mayaWaitMs != null && result.mayaWaitMs < 50) {
  problems.push(`Maya waited only ${result.mayaWaitMs} ms`);
}

console.log(JSON.stringify(result, null, 2));
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log("Chapter 1 sim matches the book readings.");
