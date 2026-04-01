"""
Kerala Geospatial Environmental Data Engine
Fetches Kerala-specific environmental parameters for accurate LCA calculations
"""

import math
from dataclasses import dataclass
from typing import Dict, Tuple, Optional, List
import json

@dataclass
class EnvironmentalZone:
    """Kerala environmental zone parameters"""
    zone_id: str
    name: str
    rainfall_intensity: float  # mm/year
    avg_humidity: float  # percentage
    avg_temperature: float  # Celsius
    seismic_zone: str  # II, III, IV, V
    wind_speed: float  # m/s
    solar_radiation: float  # kWh/m²/day
    groundwater_depth: float  # meters
    soil_type: str
    
@dataclass
class SiteLocation:
    lat: float
    lon: float
    elevation: float = 0.0
    district: str = ""
    taluk: str = ""

class KeralaEnvironmentalEngine:
    """
    Hyper-local geospatial engine for Kerala construction sites
    Integrates with Environmental Data Code Engine
    """
    
    # Kerala's 14 districts with environmental data
    KERALA_ENVIRONMENTAL_ZONES = {
        'thrissur': EnvironmentalZone(
            zone_id='KL-TCR',
            name='Thrissur District',
            rainfall_intensity=2800,  # mm/year (high rainfall zone)
            avg_humidity=78,
            avg_temperature=27.5,
            seismic_zone='III',
            wind_speed=15.5,
            solar_radiation=5.2,
            groundwater_depth=8.5,
            soil_type='Lateritic & Alluvial'
        ),
        'ernakulam': EnvironmentalZone(
            zone_id='KL-ERK',
            name='Ernakulam District',
            rainfall_intensity=3200,
            avg_humidity=82,
            avg_temperature=28.0,
            seismic_zone='III',
            wind_speed=16.2,
            solar_radiation=5.0,
            groundwater_depth=6.0,
            soil_type='Coastal Alluvial'
        ),
        'kozhikode': EnvironmentalZone(
            zone_id='KL-KOZ',
            name='Kozhikode District',
            rainfall_intensity=3500,
            avg_humidity=85,
            avg_temperature=26.8,
            seismic_zone='III',
            wind_speed=18.5,
            solar_radiation=5.4,
            groundwater_depth=7.2,
            soil_type='Lateritic'
        ),
        'trivandrum': EnvironmentalZone(
            zone_id='KL-TVM',
            name='Thiruvananthapuram District',
            rainfall_intensity=1700,
            avg_humidity=75,
            avg_temperature=29.2,
            seismic_zone='III',
            wind_speed=14.8,
            solar_radiation=5.6,
            groundwater_depth=10.5,
            soil_type='Sandy & Lateritic'
        ),
        'kollam': EnvironmentalZone(
            zone_id='KL-KLM',
            name='Kollam District',
            rainfall_intensity=2200,
            avg_humidity=79,
            avg_temperature=28.5,
            seismic_zone='III',
            wind_speed=15.2,
            solar_radiation=5.5,
            groundwater_depth=8.0,
            soil_type='Lateritic'
        ),
        'alappuzha': EnvironmentalZone(
            zone_id='KL-ALP',
            name='Alappuzha District',
            rainfall_intensity=2400,
            avg_humidity=81,
            avg_temperature=28.2,
            seismic_zone='III',
            wind_speed=16.8,
            solar_radiation=5.1,
            groundwater_depth=4.5,
            soil_type='Coastal Alluvial'
        ),
        'kottayam': EnvironmentalZone(
            zone_id='KL-KTY',
            name='Kottayam District',
            rainfall_intensity=2900,
            avg_humidity=80,
            avg_temperature=27.0,
            seismic_zone='III',
            wind_speed=14.5,
            solar_radiation=5.3,
            groundwater_depth=9.0,
            soil_type='Lateritic'
        ),
        'idukki': EnvironmentalZone(
            zone_id='KL-IDK',
            name='Idukki District',
            rainfall_intensity=4500,
            avg_humidity=88,
            avg_temperature=22.5,
            seismic_zone='IV',  # Higher seismic activity
            wind_speed=12.5,
            solar_radiation=4.8,
            groundwater_depth=15.0,
            soil_type='Rocky & Forest'
        ),
        'pathanamthitta': EnvironmentalZone(
            zone_id='KL-PTA',
            name='Pathanamthitta District',
            rainfall_intensity=2600,
            avg_humidity=77,
            avg_temperature=27.8,
            seismic_zone='III',
            wind_speed=13.8,
            solar_radiation=5.4,
            groundwater_depth=12.0,
            soil_type='Lateritic'
        ),
        'malappuram': EnvironmentalZone(
            zone_id='KL-MLP',
            name='Malappuram District',
            rainfall_intensity=2800,
            avg_humidity=83,
            avg_temperature=27.2,
            seismic_zone='III',
            wind_speed=17.0,
            solar_radiation=5.3,
            groundwater_depth=7.8,
            soil_type='Lateritic & Alluvial'
        ),
        'palakkad': EnvironmentalZone(
            zone_id='KL-PKD',
            name='Palakkad District',
            rainfall_intensity=2000,
            avg_humidity=72,
            avg_temperature=29.5,
            seismic_zone='III',
            wind_speed=13.5,
            solar_radiation=5.7,
            groundwater_depth=11.5,
            soil_type='Black Cotton & Lateritic'
        ),
        'wayanad': EnvironmentalZone(
            zone_id='KL-WYD',
            name='Wayanad District',
            rainfall_intensity=3800,
            avg_humidity=87,
            avg_temperature=23.5,
            seismic_zone='III',
            wind_speed=11.8,
            solar_radiation=4.9,
            groundwater_depth=18.0,
            soil_type='Forest & Lateritic'
        ),
        'kasaragod': EnvironmentalZone(
            zone_id='KL-KSD',
            name='Kasaragod District',
            rainfall_intensity=3200,
            avg_humidity=84,
            avg_temperature=27.0,
            seismic_zone='III',
            wind_speed=19.2,
            solar_radiation=5.5,
            groundwater_depth=6.5,
            soil_type='Lateritic'
        ),
        'kannur': EnvironmentalZone(
            zone_id='KL-KNR',
            name='Kannur District',
            rainfall_intensity=3400,
            avg_humidity=86,
            avg_temperature=26.5,
            seismic_zone='III',
            wind_speed=18.0,
            solar_radiation=5.4,
            groundwater_depth=7.0,
            soil_type='Coastal & Lateritic'
        )
    }
    
    def __init__(self):
        self.seismic_factors = {
            'II': {'zone_factor': 0.10, 'importance': 1.0},
            'III': {'zone_factor': 0.16, 'importance': 1.2},
            'IV': {'zone_factor': 0.24, 'importance': 1.5},
            'V': {'zone_factor': 0.36, 'importance': 1.8}
        }
    
    def get_zone_from_coordinates(self, lat: float, lon: float) -> str:
        """
        Determine Kerala district from coordinates
        Simplified bounding box method
        """
        # Thrissur bounding box
        if 10.3 <= lat <= 10.7 and 76.0 <= lon <= 76.5:
            return 'thrissur'
        # Ernakulam
        elif 9.8 <= lat <= 10.4 and 76.1 <= lon <= 76.8:
            return 'ernakulam'
        # Kozhikode
        elif 11.0 <= lat <= 11.4 and 75.6 <= lon <= 76.2:
            return 'kozhikode'
        # Trivandrum
        elif 8.3 <= lat <= 8.8 and 76.7 <= lon <= 77.3:
            return 'trivandrum'
        # Kollam
        elif 8.7 <= lat <= 9.4 and 76.4 <= lon <= 77.1:
            return 'kollam'
        # Alappuzha
        elif 9.3 <= lat <= 9.7 and 76.2 <= lon <= 76.6:
            return 'alappuzha'
        # Kottayam
        elif 9.4 <= lat <= 10.0 and 76.3 <= lon <= 76.9:
            return 'kottayam'
        # Idukki
        elif 9.5 <= lat <= 10.4 and 76.7 <= lon <= 77.4:
            return 'idukki'
        # Pathanamthitta
        elif 9.0 <= lat <= 9.6 and 76.6 <= lon <= 77.2:
            return 'pathanamthitta'
        # Malappuram
        elif 10.7 <= lat <= 11.5 and 75.8 <= lon <= 76.5:
            return 'malappuram'
        # Palakkad
        elif 10.4 <= lat <= 11.2 and 76.2 <= lon <= 76.9:
            return 'palakkad'
        # Wayanad
        elif 11.5 <= lat <= 12.0 and 75.8 <= lon <= 76.4:
            return 'wayanad'
        # Kasaragod
        elif 12.1 <= lat <= 12.7 and 74.8 <= lon <= 75.5:
            return 'kasaragod'
        # Kannur
        elif 11.6 <= lat <= 12.3 and 75.2 <= lon <= 75.8:
            return 'kannur'
        
        return 'thrissur'  # Default
    
    def get_environmental_data(self, lat: float, lon: float) -> Dict:
        """Fetch complete environmental data for site location"""
        district = self.get_zone_from_coordinates(lat, lon)
        zone = self.KERALA_ENVIRONMENTAL_ZONES.get(district, self.KERALA_ENVIRONMENTAL_ZONES['thrissur'])
        seismic = self.seismic_factors[zone.seismic_zone]
        
        return {
            'location': {
                'district': district,
                'coordinates': {'lat': lat, 'lon': lon}
            },
            'climate': {
                'rainfall_intensity_mm_year': zone.rainfall_intensity,
                'avg_humidity_percent': zone.avg_humidity,
                'avg_temperature_c': zone.avg_temperature,
                'solar_radiation_kwh_m2_day': zone.solar_radiation,
                'wind_speed_m_s': zone.wind_speed
            },
            'geotechnical': {
                'seismic_zone': zone.seismic_zone,
                'zone_factor': seismic['zone_factor'],
                'importance_factor': seismic['importance'],
                'groundwater_depth_m': zone.groundwater_depth,
                'soil_type': zone.soil_type
            },
            'material_recommendations': self._get_material_recommendations(zone)
        }
    
    def _get_material_recommendations(self, zone: EnvironmentalZone) -> Dict:
        """Generate material recommendations based on environmental zone"""
        recommendations = {
            'waterproofing': 'High priority - high rainfall zone',
            'termite_treatment': 'Essential - humid conditions',
            'thermal_insulation': 'Moderate - tropical climate',
            'earthquake_resistance': f"Zone {zone.seismic_zone} requirements",
            'foundation_type': self._get_foundation_recommendation(zone),
            'roof_materials': self._get_roof_recommendations(zone),
            'wall_materials': self._get_wall_recommendations(zone)
        }
        return recommendations
    
    def _get_foundation_recommendation(self, zone: EnvironmentalZone) -> str:
        """Recommend foundation type based on site conditions"""
        if zone.groundwater_depth < 5:
            return "Raft foundation with waterproofing - high water table"
        elif zone.seismic_zone in ['IV', 'V']:
            return "Pile foundation - seismic zone requirements"
        elif zone.soil_type == 'Lateritic':
            return "Strip/Isolated foundation - stable lateritic soil"
        else:
            return "Conventional foundation suitable"
    
    def _get_roof_recommendations(self, zone: EnvironmentalZone) -> List[str]:
        """Recommend roofing materials for Kerala climate"""
        recommendations = []
        
        if zone.rainfall_intensity > 3000:
            recommendations.extend([
                'Clay/Mangalore tiles - excellent drainage',
                'Metal roofing with proper slope',
                'Avoid flat roofs without waterproofing'
            ])
        
        if zone.avg_temperature > 28:
            recommendations.extend([
                'Reflective roofing materials',
                'Double-layer roofing with air gap',
                'Consider green roof for thermal comfort'
            ])
        
        if zone.wind_speed > 17:
            recommendations.append('Wind-resistant roofing - high wind zone')
        
        return recommendations
    
    def _get_wall_recommendations(self, zone: EnvironmentalZone) -> List[str]:
        """Recommend wall materials for Kerala climate"""
        recommendations = []
        
        if zone.avg_humidity > 80:
            recommendations.extend([
                'AAC blocks - moisture resistant',
                'Avoid gypsum in external walls',
                'Provide proper DPC (Damp Proof Course)'
            ])
        
        if zone.avg_temperature > 28:
            recommendations.extend([
                'Hollow concrete blocks - thermal mass',
                'Laterite stone - traditional & effective',
                'Insulated cavity walls'
            ])
        
        if zone.seismic_zone in ['IV', 'V']:
            recommendations.append('Reinforced masonry - seismic zone')
        
        return recommendations
    
    def calculate_operational_carbon(self, 
                                     building_area: float,
                                     wall_u_value: float,
                                     roof_u_value: float,
                                     lat: float, 
                                     lon: float) -> Dict:
        """
        Calculate operational carbon from HVAC based on thermal properties
        Uses degree day method adapted for Kerala climate
        """
        env_data = self.get_environmental_data(lat, lon)
        climate = env_data['climate']
        
        # Kerala-specific cooling degree days (base 25°C)
        temp_diff = max(0, climate['avg_temperature_c'] - 25)
        cooling_degree_days = temp_diff * 365
        
        # HVAC load calculation (simplified)
        # Q = U × A × ΔT × t
        num_floors = max(1, building_area // 100)  # Estimate floors from area
        envelope_area = building_area * 1.4  # Assume 40% vertical envelope
        
        # Wall heat gain
        wall_heat_gain = wall_u_value * envelope_area * temp_diff * 24 * 365  # Wh/year
        
        # Roof heat gain (roof area = floor area / number of floors)
        roof_area = building_area / num_floors
        roof_heat_gain = roof_u_value * roof_area * temp_diff * 24 * 365
        
        # Total cooling load
        total_cooling_load_kwh = (wall_heat_gain + roof_heat_gain) / 1000
        
        # COP (Coefficient of Performance) for AC - assume 3.0
        cop = 3.0
        electrical_energy_kwh = total_cooling_load_kwh / cop
        
        # Carbon factor for Kerala grid (mostly hydro + some thermal)
        grid_carbon_factor = 0.65  # kg CO2/kWh
        
        operational_carbon = electrical_energy_kwh * grid_carbon_factor
        
        return {
            'annual_cooling_load_kwh': round(total_cooling_load_kwh, 2),
            'electrical_consumption_kwh': round(electrical_energy_kwh, 2),
            'annual_operational_carbon_kg': round(operational_carbon, 2),
            'carbon_per_sqm': round(operational_carbon / building_area, 2),
            'assumptions': {
                'cop': cop,
                'grid_carbon_factor': grid_carbon_factor,
                'cooling_degree_days': round(cooling_degree_days, 0),
                'base_temperature_c': 25
            }
        }

# Example usage
if __name__ == '__main__':
    engine = KeralaEnvironmentalEngine()
    
    # Test with Thrissur coordinates
    env_data = engine.get_environmental_data(10.5167, 76.2167)
    print(json.dumps(env_data, indent=2))
    
    # Calculate operational carbon
    carbon_calc = engine.calculate_operational_carbon(
        building_area=150,  # sqm
        wall_u_value=0.45,  # W/m²K
        roof_u_value=0.35,
        lat=10.5167,
        lon=76.2167
    )
    print("\nOperational Carbon Analysis:")
    print(json.dumps(carbon_calc, indent=2))