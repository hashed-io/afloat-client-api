global.window = { addEventListener () {} }
// const PolkadotApi = require('../../src/model/polkadotApi')
const ConfidentialDocs = require('../utils/confidentialDocs')
const { AfloatApi } = require('../../src/model/polkadot-pallets')
jest.setTimeout(40000)
// let polkadotApi
let afloatApi

let confidentialDocs
beforeAll(async () => {
  confidentialDocs = new ConfidentialDocs({
    ipfsURL: process.env.IPFS_URL,
    ipfsAuthHeader: `Basic ${Buffer.from(`${process.env.IPFS_PROJECT_ID}:${process.env.IPFS_PROJECT_SECRET}`).toString('base64')}`,
    chainURI: process.env.WSS,
    appName: process.env.APP_NAME,
    signer: process.env.SIGNER
  })
  await confidentialDocs.init()
})
afterAll(async () => {
  confidentialDocs.disconnect()
})
describe('Connect with hashedChain', () => {
  test('Create ConfidentialDocs instance', async () => {
    expect(confidentialDocs).toBeInstanceOf(ConfidentialDocs)
  })
  test('Create AfloatApi instance', async () => {
    afloatApi = new AfloatApi({
      projectId: process.env.IPFS_PROJECT_ID,
      secretId: process.env.IPFS_PROJECT_SECRET,
      IPFS_URL: process.env.IPFS_URL,
      hcd: confidentialDocs
    })
    expect(afloatApi).toBeDefined()
    expect(afloatApi).toBeInstanceOf(AfloatApi)
  })

  // test('Process unique public attributes', async () => {
  //   const uniquesPublicAttributes = {
  //     value: 10000,
  //     title: 'My tax credit',
  //     tax_credit_type_id: 1,
  //     tax_authority_id: 1
  //   }
  //   const plaintextSaveToIPFS = {
  //     data: {
  //       ssn: '123456789'
  //     },
  //     files: {
  //       filename1: 'file3'
  //     }
  //   }
  //   const encryptoThenSaveToIPFS = {
  //     data: {
  //       ssn: '123456789',
  //       street: '1 Test Road',
  //       city: 'Test City',
  //       state: 'Virginia',
  //       zipcode: '12345'
  //     },
  //     files: {
  //       filename1: 'File',
  //       filename2: 'File'
  //     }
  //   }
  //   await afloatApi.createAsset({
  //     collectionId: 0,
  //     assetId: 0,
  //     uniquesPublicAttributes,
  //     plaintextSaveToIPFS,
  //     encryptoThenSaveToIPFS
  //   })
  // })

  test('Get all Asset information', async () => {
    const response = await afloatApi.getAllAssetsInCollection({
      collectionId: 250,
      startKey: 1,
      pageSize: 10
    })
    console.log(response)
  })
})

describe('Create a new Asset', () => {

})
