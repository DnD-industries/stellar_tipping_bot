const assert  = require('assert')
const Slack   = require('../src/adapters/slack/slack-adapter')
const Command = require('../src/adapters/commands/command')
const sinon   = require('sinon')
const Utils   = require('../src/utils')
const Q       = require('../src/adapters/slack/slack-command-queue')

describe('slack-command-queue', async () => {

  let CommandQueue;
  let slackAdapter;

  beforeEach(async () => {
    const config = await require('./setup')()
    config.stellar = {
      createTransaction : function() {},
      send : function() {}
    }
    slackAdapter = new Slack(config);
    Account = config.models.account;


    mockRedis = {
      rpush : () => {},
      lpop  : () => {}
    }
    CommandQueue = new Q(mockRedis);
    CommandQueue._push = sinon.spy();
  });

  describe('pushCommand', () => {
    it('should serialize the command and push it to the redis queue', async () => {
      let cmd = new Command.Register('testing', 'someUserId', 'walletAddr');
      // mock it
      cmd.serialize = () => { return 'serialized'; }
      CommandQueue.pushCommand(cmd);
      assert(CommandQueue._push.calledWith(cmd.serialize()))
    })
  })

  describe('popCommand', () => {
    it('should pop a serialized version of a Command and return a deserialized version of the same data', async () => {
      const adapter = 'testAdapter111'
      const sourceId = 'theSourceId'
      const hash = 'hash'
      const address = 'address'
      const type = 'balance'

      let serializedCommand = {
        adapter,
        sourceId,
        hash,
        address,
        type
      }

      CommandQueue._pop = () => {
        return JSON.stringify(serializedCommand);
      }

      let command = await CommandQueue.popCommand();
      assert.equal(command.adapter, adapter);
      assert.equal(command.sourceId, sourceId);
      assert.equal(command.uniqueId, sourceId);
      assert.equal(command.hash, hash);
      assert.equal(command.address, address);
      assert.equal(command.type, type);
    })
  })
})
