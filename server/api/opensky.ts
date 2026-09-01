import { db, schema } from '@nuxthub/db'
import { sql } from 'drizzle-orm';

enum PositionSource {
  ADSB = 0,
  ASTERIX = 1,
  MLAT = 2,
  FLARM = 3,
}

enum AircraftCategory {
  NoInformation = 0,
  NoADSBEmitterInfo = 1,
  Light = 2,
  Small = 3,
  Large = 4,
  HighVortexLarge = 5,
  Heavy = 6,
  HighPerformance = 7,
  Rotorcraft = 8,
  Glider = 9,
  LighterThanAir = 10,
  Parachutist = 11,
  Ultralight = 12,
  Reserved = 13,
  UAV = 14,
  SpaceVehicle = 15,
  SurfaceVehicleEmergency = 16,
  SurfaceVehicleService = 17,
  PointObstacle = 18,
  ClusterObstacle = 19,
  LineObstacle = 20,
}

/**
 * OpenSky state vector, returned as a fixed-length tuple.
 * See: https://openskynetwork.github.io/opensky-api/rest.html
 */
type OpenSkyStateVector = [
  icao24: string,
  callsign: string | null,
  origin_country: string,
  time_position: number | null,
  last_contact: number,
  longitude: number | null,
  latitude: number | null,
  baro_altitude: number | null,
  on_ground: boolean,
  velocity: number | null,
  true_track: number | null,
  vertical_rate: number | null,
  sensors: number[] | null,
  geo_altitude: number | null,
  squawk: string | null,
  spi: boolean,
  position_source: PositionSource,
  category: AircraftCategory,
];

const runtimeConfig = useRuntimeConfig()

const CLIEN_ID = runtimeConfig.openskyClientId
const CLIENT_SECRET = runtimeConfig.openskyClientSecret

const authUrl = 'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token'
// const dataUrl = 'https://opensky-network.org/api/states/all?lamin=54.838314&lomin=8.371338&lamax=57.544344&lomax=11.733643'
const dataUrl = 'https://opensky-network.org/api/states/all'

export default eventHandler(async (event) => {

    const authResponse = await fetch(authUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            'grant_type': 'client_credentials',
            'client_id': CLIEN_ID,
            'client_secret': CLIENT_SECRET,
        }),
    })

    if (!authResponse.ok) {
        throw new Error('Error fetching access token')
    }
    
    const authData = await authResponse.json()
    const accessToken = authData.access_token

    const dataResponse = await fetch(dataUrl, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        },
    })

    if (!dataResponse.ok) {
        throw new Error('Error fetching data')
    }

    const data = await dataResponse.json()

    data.states.forEach(async (state: OpenSkyStateVector) => {
        const [icao24, callsign, origin_country, time_position, last_contact, longitude, latitude, baro_altitude, on_ground, velocity, true_track, vertical_rate, sensors, geo_altitude, squawk, spi, position_source, category] = state

        await db.insert(schema.entities)
            .values({
                identifier: icao24,
                name: callsign?.trim() || 'Unknown',
                type: 'Plane',
                point: {x : longitude || 0, y: latitude || 0},
            })
            .onConflictDoUpdate({
                target: schema.entities.identifier,
                set: {
                    point: {x : longitude || 0, y: latitude || 0},
                },
            })
    })

    return {
        message: 'Data fetched and stored successfully',
        count: data.states.length,
    }
})
