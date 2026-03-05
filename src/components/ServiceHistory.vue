<script setup lang="ts">
import { MemberStatus, type Service } from '@/utils/ct-types.d';
import { getServicePersons, loadServiceHistory, type PersonServiceHistory, type ServiceHistoryGroup } from '@/utils/servicehistory';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import MultiSelect from 'primevue/multiselect';
import { Temporal } from 'temporal-polyfill';
import { computed, ref, watch } from 'vue';

defineProps<{
  services: Service[];
}>();

const selectedServices = ref<Service[]>([]);

const history = ref<PersonServiceHistory[]>([]);

watch(selectedServices, async (newValue) => {
  history.value = await getServicePersons(newValue)
  const from = Temporal.Now.plainDateISO().subtract({ months: 18 })
  const to = Temporal.Now.plainDateISO().add({ months: 4 })
  await loadServiceHistory(newValue, from, to, history.value)
})

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
  <div class="flex flex-row items-center gap-4 p-4">
    <div class="text-xl">Diensthistorie</div>
    <MultiSelect v-model="selectedServices" :options="services" optionLabel="nameTranslated" filter
      placeholder="Dienste auswählen" />
    <Button icon="pi pi-refresh" />
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