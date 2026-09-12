import { db, schema } from '@nuxthub/db'

// return geojson of all entities in the database
export default eventHandler(async (event) => {
    setHeader(event, 'Cache-Control', 'no-store')

    const entities = await db.select().from(schema.entities)
    // .limit(100)

    const geojson = {
        type: 'FeatureCollection',
        features: entities.map((entity) => ({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [entity.point?.x, entity.point?.y],
            },
            properties: {
                name: entity.name,
                type: entity.type,
                angle: entity.angle,
                speed: entity.speed,
            },
        })),
    }

    return geojson
})