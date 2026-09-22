<script setup lang="ts">
import 'ol/ol.css'
import { onMounted } from 'vue'
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import OSM from 'ol/source/OSM'
import GeoJSON from 'ol/format/GeoJSON'

import Fill from 'ol/style/Fill'
import Stroke from 'ol/style/Stroke'
import Style from 'ol/style/Style'
import Text from 'ol/style/Text'
import Icon from 'ol/style/Icon'

import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { bbox as bboxStrategy } from 'ol/loadingstrategy.js';
import { transformExtent } from 'ol/proj';

const getDeltaPosition = (angle: number, speed: number, deltaTime: number) => {
	const bearingRadians = angle * Math.PI / 180
	const distance = speed * (deltaTime / 1000)

	const deltaX = distance * Math.sin(bearingRadians)
	const deltaY = distance * Math.cos(bearingRadians)

	return { deltaX, deltaY }
}

const translateFeature = (feature: any, deltaTime: number) => {
	const geometry = feature.getGeometry()
	if (geometry) {
		const { deltaX, deltaY } = getDeltaPosition(feature.get('angle'), feature.get('speed'), deltaTime)
		geometry.translate(deltaX, deltaY)
	}
}

const viewStorageKey = 'trackall-map-view'

const geoJsonFormat = new GeoJSON();
let allowNextLoad = true;

const entitiesSource = new VectorSource({
	format: geoJsonFormat,

	loader: async (extent, resolution, projection) => {
		if (!allowNextLoad) return []
		allowNextLoad = false;

		const bbox4326 = transformExtent(
			extent,
			projection.getCode(),
			'EPSG:4326'
		);

		const params = new URLSearchParams({
			limit: '100',
			bbox: bbox4326.join(','),
		});

		const response = await fetch(`/api/entities?${params}`);

		if (!response.ok) {
			throw new Error(`Request failed: ${response.status}`);
		}

		const json = await response.json();

		const features = geoJsonFormat.readFeatures(json, {
			featureProjection: projection,
		});

		features.forEach((feature) => {
			const updatedAt = feature.get('updatedAt');
			if (updatedAt) {
				const timeSinceUpdate = Date.now() - new Date(updatedAt).getTime();
				translateFeature(feature, timeSinceUpdate);
			}
		});

		return features;
	},

	strategy: bboxStrategy,
});

const entitiesSourceRefresh = () => {
	allowNextLoad = true;
	entitiesSource.refresh();
};

const entitiesLayer = new VectorLayer({
	source: entitiesSource,
	style: (feature, resolution) => {
		return new Style({
			image: new Icon({
				src: feature.get('type') === 'Plane' ? '/plane.svg' : '/boat.svg',
				rotation: parseInt(feature.get('angle') || '0') * Math.PI / 180,
				scale: 2,
			}),
			text: new Text({
				text: feature.get('name'),
				fill: new Fill({ color: 'black' }),
				stroke: new Stroke({ color: 'white', width: 2 }),
			}),
		})
	}
})

const layers = [
	new TileLayer({
		source: new OSM(),
	}),
	// new TileLayer({
	//   source: new TileDebug(),
	// }),
	entitiesLayer
]

const saveView = () => {
	const center = view.getCenter()
	const zoom = view.getZoom()

	if (center && zoom !== undefined) {
		localStorage.setItem(viewStorageKey, JSON.stringify({ center, zoom }))
	}
}

const view = new View()
view.on('change:center', saveView)
view.on('change:resolution', saveView)

const map = ref<Map | null>(null)

const initMap = () => {
	const savedView = localStorage.getItem(viewStorageKey)

	if (savedView) {
		try {
			const { center, zoom } = JSON.parse(savedView)

			if (Array.isArray(center) && typeof zoom === 'number') {
				view.setCenter(center)
				view.setZoom(zoom)
			}
		} catch {
			localStorage.removeItem(viewStorageKey)
		}
	}

	map.value = new Map({
		target: 'map',
		layers,
		view
	})

	map.value.on('moveend', () => {
		entitiesSourceRefresh()
	});
}

onMounted(() => {
	initMap()

	setInterval(() => {
		entitiesSourceRefresh()
		console.log('Timed Refresh of entities source')
	}, 10000)

	let lastUpdateTime = Date.now()
	let currentTime = lastUpdateTime
	setInterval(() => {
		if (map.value) {
			currentTime = Date.now()
			const deltaTime = (currentTime - lastUpdateTime)

			entitiesSource.forEachFeature((feature) => {
				translateFeature(feature, deltaTime)
			})

			entitiesLayer.changed()
			lastUpdateTime = currentTime
		}
	}, 500)

})
</script>

<template>
	<div id="map" class="map"></div>
</template>

<style>
.map {
	width: 100%;
	height: 100vh;
}
</style>
