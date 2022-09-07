const {
  web3Accounts,
  web3Enable,
  web3FromAddress
} = require('@polkadot/extension-dapp')
const { ApiPromise, WsProvider } = require('@polkadot/api')
const { decodeAddress, encodeAddress } = require('@polkadot/keyring')
const { isHex, hexToU8a, u8aToHex, u8aWrapBytes } = require('@polkadot/util')
const { signatureVerify } = require('@polkadot/util-crypto')

class PolkadotApi {
  constructor ({ chainURI, appName }) {
    this.chainURI = chainURI
    // this.chainURI = 'chainURI://n4.hashed.systems'
    console.log('polkadotApi constructor', chainURI)
    this.api = undefined
    this.appName = appName
  }

  /**
   * @description Connect to chainURI server and get api
   * @returns {Object}
   * { chain, nodeName, nodeVersion }
   */
  async connect () {
    try {
      // Initialize the provider to connect to the local node
      console.log('connecting to ', this.chainURI)
      const provider = new WsProvider(this.chainURI)

      // Create the API and wait until ready
      const api = new ApiPromise({ provider })
      this.api = api
      // const api = await ApiPromise.create({ provider })

      // console.log('apiPromise', api)

      await new Promise((resolve, reject) => {
        let failedCount = 0
        api.on('connected', v => {
          console.warn('Event detected connected', v)
        })
        api.on('disconnected', v => {
          console.warn('Event detected disconnected', v)
        })
        api.on('error', v => {
          console.warn('Event detected error', failedCount, v)
          if (failedCount <= 10) {
            failedCount++
          } else {
            reject(`An error ocurred trying to connect at ${this.chainURI}`)
          }
        })
        api.on('ready', async (v) => {
          console.warn('Event detected ready', v)
          resolve()
        })
      })
      // console.warn('status', status)

      // Retrieve the chain & node information information via rpc calls
      const [chain, nodeName, nodeVersion] = await Promise.all([
        api.rpc.system.chain(),
        api.rpc.system.name(),
        api.rpc.system.version()
      ])

      // console.log('api', api)

      return {
        chain,
        nodeName,
        nodeVersion
      }
    } catch (e) {
      console.error('connect polkadot Api', e)
      throw new Error(e)
    }
  }

  /**
   * @name signMessage
   * @description Sign a message
   * @param {String} message Message to sign
   * @param {String} signer User address
   * @returns Object
   */
  async signMessage (message, signer) {
    // Get signer
    await web3Enable(this.appName)
    const injector = await web3FromAddress(signer)

    // Create Message
    const wrapped = u8aWrapBytes(message)

    // Sign Message
    return injector.signer.signRaw({
      address: signer,
      data: u8aToHex(wrapped),
      type: 'bytes'
    })
  }

  /**
   * @name verifyMessage
   * @description Verify a message
   * @param {String} message Message to verify
   * @param {String} signature Signature from signMessage result
   * @param {String} signer User Address
   * @returns Object
   */
  async verifyMessage (message, signature, signer) {
    return signatureVerify(message, signature, signer)
  }

  /**
  * @name requestUsers
  * @description Return available accounts from web3Accounts
  * @returns {Array}
  * [{ address, meta: { genesisHash, name, source }, type }]
  */
  async requestUsers () {
    // (this needs to be called first, before other requests)
    await web3Enable(this.appName)
    // meta.source contains the name of the extension that provides this account
    return web3Accounts()
  }

  /**
   * @name isValidPolkadotAddress
   * @description Return a boolean to indicate if is a valid polkadot address
   * @param {String} address polkadot Address
   * @returns Boolean
   */
  isValidPolkadotAddress (address) {
    try {
      encodeAddress(
        isHex(address)
          ? hexToU8a(address)
          : decodeAddress(address)
      )
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * @name getAccountInfo
   * @description Get user details info
   * @param {*} user User address
   * @returns { Object }
   * { identity }
   */
  getAccountInfo (user) {
    return this.api.derive.accounts.info(user)
  }

  /**
   * @name setSigner
   * @description Set signer from web3FromAddress using web 3 plugin
   * @param {String} user User address
   */
  async setWeb3Signer (user) {
    // Enable web3 plugin
    await web3Enable(this.appName)
    // Get injector to call a Extrinsic
    const injector = await web3FromAddress(user)
    // Set signer
    this.api.setSigner(injector.signer)
  }
}

// export default PolkadotApi
module.exports = PolkadotApi
