"use strict"
const utils = require('../../utils')
const AccountInstance = require('../../models/account')

/***
 * Command is used to wrap data related to a command coming from Slack, or theoretically any other platform.
 *
 */
class Command {
  constructor(adapter, sourceId, hash) {
    this.adapter  = adapter;
    this.sourceId = sourceId;
    this.uniqueId = this.sourceId; // alias, allows for interoperability with multiple legacy functions expecting different names for same data
    this.hash     = hash || utils.uuidv4();
    this.type     = "none";
  }

  get Account() {
    return AccountInstance.Singleton();
  }

  async getSourceAccount() {
    return await this.Account.getOrCreate(this.adapter, this.sourceId);
  }

  serialize() {
    return {
      adapter : this.adapter,
      sourceId: this.sourceId,
      uniqueId: this.uniqueId,
      hash    : this.hash,
      type    : this.type
    }
  }

  static deserialize(serialized) {
    switch(serialized.type) {
      case "register":
        return new Register(serialized.adapter, serialized.sourceId, serialized.walletPublicKey);
        break;
      case "tip":
        return new Tip(serialized.adapter, serialized.sourceId, serialized.targetId, serialized.amount);
        break;
      case "withdraw":
        return new Withdraw(serialized.adapter, serialized.sourceId, serialized.amount, serialized.address);
        break;
      case "balance":
        return new Balance(serialized.adapter, serialized.sourceId, serialized.address);
        break;
      default:
        //We don't know what type the command is, so return the generic super class
        return new Command(serialized.adapter, serialized.sourceId, serialized.hash);
        break;
    }
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

  serialize() {
    let serialized = super.serialize();
    serialized.walletPublicKey = this.walletPublicKey;
    return serialized;
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

  serialize() {
    let serialized = super.serialize();
    serialized.targetId = this.targetId;
    serialized.amount= this.amount;
    return serialized;
  }

}

/**
 * Withdraw allows users to take XLM out of the tipping bot and be delivered either to their default wallet
 * which was given previously via the Register command, or can also be given as an argument when the Withdraw command is made.
 *
 */
class Withdraw extends Command {
  constructor(adapter, sourceId, amount, address = null){
    super(adapter, sourceId);
    this.amount   = amount;
    this.address  = address;
    this.type = "withdraw";
  }

  serialize() {
    let serialized = super.serialize();
    serialized.amount  = this.amount;
    serialized.address = this.address;
    return serialized;
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

  serialize() {
    let serialized = super.serialize();
    serialized.address = this.address;
    return serialized;
  }
}

module.exports = { 
  Command,
  Register,
  Tip,
  Withdraw,
  Balance,
  Deserialize: Command.deserialize
}
