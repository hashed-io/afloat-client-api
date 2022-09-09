**Afloat Client Api**

This client api is used to provide methods to interact with gatedMarketplace, uniques and fruniques pallets and go through Afloat specific flow.

To install the afloat-client-api, run the following command:

`npm i --save @jmgayosso/afloat-client`
or
`yarn add --save @jmgayosso/afloat-client`

To connect to 'hashed chain' through Hashed Confidential Docs we must import HCD package [hashed-confidential-docs-client](https://github.com/hashed-io/hashed-confidential-docs-client-api) that handles the connection and provides methods to sign tx, login, requestUsers from polkadotJS and sign and verify messages.

**Setup**

To install hcd run the following command.

`npm i --save @smontero/hashed-confidential-docs`
or
`yarn add --save @smontero/hashed-confidential-docs`

The following is an example of basic config to create HCD instance, please see [HCD documentation](https://github.com/hashed-io/hashed-confidential-docs-client-api) to more configs.
```
import {
  HashedConfidentialDocs,
  Polkadot,
  LocalAccountFaucet,
  BalancesApi
} from '@smontero/hashed-confidential-docs'
import { Keyring } from '@polkadot/api'

const _polkadot = new Polkadot({ wss: chainURI, appName })
await _polkadot.connect()

const keyring = new Keyring()
const faucet = new LocalAccountFaucet({
  balancesApi: new BalancesApi(this._polkadot._api, () => {}),
  signer: keyring.addFromUri(this._signer, {}, 'sr25519'),
  amount: 1000000000
})
const _hcd = new HashedConfidentialDocs({
  ipfsURL: _ipfsURL,
  polkadot: _polkadot,
  faucet,
  ipfsAuthHeader: _ipfsAuthHeader
})


```


HCD is requeried to create an instance of [AfloatApi](https://github.com/hashed-io/afloat-client-api/blob/feature/afloat/src/model/polkadot-pallets/afloatApi.js), this class provides the following methods: createAssets, getAllAssetsInCollection, getAssets, getFromIpfs.

```
import { AfloatApi } from '@jmgayosso/afloat-client'

const ipfsURL = `Basic ${Buffer.from(`${process.env.IPFS_PROJECT_ID}:${process.env.IPFS_PROJECT_SECRET}`).toString('base64')}`

const afloatApi = new AfloatApi({
  ipfsURL: process.env.IPFS_URL,
  ipfsAuthHeader,
  polkadot: _polkadot
})
```

Once an instance of AfloatApi is created, the following methods can be accessed.

**Methods**

* [createAsset](https://github.com/hashed-io/afloat-client-api/blob/feature/afloat/src/model/polkadot-pallets/afloatApi.js#L34): Create a new frunique/NFT asset.

  *Params*
    * @param {u64} collectionId Collection ID used in the uniques pallet; represents a group of Uniques
    * @param {u64} assetId [optional] Asset ID used in the uniques pallet; represents a single asset. If not provided, the next available unique ID will be automatically selected.
    * @param {Object} uniquesPublicAttributes mapping of key/value pairs to be set in the public metadata in the uniques pallet
    * @param {Object} plaintextSaveToIPFS payload and/or files to be saved to IPFS, and the resulting CIDs are added to the uniquesPublicMetadata, anchoring the data to the NFT.
    * @param {Object} encryptThenSaveToIPFS payload and/or files to be saved encrypted, saved to IPFS, and the resulting CIDs are added to the uniquesPublicMetadata, anchoring the data to the NFT. [CID]
    * @param {Function} subTrigger Function to trigger when subscrsption detect changes

    *Example*
  ```
  await afloatApi.createAsset({
    collectionId,
    assetId,
    uniquesPublicAttributes, plaintextSaveToIPFS, encryptoThenSaveToIPFS,
    admin
  })
  ```

* [getAllAssetsInCollection](https://github.com/hashed-io/afloat-client-api/blob/feature/afloat/src/model/polkadot-pallets/afloatApi.js#L75): Get all assets in collection.

  *Params*
   * @param {u64} collectionId Collection ID used in the uniques pallet; represents a group of Uniques
   * @param {u64} startKey Asset ID, index, or key to start the query
   * @param {int} pageSize maximum number of assets to retrieve per request
   * @param {Function} subTrigger Function to trigger when subscription detect changes

    *Example*
  ```
  await afloatApi.getAllAssetsInCollection({
    collectionId,
    startKey,
    pageSize
  })
  ```

* [getAsset](https://github.com/hashed-io/afloat-client-api/blob/feature/afloat/src/model/polkadot-pallets/afloatApi.js#L107): Get a specific asset by collectionId.

  *Params*
   * @param {String} [collectionId] Collection Id

    *Example*
  ```
  await afloatApi.getAsset({ collectionId })
  ```

* [getFromIPFS](https://github.com/hashed-io/afloat-client-api/blob/feature/afloat/src/model/polkadot-pallets/afloatApi.js#L113): Get Text or File from IPFS.

  *Params*
   * @param {String} [cid] Unique IPFS identifier

    *Example*
  ```
  await afloatApi.getFromIPFS(cid)
  ```