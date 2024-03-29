// import BasePolkadotApi from '~/services/basePolkadotApi'
const BasePolkadot = require('../basePolkadot')
class FruniquesApi extends BasePolkadot {
  constructor ({ polkadotApi, notify }) {
    super(polkadotApi, 'fruniques', notify)
  }
  /**
   * @name create_collection
   * @param {String} metadata Title of the collection
   * @param {Function} subTrigger Function to trigger when subscription detect changes
   * @returns
   */

  create_collection ({ user, metadata }, subTrigger) {
    return this.callTx('create_collection', user, [metadata], subTrigger)
  }

  /**
   * @name spawn
   * @param {u32} classId Collection ID used in the uniques pallet; represents a group of Uniques
   * @param {Tuple} parentInfo Contains information of the parent as (parentId, hierarchicalAttributes, percentageOfParent)
   * @param {Array} attributes Array of attributes
   * @param {Function} subTrigger Function to trigger when subscription detect changes
   * @returns
   */
  spawn ({ user, classId, parentInfo, attributes }, subTrigger) {
    return this.callTx('spawn', user, [classId, parentInfo, attributes], subTrigger)
  }

  /**
   * @name set_attributes
   * @param {u64} collectionId Collection ID used in the uniques pallet; represents a group of Uniques
   * @param {u64} assetId Asset ID used in the uniques pallet; represents a single asset.
   * @param {Array} attributes Array of attributes
   * @param {Function} subTrigger Function to trigger when subscription detect changes
   * @returns
   */
  set_attributes ({ user, classId, instanceId, attributes }, subTrigger) {
    return this.callTx('set_attributes', user, [classId, instanceId, attributes], subTrigger)
  }

  async getAllFruniquesInfo ({ collectionId }, subTrigger) {
    const fruniquesInfo = await this.exEntriesQuery('fruniqueInfo', [collectionId], subTrigger)
    const fruniquesMap = this.mapEntries(fruniquesInfo)
    return fruniquesMap.map(frunique => {
      return {
        id: frunique.id,
        ...frunique.value
      }
    })
  }

  async getFruniqueInfoByClass ({ collectionId, classId }, subTrigger) {
    const fruniquesInfo = await this.exQuery('fruniqueInfo', [collectionId, classId], subTrigger)
    return fruniquesInfo.toHuman()
  }

  async isFruniqueVerified ({ collectionId, classId }, subTrigger) {
    const flag = await this.exQuery('fruniqueVerified', [collectionId, classId], subTrigger)
    return flag.toHuman()
  }
}
module.exports = FruniquesApi
