const BasePolkadot = require('../basePolkadot')
const BrowserIpfs = require('../../../Utils/BrowserIpfs')
const UniquesApi = require('../polkadot-pallets/uniquesApi')
const FruniquesApi = require('../polkadot-pallets/fruniquesApi')
class AfloatApi extends BasePolkadot {
  constructor ({ projectId, secretId, IPFS_URL, notify, hcd }) {
    console.log('construct', projectId, secretId, IPFS_URL, notify, hcd)
    const polkadotApi = hcd.getPolkadotApi()
    super(polkadotApi, 'fruniques', notify)
    this.hcd = hcd
    this.fruniquesApi = new FruniquesApi({ polkadotApi })
    this.uniquesApi = new UniquesApi({ polkadotApi })

    this.BrowserIpfs = new BrowserIpfs(projectId, secretId, IPFS_URL)
    this.prefixIPFS = 'IPFS:'
    this.prefixHCD = 'HCD:'
  }

  /**
   * @description Set signer for external wallet
   * @param {String} signer Polkadot address
   */
  setSigner (signer) {
    this._signer = signer
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
    const collectionID = collectionId || await this.getLastClassId()
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
    return this.fruniquesApi.callTx({
      extrinsicName: 'createWithAttributes',
      signer: this._signer,
      params: attributes
    })
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
    // Get all assets
    const assets = await this.uniquesApi.getAllAssets()
    // Get the
    return assets
  }

  // Helper functions
  async getLastClassId () {
    let classesIds = await this.uniquesApi.exEntriesQuery('class', [])
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
    try {
      const attributes = []
      for (const [key, value] of Object.entries(elements)) {
        const cid = await this.BrowserIpfs.store(value)
        const cidWithPrefix = prefix + cid
        attributes.push([key, cidWithPrefix])
      }
      return attributes
    } catch (error) {
      console.error('An error occured while trying to upload to IPFS: ', error || error.message)
    }
  }

  async saveToHCD (elements, prefix) {
    try {
      const attributes = []
      console.log({ hcd: this.hcd, elements })
      for await (const [key, value] of Object.entries(elements)) {
        const cid = await this.hcd.addOwnedData({ name: key, description: key, payload: value }).cid
        // const cid = '/HCD/' + value
        console.log('CID HCD: ', cid)
        const cidWithPrefix = prefix + cid
        attributes.push([key, cidWithPrefix])
      }
      return attributes
    } catch (error) {
      throw new Error('Error saving to HCD: ' + error || error.message)
    }
  }
}

module.exports = AfloatApi
