global.window = { addEventListener () {} }
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
})

describe('Create a new Asset', () => {

})
