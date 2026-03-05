<script setup lang="ts">
import type { Service } from '@/utils/ct-types';
import { getServicePersons, loadServiceHistory, type PersonServiceHistory } from '@/utils/servicehistory';
import { MultiSelect } from 'primevue';
import { Temporal } from 'temporal-polyfill';
import { ref, watch } from 'vue';

defineProps<{
  services: Service[];
}>();

const selectedServices = ref<Service[]>([]);

watch(selectedServices, async (newValue) => {
  history.value = await getServicePersons(newValue)
  const from = Temporal.Now.plainDateISO().subtract({ months: 18 })
  const to = Temporal.Now.plainDateISO().add({ months: 4 })
  await loadServiceHistory(newValue, from, to, history.value)
})

const history = ref<PersonServiceHistory[]>([]);
</script>

<template>
  <MultiSelect v-model="selectedServices" :options="services" optionLabel="nameTranslated" filter />
  <div v-for="person in history" :key="person.personId">
    {{ person }}
  </div>
</template>