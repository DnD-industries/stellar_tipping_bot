const assert = require('assert');
const command = require('../src/adapters/commands/command');

describe('adapter-commands', () => {
  it("should create a command object", () => {
    let adapter   = "slack";
    let sourceId  = "U12345678";
    let newCommand = new command.Command(adapter, sourceId);
    assert.equal(newCommand.adapter, adapter);
    assert.equal(newCommand.sourceId, sourceId);
    assert.equal(newCommand.hash.length, 36);
  });

  it("should create a register command object", () => {
    let adapter   = "slack";
    let sourceId  = "U12345678";
    let walletPublicKey = "GARNGTOB55RTPO4TCUKW6S7JNNEEOJJOKR2HBWUMFNCYXUCBDJUSVZUW";
    let newCommand = new command.Register(adapter, sourceId, walletPublicKey);
    assert.equal(newCommand.adapter, adapter);
    assert.equal(newCommand.sourceId, sourceId);
    assert.equal(newCommand.hash.length, 36);
    assert.equal(newCommand.walletPublicKey, walletPublicKey);
  });

  it("should create a tip command object", () => {
    let adapter   = "slack";
    let sourceId  = "U12345678";
    let targetId  = "myPublicKey123456789";
    let amount    = 13.37;
    let newCommand = new command.Tip(adapter, sourceId, targetId, amount);
    assert.equal(newCommand.adapter, adapter);
    assert.equal(newCommand.sourceId, sourceId);
    assert.equal(newCommand.hash.length, 36);
    assert.equal(newCommand.amount, amount);
  });

  it("should create a withdraw command object with null withdrawal address", () => {
    let adapter   = "slack";
    let sourceId  = "U12345678";
    let amount    = 13.37;
    let newCommand = new command.Withdraw(adapter, sourceId, amount);
    assert.equal(newCommand.adapter, adapter);
    assert.equal(newCommand.sourceId, sourceId);
    assert.equal(newCommand.hash.length, 36);
    assert.equal(newCommand.address, null);
  });

  it("should create a withdraw command object with a non-empty withdrawal address", () => {
    let adapter   = "slack";
    let sourceId  = "U12345678";
    let amount    = 13.37;
    let address   = "GCO2IP3MJNUOKS4PUDI4C7LGGMQDJGXG3COYX3WSB4HHNAHKYV5YL3VC";
    let newCommand = new command.Withdraw(adapter, sourceId, amount, address);
    assert.equal(newCommand.adapter, adapter);
    assert.equal(newCommand.sourceId, sourceId);
    assert.equal(newCommand.hash.length, 36);
    assert.equal(newCommand.address, address);
  });
})
