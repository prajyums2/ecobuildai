"""
Cost Tracking and Payment Milestones Module
Tracks actual project costs vs estimates and manages payment schedules
"""

from datetime import datetime
from typing import List, Dict, Optional
from dataclasses import dataclass, field
from enum import Enum

class PaymentStatus(Enum):
    PENDING = "pending"
    PARTIAL = "partial"
    PAID = "paid"
    OVERDUE = "overdue"

class MilestoneType(Enum):
    ADVANCE = "advance"
    FOUNDATION = "foundation"
    PLINTH = "plinth"
    SUPERSTRUCTURE = "superstructure"
    ROOFING = "roofing"
    MASONRY = "masonry"
    PLASTERING = "plastering"
    FLOORING = "flooring"
    ELECTRICAL = "electrical"
    PLUMBING = "plumbing"
    FINISHING = "finishing"
    COMPLETION = "completion"

@dataclass
class PaymentMilestone:
    id: str
    name: str
    type: MilestoneType
    description: str
    percentage_of_total: float
    estimated_amount: float
    actual_amount: float = 0.0
    due_date: Optional[str] = None
    completion_percentage: float = 0.0
    status: PaymentStatus = PaymentStatus.PENDING
    payments_received: List[Dict] = field(default_factory=list)
    notes: str = ""
    
    def get_remaining_amount(self) -> float:
        total_paid = sum(p['amount'] for p in self.payments_received)
        return self.actual_amount - total_paid
    
    def get_total_paid(self) -> float:
        return sum(p['amount'] for p in self.payments_received)

@dataclass
class ActualCost:
    id: str
    date: str
    category: str
    description: str
    vendor: str
    invoice_number: Optional[str]
    estimated_cost: float
    actual_cost: float
    quantity: float
    unit: str
    wastage_applied: bool = True
    notes: str = ""
    attachments: List[str] = field(default_factory=list)

