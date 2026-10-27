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
  /** Cases the expert runs at once, shared by all services; 0 until set */
  capacity: number
  /** Accepted cases holding a slot, kept by the case flow */
  activeCases: number
  maxCapacity: number
  services: ServiceAvailability[]
}
