import chalk from "chalk";
import { BigNumber } from "ethers";
import { formatUnits, parseUnits } from "ethers/lib/utils.js";

import { hasColor } from "./helpers.js";

import type { BigNumberish } from "ethers/lib/ethers.js";

/**
 * Sets the number of decimals for a token format conversion.
 *
 * @param decimals - The number of decimals to use.
 * @returns An object with two functions: one to convert a decimal string to a BigNumber and another to convert a BigNumber to a decimal string.
 */
export function useDecimals(decimals: number): {
  decimalToBigNumber: (amount: string) => BigNumberish;
  bigNumberToDecimal: (amount: BigNumberish) => string;
} {
  return {
    decimalToBigNumber: (amount: string) =>
      decimalToBigNumber(amount, decimals),
    bigNumberToDecimal: (amount: BigNumberish) =>
      bigNumberToDecimal(amount, decimals),
  };
}

function decimalToBigNumber(amount: string, decimals: number): BigNumberish {
  return parseUnits(amount, decimals);
}

function bigNumberToDecimal(amount: BigNumberish, decimals: number): string {
  const result = formatUnits(amount.toString(), decimals).toString();
  if (result.endsWith(".0")) {
    return result.slice(0, -2);
  }
  return result;
}

export type LogEntry =
  | string
  | {
      text: string;
      list?: LogEntry[];
    };

const formatLogEntry = (
  entry: LogEntry,
  indentation = "",
  defaultColor = chalk.blueBright
): string => {
  function formatString(text: string): string {
    if (!text.trimStart().startsWith("-")) {
      text = `- ${text}`;
    }
    return `${indentation}${hasColor(text) ? text : defaultColor(text)}`;
  }

  if (typeof entry === "string") {
    return formatString(entry);
  } else {
    const { text, list } = entry;
    const formattedText = formatString(text);
    if (list && list.length > 0) {
      const subEntries = list
        .map((item) => formatLogEntry(item, indentation + " ", defaultColor))
        .join("\n");
      return `${formattedText}\n${subEntries}`;
    } else {
      return formattedText;
    }
  }
};

export const formatLogs = (
  logs: LogEntry[],
  indentation = "",
  defaultColor = chalk.blueBright
): string => {
  return logs
    .map((entry) => formatLogEntry(entry, indentation, defaultColor))
    .join("\n");
};

export const formatSeparator = (text: string) => {
  const totalLength = 50; // Total length of the line including the text

  if (!text) {
    return {
      type: "separator",
      line: "─".repeat(totalLength + 1),
    };
  }

  const textLength = text.length;
  const dashLength = (totalLength - textLength) / 2;
  const dashes = "─".repeat(dashLength);
  return {
    type: "separator",
    line: `${dashes} ${text} ${dashes}`,
  };
};

export const getTimeAgo = (date: Date): string => {
  const now = new Date();
  const secondsDiff = Math.floor((now.getTime() - date.getTime()) / 1000);

  const years = Math.floor(secondsDiff / (60 * 60 * 24 * 365)); // seconds in a year
  if (years >= 1) {
    return years + " years ago";
  }

  const months = Math.floor(secondsDiff / (60 * 60 * 24 * 30)); // seconds in a month
  if (months >= 1) {
    return months + " months ago";
  }

  const days = Math.floor(secondsDiff / (60 * 60 * 24)); // seconds in a day
  if (days >= 1) {
    return days + " days ago";
  }

  const hours = Math.floor(secondsDiff / (60 * 60)); // seconds in an hour
  if (hours >= 1) {
    return hours + " hours ago";
  }

  const minutes = Math.floor(secondsDiff / 60); // seconds in a minute
  if (minutes >= 1) {
    return minutes + " minutes ago";
  }

  return secondsDiff + " seconds ago";
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const convertBigNumbersToStrings = (value: any): any => {
  if (BigNumber.isBigNumber(value)) {
    return value.toString();
  }
  // Handle arrays recursively
  else if (Array.isArray(value)) {
    return value.map(convertBigNumbersToStrings);
  }
  // Handle objects recursively
  else if (typeof value === "object" && value !== null) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const convertedObject: any = {};
    Object.keys(value).forEach((key) => {
      convertedObject[key] = convertBigNumbersToStrings(value[key]);
    });
    return convertedObject;
  }
  return value;
};
