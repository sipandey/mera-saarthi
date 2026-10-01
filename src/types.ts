export type Role = 'customer' | 'owner' | 'admin';
export type Hire = 'local' | 'outstation';
export type VehicleType = 'Hatchback' | 'Sedan' | 'SUV' | 'Van';
export type Cab = {
  id: string; ownerId: string; ownerName: string; phone: string; name: string;
  type: VehicleType; seats: number; available: boolean; hourly: number; fullDay: number; perKm: number;
  blocked?: boolean;
};
export type Booking = {
  id: string; cabId: string; cabName: string; ownerName: string; ownerPhone: string; customerName: string; customerPhone?: string;
  kind: Hire; vehicleType: VehicleType; date: string; time: string; hours: number; pickupArea: string; destination: string;
  km: number; estimate: number; status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
};
export type Account = { id: string; role: Role; full_name: string; phone: string; is_blocked: boolean };
export type Store = { cabs: Cab[]; bookings: Booking[]; blockedOwners: string[]; blockedCustomers: string[]; blockedVehicles: string[]; customerName: string; profiles: Account[] };

