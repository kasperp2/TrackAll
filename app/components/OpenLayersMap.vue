<script setup lang="ts">
import 'ol/ol.css'
import { onMounted } from 'vue'
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import OSM from 'ol/source/OSM'
import ImageTile from 'ol/source/ImageTile';
import GeoJSON from 'ol/format/GeoJSON'

import Fill from 'ol/style/Fill'
import Stroke from 'ol/style/Stroke'
import Style from 'ol/style/Style'
import Text from 'ol/style/Text'
import Icon from 'ol/style/Icon'

import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { transformExtent } from 'ol/proj';
import { buffer } from 'ol/extent';

const translateFeature = (feature: any, deltaTime: number) => {
	// speed buffer to avoid jittering when speed is very low
	if (feature.get('speed') < 0.1) return

	const geometry = feature.getGeometry()
	if (geometry) {
		const angle = feature.get('angle') || 0
		const speed = feature.get('speed') || 0
		const bearingRadians = angle * Math.PI / 180
		const distance = speed * (deltaTime / 1000)

		const deltaX = distance * Math.sin(bearingRadians)
		const deltaY = distance * Math.cos(bearingRadians)
		geometry.translate(deltaX, deltaY)
	}
}

const viewStorageKey = 'trackall-map-view'

const geoJsonFormat = new GeoJSON()

const entitiesSource = new VectorSource({
	format: geoJsonFormat,
});

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
	// new TileLayer({
	// 	source: new ImageTile({
	// 		url: 'https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg?key=1hyT1y4oXe5v2NwUfbuI',
	// 		tileSize: 512,
	// 	})
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
		loadEntities()
	});
}

const loadEntities = async () => {
	const extent = view.calculateExtent(map.value?.getSize())
	const projection = view.getProjection()
	if (!extent || !projection) return

	const bbox4326 = transformExtent(
		buffer(extent, 10000),
		projection.getCode(),
		'EPSG:4326'
	);

	const params = new URLSearchParams({
		limit: '1500',
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

	// remove features that are no longer present in the new data
	const newFeatureIds = new Set(features.map(f => f.getId()));
	entitiesSource.getFeatures().forEach((feature) => {
		if (!newFeatureIds.has(feature.getId())) {
			entitiesSource.removeFeature(feature);
		}
	});

	features.forEach((feature) => {
		const updatedAt = feature.get('updatedAt');
		if (updatedAt) {
			const timeSinceUpdate = Date.now() - new Date(updatedAt).getTime();
			translateFeature(feature, timeSinceUpdate);
		}
	});

	entitiesSource.addFeatures(features);
}

onMounted(() => {
	initMap()

	loadEntities()

	setInterval(() => {
		loadEntities()
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
