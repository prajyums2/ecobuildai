"""
Quality Control (QC) Checklists Module
IS Code compliant checklists with photo documentation
"""

from datetime import datetime
from typing import List, Dict, Optional
from dataclasses import dataclass, field
from enum import Enum

class QCStage(Enum):
    FOUNDATION = "foundation"
    PLINTH = "plinth"
    SUPERSTRUCTURE = "superstructure"
    MASONRY = "masonry"
    PLASTERING = "plastering"
    FLOORING = "flooring"
    ELECTRICAL = "electrical"
    PLUMBING = "plumbing"
    FINISHING = "finishing"
    FINAL = "final"

class QCStatus(Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    PASSED = "passed"
    FAILED = "failed"
    REWORK_REQUIRED = "rework_required"
    NA = "na"

class Severity(Enum):
    CRITICAL = "critical"
    MAJOR = "major"
    MINOR = "minor"
    OBSERVATION = "observation"

@dataclass
class QCPhoto:
    id: str
    url: str
    caption: str
    taken_by: str
    timestamp: str
    location: Optional[str] = None
    gps_coords: Optional[tuple] = None
    
@dataclass
class QCCheckItem:
    id: str
    description: str
    is_code_reference: str
    acceptance_criteria: str
    status: QCStatus = QCStatus.NOT_STARTED
    notes: str = ""
    photos: List[QCPhoto] = field(default_factory=list)
    checked_by: Optional[str] = None
    checked_date: Optional[str] = None
    severity: Severity = Severity.OBSERVATION
    
    def add_photo(self, photo: QCPhoto):
        self.photos.append(photo)

@dataclass
class QCNonConformance:
    id: str
    item_id: str
    description: str
    severity: Severity
    photos: List[QCPhoto] = field(default_factory=list)
    corrective_action: str = ""
    preventive_action: str = ""
    responsible_party: str = ""
    target_date: Optional[str] = None
    closure_date: Optional[str] = None
    status: str = "open"  # open, in_progress, closed
    
@dataclass
class QCChecklist:
    id: str
    stage: QCStage
    title: str
    is_code: str
    items: List[QCCheckItem] = field(default_factory=list)
    non_conformances: List[QCNonConformance] = field(default_factory=list)
    inspector_name: str = ""
    inspection_date: Optional[str] = None
    weather_conditions: str = ""
    approved_by: Optional[str] = None
    approval_date: Optional[str] = None
    overall_status: QCStatus = QCStatus.NOT_STARTED

class QCChecklistManager:
    """
    Manages IS Code compliant QC checklists for construction stages
    """
    
    # IS Code Compliant Checklists
    CHECKLIST_TEMPLATES = {
        QCStage.FOUNDATION: {
            "title": "Foundation Work Inspection",
            "is_code": "IS 456:2000, IS 1200",
            "items": [
                {
                    "desc": "Excavation dimensions as per drawing",
                    "criteria": "Length, width, depth within ±50mm tolerance",
                    "code": "IS 1200 (Part 1)",
                    "severity": Severity.CRITICAL
                },
                {
                    "desc": "Soil bearing capacity verification",
                    "criteria": "SBC ≥ design value (kN/m²)",
                    "code": "IS 6403:1981",
                    "severity": Severity.CRITICAL
                },
                {
                    "desc": "Groundwater level check",
                    "criteria": "Water table below foundation level",
                    "code": "IS 1080:1985",
                    "severity": Severity.MAJOR
                },
                {
                    "desc": "PCC thickness and grade",
                    "criteria": "M10 grade, 100mm thick, level surface",
                    "code": "IS 456:2000",
                    "severity": Severity.MAJOR
                },
                {
                    "desc": "Footing reinforcement placement",
                    "criteria": "Bar dia, spacing, cover (50mm min)",
                    "code": "IS 456:2000",
                    "severity": Severity.CRITICAL
                },
                {
                    "desc": "Formwork quality",
                    "criteria": "Rigid, leak-proof, proper alignment",
                    "code": "IS 456:2000",
                    "severity": Severity.MINOR
                },
                {
                    "desc": "Concrete pour quality",
                    "criteria": "No segregation, proper compaction",
                    "code": "IS 456:2000",
                    "severity": Severity.CRITICAL
                },
                {
                    "desc": "Curing period",
                    "criteria": "Min 7 days continuous curing",
                    "code": "IS 456:2000",
                    "severity": Severity.MAJOR
                },
                {
                    "desc": "Plinth beam alignment",
                    "criteria": "Center line ±10mm, level ±5mm",
                    "code": "IS 456:2000",
                    "severity": Severity.MAJOR
                },
                {
                    "desc": "Waterproofing at plinth",
                    "criteria": "Two coats of bitumen/approved compound",
                    "code": "IS 3067:1988",
                    "severity": Severity.MAJOR
                }
            ]
        },
        QCStage.SUPERSTRUCTURE: {
            "title": "Superstructure Work Inspection",
            "is_code": "IS 456:2000, IS 875",
            "items": [
                {
                    "desc": "Column reinforcement - bar diameter",
                    "criteria": "As per design (Fe 500D)",
                    "code": "IS 1786:2008",
                    "severity": Severity.CRITICAL
                },
                {
                    "desc": "Column reinforcement - spacing",
                    "criteria": "Main bars spacing ±10mm, ties @150mm c/c",
                    "code": "IS 456:2000",
                    "severity": Severity.CRITICAL
                },
                {
                    "desc": "Concrete cover to reinforcement",
                    "criteria": "40mm min for columns, 25mm for beams",
                    "code": "IS 456:2000",
                    "severity": Severity.CRITICAL
                },
                {
                    "desc": "Slab thickness",
                    "criteria": "Design thickness ±10mm",
                    "code": "IS 456:2000",
                    "severity": Severity.MAJOR
                },
                {
                    "desc": "Beam depth and width",
                    "criteria": "As per drawing ±15mm",
                    "code": "IS 456:2000",
                    "severity": Severity.MAJOR
                },
                {
                    "desc": "Lap length for bars",
                    "criteria": "≥ 50 times bar diameter",
                    "code": "IS 456:2000",
                    "severity": Severity.CRITICAL
                },
                {
                    "desc": "Concrete grade",
                    "criteria": "M25 or as specified, cube strength ≥ 25 MPa",
                    "code": "IS 456:2000",
                    "severity": Severity.CRITICAL
                },
                {
                    "desc": "Shuttering removal time",
                    "criteria": "Min 14 days for slabs, 7 days for beams",
                    "code": "IS 456:2000",
                    "severity": Severity.MAJOR
                },
                {
                    "desc": "Surface finish quality",
                    "criteria": "No honeycombing, voids < 5mm",
                    "code": "IS 456:2000",
                    "severity": Severity.MINOR
                },
                {
                    "desc": "Propping of slabs",
                    "criteria": "Continue for min 14 days or as design",
                    "code": "IS 456:2000",
                    "severity": Severity.MAJOR
                }
            ]
        },
        QCStage.MASONRY: {
            "title": "Masonry Work Inspection",
            "is_code": "IS 2185, IS 1905",
            "items": [
                {
                    "desc": "Block quality - AAC blocks",
                    "criteria": "600x200x300mm, density 550-650 kg/m³",
                    "code": "IS 2185 (Part 3)",
                    "severity": Severity.MAJOR
                },
                {
                    "desc": "Compressive strength of blocks",
                    "criteria": "≥ 4.5 N/mm² for load bearing",
                    "code": "IS 2185",
                    "severity": Severity.CRITICAL
                },
                {
                    "desc": "Mortar mix proportion",
                    "criteria": "1:6 (cement:sand) for masonry",
                    "code": "IS 2250:1981",
                    "severity": Severity.MAJOR
                },
                {
                    "desc": "Block joint thickness",
                    "criteria": "8-12mm horizontal, 10-15mm vertical",
                    "code": "IS 1905:1987",
                    "severity": Severity.MINOR
                },
                {
                    "desc": "Wall plumb and alignment",
                    "criteria": "±5mm per 3m height, line level",
                    "code": "IS 1905:1987",
                    "severity": Severity.MINOR
                },
                {
                    "desc": "Reinforcement in masonry",
                    "criteria": "Every 4th course, 2 bars of 6mm",
                    "code": "IS 1905:1987",
                    "severity": Severity.MAJOR
                },
                {
                    "desc": "Lintel over openings",
                    "criteria": "Min 150mm bearing on each side",
                    "code": "IS 1905:1987",
                    "severity": Severity.MAJOR
                },
                {
                    "desc": "Damp proof course (DPC)",
                    "criteria": "40mm thick 1:2:4 concrete with waterproofing",
                    "code": "IS 3067:1988",
                    "severity": Severity.CRITICAL
                },
                {
                    "desc": "Curing of masonry",
                    "criteria": "7 days wet curing for mortar",
                    "code": "IS 2250:1981",
                    "severity": Severity.MAJOR
                },
                {
                    "desc": "Control joint spacing",
                    "criteria": "Every 6m or as design, 15mm wide",
                    "code": "IS 1905:1987",
                    "severity": Severity.MINOR
                }
            ]
        },
        QCStage.PLASTERING: {
            "title": "Plastering Work Inspection",
            "is_code": "IS 1661:1972",
            "items": [
                {
                    "desc": "Plaster thickness",
                    "criteria": "12mm internal, 20mm external ±3mm",
                    "code": "IS 1661:1972",
                    "severity": Severity.MAJOR
                },
                {
                    "desc": "Mortar mix",
                    "criteria": "1:4 (cement:sand) for internal, 1:5 external",
                    "code": "IS 1661:1972",
                    "severity": Severity.MAJOR
                },
                {
                    "desc": "Surface preparation",
                    "criteria": "Hacked, cleaned, watered before plastering",
                    "code": "IS 1661:1972",
                    "severity": Severity.MAJOR
                },
                {
                    "desc": "Plumb and levelness",
                    "criteria": "±3mm per 2m using straight edge",
                    "code": "IS 1661:1972",
                    "severity": Severity.MINOR
                },
                {
                    "desc": "Surface finish",
                    "criteria": "Smooth, no cracks, no hollowness",
                    "code": "IS 1661:1972",
                    "severity": Severity.MINOR
                },
                {
                    "desc": "Curing period",
                    "criteria": "Min 10 days wet curing",
                    "code": "IS 1661:1972",
                    "severity": Severity.MAJOR
                },
                {
                    "desc": "Corner beads and edges",
                    "criteria": "Sharp and straight edges",
                    "code": "IS 1661:1972",
                    "severity": Severity.MINOR
                }
            ]
        },
        QCStage.ELECTRICAL: {
            "title": "Electrical Work Inspection",
            "is_code": "IS 732:1989, IS 3043",
            "items": [
                {
                    "desc": "Conduit laying",
                    "criteria": "Rigid PVC/MS conduit, proper supports @1m",
                    "code": "IS 9537",
                    "severity": Severity.MAJOR
                },
                {
                    "desc": "Wire gauge",
                    "criteria": "As per load calculation, min 2.5 sq mm",
                    "code": "IS 694:1990",
                    "severity": Severity.CRITICAL
                },
                {
                    "desc": "Earth electrode installation",
                    "criteria": "Copper plate/rod, resistance < 5 ohms",
                    "code": "IS 3043:1987",
                    "severity": Severity.CRITICAL
                },
                {
                    "desc": "MCB/ELCB rating",
                    "criteria": "As per circuit load, proper coordination",
                    "code": "IS 8826:1978",
                    "severity": Severity.CRITICAL
                },
                {
                    "desc": "Switch and outlet heights",
                    "criteria": "Switch 1.2m, outlet 0.3m from FFL",
                    "code": "IS 732:1989",
                    "severity": Severity.MINOR
                },
                {
                    "desc": "Insulation resistance",
                    "criteria": "≥ 1 MΩ between conductors and earth",
                    "code": "IS 732:1989",
                    "severity": Severity.CRITICAL
                },
                {
                    "desc": "Lightning protection",
                    "criteria": "Copper tape/conductor if required",
                    "code": "IS 2309:1989",
                    "severity": Severity.MAJOR
                }
            ]
        }
    }
    
    def __init__(self, project_id: str):
        self.project_id = project_id
        self.checklists: List[QCChecklist] = []
        self._initialize_checklists()
    
    def _initialize_checklists(self):
        """Initialize all QC checklists from templates"""
        for stage, template in self.CHECKLIST_TEMPLATES.items():
            checklist = QCChecklist(
                id=f"QC-{stage.value.upper()}",
                stage=stage,
                title=template["title"],
                is_code=template["is_code"]
            )
            
            # Add items from template
            for idx, item_data in enumerate(template["items"]):
                item = QCCheckItem(
                    id=f"{checklist.id}-ITEM-{idx+1:02d}",
                    description=item_data["desc"],
                    is_code_reference=item_data["code"],
                    acceptance_criteria=item_data["criteria"],
                    severity=item_data.get("severity", Severity.OBSERVATION)
                )
                checklist.items.append(item)
            
            self.checklists.append(checklist)
    
    def get_checklist(self, stage: QCStage) -> Optional[QCChecklist]:
        """Get checklist for a specific stage"""
        for cl in self.checklists:
            if cl.stage == stage:
                return cl
        return None
    
    def update_item_status(self, checklist_id: str, item_id: str, 
                          status: QCStatus, notes: str = "",
                          checked_by: str = ""):
        """Update status of a checklist item"""
        for cl in self.checklists:
            if cl.id == checklist_id:
                for item in cl.items:
                    if item.id == item_id:
                        item.status = status
                        item.notes = notes
                        item.checked_by = checked_by
                        item.checked_date = datetime.now().isoformat()
                        
                        # Update overall checklist status
                        self._update_checklist_status(cl)
                        return True
        return False
    
    def add_photo_to_item(self, checklist_id: str, item_id: str, photo: QCPhoto):
        """Add photo to checklist item"""
        for cl in self.checklists:
            if cl.id == checklist_id:
                for item in cl.items:
                    if item.id == item_id:
                        item.add_photo(photo)
                        return True
        return False
    
    def create_non_conformance(self, checklist_id: str, item_id: str,
                              description: str, severity: Severity,
                              photos: Optional[List[QCPhoto]] = None) -> QCNonConformance:
        """Create a non-conformance report"""
        nc = QCNonConformance(
            id=f"NC-{datetime.now().strftime('%Y%m%d-%H%M%S')}",
            item_id=item_id,
            description=description,
            severity=severity,
            photos=photos or []
        )
        
        for cl in self.checklists:
            if cl.id == checklist_id:
                cl.non_conformances.append(nc)
                # Update item status
                for item in cl.items:
                    if item.id == item_id:
                        item.status = QCStatus.FAILED
                break
        
        return nc
    
    def close_non_conformance(self, nc_id: str, corrective_action: str,
                             closure_date: Optional[str] = None):
        """Close a non-conformance"""
        for cl in self.checklists:
            for nc in cl.non_conformances:
                if nc.id == nc_id:
                    nc.corrective_action = corrective_action
                    nc.closure_date = closure_date or datetime.now().isoformat()
                    nc.status = "closed"
                    
                    # Update related item status
                    for item in cl.items:
                        if item.id == nc.item_id:
                            item.status = QCStatus.PASSED
                    return True
        return False
    
    def _update_checklist_status(self, checklist: QCChecklist):
        """Update overall checklist status based on items"""
        statuses = [item.status for item in checklist.items]
        
        if all(s == QCStatus.PASSED for s in statuses):
            checklist.overall_status = QCStatus.PASSED
        elif any(s == QCStatus.FAILED for s in statuses):
            checklist.overall_status = QCStatus.FAILED
        elif any(s == QCStatus.IN_PROGRESS for s in statuses):
            checklist.overall_status = QCStatus.IN_PROGRESS
        elif any(s == QCStatus.REWORK_REQUIRED for s in statuses):
            checklist.overall_status = QCStatus.REWORK_REQUIRED
    
    def get_qc_summary(self) -> Dict:
        """Get summary of all QC activities"""
        total_items = sum(len(cl.items) for cl in self.checklists)
        passed = sum(1 for cl in self.checklists for item in cl.items 
                    if item.status == QCStatus.PASSED)
        failed = sum(1 for cl in self.checklists for item in cl.items 
                    if item.status == QCStatus.FAILED)
        pending = sum(1 for cl in self.checklists for item in cl.items 
                     if item.status == QCStatus.NOT_STARTED)
        
        total_nc = sum(len(cl.non_conformances) for cl in self.checklists)
        open_nc = sum(1 for cl in self.checklists 
                     for nc in cl.non_conformances if nc.status == "open")
        
        return {
            "total_checklists": len(self.checklists),
            "total_items": total_items,
            "passed": passed,
            "failed": failed,
            "pending": pending,
            "completion_percentage": (passed / total_items * 100) if total_items > 0 else 0,
            "total_non_conformances": total_nc,
            "open_non_conformances": open_nc,
            "status": "complete" if pending == 0 else "in_progress"
        }
    
    def get_stage_progress(self) -> List[Dict]:
        """Get progress by construction stage"""
        progress = []
        for cl in self.checklists:
            total = len(cl.items)
            passed = sum(1 for item in cl.items if item.status == QCStatus.PASSED)
            failed = sum(1 for item in cl.items if item.status == QCStatus.FAILED)
            
            progress.append({
                "stage": cl.stage.value,
                "title": cl.title,
                "total_items": total,
                "passed": passed,
                "failed": failed,
                "progress": (passed / total * 100) if total > 0 else 0,
                "status": cl.overall_status.value,
                "has_non_conformances": len(cl.non_conformances) > 0
            })
        return progress

# Example usage
if __name__ == "__main__":
    qc = QCChecklistManager("PROJ-001")
    
    # Get foundation checklist
    foundation_cl = qc.get_checklist(QCStage.FOUNDATION)
    
    if foundation_cl:
        # Update item status
        qc.update_item_status(
            foundation_cl.id,
            f"{foundation_cl.id}-ITEM-01",
            QCStatus.PASSED,
            "Excavation dimensions verified within tolerance",
            "John Doe - Site Engineer"
        )
        
        # Add photo
        photo = QCPhoto(
            id="IMG-001",
            url="/photos/excavation_001.jpg",
            caption="Foundation excavation at grid A-1",
            taken_by="John Doe",
            timestamp="2024-02-15T10:30:00"
        )
        qc.add_photo_to_item(foundation_cl.id, f"{foundation_cl.id}-ITEM-01", photo)
        
        # Create non-conformance
        nc = qc.create_non_conformance(
            foundation_cl.id,
            f"{foundation_cl.id}-ITEM-05",
            "Reinforcement cover less than 50mm at corner",
            Severity.MAJOR
        )
    
    # Print summary
    print(qc.get_qc_summary())