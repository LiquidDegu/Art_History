import { test } from "node:test";
import assert from "node:assert/strict";
import { parseYear, eraForDateRange, detectMedium, detectStyle, detectTheme, isLikelyStillInCopyright } from "../src/classify.js";

test("parseYear handles blanks, numbers, and numeric strings", () => {
  assert.equal(parseYear(""), null);
  assert.equal(parseYear(undefined), null);
  assert.equal(parseYear("1503"), 1503);
  assert.equal(parseYear(-100), -100);
});

test("eraForDateRange picks the era containing the object's midpoint", () => {
  assert.equal(eraForDateRange(1478, 1482).id, "renaissance");
  assert.equal(eraForDateRange(-100, -1).id, "ancient");
  assert.equal(eraForDateRange(1870, 1875).id, "impressionism");
  assert.equal(eraForDateRange(null, null), null);
});

test("eraForDateRange breaks ties on a straddling range by greatest overlap", () => {
  // Straddles Renaissance/Baroque; midpoint (1590) sits in Renaissance's range.
  assert.equal(eraForDateRange(1580, 1600).id, "renaissance");
});

test("detectMedium maps free-text medium strings to the known enum", () => {
  assert.equal(detectMedium("Oil on canvas"), "painting");
  assert.equal(detectMedium("Marble"), "sculpture");
  assert.equal(detectMedium("Fresco"), "fresco");
  assert.equal(detectMedium("Illuminated manuscript on vellum"), "manuscript");
  assert.equal(detectMedium("Gelatin silver photograph"), "photograph");
  assert.equal(detectMedium("Assorted mixed media"), "other");
  assert.equal(detectMedium(""), "other");
});

test("detectStyle only tags known style keywords found in free text", () => {
  assert.equal(detectStyle("Early Renaissance"), "Early Renaissance");
  assert.equal(detectStyle("Some unrecognized period label"), null);
  assert.equal(detectStyle(""), null);
});

test("detectTheme matches keywords against a single combined text field", () => {
  assert.equal(detectTheme("Portrait of a Lady"), "Portrait");
  assert.equal(detectTheme("Untitled Landscape"), "Landscape");
  assert.equal(detectTheme("Still Life with Apples"), "Still Life");
  assert.equal(detectTheme("Abstract Composition No. 4"), null);
});

test("isLikelyStillInCopyright flags recently-deceased artists and defers when death year is unknown", () => {
  assert.equal(isLikelyStillInCopyright(2016), true);
  assert.equal(isLikelyStillInCopyright(1900), false);
  assert.equal(isLikelyStillInCopyright(null), false);
});
