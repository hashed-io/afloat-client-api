const BasePolkadot = require('../basePolkadot')
const BrowserIpfs = require('../../../Utils/BrowserIpfs')
const UniquesApi = require('../polkadot-pallets/uniquesApi')
const FruniquesApi = require('../polkadot-pallets/fruniquesApi')
const GatedMarketplaceApi = require('../polkadot-pallets/gatedMarketplaceApi')
class AfloatApi extends BasePolkadot {
  constructor ({ polkadotApi, projectId, secretId, IPFS_URL, notify }) {
    super(polkadotApi, 'fruniques', notify)
    this.fruniquesApi = new FruniquesApi({ polkadotApi, notify })
    this.uniquesApi = new UniquesApi({ polkadotApi, notify })
    this.gatedMarketplaceApi = new GatedMarketplaceApi({ polkadotApi, notify })

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
  async createCollection ({ description }, subTrigger) {
    // invoke the extrinsic method
    return this.fruniquesApi.callTx({
      extrinsicName: 'createCollection',
      signer: this._signer,
      params: [description]
    })
  }

  /**
   * @name createAsset
   * @description Create a new frunique/NFT asset
   * @param {u64} collectionId Collection ID used in the uniques pallet; represents a group of Uniques
   * @param {Object} uniquesPublicAttributes mapping of key/value pairs to be set in the public metadata in the uniques pallet
   * @param {Object} saveToIPFS payload and/or files to be saved to IPFS, and the resulting CIDs are added to the uniquesPublicMetadata, anchoring the data to the NFT.
   * @param {Object} cidFromHCD cid got from the ConfidentialDocs API [https://github.com/hashed-io/hashed-confidential-docs-client-api]
   * @param {u64} parentId Asset ID used in the uniques pallet; represents a single asset.
   * @param {bool} isHierarchical Whether the asset is hierarchical or not
   * @param {u8} percentage The percentage of the amount it gets from the parent asset
   * @param {Function} subTrigger Function to trigger when subscription detect changes
   * @returns {Object}
   */
  async createAsset ({ collectionId, uniquesPublicAttributes, saveToIPFS, cidFromHCD, parentId, isHierarchical, percentage, metadata }, subTrigger) {
    let attributes
    const parentInfo = isHierarchical ? [parentId, isHierarchical, percentage] : null

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
      params: [collectionId, parentInfo, metadata, attributes]
    })
  }

  /**
   * @name getInstancesFromCollection
   * @param {String} collectionId The id of the collection
   * @returns {Array} Array of object
   */
  async getInstancesFromCollection ({ collectionId }) {
    const assets = await this.uniquesApi.exEntriesQuery('asset', [collectionId])
    const assetsMap = this.mapEntries(assets)
    const assetMetadata = await this.uniquesApi.exEntriesQuery('instanceMetadataOf', [collectionId])
    const metadataMap = this.mapEntries(assetMetadata)
    const metadataMapped = metadataMap.map(metadata => {
      const [collection, instance] = metadata.id
      return {
        collection,
        instance,
        data: metadata.value.data
      }
    })
    return assetsMap.map(asset => {
      const [collection, instance] = asset.id
      const { data } = metadataMapped.find((metadata) => metadata.instance === instance) || {}
      const { owner, isFrozen, approved } = asset.value
      return {
        collection,
        instance,
        owner,
        approved,
        data,
        isFrozen
      }
    })
  }

  /**
   * @name enlistOffer
   * @description Enlist an item in a given marketplace
   * @param {String} marketplaceId The marketplace id of the item
   * @param {u64} collectionId Collection ID used in the uniques pallet; represents a group of Uniques
   * @param {u64} assetId Asset ID used in the uniques pallet; represents a single asset.
   * @param {u128} price
   */
  async enlistOffer ({ marketplaceId, collectionId, assetId, price }) {
    // invoke the extrinsic method
    return this.gatedMarketplaceApi.callTx({
      extrinsicName: 'enlistSellOffer',
      signer: this._signer,
      params: [marketplaceId, collectionId, assetId, price]
    })
  }

  /**
   * @name createMarketplace
   * @description Create a new marketplace
   * @param {String} admin The polkadot address of the admin
   * @param {String} label The label of the new Marketplace
   */
  async createMarketplace ({ admin, label }) {
    return this.gatedMarketplaceApi.callTx({
      extrinsicName: 'createMarketplace',
      signer: this._signer,
      params: [admin, label]
    })
  }

  /**
   * @name getCollections
   * @description Get all the collections of the NFTs wit the name of each collection
   * @return {Array} Array of object containing the collections with the name of each collection
   */
  async getCollections () {
    const collectionsRaw = await this.uniquesApi.exEntriesQuery('class', [])
    const collections = this.mapEntries(collectionsRaw)

    const collectionsMap = collections.map(collection => {
      return {
        classId: collection.id[0],
        ...collection.value
      }
    })

    // Get the name of the collection
    const classIds = collectionsMap.map(collection => {
      return collection.classId
    })

    const classData = await this.uniquesApi.getMetadaOf({ classIds })

    return collectionsMap.map((collection, i) => {
      const data = classData[i].data
      return {
        ...collection,
        data
      }
    })
  }

  /**
   * @name getOffersByCollection
   * @param {String} collectionId The ID of the collection
   * @return {}
   */
  async getOffersByCollection ({ collectionId }) {
    const offers = await this.gatedMarketplaceApi.getAllOffersByCollection({ collectionId })
    return offers.map(offer => {
      const [collection, instance] = offer.id
      const [offerId] = offer.value
      return {
        collection,
        instance,
        offerId
      }
    })
  }

  /**
   * @name enlistSellOffer
   * @description Create a new sell offer
   * @param {String} user The signer of the Transaction
   * @param {String} marketplaceId The marketplace to enlist the new sell offer
   * @param {String} collectionId The id of the collection where belongs the NFT
   * @param {String} itemId The id of the NFT to list on the offers
   * @param {String} price The price of the offer
   */
  async enlistSellOffer ({ user, marketplaceId, collectionId, itemId, price }, subTrigger) {
    return this.gatedMarketplaceApi.callTx({
      extrinsicName: 'enlistSellOffer',
      signer: this._signer,
      params: [marketplaceId, collectionId, itemId, price]

    })
  }

  /**
   * @name removeOffer
   * @description Remove a offer given the Offer ID
   * @param {String} offerId The ID of the offer to remove
   */
  async removeOffer ({ offerId }) {
    return this.gatedMarketplaceApi.callTx({
      extrinsicName: 'removeOffer',
      signer: this._signer,
      params: [offerId]
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
    const { info, attributes, metadata } = await this.uniquesApi.getAsset({ classId: collectionId, instanceId })
    const jsonExtension = 'json'
    // Get information from the IPFS service
    for (const attribute of attributes) {
      const { value } = attribute || {}
      if (value.includes(this.prefixIPFS)) {
        const splitted = value.split(':')
        const cid = splitted[1]
        const extension = splitted[2]
        if (extension === jsonExtension) {
          const response = await this.getFromIPFS(cid + ':' + extension)
          attribute.value = response
        }
      }
    }
    return { ...info, attributes, metadata }
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
