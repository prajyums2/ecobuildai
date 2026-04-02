#!/usr/bin/env python3
"""
Complete Database Seeding Script for EcoBuild
==============================================
Populates MongoDB with accurate civil engineering material data.
All materials have: embodied_carbon, compressive_strength, thermal_conductivity,
durability_years, cost_per_unit, recycled_content — properly standardized.

Units: embodied_carbon = kg CO2 per unit (as sold)
       compressive_strength = MPa
       thermal_conductivity = W/m·K
       durability_years = years
       cost_per_unit = INR (2026 Kerala market rates)

Scientific References:
- Cement: IS 12269, ~0.93 kg CO2/kg for OPC, ~0.58 for PPC, ~0.42 for PSC
- Steel: IS 1786, ~2.5 kg CO2/kg for primary steel
- Concrete: ~350-450 kg CO2/m³ depending on mix
- Aggregates: ~0.05-0.15 kg CO2/tonne-km for transport
- AAC Blocks: ~0.35 kg CO2/unit, thermal conductivity 0.12 W/m·K

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

MATERIALS_DATA = [
    # ========================================================================
    # CEMENT (IS 12269, IS 1489, IS 455, IS 8112)
    # ========================================================================
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
            "embodied_carbon": 46.5,
            "embodied_energy": 225.0,
            "recycled_content": 0,
            "recyclable": True,
            "epd_available": True
        },
        "physical_properties": {
            "density": 1440,
            "specific_gravity": 3.15,
            "compressive_strength": 53,
            "thermal_conductivity": 0.29,
            "fineness": 3700
        },
        "civil_properties": {
            "structural_grade": "53 Grade",
            "design_strength": 53,
            "durability_years": 50,
            "weather_resistance": "High",
            "wastage_percentage": 5,
            "storage_months": 3,
            "shelf_life_months": 6,
            "is_code": "IS 12269:2013",
            "quality_grade": "Standard"
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
        "description": "Eco-friendly cement with fly ash, IS 1489 compliant. Preferred for Kerala construction.",
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
            "embodied_carbon": 29.0,
            "embodied_energy": 160.0,
            "recycled_content": 35,
            "recyclable": True,
            "epd_available": True
        },
        "physical_properties": {
            "density": 1420,
            "specific_gravity": 2.9,
            "compressive_strength": 43,
            "thermal_conductivity": 0.27,
            "fineness": 3800
        },
        "civil_properties": {
            "structural_grade": "43 Grade",
            "design_strength": 43,
            "durability_years": 50,
            "weather_resistance": "Excellent",
            "wastage_percentage": 5,
            "storage_months": 3,
            "shelf_life_months": 6,
            "is_code": "IS 1489 (Part 1):2015",
            "quality_grade": "Standard",
            "green_building_cert": ["GRIHA", "IGBC"]
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
        "description": "Blast furnace slag cement, IS 455 compliant, excellent for marine environments",
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
            "embodied_carbon": 21.0,
            "embodied_energy": 140.0,
            "recycled_content": 50,
            "recyclable": True,
            "epd_available": True
        },
        "physical_properties": {
            "density": 1400,
            "specific_gravity": 2.95,
            "compressive_strength": 45,
            "thermal_conductivity": 0.28,
            "fineness": 3600
        },
        "civil_properties": {
            "structural_grade": "45 Grade",
            "design_strength": 45,
            "durability_years": 60,
            "weather_resistance": "Excellent",
            "wastage_percentage": 5,
            "storage_months": 3,
            "shelf_life_months": 6,
            "is_code": "IS 455:2015",
            "quality_grade": "Standard",
            "green_building_cert": ["GRIHA", "IGBC", "LEED"]
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
        "description": "Standard strength cement for general construction, IS 8112 compliant",
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
            "embodied_carbon": 44.5,
            "embodied_energy": 215.0,
            "recycled_content": 0,
            "recyclable": True,
            "epd_available": True
        },
        "physical_properties": {
            "density": 1440,
            "specific_gravity": 3.15,
            "compressive_strength": 43,
            "thermal_conductivity": 0.29,
            "fineness": 3500
        },
        "civil_properties": {
            "structural_grade": "43 Grade",
            "design_strength": 43,
            "durability_years": 50,
            "weather_resistance": "High",
            "wastage_percentage": 5,
            "storage_months": 3,
            "shelf_life_months": 6,
            "is_code": "IS 8112:2013",
            "quality_grade": "Standard"
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

    # ========================================================================
    # STEEL (IS 1786)
    # ========================================================================
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
            "embodied_energy": 25.0,
            "recycled_content": 25,
            "recyclable": True,
            "epd_available": True
        },
        "physical_properties": {
            "density": 7850,
            "specific_gravity": 7.85,
            "compressive_strength": 500,
            "thermal_conductivity": 50.0,
            "yield_strength": 500,
            "tensile_strength": 545,
            "elongation": 18
        },
        "civil_properties": {
            "structural_grade": "Fe500D",
            "design_strength": 500,
            "durability_years": 75,
            "weather_resistance": "High",
            "wastage_percentage": 10,
            "is_code": "IS 1786:2008",
            "quality_grade": "Standard",
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
        "description": "High strength TMT bars for heavy structures, IS 1786 Grade Fe550D",
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
            "embodied_energy": 25.0,
            "recycled_content": 25,
            "recyclable": True,
            "epd_available": True
        },
        "physical_properties": {
            "density": 7850,
            "specific_gravity": 7.85,
            "compressive_strength": 550,
            "thermal_conductivity": 50.0,
            "yield_strength": 550,
            "tensile_strength": 600,
            "elongation": 16
        },
        "civil_properties": {
            "structural_grade": "Fe550D",
            "design_strength": 550,
            "durability_years": 75,
            "weather_resistance": "High",
            "wastage_percentage": 10,
            "is_code": "IS 1786:2008",
            "quality_grade": "Premium",
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
        "name": "TMT Steel Bars Fe 415",
        "category": "steel",
        "subcategory": "Thermo Mechanically Treated",
        "description": "Standard TMT bars for residential construction, IS 1786 Grade Fe415",
        "financial_properties": {
            "cost_per_unit": 68,
            "unit_type": "kg",
            "currency": "INR",
            "retail_price": 71,
            "wholesale_price": 66,
            "bulk_price": 64,
            "gst_rate": 18,
            "minimum_order_quantity": 500,
            "price_volatility": "High",
            "price_trend": "Stable"
        },
        "environmental_properties": {
            "embodied_carbon": 2.5,
            "embodied_energy": 25.0,
            "recycled_content": 25,
            "recyclable": True,
            "epd_available": True
        },
        "physical_properties": {
            "density": 7850,
            "specific_gravity": 7.85,
            "compressive_strength": 415,
            "thermal_conductivity": 50.0,
            "yield_strength": 415,
            "tensile_strength": 485,
            "elongation": 20
        },
        "civil_properties": {
            "structural_grade": "Fe415",
            "design_strength": 415,
            "durability_years": 75,
            "weather_resistance": "Medium",
            "wastage_percentage": 10,
            "is_code": "IS 1786:2008",
            "quality_grade": "Standard",
            "bar_lengths": [9, 12],
            "corrosion_resistance": "medium"
        },
        "supplier": {
            "supplier_name": "SAIL",
            "supplier_location": "Kochi",
            "lead_time_days": 4,
            "reliability_rating": 9.0
        },
        "is_active": True,
        "tags": ["steel", "TMT", "Fe415", "residential"]
    },
    {
        "name": "Structural Steel MS Channels",
        "category": "steel",
        "subcategory": "Structural Steel",
        "description": "Mild steel channels for structural framing, IS 808",
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
            "embodied_energy": 24.0,
            "recycled_content": 10,
            "recyclable": True,
            "epd_available": False
        },
        "physical_properties": {
            "density": 7850,
            "specific_gravity": 7.85,
            "compressive_strength": 250,
            "thermal_conductivity": 50.0,
            "yield_strength": 250,
            "tensile_strength": 410
        },
        "civil_properties": {
            "structural_grade": "E250",
            "design_strength": 250,
            "durability_years": 50,
            "weather_resistance": "Medium",
            "wastage_percentage": 8,
            "is_code": "IS 808:1989",
            "quality_grade": "Standard",
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
        "description": "GI binding wire for tying reinforcement bars",
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
            "embodied_energy": 28.0,
            "recycled_content": 0,
            "recyclable": True,
            "epd_available": False
        },
        "physical_properties": {
            "density": 7850,
            "specific_gravity": 7.85,
            "compressive_strength": 250,
            "thermal_conductivity": 50.0,
            "wire_diameter": 1.2
        },
        "civil_properties": {
            "design_strength": 250,
            "durability_years": 30,
            "weather_resistance": "Medium",
            "wastage_percentage": 15,
            "is_code": "IS 280:2007",
            "quality_grade": "Standard",
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

    # ========================================================================
    # AGGREGATES (IS 383)
    # ========================================================================
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
            "gst_rate": 5,
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
            "density": 1600,
            "specific_gravity": 2.65,
            "compressive_strength": 0,
            "thermal_conductivity": 0.25,
            "fineness_modulus": 2.9,
            "water_absorption": 2.5
        },
        "civil_properties": {
            "durability_years": 100,
            "weather_resistance": "High",
            "wastage_percentage": 8,
            "is_code": "IS 383:2016",
            "quality_grade": "Standard",
            "source": "crusher",
            "zone": "II"
        },
        "supplier": {
            "supplier_name": "Thrissur Aggregate Suppliers",
            "supplier_location": "Kodungallur",
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
            "gst_rate": 5,
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
            "density": 1550,
            "specific_gravity": 2.65,
            "compressive_strength": 0,
            "thermal_conductivity": 0.25,
            "fineness_modulus": 2.6,
            "water_absorption": 1.5
        },
        "civil_properties": {
            "durability_years": 100,
            "weather_resistance": "High",
            "wastage_percentage": 8,
            "is_code": "IS 383:2016",
            "quality_grade": "Standard",
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
            "gst_rate": 5,
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
            "density": 1500,
            "specific_gravity": 2.7,
            "compressive_strength": 0,
            "thermal_conductivity": 1.5,
            "water_absorption": 1.0
        },
        "civil_properties": {
            "durability_years": 100,
            "weather_resistance": "High",
            "wastage_percentage": 6,
            "is_code": "IS 383:2016",
            "quality_grade": "Standard",
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
        "description": "Nominal size 40mm for mass concrete and foundations",
        "financial_properties": {
            "cost_per_unit": 35,
            "unit_type": "cft",
            "currency": "INR",
            "retail_price": 38,
            "wholesale_price": 32,
            "bulk_price": 30,
            "gst_rate": 5,
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
            "density": 1450,
            "specific_gravity": 2.7,
            "compressive_strength": 0,
            "thermal_conductivity": 1.5,
            "water_absorption": 0.8
        },
        "civil_properties": {
            "durability_years": 100,
            "weather_resistance": "High",
            "wastage_percentage": 5,
            "is_code": "IS 383:2016",
            "quality_grade": "Standard",
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
        "name": "Recycled Concrete Aggregate (RCA)",
        "category": "aggregates",
        "subcategory": "Recycled Aggregate",
        "description": "Crushed demolished concrete, IS 383 compliant, sustainable option",
        "financial_properties": {
            "cost_per_unit": 28,
            "unit_type": "cft",
            "currency": "INR",
            "retail_price": 32,
            "wholesale_price": 26,
            "bulk_price": 24,
            "gst_rate": 5,
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
            "density": 1350,
            "specific_gravity": 2.4,
            "compressive_strength": 0,
            "thermal_conductivity": 1.2,
            "water_absorption": 5.0
        },
        "civil_properties": {
            "durability_years": 50,
            "weather_resistance": "Medium",
            "wastage_percentage": 8,
            "is_code": "IS 383:2016",
            "quality_grade": "Standard",
            "source": "recycled",
            "green_building_cert": ["GRIHA", "IGBC", "LEED"]
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

    # ========================================================================
    # MASONRY (IS 2185, IS 1077, IS 12894)
    # ========================================================================
    {
        "name": "AAC Blocks 600x200x100mm",
        "category": "masonry",
        "subcategory": "Autoclaved Aerated Concrete",
        "description": "Lightweight AAC blocks, IS 2185 Part 3, excellent thermal insulation",
        "financial_properties": {
            "cost_per_unit": 52,
            "unit_type": "nos",
            "currency": "INR",
            "retail_price": 55,
            "wholesale_price": 50,
            "bulk_price": 48,
            "gst_rate": 5,
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
            "specific_gravity": 0.55,
            "compressive_strength": 4.0,
            "thermal_conductivity": 0.12,
            "water_absorption": 25.0
        },
        "civil_properties": {
            "structural_grade": "Grade 3",
            "design_strength": 4.0,
            "durability_years": 60,
            "weather_resistance": "High",
            "wastage_percentage": 5,
            "is_code": "IS 2185 (Part 3):2013",
            "quality_grade": "Standard",
            "mortar_required": 0.008,
            "installation_rate": 12,
            "green_building_cert": ["GRIHA", "IGBC"]
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
        "description": "Thicker AAC blocks for external walls, IS 2185 Part 3",
        "financial_properties": {
            "cost_per_unit": 65,
            "unit_type": "nos",
            "currency": "INR",
            "retail_price": 68,
            "wholesale_price": 62,
            "bulk_price": 60,
            "gst_rate": 5,
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
            "specific_gravity": 0.55,
            "compressive_strength": 4.0,
            "thermal_conductivity": 0.12,
            "water_absorption": 25.0
        },
        "civil_properties": {
            "structural_grade": "Grade 3",
            "design_strength": 4.0,
            "durability_years": 60,
            "weather_resistance": "High",
            "wastage_percentage": 5,
            "is_code": "IS 2185 (Part 3):2013",
            "quality_grade": "Standard",
            "mortar_required": 0.008,
            "installation_rate": 10,
            "green_building_cert": ["GRIHA", "IGBC"]
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
        "name": "AAC Blocks 600x200x200mm",
        "category": "masonry",
        "subcategory": "Autoclaved Aerated Concrete",
        "description": "Thickest AAC blocks for load-bearing external walls",
        "financial_properties": {
            "cost_per_unit": 78,
            "unit_type": "nos",
            "currency": "INR",
            "retail_price": 82,
            "wholesale_price": 75,
            "bulk_price": 72,
            "gst_rate": 5,
            "minimum_order_quantity": 300,
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
            "specific_gravity": 0.55,
            "compressive_strength": 4.0,
            "thermal_conductivity": 0.12,
            "water_absorption": 25.0
        },
        "civil_properties": {
            "structural_grade": "Grade 3",
            "design_strength": 4.0,
            "durability_years": 60,
            "weather_resistance": "High",
            "wastage_percentage": 5,
            "is_code": "IS 2185 (Part 3):2013",
            "quality_grade": "Standard",
            "mortar_required": 0.008,
            "installation_rate": 8,
            "green_building_cert": ["GRIHA", "IGBC"]
        },
        "supplier": {
            "supplier_name": "Aerocon Blocks",
            "supplier_location": "Kochi",
            "lead_time_days": 3,
            "reliability_rating": 8.5
        },
        "is_active": True,
        "tags": ["masonry", "AAC", "load-bearing"]
    },
    {
        "name": "Solid Concrete Blocks 400x200x200mm",
        "category": "masonry",
        "subcategory": "Concrete Masonry Units",
        "description": "Dense concrete blocks for load-bearing walls, IS 2185 Part 1",
        "financial_properties": {
            "cost_per_unit": 38,
            "unit_type": "nos",
            "currency": "INR",
            "retail_price": 40,
            "wholesale_price": 36,
            "bulk_price": 34,
            "gst_rate": 5,
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
            "specific_gravity": 1.8,
            "compressive_strength": 7.5,
            "thermal_conductivity": 1.0,
            "water_absorption": 10.0
        },
        "civil_properties": {
            "structural_grade": "Grade 5",
            "design_strength": 7.5,
            "durability_years": 50,
            "weather_resistance": "High",
            "wastage_percentage": 5,
            "is_code": "IS 2185 (Part 1):2013",
            "quality_grade": "Standard",
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
        "name": "Hollow Concrete Blocks 400x200x200mm",
        "category": "masonry",
        "subcategory": "Concrete Masonry Units",
        "description": "Hollow blocks for partition walls, IS 2185 Part 2",
        "financial_properties": {
            "cost_per_unit": 32,
            "unit_type": "nos",
            "currency": "INR",
            "retail_price": 35,
            "wholesale_price": 30,
            "bulk_price": 28,
            "gst_rate": 5,
            "minimum_order_quantity": 500,
            "price_volatility": "Low",
            "price_trend": "Stable"
        },
        "environmental_properties": {
            "embodied_carbon": 0.65,
            "embodied_energy": 4.5,
            "recycled_content": 15,
            "recyclable": True,
            "epd_available": False
        },
        "physical_properties": {
            "density": 1400,
            "specific_gravity": 1.4,
            "compressive_strength": 5.0,
            "thermal_conductivity": 0.7,
            "water_absorption": 12.0
        },
        "civil_properties": {
            "structural_grade": "Grade 3.5",
            "design_strength": 5.0,
            "durability_years": 50,
            "weather_resistance": "Medium",
            "wastage_percentage": 5,
            "is_code": "IS 2185 (Part 2):2013",
            "quality_grade": "Standard",
            "mortar_required": 0.010,
            "installation_rate": 10
        },
        "supplier": {
            "supplier_name": "Urban Brick Co",
            "supplier_location": "Thrissur",
            "lead_time_days": 1,
            "reliability_rating": 8.0
        },
        "is_active": True,
        "tags": ["masonry", "hollow-block", "partition"]
    },
    {
        "name": "Clay Bricks (Traditional)",
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
            "gst_rate": 5,
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
            "specific_gravity": 1.8,
            "compressive_strength": 7.5,
            "thermal_conductivity": 0.70,
            "water_absorption": 15.0
        },
        "civil_properties": {
            "structural_grade": "Class 7.5",
            "design_strength": 7.5,
            "durability_years": 100,
            "weather_resistance": "Medium",
            "wastage_percentage": 10,
            "is_code": "IS 1077:1992",
            "quality_grade": "Standard",
            "standard_size": "230x115x75",
            "mortar_required": 0.015,
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
        "description": "Eco-friendly bricks from fly ash, IS 12894 compliant",
        "financial_properties": {
            "cost_per_unit": 12,
            "unit_type": "nos",
            "currency": "INR",
            "retail_price": 14,
            "wholesale_price": 11,
            "bulk_price": 10,
            "gst_rate": 5,
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
            "specific_gravity": 1.6,
            "compressive_strength": 10.0,
            "thermal_conductivity": 0.65,
            "water_absorption": 12.0
        },
        "civil_properties": {
            "structural_grade": "Class 10",
            "design_strength": 10.0,
            "durability_years": 75,
            "weather_resistance": "High",
            "wastage_percentage": 5,
            "is_code": "IS 12894:2010",
            "quality_grade": "Standard",
            "standard_size": "230x115x75",
            "mortar_required": 0.012,
            "installation_rate": 6,
            "green_building_cert": ["GRIHA", "IGBC"]
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
        "description": "Laterite stone for load-bearing walls, traditional Kerala construction",
        "financial_properties": {
            "cost_per_unit": 45,
            "unit_type": "cft",
            "currency": "INR",
            "retail_price": 50,
            "wholesale_price": 42,
            "bulk_price": 40,
            "gst_rate": 5,
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
            "specific_gravity": 2.1,
            "compressive_strength": 5.0,
            "thermal_conductivity": 0.85,
            "water_absorption": 8.0
        },
        "civil_properties": {
            "structural_grade": "Grade 3",
            "design_strength": 5.0,
            "durability_years": 100,
            "weather_resistance": "High",
            "wastage_percentage": 15,
            "is_code": "IS 1905:1987",
            "quality_grade": "Standard",
            "stone_size": "300x200x150",
            "mortar_required": 0.03
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

    # ========================================================================
    # CONCRETE (IS 456, IS 10262)
    # ========================================================================
    {
        "name": "M15 Plain Cement Concrete (PCC)",
        "category": "concrete",
        "subcategory": "Plain Cement Concrete",
        "description": "PCC for bed concrete, leveling courses, IS 456 compliant",
        "financial_properties": {
            "cost_per_unit": 4200,
            "unit_type": "cum",
            "currency": "INR",
            "retail_price": 4500,
            "wholesale_price": 4000,
            "bulk_price": 3800,
            "gst_rate": 18,
            "minimum_order_quantity": 5,
            "price_volatility": "Low",
            "price_trend": "Stable"
        },
        "environmental_properties": {
            "embodied_carbon": 280.0,
            "embodied_energy": 2800.0,
            "recycled_content": 0,
            "recyclable": True,
            "epd_available": False
        },
        "physical_properties": {
            "density": 2350,
            "specific_gravity": 2.35,
            "compressive_strength": 15.0,
            "thermal_conductivity": 1.4,
            "water_absorption": 5.0
        },
        "civil_properties": {
            "structural_grade": "M15",
            "design_strength": 15.0,
            "durability_years": 50,
            "weather_resistance": "Medium",
            "wastage_percentage": 5,
            "is_code": "IS 456:2000",
            "quality_grade": "Standard",
            "mix_ratio": "1:2:4"
        },
        "supplier": {
            "supplier_name": "Local RMC Plant",
            "supplier_location": "Thrissur",
            "lead_time_days": 1,
            "reliability_rating": 8.0
        },
        "is_active": True,
        "tags": ["concrete", "PCC", "M15", "foundation"]
    },
    {
        "name": "M20 Reinforced Cement Concrete (RCC)",
        "category": "concrete",
        "subcategory": "Reinforced Cement Concrete",
        "description": "Standard RCC for residential construction, IS 456 compliant",
        "financial_properties": {
            "cost_per_unit": 5200,
            "unit_type": "cum",
            "currency": "INR",
            "retail_price": 5500,
            "wholesale_price": 5000,
            "bulk_price": 4800,
            "gst_rate": 18,
            "minimum_order_quantity": 5,
            "price_volatility": "Low",
            "price_trend": "Stable"
        },
        "environmental_properties": {
            "embodied_carbon": 350.0,
            "embodied_energy": 3500.0,
            "recycled_content": 0,
            "recyclable": True,
            "epd_available": False
        },
        "physical_properties": {
            "density": 2500,
            "specific_gravity": 2.5,
            "compressive_strength": 20.0,
            "thermal_conductivity": 1.5,
            "water_absorption": 4.0
        },
        "civil_properties": {
            "structural_grade": "M20",
            "design_strength": 20.0,
            "durability_years": 50,
            "weather_resistance": "High",
            "wastage_percentage": 5,
            "is_code": "IS 456:2000",
            "quality_grade": "Standard",
            "mix_ratio": "1:1.5:3"
        },
        "supplier": {
            "supplier_name": "Local RMC Plant",
            "supplier_location": "Thrissur",
            "lead_time_days": 1,
            "reliability_rating": 8.0
        },
        "is_active": True,
        "tags": ["concrete", "RCC", "M20", "residential"]
    },
    {
        "name": "M25 Reinforced Cement Concrete (RCC)",
        "category": "concrete",
        "subcategory": "Reinforced Cement Concrete",
        "description": "Higher grade RCC for columns and beams, IS 456 compliant",
        "financial_properties": {
            "cost_per_unit": 5800,
            "unit_type": "cum",
            "currency": "INR",
            "retail_price": 6200,
            "wholesale_price": 5600,
            "bulk_price": 5400,
            "gst_rate": 18,
            "minimum_order_quantity": 5,
            "price_volatility": "Low",
            "price_trend": "Stable"
        },
        "environmental_properties": {
            "embodied_carbon": 380.0,
            "embodied_energy": 3800.0,
            "recycled_content": 0,
            "recyclable": True,
            "epd_available": False
        },
        "physical_properties": {
            "density": 2500,
            "specific_gravity": 2.5,
            "compressive_strength": 25.0,
            "thermal_conductivity": 1.5,
            "water_absorption": 3.5
        },
        "civil_properties": {
            "structural_grade": "M25",
            "design_strength": 25.0,
            "durability_years": 60,
            "weather_resistance": "High",
            "wastage_percentage": 5,
            "is_code": "IS 456:2000",
            "quality_grade": "Standard",
            "mix_ratio": "1:1:2"
        },
        "supplier": {
            "supplier_name": "Local RMC Plant",
            "supplier_location": "Thrissur",
            "lead_time_days": 1,
            "reliability_rating": 8.0
        },
        "is_active": True,
        "tags": ["concrete", "RCC", "M25", "structural"]
    },
    {
        "name": "M30 Reinforced Cement Concrete (RCC)",
        "category": "concrete",
        "subcategory": "Reinforced Cement Concrete",
        "description": "High grade RCC for commercial construction, IS 456 compliant",
        "financial_properties": {
            "cost_per_unit": 6500,
            "unit_type": "cum",
            "currency": "INR",
            "retail_price": 7000,
            "wholesale_price": 6300,
            "bulk_price": 6000,
            "gst_rate": 18,
            "minimum_order_quantity": 10,
            "price_volatility": "Low",
            "price_trend": "Stable"
        },
        "environmental_properties": {
            "embodied_carbon": 420.0,
            "embodied_energy": 4200.0,
            "recycled_content": 0,
            "recyclable": True,
            "epd_available": False
        },
        "physical_properties": {
            "density": 2500,
            "specific_gravity": 2.5,
            "compressive_strength": 30.0,
            "thermal_conductivity": 1.5,
            "water_absorption": 3.0
        },
        "civil_properties": {
            "structural_grade": "M30",
            "design_strength": 30.0,
            "durability_years": 60,
            "weather_resistance": "High",
            "wastage_percentage": 5,
            "is_code": "IS 456:2000",
            "quality_grade": "Premium",
            "mix_ratio": "Design Mix"
        },
        "supplier": {
            "supplier_name": "Local RMC Plant",
            "supplier_location": "Thrissur",
            "lead_time_days": 1,
            "reliability_rating": 8.0
        },
        "is_active": True,
        "tags": ["concrete", "RCC", "M30", "commercial"]
    },
    {
        "name": "Ready Mix Concrete (RMC) M25",
        "category": "concrete",
        "subcategory": "Ready Mix Concrete",
        "description": "Factory-produced M25 concrete with quality control",
        "financial_properties": {
            "cost_per_unit": 6200,
            "unit_type": "cum",
            "currency": "INR",
            "retail_price": 6500,
            "wholesale_price": 6000,
            "bulk_price": 5800,
            "gst_rate": 18,
            "minimum_order_quantity": 6,
            "price_volatility": "Low",
            "price_trend": "Stable"
        },
        "environmental_properties": {
            "embodied_carbon": 360.0,
            "embodied_energy": 3600.0,
            "recycled_content": 5,
            "recyclable": True,
            "epd_available": True
        },
        "physical_properties": {
            "density": 2500,
            "specific_gravity": 2.5,
            "compressive_strength": 25.0,
            "thermal_conductivity": 1.5,
            "water_absorption": 3.5
        },
        "civil_properties": {
            "structural_grade": "M25",
            "design_strength": 25.0,
            "durability_years": 60,
            "weather_resistance": "High",
            "wastage_percentage": 3,
            "is_code": "IS 456:2000",
            "quality_grade": "Premium",
            "mix_ratio": "Design Mix"
        },
        "supplier": {
            "supplier_name": "ACC RMC",
            "supplier_location": "Kochi",
            "lead_time_days": 1,
            "reliability_rating": 9.0
        },
        "is_active": True,
        "tags": ["concrete", "RMC", "M25", "quality"]
    },
    {
        "name": "Fly Ash Concrete (M25)",
        "category": "concrete",
        "subcategory": "Sustainable Concrete",
        "description": "M25 concrete with 30% fly ash replacement, eco-friendly option",
        "financial_properties": {
            "cost_per_unit": 5500,
            "unit_type": "cum",
            "currency": "INR",
            "retail_price": 5800,
            "wholesale_price": 5300,
            "bulk_price": 5100,
            "gst_rate": 18,
            "minimum_order_quantity": 5,
            "price_volatility": "Low",
            "price_trend": "Decreasing"
        },
        "environmental_properties": {
            "embodied_carbon": 280.0,
            "embodied_energy": 2800.0,
            "recycled_content": 30,
            "recyclable": True,
            "epd_available": True
        },
        "physical_properties": {
            "density": 2400,
            "specific_gravity": 2.4,
            "compressive_strength": 25.0,
            "thermal_conductivity": 1.3,
            "water_absorption": 4.0
        },
        "civil_properties": {
            "structural_grade": "M25",
            "design_strength": 25.0,
            "durability_years": 60,
            "weather_resistance": "High",
            "wastage_percentage": 5,
            "is_code": "IS 456:2000",
            "quality_grade": "Standard",
            "mix_ratio": "Design Mix",
            "green_building_cert": ["GRIHA", "IGBC", "LEED"]
        },
        "supplier": {
            "supplier_name": "EcoMix Solutions",
            "supplier_location": "Kochi",
            "lead_time_days": 2,
            "reliability_rating": 8.5
        },
        "is_active": True,
        "tags": ["concrete", "fly-ash", "M25", "sustainable"]
    },

    # ========================================================================
    # MASONRY MORTAR / CEMENT MORTAR
    # ========================================================================
    {
        "name": "Cement Mortar CM 1:4",
        "category": "masonry",
        "subcategory": "Cement Mortar",
        "description": "Cement mortar 1:4 ratio for plastering and pointing",
        "financial_properties": {
            "cost_per_unit": 320,
            "unit_type": "cum",
            "currency": "INR",
            "retail_price": 350,
            "wholesale_price": 300,
            "bulk_price": 280,
            "gst_rate": 18,
            "minimum_order_quantity": 1,
            "price_volatility": "Low",
            "price_trend": "Stable"
        },
        "environmental_properties": {
            "embodied_carbon": 250.0,
            "embodied_energy": 2500.0,
            "recycled_content": 0,
            "recyclable": False,
            "epd_available": False
        },
        "physical_properties": {
            "density": 2100,
            "specific_gravity": 2.1,
            "compressive_strength": 10.0,
            "thermal_conductivity": 0.9,
            "water_absorption": 12.0
        },
        "civil_properties": {
            "structural_grade": "M10",
            "design_strength": 10.0,
            "durability_years": 30,
            "weather_resistance": "Medium",
            "wastage_percentage": 10,
            "is_code": "IS 2250:1981",
            "quality_grade": "Standard",
            "mix_ratio": "1:4"
        },
        "supplier": {
            "supplier_name": "Local Supplier",
            "supplier_location": "Thrissur",
            "lead_time_days": 1,
            "reliability_rating": 8.0
        },
        "is_active": True,
        "tags": ["masonry", "mortar", "CM1:4", "plaster"]
    },
    {
        "name": "Cement Mortar CM 1:6",
        "category": "masonry",
        "subcategory": "Cement Mortar",
        "description": "Cement mortar 1:6 ratio for masonry work",
        "financial_properties": {
            "cost_per_unit": 280,
            "unit_type": "cum",
            "currency": "INR",
            "retail_price": 300,
            "wholesale_price": 260,
            "bulk_price": 240,
            "gst_rate": 18,
            "minimum_order_quantity": 1,
            "price_volatility": "Low",
            "price_trend": "Stable"
        },
        "environmental_properties": {
            "embodied_carbon": 220.0,
            "embodied_energy": 2200.0,
            "recycled_content": 0,
            "recyclable": False,
            "epd_available": False
        },
        "physical_properties": {
            "density": 2000,
            "specific_gravity": 2.0,
            "compressive_strength": 7.5,
            "thermal_conductivity": 0.85,
            "water_absorption": 14.0
        },
        "civil_properties": {
            "structural_grade": "M7.5",
            "design_strength": 7.5,
            "durability_years": 30,
            "weather_resistance": "Medium",
            "wastage_percentage": 10,
            "is_code": "IS 2250:1981",
            "quality_grade": "Standard",
            "mix_ratio": "1:6"
        },
        "supplier": {
            "supplier_name": "Local Supplier",
            "supplier_location": "Thrissur",
            "lead_time_days": 1,
            "reliability_rating": 8.0
        },
        "is_active": True,
        "tags": ["masonry", "mortar", "CM1:6", "masonry"]
    },

    # ========================================================================
    # FINISHING MATERIALS - Flooring
    # ========================================================================
    {
        "name": "Ceramic Floor Tiles 600x600mm",
        "category": "flooring",
        "subcategory": "Floor Tiles",
        "description": "Glazed ceramic floor tiles, IS 15622 compliant",
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
            "embodied_energy": 8.0,
            "recycled_content": 0,
            "recyclable": False,
            "epd_available": True
        },
        "physical_properties": {
            "density": 2000,
            "specific_gravity": 2.0,
            "compressive_strength": 30.0,
            "thermal_conductivity": 1.2,
            "water_absorption": 3.0,
            "thickness": 8
        },
        "civil_properties": {
            "durability_years": 25,
            "weather_resistance": "High",
            "wastage_percentage": 10,
            "is_code": "IS 15622:2006",
            "quality_grade": "Standard",
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
        "tags": ["flooring", "tiles", "ceramic"]
    },
    {
        "name": "Vitrified Tiles 600x600mm",
        "category": "flooring",
        "subcategory": "Floor Tiles",
        "description": "Full body vitrified tiles, premium finish, low water absorption",
        "financial_properties": {
            "cost_per_unit": 85,
            "unit_type": "sqft",
            "currency": "INR",
            "retail_price": 95,
            "wholesale_price": 80,
            "bulk_price": 75,
            "gst_rate": 28,
            "minimum_order_quantity": 100,
            "price_volatility": "Medium",
            "price_trend": "Stable"
        },
        "environmental_properties": {
            "embodied_carbon": 0.9,
            "embodied_energy": 9.0,
            "recycled_content": 0,
            "recyclable": False,
            "epd_available": True
        },
        "physical_properties": {
            "density": 2300,
            "specific_gravity": 2.3,
            "compressive_strength": 40.0,
            "thermal_conductivity": 1.3,
            "water_absorption": 0.5,
            "thickness": 10
        },
        "civil_properties": {
            "durability_years": 30,
            "weather_resistance": "High",
            "wastage_percentage": 8,
            "is_code": "IS 15622:2006",
            "quality_grade": "Premium",
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
        "tags": ["flooring", "vitrified", "premium"]
    },
    {
        "name": "Marble Flooring (Indian)",
        "category": "flooring",
        "subcategory": "Natural Stone",
        "description": "Indian marble flooring, polished finish",
        "financial_properties": {
            "cost_per_unit": 120,
            "unit_type": "sqft",
            "currency": "INR",
            "retail_price": 140,
            "wholesale_price": 110,
            "bulk_price": 100,
            "gst_rate": 28,
            "minimum_order_quantity": 50,
            "price_volatility": "Medium",
            "price_trend": "Stable"
        },
        "environmental_properties": {
            "embodied_carbon": 0.4,
            "embodied_energy": 4.0,
            "recycled_content": 0,
            "recyclable": True,
            "epd_available": False
        },
        "physical_properties": {
            "density": 2650,
            "specific_gravity": 2.65,
            "compressive_strength": 60.0,
            "thermal_conductivity": 2.5,
            "water_absorption": 0.5,
            "thickness": 18
        },
        "civil_properties": {
            "durability_years": 50,
            "weather_resistance": "Medium",
            "wastage_percentage": 10,
            "is_code": "IS 3691:1988",
            "quality_grade": "Premium",
            "adhesive_required": 3.0
        },
        "supplier": {
            "supplier_name": "Rajasthan Marble Suppliers",
            "supplier_location": "Kochi",
            "lead_time_days": 5,
            "reliability_rating": 8.5
        },
        "is_active": True,
        "tags": ["flooring", "marble", "natural-stone", "premium"]
    },
    {
        "name": "Granite Flooring",
        "category": "flooring",
        "subcategory": "Natural Stone",
        "description": "Polished granite flooring, high durability",
        "financial_properties": {
            "cost_per_unit": 150,
            "unit_type": "sqft",
            "currency": "INR",
            "retail_price": 180,
            "wholesale_price": 140,
            "bulk_price": 130,
            "gst_rate": 28,
            "minimum_order_quantity": 50,
            "price_volatility": "Medium",
            "price_trend": "Stable"
        },
        "environmental_properties": {
            "embodied_carbon": 0.5,
            "embodied_energy": 5.0,
            "recycled_content": 0,
            "recyclable": True,
            "epd_available": False
        },
        "physical_properties": {
            "density": 2750,
            "specific_gravity": 2.75,
            "compressive_strength": 120.0,
            "thermal_conductivity": 3.0,
            "water_absorption": 0.3,
            "thickness": 20
        },
        "civil_properties": {
            "durability_years": 75,
            "weather_resistance": "High",
            "wastage_percentage": 8,
            "is_code": "IS 3691:1988",
            "quality_grade": "Premium",
            "adhesive_required": 3.0
        },
        "supplier": {
            "supplier_name": "South India Granite",
            "supplier_location": "Kochi",
            "lead_time_days": 5,
            "reliability_rating": 8.8
        },
        "is_active": True,
        "tags": ["flooring", "granite", "natural-stone", "premium"]
    },
    {
        "name": "Kota Stone Flooring",
        "category": "flooring",
        "subcategory": "Natural Stone",
        "description": "Budget-friendly natural stone flooring",
        "financial_properties": {
            "cost_per_unit": 45,
            "unit_type": "sqft",
            "currency": "INR",
            "retail_price": 55,
            "wholesale_price": 42,
            "bulk_price": 38,
            "gst_rate": 28,
            "minimum_order_quantity": 100,
            "price_volatility": "Low",
            "price_trend": "Stable"
        },
        "environmental_properties": {
            "embodied_carbon": 0.3,
            "embodied_energy": 3.0,
            "recycled_content": 0,
            "recyclable": True,
            "epd_available": False
        },
        "physical_properties": {
            "density": 2600,
            "specific_gravity": 2.6,
            "compressive_strength": 80.0,
            "thermal_conductivity": 2.0,
            "water_absorption": 0.8,
            "thickness": 20
        },
        "civil_properties": {
            "durability_years": 40,
            "weather_resistance": "High",
            "wastage_percentage": 10,
            "is_code": "IS 3691:1988",
            "quality_grade": "Standard",
            "adhesive_required": 3.0
        },
        "supplier": {
            "supplier_name": "Rajasthan Stone Suppliers",
            "supplier_location": "Kochi",
            "lead_time_days": 5,
            "reliability_rating": 8.0
        },
        "is_active": True,
        "tags": ["flooring", "kota-stone", "budget"]
    },

    # ========================================================================
    # FINISHING MATERIALS - Paint & Wall Finishes
    # ========================================================================
    {
        "name": "Wall Putty (White Cement Based)",
        "category": "finish",
        "subcategory": "Wall Finishing",
        "description": "Premium wall putty for interior/exterior surface preparation",
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
            "embodied_energy": 4.0,
            "recycled_content": 0,
            "recyclable": False,
            "epd_available": False
        },
        "physical_properties": {
            "density": 1200,
            "specific_gravity": 1.2,
            "compressive_strength": 8.0,
            "thermal_conductivity": 0.5,
            "coverage": 20,
            "thickness_per_coat": 1.5
        },
        "civil_properties": {
            "durability_years": 10,
            "weather_resistance": "Medium",
            "wastage_percentage": 15,
            "is_code": "IS 15622:2006",
            "quality_grade": "Standard",
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
        "description": "Premium acrylic emulsion for interior walls",
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
            "embodied_energy": 18.0,
            "recycled_content": 0,
            "recyclable": False,
            "epd_available": True
        },
        "physical_properties": {
            "density": 1300,
            "specific_gravity": 1.3,
            "compressive_strength": 0,
            "thermal_conductivity": 0.3,
            "coverage": 140,
            "drying_time": 4,
            "voc_content": 50
        },
        "civil_properties": {
            "durability_years": 7,
            "weather_resistance": "Low",
            "wastage_percentage": 20,
            "is_code": "IS 2619:2003",
            "quality_grade": "Premium",
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
        "description": "Acrylic smooth exterior paint with silicone technology for Kerala climate",
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
            "embodied_energy": 22.0,
            "recycled_content": 0,
            "recyclable": False,
            "epd_available": True
        },
        "physical_properties": {
            "density": 1350,
            "specific_gravity": 1.35,
            "compressive_strength": 0,
            "thermal_conductivity": 0.3,
            "coverage": 100,
            "drying_time": 6,
            "water_resistance": "high"
        },
        "civil_properties": {
            "durability_years": 10,
            "weather_resistance": "Excellent",
            "wastage_percentage": 20,
            "is_code": "IS 2619:2003",
            "quality_grade": "Premium",
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
    {
        "name": "Cement Concrete Flooring (IPS)",
        "category": "flooring",
        "subcategory": "Cement Flooring",
        "description": "Indian Patent Stone (IPS) cement concrete flooring, economical option",
        "financial_properties": {
            "cost_per_unit": 85,
            "unit_type": "sqft",
            "currency": "INR",
            "retail_price": 95,
            "wholesale_price": 80,
            "bulk_price": 75,
            "gst_rate": 18,
            "minimum_order_quantity": 100,
            "price_volatility": "Low",
            "price_trend": "Stable"
        },
        "environmental_properties": {
            "embodied_carbon": 15.0,
            "embodied_energy": 150.0,
            "recycled_content": 0,
            "recyclable": True,
            "epd_available": False
        },
        "physical_properties": {
            "density": 2300,
            "specific_gravity": 2.3,
            "compressive_strength": 20.0,
            "thermal_conductivity": 1.4,
            "water_absorption": 5.0,
            "thickness": 40
        },
        "civil_properties": {
            "durability_years": 20,
            "weather_resistance": "High",
            "wastage_percentage": 5,
            "is_code": "IS 456:2000",
            "quality_grade": "Standard",
            "mix_ratio": "1:2:4"
        },
        "supplier": {
            "supplier_name": "Local Contractor",
            "supplier_location": "Thrissur",
            "lead_time_days": 1,
            "reliability_rating": 8.0
        },
        "is_active": True,
        "tags": ["flooring", "IPS", "cement", "budget"]
    },
    {
        "name": "Terrazzo Flooring (Mozaic)",
        "category": "flooring",
        "subcategory": "Terrazzo",
        "description": "Traditional terrazzo flooring with marble chips",
        "financial_properties": {
            "cost_per_unit": 110,
            "unit_type": "sqft",
            "currency": "INR",
            "retail_price": 130,
            "wholesale_price": 100,
            "bulk_price": 95,
            "gst_rate": 18,
            "minimum_order_quantity": 100,
            "price_volatility": "Medium",
            "price_trend": "Stable"
        },
        "environmental_properties": {
            "embodied_carbon": 18.0,
            "embodied_energy": 180.0,
            "recycled_content": 10,
            "recyclable": True,
            "epd_available": False
        },
        "physical_properties": {
            "density": 2400,
            "specific_gravity": 2.4,
            "compressive_strength": 25.0,
            "thermal_conductivity": 1.5,
            "water_absorption": 4.0,
            "thickness": 25
        },
        "civil_properties": {
            "durability_years": 40,
            "weather_resistance": "High",
            "wastage_percentage": 8,
            "is_code": "IS 456:2000",
            "quality_grade": "Premium",
            "mix_ratio": "1:1.5:3"
        },
        "supplier": {
            "supplier_name": "Kerala Flooring Specialists",
            "supplier_location": "Thrissur",
            "lead_time_days": 3,
            "reliability_rating": 8.5
        },
        "is_active": True,
        "tags": ["flooring", "terrazzo", "mozaic", "traditional"]
    },

    # ========================================================================
    # DOORS & WINDOWS
    # ========================================================================
    {
        "name": "Flush Door (Decorative)",
        "category": "door",
        "subcategory": "Timber Doors",
        "description": "MDF flush door with teak veneer finish, interior use",
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
            "embodied_carbon": 15.0,
            "embodied_energy": 150.0,
            "recycled_content": 0,
            "recyclable": True,
            "epd_available": False
        },
        "physical_properties": {
            "density": 600,
            "specific_gravity": 0.6,
            "compressive_strength": 15.0,
            "thermal_conductivity": 0.15,
            "thickness": 35,
            "size": "2100x900",
            "finish": "veneer"
        },
        "civil_properties": {
            "durability_years": 20,
            "weather_resistance": "Low",
            "wastage_percentage": 5,
            "is_code": "IS 2202:1994",
            "quality_grade": "Standard",
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
        "description": "White UPVC sliding windows with glass, energy efficient",
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
            "embodied_energy": 45.0,
            "recycled_content": 10,
            "recyclable": True,
            "epd_available": True
        },
        "physical_properties": {
            "density": 1400,
            "specific_gravity": 1.4,
            "compressive_strength": 40.0,
            "thermal_conductivity": 0.17,
            "profile_thickness": 60,
            "glass_thickness": 5,
            "u_value": 2.4
        },
        "civil_properties": {
            "durability_years": 30,
            "weather_resistance": "Excellent",
            "wastage_percentage": 10,
            "is_code": "IS 15622:2006",
            "quality_grade": "Premium",
            "includes": "frame+glass+hardware",
            "green_building_cert": ["GRIHA", "IGBC"]
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
    {
        "name": "Teak Wood Door",
        "category": "door",
        "subcategory": "Timber Doors",
        "description": "Solid teak wood door, premium quality for main entrance",
        "financial_properties": {
            "cost_per_unit": 12000,
            "unit_type": "nos",
            "currency": "INR",
            "retail_price": 14000,
            "wholesale_price": 11000,
            "bulk_price": 10000,
            "gst_rate": 18,
            "minimum_order_quantity": 2,
            "price_volatility": "High",
            "price_trend": "Increasing"
        },
        "environmental_properties": {
            "embodied_carbon": 0,
            "embodied_energy": 5.0,
            "recycled_content": 0,
            "recyclable": True,
            "epd_available": False
        },
        "physical_properties": {
            "density": 650,
            "specific_gravity": 0.65,
            "compressive_strength": 45.0,
            "thermal_conductivity": 0.16,
            "thickness": 45,
            "size": "2100x1000"
        },
        "civil_properties": {
            "durability_years": 50,
            "weather_resistance": "High",
            "wastage_percentage": 5,
            "is_code": "IS 399:1963",
            "quality_grade": "Premium",
            "finish": "polish",
            "fixing_method": "frame"
        },
        "supplier": {
            "supplier_name": "Kerala Timber Depot",
            "supplier_location": "Thrissur",
            "lead_time_days": 7,
            "reliability_rating": 8.5
        },
        "is_active": True,
        "tags": ["door", "teak", "premium", "main-entrance"]
    },
    {
        "name": "Steel Security Door",
        "category": "door",
        "subcategory": "Steel Doors",
        "description": "MS fabricated security door with powder coating",
        "financial_properties": {
            "cost_per_unit": 8500,
            "unit_type": "nos",
            "currency": "INR",
            "retail_price": 9500,
            "wholesale_price": 8000,
            "bulk_price": 7500,
            "gst_rate": 18,
            "minimum_order_quantity": 3,
            "price_volatility": "Medium",
            "price_trend": "Stable"
        },
        "environmental_properties": {
            "embodied_carbon": 25.0,
            "embodied_energy": 250.0,
            "recycled_content": 20,
            "recyclable": True,
            "epd_available": False
        },
        "physical_properties": {
            "density": 7850,
            "specific_gravity": 7.85,
            "compressive_strength": 250.0,
            "thermal_conductivity": 50.0,
            "thickness": 1.5,
            "size": "2100x1000"
        },
        "civil_properties": {
            "durability_years": 30,
            "weather_resistance": "High",
            "wastage_percentage": 5,
            "is_code": "IS 808:1989",
            "quality_grade": "Standard",
            "finish": "powder-coated",
            "security_rating": "high"
        },
        "supplier": {
            "supplier_name": "Local Fabricator",
            "supplier_location": "Thrissur",
            "lead_time_days": 5,
            "reliability_rating": 8.0
        },
        "is_active": True,
        "tags": ["door", "steel", "security"]
    },

    # ========================================================================
    # TIMBER & WOOD
    # ========================================================================
    {
        "name": "Teak Wood (Sawn)",
        "category": "timber",
        "subcategory": "Hardwood",
        "description": "Premium teak wood for doors, windows, and furniture",
        "financial_properties": {
            "cost_per_unit": 2500,
            "unit_type": "cft",
            "currency": "INR",
            "retail_price": 2800,
            "wholesale_price": 2300,
            "bulk_price": 2100,
            "gst_rate": 18,
            "minimum_order_quantity": 10,
            "price_volatility": "High",
            "price_trend": "Increasing"
        },
        "environmental_properties": {
            "embodied_carbon": 0,
            "embodied_energy": 5.0,
            "recycled_content": 0,
            "recyclable": True,
            "epd_available": False
        },
        "physical_properties": {
            "density": 650,
            "specific_gravity": 0.65,
            "compressive_strength": 45.0,
            "thermal_conductivity": 0.16,
            "water_absorption": 8.0
        },
        "civil_properties": {
            "durability_years": 50,
            "weather_resistance": "High",
            "wastage_percentage": 15,
            "is_code": "IS 399:1963",
            "quality_grade": "Premium"
        },
        "supplier": {
            "supplier_name": "Kerala Timber Depot",
            "supplier_location": "Thrissur",
            "lead_time_days": 5,
            "reliability_rating": 8.5
        },
        "is_active": True,
        "tags": ["timber", "teak", "hardwood", "premium"]
    },
    {
        "name": "Plywood 18mm (BWR Grade)",
        "category": "timber",
        "subcategory": "Engineered Wood",
        "description": "Boiling Water Resistant plywood for kitchen and wet areas",
        "financial_properties": {
            "cost_per_unit": 120,
            "unit_type": "sqft",
            "currency": "INR",
            "retail_price": 135,
            "wholesale_price": 115,
            "bulk_price": 110,
            "gst_rate": 18,
            "minimum_order_quantity": 50,
            "price_volatility": "Medium",
            "price_trend": "Stable"
        },
        "environmental_properties": {
            "embodied_carbon": 0.8,
            "embodied_energy": 8.0,
            "recycled_content": 0,
            "recyclable": True,
            "epd_available": False
        },
        "physical_properties": {
            "density": 600,
            "specific_gravity": 0.6,
            "compressive_strength": 20.0,
            "thermal_conductivity": 0.12,
            "thickness": 18,
            "size": "2440x1220"
        },
        "civil_properties": {
            "durability_years": 20,
            "weather_resistance": "High",
            "wastage_percentage": 10,
            "is_code": "IS 710:2019",
            "quality_grade": "Standard",
            "grade": "BWR"
        },
        "supplier": {
            "supplier_name": "Century Ply",
            "supplier_location": "Kochi",
            "lead_time_days": 3,
            "reliability_rating": 9.0
        },
        "is_active": True,
        "tags": ["timber", "plywood", "BWR", "kitchen"]
    },
    {
        "name": "Plywood 12mm (MR Grade)",
        "category": "timber",
        "subcategory": "Engineered Wood",
        "description": "Moisture Resistant plywood for interior use",
        "financial_properties": {
            "cost_per_unit": 75,
            "unit_type": "sqft",
            "currency": "INR",
            "retail_price": 85,
            "wholesale_price": 70,
            "bulk_price": 65,
            "gst_rate": 18,
            "minimum_order_quantity": 50,
            "price_volatility": "Medium",
            "price_trend": "Stable"
        },
        "environmental_properties": {
            "embodied_carbon": 0.6,
            "embodied_energy": 6.0,
            "recycled_content": 0,
            "recyclable": True,
            "epd_available": False
        },
        "physical_properties": {
            "density": 550,
            "specific_gravity": 0.55,
            "compressive_strength": 15.0,
            "thermal_conductivity": 0.12,
            "thickness": 12,
            "size": "2440x1220"
        },
        "civil_properties": {
            "durability_years": 15,
            "weather_resistance": "Medium",
            "wastage_percentage": 10,
            "is_code": "IS 710:2019",
            "quality_grade": "Standard",
            "grade": "MR"
        },
        "supplier": {
            "supplier_name": "Century Ply",
            "supplier_location": "Kochi",
            "lead_time_days": 3,
            "reliability_rating": 9.0
        },
        "is_active": True,
        "tags": ["timber", "plywood", "MR", "interior"]
    },
    {
        "name": "MDF Board 18mm",
        "category": "timber",
        "subcategory": "Engineered Wood",
        "description": "Medium Density Fiberboard for furniture and partitions",
        "financial_properties": {
            "cost_per_unit": 55,
            "unit_type": "sqft",
            "currency": "INR",
            "retail_price": 65,
            "wholesale_price": 52,
            "bulk_price": 48,
            "gst_rate": 18,
            "minimum_order_quantity": 50,
            "price_volatility": "Low",
            "price_trend": "Stable"
        },
        "environmental_properties": {
            "embodied_carbon": 0.5,
            "embodied_energy": 5.0,
            "recycled_content": 10,
            "recyclable": True,
            "epd_available": False
        },
        "physical_properties": {
            "density": 700,
            "specific_gravity": 0.7,
            "compressive_strength": 12.0,
            "thermal_conductivity": 0.10,
            "thickness": 18,
            "size": "2440x1220"
        },
        "civil_properties": {
            "durability_years": 10,
            "weather_resistance": "Low",
            "wastage_percentage": 8,
            "is_code": "IS 12962:1990",
            "quality_grade": "Standard"
        },
        "supplier": {
            "supplier_name": "Greenply Industries",
            "supplier_location": "Kochi",
            "lead_time_days": 3,
            "reliability_rating": 8.8
        },
        "is_active": True,
        "tags": ["timber", "MDF", "furniture"]
    },

    # ========================================================================
    # WATERPROOFING & ADHESIVES
    # ========================================================================
    {
        "name": "Cementitious Waterproofing Coating",
        "category": "finish",
        "subcategory": "Waterproofing",
        "description": "Acrylic cementitious waterproofing membrane for roofs and bathrooms",
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
            "embodied_energy": 5.0,
            "recycled_content": 0,
            "recyclable": False,
            "epd_available": False
        },
        "physical_properties": {
            "density": 1500,
            "specific_gravity": 1.5,
            "compressive_strength": 15.0,
            "thermal_conductivity": 0.5,
            "coverage": 2,
            "elastomeric": True,
            "water_proofing": "high"
        },
        "civil_properties": {
            "durability_years": 15,
            "weather_resistance": "Excellent",
            "wastage_percentage": 15,
            "is_code": "IS 2645:2003",
            "quality_grade": "Standard",
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
        "category": "finish",
        "subcategory": "Adhesives",
        "description": "Polymer modified tile adhesive for ceramic, porcelain, and stone tiles",
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
            "embodied_energy": 4.0,
            "recycled_content": 0,
            "recyclable": False,
            "epd_available": False
        },
        "physical_properties": {
            "density": 1400,
            "specific_gravity": 1.4,
            "compressive_strength": 15.0,
            "thermal_conductivity": 0.5,
            "coverage": 5,
            "open_time": 20,
            "pot_life": 3
        },
        "civil_properties": {
            "durability_years": 20,
            "weather_resistance": "High",
            "wastage_percentage": 10,
            "is_code": "IS 15477:2019",
            "quality_grade": "Standard",
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
    {
        "name": "Bituminous Waterproofing Membrane",
        "category": "finish",
        "subcategory": "Waterproofing",
        "description": "APP-modified bitumen membrane for terrace waterproofing",
        "financial_properties": {
            "cost_per_unit": 350,
            "unit_type": "sqm",
            "currency": "INR",
            "retail_price": 400,
            "wholesale_price": 330,
            "bulk_price": 310,
            "gst_rate": 18,
            "minimum_order_quantity": 20,
            "price_volatility": "Medium",
            "price_trend": "Stable"
        },
        "environmental_properties": {
            "embodied_carbon": 3.5,
            "embodied_energy": 35.0,
            "recycled_content": 0,
            "recyclable": False,
            "epd_available": False
        },
        "physical_properties": {
            "density": 1100,
            "specific_gravity": 1.1,
            "compressive_strength": 0,
            "thermal_conductivity": 0.17,
            "thickness": 4,
            "water_proofing": "excellent"
        },
        "civil_properties": {
            "durability_years": 20,
            "weather_resistance": "Excellent",
            "wastage_percentage": 10,
            "is_code": "IS 15304:2003",
            "quality_grade": "Standard",
            "application": "torch-on"
        },
        "supplier": {
            "supplier_name": "Pidilite Industries",
            "supplier_location": "Kochi",
            "lead_time_days": 3,
            "reliability_rating": 9.0
        },
        "is_active": True,
        "tags": ["waterproofing", "bitumen", "terrace", "APP"]
    },

    # ========================================================================
    # MISSING IS CODE MATERIALS - Critical additions for 95+ accuracy
    # ========================================================================

    # IS 800:2007 - General Construction in Steel
    {
        "name": "Structural Steel Plates (IS 2062)",
        "category": "steel",
        "subcategory": "Structural Steel",
        "description": "Hot-rolled structural steel plates for general construction, IS 2062:2011 compliant",
        "financial_properties": {
            "cost_per_unit": 75,
            "unit_type": "kg",
            "currency": "INR",
            "retail_price": 80,
            "wholesale_price": 72,
            "bulk_price": 68,
            "gst_rate": 18,
            "minimum_order_quantity": 500,
            "price_volatility": "High",
            "price_trend": "Stable"
        },
        "environmental_properties": {
            "embodied_carbon": 2.4,
            "embodied_energy": 24.0,
            "recycled_content": 15,
            "recyclable": True,
            "epd_available": True
        },
        "physical_properties": {
            "density": 7850,
            "specific_gravity": 7.85,
            "compressive_strength": 250,
            "thermal_conductivity": 50.0,
            "yield_strength": 250,
            "tensile_strength": 410
        },
        "civil_properties": {
            "structural_grade": "E250",
            "design_strength": 250,
            "durability_years": 50,
            "weather_resistance": "Medium",
            "wastage_percentage": 8,
            "is_code": "IS 2062:2011",
            "quality_grade": "Standard",
            "green_building_cert": ["GRIHA", "IGBC"]
        },
        "supplier": {
            "supplier_name": "SAIL",
            "supplier_location": "Kochi",
            "lead_time_days": 7,
            "reliability_rating": 9.0
        },
        "is_active": True,
        "tags": ["steel", "structural", "plates", "IS2062"]
    },

    # IS 432:1982 - Mild Steel Bars for RCC
    {
        "name": "Mild Steel Bars Fe250 (IS 432)",
        "category": "steel",
        "subcategory": "Mild Steel",
        "description": "Mild steel bars for non-structural RCC work, IS 432:1982 compliant",
        "financial_properties": {
            "cost_per_unit": 62,
            "unit_type": "kg",
            "currency": "INR",
            "retail_price": 65,
            "wholesale_price": 60,
            "bulk_price": 58,
            "gst_rate": 18,
            "minimum_order_quantity": 500,
            "price_volatility": "Medium",
            "price_trend": "Stable"
        },
        "environmental_properties": {
            "embodied_carbon": 2.3,
            "embodied_energy": 23.0,
            "recycled_content": 20,
            "recyclable": True,
            "epd_available": False
        },
        "physical_properties": {
            "density": 7850,
            "specific_gravity": 7.85,
            "compressive_strength": 250,
            "thermal_conductivity": 50.0,
            "yield_strength": 250,
            "tensile_strength": 410,
            "elongation": 23
        },
        "civil_properties": {
            "structural_grade": "Fe250",
            "design_strength": 250,
            "durability_years": 50,
            "weather_resistance": "Medium",
            "wastage_percentage": 10,
            "is_code": "IS 432:1982",
            "quality_grade": "Standard"
        },
        "supplier": {
            "supplier_name": "Local Steel Dealer",
            "supplier_location": "Thrissur",
            "lead_time_days": 3,
            "reliability_rating": 8.0
        },
        "is_active": True,
        "tags": ["steel", "mild-steel", "Fe250", "IS432"]
    },

    # IS 4926:2003 - Ready Mixed Concrete
    {
        "name": "Ready Mix Concrete M30 (IS 4926)",
        "category": "concrete",
        "subcategory": "Ready Mix Concrete",
        "description": "Factory-produced M30 RMC with quality control, IS 4926:2003 compliant",
        "financial_properties": {
            "cost_per_unit": 7200,
            "unit_type": "cum",
            "currency": "INR",
            "retail_price": 7500,
            "wholesale_price": 7000,
            "bulk_price": 6800,
            "gst_rate": 18,
            "minimum_order_quantity": 6,
            "price_volatility": "Low",
            "price_trend": "Stable"
        },
        "environmental_properties": {
            "embodied_carbon": 420.0,
            "embodied_energy": 4200.0,
            "recycled_content": 5,
            "recyclable": True,
            "epd_available": True
        },
        "physical_properties": {
            "density": 2500,
            "specific_gravity": 2.5,
            "compressive_strength": 30.0,
            "thermal_conductivity": 1.5,
            "water_absorption": 3.0
        },
        "civil_properties": {
            "structural_grade": "M30",
            "design_strength": 30.0,
            "durability_years": 60,
            "weather_resistance": "High",
            "wastage_percentage": 3,
            "is_code": "IS 4926:2003",
            "quality_grade": "Premium",
            "mix_ratio": "Design Mix"
        },
        "supplier": {
            "supplier_name": "ACC RMC",
            "supplier_location": "Kochi",
            "lead_time_days": 1,
            "reliability_rating": 9.0
        },
        "is_active": True,
        "tags": ["concrete", "RMC", "M30", "IS4926", "quality"]
    },

    # IS 3620:1979 - Laterite Stone
    {
        "name": "Laterite Stone Blocks (IS 3620)",
        "category": "masonry",
        "subcategory": "Stone Masonry",
        "description": "Traditional laterite stone blocks for Kerala construction, IS 3620:1979 compliant",
        "financial_properties": {
            "cost_per_unit": 40,
            "unit_type": "cft",
            "currency": "INR",
            "retail_price": 45,
            "wholesale_price": 38,
            "bulk_price": 35,
            "gst_rate": 5,
            "minimum_order_quantity": 500,
            "price_volatility": "Low",
            "price_trend": "Stable"
        },
        "environmental_properties": {
            "embodied_carbon": 0.06,
            "embodied_energy": 0.4,
            "recycled_content": 0,
            "recyclable": True,
            "epd_available": False
        },
        "physical_properties": {
            "density": 2000,
            "specific_gravity": 2.0,
            "compressive_strength": 4.0,
            "thermal_conductivity": 0.80,
            "water_absorption": 10.0
        },
        "civil_properties": {
            "structural_grade": "Grade 3",
            "design_strength": 4.0,
            "durability_years": 100,
            "weather_resistance": "High",
            "wastage_percentage": 15,
            "is_code": "IS 3620:1979",
            "quality_grade": "Standard",
            "stone_size": "300x200x150",
            "mortar_required": 0.03,
            "green_building_cert": ["GRIHA", "IGBC"]
        },
        "supplier": {
            "supplier_name": "Malabar Stone Works",
            "supplier_location": "Kasaragod",
            "lead_time_days": 2,
            "reliability_rating": 8.0
        },
        "is_active": True,
        "tags": ["masonry", "laterite", "stone", "IS3620", "traditional", "kerala"]
    },

    # IS 15658:2006 - Pre-cast Concrete Blocks
    {
        "name": "Pre-cast Concrete Wall Panels",
        "category": "masonry",
        "subcategory": "Pre-cast Concrete",
        "description": "Pre-cast concrete wall panels for fast construction, IS 15658:2006 compliant",
        "financial_properties": {
            "cost_per_unit": 180,
            "unit_type": "sqm",
            "currency": "INR",
            "retail_price": 200,
            "wholesale_price": 170,
            "bulk_price": 160,
            "gst_rate": 18,
            "minimum_order_quantity": 50,
            "price_volatility": "Medium",
            "price_trend": "Increasing"
        },
        "environmental_properties": {
            "embodied_carbon": 45.0,
            "embodied_energy": 450.0,
            "recycled_content": 10,
            "recyclable": True,
            "epd_available": True
        },
        "physical_properties": {
            "density": 2200,
            "specific_gravity": 2.2,
            "compressive_strength": 20.0,
            "thermal_conductivity": 1.2,
            "water_absorption": 8.0,
            "thickness": 100
        },
        "civil_properties": {
            "structural_grade": "M20",
            "design_strength": 20.0,
            "durability_years": 50,
            "weather_resistance": "High",
            "wastage_percentage": 5,
            "is_code": "IS 15658:2006",
            "quality_grade": "Standard",
            "panel_size": "2400x600x100"
        },
        "supplier": {
            "supplier_name": "Kerala Pre-cast Industries",
            "supplier_location": "Kochi",
            "lead_time_days": 14,
            "reliability_rating": 8.5
        },
        "is_active": True,
        "tags": ["masonry", "pre-cast", "concrete", "IS15658", "fast-construction"]
    },

    # IS 1172:1993 - Water Supply Requirements
    {
        "name": "HDPE Water Supply Pipes (IS 4984)",
        "category": "finish",
        "subcategory": "Plumbing Pipes",
        "description": "HDPE pipes for potable water supply, IS 4984:2016 compliant",
        "financial_properties": {
            "cost_per_unit": 85,
            "unit_type": "m",
            "currency": "INR",
            "retail_price": 95,
            "wholesale_price": 80,
            "bulk_price": 75,
            "gst_rate": 18,
            "minimum_order_quantity": 100,
            "price_volatility": "Low",
            "price_trend": "Stable"
        },
        "environmental_properties": {
            "embodied_carbon": 1.8,
            "embodied_energy": 18.0,
            "recycled_content": 0,
            "recyclable": True,
            "epd_available": False
        },
        "physical_properties": {
            "density": 950,
            "specific_gravity": 0.95,
            "compressive_strength": 0,
            "thermal_conductivity": 0.45,
            "pipe_diameter": 25,
            "pressure_rating": "PN10"
        },
        "civil_properties": {
            "durability_years": 50,
            "weather_resistance": "High",
            "wastage_percentage": 5,
            "is_code": "IS 4984:2016",
            "quality_grade": "Standard",
            "application": "potable_water"
        },
        "supplier": {
            "supplier_name": "Astral Pipes",
            "supplier_location": "Kochi",
            "lead_time_days": 3,
            "reliability_rating": 9.0
        },
        "is_active": True,
        "tags": ["plumbing", "HDPE", "water-supply", "IS4984"]
    },

    # IS 3043:2018 - Earthing/Grounding
    {
        "name": "Copper Earthing Electrode (IS 3043)",
        "category": "finish",
        "subcategory": "Electrical Safety",
        "description": "Copper bonded earthing electrode for electrical safety, IS 3043:2018 compliant",
        "financial_properties": {
            "cost_per_unit": 2500,
            "unit_type": "nos",
            "currency": "INR",
            "retail_price": 2800,
            "wholesale_price": 2400,
            "bulk_price": 2200,
            "gst_rate": 18,
            "minimum_order_quantity": 5,
            "price_volatility": "Medium",
            "price_trend": "Stable"
        },
        "environmental_properties": {
            "embodied_carbon": 3.5,
            "embodied_energy": 35.0,
            "recycled_content": 10,
            "recyclable": True,
            "epd_available": False
        },
        "physical_properties": {
            "density": 8900,
            "specific_gravity": 8.9,
            "compressive_strength": 0,
            "thermal_conductivity": 400.0,
            "electrode_length": 3000,
            "electrode_diameter": 16
        },
        "civil_properties": {
            "durability_years": 30,
            "weather_resistance": "High",
            "wastage_percentage": 0,
            "is_code": "IS 3043:2018",
            "quality_grade": "Standard",
            "application": "earthing_grounding"
        },
        "supplier": {
            "supplier_name": "Havells India",
            "supplier_location": "Kochi",
            "lead_time_days": 3,
            "reliability_rating": 9.0
        },
        "is_active": True,
        "tags": ["electrical", "earthing", "copper", "IS3043", "safety"]
    },

    # IS 18946:2022 - Green Building Assessment
    {
        "name": "Bamboo Composite Boards (IS 1948)",
        "category": "timber",
        "subcategory": "Sustainable Material",
        "description": "Eco-friendly bamboo composite boards for interior work, IS 1948:1961 compliant",
        "financial_properties": {
            "cost_per_unit": 65,
            "unit_type": "sqft",
            "currency": "INR",
            "retail_price": 75,
            "wholesale_price": 62,
            "bulk_price": 58,
            "gst_rate": 18,
            "minimum_order_quantity": 50,
            "price_volatility": "Low",
            "price_trend": "Decreasing"
        },
        "environmental_properties": {
            "embodied_carbon": 0.3,
            "embodied_energy": 3.0,
            "recycled_content": 0,
            "recyclable": True,
            "epd_available": True
        },
        "physical_properties": {
            "density": 650,
            "specific_gravity": 0.65,
            "compressive_strength": 25.0,
            "thermal_conductivity": 0.14,
            "thickness": 18,
            "size": "2440x1220"
        },
        "civil_properties": {
            "durability_years": 15,
            "weather_resistance": "Medium",
            "wastage_percentage": 8,
            "is_code": "IS 1948:1961",
            "quality_grade": "Standard",
            "green_building_cert": ["GRIHA", "IGBC", "LEED"]
        },
        "supplier": {
            "supplier_name": "Kerala Bamboo Corporation",
            "supplier_location": "Kannur",
            "lead_time_days": 5,
            "reliability_rating": 8.5
        },
        "is_active": True,
        "tags": ["timber", "bamboo", "sustainable", "IS1948", "green-building"]
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

    # Verify all materials have required fields
    print("\nField completeness check:")
    total = c.count_documents({})
    for field in ['environmental_properties.embodied_carbon',
                   'physical_properties.compressive_strength',
                   'physical_properties.thermal_conductivity',
                   'civil_properties.durability_years',
                   'financial_properties.cost_per_unit',
                   'environmental_properties.recycled_content']:
        parts = field.split('.')
        query = {parts[0]: {parts[1]: {"$exists": True, "$ne": None}}}
        count = c.count_documents(query)
        print(f"  {field}: {count}/{total} ({100*count//total}%)")

if __name__ == '__main__':
    seed_database()
