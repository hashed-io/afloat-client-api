// import BasePolkadotApi from '~/services/basePolkadotApi'
const BasePolkadot = require('../basePolkadot')

class GatedMarketplaceApi extends BasePolkadot {
  constructor ({ polkadotApi, notify }) {
    super(polkadotApi, 'gatedMarketplace', notify)
  }

  /**
   * @name enlistOffer
   * @description Enlist an item in a given marketplace
   * @param {String} marketplaceId The marketplace id of the item
   * @param {u64} collectionId Collection ID used in the uniques pallet; represents a group of Uniques
   * @param {u64} assetId Asset ID used in the uniques pallet; represents a single asset.
   * @param {u128} price
   */
  async enlistSellOffer ({ user, marketplaceId, collectionId, itemId, price }, subTrigger) {
    return this.callTx('enlistSellOffer', user, [marketplaceId, collectionId, itemId, price], subTrigger)
  }

  /**
   * @name takeSellOffer
   * @description Takes the sell offer for a given offer id
   * @param {String} offerId
   */
  async take_sell_offer ({ user, offerId }, subTrigger) {
    return this.callTx('take_sell_offer', user, [offerId], subTrigger)
  }

  /**
   * @name removeOffer
   * @description Removes the sell offer for a given offer id
   * @param {String} offerId
   */
  async remove_offer ({ user, offerId }, subTrigger) {
    return this.callTx('remove_offer', user, [offerId], subTrigger)
  }

  /**
   * @name enlistBuyOffer
   * @description Enlist a buy offer for a given asset
   * @param {String} marketplaceId The marketplace id of the item
   * @param {u64} collectionId Collection ID used in the uniques pallet; represents a group of Uniques
   * @param {u64} assetId Asset ID used in the uniques pallet; represents a single asset.
   * @param {u128} price
   */
  async enlist_buy_offer ({ user, marketplaceId, collectionId, itemId, price }, subTrigger) {
    return this.callTx('enlist_buy_offer', user, [marketplaceId, collectionId, itemId, price], subTrigger)
  }

  /**
   * @name takeBuyOffer
   * @description Takes the buy offer for a given offer id
   * @param {String} offerId
   */
  async take_buy_offer ({ user, offerId }, subTrigger) {
    return this.callTx('take_buy_offer', user, [offerId], subTrigger)
  }

  /**
   * @name getAllOffersByCollection
   * @param {String} collectionId The id of the collection
   * @returns {Array}
   */
  async getAllOffersByCollection ({ collectionId }, subTrigger) {
    const offers = await this.exEntriesQuery('offersByItem', [collectionId], subTrigger)
    return this.mapEntries(offers)
  }

  /**
   * @name getAllOffersByCollection
   * @param {String} collectionId The id of the collection
   * @param {String} instanceId the id of the instance [NFT]
   * @returns {Array}
   */
  async getOffersByItem ({ collectionId, instanceId }) {
    const offers = await this.exQuery('offersByItem', [collectionId, instanceId])
    return offers.map(v => v.toHuman())
  }

  async getMarketplaceInfo ({ marketplaceId }) {
    const marketplace = await this.exQuery('marketplaces', [marketplaceId])
    return marketplace.toHuman()
  }
}

module.exports = GatedMarketplaceApi
