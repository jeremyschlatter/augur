/**
 * Augur JavaScript API
 * @author Jack Peterson (jack@tinybike.net)
 */

"use strict";

var clone = require("clone");
var abi = require("augur-abi");
var constants = require("../constants");
var utils = require("../utilities");

var ONE = abi.bignum("1");

module.exports = {

  parseCompleteSetsLogs: function (logs, mergeInto) {
    var marketID, logData, numOutcomes, logType, parsed;
    parsed = mergeInto || {};
    for (var i = 0, n = logs.length; i < n; ++i) {
      if (logs[i] && logs[i].data !== undefined &&
                logs[i].data !== null && logs[i].data !== "0x") {
        marketID = logs[i].topics[2];
        logType = this.filters.format_trade_type(logs[i].topics[3]);
        logData = this.rpc.unmarshal(logs[i].data);
        numOutcomes = parseInt(logData[1], 16);
        if (mergeInto) {
          if (!parsed[marketID]) parsed[marketID] = {};
          for (var j = 1; j <= numOutcomes; ++j) {
            if (!parsed[marketID][j]) parsed[marketID][j] = [];
            parsed[marketID][j].push({
              type: logType,
              isCompleteSet: true,
              amount: abi.unfix(logData[0], "string"),
              price: ONE.dividedBy(abi.bignum(numOutcomes)).toFixed(),
              blockNumber: parseInt(logs[i].blockNumber, 16)
            });
          }
        } else {
          if (!parsed[marketID]) parsed[marketID] = [];
          parsed[marketID].push({
            type: logType,
            amount: abi.unfix(logData[0], "string"),
            numOutcomes: numOutcomes,
            blockNumber: parseInt(logs[i].blockNumber, 16)
          });
        }
      }
    }
    return parsed;
  },

  /***********
   * Getters *
   ***********/

  getFirstLogBlockNumber: function (logs) {
    return (!logs || !logs.length) ? 1 : logs[0].blockNumber;
  },

  getMarketCreationBlock: function (marketID, callback) {
    var self = this;
    if (!utils.is_function(callback)) {
      return this.getFirstLogBlockNumber(this.getLogs("marketCreated", {marketID: marketID}));
    }
    this.getLogs("marketCreated", {marketID: marketID}, function (err, logs) {
      // TODO change on next contract reupload to callback(err)
      if (err) console.warn("marketCreated log lookup for", marketID, "failed:", err);
      callback(null, self.getFirstLogBlockNumber(logs));
    });
  },

  getMarketPriceHistory: function (market, options, callback) {
    var self = this;
    if (!callback && utils.is_function(options)) {
      callback = options;
      options = null;
    }
    var params = clone(options || {});
    params.market = market;
    if (!params.fromBlock) {
      if (!utils.is_function(callback)) {
        params.fromBlock = this.getMarketCreationBlock(market);
        return this.getMarketPriceHistory(market, params);
      }
      this.getMarketCreationBlock(market, function (err, fromBlock) {
        params.fromBlock = fromBlock;
        self.getMarketPriceHistory(market, params, callback);
      });
    } else {
      var aux = {index: "outcome", mergedLogs: {}};
      if (!utils.is_function(callback)) {
        this.getLogs("log_fill_tx", params, aux);
        this.getLogs("log_short_fill_tx", params, aux);
        return aux.mergedLogs;
      }
      this.getLogs("log_fill_tx", params, aux, function (err) {
        if (err) return callback(err);
        self.getLogs("log_short_fill_tx", params, aux, function (err) {
          if (err) return callback(err);
          callback(null, aux.mergedLogs);
        });
      });
    }
  },

  sortByBlockNumber: function (a, b) {
    return a.blockNumber - b.blockNumber;
  },

  buildTopicsList: function (event, params) {
    var topics = [event.signature];
    var inputs = event.inputs;
    for (var i = 0, numInputs = inputs.length; i < numInputs; ++i) {
      if (inputs[i].indexed) {
        if (params[inputs[i].name]) {
          topics.push(abi.format_int256(params[inputs[i].name]));
        } else {
          topics.push(null);
        }
      }
    }
    return topics;
  },

  parametrizeFilter: function (event, params) {
    return {
      fromBlock: params.fromBlock || constants.GET_LOGS_DEFAULT_FROM_BLOCK,
      toBlock: params.toBlock || constants.GET_LOGS_DEFAULT_TO_BLOCK,
      address: this.contracts[event.contract],
      topics: this.buildTopicsList(event, params),
      timeout: constants.GET_LOGS_TIMEOUT
    };
  },

  // warning: mutates processedLogs
  insertIndexedLog: function (processedLogs, parsed, index, log) {
    if (index.constructor === Array) {
      if (index.length === 1) {
        if (!processedLogs[parsed[index[0]]]) {
          processedLogs[parsed[index[0]]] = [];
        }
        processedLogs[parsed[index[0]]].push(parsed);
      } else if (index.length === 2) {
        if (!processedLogs[parsed[index[0]]]) {
          processedLogs[parsed[index[0]]] = {};
        }
        if (!processedLogs[parsed[index[0]]][parsed[index[1]]]) {
          processedLogs[parsed[index[0]]][parsed[index[1]]] = [];
        }
        processedLogs[parsed[index[0]]][parsed[index[1]]].push(parsed);
      }
    } else {
      if (!processedLogs[parsed[index]]) processedLogs[parsed[index]] = [];
      processedLogs[parsed[index]].push(parsed);
    }
  },

  // warning: mutates processedLogs, if passed
  processLogs: function (label, index, logs, extraField, processedLogs) {
    var parsed;
    if (!processedLogs) processedLogs = (index) ? {} : [];
    for (var i = 0, numLogs = logs.length; i < numLogs; ++i) {
      if (!logs[i].removed) {
        parsed = this.filters.parse_event_message(label, logs[i]);
        if (extraField && extraField.name) {
          parsed[extraField.name] = extraField.value;
        }
        if (index) {
          this.insertIndexedLog(processedLogs, parsed, index, logs[i]);
        } else {
          processedLogs.push(parsed);
        }
      }
    }
    return processedLogs;
  },

  getFilteredLogs: function (label, filterParams, callback) {
    if (!callback && utils.is_function(filterParams)) {
      callback = filterParams;
      filterParams = null;
    }
    var filter = this.parametrizeFilter(this.api.events[label], filterParams || {});
    if (!utils.is_function(callback)) return this.rpc.getLogs(filter);
    this.rpc.getLogs(filter, function (logs) {
      if (logs && logs.error) return callback(logs, null);
      if (!logs || !logs.length) return callback(null, []);
      callback(null, logs);
    });
  },

  // aux: {index: str/arr, mergedLogs: {}, extraField: {name, value}}
  getLogs: function (label, filterParams, aux, callback) {
    var self = this;
    if (!utils.is_function(callback) && utils.is_function(aux)) {
      callback = aux;
      aux = null;
    }
    aux = aux || {};
    if (!utils.is_function(callback)) {
      return this.processLogs(
        label,
        aux.index,
        this.getFilteredLogs(label, filterParams || {}),
        aux.extraField,
        aux.mergedLogs
      );
    }
    this.getFilteredLogs(label, filterParams || {}, function (err, logs) {
      if (err) return callback(err);
      callback(null, self.processLogs(
        label,
        aux.index,
        logs,
        aux.extraField,
        aux.mergedLogs
      ));
    });
  },

  getAccountTrades: function (account, filterParams, callback) {
    var self = this;
    if (!callback && utils.is_function(filterParams)) {
      callback = filterParams;
      filterParams = null;
    }
    filterParams = filterParams || {};
    var takerTradesFilterParams = clone(filterParams);
    takerTradesFilterParams.sender = account;
    var aux = {
      index: ["market", "outcome"],
      mergedLogs: {},
      extraField: {name: "maker", value: false}
    };
    this.getLogs("log_fill_tx", takerTradesFilterParams, aux, function (err) {
      if (err) return callback(err);
      var makerTradesFilterParams = clone(filterParams);
      makerTradesFilterParams.owner = account;
      aux.extraField.value = true;
      self.getLogs("log_fill_tx", makerTradesFilterParams, aux, function (err) {
        if (err) return callback(err);
        var takerShortSellsFilterParams = clone(filterParams);
        takerShortSellsFilterParams.sender = account;
        aux.extraField.value = false;
        self.getLogs("log_short_fill_tx", takerShortSellsFilterParams, aux, function (err) {
          if (err) return callback(err);
          var makerShortSellsFilterParams = clone(filterParams);
          makerShortSellsFilterParams.owner = account;
          aux.extraField.value = true;
          self.getLogs("log_short_fill_tx", makerShortSellsFilterParams, aux, function (err) {
            if (err) return callback(err);
            if (filterParams.noCompleteSets) {
              callback(null, self.sortTradesByBlockNumber(aux.mergedLogs));
            } else {
              var completeSetsFilterParams = clone(filterParams);
              completeSetsFilterParams.shortAsk = false;
              completeSetsFilterParams.mergeInto = aux.mergedLogs;
              self.getParsedCompleteSetsLogs(account, completeSetsFilterParams, function (err, merged) {
                if (err) {
                  console.error("getAccountTrades:", err);
                  return callback(null, self.sortTradesByBlockNumber(aux.mergedLogs));
                }
                callback(null, self.sortTradesByBlockNumber(merged));
              });
            }
          });
        });
      });
    });
  },

  sortTradesByBlockNumber: function (trades) {
    var marketTrades, outcomeTrades, outcomeIDs, numOutcomes;
    var marketIDs = Object.keys(trades);
    var numMarkets = marketIDs.length;
    for (var i = 0; i < numMarkets; ++i) {
      marketTrades = trades[marketIDs[i]];
      outcomeIDs = Object.keys(marketTrades);
      numOutcomes = outcomeIDs.length;
      for (var j = 0; j < numOutcomes; ++j) {
        outcomeTrades = marketTrades[outcomeIDs[j]];
        outcomeTrades = outcomeTrades.sort(this.sortByBlockNumber);
      }
    }
    return trades;
  },

  /********************************
   * Raw log getters (deprecated) *
   ********************************/

  getShortSellLogs: function (account, options, callback) {
    if (!callback && utils.is_function(options)) {
      callback = options;
      options = null;
    }
    options = options || {};
    if (account !== undefined && account !== null) {
      var topics = [
        this.api.events.log_short_fill_tx.signature,
        options.market ? abi.format_int256(options.market) : null,
        null,
        null
      ];
      topics[options.maker ? 3 : 2] = abi.format_int256(account);
      var filter = {
        fromBlock: options.fromBlock || "0x1",
        toBlock: options.toBlock || "latest",
        address: this.contracts.Trade,
        topics: topics,
        timeout: constants.GET_LOGS_TIMEOUT
      };
      if (!utils.is_function(callback)) return this.rpc.getLogs(filter);
      this.rpc.getLogs(filter, function (logs) {
        if (logs && logs.error) return callback(logs, null);
        if (!logs || !logs.length) return callback(null, []);
        callback(null, logs);
      });
    }
  },

  getTakerShortSellLogs: function (account, filterParams, callback) {
    if (!callback && utils.is_function(filterParams)) {
      callback = filterParams;
      filterParams = null;
    }
    var aux = {
      index: ["market", "outcome"],
      extraField: {name: "maker", value: false}
    };
    var params = clone(filterParams || {});
    params.maker = false;
    return this.getShortSellLogs(account, params, callback);
  },

  getShortAskBuyCompleteSetsLogs: function (account, options, callback) {
    if (!callback && utils.is_function(options)) {
      callback = options;
      options = null;
    }
    var opt = options ? clone(options) : {};
    opt.shortAsk = true;
    opt.type = "buy";
    return this.getCompleteSetsLogs(account, opt, callback);
  },

  getCompleteSetsLogs: function (account, options, callback) {
    if (!callback && utils.is_function(options)) {
      callback = options;
      options = null;
    }
    options = options || {};
    if (account !== undefined && account !== null) {
      var typeCode = constants.LOG_TYPE_CODES[options.type] || null;
      var market = options.market ? abi.format_int256(options.market) : null;
      var filter = {
        fromBlock: options.fromBlock || "0x1",
        toBlock: options.toBlock || "latest",
        address: (options.shortAsk) ? this.contracts.BuyAndSellShares : this.contracts.CompleteSets,
        topics: [
          this.api.events.completeSets_logReturn.signature,
          abi.format_int256(account),
          market,
          typeCode
        ],
        timeout: constants.GET_LOGS_TIMEOUT
      };
      if (!utils.is_function(callback)) return this.rpc.getLogs(filter);
      this.rpc.getLogs(filter, function (logs) {
        if (logs && logs.error) return callback(logs, null);
        if (!logs || !logs.length) return callback(null, []);
        callback(null, logs);
      });
    }
  },

  getBuyCompleteSetsLogs: function (account, options, callback) {
    if (!callback && utils.is_function(options)) {
      callback = options;
      options = null;
    }
    var opt = options ? clone(options) : {};
    opt.shortAsk = false;
    opt.type = "buy";
    return this.getCompleteSetsLogs(account, opt, callback);
  },

  getSellCompleteSetsLogs: function (account, options, callback) {
    if (!callback && utils.is_function(options)) {
      callback = options;
      options = null;
    }
    var opt = options ? clone(options) : {};
    opt.shortAsk = false;
    opt.type = "sell";
    return this.getCompleteSetsLogs(account, opt, callback);
  }
};
