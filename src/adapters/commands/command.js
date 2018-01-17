"use strict"

//Credit to https://stackoverflow.com/a/2117523
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

class Command {
  constructor(adapter, sourceId) {
    this.adapter  = adapter;
    this.sourceId = sourceId;
    this.hash     = uuidv4();
  }
}

class Register extends Command {
  constructor(adapter, sourceId, walletPublicKey){
    super(adapter, sourceId);
    //TODO: Validate that the public key is valid?
    this.walletPublicKey = walletPublicKey;
  }
}

class Tip extends Command {
  constructor(adapter, sourceId, targetId, amount){
    super(adapter, sourceId);
    this.targetId = targetId;
    this.amount   = amount;
  }
}

class Withdraw extends Command {
  constructor(adapter, sourceId, amount, address = null){
    super(adapter, sourceId);
    this.amount   = amount;
    this.address  = address;
  }
}

module.exports = { 
  Command,
  Register,
  Tip,
  Withdraw
}