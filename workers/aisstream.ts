import { db, schema } from '@nuxthub/db'

const API_KEY = 'f2dd41b0c95ac5be8cc586d05afbea80d74af084'

const socket = new WebSocket("wss://stream.aisstream.io/v0/stream")

let counter = 0

socket.addEventListener("open", event => {
    socket.send(JSON.stringify({
        APIKey: API_KEY,
        // BoundingBoxes: [[[25.835, -80.208], [25.603, -79.879]]],
        // BoundingBoxes: [[[55, 2], [62, 9]]],
        BoundingBoxes: [[[-180, -90], [180, 90]]],
        FilterMessageTypes: ["PositionReport"]
    }))
})

type AISMessage = {
    MessageType: 'PositionReport' | 'SubscriptionConfirmation'
    MetaData: {
        MMSI: number,
        ShipName: string,
    }
    Message: {
        PositionReport: {
            Latitude: number, // WGS-84 latitude in decimal degrees
            Longitude: number, // WGS-84 longitude in decimal degrees
            Cog: number,
            Sog: number,
        }
    }
}

socket.addEventListener("message", async data => {
    const message = JSON.parse(data.data) as AISMessage

    if (message.MessageType === 'PositionReport') {
        const { MMSI, ShipName } = message.MetaData
        const { Latitude, Longitude, Cog, Sog } = message.Message.PositionReport
        // knots to m/s
        const speed = Sog ? Sog * 0.514444 : 0

        // console.log(`MMSI: ${MMSI}, ShipName: ${ShipName}, Latitude: ${Latitude}, Longitude: ${Longitude}, Cog: ${Cog}, Sog: ${Sog}`)
        counter++

        await db.insert(schema.entities)
            .values({
                identifier: MMSI.toString(),
                name: ShipName || 'Unknown',
                type: 'Ship',
                point: { x: Longitude || 0, y: Latitude || 0 },
                angle: parseInt(Cog?.toString() || '0', 10),
                speed,
            })
            .onConflictDoUpdate({
                target: schema.entities.identifier,
                set: {
                    point: { x: Longitude || 0, y: Latitude || 0 },
                    angle: parseInt(Cog?.toString() || '0', 10),
                    speed,
                },
            })
    }
})

setInterval(() => {
    console.log(`Received ${counter} messages`)
}, 1000)