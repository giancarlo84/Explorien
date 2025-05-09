// Debug console logs at the top of markers/index.ts
console.log('Loading markers/index.ts');

try {
  // Try importing the new default marker directly to test
  const TestDefaultMarker = require('../../../assets/images/markers/default_marker.svg');
  console.log('Successfully loaded default SVG:', TestDefaultMarker);
} catch (error) {
  console.error('Failed to load default SVG:', error);
}


// Import all SVG markers using your exact file paths and naming
// LAND CATEGORY
import CampingMarker from '../../../assets/images/markers/Land/camping_marker.svg';
import CanyoningMarker from '../../../assets/images/markers/Land/canyoning_marker.svg';
import CavingMarker from '../../../assets/images/markers/Land/caving_marker.svg';
import ClimbingMarker from '../../../assets/images/markers/Land/climbing_marker.svg';
import HikingMarker from '../../../assets/images/markers/Land/hiking_marker.svg';
import MountainBikingMarker from '../../../assets/images/markers/Land/mountain_biking_marker.svg';
import MountaineeringMarker from '../../../assets/images/markers/Land/mountaineering_marker.svg';
import MountedRidingMarker from '../../../assets/images/markers/Land/mounted_riding_marker.svg';
import ScramblingMarker from '../../../assets/images/markers/Land/scrambling_marker.svg';
import TrekkingMarker from '../../../assets/images/markers/Land/trekking_marker.svg';
import ZipliningMarker from '../../../assets/images/markers/Land/ziplining_marker.svg';

// WATER CATEGORY
import CanoeingMarker from '../../../assets/images/markers/Water/canoeing_marker.svg';
import CoasteeringMarker from '../../../assets/images/markers/Water/coasteering_marker.svg';
import KayakingMarker from '../../../assets/images/markers/Water/kayaking_marker.svg';
import PaddleboardingMarker from '../../../assets/images/markers/Water/paddleboard_marker.svg';
import RaftingMarker from '../../../assets/images/markers/Water/rafting_marker.svg';
import SailingMarker from '../../../assets/images/markers/Water/sailing_marker.svg';
import ScubaMarker from '../../../assets/images/markers/Water/scuba_marker.svg';
import SnorkelingMarker from '../../../assets/images/markers/Water/snorkeling_marker.svg';

// AIR CATEGORY
import HandGlidingMarker from '../../../assets/images/markers/Air/hand_gliding_marker.svg';
import HotairBalloonMarker from '../../../assets/images/markers/Air/hotair_balloon_marker.svg';
import ParachutingMarker from '../../../assets/images/markers/Air/parachuting_marker.svg';
import ParaglidingMarker from '../../../assets/images/markers/Air/paragliding_marker.svg';
import SkydivingMarker from '../../../assets/images/markers/Air/skydiving_marker.svg';
import WingsuitFlyingMarker from '../../../assets/images/markers/Air/wingsuit_flying_marker.svg';

// ICE_SNOW CATEGORY
import IceClimbingMarker from '../../../assets/images/markers/Ice_Snow/ice_climbing_marker.svg';
import NordicSkatingMarker from '../../../assets/images/markers/Ice_Snow/nordic_skating_marker.svg';
import NordicSkiingMarker from '../../../assets/images/markers/Ice_Snow/nordic_skiing_marker.svg';
import SnowboardingMarker from '../../../assets/images/markers/Ice_Snow/snowboarding_marker.svg';
import SnowmobileMarker from '../../../assets/images/markers/Ice_Snow/snowmobile_marker.svg';
import SnowshoeingMarker from '../../../assets/images/markers/Ice_Snow/snowshoeing_marker.svg';

// ALL TERRAIN VEHICLES CATEGORY
import DirtbikeMarker from '../../../assets/images/markers/ATV/dirtbike_marker.svg';
import OffroadMarker from '../../../assets/images/markers/ATV/offroad_marker.svg';
import QuadbikeMarker from '../../../assets/images/markers/ATV/quadbike_marker.svg';
import SxsMarker from '../../../assets/images/markers/ATV/sxs_marker.svg';

