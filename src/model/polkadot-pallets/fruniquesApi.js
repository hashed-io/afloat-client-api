// import BasePolkadotApi from '~/services/basePolkadotApi'
const BasePolkadot = require('../basePolkadot')
class FruniquesApi extends BasePolkadot {
  constructor ({ polkadotApi, notify }) {
    super(polkadotApi, 'fruniques', notify)
  }
  /**
   * @name create_collection
   * @param {*} param0
   * @returns
   */

  create_collection({ user, metadata }, subTrigger) {
    return this.callTx('create_collection', user, [metadata], subTrigger)
  }

  spawn({ user, classId, parentInfo, Attributes }, subTrigger) {
    return this.callTx('spawn', user, [classId, parentInfo, Attributes], subTrigger)
  }

  set_attributes({ user, classId, instanceId, attributes }, subTrigger) {
    return this.callTx('set_attributes', user, [classId, instanceId, attributes], subTrigger)
  }

  createWithAttributes ({ user, classId, instanceId, numericValue, admin, attributes }, subTrigger) {
    return this.callTx('createWithAttributes', user, [classId, instanceId, numericValue, admin, attributes], subTrigger)
  }
}
module.exports = FruniquesApi
