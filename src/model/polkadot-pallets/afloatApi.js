const BasePolkadot = require('../basePolkadot')
const BrowserIpfs = require('../../../Utils/BrowserIpfs')
const UniquesApi = require('../polkadot-pallets/uniquesApi')
const FruniquesApi = require('../polkadot-pallets/fruniquesApi')
class AfloatApi extends BasePolkadot {
  constructor ({ polkadotApi, projectId, secretId, IPFS_URL, notify }) {
    super(polkadotApi, 'fruniques', notify)
    this.fruniquesApi = new FruniquesApi({ polkadotApi, notify })
    this.uniquesApi = new UniquesApi({ polkadotApi, notify })

    this.BrowserIpfs = new BrowserIpfs(projectId, secretId, IPFS_URL)
    this.prefixIPFS = 'IPFS:'
  }

  /**
   * @description Set signer for external wallet
   * @param {String} signer Polkadot address
   */
  setSigner (signer) {
    this._signer = signer
  }
  /**
   * @name createCollection
   * @description Create a new collection
   * @param {Array} description Description of the collection
   * @returns {Object}
   */
  async createCollection ({ description }, subTriger) {
    // invoke the extrinsic method
    return this.fruniquesApi.callTx({
      extrinsicName: 'create_collection',
      signer: this._signer,
      params: [description]
    })
  }

  /**
   * @name createAsset
   * @description Create a new frunique/NFT asset
   * @param {u64} collectionId Collection ID used in the uniques pallet; represents a group of Uniques
   * @param {u64} assetId [optional] Asset ID used in the uniques pallet; represents a single asset. If not provided, the next available unique ID will be automatically selected.
   * @param {Object} uniquesPublicAttributes mapping of key/value pairs to be set in the public metadata in the uniques pallet
   * @param {Object} saveToIPFS payload and/or files to be saved to IPFS, and the resulting CIDs are added to the uniquesPublicMetadata, anchoring the data to the NFT.
   * @param {Object} cidFromHCD cid got from the ConfidentialDocs API [https://github.com/hashed-io/hashed-confidential-docs-client-api]
   * @param {Function} subTrigger Function to trigger when subscrsption detect changes
   * @returns {Object}
   */
  async createAsset ({ collectionId, uniquesPublicAttributes, saveToIPFS, cidFromHCD, ParentId, isHierarchical, percentage }, subTriger) {
    let attributes
    const parentInfo = isHierarchical ? (ParentId, isHierarchical, percentage) : null

    const hasProperties = Object.entries(uniquesPublicAttributes).length > 0
    if (hasProperties) {
      attributes = this.getPlainAttributes(uniquesPublicAttributes)
    }
    if (!attributes) { attributes = [] }

    // Save to IPFS
    const { data: dataToIPFS, files: filesToIPFS } = saveToIPFS || {}
    if (dataToIPFS || filesToIPFS) {
      const savedInIPFS = await this.saveToIPFS({ ...dataToIPFS, ...filesToIPFS }, this.prefixIPFS)
      attributes.push(...savedInIPFS)
    }

    // Encrypt save to IPFS
    const { data: dataToEncrypt, files: filesToEncrypt } = cidFromHCD || {}
    if (dataToEncrypt || filesToEncrypt) {
      const savedEncrypted = await this.getPlainAttributes({ ...dataToEncrypt, ...filesToEncrypt })
      attributes.push(...savedEncrypted)
    }

    // invoke the extrinsic method
    return this.fruniquesApi.callTx({
      extrinsicName: 'spawn',
      signer: this._signer,
      params: [collectionId, parentInfo, attributes]
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
    const assets = await this.uniquesApi.getAllAssets({ startKey, pageSize })
    // Get the data from services
    const newAssetFormat = []
    for (const asset of assets) {
      const { id, data, attributes } = asset
      let obj = {
        assetId: id,
        data
      }
      const publicAttributes = {}
      const encryptedData = {}
      const plaintextSaveToIPFS = {}
      for (const Attribute of attributes) {
        let { attribute, value } = Attribute
        const isIpfs = value.includes(this.prefixIPFS)
        if (isIpfs) {
          const splitted = value.split(this.prefixIPFS)
          let response
          const [cid] = splitted[1].split(':')
          if (cid !== 'undefined') {
            response = await this.BrowserIpfs.retrieve(splitted[1])
          }
          value = response
          plaintextSaveToIPFS[attribute] = value
        } else {
          publicAttributes[attribute] = value
        }
      }
      obj = { ...obj, publicAttributes, plaintextSaveToIPFS, encryptedData }
      newAssetFormat.push(obj)
    }
    return newAssetFormat
  }

  /**
   *
   * @param {Number} collectionId The id of the collection of the NFT
   * @param {Number} instanceId The id of the instance of the NFT
   * @returns {Object} Object with the data of the NFT [basic information and the attributes]
   */
  async getAsset ({ collectionId, instanceId = 0 }) {
    // Get the collection object
    const { info, attributes } = await this.uniquesApi.getAsset({ classId: collectionId, instanceId })
    const jsonExtension = 'json'
    // Get information from the IPFS service
    for (const attribute of attributes) {
      const { value } = attribute || {}
      if (value.includes(this.prefixIPFS)) {
        const splitted = value.split(':')
        const cid = splitted[1]
        const extension = splitted[2]
        console.log({ cid, extension, splitted })
        if (extension === jsonExtension) {
          const response = await this.getFromIPFS(cid + ':' + extension)
          attribute.value = response
        }
      }
    }
    return { ...info, attributes }
  }

  async getFromIPFS (cid) {
    let elementRetrieved
    if (cid) {
      elementRetrieved = await this.BrowserIpfs.retrieve(cid)
    }
    return elementRetrieved
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
    const attributesArray = []
    for (const [key, value] of Object.entries(attributes)) {
      attributesArray.push([key, value.toString()])
    }
    return attributesArray
  }

  async saveToIPFS (elements, prefix) {
    try {
      const attributes = []
      for await (const [key, value] of Object.entries(elements)) {
        const cid = await this.BrowserIpfs.store(value)
        const cidWithPrefix = prefix + cid
        if (!cid) {
          throw new Error('An error occurred while trying to store on IPFS')
        }
        attributes.push([key, cidWithPrefix])
      }
      return attributes
    } catch (error) {
      console.error('An error occured while trying to upload to IPFS: ', error || error.message)
    }
  }
}

module.exports = AfloatApi
