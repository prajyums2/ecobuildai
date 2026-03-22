import React, { useState, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { FaMoneyBillWave, FaChartPie, FaExclamationTriangle, FaCheckCircle, FaClock, FaFileInvoiceDollar, FaPlus, FaTrash, FaSave } from 'react-icons/fa';

// Standard Kerala construction payment milestones
const defaultMilestones = [
  { id: 'MS-01', name: 'Advance Payment', percentage: 10, description: 'Mobilization advance' },
  { id: 'MS-02', name: 'Foundation Completion', percentage: 15, description: 'Footings, plinth beams' },
  { id: 'MS-03', name: 'Superstructure 50%', percentage: 15, description: 'Columns, beams' },
  { id: 'MS-04', name: 'Roof Slab', percentage: 15, description: 'Slab completion' },
  { id: 'MS-05', name: 'Masonry Work', percentage: 15, description: 'Block walls' },
  { id: 'MS-06', name: 'Plastering', percentage: 10, description: 'Internal/external plaster' },
  { id: 'MS-07', name: 'Finishing Works', percentage: 15, description: 'Flooring, painting, electrical' },
  { id: 'MS-08', name: 'Final Completion', percentage: 5, description: 'Handover, retention' }
];

function CostTracking() {
  const { project } = useProject();
  const [totalBudget, setTotalBudget] = useState(0);
  const [milestones, setMilestones] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [initialized, setInitialized] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [paymentReference, setPaymentReference] = useState('');
  
  // Expense form
  const [expenseCategory, setExpenseCategory] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseVendor, setExpenseVendor] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);

  // Load from localStorage when project changes
  useEffect(() => {
    console.log('CostTracking: Project changed to', project?.id);
    setLoading(true);
    
    if (project?.id) {
      const storageKey = `cost-tracking-${project.id}`;
      const saved = localStorage.getItem(storageKey);
      console.log('CostTracking: Loading from key', storageKey, 'Data exists:', !!saved);
      
      if (saved) {
        try {
          const data = JSON.parse(saved);
          console.log('CostTracking: Loaded data', data);
          setTotalBudget(data.totalBudget || 0);
          setMilestones(data.milestones || []);
          setExpenses(data.expenses || []);
          setInitialized(true);
        } catch (e) {
          console.error('CostTracking: Error loading data', e);
          resetState();
        }
      } else {
        console.log('CostTracking: No saved data found');
        resetState();
      }
    } else {
      resetState();
    }
    
    setLoading(false);
  }, [project?.id]);

  const resetState = () => {
    setInitialized(false);
    setTotalBudget(0);
    setMilestones([]);
    setExpenses([]);
  };

  // Save to localStorage whenever data changes
  useEffect(() => {
    if (initialized && project?.id && !loading) {
      const storageKey = `cost-tracking-${project.id}`;
      const data = {
        totalBudget,
        milestones,
        expenses,
        savedAt: new Date().toISOString()
      };
      console.log('CostTracking: Saving to', storageKey, data);
      localStorage.setItem(storageKey, JSON.stringify(data));
    }
  }, [totalBudget, milestones, expenses, initialized, project?.id, loading]);

  const initializeTracking = (budget) => {
    console.log('CostTracking: Initializing with budget', budget);
    const calculatedMilestones = defaultMilestones.map(m => ({
      ...m,
      amount: (budget * m.percentage) / 100,
      paid: 0,
      status: 'pending',
      payments: []
    }));
    
    setTotalBudget(budget);
    setMilestones(calculatedMilestones);
    setExpenses([]);
    setInitialized(true);
  };

  const handleInitialize = () => {
    const budget = prompt('Enter total project budget (₹):', '5000000');
    if (budget && !isNaN(budget)) {
      initializeTracking(parseFloat(budget));
    }
  };

  const recordPayment = () => {
    if (!selectedMilestone || !paymentAmount) return;
    
    const milestone = milestones.find(m => m.id === selectedMilestone);
    if (!milestone) return;

    const amount = parseFloat(paymentAmount);
    const newPayment = {
      id: Date.now(),
      amount,
      date: paymentDate,
      method: paymentMethod,
      reference: paymentReference
    };

    setMilestones(prev => prev.map(m => {
      if (m.id === selectedMilestone) {
        const newPaid = m.paid + amount;
        return {
          ...m,
          paid: newPaid,
          status: newPaid >= m.amount ? 'paid' : (newPaid > 0 ? 'partial' : 'pending'),
          payments: [...(m.payments || []), newPayment]
        };
      }
      return m;
    }));

    // Reset form
    setShowPaymentForm(false);
    setPaymentAmount('');
    setPaymentReference('');
    setSelectedMilestone('');
  };

  const addExpense = () => {
    if (!expenseCategory || !expenseAmount) return;

    const newExpense = {
      id: Date.now(),
      category: expenseCategory,
      description: expenseDescription,
      vendor: expenseVendor,
      amount: parseFloat(expenseAmount),
      date: expenseDate
    };

    setExpenses(prev => [...prev, newExpense]);
    
    // Reset form
    setShowExpenseForm(false);
    setExpenseCategory('');
    setExpenseDescription('');
    setExpenseVendor('');
    setExpenseAmount('');
  };

  const deleteExpense = (id) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  // Manual save function
  const manualSave = () => {
    if (project?.id) {
      const storageKey = `cost-tracking-${project.id}`;
      const data = {
        totalBudget,
        milestones,
        expenses,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(storageKey, JSON.stringify(data));
      alert('Data saved manually!');
    }
  };

  // Calculations
  const totalPaid = milestones.reduce((sum, m) => sum + (m.paid || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const balance = totalBudget - totalPaid;
  const budgetUtilization = totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!initialized) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Cost Tracking</h1>
            <p className="text-foreground-muted">Payment milestones and expense management</p>
          </div>
          <button onClick={manualSave} className="btn btn-secondary">
            <FaSave className="mr-2" />
            Test Save
          </button>
        </div>

        <div className="card p-12 text-center">
          <div className="empty-state-icon mx-auto mb-6">
            <FaMoneyBillWave className="text-3xl" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">Initialize Cost Tracking</h2>
          <p className="text-foreground-secondary mb-6 max-w-md mx-auto">
            Set up your project budget and payment milestones to start tracking costs.
            {project?.id && <span className="block mt-2 text-sm">Project ID: {project.id}</span>}
          </p>
          <button onClick={handleInitialize} className="btn btn-primary">
            <FaPlus className="mr-2" />
            Initialize Cost Tracking
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Cost Tracking</h1>
          <p className="text-foreground-muted">Payment milestones and expense management</p>
          {project?.id && <p className="text-xs text-foreground-muted mt-1">Project: {project.id}</p>}
        </div>
        <div className="flex gap-2">
          <button onClick={manualSave} className="btn btn-secondary">
            <FaSave className="mr-2" />
            Save Now
          </button>
          <button onClick={() => setShowExpenseForm(true)} className="btn btn-secondary">
            <FaFileInvoiceDollar className="mr-2" />
            Add Expense
          </button>
          <button onClick={() => setShowPaymentForm(true)} className="btn btn-primary">
            <FaMoneyBillWave className="mr-2" />
            Record Payment
          </button>
        </div>
      </div>

      {/* Budget Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-6">
          <h3 className="text-sm text-foreground-muted mb-2">Total Budget</h3>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(totalBudget)}</p>
        </div>
        <div className="card p-6">
          <h3 className="text-sm text-foreground-muted mb-2">Total Paid</h3>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="card p-6">
          <h3 className="text-sm text-foreground-muted mb-2">Balance</h3>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(balance)}</p>
        </div>
        <div className="card p-6">
          <h3 className="text-sm text-foreground-muted mb-2">Expenses</h3>
          <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalExpenses)}</p>
          <div className="w-full bg-background-tertiary rounded-full h-2 mt-2">
            <div 
              className="bg-orange-500 h-2 rounded-full transition-all"
              style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Rest of the component... */}
      <div className="card">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-semibold">Cost Tracking Data Loaded</h2>
          <p className="text-sm text-green-600 mt-1">
            <FaCheckCircle className="inline mr-1" />
            Data is being persisted for this project
          </p>
          <p className="text-xs text-foreground-muted mt-2">
            Project ID: {project?.id} | Milestones: {milestones.length} | Expenses: {expenses.length}
          </p>
        </div>
        
        <div className="p-6">
          <p className="text-foreground-muted">
            Your cost tracking data is automatically saved. Switch between projects and your data will persist.
          </p>
          
          <div className="mt-4 space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Payment Milestones</h3>
              {milestones.map(m => (
                <div key={m.id} className="flex justify-between p-3 bg-background-tertiary rounded mb-2">
                  <span>{m.name}</span>
                  <span className="font-mono">{formatCurrency(m.amount)} - {m.status}</span>
                </div>
              ))}
            </div>
            
            {expenses.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Recent Expenses</h3>
                {expenses.slice(0, 5).map(e => (
                  <div key={e.id} className="flex justify-between p-3 bg-background-tertiary rounded mb-2">
                    <span>{e.category}: {e.description}</span>
                    <span className="font-mono">{formatCurrency(e.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card w-full max-w-md m-4">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold">Record Payment</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Milestone</label>
                <select 
                  value={selectedMilestone}
                  onChange={(e) => setSelectedMilestone(e.target.value)}
                  className="input w-full"
                >
                  <option value="">Select milestone...</option>
                  {milestones.map(m => (
                    <option key={m.id} value={m.id}>{m.name} (Remaining: {formatCurrency(m.amount - m.paid)})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Amount (₹)</label>
                <input 
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="input w-full"
                  placeholder="Enter amount"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input 
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="input w-full"
                />
              </div>
            </div>
            <div className="p-6 border-t border-border flex gap-2 justify-end">
              <button onClick={() => setShowPaymentForm(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={recordPayment} className="btn btn-primary">Record Payment</button>
            </div>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {showExpenseForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card w-full max-w-md m-4">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold">Add Expense</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select 
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  className="input w-full"
                >
                  <option value="">Select category...</option>
                  <option value="Cement">Cement</option>
                  <option value="Steel">Steel</option>
                  <option value="Labor">Labor</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Amount (₹)</label>
                <input 
                  type="number"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="input w-full"
                  placeholder="Enter amount"
                />
              </div>
            </div>
            <div className="p-6 border-t border-border flex gap-2 justify-end">
              <button onClick={() => setShowExpenseForm(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={addExpense} className="btn btn-primary">Add Expense</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CostTracking;