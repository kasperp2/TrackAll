<script setup lang="ts">
import 'ol/ol.css'
import { onMounted } from 'vue'
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import OSM from 'ol/source/OSM'
import {fromLonLat} from 'ol/proj.js';

import GeoJSON from 'ol/format/GeoJSON.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import Modify from 'ol/interaction/Modify.js';

import Fill from 'ol/style/Fill.js';
import Stroke from 'ol/style/Stroke.js';
import Style from 'ol/style/Style.js';
import Text from 'ol/style/Text.js';
import Icon from 'ol/style/Icon.js';

const viewStorageKey = 'trackall-map-view';

const entitiesSource = new VectorSource({
  url: '/api/entities',
  format: new GeoJSON(),
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
        fill: new Fill({color: 'black'}),
        stroke: new Stroke({color: 'white', width: 2}),
      }),
    });
  }
});

const layers = [
  new TileLayer({
    source: new OSM(),
  }),
  entitiesLayer
]

const view = new View({
  center: fromLonLat([8.371338, 54.838314]),
  zoom: 5,
})

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

  const map = new Map({
    target: 'map',
    layers,
    view
  })

  view.on('change:center', saveView)
  view.on('change:resolution', saveView)
}

const saveView = () => {
  const center = view.getCenter()
  const zoom = view.getZoom()

  if (center && zoom !== undefined) {
    localStorage.setItem(viewStorageKey, JSON.stringify({ center, zoom }))
  }
}

onMounted(() => {
  initMap()

  // doesn't work
  // setInterval(() => {
  //   entitiesSource.forEachFeature((feature) => {
  //     const speed = feature.get('speed') || 0
  //     const angle = feature.get('angle') || 0
      
  //     const geometry = feature.getGeometry()

  //     if (!geometry) return

  //     geometry.translate(
  //       speed * Math.cos(angle * Math.PI / 180),
  //       speed * Math.sin(angle * Math.PI / 180)
  //     )
  //   })
  // }, 10)  
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
