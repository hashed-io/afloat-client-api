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
  enlist_sell_offer ({ user, marketplaceId, collectionId, itemId, price }, subTrigger) {
    return this.callTx('create_collection', user, [marketplaceId, collectionId, itemId, price], subTrigger)
  }

  /**
   * @name takeSellOffer
   * @description Takes the sell offer for a given offer id
   * @param {String} offerId
   */
  take_sell_offer ({ user, offerId }, subTrigger) {
    return this.callTx('take_sell_offer', user, [offerId], subTrigger)
  }

  /**
   * @name removeOffer
   * @description Removes the sell offer for a given offer id
   * @param {String} offerId
   */
  remove_offer ({ user, offerId }, subTrigger) {
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
  enlist_buy_offer ({ user, marketplaceId, collectionId, itemId, price }, subTrigger) {
    return this.callTx('enlist_buy_offer', user, [marketplaceId, collectionId, itemId, price], subTrigger)
  }

  /**
   * @name takeBuyOffer
   * @description Takes the buy offer for a given offer id
   * @param {String} offerId
   */
  take_buy_offer ({ user, offerId }, subTrigger) {
    return this.callTx('take_buy_offer', user, [offerId], subTrigger)
  }
}

module.exports = GatedMarketplaceApi
