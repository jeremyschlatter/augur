/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var speedomatic = require("speedomatic");
var formatLogMessage = require("../../../../src/format/log/format-log-message");

describe("format/log/format-log-message", function () {
  var test = function (t) {
    it(JSON.stringify(t), function () {
      t.assertions(formatLogMessage(t.contractName, t.eventName, t.msg));
    });
  };
  test({
    contractName: "ReputationToken",
    eventName: "Approval",
    msg: {
      owner: "0x1",
      spender: "0x2",
      fxpValue: speedomatic.fix("10")
    },
    assertions: function (msg) {
      assert.deepEqual(msg, {
        owner: "0x0000000000000000000000000000000000000001",
        spender: "0x0000000000000000000000000000000000000002",
        fxpValue: "10"
      });
    }
  });
  test({
    contractName: "Orders",
    eventName: "CancelOrder",
    msg: {
      outcome: speedomatic.hex("2"),
      cashRefund: speedomatic.fix("100.5034")
    },
    assertions: function (msg) {
      assert.deepEqual(msg, {
        outcome: 2,
        cashRefund: "100.5034"
      });
    }
  });
  test({
    contractName: "Branch",
    eventName: "CreateMarket",
    msg: {
      branch: "0xb",
      market: "0xa",
      creator: "0xb0b",
      marketCreationFee: speedomatic.fix("1500"),
      extraInfo: JSON.stringify({
        marketType: "categorical",
        shortDescription: "Will this market be the One Market?",
        longDescription: "One Market to rule them all, One Market to bind them, One Market to bring them all, and in the darkness bind them.",
        outcomeNames: ["Yes", "Strong Yes", "Emphatic Yes"],
        tags: ["Ancient evil", "Large flaming eyes"],
        creationTimestamp: 1234567890
      })
    },
    assertions: function (msg) {
      assert.deepEqual(msg, {
        branch: "0x000000000000000000000000000000000000000b",
        market: "0x000000000000000000000000000000000000000a",
        creator: "0x0000000000000000000000000000000000000b0b",
        marketCreationFee: "1500",
        extraInfo: {
          marketType: "categorical",
          shortDescription: "Will this market be the One Market?",
          longDescription: "One Market to rule them all, One Market to bind them, One Market to bring them all, and in the darkness bind them.",
          outcomeNames: ["Yes", "Strong Yes", "Emphatic Yes"],
          tags: ["Ancient evil", "Large flaming eyes"],
          creationTimestamp: 1234567890
        }
      });
    }
  });
  test({
    contractName: "Cash",
    eventName: "DepositEther",
    msg: {
      value: speedomatic.fix("100")
    },
    assertions: function (msg) {
      assert.deepEqual(msg, {
        value: "100"
      });
    }
  });
  test({
    contractName: "Orders",
    eventName: "MakeOrder",
    msg: {
      outcome: speedomatic.hex("1")
    },
    assertions: function (msg) {
      assert.deepEqual(msg, {
        outcome: 1
      });
    }
  });
  test({
    contractName: "ReportingToken",
    eventName: "RedeemWinningTokens",
    msg: {
      reporter: "0xb0b",
      market: "0xa",
      branch: "0xb",
      amountRedeemed: "0x246ddf97976680000",
      reportingFeesReceived: "0x487a9a304539440000",
      payoutNumerators: ["0x0", "0x1", "0x0", "0x0"]
    },
    assertions: function (msg) {
      assert.deepEqual(msg, {
        reporter: "0x0000000000000000000000000000000000000b0b",
        market: "0x000000000000000000000000000000000000000a",
        branch: "0x000000000000000000000000000000000000000b",
        amountRedeemed: "42",
        reportingFeesReceived: "1337",
        payoutNumerators: ["0", "1", "0", "0"]
      });
    }
  });
  test({
    contractName: "ReportingToken",
    eventName: "SubmitReport",
    msg: {
      reporter: "0xb0b",
      market: "0xa",
      branch: "0xb",
      amountStaked: "0x246ddf97976680000",
      reportingToken: "0xb",
      payoutNumerators: ["0x0", "0x1", "0x0", "0x0"]
    },
    assertions: function (msg) {
      assert.deepEqual(msg, {
        reporter: "0x0000000000000000000000000000000000000b0b",
        market: "0x000000000000000000000000000000000000000a",
        branch: "0x000000000000000000000000000000000000000b",
        amountStaked: "42",
        reportingToken: "0x000000000000000000000000000000000000000b",
        payoutNumerators: ["0", "1", "0", "0"]
      });
    }
  });
  test({
    contractName: "Orders",
    eventName: "TakeOrder",
    msg: {
      owner: "0x1",
      outcome: "1",
      orderType: "1"
    },
    assertions: function (msg) {
      assert.deepEqual(msg, {
        owner: "0x0000000000000000000000000000000000000001",
        outcome: 1,
        orderType: "sell"
      });
    }
  });
  test({
    contractName: "Cash",
    eventName: "Transfer",
    msg: {
      from: "3",
      to: "4",
      value: speedomatic.fix("312")
    },
    assertions: function (msg) {
      assert.deepEqual(msg, {
        from: "0x0000000000000000000000000000000000000003",
        to: "0x0000000000000000000000000000000000000004",
        value: "312"
      });
    }
  });
  test({
    contractName: "Cash",
    eventName: "WithdrawEther",
    msg: {
      to: "0x1",
      value: speedomatic.fix("153.25")
    },
    assertions: function (msg) {
      assert.deepEqual(msg, {
        to: "0x0000000000000000000000000000000000000001",
        value: "153.25"
      });
    }
  });
  test({
    contractName: "Cash",
    eventName: "a eventName we dont recognize in this function",
    msg: {
      sender: "0x1",
      amount: speedomatic.fix("10"),
      price: speedomatic.fix("5"),
      orderType: "0"
    },
    assertions: function (msg) {
      assert.deepEqual(msg, {
        sender: "0x0000000000000000000000000000000000000001",
        amount: "10",
        price: "5",
        orderType: "buy"
      });
    }
  });
});
