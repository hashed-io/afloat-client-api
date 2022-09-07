const BasePolkadot = require('../basePolkadot')
const BrowserIpfs = require('../Utils/BrowserIpfs')
class AfloatApi extends BasePolkadot {
  constructor (polkadotApi, notify, hcd, projectId, secretId) {
    super(polkadotApi, 'afloatApi', notify)
    this.hcd = hcd
    // this.fruniques = fruniques
    // this.uniques = uniques
    this.BrowserIpfs = new BrowserIpfs(projectId, secretId)
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
    // const collectionID = collectionId || this.getLastClassId()
    // const assetID = assetId || 0

    const attributes = []
    const uniquesPublic = this.getPlainAttributes(uniquesPublicAttributes)
    attributes.push(uniquesPublic)

    // Save to IPFS
    const { data: dataToIPFS, files: filesToIPFS } = plaintextSaveToIPFS
    if (dataToIPFS || filesToIPFS) {
      const savedInIPFS = this.saveToIPFS({ ...dataToIPFS, ...filesToIPFS })
      console.log(savedInIPFS)
    }

    // Encrypt save to IPFS
    const { data: dataToEncrypt, files: filesToEncrypt } = encryptoThenSaveToIPFS
    if (dataToEncrypt || filesToEncrypt) {
      const savedEncrypted = this.saveToHCD({ ...dataToEncrypt, ...filesToEncrypt })
      console.log(savedEncrypted)
    }
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

  getPlainAttributes (attributes, isSavedInIPFS) {
    const attributesFormatted = []
    for (const [key, value] of Object.entries(attributes)) {
      attributesFormatted.push([key, value.toString()])
    }
    return attributesFormatted
  }

  async saveToIPFS (elements) {
    try {
      const attributes = []
      for (const [key, value] of Object.entries(elements)) {
        const prefix = 'IPFS:'
        const cid = await this.BrowserIpfs.store(value)
        const cidWithPrefix = prefix + cid
        attributes.push(key, cidWithPrefix)
      }
      return attributes
    } catch (error) {
      throw new Error('Error saving to IPFS: ' + error.message)
    }
  }
}

module.exports = AfloatApi
