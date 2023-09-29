const BasePolkadot = require('../basePolkadot')
const BrowserIpfs = require('../../../Utils/BrowserIpfs')
const UniquesApi = require('../polkadot-pallets/uniquesApi')
const FruniquesApi = require('../polkadot-pallets/fruniquesApi')
const GatedMarketplaceApi = require('../polkadot-pallets/gatedMarketplaceApi')
const RbacApi = require('../polkadot-pallets/rbacApi')
const AfloatPalletApi = require('../polkadot-pallets/afloatPalletApi')
const MappedAssetsApi = require('../polkadot-pallets/mappedAssetsApi')
class AfloatApi extends BasePolkadot {
  constructor ({ polkadotApi, projectId, secretId, IPFS_URL, notify }) {
    super(polkadotApi, 'fruniques', notify)
    this.fruniquesApi = new FruniquesApi({ polkadotApi, notify })
    this.uniquesApi = new UniquesApi({ polkadotApi, notify })
    this.gatedMarketplaceApi = new GatedMarketplaceApi({ polkadotApi, notify })
    this.rbacApi = new RbacApi({ polkadotApi, notify })
    this.afloatPalletApi = new AfloatPalletApi({ polkadotApi, notify })
    this.mappedAssetsApi = new MappedAssetsApi({ polkadotApi, notify })

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
    const parentInfoCall = isHierarchical ? [collectionId, parentId, percentage, isHierarchical] : null

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
      params: [collectionId, metadata, attributes, parentInfoCall]
    })
  }

  /**
   * @name getInstancesFromCollection
   * @param {String} collectionId The id of the collection
   * @returns {Array} Array of object
   */
  async getInstancesFromCollection ({ collectionId }) {
    const assets = await this.uniquesApi.exEntriesQuery('asset', [collectionId])
    let assetsMap = this.mapEntries(assets)

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

    const promises = []
    assetsMap.forEach(asset => {
      const [collection, instance] = asset.id
      promises.push(this.fruniquesApi.getFruniqueInfoByClass({ collectionId: collection, classId: instance }))
    })

    const resolved = await Promise.all(promises)
    assetsMap = assetsMap.map((asset, i) => {
      return {
        ...asset,
        ...resolved[i]
      }
    })

    const instanceData = assetsMap.map(asset => {
      const [collection, instance] = asset.id
      const { data } = metadataMapped.find((metadata) => metadata.instance === instance) || {}
      const { owner, isFrozen, approved } = asset.value || {}
      const { weight, parent, children } = asset || {}
      return {
        collection,
        instance,
        owner,
        approved,
        data,
        isFrozen,
        weight,
        parent,
        children
      }
    })
    return instanceData
  }

  async getFruniqueRoots ({ collectionId }) {
    const responseFrunique = await this.fruniquesApi.exEntriesQuery('fruniqueRoots', [collectionId])
    const fruniqueRoots = this.mapEntries(responseFrunique)
    const fruniqueRootsMapped = fruniqueRoots.map(frunique => {
      const { id } = frunique || {}
      return id?.[1]
    })
    const promisesAssets = []
    const promisesMetadata = []
    const promisesFruniques = []
    fruniqueRootsMapped.forEach((fruniqueId) => {
      promisesAssets.push(this.uniquesApi.exQuery('asset', [collectionId, fruniqueId]))
      promisesMetadata.push(this.uniquesApi.exQuery('instanceMetadataOf', [collectionId, fruniqueId]))
      promisesFruniques.push(this.fruniquesApi.getFruniqueInfoByClass({ collectionId, classId: fruniqueId }))
    })

    const [
      responseAssets,
      responseMetadata,
      responseFruniques
    ] = await Promise.all([
      Promise.all(promisesAssets),
      Promise.all(promisesMetadata),
      Promise.all(promisesFruniques)
    ])

    const data = []
    responseAssets.forEach((asset, i) => {
      const instance = fruniqueRoots[i]
      const assetHuman = asset.toHuman()
      const metadataHuman = responseMetadata[i].toHuman() || responseMetadata[i]
      const fruniquesHuman = responseFruniques[i]
      data.push({
        collection: collectionId,
        instance,
        ...assetHuman,
        ...metadataHuman,
        ...fruniquesHuman
      })
    })
    return data
  }

  /**
   * @name createMarketplace
   * @description Create a new marketplace
   * @param {String} admin The polkadot address of the admin
   * @param {String} label The label of the new Marketplace
   */
  async createMarketplace ({ admin, label, fee }) {
    return this.gatedMarketplaceApi.callTx({
      extrinsicName: 'createMarketplace',
      signer: this._signer,
      params: [admin, label, fee]
    })
  }

  async getMarketplaceId () {
    return this.afloatPalletApi.getAfloatMarketplaceId()
  }

  async getAfloatCollectionId () {
    return this.afloatPalletApi.getAfloatCollectionId()
  }

  async getAfloatAssetId () {
    return this.afloatPalletApi.exQuery('afloatAssetId', [])
  }

  async getMappedAssetInfo ({ afloatAssetId }) {
    const response = await this.mappedAssetsApi.exQuery('asset', [afloatAssetId])
    return response.toHuman()
  }

  async getBalanceFromMappedAssets ({ assetId, address }, subTrigger) {
    return this.mappedAssetsApi.exQuery('account', [assetId, address], subTrigger)
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
  async getOffersByCollection ({ collectionId }, subTrigger) {
    const offers = await this.gatedMarketplaceApi.getAllOffersByCollection({ collectionId }, subTrigger)
    const promises = []
    const offersFiltered = offers.filter(offer => {
      const { value } = offer || {}
      return value?.length > 0
    })
    const offersMapped = offersFiltered.map(offer => {
      const [collection, instance] = offer.id
      const [offerId] = offer.value
      const promise = this.getOfferInfo({ offerId })
      promises.push(promise)
      return {
        collection,
        instance,
        offerId
      }
    })
    const resolved = await Promise.all(promises)
    return offersMapped.map((offer, i) => {
      return {
        ...offer,
        offerInfo: resolved[i]
      }
    })
  }

  async getOffersByAccount ({ address }) {
    const afloatOffers = await this.afloatPalletApi.exEntriesQuery('afloatOffers', [])
    const afloatOffersHuman = this.mapEntries(afloatOffers)

    const offersMapped = afloatOffersHuman.reduce((acc, offer) => {
      const { value, id } = offer || {}
      const { creatorId } = value || {}
      if (creatorId === address) {
        acc.push({
          id: id?.[0],
          ...value
        })
      }
      return acc
    }, [])

    return offersMapped
  }

  async getOffersByMarketplace () {
    let offers = await this.afloatPalletApi.exEntriesQuery('afloatOffers', [])
    offers = this.mapEntries(offers)
    return offers.map(offer => {
      return {
        offerId: offer?.id[0],
        ...offer?.value
      }
    })
  }

  async subscriptionOffersByMarketplace ({ marketplaceId }, subTrigger) {
    return this.gatedMarketplaceApi.exQuery('offersByMarketplace', [marketplaceId], subTrigger)
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
  async enlistSellOffer ({ args }, subTrigger) {
    /**
     * SELL : {
     *    taxCreditAmount: '10',
     *    pricePerCredit: '1000000000000',
     *    taxCreditId: '0',
     *    expirationDate: '2026
     * }
     */
    return this.afloatPalletApi.callTx({
      extrinsicName: 'createOffer',
      signer: this._signer,
      params: [args]
    })
  }

  /**
   * @name enlistSellOffer
   * @description Create a new buy offer
   * @param {String} user The signer of the Transaction
   * @param {String} marketplaceId The marketplace to enlist the new buy offer
   * @param {String} collectionId The id of the collection where belongs the NFT
   * @param {String} itemId The id of the NFT to list on the offers
   * @param {String} price The price of the offer
   */
  async enlistBuyOffer ({ marketplaceId, collectionId, itemId, price, percentage }, subTrigger) {
    return this.gatedMarketplaceApi.callTx({
      extrinsicName: 'enlistBuyOffer',
      signer: this._signer,
      params: [marketplaceId, collectionId, itemId, price, percentage]
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

  async cancelOffer ({ offerId }) {
    console.log('cancel offer')
    return this.afloatPalletApi.callTx({
      extrinsicName: 'cancelOffer',
      signer: this._signer,
      params: [offerId]
    })
  }

  async setAfloatBalance ({ address, amount }) {
    return this.afloatPalletApi.callTx({
      extrinsicName: 'setAfloatBalance',
      signer: this._signer,
      params: [address, amount]
    })
  }

  async addAfloatAdmin ({ address }) {
    return this.afloatPalletApi.callTx({
      extrinsicName: 'addAfloatAdmin',
      signer: this._signer,
      params: [address]
    })
  }

  /**
   * @name getOfferInfo
   * @param {String} OfferId The if of the offer to retrieve
   * @returns the offer information
   */
  async getOfferInfo ({ offerId }) {
    const offer = await this.gatedMarketplaceApi.exQuery('offersInfo', [offerId])
    const offerInfo = offer.toHuman()
    return offerInfo
  }

  async getOffersInfo ({ offersIds }) {
    const offers = await this.gatedMarketplaceApi.exMultiQuery('offersInfo', offersIds)
    return offers.map(role => role.toHuman())
  }

  async getOffersByItem ({ collectionId, classId }) {
    return this.gatedMarketplaceApi.getOffersByItem({ collectionId, instanceId: classId })
  }

  async startTakeSellOrder ({ offerId, taxCreditAmount }) {
    return this.afloatPalletApi.callTx({
      extrinsicName: 'startTakeSellOrder',
      signer: this._signer,
      params: [offerId, taxCreditAmount]
    })
  }

  async takeBuyOffer ({ offerId }) {
    return this.gatedMarketplaceApi.callTx({
      extrinsicName: 'takeBuyOffer',
      signer: this._signer,
      params: [offerId]
    })
  }

  async getMarketplaceInfo ({ marketplaceId }) {
    return this.gatedMarketplaceApi.getMarketplaceInfo({ marketplaceId })
  }

  async inviteToMarketplace ({ marketplaceId, account, fields, custodianFields }) {
    return this.gatedMarketplaceApi.callTx({
      extrinsicName: 'invite',
      signer: this._signer,
      params: [marketplaceId, account, fields, custodianFields]
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
    const { info, collectionInfo, attributes, metadata } = await this.uniquesApi.getAsset({ classId: collectionId, instanceId })
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
    return { ...info, collectionInfo, attributes, metadata }
  }

  async getAssetInfo ({ collectionId, classId }) {
    return this.uniquesApi.getAssetInfo({
      collectionId,
      classId
    })
  }

  async inviteCollaboratorCollection ({ classId, invitee }) {
    return this.fruniquesApi.callTx({
      extrinsicName: 'invite',
      signer: this._signer,
      params: [classId, invitee]
    })
  }

  async getFromIPFS (cid) {
    let elementRetrieved
    if (cid) {
      elementRetrieved = await this.BrowserIpfs.retrieve(cid)
    }
    return elementRetrieved
  }

  async getAllFruniquesInfo ({ collectionId }) {
    return this.fruniquesApi.getAllFruniquesInfo({ collectionId })
  }

  async getFruniqueInfoByClass ({ collectionId, classId }) {
    return this.fruniquesApi.getFruniqueInfoByClass({ collectionId, classId })
  }

  async getUniqueFruniqueInfo ({ collectionId, classId, withAttributes = false }) {
    const unique = withAttributes
      ? await this.getAsset({ collectionId, instanceId: classId })
      : await this.getAssetInfo({ collectionId, classId })

    const frunique = await this.getFruniqueInfoByClass({ collectionId, classId })
    return {
      ...unique,
      ...frunique
    }
  }

  async isFruniqueVerified ({ collectionId, classId }) {
    return this.fruniquesApi.isFruniqueVerified({ collectionId, classId })
  }

  async requestRedeem ({ marketplaceId, redeem }) {
    return this.gatedMarketplaceApi.callTx({
      extrinsicName: 'redeem',
      signer: this._signer,
      params: [marketplaceId, redeem]
    })
  }

  /**
   *
   */
  async approveRedeem ({ marketplaceId, redeem }) {
    return this.gatedMarketplaceApi.callTx({
      extrinsicName: 'redeem',
      signer: this._signer,
      params: [marketplaceId, redeem]
    })
  }

  async verifyTax ({ collectionId, instanceId }) {
    return this.fruniquesApi.callTx({
      extrinsicName: 'verify',
      signer: this._signer,
      params: [collectionId, instanceId]
    })
  }

  async askingForRedemption ({ marketplaceId }) {
    const response = await this.gatedMarketplaceApi.exEntriesQuery('askingForRedemption', [marketplaceId])
    const askingForRedemption = this.mapEntries(response)
    return askingForRedemption?.map(el => {
      const { value, id } = el || {}
      const redeemId = id?.[1]
      return {
        redeemId,
        ...value
      }
    })
  }

  async askingForRedemptionByRemptionId ({ marketplaceId, redeemId }) {
    const response = await this.gatedMarketplaceApi.exQuery('askingForRedemption', [marketplaceId, redeemId])
    return response.toHuman()
  }

  /**
   * @name getAuthoritiesByMarketplace
   * @description Get authorities by marketplace
   * @param {String} afloatPalletId Afloat Pallet Id [Used to get the scopes of the Afloat Marketplace]
   * @param {String} MarketPalletID Market Pallet Id [Used to get the authorities of the Marketplace]
   * @param {Function} subTrigger Function to trigger when subscription detect changes
   * @returns {Object}
   */
  async getAuthoritiesByMarketplace ({ afloatPalletId, palletId }, subTrigger) {
    // 1. Get the roles ids of the owner and admin
    const rolesIds = await this.rbacApi.exEntriesQuery('roles', [])
    const rolesIdsMap = this.mapEntries(rolesIds)

    const roles = ['Admin']
    const rolesIdsFiltered = rolesIdsMap.filter(role => roles.includes(role?.value))
    const _rolesId = rolesIdsFiltered.map(role => role?.id?.[0])

    const scopeId = await this.rbacApi.exQuery('scopes', [afloatPalletId])
    const scopeIdHuman = scopeId.toHuman()

    const usersByScope = await this.rbacApi.exQuery('usersByScope', [afloatPalletId, scopeIdHuman[0], _rolesId[0]])
    const usersByScopeMap = usersByScope.toHuman()

    return usersByScopeMap
  }

  async getUniquesByAccount ({ address, collectionId }) {
    const uniques = await this.uniquesApi.exEntriesQuery('account', [address, collectionId])
    const uniquesEntries = this.mapEntries(uniques)
    return uniquesEntries.map(unique => {
      const { id } = unique || {}
      const [owner, collectionId, instanceId] = id || []
      return { owner, collectionId, instanceId }
    })
  }

  async signUp ({ args }) {
    return this.afloatPalletApi.callTx({
      extrinsicName: 'signUp',
      signer: this._signer,
      params: [args]
    })
  }

  async getUsers () {
    const users = await this.afloatPalletApi.exEntriesQuery('userInfo', [])
    const usersEntries = this.mapEntries(users)
    return usersEntries.map(user => {
      const { id, value } = user || {}
      return {
        id: id?.[0],
        ...value
      }
    })
  }

  async getUser ({ address }) {
    const user = await this.afloatPalletApi.exQuery('userInfo', [address])
    return user.toHuman()
  }

  async updateUserInfo ({ address, args }) {
    return this.afloatPalletApi.updateUserInfo({
      address,
      args
    })
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
