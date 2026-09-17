import assert from "node:assert/strict";
import test from "node:test";
import { calculateDisposal, isDisposal } from "./disposal.js";

const input = { disposalQuantity: 2.5, disposalUnit: "㎥", disposalUnitPrice: 12000, disposalTaxRate: 10 };

test("ton quantities keep their unit and use the entered per-ton price", () => {
  const result = calculateDisposal({ ...input, disposalUnit: "t" });
  assert.equal(result.disposalUnit, "t");
  assert.equal(result.disposalQuantity, 2.5);
  assert.equal(result.amount, 33000);
});

test("subtotal, tax, total and stored rates", () => {
  for (const rate of [0, 8, 10]) {
    const result = calculateDisposal({ ...input, disposalTaxRate: rate, amount: 1, disposalSubtotal: 1, disposalTaxAmount: 1 });
    assert.equal(result.disposalSubtotal, 30000);
    assert.equal(result.disposalTaxAmount, 30000 * rate / 100);
    assert.equal(result.amount, 30000 + 30000 * rate / 100);
    assert.equal(result.disposalTaxRate, rate);
  }
});

test("floor each stage without binary floating point underflow", () => {
  const result = calculateDisposal({ ...input, disposalQuantity: 1.3, disposalUnitPrice: 19 });
  assert.equal(result.disposalSubtotal, 24);
  assert.equal(result.disposalTaxAmount, 2);
  assert.equal(result.amount, 26);
  assert.equal(calculateDisposal({ ...input, disposalQuantity: 0.7, disposalUnitPrice: 100 }).disposalSubtotal, 70);
  assert.equal(calculateDisposal({ ...input, disposalUnitPrice: 0 }).amount, 0);
  assert.equal(calculateDisposal({ ...input, disposalQuantity: 0.1, disposalUnitPrice: 1 }).amount, 0);
});

test("reject invalid inputs and overflowing totals", () => {
  for (const value of [0, -1, 1.01, "2.5", NaN, Infinity, 100000.1]) assert.throws(() => calculateDisposal({ ...input, disposalQuantity: value }));
  for (const value of [-1, 1.5, "12000", NaN, Infinity, 1000001]) assert.throws(() => calculateDisposal({ ...input, disposalUnitPrice: value }));
  for (const value of [-1, 5, 10.5, "10", NaN, Infinity]) assert.throws(() => calculateDisposal({ ...input, disposalTaxRate: value }));
  for (const value of ["m3", "lb", "", null]) assert.throws(() => calculateDisposal({ ...input, disposalUnit: value }));
  assert.throws(() => calculateDisposal({ ...input, disposalQuantity: 100000, disposalUnitPrice: 1000000 }));
  assert.equal(calculateDisposal({ ...input, disposalQuantity: 100000, disposalUnitPrice: 0 }).amount, 0);
  assert.equal(calculateDisposal({ ...input, disposalQuantity: 2147.4, disposalUnitPrice: 1000000, disposalTaxRate: 0 }).amount, 2147400000);
  assert.throws(() => calculateDisposal({ ...input, disposalQuantity: 2147.4, disposalUnitPrice: 1000000 }));
  assert.equal(calculateDisposal({ ...input, disposalUnit: "kg" }).disposalUnit, "kg");
});

test("only non-metal disposal is eligible", () => {
  assert.equal(isDisposal({ category: "DISPOSAL", detail: "金属" }), false);
  assert.equal(isDisposal({ category: "LABOR", detail: null }), false);
  assert.equal(isDisposal({ category: "DISPOSAL", detail: "木くず" }), true);
});
