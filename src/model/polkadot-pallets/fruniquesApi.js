// import BasePolkadotApi from '~/services/basePolkadotApi'
const BasePolkadot = require('../basePolkadot')
class FruniquesApi extends BasePolkadot {
  constructor ({ polkadotApi, notify }) {
    super(polkadotApi, 'fruniques', notify)
  }
  /**
   * @name create_collection
   * @param {String} metadata The metadata of the collection
   * @returns
   */

  create_collection ({ user, metadata }, subTrigger) {
    return this.callTx('create_collection', user, [metadata], subTrigger)
  }

  /**
   * @name spawn
   * @param {u32} classId Collection ID used in the uniques pallet; represents a group of Uniques
   * @param {Tuple} subTrigger Contains information of the parent as (parentId, hierarchicalAttributes, percentageOfParent)
   * @param {Array} Attributes Array of attributes
   * @returns
   */
  spawn ({ user, classId, parentInfo, Attributes }, subTrigger) {
    return this.callTx('spawn', user, [classId, parentInfo, Attributes], subTrigger)
  }

  /**
   * @name set_attributes
   * @param {u64} collectionId Collection ID used in the uniques pallet; represents a group of Uniques
   * @param {u64} assetId Asset ID used in the uniques pallet; represents a single asset.
   * @param {Array} Attributes Array of attributes
   * @returns
   */
  set_attributes ({ user, classId, instanceId, attributes }, subTrigger) {
    return this.callTx('set_attributes', user, [classId, instanceId, attributes], subTrigger)
  }
}
module.exports = FruniquesApi
