import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  Camera, 
  User, 
  X, 
  Check, 
  Sparkles, 
  Trash2, 
  ZoomIn, 
  ZoomOut, 
  CheckCircle2, 
  AlertCircle, 
  Link as LinkIcon, 
  Grid, 
  RotateCcw,
  ShieldCheck,
  Edit3
} from 'lucide-react';

interface ProfileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    email: string;
    role: string;
    name?: string;
    avatar?: string;
  } | null;
  onSaveProfile: (updatedProfile: { name?: string; avatar?: string }) => void;
  isDarkMode: boolean;
  accentClass: string;
}

const PRESET_AVATARS = [
  { id: 'p1', name: 'Macbook Dev', url: '/macbook_code.jpg' },
  { id: 'p2', name: 'Executive Male', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=250&h=250&fit=crop&crop=face' },
  { id: 'p3', name: 'Tech Female', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=250&h=250&fit=crop&crop=face' },
  { id: 'p4', name: 'Senior Engineer', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=250&h=250&fit=crop&crop=face' },
  { id: 'p5', name: 'Product Lead', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=250&h=250&fit=crop&crop=face' },
  { id: 'p6', name: 'Creative Designer', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=250&h=250&fit=crop&crop=face' },
  { id: 'p7', name: 'Data Architect', url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=250&h=250&fit=crop&crop=face' },
  { id: 'p8', name: 'Security Analyst', url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=250&h=250&fit=crop&crop=face' }
];

export default function ProfileUploadModal({
  isOpen,
  onClose,
  currentUser,
  onSaveProfile,
  isDarkMode,
  accentClass
}: ProfileUploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'presets' | 'url'>('upload');
  
  // Profile state
  const [displayName, setDisplayName] = useState(currentUser?.name || 'Nyikuli Bramwel');
  const [avatarPreview, setAvatarPreview] = useState<string>(currentUser?.avatar || '/macbook_code.jpg');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [customUrl, setCustomUrl] = useState<string>('');
  
  // Feedback state
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.name || currentUser.email.split('@')[0] || 'Nyikuli Bramwel');
      setAvatarPreview(currentUser.avatar || '/macbook_code.jpg');
    }
  }, [currentUser, isOpen]);

  if (!isOpen) return null;

  // Process File Upload
  const handleFileChange = (file: File) => {
    setErrorMsg('');
    setSuccessMsg('');

    // Validate image format
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Invalid file format. Please upload a PNG, JPG, WEBP, GIF, or SVG image.');
      return;
    }

    // Validate size (max 8MB)
    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg('Image size exceeds 8MB limit. Please choose a smaller file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setAvatarPreview(result);
        setSuccessMsg('New profile picture loaded! Click "Save Changes" to apply.');
      }
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read image file. Please try another image.');
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!customUrl.trim()) return;

    if (!customUrl.startsWith('http://') && !customUrl.startsWith('https://') && !customUrl.startsWith('data:image/')) {
      setErrorMsg('URL must begin with http:// or https://');
      return;
    }

    setAvatarPreview(customUrl.trim());
    setSuccessMsg('Custom image URL loaded!');
  };

  const handleSave = () => {
    setIsSaving(true);
    setErrorMsg('');

    try {
      onSaveProfile({
        name: displayName.trim(),
        avatar: avatarPreview
      });

      // Also persist to localStorage for instant reload restoration
      localStorage.setItem('user_profile_avatar', avatarPreview);
      localStorage.setItem('user_profile_name', displayName.trim());

      setSuccessMsg('Profile picture updated successfully!');
      setTimeout(() => {
        setIsSaving(false);
        onClose();
      }, 600);
    } catch (err) {
      setIsSaving(false);
      setErrorMsg('Failed to save profile picture. Please try again.');
    }
  };

  const handleRemoveAvatar = () => {
    const defaultAvatar = currentUser?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser?.name || currentUser?.email || 'User')}&backgroundColor=3b82f6`;
    setAvatarPreview(defaultAvatar);
    setSuccessMsg('Reset avatar to default picture.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className={`w-full max-w-xl max-h-[90vh] rounded-2xl border shadow-2xl overflow-hidden flex flex-col ${
          isDarkMode ? 'bg-[#0f172a] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Modal Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isDarkMode ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl text-white ${accentClass}`}>
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">User Profile & Picture Upload</h2>
              <p className="text-xs text-slate-400">Update avatar and display details for {currentUser?.email}</p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Notifications */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Profile Details Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest flex items-center gap-1">
                <Edit3 className="w-3 h-3 text-blue-500" /> Display Name
              </label>
              <input 
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your Name"
                className={`w-full px-3.5 py-2 text-xs font-bold rounded-xl border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500" /> Account Email & Role
              </label>
              <div className={`px-3.5 py-2 text-xs rounded-xl border flex items-center justify-between ${
                isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
              }`}>
                <span className="font-mono truncate">{currentUser?.email}</span>
                <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {currentUser?.role || 'Owner'}
                </span>
              </div>
            </div>
          </div>

          {/* Avatar Preview & Size Cards */}
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-6 ${
            isDarkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center gap-5">
              {/* Main Avatar Preview Container */}
              <div className="relative group shrink-0">
                <div 
                  className="w-24 h-24 rounded-full overflow-hidden border-2 border-blue-500 shadow-xl transition-transform duration-200 flex items-center justify-center bg-slate-900"
                  style={{ transform: `scale(${zoomLevel})` }}
                >
                  <img 
                    src={avatarPreview} 
                    alt="Profile Avatar Preview" 
                    className="w-full h-full object-cover"
                    onError={() => {
                      setErrorMsg('Failed to load image preview URL.');
                    }}
                  />
                </div>

                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-500 transition-transform hover:scale-110 cursor-pointer border-2 border-slate-900"
                  title="Upload profile picture"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              {/* Live Preview Multi-Size Demonstration */}
              <div className="space-y-2">
                <span className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                  Live UI Previews
                </span>
                <div className="flex items-center gap-3">
                  {/* Header 28px size */}
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-7 h-7 rounded-full overflow-hidden border border-slate-700 shadow-xs">
                      <img src={avatarPreview} alt="Header size" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[9px] text-slate-500 font-mono">Header</span>
                  </div>

                  {/* Sidebar 36px size */}
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-700 shadow-xs">
                      <img src={avatarPreview} alt="Sidebar size" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[9px] text-slate-500 font-mono">Sidebar</span>
                  </div>

                  {/* Card 48px size */}
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-blue-500/40 shadow-xs">
                      <img src={avatarPreview} alt="Card size" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[9px] text-slate-500 font-mono">Team</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Zoom / Reset Controls */}
            <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setZoomLevel(prev => Math.max(0.8, prev - 0.1))}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Zoom out preview"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-mono font-bold text-slate-300 px-1">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomLevel(prev => Math.min(1.5, prev + 0.1))}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Zoom in preview"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleRemoveAvatar}
                className="text-[11px] font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3 h-3" /> Reset Picture
              </button>
            </div>
          </div>

          {/* Navigation Tabs for Upload Method */}
          <div className="border-b border-slate-800 flex gap-4">
            <button
              onClick={() => setActiveTab('upload')}
              className={`pb-2 text-xs font-bold flex items-center gap-1.5 transition-all border-b-2 cursor-pointer ${
                activeTab === 'upload'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" /> Upload File
            </button>

            <button
              onClick={() => setActiveTab('presets')}
              className={`pb-2 text-xs font-bold flex items-center gap-1.5 transition-all border-b-2 cursor-pointer ${
                activeTab === 'presets'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Grid className="w-3.5 h-3.5" /> Choose Preset
            </button>

            <button
              onClick={() => setActiveTab('url')}
              className={`pb-2 text-xs font-bold flex items-center gap-1.5 transition-all border-b-2 cursor-pointer ${
                activeTab === 'url'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" /> Image URL
            </button>
          </div>

          {/* Tab 1: Drag and Drop Upload */}
          {activeTab === 'upload' && (
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 border-2 border-dashed rounded-2xl text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                isDragOver
                  ? 'border-blue-500 bg-blue-500/10 scale-[1.01]'
                  : isDarkMode
                  ? 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900/50'
                  : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/50'
              }`}
            >
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
                className="hidden" 
              />

              <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                <Upload className="w-6 h-6" />
              </div>

              <div>
                <p className={`text-xs font-extrabold ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                  Drag and drop your profile photo here, or <span className="text-blue-500 underline">click to browse</span>
                </p>
                <p className={`text-[10px] mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Supports PNG, JPG, JPEG, WEBP, GIF, SVG (up to 8MB)
                </p>
              </div>
            </div>
          )}

          {/* Tab 2: Preset Avatar Library */}
          {activeTab === 'presets' && (
            <div className="space-y-3">
              <span className={`text-[10px] font-mono font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Select from standard team avatars:
              </span>
              <div className="grid grid-cols-4 sm:grid-cols-4 gap-3">
                {PRESET_AVATARS.map((preset) => {
                  const isSelected = avatarPreview === preset.url;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setAvatarPreview(preset.url);
                        setSuccessMsg(`Selected ${preset.name} preset!`);
                      }}
                      className={`p-2 rounded-xl border flex flex-col items-center gap-2 transition-all hover:scale-105 cursor-pointer relative ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30'
                          : isDarkMode ? 'border-slate-800 bg-slate-950/40 hover:border-slate-700' : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5" />
                        </span>
                      )}
                      <img src={preset.url} alt={preset.name} className="w-12 h-12 rounded-full object-cover border border-slate-700" />
                      <span className={`text-[9px] font-bold truncate w-full text-center ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                        {preset.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 3: Custom URL */}
          {activeTab === 'url' && (
            <form onSubmit={handleApplyCustomUrl} className="space-y-3">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Paste Image Address / Unsplash URL
              </label>
              <div className="flex gap-2">
                <input 
                  type="url"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className={`flex-1 px-3.5 py-2 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0"
                >
                  Load Image
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className={`px-6 py-4 border-t flex items-center justify-between ${
          isDarkMode ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-slate-50'
        }`}>
          <button 
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            Cancel
          </button>

          <button 
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className={`px-6 py-2.5 rounded-xl text-xs font-extrabold text-white flex items-center gap-2 shadow-lg hover:scale-102 transition-all cursor-pointer ${accentClass}`}
          >
            {isSaving ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" />
                <span>Saving Profile...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Profile Picture</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