class CostTracker:
    """
    Main cost tracking system for construction projects
    """
    
    # Standard payment schedule for Kerala construction
    DEFAULT_MILESTONES = [
        {
            "type": MilestoneType.ADVANCE,
            "name": "Advance Payment",
            "percentage": 10,
            "description": "Mobilization and site preparation"
        },
        {
            "type": MilestoneType.FOUNDATION,
            "name": "Foundation Completion",
            "percentage": 15,
            "description": "Footings, plinth beams, PCC"
        },
        {
            "type": MilestoneType.PLINTH,
            "name": "Plinth Level",
            "percentage": 5,
            "description": "Plinth filling, ground floor slab"
        },
        {
            "type": MilestoneType.SUPERSTRUCTURE,
            "name": "Superstructure 50%",
            "percentage": 15,
            "description": "50% of column and beam work"
        },
        {
            "type": MilestoneType.ROOFING,
            "name": "Roof Slab Completion",
            "percentage": 15,
            "description": "All roof slabs and weathering course"
        },
        {
            "type": MilestoneType.MASONRY,
            "name": "Masonry Work",
            "percentage": 10,
            "description": "Block work and brick work"
        },
        {
            "type": MilestoneType.PLASTERING,
            "name": "Plastering",
            "percentage": 10,
            "description": "Internal and external plastering"
        },
        {
            "type": MilestoneType.ELECTRICAL,
            "name": "Electrical & Plumbing",
            "percentage": 5,
            "description": "Concealed wiring and plumbing"
        },
        {
            "type": MilestoneType.FLOORING,
            "name": "Flooring & Tile Work",
            "percentage": 8,
            "description": "Floor tiles and wall tiles"
        },
        {
            "type": MilestoneType.FINISHING,
            "name": "Finishing & Painting",
            "percentage": 5,
            "description": "Doors, windows, painting"
        },
        {
            "type": MilestoneType.COMPLETION,
            "name": "Final Completion",
            "percentage": 2,
            "description": "Handover and snagging"
        }
    ]
    
    def __init__(self, project_id: str, total_budget: float):
        self.project_id = project_id
        self.total_budget = total_budget
        self.milestones: List[PaymentMilestone] = []
        self.actual_costs: List[ActualCost] = []
        self.contingency_percentage = 5.0
        
        # Initialize default milestones
        self._initialize_milestones()
    
    def _initialize_milestones(self):
        """Create default payment milestone structure"""
        for idx, ms in enumerate(self.DEFAULT_MILESTONES):
            estimated = (ms['percentage'] / 100) * self.total_budget
            milestone = PaymentMilestone(
                id=f"MS-{idx+1:02d}",
                name=ms['name'],
                type=ms['type'],
                description=ms['description'],
                percentage_of_total=ms['percentage'],
                estimated_amount=estimated,
                actual_amount=estimated  # Initially same as estimated
            )
            self.milestones.append(milestone)
    
    def update_milestone_amount(self, milestone_id: str, actual_amount: float):
        """Update actual cost for a milestone"""
        for ms in self.milestones:
            if ms.id == milestone_id:
                ms.actual_amount = actual_amount
                break
    
    def record_payment(self, milestone_id: str, amount: float, 
                      payment_date: str, payment_method: str, 
                      reference: str, notes: str = ""):
        """Record a payment received for a milestone"""
        for ms in self.milestones:
            if ms.id == milestone_id:
                payment = {
                    "id": f"PAY-{len(ms.payments_received)+1:03d}",
                    "amount": amount,
                    "date": payment_date,
                    "method": payment_method,
                    "reference": reference,
                    "notes": notes
                }
                ms.payments_received.append(payment)
                
                # Update status
                total_paid = ms.get_total_paid()
                if total_paid >= ms.actual_amount:
                    ms.status = PaymentStatus.PAID
                elif total_paid > 0:
                    ms.status = PaymentStatus.PARTIAL
                break
    
    def add_actual_cost(self, cost: ActualCost):
        """Add an actual expense to tracking"""
        self.actual_costs.append(cost)
    
    def get_total_paid(self) -> float:
        """Get total amount paid across all milestones"""
        return sum(ms.get_total_paid() for ms in self.milestones)
    
    def get_total_remaining(self) -> float:
        """Get total remaining to be paid"""
        return sum(ms.get_remaining_amount() for ms in self.milestones)
    
    def get_actual_total_cost(self) -> float:
        """Get sum of all actual costs"""
        return sum(cost.actual_cost for cost in self.actual_costs)
    
    def get_variance(self) -> float:
        """Get difference between estimated and actual costs"""
        return self.get_actual_total_cost() - self.total_budget
    
    def get_cost_by_category(self) -> Dict[str, Dict]:
        """Get costs grouped by category"""
        categories = {}
        for cost in self.actual_costs:
            if cost.category not in categories:
                categories[cost.category] = {
                    "estimated": 0,
                    "actual": 0,
                    "items": []
                }
            categories[cost.category]["estimated"] += cost.estimated_cost
            categories[cost.category]["actual"] += cost.actual_cost
            categories[cost.category]["items"].append(cost)
        return categories
    
    def get_budget_health(self) -> Dict:
        """Get overall budget health metrics"""
        actual_total = self.get_actual_total_cost()
        paid = self.get_total_paid()
        remaining = self.get_total_remaining()
        variance = self.get_variance()
        
        contingency = (self.contingency_percentage / 100) * self.total_budget
        available = self.total_budget + contingency - actual_total
        
        return {
            "total_budget": self.total_budget,
            "contingency": contingency,
            "total_available": self.total_budget + contingency,
            "actual_spent": actual_total,
            "total_paid": paid,
            "total_remaining": remaining,
            "variance": variance,
            "variance_percentage": (variance / self.total_budget) * 100 if self.total_budget > 0 else 0,
            "available_balance": available,
            "status": "healthy" if available > 0 else "over_budget"
        }
    
    def get_milestone_summary(self) -> List[Dict]:
        """Get summary of all milestones"""
        return [
            {
                "id": ms.id,
                "name": ms.name,
                "type": ms.type.value,
                "percentage": ms.percentage_of_total,
                "estimated": ms.estimated_amount,
                "actual": ms.actual_amount,
                "paid": ms.get_total_paid(),
                "remaining": ms.get_remaining_amount(),
                "completion": ms.completion_percentage,
                "status": ms.status.value,
                "due_date": ms.due_date
            }
            for ms in self.milestones
        ]
    
    def generate_payment_schedule(self) -> Dict:
        """Generate complete payment schedule"""
        schedule = {
            "project_id": self.project_id,
            "total_budget": self.total_budget,
            "milestones": self.get_milestone_summary(),
            "budget_health": self.get_budget_health(),
            "recommendations": self._generate_recommendations()
        }
        return schedule
    
    def _generate_recommendations(self) -> List[str]:
        """Generate financial recommendations"""
        recommendations = []
        health = self.get_budget_health()
        
        if health["status"] == "over_budget":
            recommendations.append("⚠️ CRITICAL: Project is over budget. Consider cost-cutting measures or budget revision.")
        elif health["variance_percentage"] > 5:
            recommendations.append("⚠️ WARNING: Cost variance exceeds 5%. Monitor expenses closely.")
        
        # Check for pending payments
        overdue = [ms for ms in self.milestones if ms.status == PaymentStatus.OVERDUE]
        if overdue:
            recommendations.append(f"⚠️ {len(overdue)} payment(s) are overdue. Follow up with client.")
        
        # Check milestone completion
        incomplete = [ms for ms in self.milestones if ms.completion_percentage < 100]
        if incomplete:
            recommendations.append(f"📋 {len(incomplete)} milestone(s) incomplete. Track progress for payment release.")
        
        if not recommendations:
            recommendations.append("✅ Project finances are on track. Continue monitoring.")
        
        return recommendations

# Example usage
if __name__ == "__main__":
    # Initialize cost tracker for a 50 lakh project
    tracker = CostTracker("PROJ-001", 5000000)
    
    # Update milestone actual amounts (after variation)
    tracker.update_milestone_amount("MS-01", 550000)
    
    # Record payments
    tracker.record_payment(
        "MS-01", 
        500000, 
        "2024-02-01", 
        "Bank Transfer",
        "TXN123456",
        "Advance payment received"
    )
    
    # Add actual costs
    cost = ActualCost(
        id="COST-001",
        date="2024-02-05",
        category="Concrete",
        description="M25 concrete for foundation",
        vendor="KTJ Steel",
        invoice_number="INV-001",
        estimated_cost=150000,
        actual_cost=165000,
        quantity=30,
        unit="cu.m"
    )
    tracker.add_actual_cost(cost)
    
    # Get report
    print(tracker.generate_payment_schedule())