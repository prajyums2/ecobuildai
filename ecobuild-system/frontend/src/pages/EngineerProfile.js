import React, { useState } from 'react';
import { useEngineer } from '../context/EngineerContext';
import { 
  FaUser, 
  FaIdCard, 
  FaBuilding, 
  FaEnvelope, 
  FaPhone, 
  FaMapMarkerAlt,
  FaSave,
  FaEdit,
  FaCertificate
} from 'react-icons/fa';

function EngineerProfile() {
  const { engineer, isConfigured, updateEngineer, clearEngineer } = useEngineer();
  const [isEditing, setIsEditing] = useState(!isConfigured);
  const [formData, setFormData] = useState(engineer);

  const handleSave = () => {
    updateEngineer(formData);
    setIsEditing(false);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const inputFields = [
    { id: 'name', label: 'Full Name', icon: FaUser, placeholder: 'e.g., John Doe', required: true },
    { id: 'registrationNumber', label: 'Engineer Registration Number', icon: FaIdCard, placeholder: 'e.g., CEB/2020/12345' },
    { id: 'company', label: 'Company/Organization', icon: FaBuilding, placeholder: 'e.g., GEC Thrissur' },
    { id: 'designation', label: 'Designation', icon: FaCertificate, placeholder: 'e.g., Structural Engineer' },
    { id: 'email', label: 'Email Address', icon: FaEnvelope, placeholder: 'email@example.com', type: 'email' },
    { id: 'phone', label: 'Phone Number', icon: FaPhone, placeholder: '+91 98765 43210' },
    { id: 'address', label: 'Office Address', icon: FaMapMarkerAlt, placeholder: 'Full address...', multiline: true },
    { id: 'licenseNumber', label: 'License Number', icon: FaCertificate, placeholder: 'Professional license number' },
    { id: 'specialization', label: 'Specialization', icon: FaCertificate, placeholder: 'e.g., Structural, Environmental' },
    { id: 'experience', label: 'Years of Experience', icon: FaCertificate, placeholder: 'e.g., 10 years', type: 'number' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Engineer Profile</h1>
          <p className="text-foreground-muted">Your professional information for reports</p>
        </div>
        <div className="flex gap-2">
          {isConfigured && !isEditing && (
            <>
              <button 
                onClick={() => setIsEditing(true)}
                className="btn btn-secondary"
              >
                <FaEdit className="mr-2" />
                Edit Profile
              </button>
              <button 
                onClick={() => {
                  if (window.confirm('Are you sure you want to clear your profile?')) {
                    clearEngineer();
                    setIsEditing(true);
                    setFormData({
                      name: '',
                      registrationNumber: '',
                      company: '',
                      designation: '',
                      email: '',
                      phone: '',
                      address: '',
                      licenseNumber: '',
                      specialization: '',
                      experience: ''
                    });
                  }
                }}
                className="btn btn-secondary text-red-600"
              >
                Clear Profile
              </button>
            </>
          )}
        </div>
      </div>

      {/* Profile Card */}
      <div className="card">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FaUser className="text-primary" />
            Professional Information
          </h2>
        </div>

        <div className="p-6">
          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {inputFields.map((field) => (
                <div key={field.id} className={field.multiline ? 'md:col-span-2' : ''}>
                  <label className="block text-sm font-medium mb-2">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <div className="relative">
                    <field.icon className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
                    {field.multiline ? (
                      <textarea
                        value={formData[field.id]}
                        onChange={(e) => handleChange(field.id, e.target.value)}
                        className="input w-full pl-10"
                        rows={3}
                        placeholder={field.placeholder}
                      />
                    ) : (
                      <input
                        type={field.type || 'text'}
                        value={formData[field.id]}
                        onChange={(e) => handleChange(field.id, e.target.value)}
                        className="input w-full pl-10"
                        placeholder={field.placeholder}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {isConfigured ? (
                <>
                  <div className="md:col-span-2 flex items-start gap-4 pb-4 border-b border-border">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                      <FaUser className="text-3xl text-primary" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-foreground">{engineer.name}</h3>
                      <p className="text-foreground-muted">{engineer.designation}</p>
                      <p className="text-sm text-primary">{engineer.company}</p>
                    </div>
                  </div>

                  {inputFields.slice(1).map((field) => (
                    engineer[field.id] && (
                      <div key={field.id} className="flex items-start gap-3">
                        <field.icon className="text-foreground-muted mt-1" />
                        <div>
                          <p className="text-xs text-foreground-muted">{field.label}</p>
                          <p className="text-sm font-medium">{engineer[field.id]}</p>
                        </div>
                      </div>
                    )
                  ))}
                </>
              ) : (
                <div className="md:col-span-2 text-center py-8">
                  <p className="text-foreground-muted mb-4">No profile configured yet.</p>
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="btn btn-primary"
                  >
                    <FaEdit className="mr-2" />
                    Set Up Profile
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {isEditing && (
          <div className="p-6 border-t border-border flex gap-2 justify-end">
            {isConfigured && (
              <button 
                onClick={() => {
                  setIsEditing(false);
                  setFormData(engineer);
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            )}
            <button 
              onClick={handleSave}
              className="btn btn-primary"
              disabled={!formData.name.trim()}
            >
              <FaSave className="mr-2" />
              Save Profile
            </button>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="card bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
        <div className="p-6">
          <h3 className="font-semibold text-blue-800 dark:text-blue-400 mb-2">
            Why set up your profile?
          </h3>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• Your name and details appear on all generated reports</li>
            <li>• Required for professional compliance documentation</li>
            <li>• Helps track project accountability</li>
            <li>• Stored locally for your privacy</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default EngineerProfile;