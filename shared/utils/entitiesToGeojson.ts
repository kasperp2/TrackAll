import { db, schema } from '@nuxthub/db'

export default function (entities: any[]): any {
    return {
        type: 'FeatureCollection',
        features: entities.map((entity) => ({
            type: 'Feature',
            id: entity.id,
            geometry: {
                type: 'Point',
                coordinates: [entity.point.x, entity.point.y],
            },
            properties: {
                name: entity.name,
                type: entity.type,
                angle: entity.angle,
                speed: entity.speed,
                updatedAt: entity.updatedAt,
            },
        })),
    }
}