import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAawIp5XOARPpSZ0MGIrJeUtd10alEDtyE",
  authDomain: "employee-leve-balance.firebaseapp.com",
  projectId: "employee-leve-balance",
  storageBucket: "employee-leve-balance.firebasestorage.app",
  messagingSenderId: "651217223387",
  appId: "1:651217223387:web:bc8f61b215673c8744d6fe",
  measurementId: "G-MRGBLQQ6M5"
};

let db = null;
let isFirebaseInitialized = false;

try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  isFirebaseInitialized = true;
  console.log("🔥 Firebase Initialized Successfully!");
} catch (e) {
  console.warn("⚠️ Firebase warning, falling back to local state.", e);
}

export default function App() {
  const [employees, setEmployees] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Search filter state
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpRole, setNewEmpRole] = useState('');
  const [newEmpJoinDate, setNewEmpJoinDate] = useState('2026-10-28');

  // Edit Employee Modal States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editEmpName, setEditEmpName] = useState('');
  const [editEmpRole, setEditEmpRole] = useState('');
  const [editEmpJoinDate, setEditEmpJoinDate] = useState('');

  const [showPaidModal, setShowPaidModal] = useState(false);
  const [paidDays, setPaidDays] = useState(1);
  const [paidReason, setPaidReason] = useState('');
  const [paidLeaveDate, setPaidLeaveDate] = useState(new Date().toISOString().split('T')[0]);

  // Edit Paid Leave Modal States
  const [showEditPaidModal, setShowEditPaidModal] = useState(false);
  const [editPaidId, setEditPaidId] = useState(null);
  const [editPaidDays, setEditPaidDays] = useState(1);
  const [editPaidReason, setEditPaidReason] = useState('');
  const [editPaidDate, setEditPaidDate] = useState('');

  const [showEarnCompModal, setShowEarnCompModal] = useState(false);
  const [compEarnDate, setCompEarnDate] = useState(new Date().toISOString().split('T')[0]);
  const [compEarnReason, setCompEarnReason] = useState('');

  const [showUseCompModal, setShowUseCompModal] = useState(false);
  const [compUseDate, setCompUseDate] = useState(new Date().toISOString().split('T')[0]);
  const [compUseReason, setCompUseReason] = useState('');

  // Edit Comp-Off Modal States
  const [showEditCompModal, setShowEditCompModal] = useState(false);
  const [editCompId, setEditCompId] = useState(null);
  const [editCompType, setEditCompType] = useState('earned');
  const [editCompDate, setEditCompDate] = useState('');
  const [editCompReason, setEditCompReason] = useState('');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!isFirebaseInitialized || !db) {
      console.log("📂 Using LocalStorage fallback.");
      const saved = localStorage.getItem('local_employees_v3');
      if (saved) {
        try { setEmployees(JSON.parse(saved)); } catch (err) {}
      } else {
        const initial = [{
          id: 'emp-1',
          name: 'Aarav Sharma',
          role: 'Principal Engineer',
          joinDate: '2026-10-28',
          paidLeavesTaken: [],
          compOffsEarned: [],
          compOffsUsed: []
        }];
        setEmployees(initial);
        setSelectedId(initial[0].id);
      }
      setLoading(false);
      return;
    }

    console.log("☁️ Connecting to Firestore listener...");
    const docRef = doc(db, 'company_data', 'employees_list_v3');
    const unsubSnap = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log("📥 Data received from Firestore:", data);
        if (data && data.list && data.list.length > 0) {
          setEmployees(data.list);
        }
      } else {
        console.log("📄 Document does not exist yet. Initializing default data...");
        const initial = [{
          id: 'emp-1',
          name: 'Aarav Sharma',
          role: 'Principal Engineer',
          joinDate: '2026-10-28',
          paidLeavesTaken: [],
          compOffsEarned: [],
          compOffsUsed: []
        }];
        setEmployees(initial);
        setDoc(docRef, { list: initial })
          .then(() => console.log("✅ Initial data written to Firestore"))
          .catch((err) => console.error("❌ Error writing initial data:", err));
      }
      setLoading(false);
    }, (err) => {
      console.error("❌ Firestore Snapshot Error:", err);
      setLoading(false);
    });

    return () => {
      unsubSnap();
    };
  }, []);

  // Bulletproof selection state manager: keeps selected employee active unless deleted
  useEffect(() => {
    if (employees.length > 0) {
      if (!selectedId || !employees.some(e => e.id === selectedId)) {
        setSelectedId(employees[0].id);
      }
    }
  }, [employees]);

  const saveToDatabase = (updatedList) => {
    console.log("💾 Attempting to save data to database...", updatedList);
    setEmployees(updatedList);
    if (isFirebaseInitialized && db) {
      const docRef = doc(db, 'company_data', 'employees_list_v3');
      setDoc(docRef, { list: updatedList })
        .then(() => console.log("✅ Successfully saved to Firebase Firestore!"))
        .catch((err) => console.error("❌ Error saving to Firebase:", err));
    } else {
      console.log("💾 Saved to LocalStorage.");
      localStorage.setItem('local_employees_v3', JSON.stringify(updatedList));
    }
  };

  const selectedEmp = employees.find((e) => e.id === selectedId) || employees[0];

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (emp.role && emp.role.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const calculateLeaves = (emp) => {
    if (!emp || !emp.joinDate) return { accrued: 0, taken: 0, balance: 0, compEarned: 0, compUsed: 0, compBalance: 0, totalAvailable: 0 };

    const join = new Date(emp.joinDate);
    const now = new Date();

    let yearsDiff = now.getFullYear() - join.getFullYear();
    let monthsDiff = now.getMonth() - join.getMonth();
    let totalMonths = yearsDiff * 12 + monthsDiff;

    if (now.getDate() >= join.getDate() || now.getMonth() !== join.getMonth() || now.getFullYear() !== join.getFullYear()) {
      if (now.getDate() >= join.getDate()) {
        totalMonths = Math.max(1, totalMonths + 1);
      } else {
        totalMonths = Math.max(1, totalMonths);
      }
    } else {
      totalMonths = 1;
    }

    let accrued = totalMonths * 1.5;

    // Join ≤ 20th: full 1.5 | Join > 20th: 0.5 for start month
    if (join.getDate() > 20) {
      accrued = Math.max(0.5, accrued - 1.0);
    }

    const taken = (emp.paidLeavesTaken || []).reduce((acc, curr) => acc + Number(curr.days || 1), 0);
    const balance = Math.max(0, accrued - taken);

    const compEarned = (emp.compOffsEarned || []).length;
    const compUsed = (emp.compOffsUsed || []).length;
    const compBalance = Math.max(0, compEarned - compUsed);

    const totalAvailable = balance + compBalance;

    return { accrued, taken, balance, compEarned, compUsed, compBalance, totalAvailable };
  };

  const handleAddEmployee = (e) => {
    e.preventDefault();
    if (!newEmpName.trim()) return;
    if (employees.length >= 10) {
      alert("Maximum limit of 10 employees reached.");
      return;
    }
    const newEmp = {
      id: 'emp-' + Date.now(),
      name: newEmpName.trim(),
      role: newEmpRole.trim() || 'Software Engineer',
      joinDate: newEmpJoinDate,
      paidLeavesTaken: [],
      compOffsEarned: [],
      compOffsUsed: []
    };
    const updated = [...employees, newEmp];
    saveToDatabase(updated);
    setSelectedId(newEmp.id);
    setNewEmpName('');
    setNewEmpRole('');
    setShowAddModal(false);
  };

  const openEditModal = () => {
    if (!selectedEmp) return;
    setEditEmpName(selectedEmp.name);
    setEditEmpRole(selectedEmp.role);
    setEditEmpJoinDate(selectedEmp.joinDate);
    setShowEditModal(true);
  };

  const handleUpdateEmployee = (e) => {
    e.preventDefault();
    if (!selectedEmp || !editEmpName.trim()) return;
    const updated = employees.map(emp => {
      if (emp.id === selectedEmp.id) {
        return {
          ...emp,
          name: editEmpName.trim(),
          role: editEmpRole.trim() || 'Software Engineer',
          joinDate: editEmpJoinDate
        };
      }
      return emp;
    });
    saveToDatabase(updated);
    setShowEditModal(false);
  };

  const handleConfirmDelete = (confirm) => {
    setShowDeleteConfirm(false);
    if (confirm && selectedEmp) {
      if (employees.length <= 1) {
        alert("You must keep at least one employee in the system.");
        return;
      }
      const updated = employees.filter(e => e.id !== selectedEmp.id);
      saveToDatabase(updated);
      setSelectedId(updated[0].id);
    }
  };

  const handleAddPaidLeave = (e) => {
    e.preventDefault();
    if (!selectedEmp) return;
    const newLeave = {
      id: Date.now(),
      days: Number(paidDays),
      reason: paidReason || 'Paid Leave',
      date: paidLeaveDate
    };
    const updated = employees.map(emp => {
      if (emp.id === selectedEmp.id) {
        return { ...emp, paidLeavesTaken: [...(emp.paidLeavesTaken || []), newLeave] };
      }
      return emp;
    });
    saveToDatabase(updated);
    setShowPaidModal(false);
    setPaidDays(1);
    setPaidReason('');
    setPaidLeaveDate(new Date().toISOString().split('T')[0]);
  };

  const openEditPaidModal = (leave) => {
    setEditPaidId(leave.id);
    setEditPaidDays(leave.days);
    setEditPaidReason(leave.reason);
    setEditPaidDate(leave.date);
    setShowEditPaidModal(true);
  };

  const handleUpdatePaidLeave = (e) => {
    e.preventDefault();
    if (!selectedEmp) return;
    const updated = employees.map(emp => {
      if (emp.id === selectedEmp.id) {
        const updatedLeaves = (emp.paidLeavesTaken || []).map(leave => {
          if (leave.id === editPaidId) {
            return {
              ...leave,
              days: Number(editPaidDays),
              reason: editPaidReason || 'Paid Leave',
              date: editPaidDate
            };
          }
          return leave;
        });
        return { ...emp, paidLeavesTaken: updatedLeaves };
      }
      return emp;
    });
    saveToDatabase(updated);
    setShowEditPaidModal(false);
  };

  const handleDeletePaidLeave = (leaveId) => {
    if (!window.confirm("Are you sure you want to delete this paid leave record?")) return;
    const updated = employees.map(emp => {
      if (emp.id === selectedEmp.id) {
        const updatedLeaves = (emp.paidLeavesTaken || []).filter(leave => leave.id !== leaveId);
        return { ...emp, paidLeavesTaken: updatedLeaves };
      }
      return emp;
    });
    saveToDatabase(updated);
  };

  const handleEarnComp = (e) => {
    e.preventDefault();
    if (!selectedEmp) return;
    const newComp = {
      id: Date.now(),
      date: compEarnDate,
      reason: compEarnReason || 'Worked on non-working day'
    };
    const updated = employees.map(emp => {
      if (emp.id === selectedEmp.id) {
        return { ...emp, compOffsEarned: [...(emp.compOffsEarned || []), newComp] };
      }
      return emp;
    });
    saveToDatabase(updated);
    setShowEarnCompModal(false);
    setCompEarnReason('');
  };

  const handleUseComp = (e) => {
    e.preventDefault();
    if (!selectedEmp) return;
    const stats = calculateLeaves(selectedEmp);
    if (stats.compBalance <= 0) {
      alert("No available compensation leaves to use!");
      return;
    }
    const newUse = {
      id: Date.now(),
      date: compUseDate,
      reason: compUseReason || 'Comp-off utilized'
    };
    const updated = employees.map(emp => {
      if (emp.id === selectedEmp.id) {
        return { ...emp, compOffsUsed: [...(emp.compOffsUsed || []), newUse] };
      }
      return emp;
    });
    saveToDatabase(updated);
    setShowUseCompModal(false);
    setCompUseReason('');
  };

  const openEditCompModal = (type, comp) => {
    setEditCompId(comp.id);
    setEditCompType(type);
    setEditCompDate(comp.date);
    setEditCompReason(comp.reason);
    setShowEditCompModal(true);
  };

  const handleUpdateComp = (e) => {
    e.preventDefault();
    if (!selectedEmp) return;
    const updated = employees.map(emp => {
      if (emp.id === selectedEmp.id) {
        if (editCompType === 'earned') {
          const updatedEarned = (emp.compOffsEarned || []).map(c => {
            if (c.id === editCompId) {
              return { ...c, date: editCompDate, reason: editCompReason || 'Worked on non-working day' };
            }
            return c;
          });
          return { ...emp, compOffsEarned: updatedEarned };
        } else {
          const updatedUsed = (emp.compOffsUsed || []).map(c => {
            if (c.id === editCompId) {
              return { ...c, date: editCompDate, reason: editCompReason || 'Comp-off utilized' };
            }
            return c;
          });
          return { ...emp, compOffsUsed: updatedUsed };
        }
      }
      return emp;
    });
    saveToDatabase(updated);
    setShowEditCompModal(false);
  };

  const handleDeleteComp = (type, compId) => {
    if (!window.confirm("Are you sure you want to delete this comp-off log?")) return;
    const updated = employees.map(emp => {
      if (emp.id === selectedEmp.id) {
        if (type === 'earned') {
          const updatedEarned = (emp.compOffsEarned || []).filter(c => c.id !== compId);
          return { ...emp, compOffsEarned: updatedEarned };
        } else {
          const updatedUsed = (emp.compOffsUsed || []).filter(c => c.id !== compId);
          return { ...emp, compOffsUsed: updatedUsed };
        }
      }
      return emp;
    });
    saveToDatabase(updated);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#040D1A] flex items-center justify-center text-cyan-400">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-base font-semibold tracking-wide text-slate-300">Loading Enterprise Portal...</p>
        </div>
      </div>
    );
  }

  const currentEmp = selectedEmp || employees[0];
  const stats = calculateLeaves(currentEmp);

  return (
    <div className="min-h-screen bg-[#040D1A] text-slate-100 flex flex-col font-sans antialiased selection:bg-cyan-500 selection:text-slate-950">
      
      {/* Top Navbar */}
      <header className="bg-[#07162C] border-b border-slate-800/80 sticky top-0 z-40 px-8 py-5 flex items-center justify-between shadow-xl">
        <div className="flex items-center space-x-4">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 text-slate-950 font-black text-xl tracking-tight">
            EL
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-3">
              <span>Enterprise Leave Management</span>
              <span className="text-xs bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 px-2.5 py-0.5 rounded-md font-mono uppercase tracking-wider font-semibold">v3.0</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Cloud Storage Connected</span>
              <span className="text-slate-600">•</span>
              <span>Accrual: Join &le; 20th (1.5 days) | Join &gt; 20th (0.5 days for start month)</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          disabled={employees.length >= 10}
          className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-sm transition shadow-lg shadow-orange-500/25 flex items-center gap-2.5 disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
          <span>Add New Employee</span>
          <span className="bg-slate-950/25 px-2 py-0.5 rounded text-xs font-mono font-bold">{employees.length}/10</span>
        </button>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 max-w-[1400px] w-full mx-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Sidebar: Employee Directory */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-[#07162C]/90 backdrop-blur border border-slate-800/80 rounded-2xl p-5 shadow-2xl sticky top-28">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
              <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-widest">
                Directory
              </h2>
              <span className="text-xs text-slate-400 font-mono font-semibold bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                {employees.length} / 10
              </span>
            </div>

            {/* Search Bar */}
            <div className="mb-3">
              <input
                type="text"
                placeholder="Search employee..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#040D1A] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-medium placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2.5 max-h-[calc(100vh-300px)] overflow-y-auto pr-1">
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((emp) => {
                  const isSelected = currentEmp && currentEmp.id === emp.id;
                  return (
                    <button
                      key={emp.id}
                      onClick={() => setSelectedId(emp.id)}
                      className={`w-full text-left p-3.5 rounded-xl transition-all duration-200 flex items-center justify-between group ${
                        isSelected
                          ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30 border-l-4 border-orange-400 font-medium'
                          : 'bg-[#050E1A] hover:bg-[#0a1e38] text-slate-300 border border-slate-800/60'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-bold text-sm tracking-wide truncate">{emp.name}</p>
                        <p className={`text-xs truncate mt-0.5 ${isSelected ? 'text-cyan-100 font-medium' : 'text-slate-400'}`}>
                          {emp.role || 'Staff'}
                        </p>
                      </div>
                      <span className={`text-[11px] font-mono px-2 py-1 rounded-md shrink-0 ${
                        isSelected ? 'bg-slate-950/30 text-white font-semibold' : 'bg-slate-900 text-slate-400 border border-slate-800'
                      }`}>
                        {emp.joinDate}
                      </span>
                    </button>
                  );
                })
              ) : (
                <p className="text-xs text-slate-500 py-6 text-center italic">No matching employees.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Dashboard Area */}
        <div className="lg:col-span-9 space-y-6">
          {currentEmp ? (
            <>
              {/* Employee Header Profile Card */}
              <div className="bg-[#07162C] border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3.5 flex-wrap">
                    <h2 className="text-2xl font-bold tracking-tight text-white">{currentEmp.name}</h2>
                    <span className="bg-cyan-950/80 text-cyan-300 text-xs px-3 py-1 rounded-full border border-cyan-500/30 font-semibold">
                      {currentEmp.role || 'Software Engineer'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 flex items-center gap-2 flex-wrap">
                    <span>Joining Date:</span>
                    <span className="text-cyan-400 font-mono font-bold text-base">{currentEmp.joinDate}</span>
                    <span className="text-slate-500 text-xs">({Number(currentEmp.joinDate.split('-')[2]) <= 20 ? 'Full 1.5 start month credit' : '0.5 start month credit'})</span>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={openEditModal}
                    className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Edit Profile</span>
                  </button>

                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Delete Employee</span>
                  </button>
                </div>
              </div>

              {/* Stat Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Paid Leave Card */}
                <div className="bg-gradient-to-b from-[#07162C] to-[#051020] border border-cyan-500/20 rounded-2xl p-6 shadow-2xl relative overflow-hidden group hover:border-cyan-500/40 transition">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none"></div>
                  <p className="text-xs font-bold text-cyan-400 uppercase tracking-widest">Paid Leave Balance</p>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-4xl font-extrabold text-white font-mono tracking-tight">{stats.balance.toFixed(1)}</span>
                    <span className="text-xs text-slate-400 font-mono font-medium">Accrued: {stats.accrued.toFixed(1)} | Taken: {stats.taken}</span>
                  </div>
                  <div className="mt-5 pt-4 border-t border-slate-800">
                    <button
                      onClick={() => setShowPaidModal(true)}
                      className="w-full bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs py-2.5 rounded-xl transition shadow-lg shadow-cyan-600/25 flex items-center justify-center gap-2"
                    >
                      <span>+ Record Paid Leave</span>
                    </button>
                  </div>
                </div>

                {/* Comp-Off Balance Card */}
                <div className="bg-gradient-to-b from-[#07162C] to-[#051020] border border-orange-500/20 rounded-2xl p-6 shadow-2xl relative overflow-hidden group hover:border-orange-500/40 transition">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-xl pointer-events-none"></div>
                  <p className="text-xs font-bold text-orange-400 uppercase tracking-widest">Comp-Off Balance</p>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-4xl font-extrabold text-white font-mono tracking-tight">{stats.compBalance}</span>
                    <span className="text-xs text-slate-400 font-mono font-medium">Earned: {stats.compEarned} | Used: {stats.compUsed}</span>
                  </div>
                  <div className="mt-5 pt-4 border-t border-slate-800 flex gap-3">
                    <button
                      onClick={() => setShowEarnCompModal(true)}
                      className="flex-1 bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-xs py-2.5 rounded-xl transition shadow-lg shadow-orange-500/25"
                    >
                      + Earn
                    </button>
                    <button
                      onClick={() => setShowUseCompModal(true)}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs py-2.5 rounded-xl font-bold transition"
                    >
                      Use
                    </button>
                  </div>
                </div>

                {/* Total Available Card */}
                <div className="bg-gradient-to-b from-[#07162C] to-[#051020] border border-emerald-500/20 rounded-2xl p-6 shadow-2xl relative overflow-hidden group hover:border-emerald-500/40 transition">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-xl pointer-events-none"></div>
                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Total Available Leaves</p>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-4xl font-extrabold text-white font-mono tracking-tight">{stats.totalAvailable.toFixed(1)}</span>
                    <span className="text-xs text-emerald-400 font-semibold bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-500/20">Paid + Comp</span>
                  </div>
                  <div className="mt-5 pt-4 border-t border-slate-800 text-xs text-slate-400 font-medium">
                    Automatically calculated daily based on active tenure.
                  </div>
                </div>
              </div>

              {/* History Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Paid Leaves History */}
                <div className="bg-[#07162C] border border-slate-800 rounded-2xl p-6 shadow-2xl">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Paid Leaves Taken</h3>
                    <span className="bg-cyan-500/10 text-cyan-300 text-xs px-3 py-1 rounded-lg font-mono font-bold border border-cyan-500/20">
                      Total: {stats.taken} days
                    </span>
                  </div>
                  {currentEmp.paidLeavesTaken && currentEmp.paidLeavesTaken.length > 0 ? (
                    <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                      {currentEmp.paidLeavesTaken.map((leave) => (
                        <div key={leave.id} className="bg-[#040D1A] border border-slate-800/80 p-3.5 rounded-xl flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-200 text-sm truncate">{leave.reason}</p>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">{leave.date}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="bg-cyan-500/15 text-cyan-300 font-mono font-bold text-xs px-2.5 py-1 rounded-lg border border-cyan-500/30">
                              {leave.days} {leave.days > 1 ? 'days' : 'day'}
                            </span>
                            <button
                              onClick={() => openEditPaidModal(leave)}
                              title="Edit"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 transition"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                            </button>
                            <button
                              onClick={() => handleDeletePaidLeave(leave.id)}
                              title="Delete"
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition border border-rose-500/20"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 py-10 text-center italic font-medium">No paid leaves recorded yet.</p>
                  )}
                </div>

                {/* Comp-Off History */}
                <div className="bg-[#07162C] border border-slate-800 rounded-2xl p-6 shadow-2xl">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Comp-Off Activity Logs</h3>
                    <span className="bg-orange-500/10 text-orange-300 text-xs px-3 py-1 rounded-lg font-mono font-bold border border-orange-500/20">
                      Balance: {stats.compBalance}
                    </span>
                  </div>
                  {((currentEmp.compOffsEarned || []).length > 0 || (currentEmp.compOffsUsed || []).length > 0) ? (
                    <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                      {(currentEmp.compOffsEarned || []).map((c) => (
                        <div key={'earn-' + c.id} className="bg-[#040D1A] border border-emerald-500/25 p-3.5 rounded-xl flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-emerald-300 text-sm truncate">Earned: {c.reason}</p>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">{c.date}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="bg-emerald-500/15 text-emerald-300 font-mono font-bold text-xs px-2.5 py-1 rounded-lg border border-emerald-500/30">
                              +1 Comp
                            </span>
                            <button
                              onClick={() => openEditCompModal('earned', c)}
                              title="Edit"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 transition"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                            </button>
                            <button
                              onClick={() => handleDeleteComp('earned', c.id)}
                              title="Delete"
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition border border-rose-500/20"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            </button>
                          </div>
                        </div>
                      ))}
                      {(currentEmp.compOffsUsed || []).map((c) => (
                        <div key={'use-' + c.id} className="bg-[#040D1A] border border-rose-500/25 p-3.5 rounded-xl flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-rose-300 text-sm truncate">Used: {c.reason}</p>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">{c.date}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="bg-rose-500/15 text-rose-300 font-mono font-bold text-xs px-2.5 py-1 rounded-lg border border-rose-500/30">
                              -1 Comp
                            </span>
                            <button
                              onClick={() => openEditCompModal('used', c)}
                              title="Edit"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 transition"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                            </button>
                            <button
                              onClick={() => handleDeleteComp('used', c.id)}
                              title="Delete"
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition border border-rose-500/20"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 py-10 text-center italic font-medium">No comp-off records yet.</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-[#07162C] border border-slate-800 rounded-2xl p-16 text-center text-slate-400 font-medium">
              Select an employee from the directory or click "+ Add New Employee".
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#051020] border-t border-slate-800 py-4 text-center text-xs text-slate-500 font-medium">
        Enterprise Leave Management System &bull; Powered by React & Cloud Storage
      </footer>

      {/* ================= MODALS ================= */}

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#07162C] border border-slate-700/80 rounded-2xl max-w-md w-full p-8 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-5 pb-2 border-b border-slate-800">Add New Employee</h3>
            <form onSubmit={handleAddEmployee} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">Employee Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Priya Nair"
                  value={newEmpName}
                  onChange={(e) => setNewEmpName(e.target.value)}
                  className="w-full bg-[#040D1A] border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500 font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">Role / Designation</label>
                <input
                  type="text"
                  placeholder="e.g. Senior Software Engineer"
                  value={newEmpRole}
                  onChange={(e) => setNewEmpRole(e.target.value)}
                  className="w-full bg-[#040D1A] border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500 font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">Joining Date</label>
                <input
                  type="date"
                  required
                  value={newEmpJoinDate}
                  onChange={(e) => setNewEmpJoinDate(e.target.value)}
                  className="w-full bg-[#040D1A] border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500 font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">Note: Joining on or before the 20th grants 1.5 leave credit; joining after the 20th grants 0.5 leave for the starting month.</p>
              </div>
              <div className="flex gap-4 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl font-bold text-sm transition border border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold py-3 rounded-xl text-sm transition shadow-lg shadow-cyan-600/30"
                >
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#07162C] border border-slate-700/80 rounded-2xl max-w-md w-full p-8 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-5 pb-2 border-b border-slate-800">Edit Employee Profile</h3>
            <form onSubmit={handleUpdateEmployee} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">Employee Name</label>
                <input
                  type="text"
                  required
                  value={editEmpName}
                  onChange={(e) => setEditEmpName(e.target.value)}
                  className="w-full bg-[#040D1A] border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500 font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">Role / Designation</label>
                <input
                  type="text"
                  value={editEmpRole}
                  onChange={(e) => setEditEmpRole(e.target.value)}
                  className="w-full bg-[#040D1A] border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500 font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">Joining Date</label>
                <input
                  type="date"
                  required
                  value={editEmpJoinDate}
                  onChange={(e) => setEditEmpJoinDate(e.target.value)}
                  className="w-full bg-[#040D1A] border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
              <div className="flex gap-4 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl font-bold text-sm transition border border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold py-3 rounded-xl text-sm transition shadow-lg shadow-cyan-600/30"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Paid Leave Modal */}
      {showPaidModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#07162C] border border-slate-700/80 rounded-2xl max-w-md w-full p-8 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-5 pb-2 border-b border-slate-800">Record Paid Leave</h3>
            <form onSubmit={handleAddPaidLeave} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">Absence Date</label>
                <input
                  type="date"
                  required
                  value={paidLeaveDate}
                  onChange={(e) => setPaidLeaveDate(e.target.value)}
                  className="w-full bg-[#040D1A] border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">Number of Days</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  required
                  value={paidDays}
                  onChange={(e) => setPaidDays(e.target.value)}
                  className="w-full bg-[#040D1A] border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">Reason / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Annual Vacation / Personal"
                  value={paidReason}
                  onChange={(e) => setPaidReason(e.target.value)}
                  className="w-full bg-[#040D1A] border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500 font-medium"
                />
              </div>
              <div className="flex gap-4 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPaidModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl font-bold text-sm transition border border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold py-3 rounded-xl text-sm transition shadow-lg shadow-cyan-600/30"
                >
                  Add Leave
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Paid Leave Modal */}
      {showEditPaidModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#07162C] border border-slate-700/80 rounded-2xl max-w-md w-full p-8 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-5 pb-2 border-b border-slate-800">Edit Paid Leave Record</h3>
            <form onSubmit={handleUpdatePaidLeave} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">Absence Date</label>
                <input
                  type="date"
                  required
                  value={editPaidDate}
                  onChange={(e) => setEditPaidDate(e.target.value)}
                  className="w-full bg-[#040D1A] border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">Number of Days</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  required
                  value={editPaidDays}
                  onChange={(e) => setEditPaidDays(e.target.value)}
                  className="w-full bg-[#040D1A] border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">Reason / Notes</label>
                <input
                  type="text"
                  required
                  value={editPaidReason}
                  onChange={(e) => setEditPaidReason(e.target.value)}
                  className="w-full bg-[#040D1A] border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500 font-medium"
                />
              </div>
              <div className="flex gap-4 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEditPaidModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl font-bold text-sm transition border border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold py-3 rounded-xl text-sm transition shadow-lg shadow-cyan-600/30"
                >
                  Update Leave
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Earn Comp Modal */}
      {showEarnCompModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#07162C] border border-slate-700/80 rounded-2xl max-w-md w-full p-8 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-5 pb-2 border-b border-slate-800">Earn Compensation Leave</h3>
            <form onSubmit={handleEarnComp} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">Date Worked</label>
                <input
                  type="date"
                  required
                  value={compEarnDate}
                  onChange={(e) => setCompEarnDate(e.target.value)}
                  className="w-full bg-[#040D1A] border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">Reason / Project</label>
                <input
                  type="text"
                  placeholder="e.g. Worked on weekend release"
                  value={compEarnReason}
                  onChange={(e) => setCompEarnReason(e.target.value)}
                  className="w-full bg-[#040D1A] border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500 font-medium"
                />
              </div>
              <div className="flex gap-4 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEarnCompModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl font-bold text-sm transition border border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold py-3 rounded-xl text-sm transition shadow-lg shadow-orange-500/30"
                >
                  Save Comp Earned
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Use Comp Modal */}
      {showUseCompModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#07162C] border border-slate-700/80 rounded-2xl max-w-md w-full p-8 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-5 pb-2 border-b border-slate-800">Use Compensation Leave</h3>
            <form onSubmit={handleUseComp} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">Date Availed</label>
                <input
                  type="date"
                  required
                  value={compUseDate}
                  onChange={(e) => setCompUseDate(e.target.value)}
                  className="w-full bg-[#040D1A] border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Taking comp-off day"
                  value={compUseReason}
                  onChange={(e) => setCompUseReason(e.target.value)}
                  className="w-full bg-[#040D1A] border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500 font-medium"
                />
              </div>
              <div className="flex gap-4 pt-3">
                <button
                  type="button"
                  onClick={() => setShowUseCompModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl font-bold text-sm transition border border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold py-3 rounded-xl text-sm transition shadow-lg shadow-orange-500/30"
                >
                  Confirm Use
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Comp-Off Modal */}
      {showEditCompModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#07162C] border border-slate-700/80 rounded-2xl max-w-md w-full p-8 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-5 pb-2 border-b border-slate-800">Edit Comp-Off Log</h3>
            <form onSubmit={handleUpdateComp} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">Date</label>
                <input
                  type="date"
                  required
                  value={editCompDate}
                  onChange={(e) => setEditCompDate(e.target.value)}
                  className="w-full bg-[#040D1A] border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">Reason / Notes</label>
                <input
                  type="text"
                  required
                  value={editCompReason}
                  onChange={(e) => setEditCompReason(e.target.value)}
                  className="w-full bg-[#040D1A] border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500 font-medium"
                />
              </div>
              <div className="flex gap-4 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEditCompModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl font-bold text-sm transition border border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold py-3 rounded-xl text-sm transition shadow-lg shadow-orange-500/30"
                >
                  Update Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Popup Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#07162C] border border-slate-700/80 rounded-2xl max-w-sm w-full p-8 shadow-2xl text-center">
            <div className="w-14 h-14 bg-rose-500/15 border border-rose-500/30 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold shadow-inner">
              !
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Delete Employee?</h3>
            <p className="text-sm text-slate-300 mb-6 leading-relaxed">
              Are you sure to delete the employee details for <span className="text-white font-bold">{currentEmp?.name}</span>? This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => handleConfirmDelete(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl font-bold text-sm transition border border-slate-700"
              >
                No
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDelete(true)}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-3 rounded-xl font-bold text-sm transition shadow-lg shadow-rose-600/35"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}