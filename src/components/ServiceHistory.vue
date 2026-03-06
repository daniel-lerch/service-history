<script setup lang="ts">
import { MemberStatus, type Service } from '@/utils/ct-types.d';
import { getServicePersons, loadServiceHistory, type PersonServiceHistory, type ServiceHistoryGroup } from '@/utils/servicehistory';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import InputNumber from 'primevue/inputnumber';
import MultiSelect from 'primevue/multiselect';
import ToggleSwitch from 'primevue/toggleswitch';
import { Temporal } from 'temporal-polyfill';
import { computed, ref, watch } from 'vue';

defineProps<{
  services: Service[];
}>();

const selectedServices = ref<Service[]>([]);
const beforeMonths = ref(18);
const afterMonths = ref(4);
const autoRefresh = ref(false);
const history = ref<PersonServiceHistory[]>([]);
let refreshIntervalId: number | undefined;

watch(selectedServices, async (newValue) => {
  history.value = await getServicePersons(newValue)
  await refresh()
})

watch([beforeMonths, afterMonths], async () => {
  await refresh()
})

watch(autoRefresh, (enabled) => {
  if (refreshIntervalId !== undefined) {
    clearInterval(refreshIntervalId);
    refreshIntervalId = undefined;
  }

  if (enabled) {
    refreshIntervalId = window.setInterval(() => {
      // Refresh only services in the future to save bandwidth
      const to = Temporal.Now.plainDateISO().add({ months: afterMonths.value })
      loadServiceHistory(selectedServices.value, Temporal.Now.plainDateISO(), to, history.value, false)
    }, 5000);
  }
});

async function refresh() {
  const from = Temporal.Now.plainDateISO().subtract({ months: beforeMonths.value })
  const to = Temporal.Now.plainDateISO().add({ months: afterMonths.value })
  await loadServiceHistory(selectedServices.value, from, to, history.value, true)
}

type HistoryRow = {
  personId: number;
  fullName: string;
  groups: ServiceHistoryGroup[];
  lastServiceDate: string;
  serviceCount: number;
};

const historyRows = computed<HistoryRow[]>(() => {
  return history.value.map((person) => {
    const lastServiceDate = person.services.reduce((latest, service) => {
      return Temporal.PlainDate.compare(service.date, latest) > 0 ? service.date : latest;
    }, Temporal.PlainDate.from('1970-01-01'));

    return {
      personId: person.personId,
      fullName: `${person.firstName} ${person.lastName}`,
      groups: person.groups,
      lastServiceDate: lastServiceDate.toString(),
      serviceCount: person.services.length,
    };
  });
});

function formatDate(date: string): string {
  if (date === '1970-01-01') {
    return '-';
  }
  return Temporal.PlainDate.from(date).toLocaleString('de-DE', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function rowClass(data: HistoryRow) {
  if (data.groups.findIndex(group => group.memberStatus !== MemberStatus.ACTIVE) >= 0) {
    return '!text-gray-400';
  }
}
</script>

<template>
  <div class="flex flex-row flex-wrap items-center gap-4 p-4">
    <div class="text-2xl mr-8">Diensthistorie</div>
    <MultiSelect v-model="selectedServices" :options="services" optionLabel="nameTranslated" filter
      placeholder="Dienste auswählen" class="flex-1 min-w-48" />
    <InputNumber v-model="beforeMonths" :min="0" :max="60" suffix=" Monate zurück" showButtons class="w-48!" fluid />
    <InputNumber v-model="afterMonths" :min="0" :max="60" suffix=" Monate voraus" showButtons class="w-48!" fluid />
    <div class="flex items-center gap-2">
      <ToggleSwitch v-model="autoRefresh" />
      <label class="text-sm">Auto. Aktualisieren</label>
    </div>
    <Button icon="pi pi-refresh" @click="refresh" />
  </div>
  <DataTable :value="historyRows" sortMode="single" sortField="lastServiceDate" :sortOrder="1" dataKey="personId"
    class="mt-4" :rowClass="rowClass">
    <Column field="fullName" header="Person" />
    <Column field="lastServiceDate" header="Letzter Dienst" sortable>
      <template #body="{ data }">
        {{ formatDate(data.lastServiceDate) }}
      </template>
    </Column>
    <Column field="serviceCount" header="Anzahl Dienste" sortable />
    <Column header="Kommentar">
      <template #body="{ data }">
        <ul>
          <li v-for="value in data.groups.filter((group: ServiceHistoryGroup) => group.comment)" :key="value.id">
            {{ value.comment }}
          </li>
        </ul>
      </template>
    </Column>
  </DataTable>
</template>