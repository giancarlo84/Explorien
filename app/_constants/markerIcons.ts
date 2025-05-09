// app/_constants/markerIcons.ts
// Auto-generated map of activity category keys to SVG marker components

import DefaultMarker from '../assets/images/markers/default_marker.svg';

// LAND CATEGORY
import CampingMarker          from '../../assets/images/markers/Land/camping_marker.svg';
import CanyoningMarker        from '../../assets/images/markers/Land/canyoning_marker.svg';
import CavingMarker  from '../../assets/images/markers/Land/caving_marker.svg';
import ClimbingMarker         from '../../assets/images/markers/Land/climbing_marker.svg';
import HikingMarker           from '../../assets/images/markers/Land/hiking_marker.svg';
import MountainBikingMarker   from '../../assets/images/markers/Land/mountain_biking_marker.svg';
import MountaineeringMarker   from '../../assets/images/markers/Land/mountaineering_marker.svg';
import MountedRidingMarker    from '../../assets/images/markers/Land/mounted_riding_marker.svg';
import ScramblingMarker       from '../../assets/images/markers/Land/scrambling_marker.svg';
import TrekkingMarker         from '../../assets/images/markers/Land/trekking_marker.svg';
import ZipliningMarker        from '../../assets/images/markers/Land/ziplining_marker.svg';

// WATER CATEGORY
import CanoeingMarker         from '../../assets/images/markers/Water/canoeing_marker.svg';
import CoasteeringMarker      from '../../assets/images/markers/Water/coasteering_marker.svg';
import KayakingMarker         from '../../assets/images/markers/Water/kayaking_marker.svg';
import PaddleboardingMarker   from '../../assets/images/markers/Water/paddleboard_marker.svg';
import RaftingMarker          from '../../assets/images/markers/Water/rafting_marker.svg';
import SailingMarker          from '../../assets/images/markers/Water/sailing_marker.svg';
import ScubaMarker            from '../../assets/images/markers/Water/scuba_marker.svg';
import SnorkelingMarker       from '../../assets/images/markers/Water/snorkeling_marker.svg';

// AIR CATEGORY
import HandGlidingMarker      from '../../assets/images/markers/Air/hand_gliding_marker.svg';
import HotAirBalloonMarker    from '../../assets/images/markers/Air/hotair_balloon_marker.svg';
import ParachutingMarker      from '../../assets/images/markers/Air/parachuting_marker.svg';
import ParaglidingMarker      from '../../assets/images/markers/Air/paragliding_marker.svg';
import SkydivingMarker        from '../../assets/images/markers/Air/skydiving_marker.svg';
import WingsuitFlyingMarker   from '../../assets/images/markers/Air/wingsuit_flying_marker.svg';

// ICE/SNOW CATEGORY
import IceClimbingMarker      from '../../assets/images/markers/Ice_Snow/ice_climbing_marker.svg';
import NordicSkatingMarker    from '../../assets/images/markers/Ice_Snow/nordic_skating_marker.svg';
import NordicSkiingMarker     from '../../assets/images/markers/Ice_Snow/nordic_skiing_marker.svg';
import SnowboardingMarker     from '../../assets/images/markers/Ice_Snow/snowboarding_marker.svg';
import SnowmobileMarker       from '../../assets/images/markers/Ice_Snow/snowmobile_marker.svg';
import SnowshoeingMarker      from '../../assets/images/markers/Ice_Snow/snowshoeing_marker.svg';

// ATV CATEGORY
import DirtBikingMarker       from '../../assets/images/markers/ATV/dirtbike_marker.svg';
import OffRoadingMarker       from '../../assets/images/markers/ATV/offroad_marker.svg';
import QuadBikingMarker       from '../../assets/images/markers/ATV/quadbike_marker.svg';
import SxsMarker              from '../../assets/images/markers/ATV/sxs_marker.svg';

// URBAN CATEGORY
import ElectricScooterMarker  from '../../assets/images/markers/Urban/electric_scooter_marker.svg';
import GeocachingMarker       from '../../assets/images/markers/Urban/geocaching_marker.svg';
import ParkourMarker          from '../../assets/images/markers/Urban/parkour_marker.svg';
import ScooterMarker          from '../../assets/images/markers/Urban/scooter_marker.svg';
import SkatingMarker          from '../../assets/images/markers/Urban/skating_marker.svg';
import UrbanCyclingMarker     from '../../assets/images/markers/Urban/urban_cycling_marker.svg';
import UrbanHikingMarker      from '../../assets/images/markers/Urban/urban_hiking_marker.svg';

// Export map
const markerIcons: Record<string, React.FC<{ width: number; height: number }>> = {
  // Land
  camping:         CampingMarker,
  canyoning:       CanyoningMarker,
  caving:          CavingMarker,
  climbing:        ClimbingMarker,
  hiking:          HikingMarker,
  mountainBiking:  MountainBikingMarker,
  mountaineering:  MountaineeringMarker,
  mountedRiding:   MountedRidingMarker,
  scrambling:      ScramblingMarker,
  trekking:        TrekkingMarker,
  ziplining:       ZipliningMarker,

  // Water
  canoeing:     CanoeingMarker,
  coasteering:  CoasteeringMarker,
  kayaking:     KayakingMarker,
  rafting:      RaftingMarker,
  sailing:      SailingMarker,
  scuba:        ScubaMarker,
  snorkeling:   SnorkelingMarker,

  // Air
  handGliding:     HandGlidingMarker,
  hotAirBalloon:   HotAirBalloonMarker,
  parachuting:     ParachutingMarker,
  paragliding:     ParaglidingMarker,
  skydiving:       SkydivingMarker,
  wingsuitFlying:  WingsuitFlyingMarker,

  // Ice/Snow
  iceClimbing:  IceClimbingMarker,
  nordicSkating: NordicSkatingMarker,
  nordicSkiing:  NordicSkiingMarker,
  snowboarding:  SnowboardingMarker,
  snowmobile:    SnowmobileMarker,
  snowshoeing:   SnowshoeingMarker,

  // ATV
  dirtBiking:  DirtBikingMarker,
  offRoading:  OffRoadingMarker,
  quadBiking:  QuadBikingMarker,
  sxs:         SxsMarker,

  // Urban
  electricScooter: ElectricScooterMarker,
  geocaching:      GeocachingMarker,
  parkour:         ParkourMarker,
  scooter:         ScooterMarker,
  skating:         SkatingMarker,
  urbanCycling:    UrbanCyclingMarker,
  urbanHiking:     UrbanHikingMarker,
};

export default markerIcons;

