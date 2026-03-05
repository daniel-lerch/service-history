import { churchtoolsClient } from '@churchtools/churchtools-client'
import { type Event, type GroupMember, MemberStatus, type Service } from './ct-types.d'
import { Temporal } from 'temporal-polyfill'

export type ServiceHistoryGroup = {
  id: number
  name: string
  memberStatus: MemberStatus
  comment: string | null | undefined
}

export type PersonServiceHistory = {
  personId: number
  firstName: string
  lastName: string
  groups: ServiceHistoryGroup[]
  services: {
    serviceId: number
    date: Temporal.PlainDate
  }[]
}

export async function getServicePersons(services: Service[]): Promise<PersonServiceHistory[]> {
  const groupIds = Array.from(new Set(services.flatMap((service) => service.groupIds || [])))
  const groupMembers = await Promise.all(
    groupIds.map((id) => churchtoolsClient.getAllPages<GroupMember>(`/groups/${id}/members`)),
  )

  // Group results by person id
  const personMap = new Map<number, PersonServiceHistory>()

  groupMembers.forEach((members) => {
    members.forEach((member) => {
      const personId = parseInt(member.person.domainIdentifier)
      let person = personMap.get(personId)
      if (person === undefined) {
        person = {
          personId: personId,
          firstName: member.person.domainAttributes.firstName,
          lastName: member.person.domainAttributes.lastName,
          groups: [],
          services: [],
        }
        personMap.set(personId, person)
      }

      person.groups.push({
        id: parseInt(member.group.domainIdentifier),
        name: member.group.title,
        memberStatus: member.groupMemberStatus,
        comment: member.comment,
      })
    })
  })

  return Array.from(personMap.values())
}

export async function loadServiceHistory(
  services: Service[],
  from: Temporal.PlainDate,
  to: Temporal.PlainDate,
  history: PersonServiceHistory[],
) {
  const serviceIds = new Set(services.map((service) => service.id))
  const historyByPersonId = new Map(history.map((person) => [person.personId, person]))
  const events = await churchtoolsClient.get<Event[]>(
    `/events?from=${from.toString()}&to=${to.toString()}&include=eventServices`,
  )

  events.forEach((event) => {
    const eventDate = event.startDate ?? event.endDate
    if (eventDate === undefined) {
      return
    }

    event.eventServices?.forEach((eventService) => {
      const serviceId = eventService.serviceId
      if (serviceId === undefined || !serviceIds.has(serviceId)) {
        return
      }

      const personId = parseInt(eventService.person?.domainIdentifier ?? '')
      if (Number.isNaN(personId)) {
        return
      }

      const personHistory = historyByPersonId.get(personId)
      if (personHistory === undefined) {
        return
      }

      personHistory.services.push({
        serviceId,
        date: Temporal.PlainDate.from(eventDate.substring(0, 10)),
      })
    })
  })
}
