const assert  = require('assert')
const Slack   = require('../src/adapters/slack/slack-adapter')
const Command = require('../src/adapters/commands/command')
const sinon   = require('sinon')
const Utils   = require('../src/utils')
const Q       = require('../src/adapters/slack/slack-command-queue')

describe('slack-command-queue', async () => {

  let CommandQueue;
  let slackAdapter;
  let accountWithWallet;
  let accountWithoutWallet;

  beforeEach(async () => {
    const config = await require('./setup')()
    config.stellar = {
      createTransaction : function() {},
      send : function() {}
    }
    slackAdapter = new Slack(config);
    Account = config.models.account;

    accountWithWallet = await Account.createAsync({
      adapter: 'testing',
      uniqueId: 'team.foo',
      balance: '1.0000000',
      walletAddress: 'GDTWLOWE34LFHN4Z3LCF2EGAMWK6IHVAFO65YYRX5TMTER4MHUJIWQKB'
    });

    accountWithoutWallet = await Account.createAsync({
      adapter: 'testing',
      uniqueId: 'team.bar',
      balance: '1.0000000'
    })

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

  // describe('enqueue', () => {
  //   it('should serialize the command and push it to the redis queue', async () => {
  //     let cmd = new Command.Register('testing', 'someUserId', 'walletAddr');
  //     // mock it
  //     cmd.serialize = () => { return 'serialized'; }
  //     CommandQueue.enqueue(cmd);
  //     assert(CommandQueue._push.calledWith(cmd.serialize()))
  //   })
  // })
})
