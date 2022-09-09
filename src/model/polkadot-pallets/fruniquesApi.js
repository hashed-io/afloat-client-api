// import BasePolkadotApi from '~/services/basePolkadotApi'
const BasePolkadot = require('../basePolkadot')
class FruniquesApi extends BasePolkadot {
  constructor ({ polkadotApi, notify }) {
    super(polkadotApi, 'fruniques', notify)
  }

  createWithAttributes ({ user, classId, instanceId, numericValue, admin, attributes }, subTrigger) {
    return this.callTx('createWithAttributes', user, [classId, instanceId, numericValue, admin, attributes], subTrigger)
  }
}
module.exports = FruniquesApi
