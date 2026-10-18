/** One window in which the expert can take new work, shared by all services */
export interface AvailabilitySlot {
  id: string
  startAt: string
  endAt: string
  status: 'OPEN'
}

/** Whether the expert takes new requests for one service */
export interface ServiceAvailability {
  serviceCode: string
  serviceName: string
  qualificationStatus: string
  acceptingRequests: boolean
  /** The service is approved, so requests can be turned on */
  canTurnOn: boolean
}

export interface MyAvailability {
  slots: AvailabilitySlot[]
  services: ServiceAvailability[]
  minHours: number
  maxHours: number
  maxOpenSlots: number
  maxDaysAhead: number
}
