// import BasePolkadotApi from '~/services/basePolkadotApi'
const BasePolkadot = require('../basePolkadot')
class UniquesApi extends BasePolkadot {
  constructor ({ polkadotApi, notify }) {
    super(polkadotApi, 'uniques', notify)
  }

  async getAllAssets ({ startKey, pageSize }) {
    let assets = await this.exEntriesQuery('class', [], { startKey, pageSize })
    assets = this.mapEntries(assets)
    const assetsIds = []
    const assetsMapped = assets.map((v) => {
      assetsIds.push(v.id)
      return {
        id: v.id,
        data: v.value
      }
    })
    const attributesResponse = await this.getAttributesByClassesId({ classesIds: assetsIds })

    const assetsWithAttributes = assetsMapped.map((asset, index) => {
      const attributesArray = attributesResponse[index]
      const obj = {
        id: asset.id,
        data: asset.data,
        attributes: attributesArray
      }
      return obj
    })

    return assetsWithAttributes
  }

  async getInstancesFromCollection ({ collectionId }) {
    const assets = await this.exEntriesQuery('asset', [collectionId])
    const assetsMap = this.mapEntries(assets)
    return assetsMap.map(asset => {
      const [collection, instance] = asset.id
      const { owner, isFrozen, approved } = asset.value
      return {
        collection,
        instance,
        owner,
        approved,
        isFrozen
      }
    })
  }

  async getLastClassId () {
    let classesIds = await this.exEntriesQuery('class', [])
    classesIds = this.mapEntries(classesIds)
    const mapClasses = classesIds.map(v => {
      return parseInt(v.id)
    })
    const lastClassId = mapClasses.length > 0 ? Math.max(...mapClasses) : -1
    return lastClassId
  }

  // Queries
  async getAsset ({ classId, instanceId }) {
    let info = await this.exQuery('class', [classId])
    info = info.toHuman()
    let assetInfo = await this.exQuery('asset', [classId, instanceId])
    assetInfo = assetInfo.toHuman()
    let metadata = await this.exQuery('classMetadataOf', [classId])
    metadata = metadata.toHuman()
    const allIds = await this.exEntriesQuery('attribute', [classId, instanceId])
    const map = this.mapEntries(allIds)
    // Example
    //   {
    //     "key": "0x5e8a19e3cd1b7c148b33880c479c02811b0014ebdc1a24fd6a03320d070a5d84d82c12285b5d4551f88e8f6e7eb52b8101000000189a1f652c3d5b1ccb285c07a1c8a0ef010000000000b44263e881c10f23a4285105e87f6c145374617465",
    //     "id": [
    //         "1",
    //         "0",
    //         "State"
    //     ],
    //     "value": [
    //         "Virgina",
    //         "73,333,332,600"
    //     ]
    // }
    const response = map.map(v => {
      return {
        label: v.id[2],
        value: v.value[0]
      }
    })
    return { info: assetInfo, collectionInfo: { ...info }, attributes: response || undefined, metadata: metadata?.data }
  }

  async getAssetInfo ({ collectionId, classId }) {
    const asset = await this.exQuery('asset', [collectionId, classId])
    return asset.toHuman()
  }

  async getUniquesByAddress ({ address }) {
    const allIds = await this.exEntriesQuery('classAccount', [address])
    const map = this.mapEntries(allIds)
    const classesIdArray = map.map(v => {
      return v.id[1]
    })
    const classData = await this.getClassInfoByClassesId({ classesIds: classesIdArray })
    const classAttributes = await this.getAttributesByClassesId({ classesIds: classesIdArray })
    const uniquesList = classAttributes.map((attributes, index) => {
      classData[index].attributes = attributes
      return {
        ...classData[index]
      }
    })
    const classMetadata = await this.getMetadaOf({ classIds: classesIdArray })
    return uniquesList.map((unique, index) => {
      return {
        ...classMetadata[index],
        ...unique
      }
    })
  }

  async getMetadaOf ({ classIds }, subTrigger) {
    const metadata = await this.exMultiQuery('classMetadataOf', classIds, subTrigger)
    return metadata.map(v => v.toHuman())
  }

  /**
     *
     * @param {ClassesId} Array of classesId
     * @returns Array class data in array
     */
  async getClassInfoByClassesId ({ classesIds }) {
    const classData = await this.exMultiQuery('class', classesIds)
    const classDataReadable = classData.map((v, index) => {
      return {
        classId: classesIds[index],
        ...v.toHuman()
      }
    })
    return classDataReadable
  }

  async getAttributesByClassesId ({ classesIds, instanceId = 0 }) {
    const attributePromise = []
    for (const classId of classesIds) {
      const query = this.exEntriesQuery('attribute', [classId, instanceId])
      attributePromise.push(query)
    }
    const attributesRaw = await Promise.all(attributePromise)

    const uniquesList = attributesRaw.map(attribute => {
      const attributeData = attribute.map(property => {
        const labelIndex = 2
        const valueIndex = 0
        return {
          attribute: property[0].toHuman()[labelIndex],
          value: property[1].toHuman()[valueIndex]
        }
      })
      return attributeData
    })
    return uniquesList
  }
}
module.exports = UniquesApi
