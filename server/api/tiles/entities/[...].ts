import { db, schema } from '@nuxthub/db'
import { sql, and, asc, desc, isNotNull, gt } from 'drizzle-orm'
import { z } from 'zod'

const paramsSchema = z.object({
    _: z.string().regex(/^\d+\/\d+\/\d+$/),
})

const querySchema = z.object({
    limit: z.string().optional(),
})

export default defineEventHandler(async (event) => {
    const params = paramsSchema.safeParse(event.context.params)
    const query = await getValidatedQuery(event, query => querySchema.safeParse(query))

    if (!params.success) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Invalid parameters',
        })
    }

    if (!query.success) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Invalid query parameters',
        })
    }


    const [z, x, y] = params.data._.split('/').map(Number)

    const dbQuery = db.select().from(schema.entities)
        .where(and(
            sql`ST_Within(ST_SetSRID(${schema.entities.point}, 4326), ST_Transform(ST_TileEnvelope(${z}, ${x}, ${y}), 4326))`,
            sql`${schema.entities.updatedAt} > NOW() - INTERVAL '1 hour'`,
        ))
        .orderBy(desc(schema.entities.speed))

    if (query.data.limit) {
        const limit = parseInt(query.data.limit, 10)
        dbQuery.limit(limit)
    }

    const entities = await dbQuery.execute()


    return entitiesToGeojson(entities)
})
