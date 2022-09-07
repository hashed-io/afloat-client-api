const BasePolkadot = require('../basePolkadot')
const BrowserIpfs = require('../../../Utils/BrowserIpfs')
class AfloatApi extends BasePolkadot {
  constructor (polkadotApi, notify, hcd, projectId, secretId) {
    super(polkadotApi, 'afloatApi', notify)
    this.hcd = hcd
    // this.fruniques = fruniques
    // this.uniques = uniques
    this.BrowserIpfs = new BrowserIpfs(projectId, secretId)
    this.prefixIPFS = 'IPFS:'
    this.prefixHCD = 'HCD:'
  }

  /**
   * @name createAsset
   * @description Create a new frunique/NFT asset
   * @param {u64} collectionId Collection ID used in the uniques pallet; represents a group of Uniques
   * @param {u64} assetId [optional] Asset ID used in the uniques pallet; represents a single asset. If not provided, the next available unique ID will be automatically selected.
   * @param {Object} uniquesPublicAttributes mapping of key/value pairs to be set in the public metadata in the uniques pallet
   * @param {Object} plaintextSaveToIPFS payload and/or files to be saved to IPFS, and the resulting CIDs are added to the uniquesPublicMetadata, anchoring the data to the NFT.
   * @param {Object} encryptThenSaveToIPFS payload and/or files to be saved encrypted, saved to IPFS, and the resulting CIDs are added to the uniquesPublicMetadata, anchoring the data to the NFT.
   * @param {Function} subTrigger Function to trigger when subscrsption detect changes
   * @returns {Object}
   */
  async createAsset ({ collectionId, assetId, uniquesPublicAttributes, plaintextSaveToIPFS, encryptoThenSaveToIPFS }, subTriger) {
    let attributes
    const collectionID = collectionId || this.getLastClassId()
    const assetID = assetId || 0
    console.log({ collectionID, assetID })
    const hasProperties = Object.entries(uniquesPublicAttributes).length > 0
    if (hasProperties) {
      attributes = this.getPlainAttributes(uniquesPublicAttributes)
    }

    // Save to IPFS
    const { data: dataToIPFS, files: filesToIPFS } = plaintextSaveToIPFS
    if (dataToIPFS || filesToIPFS) {
      const savedInIPFS = await this.saveToIPFS({ ...dataToIPFS, ...filesToIPFS }, this.prefixIPFS)
      attributes.push(...savedInIPFS)
    }

    // Encrypt save to IPFS
    const { data: dataToEncrypt, files: filesToEncrypt } = encryptoThenSaveToIPFS
    if (dataToEncrypt || filesToEncrypt) {
      const savedEncrypted = await this.saveToHCD({ ...dataToEncrypt, ...filesToEncrypt }, this.prefixHCD)
      attributes.push(...savedEncrypted)
    }

    console.log('Attributes to send', attributes)
    // invoke the extrinsic method
  }

  /**
   * @name getAllAssetsInCollection
   * @description Get all assets in collection
   * @param {u64} collectionId Collection ID used in the uniques pallet; represents a group of Uniques
   * @param {u64} startKey Asset ID, index, or key to start the query
   * @param {int} pageSize maximum number of assets to retrieve per request
   * @param {Function} subTrigger Function to trigger when subscription detect changes
   * @returns {Object}
   */
  async getAllAssetsInCollection ({ collectionId, startKey, pageSize }, subTrigger) {

  }

  // Helper functions
  async getLastClassId () {
    let classesIds = await this.exEntriesQuery('class', [])
    classesIds = this.mapEntries(classesIds)
    const mapClasses = classesIds.map(v => {
      return parseInt(v.id)
    })
    const lastClassId = mapClasses.length > 0 ? Math.max(...mapClasses) : -1
    return lastClassId
  }

  getPlainAttributes (attributes) {
    console.log(attributes)
    const attributesArray = []
    for (const [key, value] of Object.entries(attributes)) {
      attributesArray.push([key, value.toString()])
    }
    return attributesArray
  }

  async saveToIPFS (elements, prefix) {
    console.log('elements IPFS', elements)
    try {
      const attributes = []
      for (const [key, value] of Object.entries(elements)) {
        // const cid = await this.BrowserIpfs.store(value)
        const cid = '/cid/' + value
        const cidWithPrefix = prefix + cid
        attributes.push([key, cidWithPrefix])
      }
      return attributes
    } catch (error) {
      throw new Error('Error saving to IPFS: ' + error.message)
    }
  }

  async saveToHCD (elements, prefix) {
    try {
      const attributes = []
      for (const [key, value] of Object.entries(elements)) {
        // const cid = await this.BrowserIpfs.store(value)
        const cid = '/HCD/' + value
        const cidWithPrefix = prefix + cid
        attributes.push([key, cidWithPrefix])
      }
      return attributes
    } catch (error) {
      throw new Error('Error saving to HCD: ' + error.message)
    }
  }
}

module.exports = AfloatApi
