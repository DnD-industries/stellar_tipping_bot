const assert = require('assert')
const sinon = require('sinon')


describe('models / account', async () => {

  let Model;
  let account;

  beforeEach(async () => {
    const config = await require('./setup')()
    Model = config.models.account
    account = await Model.createAsync({
      adapter: 'testing',
      uniqueId: 'foo',
      balance: '1.0000000'
    })
  })

  describe('getOrCreate', () => {
    it ('should only create a new account if it does not already exist', async () => {
      const sameAccount = await Model.getOrCreate('testing', 'foo')
      assert.equal(account._id, sameAccount._id)

      const otherAccount = await Model.getOrCreate('testing', 'bar', {
        balance: '5.0000000'
      })
      assert.equal(otherAccount.adapter, 'testing')
      assert.equal(otherAccount.uniqueId, 'bar')
      assert.equal(otherAccount.balance, '5.0000000')
    })

    it('should call "new account" callback, passing in unique ID, if-and-only-if a new account was created', async () => {

      let callback = sinon.spy(function(){})

      const uniqueID = 'newUserUniqueId'

      const oldAccount = await Model.getOrCreate('testing', 'foo', null, callback)

      const newAccount= await Model.getOrCreate('testing', uniqueID, {
        balance: '5.0000000'
      }, callback)

      assert.equal(true, callback.calledWith(uniqueID))
      assert.equal(true, callback.calledOnce)
    })
  })

  describe('canPay', () => {
    it ('should return true if balance is gte', () => {
      assert.ok(account.canPay('1'))
      assert.ok(account.canPay('0.65'))
    })

    it ('should return false if balance is lte', () => {
      assert.ok(!account.canPay('2'))
    })
  })
})
