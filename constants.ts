import { Unit, UnitType, UnitStatus, RepairPriority, DamageReport } from './types';

// Helper to generate a range of units easily
const generateUnits = (prefix: string, start: number, end: number, type: UnitType, model: string, status: UnitStatus = UnitStatus.ACTIVE): Unit[] => {
  const units: Unit[] = [];
  for (let i = start; i <= end; i++) {
    const num = i < 10 ? `0${i}` : `${i}`;
    units.push({
      id: `${prefix}${num}`,
      name: `${prefix}${num}`,
      type,
      model,
      status
    });
  }
  return units;
};

// Explicit units based on the provided fleet list
const explicitUnits: Unit[] = [
  // GST 01 Series (Trailers per user instruction)
  { id: 'GST 01-01', name: 'GST 01-01', type: UnitType.TRAILER, model: 'Studio Trailer', status: UnitStatus.NEEDS_REPAIR }, // Note: Broken Tank
  ...generateUnits('GST 01-', 2, 5, UnitType.TRAILER, 'Studio Trailer'),
  { id: 'GST 01-06', name: 'GST 01-06', type: UnitType.TRAILER, model: 'Studio Trailer', status: UnitStatus.ACTIVE },
  ...generateUnits('GST 01-', 7, 9, UnitType.TRAILER, 'Studio Trailer'),
  { id: 'GST 01-10', name: 'GST 01-10', type: UnitType.TRAILER, model: 'Studio Trailer', status: UnitStatus.NEEDS_REPAIR }, // Note: Needs Work
  ...generateUnits('GST 01-', 11, 13, UnitType.TRAILER, 'Studio Trailer'),

  // GST 02 Series (Trailers)
  ...generateUnits('GST 02-', 1, 27, UnitType.TRAILER, 'Studio Trailer'),
  { id: 'GST 02-28', name: 'GST 02-28', type: UnitType.TRAILER, model: 'Studio Trailer', status: UnitStatus.OUT_OF_SERVICE }, // Note: Out of Service
  ...generateUnits('GST 02-', 29, 36, UnitType.TRAILER, 'Studio Trailer'),

  // GST 03 Series (Trailers)
  ...generateUnits('GST 03-', 1, 39, UnitType.TRAILER, 'Studio Trailer'),

  // GST 05 Series (Trailers)
  { id: 'GST 05-01', name: 'GST 05-01', type: UnitType.TRAILER, model: '5th Wheel Trailer', status: UnitStatus.ACTIVE }, // Note: Not Needed (Idle)
  ...generateUnits('GST 05-', 2, 5, UnitType.TRAILER, '5th Wheel Trailer'),

  // GHM (Station HMU - Trailers)
  { id: 'GHM 08-01', name: 'GHM 08-01', type: UnitType.TRAILER, model: 'Station HMU', status: UnitStatus.ACTIVE },
  { id: 'GHM 08-02', name: 'GHM 08-02', type: UnitType.TRAILER, model: 'Station HMU', status: UnitStatus.NEEDS_REPAIR }, // Note: Floor Damage
  ...generateUnits('GHM 08-', 3, 10, UnitType.TRAILER, 'Station HMU'),
  { id: 'GHM 09-01', name: 'GHM 09-01', type: UnitType.TRAILER, model: 'Station HMU', status: UnitStatus.ACTIVE },
  ...generateUnits('GHM 10-', 1, 12, UnitType.TRAILER, 'Station HMU'),

  // GDC (3 Axle Day Cabs) - Trucks
  { id: 'GDC 01', name: 'GDC 01', type: UnitType.TRUCK, model: '3 Axle Day Cab', status: UnitStatus.ACTIVE },
  { id: 'GDC 02', name: 'GDC 02', type: UnitType.TRUCK, model: '3 Axle Day Cab', status: UnitStatus.ACTIVE },
  { id: 'GDC 03', name: 'GDC 03', type: UnitType.TRUCK, model: '3 Axle Day Cab', status: UnitStatus.OUT_OF_SERVICE }, // Note: Out of Service
  ...generateUnits('GDC ', 4, 16, UnitType.TRUCK, '3 Axle Day Cab'),
  { id: 'DC 582', name: 'DC 582', type: UnitType.TRUCK, model: '5th Wheel Day Cab', status: UnitStatus.ACTIVE },
  { id: 'WDC 04', name: 'WDC 04', type: UnitType.TRUCK, model: 'Day Cab', status: UnitStatus.ACTIVE },

  // Sleeper Tractors - Trucks
  { id: 'GSC 01', name: 'GSC 01', type: UnitType.TRUCK, model: 'Sleeper Tractor', status: UnitStatus.ACTIVE },
  { id: 'GSC 02', name: 'GSC 02', type: UnitType.TRUCK, model: 'Sleeper Tractor', status: UnitStatus.ACTIVE },

  // Stakebeds - Trucks
  ...generateUnits('GLSB 12-', 1, 2, UnitType.TRUCK, '12\' Stakebed'),
  { id: 'GLSB 12-03', name: 'GLSB 12-03', type: UnitType.TRUCK, model: '12\' Stakebed', status: UnitStatus.OUT_OF_SERVICE }, // Note: Missing
  ...generateUnits('GLSB 12-', 4, 13, UnitType.TRUCK, '12\' Stakebed'),
  { id: 'GLSB 12-501', name: 'GLSB 12-501', type: UnitType.TRUCK, model: '12\' Stakebed', status: UnitStatus.ACTIVE },

  // Honeywagons - Trailers
  ...generateUnits('GHW ', 1, 9, UnitType.TRAILER, 'Honeywagon'),

  // Semi Wardrobe - Trailers
  ...generateUnits('GWT ', 1, 7, UnitType.TRAILER, 'Semi Wardrobe'),

  // Shorty Forty - Trucks (Implicitly "everything else")
  ...generateUnits('GSV ', 1, 18, UnitType.TRUCK, 'Shorty Forty'),
  { id: 'GSV 19', name: 'GSV 19', type: UnitType.TRUCK, model: 'Shorty Forty', status: UnitStatus.NEEDS_REPAIR }, // Note: Wiring Issues
  ...generateUnits('GSV ', 20, 22, UnitType.TRUCK, 'Shorty Forty'),
  { id: 'SV 183 BI', name: 'SV 183 BI', type: UnitType.TRUCK, model: 'Shorty Forty', status: UnitStatus.ACTIVE },

  // 30' Camera Truck - Trucks
  ...generateUnits('GCT ', 1, 5, UnitType.TRUCK, '30\' Camera Truck'),

  // Crew Cab (Single Tank / 60 Gallons) - Trucks
  { id: 'GSD 01', name: 'GSD 01', type: UnitType.TRUCK, model: '26\' Crew Cab', status: UnitStatus.NEEDS_REPAIR }, // Note: Needs Repair
  ...generateUnits('GSD ', 2, 9, UnitType.TRUCK, '26\' Crew Cab'),

  // Crew Cab Box Truck (10-ton) - Trucks
  ...generateUnits('GGT ', 1, 4, UnitType.TRUCK, '30\' Crew Cab Box'),

  // Production Van - Trucks
  { id: 'GPV 01', name: 'GPV 01', type: UnitType.TRUCK, model: 'Production Van', status: UnitStatus.ACTIVE },
  { id: 'GPV 02', name: 'GPV 02', type: UnitType.TRUCK, model: 'Production Van', status: UnitStatus.ACTIVE },

  // Misc
  // GOT -> Trailers
  { id: 'G OT 101', name: 'G OT 101', type: UnitType.TRAILER, model: 'One Ton', status: UnitStatus.ACTIVE },
  { id: 'G OT 102', name: 'G OT 102', type: UnitType.TRAILER, model: 'One Ton', status: UnitStatus.ACTIVE },
  
  // EPS -> Trailers
  { id: 'G-EPS 01', name: 'G-EPS 01', type: UnitType.TRAILER, model: 'Generator', status: UnitStatus.ACTIVE },
  
  // GSR -> Truck
  { id: 'GSR 01', name: 'GSR 01', type: UnitType.TRUCK, model: 'Specialty', status: UnitStatus.NEEDS_REPAIR },
];