// URBAN CATEGORY
import ElectricScooterMarker from '../../../assets/images/markers/Urban/electric_scooter_marker.svg';
import GeocachingMarker from '../../../assets/images/markers/Urban/geocaching_marker.svg';
import ParkourMarker from '../../../assets/images/markers/Urban/parkour_marker.svg';
import ScooterMarker from '../../../assets/images/markers/Urban/scooter_marker.svg';
import SkatingMarker from '../../../assets/images/markers/Urban/skating_marker.svg';
import UrbanCyclingMarker from '../../../assets/images/markers/Urban/urban_cycling_marker.svg';
import UrbanHikingMarker from '../../../assets/images/markers/Urban/urban_hiking_marker.svg';

// DEFAULT MARKER (create one if you don't have it)
import HikingMarkerDefault from '../../../assets/images/markers/Land/hiking_marker.svg'; // Using hiking as default

// Add this color mapping with your specified colors
const categoryColors: { [key: string]: string } = {
  'Land': '#81C784',    // Medium green
  'Water': '#64B5F6',   // Light blue
  'Air': '#FFF59D',     // Pale yellow
  'Ice_Snow': '#E3F2FD', // Very light blue
  'ATV': '#EF9A9A',     // Light red/pink
  'Urban': '#BDBDBD',   // Medium gray
};

// Create dictionary mapping category/activity to SVG components
const markerMap = {
  Land: {
    camping: CampingMarker,
    canyoning: CanyoningMarker,
    caving: CavingMarker,
    climbing: ClimbingMarker,
    hiking: HikingMarker,
    mountainBiking: MountainBikingMarker,
    mountaineering: MountaineeringMarker,
    mountedRiding: MountedRidingMarker,
    scrambling: ScramblingMarker,
    trekking: TrekkingMarker,
    zipLining: ZipliningMarker
  },
  Water: {
    canoeing: CanoeingMarker,
    coasteering: CoasteeringMarker,
    kayaking: KayakingMarker,
    paddleboarding: PaddleboardingMarker,
    rafting: RaftingMarker,
    sailing: SailingMarker,
    scubaDiving: ScubaMarker,
    snorkeling: SnorkelingMarker
  },
  Air: {
    handGliding: HandGlidingMarker,
    hotAirBalloon: HotairBalloonMarker,
    parachuting: ParachutingMarker,
    paragliding: ParaglidingMarker,
    skydiving: SkydivingMarker,
    wingsuitFlying: WingsuitFlyingMarker
  },
  Ice_Snow: {
    iceClimbing: IceClimbingMarker,
    nordicSkating: NordicSkatingMarker,
    nordicSkiing: NordicSkiingMarker,
    snowboarding: SnowboardingMarker,
    snowmobile: SnowmobileMarker,
    snowshoeing: SnowshoeingMarker
  },
  ATV: {
    dirtBiking: DirtbikeMarker,
    offRoading: OffroadMarker,
    quadBiking: QuadbikeMarker,
    sxs: SxsMarker
  },
  Urban: {
    electricScooterRide: ElectricScooterMarker,
    geocaching: GeocachingMarker,
    parkour: ParkourMarker,
    scooterRide: ScooterMarker,
    skating: SkatingMarker,
    urbanCycling: UrbanCyclingMarker,
    urbanHiking: UrbanHikingMarker
  }
};

// Get marker function - returns appropriate SVG component
export const getMarkerSvg = (category: string, activity: string) => {
  // Fix to handle underscores and convert to camelCase
  let activityCamelCase = activity;
  
  // Handle underscore case specifically
  if (activity.includes('_')) {
    const parts = activity.split('_');
    activityCamelCase = parts[0] + parts.slice(1).map(p => 
      p.charAt(0).toUpperCase() + p.slice(1)
    ).join('');
    console.log(`Converted ${activity} to ${activityCamelCase}`);
  } else {
    // Handle other formats (dashes, etc.)
    activityCamelCase = activity
      .replace(/-/g, ' ')
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
      })
      .replace(/\s+/g, '');
  }

  try {
    if (markerMap[category] && markerMap[category][activityCamelCase]) {
      console.log(`Found marker for ${category}/${activityCamelCase}`);
      return markerMap[category][activityCamelCase];
    }
    
    // If not found, log and return default
    console.warn(`No marker found for ${category}/${activityCamelCase}, using default`);
    return HikingMarkerDefault;
  } catch (error) {
    console.error(`Error getting marker for ${category}/${activity}:`, error);
    return HikingMarkerDefault;
  }
};

export default getMarkerSvg;