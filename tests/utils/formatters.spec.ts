import { describe, expect, expectTypeOf, test } from "vitest";

import { useDecimals } from "../../src/utils/formatters.js";

import type { BigNumberish } from "ethers";

describe("useDecimals", () => {
  test("returns two functions in an array", () => {
    const useDecimalsResult = useDecimals(1.005);
    expectTypeOf(useDecimalsResult).toBeObject();
    expectTypeOf(useDecimalsResult.bigNumberToDecimal).toBeFunction();
    expectTypeOf(useDecimalsResult.decimalToBigNumber).toBeFunction();
  });

  describe("decimalToBigNumber", () => {
    test("ETH decimal value", () => {
      const { decimalToBigNumber } = useDecimals(18);
      expectTypeOf(decimalToBigNumber("1.5")).toEqualTypeOf<BigNumberish>();
      expect(decimalToBigNumber("1.5").toString()).toEqual(
        "1500000000000000000"
      );
    });

    test("USDC decimal value", () => {
      const { decimalToBigNumber } = useDecimals(6);
      expectTypeOf(decimalToBigNumber("1.5")).toEqualTypeOf<BigNumberish>();
      expect(decimalToBigNumber("1.5").toString()).toEqual("1500000");
    });
  });

  describe("bigNumberToDecimal", () => {
    const { bigNumberToDecimal } = useDecimals(12);

    test("string argument", () => {
      expectTypeOf(bigNumberToDecimal("5")).toEqualTypeOf<string>();
      expect(bigNumberToDecimal("500000").toString()).toEqual("0.0000005");
    });

    test("number argument", () => {
      expectTypeOf(bigNumberToDecimal(234)).toEqualTypeOf<string>();
      expect(bigNumberToDecimal(234).toString()).toEqual("0.000000000234");
    });
  });

  describe("switcheroo", () => {
    test("convert from decimal to bigNumber back to decimal", () => {
      const { decimalToBigNumber, bigNumberToDecimal } = useDecimals(12);
      const testValue = "4.2";
      const result = bigNumberToDecimal(decimalToBigNumber(testValue));
      expectTypeOf(result).toEqualTypeOf<string>();
      expect(result).toEqual("4.2");
    });

    test("convert from bigNumber to decimal back to bigNumber", () => {
      const { decimalToBigNumber, bigNumberToDecimal } = useDecimals(12);
      const testValue = "470000";
      const result = decimalToBigNumber(bigNumberToDecimal(testValue));
      expectTypeOf(result).toEqualTypeOf<BigNumberish>();
      expect(result.toString()).toEqual("470000");
    });
  });
});
