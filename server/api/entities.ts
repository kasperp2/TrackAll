import { db, schema } from '@nuxthub/db'
import { sql, and, asc, desc, isNotNull, gt } from 'drizzle-orm'
import { z } from 'zod'

const querySchema = z.object({
    bbox: z.string(),
    limit: z.string().optional(),
})

export default defineEventHandler(async (event) => {
    const query = await getValidatedQuery(event, query => querySchema.safeParse(query))

    if (!query.success) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Invalid query parameters',
        })
    }

    const bbox = query.data.bbox.split(',')

    const dbQuery = db.select().from(schema.entities)
        .where(
            and(
                isNotNull(schema.entities.point),
                gt(schema.entities.point, sql`ST_MakePoint(0, 0)`),
                sql`${schema.entities.point} && ST_MakeEnvelope(${bbox[0]}, ${bbox[1]}, ${bbox[2]}, ${bbox[3]})`,
                sql`${schema.entities.updatedAt} > NOW() - INTERVAL '5 minutes'`,
            )
        )
        .orderBy(desc(schema.entities.speed))

    if (query.data.limit) {
        const limit = parseInt(query.data.limit, 10)
        dbQuery.limit(limit)
    }

    const entities = await dbQuery.execute()
    return entitiesToGeojson(entities)
})