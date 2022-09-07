const PolkadotApi = require('../../src/model/polkadotApi')
const { AfloatApi } = require('../../src/model/polkadot-pallets')

jest.setTimeout(40000)
let polkadotApi
let afloatApi
describe('Connect with hashedChain', () => {
  test('Create PolkadotApi instance', async () => {
    polkadotApi = new PolkadotApi(
      {
        chainURI: 'wss://n1.hashed.systems',
        appName: 'Hashed test'
      }
    )
    await polkadotApi.connect()
    expect(polkadotApi !== undefined)
  })
  test('Create AfloatApi instance', async () => {
    const projectId = '2DB4cZf2ac86npYl2XnStjUg0Y9'
    const secretId = 'a21bdbee67c178407ab9740f5102a4e1'
    afloatApi = new AfloatApi(polkadotApi, projectId, secretId)
    expect(afloatApi).toBeDefined()
  })
  test('Process unique public attributes', async () => {
    const uniquesPublicAttributes = {
      value: 10000,
      title: 'My tax credit',
      tax_credit_type_id: 1,
      tax_authority_id: 1
    }
    const plaintextSaveToIPFS = {
      data: {
        ssn: '123456789',
        street: '1 Test Road',
        city: 'Test City',
        state: 'Virginia',
        zipcode: '12345'
      },
      files: {
        filename1: 'File',
        filename2: 'File'
      }
    }
    const encryptoThenSaveToIPFS = {
      data: {
        ssn: '123456789',
        street: '1 Test Road',
        city: 'Test City',
        state: 'Virginia',
        zipcode: '12345'
      },
      files: {
        filename1: 'File',
        filename2: 'File'
      }
    }
    afloatApi.createAsset({
      collectionId: 0,
      assetId: 0,
      uniquesPublicAttributes,
      plaintextSaveToIPFS,
      encryptoThenSaveToIPFS
    })
  })
})

describe('Create a new Asset', () => {

})
