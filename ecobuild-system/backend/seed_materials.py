#!/usr/bin/env python3
"""
Database Seeding Script for EcoBuild
=====================================
Populates MongoDB with accurate civil engineering material data.
Rates updated to 2026 Kerala market rates.

Scientific References:
- Cement: IS 12269, ~0.9 kg CO2/kg for OPC, ~0.4-0.6 for blended cements
- Steel: ~2.5 kg CO2/kg for primary steel
- Aggregates: ~0.05-0.15 kg CO2/tonne-km for transport
- Concrete: ~350-450 kg CO2/m³ depending on mix design

Rate Sources (2026):
- Cement: Kerala Cement Dealers Association 2026
- Steel: BigMint India Steel Index 2026
- Sand/Aggregates: Kerala Quarry Owners Association 2026
- Masonry: AAC Block Manufacturers Kerala 2026
"""

import sys
sys.path.insert(0, '.')

from database import get_materials_collection
from datetime import datetime

# Accurate material data with proper units and scientific values
MATERIALS_DATA = [
    # ========== CEMENT (IS 12269) - 2026 Kerala Rates ==========
    {
        "name": "OPC 53 Grade Cement",
        "category": "cement",
        "subcategory": "Ordinary Portland Cement",
        "description": "High strength cement for RCC work, IS 12269 compliant",
        "financial_properties": {
            "cost_per_unit": 420,
            "unit_type": "bag",
            "currency": "INR",
            "retail_price": 430,
            "wholesale_price": 410,
            "bulk_price": 400,
            "gst_rate": 28,
            "minimum_order_quantity": 50,
            "price_volatility": "Medium",
            "price_trend": "Stable"
        },
        "environmental_properties": {
            "embodied_carbon": 0.93,
            "embodied_energy": 4.5,
            "recycled_content": 0,
            "recyclable": True,
            "epd_available": True
        },
        "physical_properties": {
            "density": 1440,
            "compressive_strength_28d": 53,
            "fineness": 3700
        },
        "civil_properties": {
            "wastage_percentage": 5,
            "storage_months": 3,
            "shelf_life_months": 6
        },
        "supplier": {
            "supplier_name": "UltraTech Cement Ltd",
            "supplier_location": "Thrissur",
            "lead_time_days": 2,
            "reliability_rating": 9.5
        },
        "is_active": True,
        "tags": ["cement", "OPC53", "RCC", "high-strength"]
    },
    {
        "name": "PPC Fly Ash Cement",
        "category": "cement",
        "subcategory": "Portland Pozzolana Cement",
        "description": "Eco-friendly cement with fly ash, IS 1489 compliant",
        "financial_properties": {
            "cost_per_unit": 370,
            "unit_type": "bag",
            "currency": "INR",
            "retail_price": 380,
            "wholesale_price": 360,
            "bulk_price": 350,
            "gst_rate": 28,
            "minimum_order_quantity": 50,
            "price_volatility": "Low",
            "price_trend": "Decreasing"
        },
        "environmental_properties": {
            "embodied_carbon": 0.58,
            "embodied_energy": 3.2,
            "recycled_content": 35,
            "recyclable": True,
            "epd_available": True
        },
        "physical_properties": {
            "density": 1420,
            "compressive_strength_28d": 43,
            "fineness": 3800
        },
        "civil_properties": {
            "wastage_percentage": 5,
            "storage_months": 3,
            "shelf_life_months": 6
        },
        "supplier": {
            "supplier_name": "Ambuja Cements Ltd",
            "supplier_location": "Kochi",
            "lead_time_days": 3,
            "reliability_rating": 9.0
        },
        "is_active": True,
        "tags": ["cement", "PPC", "fly-ash", "sustainable"]
    },
    {
        "name": "PSC Slag Cement",
        "category": "cement",
        "subcategory": "Portland Slag Cement",
        "description": "Blast furnace slag cement, IS 455 compliant, high durability",
        "financial_properties": {
            "cost_per_unit": 370,
            "unit_type": "bag",
            "currency": "INR",
            "retail_price": 385,
            "wholesale_price": 365,
            "bulk_price": 355,
            "gst_rate": 28,
            "minimum_order_quantity": 50,
            "price_volatility": "Low",
            "price_trend": "Stable"
        },
        "environmental_properties": {
            "embodied_carbon": 0.42,
            "embodied_energy": 2.8,
            "recycled_content": 50,
            "recyclable": True,
            "epd_available": True
        },
        "physical_properties": {
            "density": 1400,
            "compressive_strength_28d": 45,
            "fineness": 3600
        },
        "civil_properties": {
            "wastage_percentage": 5,
            "storage_months": 3,
            "shelf_life_months": 6
        },
        "supplier": {
            "supplier_name": "JSW Cement Ltd",
            "supplier_location": "Palakkad",
            "lead_time_days": 2,
            "reliability_rating": 8.8
        },
        "is_active": True,
        "tags": ["cement", "PSC", "slag", "durable", "sustainable"]
    },
    {
        "name": "OPC 43 Grade Cement",
        "category": "cement",
        "subcategory": "Ordinary Portland Cement",
        "description": "Standard strength cement, IS 8112 compliant",
        "financial_properties": {
            "cost_per_unit": 370,
            "unit_type": "bag",
            "currency": "INR",
            "retail_price": 380,
            "wholesale_price": 360,
            "bulk_price": 350,
            "gst_rate": 28,
            "minimum_order_quantity": 50,
            "price_volatility": "Medium",
            "price_trend": "Stable"
        },
        "environmental_properties": {
            "embodied_carbon": 0.89,
            "embodied_energy": 4.3,
            "recycled_content": 0,
            "recyclable": True,
            "epd_available": True
        },
        "physical_properties": {
            "density": 1440,
            "compressive_strength_28d": 43,
            "fineness": 3500
        },
        "civil_properties": {
            "wastage_percentage": 5,
            "storage_months": 3,
            "shelf_life_months": 6
        },
        "supplier": {
            "supplier_name": "ACC Ltd",
            "supplier_location": "Kochi",
            "lead_time_days": 2,
            "reliability_rating": 9.2
        },
        "is_active": True,
        "tags": ["cement", "OPC43", "standard"]
    },

    # ========== STEEL (IS 1786) ==========
    {
        "name": "TMT Steel Bars Fe 500D",
        "category": "steel",
        "subcategory": "Thermo Mechanically Treated",
        "description": "High ductility steel for RCC, IS 1786 Grade Fe500D",
        "financial_properties": {
            "cost_per_unit": 72,
            "unit_type": "kg",
            "currency": "INR",
            "retail_price": 75,
            "wholesale_price": 70,
            "bulk_price": 68,
            "gst_rate": 18,
            "minimum_order_quantity": 500,
            "price_volatility": "High",
            "price_trend": "Increasing"
        },
        "environmental_properties": {
            "embodied_carbon": 2.5,
            "embodied_energy": 25,
            "recycled_content": 0,
            "recyclable": True,
            "epd_available": True
        },
        "physical_properties": {
            "density": 7850,
            "yield_strength": 500,
            "tensile_strength": 545,
            "elongation": 18
        },
        "civil_properties": {
            "wastage_percentage": 10,
            "bar_lengths": [9, 12],
            "corrosion_resistance": "high"
        },
        "supplier": {
            "supplier_name": "Tata Steel",
            "supplier_location": "Mumbai",
            "lead_time_days": 5,
            "reliability_rating": 9.8
        },
        "is_active": True,
        "tags": ["steel", "TMT", "Fe500", "reinforcement"]
    },
    {
        "name": "TMT Steel Bars Fe 550D",
        "category": "steel",
        "subcategory": "Thermo Mechanically Treated",
        "description": "High strength TMT bars, IS 1786 Grade Fe550D",
        "financial_properties": {
            "cost_per_unit": 76,
            "unit_type": "kg",
            "currency": "INR",
            "retail_price": 79,
            "wholesale_price": 74,
            "bulk_price": 72,
            "gst_rate": 18,
            "minimum_order_quantity": 500,
            "price_volatility": "High",
            "price_trend": "Increasing"
        },
        "environmental_properties": {
            "embodied_carbon": 2.5,
            "embodied_energy": 25,
            "recycled_content": 0,
            "recyclable": True,
            "epd_available": True
        },
        "physical_properties": {
            "density": 7850,
            "yield_strength": 550,
            "tensile_strength": 600,
            "elongation": 16
        },
        "civil_properties": {
            "wastage_percentage": 10,
            "bar_lengths": [9, 12],
            "corrosion_resistance": "high"
        },
        "supplier": {
            "supplier_name": "JSW Steel",
            "supplier_location": "Mumbai",
            "lead_time_days": 5,
            "reliability_rating": 9.5
        },
        "is_active": True,
        "tags": ["steel", "TMT", "Fe550", "high-strength"]
    },
    {
        "name": "Structural Steel MS Channels",
        "category": "steel",
        "subcategory": "Structural Steel",
        "description": "Mild steel channels for structural framing",
        "financial_properties": {
            "cost_per_unit": 65,
            "unit_type": "kg",
            "currency": "INR",
            "retail_price": 68,
            "wholesale_price": 63,
            "bulk_price": 61,
            "gst_rate": 18,
            "minimum_order_quantity": 200,
            "price_volatility": "Medium",
            "price_trend": "Stable"
        },
        "environmental_properties": {
            "embodied_carbon": 2.4,
            "embodied_energy": 24,
            "recycled_content": 10,
            "recyclable": True,
            "epd_available": False
        },
        "physical_properties": {
            "density": 7850,
            "yield_strength": 250,
            "tensile_strength": 410
        },
        "civil_properties": {
            "wastage_percentage": 8,
            "standard_length": 6,
            "section_sizes": ["75x40", "100x50", "125x65"]
        },
        "supplier": {
            "supplier_name": "SAIL",
            "supplier_location": "Kochi",
            "lead_time_days": 7,
            "reliability_rating": 9.0
        },
        "is_active": True,
        "tags": ["steel", "structural", "channels"]
    },
    {
        "name": "Binding Wire 16 Gauge",
        "category": "steel",
        "subcategory": "Binding Wire",
        "description": "GI binding wire for tying reinforcement",
        "financial_properties": {
            "cost_per_unit": 85,
            "unit_type": "kg",
            "currency": "INR",
            "retail_price": 90,
            "wholesale_price": 82,
            "bulk_price": 80,
            "gst_rate": 18,
            "minimum_order_quantity": 25,
            "price_volatility": "Medium",
            "price_trend": "Stable"
        },
        "environmental_properties": {
            "embodied_carbon": 2.8,
            "embodied_energy": 28,
            "recycled_content": 0,
            "recyclable": True,
            "epd_available": False
        },
        "physical_properties": {
            "density": 7850,
            "wire_diameter": 1.2
        },
        "civil_properties": {
            "wastage_percentage": 15,
            "coverage_per_kg": 15
        },
        "supplier": {
            "supplier_name": "Local Hardware",
            "supplier_location": "Thrissur",
            "lead_time_days": 1,
            "reliability_rating": 8.0
        },
        "is_active": True,
        "tags": ["steel", "binding-wire", "GI"]
    },

    # ========== AGGREGATES (IS 383) - 2026 Kerala Rates ==========
    {
        "name": "M-Sand (Manufactured Sand)",
        "category": "aggregates",
        "subcategory": "Fine Aggregate",
        "description": "Crushed stone sand conforming to IS 383 Zone II",
        "financial_properties": {
            "cost_per_unit": 58,
            "unit_type": "cft",
            "currency": "INR",
            "retail_price": 62,
            "wholesale_price": 55,
            "bulk_price": 52,
            "gst_rate": 18,
            "minimum_order_quantity": 200,
            "price_volatility": "Low",
            "price_trend": "Stable"
        },
        "environmental_properties": {
            "embodied_carbon": 0.08,
            "embodied_energy": 0.8,
            "recycled_content": 0,
            "recyclable": True,
            "epd_available": False
        },
        "physical_properties": {
            "density_loose": 1600,
            "density_compact": 1900,
            "fineness_modulus": 2.9,
            "water_absorption": 2.5
        },
        "civil_properties": {
            "wastage_percentage": 8,
            "source": "crusher",
            "zone": "II"
        },
        "supplier": {
            "supplier_name": "Thrissur Aggregate Suppliers",
            "supplier_location": "Kodungalur",
            "lead_time_days": 1,
            "reliability_rating": 8.5
        },
        "is_active": True,
        "tags": ["aggregates", "m-sand", "fine-aggregate"]
    },
    {
        "name": "River Sand (Natural Sand)",
        "category": "aggregates",
        "subcategory": "Fine Aggregate",
        "description": "Natural river sand, IS 383 Zone II",
        "financial_properties": {
            "cost_per_unit": 85,
            "unit_type": "cft",
            "currency": "INR",
            "retail_price": 90,
            "wholesale_price": 80,
            "bulk_price": 75,
            "gst_rate": 18,
            "minimum_order_quantity": 100,
            "price_volatility": "Medium",
            "price_trend": "Increasing"
        },
        "environmental_properties": {
            "embodied_carbon": 0.12,
            "embodied_energy": 1.2,
            "recycled_content": 0,
            "recyclable": True,
            "epd_available": False
        },
        "physical_properties": {
            "density_loose": 1550,
            "density_compact": 1750,
            "fineness_modulus": 2.6,
            "water_absorption": 1.5
        },
        "civil_properties": {
            "wastage_percentage": 8,
            "source": "river",
            "zone": "II"
        },
        "supplier": {
            "supplier_name": "Bharatapuzha River Sand",
            "supplier_location": "Kunnamkulam",
            "lead_time_days": 2,
            "reliability_rating": 7.5
        },
        "is_active": True,
        "tags": ["aggregates", "river-sand", "fine-aggregate"]
    },
    {
        "name": "20mm Crushed Stone Aggregate",
        "category": "aggregates",
        "subcategory": "Coarse Aggregate",
        "description": "Nominal size 20mm crushed stone, IS 383 compliant",
        "financial_properties": {
            "cost_per_unit": 42,
            "unit_type": "cft",
            "currency": "INR",
            "retail_price": 46,
            "wholesale_price": 40,
            "bulk_price": 38,
            "gst_rate": 18,
            "minimum_order_quantity": 300,
            "price_volatility": "Low",
            "price_trend": "Stable"
        },
        "environmental_properties": {
            "embodied_carbon": 0.06,
            "embodied_energy": 0.6,
            "recycled_content": 0,
            "recyclable": True,
            "epd_available": False
        },
        "physical_properties": {
            "density_loose": 1450,
            "density_compact": 1650,
            "aggregates_impact_value": 18,
            "aggregates_crushing_value": 24
        },
        "civil_properties": {
            "wastage_percentage": 6,
            "nominal_size": 20,
            "source": "crusher"
        },
        "supplier": {
            "supplier_name": "Maveli Stone Crushers",
            "supplier_location": "Perumbavoor",
            "lead_time_days": 1,
            "reliability_rating": 8.3
        },
        "is_active": True,
        "tags": ["aggregates", "coarse", "20mm", "crushed-stone"]
    },
    {
        "name": "40mm Crushed Stone Aggregate",
        "category": "aggregates",
        "subcategory": "Coarse Aggregate",
        "description": "Nominal size 40mm for mass concrete",
        "financial_properties": {
            "cost_per_unit": 35,
            "unit_type": "cft",
            "currency": "INR",
            "retail_price": 38,
            "wholesale_price": 32,
            "bulk_price": 30,
            "gst_rate": 18,
            "minimum_order_quantity": 300,
            "price_volatility": "Low",
            "price_trend": "Stable"
        },
        "environmental_properties": {
            "embodied_carbon": 0.05,
            "embodied_energy": 0.5,
            "recycled_content": 0,
            "recyclable": True,
            "epd_available": False
        },
        "physical_properties": {
            "density_loose": 1400,
            "density_compact": 1600
        },
        "civil_properties": {
            "wastage_percentage": 5,
            "nominal_size": 40,
            "source": "crusher"
        },
        "supplier": {
            "supplier_name": "Maveli Stone Crushers",
            "supplier_location": "Perumbavoor",
            "lead_time_days": 1,
            "reliability_rating": 8.3
        },
        "is_active": True,
        "tags": ["aggregates", "coarse", "40mm"]
    },
    {
        "name": "River Sand (Pit Sand)",
        "category": "aggregates",
        "subcategory": "Fine Aggregate",
        "description": "Natural river sand, IS 383 Zone II",
        "financial_properties": {
            "cost_per_unit": 55,
            "unit_type": "cft",
            "currency": "INR",
            "retail_price": 60,
            "wholesale_price": 52,
            "bulk_price": 48,
            "gst_rate": 18,
            "minimum_order_quantity": 200,
            "price_volatility": "High",
            "price_trend": "Increasing"
        },
        "environmental_properties": {
            "embodied_carbon": 0.12,
            "embodied_energy": 1.0,
            "recycled_content": 0,
            "recyclable": False,
            "epd_available": False
        },
        "physical_properties": {
            "density_loose": 1550,
            "density_compact": 1850,
            "fineness_modulus": 2.6,
            "silt_content": 3
        },
        "civil_properties": {
            "wastage_percentage": 8,
            "source": "river",
            "zone": "II"
        },
        "supplier": {
            "supplier_name": "Bharatapuzha River Sand",
            "supplier_location": "Kunnamkulam",
            "lead_time_days": 1,
            "reliability_rating": 7.5
        },
        "is_active": True,
        "tags": ["aggregates", "river-sand", "fine-aggregate"]
    },
    {
        "name": "Recycled Concrete Aggregate (RCA)",
        "category": "aggregates",
        "subcategory": "Recycled Aggregate",
        "description": "Crushed demolished concrete, IS 383 compliant",
        "financial_properties": {
            "cost_per_unit": 28,
            "unit_type": "cft",
            "currency": "INR",
            "retail_price": 32,
            "wholesale_price": 26,
            "bulk_price": 24,
            "gst_rate": 18,
            "minimum_order_quantity": 300,
            "price_volatility": "Low",
            "price_trend": "Decreasing"
        },
        "environmental_properties": {
            "embodied_carbon": 0.03,
            "embodied_energy": 0.3,
            "recycled_content": 100,
            "recyclable": True,
            "epd_available": True
        },
        "physical_properties": {
            "density_loose": 1300,
            "density_compact": 1500,
            "aggregates_impact_value": 22,
            "water_absorption": 5
        },
        "civil_properties": {
            "wastage_percentage": 8,
            "source": "recycled"
        },
        "supplier": {
            "supplier_name": "EcoAggregate Solutions",
            "supplier_location": "Kochi",
            "lead_time_days": 2,
            "reliability_rating": 8.0
        },
        "is_active": True,
        "tags": ["aggregates", "recycled", "RCA", "sustainable"]
    },

    # ========== MASONRY (IS 1077, IS 2185) - 2026 Kerala Rates ==========
    {
        "name": "AAC Blocks 600x200x100mm",
        "category": "masonry",
        "subcategory": "Autoclaved Aerated Concrete",
        "description": "Lightweight AAC blocks, IS 2185 Part 3",
        "financial_properties": {
            "cost_per_unit": 52,
            "unit_type": "nos",
            "currency": "INR",
            "retail_price": 55,
            "wholesale_price": 50,
            "bulk_price": 48,
            "gst_rate": 18,
            "minimum_order_quantity": 500,
            "price_volatility": "Low",
            "price_trend": "Stable"
        },
        "environmental_properties": {
            "embodied_carbon": 0.35,
            "embodied_energy": 2.5,
            "recycled_content": 30,
            "recyclable": True,
            "epd_available": True
        },
        "physical_properties": {
            "density": 550,
            "compressive_strength": 4,
            "thermal_conductivity": 0.12
        },
        "civil_properties": {
            "wastage_percentage": 5,
            "mortar_required": 0.008,
            "installation_rate": 12
        },
        "supplier": {
            "supplier_name": "Aerocon Blocks",
            "supplier_location": "Kochi",
            "lead_time_days": 3,
            "reliability_rating": 8.5
        },
        "is_active": True,
        "tags": ["masonry", "AAC", "lightweight", "insulation"]
    },
    {
        "name": "AAC Blocks 600x200x150mm",
        "category": "masonry",
        "subcategory": "Autoclaved Aerated Concrete",
        "description": "Thicker AAC blocks for external walls",
        "financial_properties": {
            "cost_per_unit": 65,
            "unit_type": "nos",
            "currency": "INR",
            "retail_price": 68,
            "wholesale_price": 62,
            "bulk_price": 60,
            "gst_rate": 18,
            "minimum_order_quantity": 350,
            "price_volatility": "Low",
            "price_trend": "Stable"
        },
        "environmental_properties": {
            "embodied_carbon": 0.35,
            "embodied_energy": 2.5,
            "recycled_content": 30,
            "recyclable": True,
            "epd_available": True
        },
        "physical_properties": {
            "density": 550,
            "compressive_strength": 4,
            "thermal_conductivity": 0.12
        },
        "civil_properties": {
            "wastage_percentage": 5,
            "mortar_required": 0.008,
            "installation_rate": 10
        },
        "supplier": {
            "supplier_name": "Aerocon Blocks",
            "supplier_location": "Kochi",
            "lead_time_days": 3,
            "reliability_rating": 8.5
        },
        "is_active": True,
        "tags": ["masonry", "AAC", "external-wall"]
    },
    {
        "name": "Solid Concrete Blocks 400x200x200mm",
        "category": "masonry",
        "subcategory": "Concrete Masonry Units",
        "description": "Dense concrete blocks, IS 2185 Part 1",
        "financial_properties": {
            "cost_per_unit": 38,
            "unit_type": "nos",
            "currency": "INR",
            "retail_price": 40,
            "wholesale_price": 36,
            "bulk_price": 34,
            "gst_rate": 18,
            "minimum_order_quantity": 500,
            "price_volatility": "Low",
            "price_trend": "Stable"
        },
        "environmental_properties": {
            "embodied_carbon": 0.85,
            "embodied_energy": 5.5,
            "recycled_content": 10,
            "recyclable": True,
            "epd_available": False
        },
        "physical_properties": {
            "density": 1800,
            "compressive_strength": 7.5,
            "thermal_conductivity": 1.0
        },
        "civil_properties": {
            "wastage_percentage": 5,
            "mortar_required": 0.012,
            "installation_rate": 8
        },
        "supplier": {
            "supplier_name": "Urban Brick Co",
            "supplier_location": "Thrissur",
            "lead_time_days": 1,
            "reliability_rating": 8.0
        },
        "is_active": True,
        "tags": ["masonry", "concrete-block", "load-bearing"]
    },
    {
        "name": "Clay bricks (Traditional)",
        "category": "masonry",
        "subcategory": "Burnt Clay Bricks",
        "description": "Traditional clay bricks, IS 1077 Class 7.5",
        "financial_properties": {
            "cost_per_unit": 12,
            "unit_type": "nos",
            "currency": "INR",
            "retail_price": 13,
            "wholesale_price": 11,
            "bulk_price": 10,
            "gst_rate": 18,
            "minimum_order_quantity": 1000,
            "price_volatility": "Medium",
            "price_trend": "Stable"
        },
        "environmental_properties": {
            "embodied_carbon": 0.22,
            "embodied_energy": 2.5,
            "recycled_content": 0,
            "recyclable": True,
            "epd_available": False
        },
        "physical_properties": {
            "density": 1800,
            "compressive_strength": 7.5,
            "water_absorption": 15
        },
        "civil_properties": {
            "wastage_percentage": 10,
            "mortar_required": 0.015,
            "standard_size": "230x115x75",
            "installation_rate": 4
        },
        "supplier": {
            "supplier_name": "Kottayam Brick Industries",
            "supplier_location": "Kottayam",
            "lead_time_days": 2,
            "reliability_rating": 7.5
        },
        "is_active": True,
        "tags": ["masonry", "brick", "traditional"]
    },
    {
        "name": "Fly Ash Bricks",
        "category": "masonry",
        "subcategory": "Manufactured Stone",
        "description": "Eco-friendly bricks from fly ash",
        "financial_properties": {
            "cost_per_unit": 12,
            "unit_type": "nos",
            "currency": "INR",
            "retail_price": 14,
            "wholesale_price": 11,
            "bulk_price": 10,
            "gst_rate": 18,
            "minimum_order_quantity": 500,
            "price_volatility": "Low",
            "price_trend": "Decreasing"
        },
        "environmental_properties": {
            "embodied_carbon": 0.12,
            "embodied_energy": 1.5,
            "recycled_content": 40,
            "recyclable": True,
            "epd_available": True
        },
        "physical_properties": {
            "density": 1600,
            "compressive_strength": 10,
            "water_absorption": 12
        },
        "civil_properties": {
            "wastage_percentage": 5,
            "mortar_required": 0.012,
            "standard_size": "230x115x75",
            "installation_rate": 6
        },
        "supplier": {
            "supplier_name": "Green Brick Co",
            "supplier_location": "Kochi",
            "lead_time_days": 2,
            "reliability_rating": 8.0
        },
        "is_active": True,
        "tags": ["masonry", "fly-ash-brick", "sustainable"]
    },
    {
        "name": "Stone Masonry (Laterite)",
        "category": "masonry",
        "subcategory": "Stone Masonry",
        "description": "Laterite stone for load bearing walls (Kerala style)",
        "financial_properties": {
            "cost_per_unit": 45,
            "unit_type": "cft",
            "currency": "INR",
            "retail_price": 50,
            "wholesale_price": 42,
            "bulk_price": 40,
            "gst_rate": 18,
            "minimum_order_quantity": 500,
            "price_volatility": "Low",
            "price_trend": "Stable"
        },
        "environmental_properties": {
            "embodied_carbon": 0.08,
            "embodied_energy": 0.5,
            "recycled_content": 0,
            "recyclable": True,
            "epd_available": False
        },
        "physical_properties": {
            "density": 2100,
            "compressive_strength": 5,
            "water_absorption": 8
        },
        "civil_properties": {
            "wastage_percentage": 15,
            "mortar_required": 0.03,
            "stone_size": "300x200x150"
        },
        "supplier": {
            "supplier_name": "Malabar Stone Works",
            "supplier_location": "Kasaragod",
            "lead_time_days": 2,
            "reliability_rating": 8.0
        },
        "is_active": True,
        "tags": ["masonry", "laterite", "stone", "traditional"]
    },

    # ========== FINISHING MATERIALS - 2026 Kerala Rates ==========
    {
        "name": "Ceramic Floor Tiles 600x600mm",
        "category": "finish",
        "subcategory": "Floor Tiles",
        "description": "Glazed ceramic floor tiles, IS 15622",
        "financial_properties": {
            "cost_per_unit": 55,
            "unit_type": "sqft",
            "currency": "INR",
            "retail_price": 65,
            "wholesale_price": 50,
            "bulk_price": 45,
            "gst_rate": 28,
            "minimum_order_quantity": 100,
            "price_volatility": "Medium",
            "price_trend": "Stable"
        },
        "environmental_properties": {
            "embodied_carbon": 0.8,
            "embodied_energy": 8,
            "recycled_content": 0,
            "recyclable": False,
            "epd_available": True
        },
        "physical_properties": {
            "water_absorption": 3,
            "thickness": 8,
            "peeling_strength": "Class II"
        },
        "civil_properties": {
            "wastage_percentage": 10,
            "adhesive_required": 2.5,
            "grout_required": 0.3
        },
        "supplier": {
            "supplier_name": "Kajaria Ceramics",
            "supplier_location": "Thrissur",
            "lead_time_days": 3,
            "reliability_rating": 9.0
        },
        "is_active": True,
        "tags": ["finish", "tiles", "ceramic", "flooring"]
    },
    {
        "name": "Vitrified Tiles 600x600mm",
        "category": "finish",
        "subcategory": "Floor Tiles",
        "description": "Full body vitrified tiles, premium finish",
        "financial_properties": {
            "cost_per_unit": 85,
            "unit_type": "sqft",
            "currency": "INR",
            "retail_price": 80,
            "wholesale_price": 60,
            "bulk_price": 55,
            "gst_rate": 28,
            "minimum_order_quantity": 100,
            "price_volatility": "Medium",
            "price_trend": "Stable"
        },
        "environmental_properties": {
            "embodied_carbon": 0.9,
            "embodied_energy": 9,
            "recycled_content": 0,
            "recyclable": False,
            "epd_available": True
        },
        "physical_properties": {
            "water_absorption": 0.5,
            "thickness": 10,
            "peeling_strength": "Class I"
        },
        "civil_properties": {
            "wastage_percentage": 8,
            "adhesive_required": 2.5,
            "grout_required": 0.3
        },
        "supplier": {
            "supplier_name": "Johnson Tiles",
            "supplier_location": "Kochi",
            "lead_time_days": 3,
            "reliability_rating": 9.0
        },
        "is_active": True,
        "tags": ["finish", "vitrified", "premium", "flooring"]
    },
    {
        "name": "Wall Putty (White Cement Based)",
        "category": "finish",
        "subcategory": "Wall Finishing",
        "description": "Premium wall putty for interior/exterior",
        "financial_properties": {
            "cost_per_unit": 35,
            "unit_type": "kg",
            "currency": "INR",
            "retail_price": 38,
            "wholesale_price": 33,
            "bulk_price": 30,
            "gst_rate": 18,
            "minimum_order_quantity": 25,
            "price_volatility": "Low",
            "price_trend": "Stable"
        },
        "environmental_properties": {
            "embodied_carbon": 0.6,
            "embodied_energy": 4,
            "recycled_content": 0,
            "recyclable": False,
            "epd_available": False
        },
        "physical_properties": {
            "coverage": 20,
            "thickness_per_coat": 1.5
        },
        "civil_properties": {
            "wastage_percentage": 15,
            "water_ratio": 0.35,
            "curing_days": 2
        },
        "supplier": {
            "supplier_name": "Birla White",
            "supplier_location": "Kochi",
            "lead_time_days": 2,
            "reliability_rating": 9.0
        },
        "is_active": True,
        "tags": ["finish", "putty", "wall", "priming"]
    },
    {
        "name": "Interior Emulsion Paint",
        "category": "finish",
        "subcategory": "Paints & Coatings",
        "description": "Premium acrylic emulsion for interiors",
        "financial_properties": {
            "cost_per_unit": 320,
            "unit_type": "liter",
            "currency": "INR",
            "retail_price": 350,
            "wholesale_price": 300,
            "bulk_price": 280,
            "gst_rate": 28,
            "minimum_order_quantity": 20,
            "price_volatility": "Medium",
            "price_trend": "Stable"
        },
        "environmental_properties": {
            "embodied_carbon": 2.2,
            "embodied_energy": 18,
            "recycled_content": 0,
            "recyclable": False,
            "epd_available": True
        },
        "physical_properties": {
            "coverage": 140,
            "drying_time": 4,
            "voc_content": 50
        },
        "civil_properties": {
            "wastage_percentage": 20,
            "thickness_dry": 30,
            "coats_required": 2
        },
        "supplier": {
            "supplier_name": "Asian Paints",
            "supplier_location": "Thrissur",
            "lead_time_days": 1,
            "reliability_rating": 9.5
        },
        "is_active": True,
        "tags": ["finish", "paint", "interior", "emulsion"]
    },
    {
        "name": "Exterior Weatherproof Paint",
        "category": "finish",
        "subcategory": "Paints & Coatings",
        "description": "Acrylic smooth exterior paint with silicone",
        "financial_properties": {
            "cost_per_unit": 420,
            "unit_type": "liter",
            "currency": "INR",
            "retail_price": 480,
            "wholesale_price": 400,
            "bulk_price": 380,
            "gst_rate": 28,
            "minimum_order_quantity": 20,
            "price_volatility": "Medium",
            "price_trend": "Stable"
        },
        "environmental_properties": {
            "embodied_carbon": 2.5,
            "embodied_energy": 22,
            "recycled_content": 0,
            "recyclable": False,
            "epd_available": True
        },
        "physical_properties": {
            "coverage": 100,
            "drying_time": 6,
            "water_resistance": "high"
        },
        "civil_properties": {
            "wastage_percentage": 20,
            "thickness_dry": 35,
            "coats_required": 2
        },
        "supplier": {
            "supplier_name": "Berger Paints",
            "supplier_location": "Kochi",
            "lead_time_days": 2,
            "reliability_rating": 9.3
        },
        "is_active": True,
        "tags": ["finish", "paint", "exterior", "weatherproof"]
    },

    # ========== DOORS & WINDOWS ==========
    {
        "name": "Flush Door (Decorative)",
        "category": "door",
        "subcategory": "Timber Doors",
        "description": "MDF flush door with teak veneer",
        "financial_properties": {
            "cost_per_unit": 2500,
            "unit_type": "nos",
            "currency": "INR",
            "retail_price": 3000,
            "wholesale_price": 2400,
            "bulk_price": 2200,
            "gst_rate": 18,
            "minimum_order_quantity": 5,
            "price_volatility": "Medium",
            "price_trend": "Stable"
        },
        "environmental_properties": {
            "embodied_carbon": 15,
            "embodied_energy": 150,
            "recycled_content": 0,
            "recyclable": True,
            "epd_available": False
        },
        "physical_properties": {
            "thickness": 35,
            "size": "2100x900",
            "finish": "veneer"
        },
        "civil_properties": {
            "wastage_percentage": 5,
            "hardware_required": "hinges+latch",
            "fixing_method": "frame"
        },
        "supplier": {
            "supplier_name": "Century Ply",
            "supplier_location": "Kochi",
            "lead_time_days": 5,
            "reliability_rating": 8.8
        },
        "is_active": True,
        "tags": ["door", "flush", "interior"]
    },
    {
        "name": "UPVC Window System",
        "category": "door",
        "subcategory": "UPVC Doors/Windows",
        "description": "White UPVC sliding windows with glass",
        "financial_properties": {
            "cost_per_unit": 900,
            "unit_type": "sqft",
            "currency": "INR",
            "retail_price": 1100,
            "wholesale_price": 850,
            "bulk_price": 800,
            "gst_rate": 28,
            "minimum_order_quantity": 30,
            "price_volatility": "Low",
            "price_trend": "Stable"
        },
        "environmental_properties": {
            "embodied_carbon": 4.5,
            "embodied_energy": 45,
            "recyclable": True,
            "epd_available": True
        },
        "physical_properties": {
            "profile_thickness": 60,
            "glass_thickness": 5,
            "u_value": 2.4
        },
        "civil_properties": {
            "wastage_percentage": 10,
            "includes": "frame+glass+hardware"
        },
        "supplier": {
            "supplier_name": "Fenesta",
            "supplier_location": "Kochi",
            "lead_time_days": 10,
            "reliability_rating": 9.0
        },
        "is_active": True,
        "tags": ["door", "window", "UPVC", "energy-efficient"]
    },

    # ========== ROOFING ==========
    {
        "name": "Metal Roofing Sheets (Color Coated)",
        "category": "roof",
        "subcategory": "Metal Roofing",
        "description": "0.45mm color coated steel sheets",
        "financial_properties": {
            "cost_per_unit": 450,
            "unit_type": "sqft",
            "currency": "INR",
            "retail_price": 520,
            "wholesale_price": 430,
            "bulk_price": 410,
            "gst_rate": 18,
            "minimum_order_quantity": 200,
            "price_volatility": "Medium",
            "price_trend": "Increasing"
        },
        "environmental_properties": {
            "embodied_carbon": 3.2,
            "embodied_energy": 35,
            "recyclable": True,
            "epd_available": True
        },
        "physical_properties": {
            "thickness": 0.45,
            "zinc_coating": 120,
            "colour_coating": 25
        },
        "civil_properties": {
            "wastage_percentage": 15,
            "sheet_length": 3.6,
            "overlap": 10
        },
        "supplier": {
            "supplier_name": "Jindal Steel",
            "supplier_location": "Mumbai",
            "lead_time_days": 7,
            "reliability_rating": 9.2
        },
        "is_active": True,
        "tags": ["roof", "metal-sheet", "color-coated"]
    },

    # ========== INSULATION ==========
    {
        "name": "Glass Wool Insulation",
        "category": "insulation",
        "subcategory": "Thermal Insulation",
        "description": "Glass wool rolls for roof/wall insulation",
        "financial_properties": {
            "cost_per_unit": 18,
            "unit_type": "sqft",
            "currency": "INR",
            "retail_price": 22,
            "wholesale_price": 16,
            "bulk_price": 14,
            "gst_rate": 18,
            "minimum_order_quantity": 100,
            "price_volatility": "Low",
            "price_trend": "Stable"
        },
        "environmental_properties": {
            "embodied_carbon": 1.8,
            "embodied_energy": 15,
            "recycled_content": 30,
            "recyclable": True,
            "epd_available": True
        },
        "physical_properties": {
            "thickness": 50,
            "thermal_conductivity": 0.04,
            "density": 32
        },
        "civil_properties": {
            "wastage_percentage": 10,
            "r_value": 1.4,
            "fire_rating": "Class A"
        },
        "supplier": {
            "supplier_name": "Saint-Gobain",
            "supplier_location": "Kochi",
            "lead_time_days": 5,
            "reliability_rating": 9.0
        },
        "is_active": True,
        "tags": ["insulation", "glass-wool", "thermal"]
    },

    # ========== ADHESIVES & WATERPROOFING ==========
    {
        "name": "Cementitious Waterproofing Coating",
        "category": "adhesive",
        "subcategory": "Waterproofing",
        "description": "Acrylic cementitious waterproofing membrane",
        "financial_properties": {
            "cost_per_unit": 150,
            "unit_type": "kg",
            "currency": "INR",
            "retail_price": 180,
            "wholesale_price": 140,
            "bulk_price": 130,
            "gst_rate": 18,
            "minimum_order_quantity": 25,
            "price_volatility": "Low",
            "price_trend": "Stable"
        },
        "environmental_properties": {
            "embodied_carbon": 0.55,
            "embodied_energy": 5,
            "recyclable": False,
            "epd_available": False
        },
        "physical_properties": {
            "coverage": 2,
            "elastomeric": True,
            "water_proofing": "high"
        },
        "civil_properties": {
            "wastage_percentage": 15,
            "coats_required": 2,
            "curing_time": 24
        },
        "supplier": {
            "supplier_name": "Dr. Fixit",
            "supplier_location": "Thrissur",
            "lead_time_days": 2,
            "reliability_rating": 9.0
        },
        "is_active": True,
        "tags": ["waterproofing", "cementitious", "roof", "bathroom"]
    },
    {
        "name": "Tile Adhesive (Polymer Modified)",
        "category": "adhesive",
        "subcategory": "Tile Adhesives",
        "description": "Polymer modified tile adhesive for all tiles",
        "financial_properties": {
            "cost_per_unit": 45,
            "unit_type": "kg",
            "currency": "INR",
            "retail_price": 55,
            "wholesale_price": 42,
            "bulk_price": 38,
            "gst_rate": 18,
            "minimum_order_quantity": 25,
            "price_volatility": "Low",
            "price_trend": "Stable"
        },
        "environmental_properties": {
            "embodied_carbon": 0.45,
            "embodied_energy": 4,
            "recycled_content": 0,
            "recyclable": False,
            "epd_available": False
        },
        "physical_properties": {
            "coverage": 5,
            "open_time": 20,
            "pot_life": 3
        },
        "civil_properties": {
            "wastage_percentage": 10,
            "thickness": 6,
            "tile_types": "ceramic+porcelain+stone"
        },
        "supplier": {
            "supplier_name": "Laticrete",
            "supplier_location": "Kochi",
            "lead_time_days": 3,
            "reliability_rating": 9.0
        },
        "is_active": True,
        "tags": ["adhesive", "tile-adhesive", "flooring"]
    },
]

def seed_database():
    """Clear and populate the materials database with accurate data."""
    c = get_materials_collection()
    
    print("Clearing existing materials...")
    c.delete_many({})
    
    print(f"Inserting {len(MATERIALS_DATA)} materials...")
    for mat in MATERIALS_DATA:
        mat['created_at'] = datetime.utcnow()
        mat['updated_at'] = datetime.utcnow()
    
    result = c.insert_many(MATERIALS_DATA)
    print(f"Inserted {len(result.inserted_ids)} materials successfully!")
    
    print(f"\nTotal materials in DB: {c.count_documents({})}")
    
    print("\nCategory breakdown:")
    for cat in c.distinct('category'):
        count = c.count_documents({'category': cat})
        print(f"  {cat}: {count}")

if __name__ == '__main__':
    seed_database()