export const MOCK_FLEET: Unit[] = explicitUnits;

export const INITIAL_REPORTS: DamageReport[] = [
  {
    id: 'RPT-2024-001',
    unitId: 'GST 01-01',
    timestamp: new Date(Date.now() - 86400000 * 5).toISOString(),
    description: 'Tank is broken/damaged. Leaking fluids.',
    reportedBy: 'Inspection Team',
    priority: RepairPriority.HIGH,
    images: [],
    status: 'OPEN',
    suggestedParts: ['Fuel Tank', 'Mounting Straps']
  },
  {
    id: 'RPT-2024-002',
    unitId: 'GHM 08-02',
    timestamp: new Date(Date.now() - 86400000 * 10).toISOString(),
    description: 'Floor damage detected in main cabin area.',
    reportedBy: 'Cleaning Crew',
    priority: RepairPriority.MEDIUM,
    images: [],
    status: 'OPEN',
    suggestedParts: ['Flooring Panels', 'Adhesive']
  },
  {
    id: 'RPT-2024-003',
    unitId: 'GSV 19',
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
    description: 'Wiring issues causing intermittent lighting failure.',
    reportedBy: 'Driver',
    priority: RepairPriority.HIGH,
    images: [],
    status: 'IN_PROGRESS',
    suggestedParts: ['Wiring Harness', 'Fuses']
  },
  {
    id: 'RPT-2024-004',
    unitId: 'GDC 03',
    timestamp: new Date(Date.now() - 86400000 * 20).toISOString(),
    description: 'Unit marked Out of Service. Major engine failure.',
    reportedBy: 'Shop Foreman',
    priority: RepairPriority.CRITICAL,
    images: [],
    status: 'OPEN',
    suggestedParts: ['Engine Block', 'Pistons']
  }
];