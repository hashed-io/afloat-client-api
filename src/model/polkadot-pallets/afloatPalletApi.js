// import BasePolkadotApi from '~/services/basePolkadotApi'
const BasePolkadot = require('../basePolkadot')
class AfloatPalletApi extends BasePolkadot {
  constructor ({ polkadotApi, notify }) {
    super(polkadotApi, 'afloat', notify)
  }

  getAfloatMarketplaceId () {
    return this.exQuery('afloatMarketplaceId', [])
  }

  updateUserInfo ({ address, args }) {
    return this.callTx({
      extrinsicName: 'updateUserInfo',
      signer: this._signer,
      params: [address, args]
    })
  }
}
module.exports = AfloatPalletApi
