"use strict"
const utils = require('../../utils')

class Command {
  constructor(adapter, sourceId) {
    this.adapter  = adapter;
    this.sourceId = sourceId;
    this.uniqueId = this.sourceId; // alias, allows for interoperability with multiple legacy functions expecting different names for same data
    this.hash     = utils.uuidv4();
  }
}

class Register extends Command {
  constructor(adapter, sourceId, walletPublicKey){
    super(adapter, sourceId);
    this.walletPublicKey = walletPublicKey;
    this.type = "register";
  }
}

class Tip extends Command {
  constructor(adapter, sourceId, targetId, amount){
    super(adapter, sourceId);
    this.targetId = targetId;
    this.amount   = amount;
    this.type = "tip";
  }
}

class Withdraw extends Command {
  constructor(adapter, sourceId, amount, address = null){
    super(adapter, sourceId);
    this.amount   = amount;
    this.address  = address;
    this.type = "withdraw";
  }
}

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