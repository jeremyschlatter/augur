#!/usr/bin/env node

GLOBAL.path = require("path");
GLOBAL.fs = require("fs");
GLOBAL.BigNumber = require("bignumber.js");
GLOBAL.keccak_256 = require("js-sha3").keccak_256;
GLOBAL.XHR2 = require("xhr2");
GLOBAL.request = require("sync-request");
GLOBAL.crypto = require("crypto");
GLOBAL._ = require("lodash");
GLOBAL.chalk = require("chalk");
GLOBAL.moment = require("moment");
GLOBAL.sjcl = require("sjcl");
GLOBAL.Transaction = require("ethereumjs-tx");
GLOBAL.EthUtil = require("ethereumjs-util");
GLOBAL.rlp = require("rlp");
GLOBAL.elliptic = require("eccrypto");
GLOBAL.Augur = require("./augur");
GLOBAL.constants = require("./test/constants");
GLOBAL.utilities = require("./test/utilities");
GLOBAL.augur = Augur;
GLOBAL.log = console.log;
GLOBAL.b = Augur.branches.dev;
GLOBAL.ballot = [ 2, 1.5, 1.5, 1, 1.5, 1.5, 1 ];

Augur.connect();

GLOBAL.accounts = utilities.get_test_accounts(Augur, constants.max_test_accounts);
GLOBAL.c = Augur.coinbase;

GLOBAL.balance = function (account, branch) {
    account = account || Augur.coinbase;
    var balances = {
        cash: Augur.getCashBalance(account),
        reputation: Augur.getRepBalance(branch || Augur.branches.dev, account),
        ether: Augur.bignum(Augur.balance(account)).dividedBy(Augur.ETHER).toFixed()
    };
    log(chalk.cyan("Balances:"));
    log("Cash:       " + chalk.green(balances.cash));
    log("Reputation: " + chalk.green(balances.reputation));
    log("Ether:      " + chalk.green(balances.ether));
    return balances;
}

GLOBAL.gospel = function () {
    var gospel_file;
    try {
        gospel_file = path.join(__dirname || "", "test", "gospel.json");
    } catch (e) {
        gospel_file = path.join(__dirname || "", "gospel.json");
    }
    log("Load contracts from file: " + chalk.green(gospel_file));
    Augur.contracts = JSON.parse(fs.readFileSync(gospel_file));
    Augur.connect();
    balance();
};

GLOBAL.balances = balance();

GLOBAL.reporting = function (branch) {
    var info = {
        vote_period: Augur.getVotePeriod(b),
        current_period: Augur.getCurrentPeriod(b),
        num_events: Augur.getNumberEvents(b, vote_period),
        num_reports: Augur.getNumberReporters(b)
    };
    log(chalk.cyan("Vote period"), chalk.green(info.vote_period) + chalk.cyan(":"));
    log("Current period:     ", chalk.green(info.current_period));
    log("Number of events:   ", chalk.green(info.num_events));
    log("Number of reporters:", chalk.green(info.num_reports));
    return info;
};

// var reportingInfo = reporting(b)

// GLOBAL.vote_period = reportingInfo.vote_period;
// GLOBAL.current_period = reportingInfo.current_period;
// GLOBAL.num_events = reportingInfo.num_events;
// GLOBAL.num_reports = reportingInfo.num_reports;
