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

  get teamId() {
    return utils.slackTeamIdFromUniqueId(this.uniqueId);
  }

  get Account() {
    return AccountInstance.Singleton();
  }

  async getSourceAccount() {
    return await this.Account.getOrCreate(this.adapter, this.sourceId);
  }

  serialize() {
    return JSON.stringify({
      adapter : this.adapter,
      sourceId: this.sourceId,
      uniqueId: this.uniqueId,
      hash    : this.hash,
      type    : this.type
    });
  }

  /**
   *
   * @param serializedStr
   * @returns {Command}
   */
  static deserialize(serializedStr) {
    let serializedObj = JSON.parse(serializedStr);
    if(!serializedObj) {
      return null;
    }
    switch(serializedObj.type) {
      case "register":
        return new Register(serializedObj.adapter, serializedObj.sourceId, serializedObj.walletPublicKey, serializedObj.hash);
        break;
      case "tip":
        return new Tip(serializedObj.adapter, serializedObj.sourceId, serializedObj.targetId, serializedObj.amount, serializedObj.hash);
        break;
      case "withdraw":
        return new Withdraw(serializedObj.adapter, serializedObj.sourceId, serializedObj.amount, serializedObj.address, serializedObj.hash);
        break;
      case "balance":
        return new Balance(serializedObj.adapter, serializedObj.sourceId, serializedObj.address, serializedObj.hash);
        break;
      case "info":
        return new Info(serializedObj.adapter, serializedObj.sourceId, serializedObj.hash);
        break;
      case "tipdevelopers":
        return new TipDevelopers(serializedObj.adapter, serializedObj.sourceId, serializedObj.amount, serializedObj.hash);
        break;
      default:
        //We don't know what type the command is, so return a generic Command
        return new Command(serializedObj.adapter, serializedObj.sourceId, serializedObj.hash);
        break;
    }
  }
}

/**
 * TipDevelopers is used to tip the developers who created the bot :)
 */
class TipDevelopers extends Command {
  constructor(adapter, sourceId, amount, hash = null){
    super(adapter, sourceId, hash);
    this.amount = amount;
    this.type = "tipdevelopers";
    this.address = process.env.DEVELOPER_DONATION_WALLET
  }

  serialize() {
    let serialized = JSON.parse(super.serialize());
    serialized.amount = this.amount;
    return JSON.stringify(serialized);
  }
}

/**
 * Register is used to allow users to register a wallet against their unique ID for a particular platform
 */
class Register extends Command {
  constructor(adapter, sourceId, walletPublicKey, hash){
    super(adapter, sourceId, hash);
    this.walletPublicKey = walletPublicKey;
    this.type = "register";
  }

  serialize() {
    let serialized = JSON.parse(super.serialize());
    serialized.walletPublicKey = this.walletPublicKey;
    return JSON.stringify(serialized);
  }
}

/**
 * Tip allows users to tip another user
 */
class Tip extends Command {
  constructor(adapter, sourceId, targetId, amount, hash){
    super(adapter, sourceId, hash);
    this.targetId = targetId;
    this.amount   = amount;
    this.type = "tip";
  }

  serialize() {
    let serialized = JSON.parse(super.serialize());
    serialized.targetId = this.targetId;
    serialized.amount= this.amount;
    return JSON.stringify(serialized);
  }

}

/**
 * Withdraw allows users to take XLM out of the tipping bot and be delivered either to their default wallet
 * which was given previously via the Register command, or can also be given as an argument when the Withdraw command is made.
 *
 */
class Withdraw extends Command {
  constructor(adapter, sourceId, amount, address = null, hash = null){
    super(adapter, sourceId, hash);
    this.amount   = amount;
    this.address  = address;
    this.type = "withdraw";
  }

  serialize() {
    let serialized = JSON.parse(super.serialize());
    serialized.amount  = this.amount;
    serialized.address = this.address;
    return JSON.stringify(serialized);
  }

}


/**
 * Allows the user to check their balance, current wallet address
 */
class Balance extends Command {
  // TODO: Address here may be entirely unnecessary
  constructor(adapter, sourceId, address = null, hash = null){
    super(adapter, sourceId, hash);
    this.address = address;
    this.type = "balance";
  }

  serialize() {
    let serialized = JSON.parse(super.serialize());
    serialized.address = this.address;
    return JSON.stringify(serialized);
  }
}

/**
 * Allows the user to get info on the tipping bot, including developer info and the bot's wallet address
 */
class Info extends Command {
  constructor(adapter, sourceId, hash = null){
    super(adapter, sourceId, hash);
    this.type = "info";
  }

  serialize() {
    let serialized = JSON.parse(super.serialize());
    return JSON.stringify(serialized);
  }
}

module.exports = { 
  Command,
  Register,
  Tip,
  Withdraw,
  Balance,
  Info,
  TipDevelopers,
  Deserialize: Command.deserialize
}
