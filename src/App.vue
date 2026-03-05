<script setup lang="ts">
import { churchtoolsClient } from '@churchtools/churchtools-client';
import { onMounted, ref } from 'vue';
import ServiceHistory from './components/ServiceHistory.vue';
import type { Service } from './utils/ct-types';

const churchtoolsUrl = window.settings?.base_url ?? import.meta.env.VITE_CHURCHTOOLS_URL
churchtoolsClient.setBaseUrl(churchtoolsUrl)

const services = ref<Service[] | null>(null)

onMounted(async () => {
  const username = import.meta.env.VITE_USERNAME
  const password = import.meta.env.VITE_PASSWORD
  if (import.meta.env.DEV && username && password) {
    await churchtoolsClient.post('/login', {
      username,
      password,
    })
  }

  services.value = await churchtoolsClient.get<Service[]>('/services')
})
</script>

<template>
  <ServiceHistory v-if="services !== null" :services="services" />
</template>
