"use strict"

//Credit to https://stackoverflow.com/a/2117523
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/***
 * Command is used to wrap data related to a command coming from Slack, or theoretically any other platform.
 *
 */
class Command {
  constructor(adapter, sourceId) {
    this.adapter  = adapter;
    this.sourceId = sourceId;
    this.uniqueId = this.sourceId; // alias, allows for interoperability with multiple legacy functions expecting different names for same data
    this.hash     = uuidv4();
  }
}

/**
 * Register is used to allow users to register a wallet against their unique ID for a particular platform
 */
class Register extends Command {
  constructor(adapter, sourceId, walletPublicKey){
    super(adapter, sourceId);
    this.walletPublicKey = walletPublicKey;
    this.type = "register";
  }
}

/**
 * Tip allows users to tip another user
 */
class Tip extends Command {
  constructor(adapter, sourceId, targetId, amount){
    super(adapter, sourceId);
    this.targetId = targetId;
    this.amount   = amount;
    this.type = "tip";
  }
}


/**
 * Withdraw allows users to take XLM out of the tipping bot and be delivered either to their default wallet
 * which was given previously to the Register command, or can also be given as a separate argument in the Withdraw command
 */
class Withdraw extends Command {
  constructor(adapter, sourceId, amount, address = null){
    super(adapter, sourceId);
    this.amount   = amount;
    this.address  = address;
    this.type = "withdraw";
  }
}


/**
 * Allows the user to check their balance, current wallet address
 */
class Balance extends Command {
  constructor(adapter, sourceId, address = null){
    super(adapter, sourceId);
    this.address = address;
    this.type = "balance";
  }
}

module.exports = { 
  Command,
  Register,
  Tip,
  Withdraw,
  Balance
}