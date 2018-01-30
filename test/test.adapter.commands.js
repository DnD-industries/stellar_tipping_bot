const assert = require('assert');
const Command = require('../src/adapters/commands/command');

describe('Command', () => {

  const adapter = 'testAdapter111'
  const sourceId = 'theSourceId'
  const uniqueId = 'uniqueId'
  const hash = 'hash'
  const address = 'address'
  const walletPublicKey = 'walletPubKey'
  const targetId = 'targetId'

  let serializedCommand;

  beforeEach(() => {
    serializedCommand = {
      adapter,
      sourceId,
      uniqueId,
      hash,
      address,
      walletPublicKey,
      targetId,
    }
  });

  describe('constructors ', () => {
    it("should create a command object", () => {
      let adapter = "slack";
      let sourceId = "U12345678";
      let newCommand = new Command.Command(adapter, sourceId);
      assert.equal(newCommand.adapter, adapter);
      assert.equal(newCommand.sourceId, sourceId);
      assert.equal(newCommand.hash.length, 36);
    });

    it("should create a register command object", () => {
      let adapter = "slack";
      let sourceId = "U12345678";
      let walletPublicKey = "GARNGTOB55RTPO4TCUKW6S7JNNEEOJJOKR2HBWUMFNCYXUCBDJUSVZUW";
      let newCommand = new Command.Register(adapter, sourceId, walletPublicKey);
      assert.equal(newCommand.adapter, adapter);
      assert.equal(newCommand.sourceId, sourceId);
      assert.equal(newCommand.hash.length, 36);
      assert.equal(newCommand.walletPublicKey, walletPublicKey);
    });

    it("should create a tip command object", () => {
      let adapter = "slack";
      let sourceId = "U12345678";
      let targetId = "myPublicKey123456789";
      let amount = 13.37;
      let newCommand = new Command.Tip(adapter, sourceId, targetId, amount);
      assert.equal(newCommand.adapter, adapter);
      assert.equal(newCommand.sourceId, sourceId);
      assert.equal(newCommand.hash.length, 36);
      assert.equal(newCommand.amount, amount);
    });

    it("should create a withdraw command object with null withdrawal address", () => {
      let adapter = "slack";
      let sourceId = "U12345678";
      let amount = 13.37;
      let newCommand = new Command.Withdraw(adapter, sourceId, amount);
      assert.equal(newCommand.adapter, adapter);
      assert.equal(newCommand.sourceId, sourceId);
      assert.equal(newCommand.hash.length, 36);
      assert.equal(newCommand.address, null);
    });

    it("should create a withdraw command object with a non-empty withdrawal address", () => {
      let adapter = "slack";
      let sourceId = "U12345678";
      let amount = 13.37;
      let address = "GCO2IP3MJNUOKS4PUDI4C7LGGMQDJGXG3COYX3WSB4HHNAHKYV5YL3VC";
      let newCommand = new Command.Withdraw(adapter, sourceId, amount, address);
      assert.equal(newCommand.adapter, adapter);
      assert.equal(newCommand.sourceId, sourceId);
      assert.equal(newCommand.hash.length, 36);
      assert.equal(newCommand.address, address);
    });
  })

  describe('deserialization', () => {

    it('should create a new Command object with correct base characteristics, regardless of the type', () => {
      serializedCommand.type = 'unknown';
      let command = Command.Deserialize(serializedCommand);
      assert(command instanceof Command.Command, "Command should be an instance of the type Command");
      assert.equal(command.adapter, serializedCommand.adapter);
      assert.equal(command.sourceId, serializedCommand.sourceId);
      assert.equal(command.hash, serializedCommand.hash);
    })

    it('should create Register objects if the serialized type is `register`', () => {
      serializedCommand.type = 'register';
      let command = Command.Deserialize(serializedCommand);
      assert(command instanceof Command.Register, "Command should be an instance of the type Register");
      assert.equal(command.walletPublicKey, serializedCommand.walletPublicKey);
      assert.equal(command.type, serializedCommand.type);
    })

    it('should create Withdraw objects if the serialized type is `withdraw`', () => {
      serializedCommand.type = 'withdraw';
      let command = Command.Deserialize(serializedCommand);
      assert(command instanceof Command.Withdraw, "Command should be an instance of the type Register");
      assert.equal(command.amount, serializedCommand.amount);
      assert.equal(command.address, serializedCommand.address);
      assert.equal(command.type, serializedCommand.type);
    })

    it('should create Tip objects if the serialized type is `tip`', () => {
      serializedCommand.type = 'tip';
      let command = Command.Deserialize(serializedCommand);
      assert(command instanceof Command.Tip, "Command should be an instance of the type Register");
      assert.equal(command.targetId, serializedCommand.targetId);
      assert.equal(command.amount, serializedCommand.amount);
      assert.equal(command.type, serializedCommand.type);
    })

    it('should create Balance objects if the serialized type is `balance`', () => {
      serializedCommand.type = 'balance';
      let command = Command.Deserialize(serializedCommand);
      assert(command instanceof Command.Balance, "Command should be an instance of the type Register");
      assert.equal(command.address, serializedCommand.address);
      assert.equal(command.type, serializedCommand.type);
    })
  })

  describe('serialization', () => {

    it('should correctly derive a serialized Register from an instance of a Register Command', () => {
      let cmd = new Command.Register('testing', 'someUserId', 'walletAddr');
      let serialized = cmd.serialize();

      assert.equal(serialized.uniqueId, cmd.uniqueId);
      assert.equal(serialized.sourceId, cmd.sourceId);
      assert.equal(serialized.adapter, cmd.adapter);
      assert.equal(serialized.hash, cmd.hash);
      assert.equal(serialized.type, cmd.type);
      assert.equal(serialized.walletPublicKey, cmd.walletPublicKey);
    })

    it('should correctly derive a serialized Tip from an instance of a Tip Command', () => {
      let cmd = new Command.Tip('testing', 'someUserId', targetId, walletPublicKey);
      let serialized = cmd.serialize();

      assert.equal(serialized.uniqueId, cmd.uniqueId);
      assert.equal(serialized.sourceId, cmd.sourceId);
      assert.equal(serialized.adapter, cmd.adapter);
      assert.equal(serialized.hash, cmd.hash);
      assert.equal(serialized.type, cmd.type);
      assert.equal(serialized.walletPublicKey, cmd.walletPublicKey);
    })

    it('should correctly derive a serialized Withdraw from an instance of a Withdraw Command', () => {
      let cmd = new Command.Withdraw('testing', 'someUserId', 'amount', 'address');
      let serialized = cmd.serialize();

      assert.equal(serialized.uniqueId, cmd.uniqueId);
      assert.equal(serialized.sourceId, cmd.sourceId);
      assert.equal(serialized.adapter, cmd.adapter);
      assert.equal(serialized.hash, cmd.hash);
      assert.equal(serialized.type, cmd.type);
      assert.equal(serialized.amount, cmd.amount);
      assert.equal(serialized.address, cmd.address);
    })

    it('should correctly derive a serialized Balance from an instance of a Balance Command', () => {
      let cmd = new Command.Balance('testing', 'someUserId', 'address');
      let serialized = cmd.serialize();

      assert.equal(serialized.uniqueId, cmd.uniqueId);
      assert.equal(serialized.sourceId, cmd.sourceId);
      assert.equal(serialized.adapter, cmd.adapter);
      assert.equal(serialized.hash, cmd.hash);
      assert.equal(serialized.type, cmd.type);
      assert.equal(serialized.address, cmd.address);
    })
  })
})
